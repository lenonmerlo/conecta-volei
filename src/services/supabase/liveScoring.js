import { supabase } from "../../lib/supabase";

function resultError(error, fallback) {
  return {
    success: false,
    error: error?.message || fallback,
  };
}

export async function configureMatchScoring({
  gameId,
  accessCode,
  expiresAt = null,
  createdBy = null,
}) {
  const { data, error } = await supabase.rpc("configure_match_scoring", {
    p_game_id: gameId,
    p_access_code: accessCode,
    p_expires_at: expiresAt,
    p_created_by: createdBy,
  });

  if (error) {
    return resultError(error, "Não foi possível habilitar a marcação.");
  }

  return { success: true, access: data };
}

export async function disableMatchScoring(gameId) {
  const { error } = await supabase.rpc("disable_match_scoring", {
    p_game_id: gameId,
  });

  if (error) {
    return resultError(error, "Não foi possível encerrar a marcação.");
  }

  return { success: true };
}

export async function joinMatchScoring({
  gameId,
  accessCode,
  scorerName,
  scorerRole,
}) {
  const { data, error } = await supabase.rpc("join_match_scoring", {
    p_game_id: gameId,
    p_access_code: accessCode,
    p_scorer_name: scorerName,
    p_scorer_role: scorerRole,
  });

  if (error) {
    return resultError(error, "Não foi possível entrar na marcação.");
  }

  const session = Array.isArray(data) ? data[0] : data;
  return { success: true, session };
}

export async function touchMatchScorer(accessToken) {
  const { error } = await supabase.rpc("touch_match_scorer", {
    p_access_token: accessToken,
  });

  return !error;
}

export async function leaveMatchScoring(accessToken) {
  const { error } = await supabase.rpc("leave_match_scoring", {
    p_access_token: accessToken,
  });

  return !error;
}

export async function recordMatchStat({
  accessToken,
  playerId = null,
  guestId = null,
  statField,
  clientEventId,
}) {
  const { data, error } = await supabase.rpc("record_match_stat_event", {
    p_access_token: accessToken,
    p_player_id: playerId,
    p_guest_id: guestId,
    p_stat_field: statField,
    p_client_event_id: clientEventId,
  });

  if (error) {
    return resultError(error, "Não foi possível registrar o lance.");
  }

  return { success: true, event: data };
}

export async function undoLastMatchStat(accessToken) {
  const { data, error } = await supabase.rpc("undo_last_match_stat_event", {
    p_access_token: accessToken,
  });

  if (error) {
    return resultError(error, "Não foi possível desfazer a marcação.");
  }

  return { success: true, event: data };
}

export function subscribeToMatchStatistics(gameId, onChange) {
  const channel = supabase
    .channel(`live-scoring-${gameId}-${crypto.randomUUID()}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "game_player_stats",
        filter: `game_id=eq.${gameId}`,
      },
      onChange,
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
