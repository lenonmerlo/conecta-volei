import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({
  responseQueues: new Map(),
  callLog: {
    insert: [],
    update: [],
    delete: [],
  },
  fromMock: vi.fn(),
}));

function enqueueResponse(key, response) {
  const queue = hoisted.responseQueues.get(key) || [];
  queue.push(response);
  hoisted.responseQueues.set(key, queue);
}

function dequeueResponse(key) {
  const queue = hoisted.responseQueues.get(key) || [];
  if (queue.length === 0) {
    return { data: null, error: null, count: null };
  }

  return queue.shift();
}

class QueryBuilder {
  constructor(table) {
    this.table = table;
    this.mode = "select";
    this.selectOptions = null;
    this.hasOrder = false;
    this.hasLimit = false;
    this.selectedColumns = null;
  }

  select(columns, options) {
    this.selectedColumns = columns;
    this.selectOptions = options || null;
    if (this.mode !== "insert" && this.mode !== "delete") {
      this.mode = "select";
    }
    return this;
  }

  eq() {
    return this;
  }

  is() {
    return this;
  }

  order() {
    this.hasOrder = true;
    return this;
  }

  limit() {
    this.hasLimit = true;
    return this;
  }

  maybeSingle() {
    return Promise.resolve(this.execute("maybeSingle"));
  }

  single() {
    return Promise.resolve(this.execute("single"));
  }

  insert(payload) {
    this.mode = "insert";
    hoisted.callLog.insert.push({ table: this.table, payload });
    return this;
  }

  update(payload) {
    this.mode = "update";
    hoisted.callLog.update.push({ table: this.table, payload });
    return this;
  }

  delete() {
    this.mode = "delete";
    hoisted.callLog.delete.push({ table: this.table });
    return this;
  }

  execute(terminal) {
    const key = this.getQueueKey(terminal);
    return dequeueResponse(key);
  }

  getQueueKey(terminal) {
    if (this.table === "players") {
      if (this.mode === "select" && terminal === "single") {
        return "players.select.single";
      }
      if (this.mode === "select" && terminal === "maybeSingle") {
        return "players.select.maybeSingle";
      }
      if (this.mode === "insert" && terminal === "single") {
        return "players.insert.single";
      }
      if (this.mode === "update") {
        return "players.update.eq";
      }
    }

    if (this.table === "game_registrations") {
      if (this.mode === "insert") {
        return "game_registrations.insert.await";
      }
      if (this.mode === "delete" && this.selectedColumns) {
        return "game_registrations.delete.select.await";
      }
      if (this.mode === "select" && terminal === "maybeSingle") {
        if (this.hasOrder || this.hasLimit) {
          return "game_registrations.waitlist.maybeSingle";
        }
        return "game_registrations.select.maybeSingle";
      }
      if (this.mode === "select" && this.selectOptions?.head) {
        return "game_registrations.count.await";
      }
      if (this.mode === "update") {
        return "game_registrations.update.eq";
      }
    }

    return `${this.table}.${this.mode}.${terminal}`;
  }

  then(resolve, reject) {
    return Promise.resolve(this.execute("await")).then(resolve, reject);
  }
}

vi.mock("../lib/supabase", () => ({
  supabase: {
    from: hoisted.fromMock,
  },
}));

import {
  autoMigrateGuests,
  getCurrentGameIdForDay,
  getPlayerByWhatsapp,
  isPlayerRegistered,
  joinGame,
  leaveGame,
  promoteFromWaitlist,
  registerPlayer,
  removeGuest,
  updatePlayerInjuryLeave,
  updatePlayerStatus,
} from "../data/supabaseService";

describe("supabaseService", () => {
  beforeEach(() => {
    hoisted.responseQueues.clear();
    hoisted.callLog.insert = [];
    hoisted.callLog.update = [];
    hoisted.callLog.delete = [];
    hoisted.fromMock.mockReset();
    hoisted.fromMock.mockImplementation((table) => new QueryBuilder(table));
  });

  describe("getPlayerByWhatsapp", () => {
    it("retorna o jogador quando WhatsApp existe no banco", async () => {
      enqueueResponse("players.select.single", {
        data: { id: "p1", name: "Lenon", whatsapp: "27999999999" },
        error: null,
      });

      const player = await getPlayerByWhatsapp("27999999999");

      expect(player).toEqual({
        id: "p1",
        name: "Lenon",
        whatsapp: "27999999999",
      });
    });

    it("retorna null quando WhatsApp nao existe", async () => {
      enqueueResponse("players.select.single", {
        data: null,
        error: { message: "not found" },
      });

      const player = await getPlayerByWhatsapp("27900000000");

      expect(player).toBeNull();
    });
  });

  describe("registerPlayer", () => {
    it("insere jogador e retorna success true", async () => {
      enqueueResponse("players.insert.single", {
        data: { id: "p2", name: "Joao" },
        error: null,
      });

      const result = await registerPlayer({
        name: "Joao",
        nickname: "J",
        whatsapp: "27998887777",
        gender: "M",
      });

      expect(result).toEqual({
        success: true,
        player: { id: "p2", name: "Joao" },
      });
      expect(hoisted.callLog.insert[0]).toEqual({
        table: "players",
        payload: {
          name: "Joao",
          nickname: "J",
          whatsapp: "27998887777",
          gender: "M",
          type: "member",
          status: "pending",
          accepted_rules: true,
        },
      });
    });

    it("retorna success false com error quando insert falha", async () => {
      enqueueResponse("players.insert.single", {
        data: null,
        error: { message: "insert failed" },
      });

      const result = await registerPlayer({
        name: "Erro",
        nickname: null,
        whatsapp: "27990000000",
        gender: "F",
      });

      expect(result).toEqual({
        success: false,
        error: "insert failed",
      });
    });
  });

  describe("getCurrentGameIdForDay", () => {
    it("prioriza id no formato novo quando ha jogos do mesmo dia e data", async () => {
      enqueueResponse("games.select.await", {
        data: [
          {
            id: "legacy-sun-1",
            day: "sunday",
            date: "2026-06-07",
            time: "09:00",
            status: "active",
          },
          {
            id: "sunday-2026-06-07",
            day: "sunday",
            date: "2026-06-07",
            time: "09:00",
            status: "active",
          },
        ],
        error: null,
      });

      const gameId = await getCurrentGameIdForDay(
        "sunday",
        new Date("2026-06-01T12:00:00"),
      );

      expect(gameId).toBe("sunday-2026-06-07");
    });

    it("ignora jogo cancelado ao resolver jogo atual", async () => {
      enqueueResponse("games.select.await", {
        data: [
          {
            id: "sunday-2026-06-14",
            day: "sunday",
            date: "2026-06-14",
            time: "09:00",
            status: "cancelled",
          },
          {
            id: "legacy-sun-active",
            day: "sunday",
            date: "2026-06-14",
            time: "09:30",
            status: "active",
          },
        ],
        error: null,
      });

      const gameId = await getCurrentGameIdForDay(
        "sunday",
        new Date("2026-06-10T12:00:00"),
      );

      expect(gameId).toBe("legacy-sun-active");
    });
  });

  describe("autoMigrateGuests", () => {
    function enqueueAutoMigrateSundayBase(
      registrations,
      gameId = "sunday-2026-06-14",
    ) {
      enqueueResponse("games.select.maybeSingle", {
        data: { id: gameId, day: "sunday", date: "2026-06-14" },
        error: null,
      });
      enqueueResponse("games.select.await", {
        data: [
          {
            id: gameId,
            day: "sunday",
            date: "2026-06-14",
            time: "09:00",
            status: "active",
          },
        ],
        error: null,
      });
      enqueueResponse("games.select.single", {
        data: { id: gameId, day: "sunday", date: "2026-06-14" },
        error: null,
      });

      enqueueResponse("games.select.maybeSingle", {
        data: { id: gameId, day: "sunday", date: "2026-06-14" },
        error: null,
      });
      enqueueResponse("games.select.await", {
        data: [
          {
            id: gameId,
            day: "sunday",
            date: "2026-06-14",
            time: "09:00",
            status: "active",
          },
        ],
        error: null,
      });
      enqueueResponse("games.select.maybeSingle", {
        data: null,
        error: null,
      });
      enqueueResponse("games.select.single", {
        data: { id: gameId, day: "sunday", date: "2026-06-14" },
        error: null,
      });

      enqueueResponse("game_registrations.select.await", {
        data: registrations,
        error: null,
      });
    }

    it("convidado em guests com vaga na main migra para main", async () => {
      enqueueAutoMigrateSundayBase([
        {
          id: "m1",
          game_id: "sunday-2026-06-14",
          slot: "main",
          registered_at: "2026-06-13T08:00:00.000Z",
        },
        {
          id: "g1",
          game_id: "sunday-2026-06-14",
          slot: "guests",
          registered_at: "2026-06-13T09:00:00.000Z",
        },
      ]);
      enqueueResponse("game_registrations.update.eq", { error: null });

      const migrated = await autoMigrateGuests("sunday-2026-06-14", {
        now: new Date("2026-06-14T10:00:00"),
      });

      expect(migrated).toBe(true);
      expect(hoisted.callLog.update[0]?.table).toBe("game_registrations");
      expect(hoisted.callLog.update[0]?.payload?.slot).toBe("main");
      expect(hoisted.callLog.update[0]?.payload?.registered_at).toMatch(
        /^\d{4}-\d{2}-\d{2}T/,
      );
    });

    it("convidado em guests sem vaga na main migra para waitlist", async () => {
      enqueueAutoMigrateSundayBase([
        ...new Array(21).fill(null).map((_, index) => ({
          id: `m${index + 1}`,
          game_id: "sunday-2026-06-14",
          slot: "main",
          registered_at: "2026-06-13T08:00:00.000Z",
        })),
        {
          id: "g1",
          game_id: "sunday-2026-06-14",
          slot: "guests",
          registered_at: "2026-06-13T09:00:00.000Z",
        },
      ]);
      enqueueResponse("game_registrations.update.eq", { error: null });

      const migrated = await autoMigrateGuests("sunday-2026-06-14", {
        now: new Date("2026-06-14T10:00:00"),
      });

      expect(migrated).toBe(true);
      expect(hoisted.callLog.update[0]?.table).toBe("game_registrations");
      expect(hoisted.callLog.update[0]?.payload?.slot).toBe("waitlist");
      expect(hoisted.callLog.update[0]?.payload?.registered_at).toMatch(
        /^\d{4}-\d{2}-\d{2}T/,
      );
    });

    it("nao migra convidados antes de sabado 00h", async () => {
      enqueueResponse("games.select.maybeSingle", {
        data: { id: "sunday-2026-06-14", day: "sunday", date: "2026-06-14" },
        error: null,
      });
      enqueueResponse("games.select.await", {
        data: [
          {
            id: "sunday-2026-06-14",
            day: "sunday",
            date: "2026-06-14",
            time: "09:00",
            status: "active",
          },
        ],
        error: null,
      });
      enqueueResponse("games.select.single", {
        data: { id: "sunday-2026-06-14", day: "sunday", date: "2026-06-14" },
        error: null,
      });

      const migrated = await autoMigrateGuests("sunday-2026-06-14", {
        now: new Date("2026-06-12T23:59:59"),
      });

      expect(migrated).toBe(false);
      expect(hoisted.callLog.update).toHaveLength(0);
    });
  });

  describe("joinGame", () => {
    function enqueueSundayJoinContext(gameId = "sunday-2026-06-14") {
      enqueueResponse("games.select.maybeSingle", {
        data: { id: gameId, day: "sunday", date: "2026-06-14" },
        error: null,
      });
      enqueueResponse("games.select.await", {
        data: [
          {
            id: gameId,
            day: "sunday",
            date: "2026-06-14",
            time: "09:00",
            status: "active",
          },
        ],
        error: null,
      });
      enqueueResponse("games.select.single", {
        data: { id: gameId, day: "sunday", date: "2026-06-14" },
        error: null,
      });
      enqueueResponse("games.select.await", {
        data: [
          {
            id: gameId,
            day: "sunday",
            date: "2026-06-14",
            time: "09:00",
            status: "active",
          },
        ],
        error: null,
      });
    }

    function enqueueWednesdayJoinContext(gameId = "wednesday-2026-06-10") {
      enqueueResponse("games.select.maybeSingle", {
        data: {
          id: gameId,
          day: "wednesday",
          date: "2026-06-10",
        },
        error: null,
      });
      enqueueResponse("games.select.await", {
        data: [
          {
            id: gameId,
            day: "wednesday",
            date: "2026-06-10",
            time: "19:30",
            status: "active",
          },
        ],
        error: null,
      });
      enqueueResponse("games.select.single", {
        data: {
          id: gameId,
          day: "wednesday",
          date: "2026-06-10",
        },
        error: null,
      });
      enqueueResponse("games.select.await", {
        data: [
          {
            id: gameId,
            day: "wednesday",
            date: "2026-06-10",
            time: "19:30",
            status: "active",
          },
        ],
        error: null,
      });
    }

    it("insere registro com slot correto e retorna true em sucesso", async () => {
      enqueueResponse("players.select.maybeSingle", {
        data: { id: "p1", status: "active" },
        error: null,
      });
      enqueueResponse("game_registrations.insert.await", {
        error: null,
      });

      const success = await joinGame("g1", "p1", "main", null, null);

      expect(success).toBe(true);
      expect(hoisted.callLog.insert[0]).toEqual({
        table: "game_registrations",
        payload: {
          game_id: "g1",
          player_id: "p1",
          guest_name: null,
          guest_id: null,
          invited_by: null,
          slot: "main",
        },
      });
    });

    it("retorna false em erro", async () => {
      enqueueResponse("game_registrations.insert.await", {
        error: { message: "fail" },
      });

      const success = await joinGame("g1", null, "guests", "Convidado", "p1");

      expect(success).toBe(false);
    });

    it("forca waitlist quando jogador esta penalizado", async () => {
      enqueueResponse("players.select.maybeSingle", {
        data: { id: "p1", status: "penalized" },
        error: null,
      });
      enqueueResponse("game_registrations.insert.await", {
        error: null,
      });

      const success = await joinGame("g1", "p1", "main", null, null);

      expect(success).toBe(true);
      expect(hoisted.callLog.insert[0]).toEqual({
        table: "game_registrations",
        payload: {
          game_id: "g1",
          player_id: "p1",
          guest_name: null,
          guest_id: null,
          invited_by: null,
          slot: "waitlist",
        },
      });
    });

    it("nao insere quando jogador esta bloqueado", async () => {
      enqueueResponse("players.select.maybeSingle", {
        data: { id: "p1", status: "blocked" },
        error: null,
      });

      const success = await joinGame("g1", "p1", "main", null, null);

      expect(success).toBe(false);
      expect(hoisted.callLog.insert).toHaveLength(0);
    });

    it("domingo na quinta/sexta coloca membro na main quando ha vaga", async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-06-04T12:00:00"));

      enqueueSundayJoinContext();
      enqueueResponse("players.select.maybeSingle", {
        data: { id: "p1", status: "active", type: "member" },
        error: null,
      });
      enqueueResponse("game_registrations.insert.await", { error: null });

      const success = await joinGame("sunday-2026-06-14", "p1", "guests");

      expect(success).toBe(true);
      expect(hoisted.callLog.insert[0]?.payload?.slot).toBe("main");
      vi.useRealTimers();
    });

    it("domingo na quinta/sexta coloca convidado em guests", async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-06-05T12:00:00"));

      enqueueSundayJoinContext();
      enqueueResponse("game_registrations.insert.await", { error: null });

      const success = await joinGame(
        "sunday-2026-06-14",
        null,
        "main",
        "Convidado",
        "p1",
        "g-1",
      );

      expect(success).toBe(true);
      expect(hoisted.callLog.insert[0]?.payload?.slot).toBe("guests");
      vi.useRealTimers();
    });

    it("domingo no sabado coloca convidado na main quando ha vaga", async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-06-06T12:00:00"));

      enqueueSundayJoinContext();
      enqueueResponse("game_registrations.insert.await", { error: null });

      const success = await joinGame(
        "sunday-2026-06-14",
        null,
        "guests",
        "Convidado",
        "p1",
        "g-1",
      );

      expect(success).toBe(true);
      expect(hoisted.callLog.insert[0]?.payload?.slot).toBe("main");
      vi.useRealTimers();
    });

    it("domingo no sabado coloca convidado em waitlist quando main esta cheia", async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-06-06T12:00:00"));

      enqueueSundayJoinContext();
      enqueueResponse("game_registrations.select.await", {
        data: new Array(21).fill(null).map((_, index) => ({
          id: `m${index + 1}`,
          game_id: "sunday-2026-06-14",
          slot: "main",
          registered_at: "2026-06-01T20:00:00.000Z",
        })),
        error: null,
      });
      enqueueResponse("game_registrations.insert.await", { error: null });

      const success = await joinGame(
        "sunday-2026-06-14",
        null,
        "guests",
        "Convidado",
        "p1",
        "g-1",
      );

      expect(success).toBe(true);
      expect(hoisted.callLog.insert[0]?.payload?.slot).toBe("waitlist");
      vi.useRealTimers();
    });

    it("quarta e extras nao usam slot guests", async () => {
      enqueueWednesdayJoinContext();
      enqueueResponse("game_registrations.insert.await", { error: null });

      const success = await joinGame(
        "wednesday-2026-06-10",
        null,
        "guests",
        "Convidado",
        "p1",
        "g-1",
      );

      expect(success).toBe(true);
      expect(hoisted.callLog.insert[0]?.payload?.slot).toBe("main");
    });

    it("quarta envia convidado para waitlist somente quando main esta cheia", async () => {
      enqueueWednesdayJoinContext();
      enqueueResponse("game_registrations.select.await", {
        data: new Array(21).fill(null).map((_, index) => ({
          id: `m${index + 1}`,
          game_id: "wednesday-2026-06-10",
          slot: "main",
          registered_at: "2026-06-08T20:00:00.000Z",
        })),
        error: null,
      });
      enqueueResponse("game_registrations.insert.await", { error: null });

      const success = await joinGame(
        "wednesday-2026-06-10",
        null,
        "guests",
        "Convidado",
        "p1",
        "g-1",
      );

      expect(success).toBe(true);
      expect(hoisted.callLog.insert[0]?.payload?.slot).toBe("waitlist");
    });

    it("quarta nao manda convidado para waitlist com vaga mesmo se status vier penalized", async () => {
      enqueueWednesdayJoinContext();
      enqueueResponse("players.select.maybeSingle", {
        data: { id: "g-player", status: "penalized", type: "guest" },
        error: null,
      });
      enqueueResponse("game_registrations.insert.await", { error: null });

      const success = await joinGame(
        "wednesday-2026-06-10",
        "g-player",
        "main",
        null,
        null,
      );

      expect(success).toBe(true);
      expect(hoisted.callLog.insert[0]?.payload?.slot).toBe("main");
    });
  });

  describe("leaveGame", () => {
    it("deleta o registro do jogador e retorna true", async () => {
      enqueueResponse("game_registrations.delete.select.await", {
        data: [{ id: "r1", slot: "main" }],
        error: null,
      });
      enqueueResponse("games.select.single", {
        data: { id: "g1", day: "friendly", date: "2026-06-10" },
        error: null,
      });
      enqueueResponse("game_registrations.select.await", {
        data: new Array(21).fill(null).map((_, index) => ({
          id: `m${index + 1}`,
          slot: "main",
          registered_at: "2026-06-01T20:00:00.000Z",
        })),
        error: null,
      });

      const success = await leaveGame("g1", "p1");

      expect(success).toBe(true);
      expect(hoisted.callLog.delete[0]).toEqual({
        table: "game_registrations",
      });
    });
  });

  describe("isPlayerRegistered", () => {
    it("retorna true quando jogador esta na lista", async () => {
      enqueueResponse("game_registrations.select.maybeSingle", {
        data: { id: "r1" },
        error: null,
      });

      const registered = await isPlayerRegistered("g1", "p1");

      expect(registered).toBe(true);
    });

    it("retorna false quando jogador nao esta na lista", async () => {
      enqueueResponse("game_registrations.select.maybeSingle", {
        data: null,
        error: null,
      });

      const registered = await isPlayerRegistered("g1", "p1");

      expect(registered).toBe(false);
    });
  });

  describe("promoteFromWaitlist", () => {
    it("retorna true quando promove alguem", async () => {
      enqueueResponse("games.select.single", {
        data: { id: "g1", day: "friendly", date: "2026-06-10" },
        error: null,
      });
      enqueueResponse("game_registrations.select.await", {
        data: [
          {
            id: "w1",
            slot: "waitlist",
            registered_at: "2026-06-01T20:00:00.000Z",
          },
        ],
        error: null,
      });
      enqueueResponse("game_registrations.update.eq", {
        error: null,
      });

      const promoted = await promoteFromWaitlist("g1");

      expect(promoted).toBe(true);
      expect(hoisted.callLog.update[0]).toEqual({
        table: "game_registrations",
        payload: { slot: "main" },
      });
    });

    it("promove o primeiro nao penalizado da waitlist, pulando penalizados na frente", async () => {
      enqueueResponse("games.select.single", {
        data: { id: "g1", day: "friendly", date: "2026-06-10" },
        error: null,
      });
      enqueueResponse("game_registrations.select.await", {
        data: [
          {
            id: "w1",
            slot: "waitlist",
            player_id: "p-pen",
            player: { id: "p-pen", status: "penalized" },
            registered_at: "2026-06-01T20:00:00.000Z",
          },
          {
            id: "w2",
            slot: "waitlist",
            player_id: "p-ok",
            player: { id: "p-ok", status: "active" },
            registered_at: "2026-06-01T20:01:00.000Z",
          },
        ],
        error: null,
      });
      enqueueResponse("game_registrations.update.eq", {
        error: null,
      });

      const promoted = await promoteFromWaitlist("g1");

      expect(promoted).toBe(true);
      expect(hoisted.callLog.update[0]).toEqual({
        table: "game_registrations",
        payload: { slot: "main" },
      });
    });

    it("retorna false quando waitlist esta vazia", async () => {
      enqueueResponse("games.select.single", {
        data: { id: "g1", day: "friendly", date: "2026-06-10" },
        error: null,
      });
      enqueueResponse("game_registrations.select.await", {
        data: [],
        error: null,
      });

      const promoted = await promoteFromWaitlist("g1");

      expect(promoted).toBe(false);
    });
  });

  describe("removeGuest", () => {
    it("promove da waitlist quando remove convidado da lista principal", async () => {
      enqueueResponse("game_registrations.delete.select.await", {
        data: [{ id: "r1", game_id: "g1", slot: "main" }],
        error: null,
      });
      enqueueResponse("games.select.single", {
        data: { id: "g1", day: "friendly", date: "2026-06-10" },
        error: null,
      });
      enqueueResponse("game_registrations.select.await", {
        data: [
          ...new Array(20).fill(null).map((_, index) => ({
            id: `m${index + 1}`,
            slot: "main",
            registered_at: "2026-06-01T20:00:00.000Z",
          })),
          {
            id: "w1",
            slot: "waitlist",
            registered_at: "2026-06-01T20:10:00.000Z",
          },
        ],
        error: null,
      });
      enqueueResponse("games.select.single", {
        data: { id: "g1", day: "friendly", date: "2026-06-10" },
        error: null,
      });
      enqueueResponse("game_registrations.select.await", {
        data: [
          {
            id: "w1",
            slot: "waitlist",
            registered_at: "2026-06-01T20:10:00.000Z",
          },
        ],
        error: null,
      });
      enqueueResponse("game_registrations.update.eq", {
        error: null,
      });

      const success = await removeGuest("r1");

      expect(success).toBe(true);
      expect(hoisted.callLog.update[0]).toEqual({
        table: "game_registrations",
        payload: { slot: "main" },
      });
    });
  });

  describe("updatePlayerStatus", () => {
    it("atualiza status do jogador e retorna success true", async () => {
      enqueueResponse("players.update.eq", {
        error: null,
      });

      const success = await updatePlayerStatus("p1", "inactive");

      expect(success).toEqual({ success: true });
      expect(hoisted.callLog.update[0]).toEqual({
        table: "players",
        payload: { status: "inactive" },
      });
    });

    it("retorna erro quando tenta desbloquear sem ser super admin", async () => {
      enqueueResponse("players.select.maybeSingle", {
        data: { id: "p1", status: "blocked" },
        error: null,
      });

      const result = await updatePlayerStatus("p1", "active", {
        whatsapp: "27999519575",
      });

      expect(result).toEqual({
        success: false,
        error: "Apenas super admins podem desbloquear jogadores.",
      });
      expect(hoisted.callLog.update).toHaveLength(0);
    });

    it("permite desbloquear quando for super admin", async () => {
      enqueueResponse("players.select.maybeSingle", {
        data: { id: "p1", status: "blocked" },
        error: null,
      });
      enqueueResponse("players.update.eq", {
        error: null,
      });

      const result = await updatePlayerStatus("p1", "active", {
        whatsapp: "27997343401",
      });

      expect(result).toEqual({ success: true });
      expect(hoisted.callLog.update[0]).toEqual({
        table: "players",
        payload: { status: "active" },
      });
    });
  });

  describe("updatePlayerInjuryLeave", () => {
    it("atualiza on_injury_leave com sucesso", async () => {
      enqueueResponse("players.update.eq", {
        error: null,
      });

      const result = await updatePlayerInjuryLeave("p1", true);

      expect(result).toEqual({ success: true });
      expect(hoisted.callLog.update[0]).toEqual({
        table: "players",
        payload: { on_injury_leave: true },
      });
    });
  });
});
