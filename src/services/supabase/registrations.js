import { supabase } from "../../lib/supabase";
import { logAction } from "./audit.js";
import {
  dedupeById,
  getCurrentGameIdForDay,
  getGameById,
  getGames,
  isFixedDay,
  normalizeGameDate,
  resolveEquivalentGameIds,
  resolveGameId,
} from "./games.js";
import {
  addWarning,
  getPlayerById,
  isSaturdayAfter21h,
} from "./players.js";
import {
  isGuestMigrationWindowOpen,
  isRegistrationInCurrentCycle,
  resolveJoinSlot,
} from "./registrationRules.js";

const MAX_MAIN_LIST = 21;

async function getRegistrationRowsByGameIds(
  gameIds,
  columns,
  { onlyActive = false } = {},
) {
  const uniqueGameIds = Array.from(new Set((gameIds || []).filter(Boolean)));
  if (!uniqueGameIds.length) return { data: [], error: null };

  const results = await Promise.all(
    uniqueGameIds.map((id) => {
      let query = supabase
        .from("game_registrations")
        .select(columns)
        .eq("game_id", id);

      if (onlyActive) {
        query = query.is("left_at", null);
      }

      return query;
    }),
  );

  const firstErrorResult = results.find((result) => result.error);
  if (firstErrorResult?.error) {
    return { data: [], error: firstErrorResult.error };
  }

  const rows = results.flatMap((result) => result.data || []);
  const dedupedRows = dedupeById(rows).sort((a, b) => {
    const dateCompare = String(a?.registered_at || "").localeCompare(
      String(b?.registered_at || ""),
    );

    if (dateCompare !== 0) return dateCompare;
    return String(a?.id || "").localeCompare(String(b?.id || ""));
  });

  return { data: dedupedRows, error: null };
}

export async function autoMigrateGuests(
  gameId,
  { now = new Date(), game: preloadedGame = null } = {},
) {
  const canonicalGameId = await resolveGameId(gameId);
  const baseGame = preloadedGame || (await getGameById(canonicalGameId));

  if (!baseGame) return false;
  if (!isGuestMigrationWindowOpen(baseGame, now)) return false;

  const equivalentGameIds = await resolveEquivalentGameIds(canonicalGameId);
  const gamesByIdList = await Promise.all(
    equivalentGameIds.map((id) => getGameById(id)),
  );

  const gamesById = new Map();
  equivalentGameIds.forEach((id, index) => {
    const game = gamesByIdList[index];
    if (game) gamesById.set(String(id), game);
  });

  const { data: allRegistrations, error } = await getRegistrationRowsByGameIds(
    equivalentGameIds,
    "id, game_id, slot, registered_at, player_id, guest_id, guest_name",
    { onlyActive: true },
  );

  if (error) {
    console.error(
      "[Supabase] Falha ao migrar convidados automaticamente:",
      error,
    );
    return false;
  }

  const currentCycleRegistrations = (allRegistrations || []).filter(
    (registration) =>
      isRegistrationInCurrentCycle(
        registration,
        gamesById.get(String(registration.game_id)) || baseGame,
      ),
  );

  const guestRegistrations = currentCycleRegistrations.filter(
    (registration) => registration.slot === "guests",
  );

  // Primeiro reúne os convidados à espera, sem alterar registered_at.
  for (const registration of guestRegistrations) {
    const { error: updateError } = await supabase
      .from("game_registrations")
      .update({ slot: "waitlist" })
      .eq("id", registration.id);

    if (updateError) {
      console.error("[Supabase] Falha ao migrar convidado:", {
        registrationId: registration.id,
        error: updateError,
      });
      return false;
    }
  }

  // Depois preenche as vagas na ordem da fila. Mesmo sem convidados
  // para migrar, isto promove um penalizado elegível após sábado, 0h.
  const promoted = await fillMainListFromWaitlist(canonicalGameId);

  return guestRegistrations.length > 0 || promoted;
}

export async function getGameRegistrations(
  gameId,
  { autoMigrate = true } = {},
) {
  const canonicalGameId = await resolveGameId(gameId);
  const requestedGame = await getGameById(canonicalGameId);

  if (autoMigrate && requestedGame?.day === "sunday") {
    await autoMigrateGuests(canonicalGameId, { game: requestedGame });
  }

  const equivalentGameIds = await resolveEquivalentGameIds(canonicalGameId);
  const gamesByIdList = await Promise.all(
    equivalentGameIds.map((id) => getGameById(id)),
  );

  const gamesById = new Map();
  equivalentGameIds.forEach((id, index) => {
    const game = gamesByIdList[index];
    if (game) gamesById.set(String(id), game);
  });

  const { data, error } = await getRegistrationRowsByGameIds(
    equivalentGameIds,
    "*, player:players!game_registrations_player_id_fkey(*), inviter:players!game_registrations_invited_by_fkey(id, name, nickname, gender, status, type, is_captain, is_setter, position), guest:guests!game_registrations_guest_id_fkey(id, name, gender, skill_level, invited_by, is_setter)",
    { onlyActive: true },
  );

  if (error) {
    console.error("[Supabase] Falha ao carregar inscricoes do jogo:", error);
    return [];
  }

  return (data || []).filter((registration) =>
    isRegistrationInCurrentCycle(
      registration,
      gamesById.get(String(registration.game_id)) || requestedGame,
    ),
  );
}

export async function getRegistrationCountsByGame() {
  const games = await getGames();

  const [currentWednesdayId, currentSundayId] = await Promise.all([
    getCurrentGameIdForDay("wednesday"),
    getCurrentGameIdForDay("sunday"),
  ]);

  const currentFixedByDay = new Map(
    [
      ["wednesday", currentWednesdayId],
      ["sunday", currentSundayId],
    ].filter(([, gameId]) => Boolean(gameId)),
  );

  const { data: allGames } = await supabase
    .from("games")
    .select("id, day, date");

  const canonicalByDayDate = new Map();
  const gameIdToCanonical = new Map();

  (allGames || []).forEach((game) => {
    const normalizedDate = normalizeGameDate(game.date);
    if (!normalizedDate || !isFixedDay(game.day)) {
      gameIdToCanonical.set(String(game.id), String(game.id));
      return;
    }

    const key = `${game.day}-${normalizedDate}`;
    const currentCanonical = canonicalByDayDate.get(key);
    const isNewFormatId = String(game.id).startsWith(`${game.day}-`);

    if (!currentCanonical) {
      canonicalByDayDate.set(key, String(game.id));
      return;
    }

    const canonicalIsNewFormat = String(currentCanonical).startsWith(
      `${game.day}-`,
    );

    if (isNewFormatId && !canonicalIsNewFormat) {
      canonicalByDayDate.set(key, String(game.id));
    }
  });

  (allGames || []).forEach((game) => {
    const normalizedDate = normalizeGameDate(game.date);
    if (!normalizedDate || !isFixedDay(game.day)) {
      gameIdToCanonical.set(String(game.id), String(game.id));
      return;
    }

    const currentId = currentFixedByDay.get(game.day);
    if (currentId) {
      gameIdToCanonical.set(String(game.id), String(currentId));
      return;
    }

    const key = `${game.day}-${normalizedDate}`;
    const canonicalId = canonicalByDayDate.get(key) || String(game.id);
    gameIdToCanonical.set(String(game.id), String(canonicalId));
  });

  const gamesById = new Map(
    (games || []).map((game) => [String(game.id), game]),
  );

  const { data, error } = await supabase
    .from("game_registrations")
    .select("game_id, slot, registered_at")
    .eq("slot", "main")
    .is("left_at", null);

  if (error) {
    console.error("[Supabase] Falha ao carregar contagem de inscritos:", error);
    return {};
  }

  return (data || []).reduce((acc, row) => {
    const rawGameId = row.game_id;
    const gameId = gameIdToCanonical.get(String(rawGameId)) || rawGameId;
    if (!gameId) return acc;

    const game = gamesById.get(String(gameId));
    if (!game) return acc;
    if (!isRegistrationInCurrentCycle(row, game)) return acc;

    acc[gameId] = (acc[gameId] || 0) + 1;
    return acc;
  }, {});
}

async function getJoinListState(game, fallbackGameId) {
  const day = game?.day;
  let countGameId = fallbackGameId;

  if (isFixedDay(day)) {
    countGameId = (await getCurrentGameIdForDay(day)) || fallbackGameId;
  }

  // A leitura também reconcilia a fila se a janela de sábado já abriu.
  const registrations = await getGameRegistrations(countGameId);

  const mainCount = registrations.filter(
    (registration) => registration.slot === "main",
  ).length;

  return {
    hasMainSpot: mainCount < MAX_MAIN_LIST,
    hasWaitlist: registrations.some(
      (registration) => registration.slot === "waitlist",
    ),
  };
}

export async function joinGame(
  gameId,
  playerId,
  slot,
  guestName = null,
  invitedBy = null,
  guestId = null,
) {
  const targetGameId = await resolveGameId(gameId);
  const game = await getGameById(targetGameId);
  let playerType = "guest";
  let isPenalized = false;

  if (playerId) {
    const player = await getPlayerById(playerId);
    const playerStatus = player?.status;
    playerType = player?.type === "guest" ? "guest" : "member";

    if (playerStatus === "blocked") return false;
    if (playerStatus === "penalized") isPenalized = true;

    const alreadyRegistered = await isPlayerRegistered(targetGameId, playerId);
    if (alreadyRegistered) return false;
  }

  const { hasMainSpot, hasWaitlist } = await getJoinListState(
    game,
    targetGameId,
  );

  const isGuest =
    playerType === "guest" || Boolean(guestId || (guestName || "").trim());

  const effectiveSlot = resolveJoinSlot({
    game,
    isGuest,
    isPenalized,
    hasMainSpot: hasMainSpot && !hasWaitlist,
  });

  const { error } = await supabase.from("game_registrations").insert({
    game_id: targetGameId,
    player_id: playerId || null,
    guest_name: guestId ? null : guestName || null,
    guest_id: guestId || null,
    invited_by: invitedBy || null,
    slot: effectiveSlot,
  });

  if (error) return false;

  const actionBySlot = {
    main: "joined_main",
    waitlist: "joined_waitlist",
    guests: "joined_guests",
  };

  const action = actionBySlot[effectiveSlot];

  if (action) {
    await logAction(
      targetGameId,
      playerId,
      action,
      guestId ? "Convidado externo" : null,
      guestId,
    );
  }

  if (hasMainSpot && (hasWaitlist || effectiveSlot === "waitlist")) {
    await fillMainListFromWaitlist(targetGameId);
  }

  return true;
}

export async function leaveGame(gameId, playerId = null, guestId = null) {
  if (!playerId && !guestId) return false;

  const resolvedGameId = await resolveGameId(gameId);
  const { data: gameData } = playerId
    ? await supabase
        .from("games")
        .select("id, day, date")
        .eq("id", resolvedGameId)
        .maybeSingle()
    : { data: null };

  const equivalentGameIds = await resolveEquivalentGameIds(gameId);
  const selectResults = await Promise.all(
    equivalentGameIds.map((id) => {
      let query = supabase
        .from("game_registrations")
        .select("id, slot, guest_id")
        .eq("game_id", id)
        .is("left_at", null);

      if (guestId) {
        query = query.eq("guest_id", guestId);
      } else {
        query = query.eq("player_id", playerId);
      }

      return query;
    }),
  );

  const selectError =
    selectResults.find((result) => result.error)?.error || null;

  if (selectError) {
    console.error("[leaveGame] failed to load active registrations", {
      gameId,
      playerId,
      selectError,
    });
    return false;
  }

  const leftRegistrations = selectResults.flatMap(
    (result) => result.data || [],
  );

  const leftAt = new Date().toISOString();
  const results = await Promise.all(
    equivalentGameIds.map((id) => {
      let query = supabase
        .from("game_registrations")
        .update({ left_at: leftAt })
        .eq("game_id", id)
        .is("left_at", null);

      if (guestId) {
        query = query.eq("guest_id", guestId);
      } else {
        query = query.eq("player_id", playerId);
      }

      return query;
    }),
  );

  const playerError = results.find((result) => result.error)?.error || null;

  if (playerError) {
    console.error("[leaveGame] update left_at failed, skipping promotion", {
      gameId,
      playerId,
      playerError,
    });
    return false;
  }

  if (leftRegistrations.length > 0) {
    const removedGuestId =
      guestId ||
      leftRegistrations.find((registration) => registration?.guest_id)
        ?.guest_id ||
      null;

    await logAction(
      gameId,
      playerId,
      "left_list",
      removedGuestId ? "Convidado externo" : null,
      removedGuestId,
    );

    if (playerId && isSaturdayAfter21h(gameData)) {
      const warnedPlayer = await addWarning(playerId);
      if (warnedPlayer) {
        await logAction(
          gameId,
          playerId,
          "warning_added",
          "Saiu da lista após 21h de sábado",
        );
      }
    }
  }

  // Reúne convidados à espera antes de escolher quem ocupa a vaga.
  await autoMigrateGuests(resolvedGameId, { game: gameData || null });
  await fillMainListFromWaitlist(gameId);

  return true;
}

async function fillMainListFromWaitlist(gameId) {
  const registrations = await getGameRegistrations(gameId, {
    autoMigrate: false,
  });

  const mainListCount = registrations.filter(
    (registration) => registration.slot === "main",
  ).length;

  let spotsAvailable = MAX_MAIN_LIST - mainListCount;
  let promotedAny = false;

  while (spotsAvailable > 0) {
    const promoted = await promoteFromWaitlist(gameId);
    if (!promoted) break;

    promotedAny = true;
    spotsAvailable -= 1;
  }

  return promotedAny;
}

export async function promoteFromWaitlist(gameId) {
  const registrations = await getGameRegistrations(gameId, {
    autoMigrate: false,
  });

  if (
    registrations.filter((registration) => registration.slot === "main")
      .length >= MAX_MAIN_LIST
  ) {
    return false;
  }

  const waitlist = registrations.filter(
    (registration) => registration.slot === "waitlist",
  );

  if (waitlist.length === 0) return false;

  const resolvedGameId = await resolveGameId(gameId);
  const game = await getGameById(resolvedGameId);

  const isPenalizedMember = (registration) =>
    registration.player_id &&
    registration.player?.type === "member" &&
    registration.player?.status === "penalized";

  // Para domingo, penalizados só podem subir a partir de sábado, 0h.
  const canPromotePenalized =
    game?.day === "sunday" && isGuestMigrationWindowOpen(game);

  const eligibleWaitlist = waitlist.filter(
    (registration) =>
      !isPenalizedMember(registration) || canPromotePenalized,
  );

  if (eligibleWaitlist.length === 0) return false;

  const hasNonPenalizedMember = eligibleWaitlist.some(
    (registration) =>
      registration.player_id &&
      registration.player?.type === "member" &&
      registration.player?.status !== "penalized",
  );

  const candidate =
    eligibleWaitlist.find(
      (registration) =>
        !hasNonPenalizedMember || !isPenalizedMember(registration),
    ) || eligibleWaitlist[0];

  const { error: updateError } = await supabase
    .from("game_registrations")
    .update({ slot: "main" })
    .eq("id", candidate.id);

  if (updateError) {
    console.error("[Supabase] Falha ao promover da waitlist para main:", {
      gameId,
      registrationId: candidate.id,
      error: updateError,
    });
    return false;
  }

  const guestName = candidate.guest?.name || candidate.guest_name || null;

  await logAction(
    candidate.game_id || gameId,
    candidate.player_id || null,
    "promoted_to_main",
    candidate.guest_id
      ? `Convidado promovido${guestName ? `: ${guestName}` : ""}`
      : null,
    candidate.guest_id || null,
  );

  return true;
}

export async function migrateGuestsToWaitlist(gameId) {
  const equivalentGameIds = await resolveEquivalentGameIds(gameId);
  const results = await Promise.all(
    equivalentGameIds.map((id) =>
      supabase
        .from("game_registrations")
        .update({ slot: "waitlist" })
        .eq("game_id", id)
        .eq("slot", "guests")
        .is("left_at", null),
    ),
  );

  const error = results.find((result) => result.error)?.error || null;
  if (error) return false;

  const canonicalGameId = await resolveGameId(gameId);
  await fillMainListFromWaitlist(canonicalGameId);

  return true;
}

export async function isPlayerRegistered(gameId, playerId) {
  const equivalentGameIds = await resolveEquivalentGameIds(gameId);

  const [queryResults, gamesByIdList] = await Promise.all([
    Promise.all(
      equivalentGameIds.map((id) =>
        supabase
          .from("game_registrations")
          .select("id, game_id, registered_at")
          .eq("game_id", id)
          .eq("player_id", playerId)
          .is("left_at", null)
          .maybeSingle(),
      ),
    ),
    Promise.all(equivalentGameIds.map((id) => getGameById(id))),
  ]);

  const gamesById = new Map();
  equivalentGameIds.forEach((id, index) => {
    const game = gamesByIdList[index];
    if (game) gamesById.set(String(id), game);
  });

  return queryResults.some((result) => {
    if (!result?.data) return false;

    const registration = result.data;
    const registrationGame = gamesById.get(String(registration.game_id));
    if (!registrationGame) return true;

    return isRegistrationInCurrentCycle(registration, registrationGame);
  });
}

export async function getGuestsByInviter(gameId, inviterId) {
  const equivalentGameIds = await resolveEquivalentGameIds(gameId);

  const results = await Promise.all(
    equivalentGameIds.map((id) =>
      supabase
        .from("game_registrations")
        .select("id, game_id, guest_name, registered_at")
        .eq("game_id", id)
        .eq("invited_by", inviterId)
        .is("player_id", null)
        .is("left_at", null)
        .order("registered_at"),
    ),
  );

  const error = results.find((result) => result.error)?.error || null;
  const data = dedupeById(results.flatMap((result) => result.data || [])).sort(
    (a, b) =>
      String(a?.registered_at || "").localeCompare(
        String(b?.registered_at || ""),
      ),
  );

  if (error) return [];
  return data || [];
}

export async function getGuestsByInviterFromTable(gameId, invitedById) {
  const equivalentGameIds = await resolveEquivalentGameIds(gameId);
  const gamesByIdList = await Promise.all(
    equivalentGameIds.map((id) => getGameById(id)),
  );

  const gamesById = new Map();
  equivalentGameIds.forEach((id, index) => {
    const game = gamesByIdList[index];
    if (game) gamesById.set(String(id), game);
  });

  const results = await Promise.all(
    equivalentGameIds.map((id) =>
      supabase
        .from("game_registrations")
        .select(
          "id, game_id, guest_id, registered_at, guest:guests!game_registrations_guest_id_fkey(id, name, gender, skill_level, invited_by)",
        )
        .eq("game_id", id)
        .not("guest_id", "is", null)
        .is("left_at", null)
        .eq("guest.invited_by", invitedById)
        .order("registered_at"),
    ),
  );

  const error = results.find((result) => result.error)?.error || null;
  const data = dedupeById(results.flatMap((result) => result.data || [])).sort(
    (a, b) =>
      String(a?.registered_at || "").localeCompare(
        String(b?.registered_at || ""),
      ),
  );

  if (error) return [];
  return (data || []).filter((registration) =>
    isRegistrationInCurrentCycle(
      registration,
      gamesById.get(String(registration.game_id)),
    ),
  );
}

export async function removeGuest(registrationId) {
  const { data, error } = await supabase
    .from("game_registrations")
    .delete()
    .eq("id", registrationId)
    .is("player_id", null)
    .select("id, game_id, slot, guest_id");

  if (error || !data?.length) return false;

  const removedRegistration = data[0];

  await logAction(
    removedRegistration.game_id,
    null,
    "left_list",
    "Convidado externo",
    removedRegistration.guest_id || null,
  );

  if (removedRegistration.slot === "main" && removedRegistration.game_id) {
    await autoMigrateGuests(removedRegistration.game_id);
    await fillMainListFromWaitlist(removedRegistration.game_id);
  }

  return true;
}