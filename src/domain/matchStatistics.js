export const MATCH_STAT_FIELDS = [
  {
    key: "attack_points",
    label: "Ataques convertidos",
    shortLabel: "Ataques",
  },
  {
    key: "aces",
    label: "Aces",
    shortLabel: "Aces",
  },
  {
    key: "block_points",
    label: "Pontos de bloqueio",
    shortLabel: "Bloqueios",
  },
  {
    key: "defenses",
    label: "Defesas",
    shortLabel: "Defesas",
  },
  {
    key: "assists",
    label: "Assistências de levantamento",
    shortLabel: "Assistências",
  },
];

export const STAT_AWARD_CATEGORIES = [
  {
    key: "mvp_male",
    label: "MVP Masculino",
    icon: "🏆",
  },
  {
    key: "mvp_female",
    label: "MVP Feminina",
    icon: "🏆",
  },
  {
    key: "top_scorer",
    label: "Maior Pontuador",
    icon: "🔥",
  },
  {
    key: "best_attack",
    label: "Melhor Ataque",
    icon: "⚡",
  },
  {
    key: "best_serve",
    label: "Melhor Saque",
    icon: "🎯",
  },
  {
    key: "best_block",
    label: "Melhor Bloqueio",
    icon: "🛡️",
  },
  {
    key: "best_defense",
    label: "Melhor Defesa",
    icon: "🤿",
  },
  {
    key: "best_setting",
    label: "Melhor Levantador",
    icon: "🤝",
  },
];

const MVP_FIELD_WEIGHT = 20;

function safeNumber(value) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }

  return parsed;
}

function getParticipantId(row) {
  if (row.player_id) return row.player_id;
  if (row.guest_id) return `guest-${row.guest_id}`;
  return null;
}

function getParticipantName(row) {
  if (row.player) {
    const name = row.player.name || "Participante";
    const nickname = row.player.nickname;

    return nickname ? `${name} (${nickname})` : name;
  }

  return row.guest?.name || "Convidado";
}

function getParticipantGender(row) {
  return row.player?.gender ?? row.guest?.gender ?? null;
}

function normalizeRow(row) {
  const attackPoints = safeNumber(row.attack_points);
  const aces = safeNumber(row.aces);
  const blockPoints = safeNumber(row.block_points);
  const defenses = safeNumber(row.defenses);
  const assists = safeNumber(row.assists);

  return {
    id: getParticipantId(row),
    playerId: row.player_id || null,
    guestId: row.guest_id || null,
    name: getParticipantName(row),
    gender: getParticipantGender(row),
    attackPoints,
    aces,
    blockPoints,
    defenses,
    assists,
    totalPoints: attackPoints + aces + blockPoints,
  };
}

function sortParticipants(participants) {
  return [...participants].sort(
    (first, second) =>
      first.name.localeCompare(second.name, "pt-BR") ||
      String(first.id).localeCompare(String(second.id)),
  );
}

function buildLeaderResult(participants, getValue) {
  if (participants.length === 0) return null;

  const highestValue = Math.max(
    ...participants.map((participant) => getValue(participant)),
  );

  if (highestValue <= 0) return null;

  const winners = sortParticipants(
    participants.filter(
      (participant) => getValue(participant) === highestValue,
    ),
  ).map((participant) => ({
    ...participant,
    value: highestValue,
  }));

  return {
    value: highestValue,
    winners,
  };
}

function calculateMvp(participants, gender) {
  const eligibleParticipants = participants.filter(
    (participant) => participant.gender === gender,
  );

  if (eligibleParticipants.length === 0) return null;

  const maximums = {
    attackPoints: Math.max(
      ...eligibleParticipants.map((participant) => participant.attackPoints),
    ),
    aces: Math.max(
      ...eligibleParticipants.map((participant) => participant.aces),
    ),
    blockPoints: Math.max(
      ...eligibleParticipants.map((participant) => participant.blockPoints),
    ),
    defenses: Math.max(
      ...eligibleParticipants.map((participant) => participant.defenses),
    ),
    assists: Math.max(
      ...eligibleParticipants.map((participant) => participant.assists),
    ),
  };

  const scoredParticipants = eligibleParticipants.map((participant) => {
    const score = Object.entries(maximums).reduce(
      (total, [field, maximum]) => {
        if (maximum <= 0) return total;

        return total + (participant[field] / maximum) * MVP_FIELD_WEIGHT;
      },
      0,
    );

    return {
      ...participant,
      mvpScore: Number(score.toFixed(2)),
    };
  });

  const highestScore = Math.max(
    ...scoredParticipants.map((participant) => participant.mvpScore),
  );

  if (highestScore <= 0) return null;

  const winners = sortParticipants(
    scoredParticipants.filter(
      (participant) => participant.mvpScore === highestScore,
    ),
  );

  return {
    value: highestScore,
    winners,
  };
}

export function calculateMatchAwards(rows = []) {
  const participants = rows
    .map(normalizeRow)
    .filter((participant) => participant.id);

  return {
    mvp_male: calculateMvp(participants, "M"),
    mvp_female: calculateMvp(participants, "F"),

    top_scorer: buildLeaderResult(
      participants,
      (participant) => participant.totalPoints,
    ),

    best_attack: buildLeaderResult(
      participants,
      (participant) => participant.attackPoints,
    ),

    best_serve: buildLeaderResult(
      participants,
      (participant) => participant.aces,
    ),

    best_block: buildLeaderResult(
      participants,
      (participant) => participant.blockPoints,
    ),

    best_defense: buildLeaderResult(
      participants,
      (participant) => participant.defenses,
    ),

    best_setting: buildLeaderResult(
      participants,
      (participant) => participant.assists,
    ),
  };
}