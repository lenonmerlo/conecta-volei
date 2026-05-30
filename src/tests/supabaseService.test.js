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
  getPlayerByWhatsapp,
  isPlayerRegistered,
  joinGame,
  leaveGame,
  promoteFromWaitlist,
  registerPlayer,
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

  describe("joinGame", () => {
    it("insere registro com slot correto e retorna true em sucesso", async () => {
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
  });

  describe("leaveGame", () => {
    it("deleta o registro do jogador e retorna true", async () => {
      enqueueResponse("game_registrations.delete.select.await", {
        data: [{ id: "r1", slot: "main" }],
        error: null,
      });
      enqueueResponse("game_registrations.count.await", {
        count: 21,
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
      enqueueResponse("game_registrations.waitlist.maybeSingle", {
        data: { id: "w1" },
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
      enqueueResponse("game_registrations.waitlist.maybeSingle", {
        data: null,
        error: null,
      });

      const promoted = await promoteFromWaitlist("g1");

      expect(promoted).toBe(false);
    });
  });

  describe("updatePlayerStatus", () => {
    it("atualiza status do jogador e retorna true", async () => {
      enqueueResponse("players.update.eq", {
        error: null,
      });

      const success = await updatePlayerStatus("p1", "inactive");

      expect(success).toBe(true);
      expect(hoisted.callLog.update[0]).toEqual({
        table: "players",
        payload: { status: "inactive" },
      });
    });
  });
});
