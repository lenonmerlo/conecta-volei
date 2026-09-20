import { supabase } from "../../lib/supabase";
import { resolveEquivalentGameIds, resolveGameId } from "./games.js";
import { logAction } from "./audit.js";

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

  if (error) return [];
  return Array.from(byPlayerId.values());
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

export async function markAbsenceAndWarn(gameId, playerId) {
  const canonicalGameId = await resolveGameId(gameId);

  const { data, error } = await supabase.rpc("mark_absence_and_warn", {
    p_game_id: canonicalGameId,
    p_player_id: playerId,
  });

  if (error) {
    console.error("[presences] falha ao registrar falta", error);
    return { success: false, warningAdded: false };
  }

  if (data === true) {
    await logAction(
      canonicalGameId,
      playerId,
      "warning_added",
      "Falta registrada",
    );
  }

  return {
    success: true,
    warningAdded: data === true,
  };
}