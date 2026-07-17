// Serviço de integração com o Supabase

import { isSuperAdmin } from "../domain/admins";
import { supabase } from "../lib/supabase";

const MAX_MAIN_LIST = 21;

export async function logAction(
  gameId,
  playerId,
  action,
  details = null,
  guestId = null,
) {
  const { error } = await supabase.from("audit_log").insert({
    game_id: gameId || null,
    player_id: playerId || null,
    guest_id: guestId || null,
    action,
    details: details || null,
  });

  if (error) {
    console.error("[audit_log] falha ao salvar evento", {
      gameId,
      playerId,
      guestId,
      action,
      details,
      error,
    });
    return false;
  }

  return true;
}

// ── Players ──────────────────────────────────────────

export async function registerPlayer(player) {
  const existingPlayer = await getPlayerByWhatsapp(player.whatsapp);
  if (existingPlayer) {
    return { success: false, error: "Este WhatsApp já está cadastrado." };
  }

  const { data, error } = await supabase
    .from("players")
    .insert({
      name: player.name,
      nickname: player.nickname || null,
      whatsapp: player.whatsapp,
      gender: player.gender,
      type: "member",
      status: "pending",
      accepted_rules: true,
    })
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, player: data };
}

export async function getPlayerByWhatsapp(whatsapp) {
  const { data, error } = await supabase
    .from("players")
    .select("*")
    .eq("whatsapp", whatsapp)
    .single();

  if (error) return null;
  return data;
}

export async function getPlayerById(playerId) {
  const { data, error } = await supabase
    .from("players")
    .select("*")
    .eq("id", playerId)
    .maybeSingle();

  if (error) return null;
  return data;
}

export async function getAllPlayers() {
  const { data, error } = await supabase
    .from("players")
    .select(
      "*, on_injury_leave, badge_monster_block, badge_super_spike, badge_guardian",
    )
    .order("name");

  if (error) return [];
  return (data || []).map((player) => ({
    ...player,
    on_injury_leave: Boolean(player.on_injury_leave),
  }));
}

export async function getPublicPlayers() {
  const { data, error } = await supabase
    .from("players")
    .select(
      "id, name, nickname, gender, status, avatar_url, is_captain, is_setter, badge_monster_block, badge_super_spike, badge_guardian",
    )
    .order("name");

  if (error) return [];
  return data || [];
}

export async function getPendingPlayers() {
  const { data, error } = await supabase
    .from("players")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (error) return [];
  return data || [];
}

export async function deletePlayer(playerId) {
  const { data, error } = await supabase
    .from("players")
    .delete()
    .eq("id", playerId)
    .select("id");

  return !error && (data?.length || 0) > 0;
}

export async function updatePlayerStatus(playerId, status, actorUser = null) {
  if (status === "active") {
    const { data: targetPlayer, error: readError } = await supabase
      .from("players")
      .select("id, status")
      .eq("id", playerId)
      .maybeSingle();

    if (readError || !targetPlayer) {
      return {
        success: false,
        error: "Nao foi possivel verificar o status atual do jogador.",
      };
    }

    const isUnblocking = targetPlayer.status === "blocked";
    if (isUnblocking && !isSuperAdmin(actorUser)) {
      return {
        success: false,
        error: "Apenas super admins podem desbloquear jogadores.",
      };
    }
  }

  const { error } = await supabase
    .from("players")
    .update({ status })
    .eq("id", playerId);

  if (!error && status === "penalized") {
    await logAction(null, playerId, "penalized", "Penalizado via Admin");
  }

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function updatePlayerInjuryLeave(playerId, onInjuryLeave) {
  const { error } = await supabase
    .from("players")
    .update({ on_injury_leave: Boolean(onInjuryLeave) })
    .eq("id", playerId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

function statusFromWarnings(warnings) {
  if (warnings >= 3) return "blocked";
  if (warnings === 2) return "penalized";
  return "active";
}

export function isSaturdayAfter21h(game) {
  if (game?.day !== "sunday" || !game?.date) return false;

  const sundayDate = new Date(`${game.date}T00:00:00`);
  if (Number.isNaN(sundayDate.getTime())) return false;

  const cutoff = new Date(sundayDate);
  cutoff.setDate(cutoff.getDate() - 1);
  cutoff.setHours(21, 0, 0, 0);

  return Date.now() >= cutoff.getTime();
}

export async function addWarning(playerId) {
  const player = await getPlayerById(playerId);
  if (!player) return null;

  const currentWarnings = Math.max(0, Number(player.warnings) || 0);
  const nextWarnings = currentWarnings + 1;
  const nextStatus = statusFromWarnings(nextWarnings);

  const { data, error } = await supabase
    .from("players")
    .update({ warnings: nextWarnings, status: nextStatus })
    .eq("id", playerId)
    .select("*")
    .maybeSingle();

  if (error) return null;
  return data;
}

export async function removeWarning(playerId) {
  const player = await getPlayerById(playerId);
  if (!player) return null;

  const currentWarnings = Math.max(0, Number(player.warnings) || 0);
  const nextWarnings = Math.max(0, currentWarnings - 1);
  const nextStatus = statusFromWarnings(nextWarnings);

  const { data, error } = await supabase
    .from("players")
    .update({ warnings: nextWarnings, status: nextStatus })
    .eq("id", playerId)
    .select("*")
    .maybeSingle();

  if (error) return null;
  return data;
}

export async function resetWarnings(playerId) {
  const { data, error } = await supabase
    .from("players")
    .update({ warnings: 0, status: "active" })
    .eq("id", playerId)
    .select("*")
    .maybeSingle();

  if (error) return null;
  return data;
}

export async function updatePlayerLevel(playerId, skillLevel) {
  const { error } = await supabase
    .from("players")
    .update({ skill_level: skillLevel })
    .eq("id", playerId);

  return !error;
}

export async function updatePlayerPosition(
  playerId,
  { is_captain, is_setter, position },
) {
  const { error } = await supabase
    .from("players")
    .update({ is_captain, is_setter, position })
    .eq("id", playerId);

  return !error;
}

export async function updatePlayerSpecialBadges(
  playerId,
  { badgeMonsterBlock, badgeSuperSpike, badgeGuardian },
) {
  const { error } = await supabase
    .from("players")
    .update({
      badge_monster_block: Boolean(badgeMonsterBlock),
      badge_super_spike: Boolean(badgeSuperSpike),
      badge_guardian: Boolean(badgeGuardian),
    })
    .eq("id", playerId);

  return !error;
}

export async function updatePlayerProfile(playerId, { nickname, whatsapp }) {
  const normalizedWhatsapp = (whatsapp || "").trim();
  const normalizedNickname = (nickname || "").trim() || null;

  const { data, error } = await supabase
    .from("players")
    .update({
      nickname: normalizedNickname,
      whatsapp: normalizedWhatsapp,
    })
    .eq("id", playerId)
    .select("*")
    .maybeSingle();

  if (error) return { success: false, error: error.message };
  return { success: true, player: data };
}

export async function registerGuest(name, gender, invitedById) {
  const guestName = (name || "").trim();
  if (!guestName) {
    return { success: false, error: "Nome do convidado é obrigatório." };
  }

  const { data, error } = await supabase
    .from("guests")
    .insert({
      name: guestName,
      gender,
      skill_level: 3,
      invited_by: invitedById,
    })
    .select("*")
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, guest: data };
}

export async function updateGuestLevel(guestId, level) {
  const skillLevel = Number(level);

  const { error } = await supabase
    .from("guests")
    .update({ skill_level: skillLevel })
    .eq("id", guestId);

  return !error;
}

export async function getPlayerStats(playerId) {
  const [
    { data: presences, error: presencesError },
    { data: mainRegistrations, error: mainRegistrationsError },
    { data: guestRows, error: guestsError },
    { data: player, error: playerError },
    { data: sundayGames, error: sundayGamesError },
  ] = await Promise.all([
    supabase
      .from("game_presences")
      .select("game_id, present")
      .eq("player_id", playerId),
    supabase
      .from("game_registrations")
      .select(
        "game_id, registered_at, game:games!game_registrations_game_id_fkey(id, day, date)",
      )
      .eq("player_id", playerId)
      .eq("slot", "main"),
    supabase
      .from("game_registrations")
      .select("id")
      .eq("invited_by", playerId)
      .is("player_id", null),
    supabase
      .from("players")
      .select(
        "is_captain, is_setter, badge_monster_block, badge_super_spike, badge_guardian",
      )
      .eq("id", playerId)
      .maybeSingle(),
    supabase
      .from("games")
      .select("id, date, time")
      .eq("day", "sunday")
      .order("date", { ascending: false })
      .order("time", { ascending: false }),
  ]);

  if (
    presencesError ||
    mainRegistrationsError ||
    guestsError ||
    playerError ||
    sundayGamesError
  ) {
    console.error("[getPlayerStats] erro ao buscar estatisticas", {
      presencesError,
      mainRegistrationsError,
      guestsError,
      playerError,
      sundayGamesError,
    });
  }

  const safePresences = presences || [];
  const safeMainRegistrations = mainRegistrations || [];
  const todayString = new Date().toISOString().slice(0, 10);
  const cutoffDate = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const totalGames = safeMainRegistrations.filter((row) => {
    const registeredAt = new Date(row.registered_at);
    if (Number.isNaN(registeredAt.getTime())) return false;
    return registeredAt.getTime() < cutoffDate.getTime();
  }).length;

  const totalAbsences = safePresences.filter(
    (row) => row.present === false,
  ).length;
  const totalGuests = (guestRows || []).length;

  const absentGameIds = new Set(
    safePresences
      .filter((row) => row.present === false)
      .map((row) => String(row.game_id)),
  );

  const sundayRegisteredMainGameIds = new Set(
    safeMainRegistrations
      .filter((row) => row.game?.day === "sunday")
      .map((row) => String(row.game_id)),
  );

  const playedSundays = (sundayGames || []).filter((game) => {
    return typeof game.date === "string" && game.date < todayString;
  });

  let currentStreak = 0;
  for (const game of playedSundays) {
    const gameId = String(game.id);
    if (!sundayRegisteredMainGameIds.has(gameId)) break;
    if (absentGameIds.has(gameId)) break;
    currentStreak += 1;
  }

  const sundayAbsences = playedSundays.filter(
    (game) =>
      sundayRegisteredMainGameIds.has(String(game.id)) &&
      absentGameIds.has(String(game.id)),
  ).length;

  return {
    totalGames,
    totalAbsences,
    totalPenalties: sundayAbsences,
    totalGuests,
    currentStreak,
    isCaptain: Boolean(player?.is_captain),
    isSetter: Boolean(player?.is_setter),
    badgeMonsterBlock: player?.badge_monster_block ?? false,
    badgeSuperSpike: player?.badge_super_spike ?? false,
    badgeGuardian: player?.badge_guardian ?? false,
  };
}

export async function getScraps(playerId) {
  const { data, error } = await supabase
    .from("scraps")
    .select(
      "id, from_player_id, to_player_id, message, created_at, from_player:players!scraps_from_player_id_fkey(id, name, nickname, avatar_url)",
    )
    .eq("to_player_id", playerId)
    .order("created_at", { ascending: false });

  if (error) return [];
  return data || [];
}

export async function getAllScraps() {
  const { data, error } = await supabase
    .from("scraps")
    .select(
      "id, from_player_id, to_player_id, message, created_at, from_player:players!scraps_from_player_id_fkey(id, name, nickname, avatar_url), to_player:players!scraps_to_player_id_fkey(id, name, nickname, avatar_url)",
    )
    .order("created_at", { ascending: false });

  if (error) return [];
  return data || [];
}

export async function createScrap(fromPlayerId, toPlayerId, message) {
  const { data, error } = await supabase
    .from("scraps")
    .insert({
      from_player_id: fromPlayerId,
      to_player_id: toPlayerId,
      message,
    })
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, scrap: data };
}

export async function deleteScrap(scrapId) {
  const { error } = await supabase.from("scraps").delete().eq("id", scrapId);
  return !error;
}

// ── Games ──────────────────────────────────────────

export async function getGames() {
  const { data, error } = await supabase
    .from("games")
    .select("*")
    .order("date");

  if (error) return [];

  const games = data || [];
  const [currentWednesdayId, currentSundayId] = await Promise.all([
    getCurrentGameIdForDay("wednesday"),
    getCurrentGameIdForDay("sunday"),
  ]);

  const currentFixedGameIds = new Map(
    [
      ["wednesday", currentWednesdayId],
      ["sunday", currentSundayId],
    ].filter(([, gameId]) => Boolean(gameId)),
  );

  return games
    .filter((game) => {
      if (!isFixedDay(game?.day)) return true;

      const currentId = currentFixedGameIds.get(game.day);
      if (!currentId) return false;
      return String(game.id) === String(currentId);
    })
    .sort((a, b) => {
      const dateCompare = String(a?.date || "").localeCompare(
        String(b?.date || ""),
      );
      if (dateCompare !== 0) return dateCompare;
      return String(a?.time || "").localeCompare(String(b?.time || ""));
    });
}

export async function createGame(game) {
  const dayNames = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];
  const dateObj = new Date(`${game.date}T12:00:00Z`);
  const day = dayNames[dateObj.getUTCDay()];
  const id = `${day}-${game.date}`;

  const payload = {
    id,
    day,
    date: game.date,
    location: game.location,
    time: game.time,
    status: game.status || "active",
    notes: game.notes || null,
  };

  const { data, error } = await supabase
    .from("games")
    .insert(payload)
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, game: data };
}

export async function updateGame(gameId, data) {
  const payload = {
    location: data.location,
    time: data.time,
    date: data.date,
    status: data.status,
    notes: data.notes,
  };

  const cleanPayload = Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined),
  );

  const { error } = await supabase
    .from("games")
    .update(cleanPayload)
    .eq("id", gameId);

  return !error;
}

export async function cancelGame(gameId) {
  const { error } = await supabase
    .from("games")
    .update({ status: "cancelled" })
    .eq("id", gameId);

  return !error;
}

export async function getGameById(gameId) {
  const { data, error } = await supabase
    .from("games")
    .select("*")
    .eq("id", gameId)
    .single();

  if (error) return null;
  if (!data) return null;

  return data;
}

function normalizeGameDate(value) {
  if (!value) return null;
  return String(value).split("T")[0] || null;
}

function isFixedDay(day) {
  return day === "wednesday" || day === "sunday";
}

function formatLocalDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isNewFormatGameId(gameId, day) {
  return typeof gameId === "string" && gameId.startsWith(`${day}-`);
}

function pickCurrentGameIdForDay(day, games, now = new Date()) {
  if (!isFixedDay(day)) return null;

  const today = formatLocalDate(now);
  if (!today) return null;

  const upcomingGames = (games || [])
    .filter((game) => game?.day === day)
    .filter((game) => game?.status === "active")
    .filter((game) => {
      const normalizedDate = normalizeGameDate(game?.date);
      return Boolean(normalizedDate && normalizedDate >= today);
    });

  if (!upcomingGames.length) return null;

  const earliestDate = upcomingGames.reduce((currentEarliest, game) => {
    const gameDate = normalizeGameDate(game?.date);
    if (!currentEarliest) return gameDate;
    if (!gameDate) return currentEarliest;
    return gameDate < currentEarliest ? gameDate : currentEarliest;
  }, null);

  const gamesOnCurrentCycle = upcomingGames.filter(
    (game) => normalizeGameDate(game?.date) === earliestDate,
  );

  const preferred = gamesOnCurrentCycle.find((game) =>
    isNewFormatGameId(String(game?.id || ""), day),
  );
  if (preferred?.id) return String(preferred.id);

  const firstByTime = [...gamesOnCurrentCycle].sort((a, b) => {
    const timeCompare = String(a?.time || "").localeCompare(
      String(b?.time || ""),
    );
    if (timeCompare !== 0) return timeCompare;
    return String(a?.id || "").localeCompare(String(b?.id || ""));
  })[0];

  if (firstByTime?.id) return String(firstByTime.id);
  return null;
}

export async function getCurrentGameIdForDay(day, now = new Date()) {
  if (!isFixedDay(day)) return null;

  const { data, error } = await supabase
    .from("games")
    .select("id, day, date, time, status")
    .eq("day", day)
    .eq("status", "active")
    .order("date")
    .order("time");

  if (error) {
    console.error("[Supabase] Falha ao resolver jogo atual por dia:", {
      day,
      error,
    });
    return null;
  }

  return pickCurrentGameIdForDay(day, data || [], now);
}

function dedupeById(rows) {
  const seen = new Set();
  return (rows || []).filter((row) => {
    if (!row?.id) return false;
    if (seen.has(row.id)) return false;
    seen.add(row.id);
    return true;
  });
}

export async function resolveGameId(gameId) {
  if (!gameId) return gameId;

  const requestedId = String(gameId);
  const { data: requestedGame } = await supabase
    .from("games")
    .select("id, day, date")
    .eq("id", requestedId)
    .maybeSingle();

  if (!requestedGame || !isFixedDay(requestedGame.day)) {
    return requestedId;
  }

  const currentGameId = await getCurrentGameIdForDay(requestedGame.day);
  if (currentGameId) return currentGameId;

  const normalizedDate = normalizeGameDate(requestedGame.date);
  if (!normalizedDate) return requestedId;

  const newFormatId = `${requestedGame.day}-${normalizedDate}`;
  const { data: newFormatGame } = await supabase
    .from("games")
    .select("id")
    .eq("id", newFormatId)
    .maybeSingle();

  if (newFormatGame?.id) return newFormatGame.id;
  return requestedId;
}

async function resolveEquivalentGameIds(gameId) {
  const requestedId = String(gameId || "");
  if (!requestedId) return [];

  const resolvedId = await resolveGameId(requestedId);
  const ids = new Set([resolvedId].filter(Boolean));

  const { data: resolvedGame } = await supabase
    .from("games")
    .select("day, date")
    .eq("id", resolvedId)
    .maybeSingle();

  if (!resolvedGame || !isFixedDay(resolvedGame.day)) {
    ids.add(requestedId);
    return Array.from(ids);
  }

  const normalizedDate = normalizeGameDate(resolvedGame.date);
  if (!normalizedDate) return Array.from(ids);

  const fallbackNewFormatId = `${resolvedGame.day}-${normalizedDate}`;
  ids.add(fallbackNewFormatId);

  const { data: sameDateGames } = await supabase
    .from("games")
    .select("id")
    .eq("day", resolvedGame.day)
    .eq("date", normalizedDate);

  (sameDateGames || []).forEach((game) => {
    if (game?.id) ids.add(game.id);
  });

  return Array.from(ids);
}

async function getRegistrationRowsByGameIds(gameIds, columns) {
  const uniqueGameIds = Array.from(new Set((gameIds || []).filter(Boolean)));
  if (!uniqueGameIds.length) return { data: [], error: null };

  const results = await Promise.all(
    uniqueGameIds.map((id) =>
      supabase.from("game_registrations").select(columns).eq("game_id", id),
    ),
  );

  const firstErrorResult = results.find((result) => result.error);
  if (firstErrorResult?.error) {
    return { data: [], error: firstErrorResult.error };
  }

  const rows = results.flatMap((result) => result.data || []);
  const dedupedRows = dedupeById(rows).sort((a, b) =>
    String(a?.registered_at || "").localeCompare(
      String(b?.registered_at || ""),
    ),
  );

  return { data: dedupedRows, error: null };
}

function getCycleOpenAt(game) {
  if (!game?.date || !game?.day) return null;
  if (game.day !== "wednesday" && game.day !== "sunday") return null;

  const [year, month, day] = String(game.date)
    .split("T")[0]
    .split("-")
    .map((value) => Number.parseInt(value, 10));

  if (!year || !month || !day) return null;

  const gameDate = new Date(year, month - 1, day, 0, 0, 0, 0);
  const offsetDays = game.day === "wednesday" ? 2 : 3;
  gameDate.setDate(gameDate.getDate() - offsetDays);
  gameDate.setHours(19, 0, 0, 0);

  return gameDate;
}

function isRegistrationInCurrentCycle(registration, game) {
  const openAt = getCycleOpenAt(game);
  if (!openAt) return true;

  const registeredAt = new Date(registration?.registered_at);
  if (Number.isNaN(registeredAt.getTime())) return false;

  return registeredAt.getTime() >= openAt.getTime();
}

function isGuestMigrationWindowOpen(game, now = new Date()) {
  if (game?.day !== "sunday" || !game?.date) return false;

  const [year, month, day] = String(game.date)
    .split("T")[0]
    .split("-")
    .map((value) => Number.parseInt(value, 10));

  if (!year || !month || !day) return false;

  const saturdayStart = new Date(year, month - 1, day, 0, 0, 0, 0);
  saturdayStart.setDate(saturdayStart.getDate() - 1);

  return now.getTime() >= saturdayStart.getTime();
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

  if (!guestRegistrations.length) return false;

  let mainCount = currentCycleRegistrations.filter(
    (registration) => registration.slot === "main",
  ).length;

  const updates = guestRegistrations.map((registration, index) => {
    const targetSlot = mainCount < MAX_MAIN_LIST ? "main" : "waitlist";
    if (targetSlot === "main") {
      mainCount += 1;
    }

    const registeredAt = new Date(now.getTime() + index).toISOString();

    return {
      id: registration.id,
      slot: targetSlot,
      registered_at: registeredAt,
    };
  });

  const results = await Promise.all(
    updates.map((updatePayload) =>
      supabase
        .from("game_registrations")
        .update({
          slot: updatePayload.slot,
          registered_at: updatePayload.registered_at,
        })
        .eq("id", updatePayload.id),
    ),
  );

  const updateError = results.find((result) => result.error)?.error || null;
  if (updateError) {
    console.error(
      "[Supabase] Falha ao atualizar convidados na migracao automatica:",
      updateError,
    );
    return false;
  }

  return true;
}

// ── Registrations ──────────────────────────────────

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
    "*, player:players!game_registrations_player_id_fkey(*), inviter:players!game_registrations_invited_by_fkey(id, name, nickname, gender, status, type, is_captain, is_setter, position), guest:guests!game_registrations_guest_id_fkey(id, name, gender, skill_level, invited_by)",
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
    .eq("slot", "main");

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

function isSaturdayOrSunday(now = new Date()) {
  const day = now.getDay();
  return day === 6 || day === 0;
}

async function hasMainSpotAvailableForJoin(game, fallbackGameId) {
  const day = game?.day;
  let countGameId = fallbackGameId;

  if (isFixedDay(day)) {
    countGameId = (await getCurrentGameIdForDay(day)) || fallbackGameId;
  }

  const registrations = await getGameRegistrations(countGameId, {
    autoMigrate: false,
  });
  const mainCount = (registrations || []).filter(
    (registration) => registration.slot === "main",
  ).length;

  return mainCount < MAX_MAIN_LIST;
}

function resolveSundaySlot({ isGuest, hasMainSpot, now = new Date() }) {
  if (!isGuest) {
    return hasMainSpot ? "main" : "waitlist";
  }

  if (!isSaturdayOrSunday(now)) {
    return "guests";
  }

  return hasMainSpot ? "main" : "waitlist";
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
  let effectiveSlot;
  let playerType = "guest";
  let isPenalized = false;

  if (playerId) {
    const player = await getPlayerById(playerId);
    const playerStatus = player?.status;
    playerType = player?.type === "guest" ? "guest" : "member";

    if (playerStatus === "blocked") {
      return false;
    }

    if (playerStatus === "penalized") {
      isPenalized = true;
    }

    const alreadyRegistered = await isPlayerRegistered(targetGameId, playerId);
    if (alreadyRegistered) return false;
  }

  const hasMainSpot = await hasMainSpotAvailableForJoin(game, targetGameId);

  if (isPenalized) {
    effectiveSlot = "waitlist";
  } else if (game?.day === "sunday") {
    effectiveSlot = resolveSundaySlot({
      isGuest: playerType === "guest",
      hasMainSpot,
    });
  } else {
    effectiveSlot = hasMainSpot ? "main" : "waitlist";
  }

  const { error } = await supabase.from("game_registrations").insert({
    game_id: targetGameId,
    player_id: playerId || null,
    guest_name: guestId ? null : guestName || null,
    guest_id: guestId || null,
    invited_by: invitedBy || null,
    slot: effectiveSlot,
  });

  if (!error) {
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
  }

  return !error;
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
  const results = await Promise.all(
    equivalentGameIds.map((id) => {
      let query = supabase
        .from("game_registrations")
        .delete()
        .eq("game_id", id);

      if (guestId) {
        query = query.eq("guest_id", guestId);
      } else {
        query = query.eq("player_id", playerId);
      }

      return query.select("id, slot, guest_id");
    }),
  );

  const playerError = results.find((result) => result.error)?.error || null;
  const removedRegistrations = results.flatMap((result) => result.data || []);

  if (playerError) {
    console.error("[leaveGame] delete failed, skipping promotion", {
      gameId,
      playerId,
      playerError,
    });
    return false;
  }

  if ((removedRegistrations || []).length > 0) {
    const removedGuestId =
      guestId ||
      removedRegistrations.find((registration) => registration?.guest_id)
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

  await fillMainListFromWaitlist(gameId);

  await autoMigrateGuests(resolvedGameId, {
    game: gameData || null,
  });

  return true;
}

async function fillMainListFromWaitlist(gameId) {
  const registrations = await getGameRegistrations(gameId);
  const mainListCount = (registrations || []).filter(
    (registration) => registration.slot === "main",
  ).length;

  let spotsAvailable = MAX_MAIN_LIST - mainListCount;
  while (spotsAvailable > 0) {
    const promoted = await promoteFromWaitlist(gameId);
    if (!promoted) break;
    spotsAvailable -= 1;
  }
}

export async function promoteFromWaitlist(gameId) {
  const registrations = await getGameRegistrations(gameId);
  const firstWaitlist = (registrations || []).find((registration) => {
    if (registration.slot !== "waitlist") return false;

    // Guests do not have penalization status and remain eligible for promotion.
    if (!registration.player_id) return true;

    return registration.player?.status !== "penalized";
  });

  if (!firstWaitlist?.id) return false;

  const { error: updateError } = await supabase
    .from("game_registrations")
    .update({ slot: "main" })
    .eq("id", firstWaitlist.id);

  if (!updateError) {
    await logAction(
      firstWaitlist.game_id || gameId,
      firstWaitlist.player_id || null,
      "promoted_to_main",
      firstWaitlist.guest_id ? "Convidado promovido" : null,
    );
  }

  return !updateError;
}

export async function migrateGuestsToWaitlist(gameId) {
  const equivalentGameIds = await resolveEquivalentGameIds(gameId);
  const results = await Promise.all(
    equivalentGameIds.map((id) =>
      supabase
        .from("game_registrations")
        .update({
          slot: "waitlist",
          registered_at: new Date().toISOString(),
        })
        .eq("game_id", id)
        .eq("slot", "guests"),
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
    await fillMainListFromWaitlist(removedRegistration.game_id);
  }

  return true;
}

// ── Avatar ──────────────────────────────────────────

export async function uploadAvatar(playerId, file) {
  const ext = file.name.split(".").pop();
  const path = `${playerId}.${ext}`;

  const { error } = await supabase.storage
    .from("avatars")
    .upload(path, file, { upsert: true });

  if (error) return { success: false, error: error.message };

  const { data } = supabase.storage.from("avatars").getPublicUrl(path);

  return { success: true, url: data.publicUrl };
}

export async function updatePlayerAvatar(playerId, avatarUrl) {
  const { error } = await supabase
    .from("players")
    .update({ avatar_url: avatarUrl })
    .eq("id", playerId);

  return !error;
}

// ── Teams ──────────────────────────────────────────

export async function saveGameTeams(gameId, teams) {
  const canonicalGameId = await resolveGameId(gameId);
  const equivalentGameIds = await resolveEquivalentGameIds(gameId);

  await Promise.all(
    equivalentGameIds.map((id) =>
      supabase.from("game_teams").delete().eq("game_id", id),
    ),
  );

  const rows = teams.map((team) => ({
    game_id: canonicalGameId,
    team_name: team.name,
    players: team.players,
    total_level: team.totalLevel,
  }));

  const { error } = await supabase.from("game_teams").insert(rows);

  return !error;
}

export async function getGameTeams(gameId) {
  const equivalentGameIds = await resolveEquivalentGameIds(gameId);
  const [game, gamesByIdList] = await Promise.all([
    getGameById(gameId),
    Promise.all(equivalentGameIds.map((id) => getGameById(id))),
  ]);

  const gamesById = new Map();
  equivalentGameIds.forEach((id, index) => {
    const item = gamesByIdList[index];
    if (item) gamesById.set(String(id), item);
  });

  const cycleOpenAt = getCycleOpenAt(game);

  const results = await Promise.all(
    equivalentGameIds.map((id) =>
      supabase
        .from("game_teams")
        .select("*")
        .eq("game_id", id)
        .order("team_name"),
    ),
  );

  const error = results.find((result) => result.error)?.error || null;
  const data = dedupeById(results.flatMap((result) => result.data || [])).sort(
    (a, b) =>
      String(a?.team_name || "").localeCompare(String(b?.team_name || "")),
  );

  if (error) return [];
  if (!cycleOpenAt) return data || [];

  return (data || []).filter((team) => {
    const teamGame = gamesById.get(String(team.game_id)) || game;
    const openAt = getCycleOpenAt(teamGame);
    if (!openAt) return true;

    const createdAt = new Date(team.created_at);
    if (Number.isNaN(createdAt.getTime())) return false;
    return createdAt.getTime() >= openAt.getTime();
  });
}

// ── Presences ───────────────────────────────────────

export async function getGamePresences(gameId) {
  const equivalentGameIds = await resolveEquivalentGameIds(gameId);
  const results = await Promise.all(
    equivalentGameIds.map((id) =>
      supabase.from("game_presences").select("*").eq("game_id", id),
    ),
  );

  const error = results.find((result) => result.error)?.error || null;
  const merged = results.flatMap((result) => result.data || []);
  const byPlayerId = new Map();
  merged.forEach((row) => {
    const key = String(row?.player_id || "");
    if (!key) return;

    const current = byPlayerId.get(key);
    if (!current) {
      byPlayerId.set(key, row);
      return;
    }

    const currentUpdatedAt = String(
      current?.updated_at || current?.created_at || "",
    );
    const rowUpdatedAt = String(row?.updated_at || row?.created_at || "");
    if (rowUpdatedAt > currentUpdatedAt) {
      byPlayerId.set(key, row);
    }
  });

  const data = Array.from(byPlayerId.values());

  if (error) return [];
  return data || [];
}

export async function upsertPresence(gameId, playerId, present) {
  const canonicalGameId = await resolveGameId(gameId);
  const { error } = await supabase.from("game_presences").upsert(
    {
      game_id: canonicalGameId,
      player_id: playerId,
      present,
    },
    { onConflict: "game_id,player_id" },
  );

  return !error;
}

export async function penalizePlayer(playerId) {
  const { error } = await supabase
    .from("players")
    .update({ status: "penalized" })
    .eq("id", playerId);

  return !error;
}

// ── Announcements ───────────────────────────────────

export async function getActiveAnnouncements() {
  const { data, error } = await supabase
    .from("announcements")
    .select("*")
    .eq("active", true)
    .order("created_at", { ascending: false });

  if (error) return [];
  return data || [];
}

export async function getAllAnnouncements() {
  const { data, error } = await supabase
    .from("announcements")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return [];
  return data || [];
}

export async function getAuditLogs() {
  const { data, error } = await supabase
    .from("audit_log")
    .select(
      "id, game_id, player_id, guest_id, action, details, created_at, player:players(id, name, nickname), guest:guests!audit_log_guest_id_fkey(id, name)",
    )
    .order("created_at", { ascending: false });

  if (error) return [];
  return data || [];
}

export async function createAnnouncement({ title, body, urgent }) {
  const { data, error } = await supabase
    .from("announcements")
    .insert({ title, body, urgent: Boolean(urgent), active: true })
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, announcement: data };
}

export async function updateAnnouncement(id, { title, body, urgent, active }) {
  const { error } = await supabase
    .from("announcements")
    .update({ title, body, urgent: Boolean(urgent), active: Boolean(active) })
    .eq("id", id);

  return !error;
}

export async function deleteAnnouncement(id) {
  const { error } = await supabase.from("announcements").delete().eq("id", id);

  return !error;
}
