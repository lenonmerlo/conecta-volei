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
  it("drawTeams com menos de 12 jogadores retorna erro", () => {
    const players = Array.from({ length: 11 }, (_, index) =>
      makePlayer(index + 1),
    );

    expect(() => drawTeams(players)).toThrow(
      "Minimo de 12 jogadores necessario",
    );
  });

  it("drawTeams com 21 jogadores gera 3 times de 7", () => {
    const players = Array.from({ length: 21 }, (_, index) =>
      makePlayer(index + 1),
    );

    const teams = drawTeams(players);

    expect(teams).toHaveLength(3);
    expect(teams.every((team) => team.players.length === 7)).toBe(true);
  });

  it("drawTeams com 14 jogadores gera 2 times de 7", () => {
    const players = Array.from({ length: 14 }, (_, index) =>
      makePlayer(index + 1),
    );

    const teams = drawTeams(players);

    expect(teams).toHaveLength(2);
    expect(teams.every((team) => team.players.length === 7)).toBe(true);
  });

  it("drawTeams com 15 jogadores gera 3 times com capacidade 6, 6 e 3", () => {
    const players = Array.from({ length: 15 }, (_, index) =>
      makePlayer(index + 1),
    );

    const teams = drawTeams(players);

    const sortedSizes = teams
      .map((team) => team.players.length)
      .sort((a, b) => b - a);
    expect(teams).toHaveLength(3);
    expect(sortedSizes).toEqual([6, 6, 3]);
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

  it("drawTeams distribui jogadores abaixo de 3 e acima de 4.5 de forma equilibrada", () => {
    const players = Array.from({ length: 18 }, (_, index) =>
      makePlayer(index + 1, {
        skillLevel: 3.5,
      }),
    );

    [0, 1, 2].forEach((index) => {
      players[index].skillLevel = 2.4;
    });

    [3, 4, 5].forEach((index) => {
      players[index].skillLevel = 4.8;
    });

    const teams = drawTeams(players);
    const lowCounts = teams.map(
      (team) =>
        team.players.filter((player) => Number(player.skillLevel) < 3).length,
    );
    const highCounts = teams.map(
      (team) =>
        team.players.filter((player) => Number(player.skillLevel) > 4.5).length,
    );

    expect(lowCounts).toEqual([1, 1, 1]);
    expect(highCounts).toEqual([1, 1, 1]);
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
