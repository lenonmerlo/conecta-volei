import { supabase } from "../../lib/supabase";
import {
  dedupeById,
  getGameById,
  resolveEquivalentGameIds,
  resolveGameId,
} from "./games.js";
import { getCycleOpenAt } from "./registrationRules.js";

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