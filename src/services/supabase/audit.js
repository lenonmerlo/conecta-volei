import { supabase } from "../../lib/supabase";

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

export async function getAuditLogs({
  page = 1,
  pageSize = 20,
  gameId = "all",
  action = "all",
} = {}) {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("audit_log")
    .select(
      "id, game_id, player_id, guest_id, action, details, created_at, player:players(id, name, nickname), guest:guests!audit_log_guest_id_fkey(id, name, invited_by)",
      { count: "exact" },
    );

  if (gameId !== "all") {
    query = query.eq("game_id", gameId);
  }

  if (action !== "all") {
    query = query.eq("action", action);
  }

  const { data, count, error } = await query
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("[audit_log] falha ao carregar logs", error);
    throw error;
  }

  const logs = data || [];
  const inviterIds = [
    ...new Set(logs.map((log) => log.guest?.invited_by).filter(Boolean)),
  ];

  if (inviterIds.length === 0) {
    return { logs, total: count ?? 0 };
  }

  const { data: inviters, error: invitersError } = await supabase
    .from("players")
    .select("id, name, nickname")
    .in("id", inviterIds);

  if (invitersError) {
    console.error("[audit_log] falha ao carregar quem convidou", invitersError);
    return { logs, total: count ?? 0 };
  }

  const inviterById = new Map(
    (inviters || []).map((player) => [player.id, player]),
  );

  return {
    logs: logs.map((log) => ({
      ...log,
      inviter: inviterById.get(log.guest?.invited_by) || null,
    })),
    total: count ?? 0,
  };
}