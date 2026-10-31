import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({
  rpc: vi.fn(),
  removeChannel: vi.fn(),
  subscribe: vi.fn(),
  on: vi.fn(),
  channel: vi.fn(),
}));

vi.mock("../lib/supabase", () => ({
  supabase: {
    rpc: hoisted.rpc,
    channel: hoisted.channel,
    removeChannel: hoisted.removeChannel,
  },
}));

import {
  configureMatchScoring,
  joinMatchScoring,
  recordMatchStat,
  subscribeToMatchStatistics,
  undoLastMatchStat,
} from "../services/supabase/liveScoring.js";

describe("live scoring service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.on.mockReturnValue({ subscribe: hoisted.subscribe });
    hoisted.channel.mockReturnValue({ on: hoisted.on });
  });

  it("configura o acesso publico da partida", async () => {
    hoisted.rpc.mockResolvedValue({ data: { game_id: "game-1" }, error: null });

    const result = await configureMatchScoring({
      gameId: "game-1",
      accessCode: "123456",
      expiresAt: "2026-11-02T02:59:59.000Z",
      createdBy: "admin-1",
    });

    expect(result.success).toBe(true);
    expect(hoisted.rpc).toHaveBeenCalledWith("configure_match_scoring", {
      p_game_id: "game-1",
      p_access_code: "123456",
      p_expires_at: "2026-11-02T02:59:59.000Z",
      p_created_by: "admin-1",
    });
  });

  it("entra em uma funcao de anotador", async () => {
    hoisted.rpc.mockResolvedValue({
      data: [{ access_token: "token-1", scorer_role: "attack_block" }],
      error: null,
    });

    const result = await joinMatchScoring({
      gameId: "game-1",
      accessCode: "123456",
      scorerName: "Ana",
      scorerRole: "attack_block",
    });

    expect(result.session.access_token).toBe("token-1");
    expect(hoisted.rpc).toHaveBeenCalledWith("join_match_scoring", {
      p_game_id: "game-1",
      p_access_code: "123456",
      p_scorer_name: "Ana",
      p_scorer_role: "attack_block",
    });
  });

  it("registra cada toque com id de idempotencia", async () => {
    hoisted.rpc.mockResolvedValue({ data: { event_id: "event-1" }, error: null });

    const result = await recordMatchStat({
      accessToken: "token-1",
      playerId: "player-1",
      statField: "attack_points",
      clientEventId: "client-event-1",
    });

    expect(result.success).toBe(true);
    expect(hoisted.rpc).toHaveBeenCalledWith("record_match_stat_event", {
      p_access_token: "token-1",
      p_player_id: "player-1",
      p_guest_id: null,
      p_stat_field: "attack_points",
      p_client_event_id: "client-event-1",
    });
  });

  it("desfaz somente a ultima marcacao da sessao", async () => {
    hoisted.rpc.mockResolvedValue({ data: { event_id: "event-1" }, error: null });

    const result = await undoLastMatchStat("token-1");

    expect(result.success).toBe(true);
    expect(hoisted.rpc).toHaveBeenCalledWith("undo_last_match_stat_event", {
      p_access_token: "token-1",
    });
  });

  it("assina e remove a sincronizacao em tempo real", () => {
    const stop = subscribeToMatchStatistics("game-1", vi.fn());

    expect(hoisted.channel).toHaveBeenCalled();
    expect(hoisted.on).toHaveBeenCalledWith(
      "postgres_changes",
      expect.objectContaining({
        table: "game_player_stats",
        filter: "game_id=eq.game-1",
      }),
      expect.any(Function),
    );

    stop();
    expect(hoisted.removeChannel).toHaveBeenCalled();
  });
});
