const MATCH_STATISTICS_MOCK_PARTICIPANTS = [
  {
    key: "mock-joao",
    name: "João",
    gender: "M",
    genderLabel: "Masculino",
    values: {
      player_id: "mock-joao",
      guest_id: null,
      attack_points: 8,
      aces: 2,
      block_points: 1,
      defenses: 4,
      assists: 0,
    },
  },
  {
    key: "mock-bruno",
    name: "Bruno",
    gender: "M",
    genderLabel: "Masculino",
    values: {
      player_id: "mock-bruno",
      guest_id: null,
      attack_points: 5,
      aces: 4,
      block_points: 2,
      defenses: 6,
      assists: 1,
    },
  },
  {
    key: "mock-carlos",
    name: "Carlos",
    gender: "M",
    genderLabel: "Masculino",
    values: {
      player_id: "mock-carlos",
      guest_id: null,
      attack_points: 2,
      aces: 1,
      block_points: 5,
      defenses: 3,
      assists: 8,
    },
  },
  {
    key: "mock-ana",
    name: "Ana",
    gender: "F",
    genderLabel: "Feminino",
    values: {
      player_id: "mock-ana",
      guest_id: null,
      attack_points: 7,
      aces: 3,
      block_points: 1,
      defenses: 5,
      assists: 2,
    },
  },
  {
    key: "mock-bia",
    name: "Bia",
    gender: "F",
    genderLabel: "Feminino",
    values: {
      player_id: "mock-bia",
      guest_id: null,
      attack_points: 4,
      aces: 2,
      block_points: 3,
      defenses: 8,
      assists: 4,
    },
  },
  {
    key: "mock-carla",
    name: "Carla",
    gender: "F",
    genderLabel: "Feminino",
    values: {
      player_id: "mock-carla",
      guest_id: null,
      attack_points: 2,
      aces: 1,
      block_points: 2,
      defenses: 6,
      assists: 9,
    },
  },
];

export function createMatchStatisticsMockParticipants() {
  return MATCH_STATISTICS_MOCK_PARTICIPANTS.map(
    (participant) => ({
      ...participant,
      values: {
        ...participant.values,
      },
    }),
  );
}