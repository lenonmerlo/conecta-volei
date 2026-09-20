import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  player: null,
  updates: [],
  rpc: vi.fn(),
  logAction: vi.fn(),
}));

vi.mock("../lib/supabase", () => ({
  supabase: {
    from: vi.fn((table) => {
      if (table !== "players") {
        throw new Error(`Tabela inesperada no teste: ${table}`);
      }

      const query = {
        select: () => query,
        eq: () => query,
        update: (payload) => {
          state.updates.push(payload);
          state.player = { ...state.player, ...payload };
          return query;
        },
        maybeSingle: async () => ({
          data: state.player,
          error: null,
        }),
      };

      return query;
    }),
    rpc: (...args) => state.rpc(...args),
  },
}));

vi.mock("../services/supabase/games.js", () => ({
  resolveGameId: async (gameId) => gameId,
  resolveEquivalentGameIds: async (gameId) => [gameId],
}));

vi.mock("../services/supabase/audit.js", () => ({
  logAction: (...args) => state.logAction(...args),
}));

import {
  addWarning,
  removeWarning,
  resetWarnings,
} from "../services/supabase/players.js";
import { markAbsenceAndWarn } from "../services/supabase/presences.js";

describe("ciclo de advertências", () => {
  beforeEach(() => {
    state.player = null;
    state.updates = [];
    state.rpc.mockReset();
    state.logAction.mockReset();

    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-19T15:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("agenda a perda de prioridade na segunda advertência sem penalizar imediatamente", async () => {
    state.player = {
      id: "p1",
      warnings: 1,
      status: "active",
      priority_penalty_week: null,
      suspension_week: null,
    };

    const player = await addWarning("p1");

    expect(player.warnings).toBe(2);
    expect(player.status).toBe("active");
    expect(state.updates[0]).toEqual({
      warnings: 2,
      priority_penalty_week: "2026-09-21",
    });
  });

  it("agenda a suspensão na terceira advertência", async () => {
    state.player = {
      id: "p1",
      warnings: 2,
      status: "penalized",
      priority_penalty_week: "2026-09-14",
      suspension_week: null,
    };

    const player = await addWarning("p1");

    expect(player.warnings).toBe(3);
    expect(state.updates[0]).toEqual({
      warnings: 3,
      suspension_week: "2026-09-21",
    });
  });

  it("remover uma advertência cancela a penalização agendada", async () => {
    state.player = {
      id: "p1",
      warnings: 2,
      status: "penalized",
      priority_penalty_week: "2026-09-14",
      suspension_week: null,
    };

    const player = await removeWarning("p1");

    expect(player).toMatchObject({
      warnings: 1,
      status: "active",
      priority_penalty_week: null,
      suspension_week: null,
    });
  });

  it("zerar advertências também cancela as datas de penalização", async () => {
    state.player = {
      id: "p1",
      warnings: 3,
      status: "blocked",
      priority_penalty_week: "2026-09-14",
      suspension_week: "2026-09-21",
    };

    const player = await resetWarnings("p1");

    expect(player).toMatchObject({
      warnings: 0,
      status: "active",
      priority_penalty_week: null,
      suspension_week: null,
    });
  });
});

describe("registro de falta", () => {
  beforeEach(() => {
    state.rpc.mockReset();
    state.logAction.mockReset();
    state.logAction.mockResolvedValue(true);
  });

  it("registra auditoria somente quando o banco acrescenta uma advertência", async () => {
    state.rpc
      .mockResolvedValueOnce({ data: true, error: null })
      .mockResolvedValueOnce({ data: false, error: null });

    const first = await markAbsenceAndWarn("g1", "p1");
    const repeated = await markAbsenceAndWarn("g1", "p1");

    expect(first).toEqual({ success: true, warningAdded: true });
    expect(repeated).toEqual({ success: true, warningAdded: false });
    expect(state.rpc).toHaveBeenCalledWith("mark_absence_and_warn", {
      p_game_id: "g1",
      p_player_id: "p1",
    });
    expect(state.logAction).toHaveBeenCalledTimes(1);
  });
});