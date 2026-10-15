import { calculateMatchAwards } from "../../domain/matchStatistics";
import { supabase } from "../../lib/supabase";

const STAT_FIELDS = [
  "attack_points",
  "aces",
  "block_points",
  "defenses",
  "assists",
];

function participantKey(row) {
  if (row.player_id) return `player-${row.player_id}`;
  if (row.guest_id) return `guest-${row.guest_id}`;
  return null;
}

function normalizeStatValue(value) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }

  return Math.trunc(parsed);
}

function normalizeEntry(gameId, entry) {
  const normalized = {
    game_id: gameId,
    player_id: entry.player_id || null,
    guest_id: entry.guest_id || null,
    updated_at: new Date().toISOString(),
  };

  STAT_FIELDS.forEach((field) => {
    normalized[field] = normalizeStatValue(entry[field]);
  });

  return normalized;
}

function isValidParticipant(entry) {
  const hasPlayer = Boolean(entry.player_id);
  const hasGuest = Boolean(entry.guest_id);

  return hasPlayer !== hasGuest;
}

function hasRecordedPerformance(statistics) {
  return statistics.some((row) =>
    STAT_FIELDS.some((field) => Number(row[field] || 0) > 0),
  );
}

export async function getMatchParticipants(gameId) {
  if (!gameId) return [];

  const { data, error } = await supabase
    .from("game_registrations")
    .select(
      `
        id,
        game_id,
        player_id,
        guest_id,
        registered_at,
        player:players!game_registrations_player_id_fkey(
          id,
          name,
          nickname,
          gender
        ),
        guest:guests!game_registrations_guest_id_fkey(
          id,
          name,
          gender
        )
      `,
    )
    .eq("game_id", gameId)
    .eq("slot", "main")
    .is("left_at", null)
    .order("registered_at", { ascending: true });

  if (error) {
    console.error("[game_player_stats] Falha ao carregar participantes:", {
      gameId,
      error,
    });

    throw error;
  }

  const participants = (data || []).filter(
    (registration) => registration.player_id || registration.guest_id,
  );

  return participants.filter((registration, index, rows) => {
    const key = participantKey(registration);

    return (
      rows.findIndex((candidate) => participantKey(candidate) === key) === index
    );
  });
}

export async function getMatchStatistics(gameId) {
  if (!gameId) return [];

  const { data, error } = await supabase
    .from("game_player_stats")
    .select(
      `
        id,
        game_id,
        player_id,
        guest_id,
        attack_points,
        aces,
        block_points,
        defenses,
        assists,
        created_at,
        updated_at,
        player:players!game_player_stats_player_id_fkey(
          id,
          name,
          nickname,
          gender
        ),
        guest:guests!game_player_stats_guest_id_fkey(
          id,
          name,
          gender
        )
      `,
    )
    .eq("game_id", gameId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[game_player_stats] Falha ao carregar estatísticas:", {
      gameId,
      error,
    });

    throw error;
  }

  return data || [];
}

export async function saveMatchStatistics(gameId, entries = []) {
  if (!gameId) {
    return {
      success: false,
      error: "Selecione um jogo antes de salvar as estatísticas.",
    };
  }

  const invalidEntry = entries.find((entry) => !isValidParticipant(entry));

  if (invalidEntry) {
    return {
      success: false,
      error: "Existe um participante inválido nas estatísticas.",
    };
  }

  const normalizedEntries = entries.map((entry) =>
    normalizeEntry(gameId, entry),
  );

  // Qualquer alteração devolve o resultado para rascunho.
  const { error: unpublishError } = await supabase
    .from("games")
    .update({
      statistics_published_at: null,
      statistics_published_by: null,
    })
    .eq("id", gameId);

  if (unpublishError) {
    console.error("[game_player_stats] Falha ao retirar publicação:", {
      gameId,
      error: unpublishError,
    });

    return {
      success: false,
      error: "Não foi possível colocar o resultado em modo de rascunho.",
    };
  }

  const { data: existingRows, error: existingError } = await supabase
    .from("game_player_stats")
    .select("id, player_id, guest_id")
    .eq("game_id", gameId);

  if (existingError) {
    console.error(
      "[game_player_stats] Falha ao conferir estatísticas existentes:",
      {
        gameId,
        error: existingError,
      },
    );

    return {
      success: false,
      error: "Não foi possível conferir as estatísticas existentes.",
    };
  }

  const existingByParticipant = new Map(
    (existingRows || [])
      .map((row) => [participantKey(row), row])
      .filter(([key]) => key),
  );

  for (const entry of normalizedEntries) {
    const key = participantKey(entry);
    const existing = existingByParticipant.get(key);

    if (existing) {
      const { error } = await supabase
        .from("game_player_stats")
        .update({
          attack_points: entry.attack_points,
          aces: entry.aces,
          block_points: entry.block_points,
          defenses: entry.defenses,
          assists: entry.assists,
          updated_at: entry.updated_at,
        })
        .eq("id", existing.id);

      if (error) {
        console.error("[game_player_stats] Falha ao atualizar estatística:", {
          gameId,
          participant: key,
          error,
        });

        return {
          success: false,
          error: "Não foi possível atualizar todas as estatísticas.",
        };
      }

      continue;
    }

    const { error } = await supabase.from("game_player_stats").insert(entry);

    if (error) {
      console.error("[game_player_stats] Falha ao criar estatística:", {
        gameId,
        participant: key,
        error,
      });

      return {
        success: false,
        error: "Não foi possível salvar todas as estatísticas.",
      };
    }
  }

  return { success: true };
}

export async function publishMatchStatistics(gameId, publishedBy) {
  if (!gameId || !publishedBy) {
    return {
      success: false,
      error: "Não foi possível identificar o jogo ou o administrador.",
    };
  }

  let statistics;

  try {
    statistics = await getMatchStatistics(gameId);
  } catch {
    return {
      success: false,
      error: "Não foi possível conferir as estatísticas antes da publicação.",
    };
  }

  if (!hasRecordedPerformance(statistics)) {
    return {
      success: false,
      error: "Registre ao menos uma estatística antes de publicar.",
    };
  }

  const { error } = await supabase
    .from("games")
    .update({
      statistics_published_at: new Date().toISOString(),
      statistics_published_by: publishedBy,
    })
    .eq("id", gameId);

  if (error) {
    console.error("[game_player_stats] Falha ao publicar resultado:", {
      gameId,
      publishedBy,
      error,
    });

    return {
      success: false,
      error: "Não foi possível publicar o resultado.",
    };
  }

  return { success: true };
}

export async function unpublishMatchStatistics(gameId) {
  if (!gameId) {
    return {
      success: false,
      error: "Jogo não informado.",
    };
  }

  const { error } = await supabase
    .from("games")
    .update({
      statistics_published_at: null,
      statistics_published_by: null,
    })
    .eq("id", gameId);

  if (error) {
    console.error("[game_player_stats] Falha ao retirar resultado:", {
      gameId,
      error,
    });

    return {
      success: false,
      error: "Não foi possível retirar o resultado da publicação.",
    };
  }

  return { success: true };
}

export async function getMatchStatisticsResults(gameId) {
  const [statistics, gameResult] = await Promise.all([
    getMatchStatistics(gameId),
    supabase
      .from("games")
      .select("id, statistics_published_at, statistics_published_by")
      .eq("id", gameId)
      .maybeSingle(),
  ]);

  if (gameResult.error) {
    console.error("[game_player_stats] Falha ao carregar publicação:", {
      gameId,
      error: gameResult.error,
    });

    throw gameResult.error;
  }

  return {
    hasStatistics: statistics.length > 0,
    hasRecordedPerformance: hasRecordedPerformance(statistics),
    published: Boolean(gameResult.data?.statistics_published_at),
    publishedAt: gameResult.data?.statistics_published_at || null,
    publishedBy: gameResult.data?.statistics_published_by || null,
    statistics,
    results: calculateMatchAwards(statistics),
  };
}
