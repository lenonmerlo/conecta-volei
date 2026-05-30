import { describe, expect, it } from "vitest";
import { getEarnedBadges } from "../domain/badges";

function getBadgeIds(stats) {
  return getEarnedBadges(stats).map((badge) => badge.id);
}

describe("badges", () => {
  it("com 0 jogos nao ganha badge", () => {
    const ids = getBadgeIds({
      totalGames: 0,
      currentStreak: 0,
      totalGuests: 0,
      isCaptain: false,
      isSetter: false,
    });

    expect(ids).toEqual([]);
  });

  it("com 1 jogo ganha badge Estreante", () => {
    const ids = getBadgeIds({
      totalGames: 1,
      currentStreak: 0,
      totalGuests: 0,
      isCaptain: false,
      isSetter: false,
    });

    expect(ids).toContain("first_game");
  });

  it("com 10 jogos ganha Estreante e Frequentador", () => {
    const ids = getBadgeIds({
      totalGames: 10,
      currentStreak: 0,
      totalGuests: 0,
      isCaptain: false,
      isSetter: false,
    });

    expect(ids).toContain("first_game");
    expect(ids).toContain("ten_games");
  });

  it("com isCaptain true ganha badge Capitao", () => {
    const ids = getBadgeIds({
      totalGames: 0,
      currentStreak: 0,
      totalGuests: 0,
      isCaptain: true,
      isSetter: false,
    });

    expect(ids).toContain("captain");
  });

  it("com streak 5 ganha badge Em Chama", () => {
    const ids = getBadgeIds({
      totalGames: 0,
      currentStreak: 5,
      totalGuests: 0,
      isCaptain: false,
      isSetter: false,
    });

    expect(ids).toContain("five_streak");
  });
});
