import { supabase } from "../../lib/supabase";
import { VOTE_CATEGORIES } from "../../domain/constants";

function parseVotedCandidateId(votedPlayerId) {
  const raw = String(votedPlayerId || "");

  if (raw.startsWith("guest-")) {
    return { voted_player_id: null, voted_guest_id: raw.slice(6) };
  }

  return { voted_player_id: raw, voted_guest_id: null };
}

function getCandidateIdFromVote(vote) {
  if (vote.voted_player_id) return vote.voted_player_id;
  if (vote.voted_guest_id) return `guest-${vote.voted_guest_id}`;
  return null;
}

export async function submitVote(gameId, voterId, votedPlayerId, category) {
  const { voted_player_id, voted_guest_id } =
    parseVotedCandidateId(votedPlayerId);

  const { error } = await supabase.from("votes").upsert(
    {
      game_id: gameId,
      voter_id: voterId,
      voted_player_id,
      voted_guest_id,
      category,
    },
    { onConflict: "game_id,voter_id,category" },
  );

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function getVotesByGame(gameId) {
  const { data, error } = await supabase
    .from("votes")
    .select(
      "*, voted_player:players!votes_voted_player_id_fkey(id, name, nickname), voted_guest:guests!votes_voted_guest_id_fkey(id, name)",
    )
    .eq("game_id", gameId);

  if (error) return [];

  return (data || []).map((vote) => ({
    ...vote,
    nome: vote.voted_player?.name ?? vote.voted_guest?.name ?? null,
  }));
}

export async function getMyVotes(gameId, voterId) {
  const { data, error } = await supabase
    .from("votes")
    .select("*")
    .eq("game_id", gameId)
    .eq("voter_id", voterId);

  if (error) return [];
  return data || [];
}

export async function getVotingResults(gameId) {
  const votes = await getVotesByGame(gameId);
  const results = {};

  VOTE_CATEGORIES.forEach(({ key }) => {
    const tally = new Map();

    votes
      .filter((vote) => vote.category === key)
      .forEach((vote) => {
        const candidateId = getCandidateIdFromVote(vote);
        if (!candidateId) return;

        const name = vote.nome ?? "Desconhecido";
        const current = tally.get(candidateId) || {
          id: candidateId,
          name,
          count: 0,
        };

        current.count += 1;
        tally.set(candidateId, current);
      });

    const winner = [...tally.values()].sort((a, b) => b.count - a.count)[0];
    results[key] = winner || null;
  });

  return results;
}