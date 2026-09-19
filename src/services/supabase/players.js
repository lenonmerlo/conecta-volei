import { supabase } from "../../lib/supabase";
import { isSuperAdmin } from "../../domain/admins";
import { logAction } from "./audit.js";

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
      "id, name, nickname, gender, status, avatar_url, is_captain, is_setter, position, badge_monster_block, badge_super_spike, badge_guardian",
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

  if (error) return { success: false, error: error.message };
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

function nextMondayInSaoPaulo(now = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(now)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );

  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  const daysUntilMonday = ((8 - date.getUTCDay()) % 7) || 7;

  date.setUTCDate(date.getUTCDate() + daysUntilMonday);
  return date.toISOString().slice(0, 10);
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
  if (currentWarnings >= 3) return player;

  const nextWarnings = currentWarnings + 1;
  const payload = { warnings: nextWarnings };

  if (nextWarnings === 2) {
    payload.priority_penalty_week = nextMondayInSaoPaulo();
  }

  if (nextWarnings === 3) {
    payload.suspension_week = nextMondayInSaoPaulo();
  }

  const { data, error } = await supabase
    .from("players")
    .update(payload)
    .eq("id", playerId)
    .select("*")
    .maybeSingle();

  if (error) {
    console.error("[players] falha ao adicionar advertência", error);
    return null;
  }

  return data;
}

export async function removeWarning(playerId) {
  const player = await getPlayerById(playerId);
  if (!player) return null;

  const currentWarnings = Math.max(0, Number(player.warnings) || 0);
  const nextWarnings = Math.max(0, currentWarnings - 1);

  const hadScheduledPenalty = Boolean(
    player.priority_penalty_week || player.suspension_week,
  );

  const payload = {
    warnings: nextWarnings,
    priority_penalty_week: null,
    suspension_week: null,
  };

  if (
    hadScheduledPenalty &&
    (player.status === "penalized" || player.status === "blocked")
  ) {
    payload.status = "active";
  }

  const { data, error } = await supabase
    .from("players")
    .update(payload)
    .eq("id", playerId)
    .select("*")
    .maybeSingle();

  if (error) {
    console.error("[players] falha ao remover advertência", error);
    return null;
  }

  return data;
}

export async function resetWarnings(playerId) {
  const { data, error } = await supabase
    .from("players")
    .update({
      warnings: 0,
      status: "active",
      priority_penalty_week: null,
      suspension_week: null,
    })
    .eq("id", playerId)
    .select("*")
    .maybeSingle();

  if (error) {
    console.error("[players] falha ao zerar advertências", error);
    return null;
  }

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
        "game_id, registered_at, left_at, game:games!game_registrations_game_id_fkey(id, day, date)",
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
    if (row.left_at) return true;

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

export async function penalizePlayer(playerId) {
  const { error } = await supabase
    .from("players")
    .update({ status: "penalized" })
    .eq("id", playerId);

  return !error;
}