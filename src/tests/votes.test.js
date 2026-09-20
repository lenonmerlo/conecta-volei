import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({
  votes: [],
  candidate: null,
  upserts: [],
}));

vi.mock("../lib/supabase", () => ({
  supabase: {
    from(table) {
      if (table === "votes") {
        return {
          select() {
            return {
              eq() {
                return Promise.resolve({
                  data: hoisted.votes,
                  error: null,
                });
              },
            };
          },
          upsert(payload) {
            hoisted.upserts.push(payload);
            return Promise.resolve({ error: null });
          },
        };
      }

      return {
        select() {
          return {
            eq() {
              return {
                maybeSingle() {
                  return Promise.resolve({
                    data: hoisted.candidate,
                    error: null,
                  });
                },
              };
            },
          };
        },
      };
    },
  },
}));

import {
  getVotingResults,
  submitVote,
} from "../services/supabase/votes.js";

describe("votação e premiações", () => {
  beforeEach(() => {
    hoisted.votes = [];
    hoisted.candidate = null;
    hoisted.upserts = [];
  });

  it("mostra todas as pessoas empatadas em primeiro lugar", async () => {
    hoisted.votes = [
      {
        category: "mvp",
        voted_player_id: "p1",
        voted_player: { name: "Ana", gender: "F" },
      },
      {
        category: "mvp",
        voted_player_id: "p2",
        voted_player: { name: "Bia", gender: "F" },
      },
      {
        category: "mvp",
        voted_player_id: "p1",
        voted_player: { name: "Ana", gender: "F" },
      },
      {
        category: "mvp",
        voted_player_id: "p2",
        voted_player: { name: "Bia", gender: "F" },
      },
    ];

    const results = await getVotingResults("game-1");

    expect(results.mvp.count).toBe(2);
    expect(results.mvp.winners.map((winner) => winner.name)).toEqual([
      "Ana",
      "Bia",
    ]);
  });

  it("considera apenas candidatas mulheres na MVP Feminina", async () => {
    hoisted.votes = [
      {
        category: "mvp_female",
        voted_player_id: "p1",
        voted_player: { name: "Ana", gender: "F" },
      },
      {
        category: "mvp_female",
        voted_player_id: "p2",
        voted_player: { name: "Bruno", gender: "M" },
      },
    ];

    const results = await getVotingResults("game-1");

    expect(results.mvp_female.winners.map((winner) => winner.name)).toEqual([
      "Ana",
    ]);
  });

  it("recusa voto em homem para MVP Feminina", async () => {
    hoisted.candidate = { gender: "M" };

    const result = await submitVote(
      "game-1",
      "voter-1",
      "player-1",
      "mvp_female",
    );

    expect(result.success).toBe(false);
    expect(hoisted.upserts).toHaveLength(0);
  });

  it("aceita voto em mulher para MVP Feminina", async () => {
    hoisted.candidate = { gender: "F" };

    const result = await submitVote(
      "game-1",
      "voter-1",
      "player-1",
      "mvp_female",
    );

    expect(result.success).toBe(true);
    expect(hoisted.upserts).toHaveLength(1);
    expect(hoisted.upserts[0].category).toBe("mvp_female");
  });
});