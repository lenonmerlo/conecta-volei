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

function getCandidateGenderFromVote(vote) {
  return vote.voted_player?.gender ?? vote.voted_guest?.gender ?? null;
}

export async function submitVote(gameId, voterId, votedPlayerId, category) {
  const voteCategory = VOTE_CATEGORIES.find((item) => item.key === category);

  if (!voteCategory) {
    return { success: false, error: "Categoria de votação inválida." };
  }

  const { voted_player_id, voted_guest_id } =
    parseVotedCandidateId(votedPlayerId);

  if (!voted_player_id && !voted_guest_id) {
    return { success: false, error: "Selecione uma pessoa para votar." };
  }

  if (voteCategory.candidateGender) {
    const table = voted_guest_id ? "guests" : "players";
    const candidateId = voted_guest_id || voted_player_id;

    const { data: candidate, error: candidateError } = await supabase
      .from(table)
      .select("gender")
      .eq("id", candidateId)
      .maybeSingle();

    if (candidateError || !candidate) {
      return {
        success: false,
        error: "Não foi possível conferir a candidata selecionada.",
      };
    }

    if (candidate.gender !== voteCategory.candidateGender) {
      return {
        success: false,
        error: "Esta categoria aceita apenas candidatas mulheres.",
      };
    }
  }

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
      "*, voted_player:players!votes_voted_player_id_fkey(id, name, nickname, gender), voted_guest:guests!votes_voted_guest_id_fkey(id, name, gender)",
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

  VOTE_CATEGORIES.forEach(({ key, candidateGender }) => {
    const tally = new Map();

    votes
      .filter((vote) => vote.category === key)
      .filter(
        (vote) =>
          !candidateGender ||
          getCandidateGenderFromVote(vote) === candidateGender,
      )
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

    const ranked = [...tally.values()].sort(
      (a, b) =>
        b.count - a.count ||
        a.name.localeCompare(b.name, "pt-BR") ||
        a.id.localeCompare(b.id),
    );

    if (ranked.length === 0) {
      results[key] = null;
      return;
    }

    const highestCount = ranked[0].count;

    // Mantém id, name e count para compatibilidade com as telas atuais.
    // winners contém todas as pessoas empatadas em primeiro lugar.
    results[key] = {
      ...ranked[0],
      winners: ranked.filter((candidate) => candidate.count === highestCount),
    };
  });

  return results;
}