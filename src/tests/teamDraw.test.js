import { describe, expect, it } from "vitest";
import { drawTeams, swapPlayers } from "../domain/teamDraw";

function makePlayer(index, overrides = {}) {
  return {
    id: `p-${index}`,
    name: `Player ${index}`,
    skillLevel: 3,
    gender: "M",
    is_captain: false,
    is_setter: false,
    position: "middle",
    ...overrides,
  };
}

describe("teamDraw", () => {
  it("drawTeams com 21 jogadores gera 3 times de 7", () => {
    const players = Array.from({ length: 21 }, (_, index) =>
      makePlayer(index + 1),
    );

    const teams = drawTeams(players);

    expect(teams).toHaveLength(3);
    expect(teams.every((team) => team.players.length === 7)).toBe(true);
  });

  it("drawTeams com 10 jogadores gera 2 times de 5", () => {
    const players = Array.from({ length: 10 }, (_, index) =>
      makePlayer(index + 1),
    );

    const teams = drawTeams(players);

    expect(teams).toHaveLength(2);
    expect(teams.every((team) => team.players.length === 5)).toBe(true);
  });

  it("drawTeams com 7 jogadores retorna vazio (insuficiente)", () => {
    const players = Array.from({ length: 7 }, (_, index) =>
      makePlayer(index + 1),
    );

    const teams = drawTeams(players);

    expect(teams).toEqual([]);
  });

  it("drawTeams distribui capitaes em times diferentes", () => {
    const players = Array.from({ length: 21 }, (_, index) =>
      makePlayer(index + 1),
    );

    players[0].is_captain = true;
    players[1].is_captain = true;
    players[2].is_captain = true;

    const teams = drawTeams(players);

    const captainCounts = teams.map(
      (team) => team.players.filter((player) => player.is_captain).length,
    );

    expect(captainCounts).toEqual([1, 1, 1]);
  });

  it("drawTeams distribui meninas de forma equilibrada", () => {
    const femaleCaptainIndexes = new Set([1, 2, 3]);
    const players = Array.from({ length: 21 }, (_, index) =>
      makePlayer(index + 1, {
        gender: femaleCaptainIndexes.has(index + 1) ? "F" : "M",
        is_captain: femaleCaptainIndexes.has(index + 1),
      }),
    );

    const teams = drawTeams(players);
    const femaleCounts = teams.map(
      (team) => team.players.filter((player) => player.gender === "F").length,
    );

    expect(femaleCounts).toEqual([1, 1, 1]);
  });

  it("swapPlayers troca jogadores entre times corretamente", () => {
    const teams = [
      {
        name: "Time A",
        players: [
          makePlayer(1, { skillLevel: 1 }),
          makePlayer(2, { skillLevel: 2 }),
        ],
        totalLevel: 3,
      },
      {
        name: "Time B",
        players: [
          makePlayer(3, { skillLevel: 3 }),
          makePlayer(4, { skillLevel: 4 }),
        ],
        totalLevel: 7,
      },
    ];

    const swapped = swapPlayers(teams, 0, "p-1", 1, "p-3");

    expect(swapped[0].players.map((player) => player.id)).toEqual([
      "p-3",
      "p-2",
    ]);
    expect(swapped[1].players.map((player) => player.id)).toEqual([
      "p-1",
      "p-4",
    ]);
    expect(swapped[0].totalLevel).toBe(5);
    expect(swapped[1].totalLevel).toBe(5);
  });
});
