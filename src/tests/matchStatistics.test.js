import { describe, expect, it } from "vitest";
import {
  buildPermanentBadgeAwards,
  calculateMatchAwards,
} from "../domain/matchStatistics.js";

function createPlayer(
  id,
  name,
  gender,
  statistics = {},
) {
  return {
    player_id: id,
    guest_id: null,
    player: {
      id,
      name,
      nickname: null,
      gender,
    },
    guest: null,
    attack_points:
      statistics.attack_points || 0,
    aces: statistics.aces || 0,
    block_points:
      statistics.block_points || 0,
    defenses: statistics.defenses || 0,
    assists: statistics.assists || 0,
  };
}

function createGuest(
  id,
  name,
  gender,
  statistics = {},
) {
  return {
    player_id: null,
    guest_id: id,
    player: null,
    guest: {
      id,
      name,
      gender,
    },
    attack_points:
      statistics.attack_points || 0,
    aces: statistics.aces || 0,
    block_points:
      statistics.block_points || 0,
    defenses: statistics.defenses || 0,
    assists: statistics.assists || 0,
  };
}

describe("estatísticas e premiações", () => {
  it("calcula o maior pontuador somando ataque, ace e bloqueio", () => {
    const results = calculateMatchAwards([
      createPlayer("p1", "Ana", "F", {
        attack_points: 5,
        aces: 2,
        block_points: 1,
        defenses: 3,
        assists: 0,
      }),
      createPlayer("p2", "Bia", "F", {
        attack_points: 3,
        aces: 1,
        block_points: 2,
        defenses: 8,
        assists: 4,
      }),
    ]);

    expect(results.top_scorer.value).toBe(8);
    expect(
      results.top_scorer.winners.map(
        (winner) => winner.name,
      ),
    ).toEqual(["Ana"]);
  });

  it("não soma defesas e assistências na pontuação total", () => {
    const results = calculateMatchAwards([
      createPlayer("p1", "Carlos", "M", {
        attack_points: 1,
        aces: 0,
        block_points: 0,
        defenses: 20,
        assists: 20,
      }),
      createPlayer("p2", "Daniel", "M", {
        attack_points: 3,
        aces: 2,
        block_points: 1,
        defenses: 0,
        assists: 0,
      }),
    ]);

    expect(results.top_scorer.value).toBe(6);
    expect(
      results.top_scorer.winners[0].name,
    ).toBe("Daniel");
  });

  it("usa os cinco fundamentos com o mesmo peso no MVP", () => {
    const results = calculateMatchAwards([
      createPlayer("p1", "Atacante", "M", {
        attack_points: 10,
      }),
      createPlayer("p2", "Completo", "M", {
        attack_points: 5,
        aces: 5,
        block_points: 5,
        defenses: 5,
        assists: 5,
      }),
    ]);

    expect(
      results.mvp_male.winners[0].name,
    ).toBe("Completo");

    expect(
      results.mvp_male.winners[0].mvpScore,
    ).toBe(90);
  });

  it("calcula MVP masculino e feminino separadamente", () => {
    const results = calculateMatchAwards([
      createPlayer("m1", "Marcos", "M", {
        attack_points: 6,
        aces: 2,
        block_points: 1,
        defenses: 3,
        assists: 1,
      }),
      createPlayer("m2", "Pedro", "M", {
        attack_points: 2,
        aces: 1,
        block_points: 1,
        defenses: 1,
        assists: 0,
      }),
      createPlayer("f1", "Ana", "F", {
        attack_points: 2,
        aces: 1,
        block_points: 1,
        defenses: 8,
        assists: 6,
      }),
      createPlayer("f2", "Bia", "F", {
        attack_points: 5,
        aces: 0,
        block_points: 0,
        defenses: 1,
        assists: 0,
      }),
    ]);

    expect(
      results.mvp_male.winners[0].name,
    ).toBe("Marcos");

    expect(
      results.mvp_female.winners[0].name,
    ).toBe("Ana");
  });

  it("preserva todos os vencedores em caso de empate", () => {
    const results = calculateMatchAwards([
      createPlayer("p1", "Ana", "F", {
        attack_points: 4,
        aces: 2,
        block_points: 1,
        defenses: 5,
        assists: 3,
      }),
      createPlayer("p2", "Bia", "F", {
        attack_points: 4,
        aces: 2,
        block_points: 1,
        defenses: 5,
        assists: 3,
      }),
    ]);

    expect(
      results.mvp_female.winners.map(
        (winner) => winner.name,
      ),
    ).toEqual(["Ana", "Bia"]);

    expect(
      results.top_scorer.winners.map(
        (winner) => winner.name,
      ),
    ).toEqual(["Ana", "Bia"]);
  });

  it("inclui convidados nos resultados", () => {
    const results = calculateMatchAwards([
      createPlayer("p1", "Membro", "M", {
        block_points: 2,
      }),
      createGuest("g1", "Convidado", "M", {
        block_points: 4,
      }),
    ]);

    expect(
      results.best_block.winners[0].name,
    ).toBe("Convidado");

    expect(
      results.best_block.winners[0].id,
    ).toBe("guest-g1");
  });

  it("não cria vencedores quando todas as estatísticas são zero", () => {
    const results = calculateMatchAwards([
      createPlayer("p1", "Ana", "F"),
      createPlayer("p2", "Bruno", "M"),
    ]);

    expect(results.mvp_male).toBeNull();
    expect(results.mvp_female).toBeNull();
    expect(results.top_scorer).toBeNull();
    expect(results.best_attack).toBeNull();
    expect(results.best_serve).toBeNull();
    expect(results.best_block).toBeNull();
    expect(results.best_defense).toBeNull();
    expect(results.best_setting).toBeNull();
  });

  it("transforma vencedores membros em badges permanentes", () => {
    const results = calculateMatchAwards([
      createPlayer("p1", "Completo", "M", {
        attack_points: 5,
        aces: 4,
        block_points: 3,
        defenses: 2,
        assists: 1,
      }),
      createPlayer("p2", "Levantador", "M", {
        assists: 8,
      }),
      createGuest("g1", "Convidado", "M", {
        defenses: 10,
      }),
    ]);

    const awards = buildPermanentBadgeAwards(results);

    const byPlayer = Object.fromEntries(
      awards.map(({ playerId, badges }) => [playerId, badges]),
    );

    expect(byPlayer.p1).toMatchObject({
      badge_mvp: true,
      badge_super_spike: true,
      badge_super_ace: true,
      badge_monster_block: true,
    });

    expect(byPlayer.p2).toMatchObject({
      badge_maestro: true,
    });

    expect(Object.keys(byPlayer)).not.toContain("g1");
  });

});