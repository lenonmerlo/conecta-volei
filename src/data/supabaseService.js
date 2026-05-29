// Serviço de integração com o Supabase

import { getNextGameDate } from "../domain/gameRules";
import { supabase } from "../lib/supabase";

// ── Players ──────────────────────────────────────────

export async function registerPlayer(player) {
  const { data, error } = await supabase
    .from("players")
    .insert({
      name: player.name,
      nickname: player.nickname || null,
      whatsapp: player.whatsapp,
      gender: player.gender,
      type: "member",
      status: "active",
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

export async function getAllPlayers() {
  const { data, error } = await supabase
    .from("players")
    .select("*")
    .order("name");

  if (error) return [];
  return data;
}

export async function updatePlayerStatus(playerId, status) {
  const { error } = await supabase
    .from("players")
    .update({ status })
    .eq("id", playerId);

  return !error;
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

// ── Games ──────────────────────────────────────────

export async function getGames() {
  const { data, error } = await supabase
    .from("games")
    .select("*")
    .order("date");

  if (error) return [];
  return data;
}

export async function updateGameDates() {
  const { data, error } = await supabase.from("games").select("id, day, date");

  if (error) {
    console.error("[updateGameDates] Falha ao buscar jogos:", error);
    return false;
  }

  const updates = (data || [])
    .map((game) => {
      const nextDate = getNextGameDate(game.day);
      const currentDate = (game.date || "").toString().split("T")[0];
      return {
        id: game.id,
        currentDate,
        nextDate,
      };
    })
    .filter((game) => game.currentDate !== game.nextDate);

  if (updates.length === 0) return true;

  const results = await Promise.all(
    updates.map((game) =>
      supabase.from("games").update({ date: game.nextDate }).eq("id", game.id),
    ),
  );

  const hasError = results.some((result) => result.error);
  if (hasError) {
    console.error(
      "[updateGameDates] Falha ao atualizar uma ou mais datas:",
      results.filter((result) => result.error).map((result) => result.error),
    );
  }

  return !hasError;
}

export async function getGameById(gameId) {
  const { data, error } = await supabase
    .from("games")
    .select("*")
    .eq("id", gameId)
    .single();

  if (error) return null;
  return data;
}

// ── Registrations ──────────────────────────────────

export async function getGameRegistrations(gameId) {
  const { data, error } = await supabase
    .from("game_registrations")
    .select(
      "*, player:players!game_registrations_player_id_fkey(*), inviter:players!game_registrations_invited_by_fkey(id, name, nickname)",
    )
    .eq("game_id", gameId)
    .order("registered_at");

  if (error) {
    console.error("[Supabase] Falha ao carregar inscricoes do jogo:", error);
    return [];
  }
  return data;
}

export async function joinGame(
  gameId,
  playerId,
  slot,
  guestName = null,
  invitedBy = null,
) {
  const { error } = await supabase.from("game_registrations").insert({
    game_id: gameId,
    player_id: playerId || null,
    guest_name: guestName || null,
    invited_by: invitedBy || null,
    slot,
  });

  return !error;
}

export async function leaveGame(gameId, playerId) {
  const { data: removedPlayerRows, error: playerError } = await supabase
    .from("game_registrations")
    .delete()
    .eq("game_id", gameId)
    .eq("player_id", playerId)
    .select("id, slot");

  console.log("[leaveGame] delete results", {
    gameId,
    playerId,
    removedPlayerRows: removedPlayerRows || [],
    playerError,
  });

  if (playerError) {
    console.error("[leaveGame] delete failed, skipping promotion", {
      gameId,
      playerId,
      playerError,
    });
    return false;
  }

  const removedMainCount = (removedPlayerRows || []).filter(
    (row) => (row.slot || "main") === "main",
  ).length;

  console.log("[leaveGame] removed main slots", {
    gameId,
    playerId,
    removedMainCount,
  });

  // Verifica quantos estao na lista principal agora
  const { count } = await supabase
    .from("game_registrations")
    .select("*", { count: "exact", head: true })
    .eq("game_id", gameId)
    .eq("slot", "main");

  let spotsAvailable = 21 - (count || 0);
  while (spotsAvailable > 0) {
    const promoted = await promoteFromWaitlist(gameId);
    if (!promoted) break;
    spotsAvailable -= 1;
  }

  return true;
}

export async function promoteFromWaitlist(gameId) {
  const { data: firstWaitlist, error: selectError } = await supabase
    .from("game_registrations")
    .select("id")
    .eq("game_id", gameId)
    .eq("slot", "waitlist")
    .order("registered_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  console.log("[promoteFromWaitlist] waitlist lookup", {
    gameId,
    firstWaitlist,
    selectError,
  });

  if (selectError || !firstWaitlist?.id) return false;

  const { error: updateError } = await supabase
    .from("game_registrations")
    .update({ slot: "main" })
    .eq("id", firstWaitlist.id);

  console.log("[promoteFromWaitlist] update to main", {
    gameId,
    promotedRegistrationId: firstWaitlist.id,
    updateError,
  });

  return !updateError;
}

export async function migrateGuestsToWaitlist(gameId) {
  const { error } = await supabase
    .from("game_registrations")
    .update({ slot: "waitlist" })
    .eq("game_id", gameId)
    .eq("slot", "guests");

  return !error;
}

export async function isPlayerRegistered(gameId, playerId) {
  const { data } = await supabase
    .from("game_registrations")
    .select("id")
    .eq("game_id", gameId)
    .eq("player_id", playerId)
    .maybeSingle();

  return !!data;
}

export async function getGuestsByInviter(gameId, inviterId) {
  const { data, error } = await supabase
    .from("game_registrations")
    .select("id, guest_name")
    .eq("game_id", gameId)
    .eq("invited_by", inviterId)
    .is("player_id", null)
    .order("registered_at");

  if (error) return [];
  return data || [];
}

export async function removeGuest(registrationId) {
  const { error } = await supabase
    .from("game_registrations")
    .delete()
    .eq("id", registrationId)
    .is("player_id", null);

  return !error;
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
  await supabase.from("game_teams").delete().eq("game_id", gameId);

  const rows = teams.map((team) => ({
    game_id: gameId,
    team_name: team.name,
    players: team.players,
    total_level: team.totalLevel,
  }));

  const { error } = await supabase.from("game_teams").insert(rows);

  return !error;
}

export async function getGameTeams(gameId) {
  const { data, error } = await supabase
    .from("game_teams")
    .select("*")
    .eq("game_id", gameId)
    .order("team_name");

  if (error) return [];
  return data;
}

// ── Presences ───────────────────────────────────────

export async function getGamePresences(gameId) {
  const { data, error } = await supabase
    .from("game_presences")
    .select("*")
    .eq("game_id", gameId);

  if (error) return [];
  return data || [];
}

export async function upsertPresence(gameId, playerId, present) {
  const { error } = await supabase.from("game_presences").upsert(
    {
      game_id: gameId,
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
