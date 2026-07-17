import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({
  db: {
    games: [],
    players: [],
    guests: [],
    game_registrations: [],
    audit_log: [],
  },
  idCounter: 1,
}));

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function resetDb() {
  hoisted.db = {
    games: [],
    players: [],
    guests: [],
    game_registrations: [],
    audit_log: [],
  };
  hoisted.idCounter = 1;
}

function getNested(row, path) {
  return path.split(".").reduce((acc, key) => (acc ? acc[key] : undefined), row);
}

function toIsoNow() {
  return new Date().toISOString();
}

class QueryBuilder {
  constructor(table) {
    this.table = table;
    this.mode = "select";
    this.filters = [];
    this.orders = [];
    this.selectedColumns = null;
    this.selectOptions = null;
    this.payload = null;
    this.limitValue = null;
  }

  select(columns, options) {
    this.selectedColumns = columns;
    this.selectOptions = options || null;
    if (this.mode !== "insert" && this.mode !== "delete") {
      this.mode = "select";
    }
    return this;
  }

  eq(column, value) {
    this.filters.push({ type: "eq", column, value });
    return this;
  }

  is(column, value) {
    this.filters.push({ type: "is", column, value });
    return this;
  }

  not(column, operator, value) {
    this.filters.push({ type: "not", column, operator, value });
    return this;
  }

  order(column, options) {
    this.orders.push({ column, ascending: options?.ascending !== false });
    return this;
  }

  limit(value) {
    this.limitValue = value;
    return this;
  }

  insert(payload) {
    this.mode = "insert";
    this.payload = payload;
    return this;
  }

  update(payload) {
    this.mode = "update";
    this.payload = payload;
    return this;
  }

  delete() {
    this.mode = "delete";
    return this;
  }

  maybeSingle() {
    return Promise.resolve(this.execute("maybeSingle"));
  }

  single() {
    return Promise.resolve(this.execute("single"));
  }

  then(resolve, reject) {
    return Promise.resolve(this.execute("await")).then(resolve, reject);
  }

  execute(terminal) {
    if (this.mode === "insert") return this.executeInsert(terminal);
    if (this.mode === "update") return this.executeUpdate(terminal);
    if (this.mode === "delete") return this.executeDelete(terminal);
    return this.executeSelect(terminal);
  }

  matchesFilters(row) {
    return this.filters.every((filter) => {
      const value = getNested(row, filter.column);

      if (filter.type === "eq") {
        return value === filter.value;
      }

      if (filter.type === "is") {
        return filter.value === null ? value === null || value === undefined : value === filter.value;
      }

      if (filter.type === "not") {
        if (filter.operator === "is" && filter.value === null) {
          return value !== null && value !== undefined;
        }
        return value !== filter.value;
      }

      return true;
    });
  }

  applyOrders(rows) {
    let sorted = [...rows];

    this.orders.forEach((order) => {
      sorted = sorted.sort((a, b) => {
        const aValue = getNested(a, order.column);
        const bValue = getNested(b, order.column);
        const result = String(aValue || "").localeCompare(String(bValue || ""));
        return order.ascending ? result : -result;
      });
    });

    if (typeof this.limitValue === "number") {
      return sorted.slice(0, this.limitValue);
    }

    return sorted;
  }

  decorateRegistration(row) {
    const registration = clone(row);
    const player = hoisted.db.players.find((item) => item.id === registration.player_id) || null;
    const inviter = hoisted.db.players.find((item) => item.id === registration.invited_by) || null;
    const guest = hoisted.db.guests.find((item) => item.id === registration.guest_id) || null;

    if (this.selectedColumns && String(this.selectedColumns).includes("player:")) {
      registration.player = player ? clone(player) : null;
    }
    if (this.selectedColumns && String(this.selectedColumns).includes("inviter:")) {
      registration.inviter = inviter ? clone(inviter) : null;
    }
    if (this.selectedColumns && String(this.selectedColumns).includes("guest:")) {
      registration.guest = guest ? clone(guest) : null;
    }

    return registration;
  }

  executeSelect(terminal) {
    const tableRows = hoisted.db[this.table] || [];
    const filtered = tableRows.filter((row) => this.matchesFilters(row));
    const ordered = this.applyOrders(filtered);

    let rows = clone(ordered);

    if (this.table === "game_registrations") {
      rows = rows.map((row) => this.decorateRegistration(row));
    }

    if (this.selectOptions?.head) {
      return { data: null, error: null, count: rows.length };
    }

    if (terminal === "maybeSingle") {
      return { data: rows[0] || null, error: null };
    }

    if (terminal === "single") {
      if (!rows.length) {
        return { data: null, error: { message: "not found" } };
      }
      return { data: rows[0], error: null };
    }

    return { data: rows, error: null };
  }

  executeInsert(terminal) {
    const rows = Array.isArray(this.payload) ? this.payload : [this.payload];
    const inserted = rows.map((row) => {
      const item = {
        ...clone(row),
      };

      if (!item.id) {
        item.id = `${this.table}-${hoisted.idCounter++}`;
      }

      if (this.table === "game_registrations" && !item.registered_at) {
        item.registered_at = toIsoNow();
      }

      hoisted.db[this.table].push(item);
      return clone(item);
    });

    if (terminal === "single") {
      return { data: inserted[0] || null, error: null };
    }

    return { data: inserted, error: null };
  }

  executeUpdate() {
    const tableRows = hoisted.db[this.table] || [];
    const updated = [];

    tableRows.forEach((row, index) => {
      if (!this.matchesFilters(row)) return;
      const next = { ...row, ...clone(this.payload) };
      hoisted.db[this.table][index] = next;
      updated.push(clone(next));
    });

    return { data: updated, error: null };
  }

  executeDelete() {
    const tableRows = hoisted.db[this.table] || [];
    const kept = [];
    const removed = [];

    tableRows.forEach((row) => {
      if (this.matchesFilters(row)) {
        removed.push(clone(row));
      } else {
        kept.push(row);
      }
    });

    hoisted.db[this.table] = kept;

    return { data: removed, error: null };
  }
}

vi.mock("../lib/supabase", () => ({
  supabase: {
    from: (table) => new QueryBuilder(table),
  },
}));

import {
  getGames,
  getRegistrationCountsByGame,
  joinGame,
  leaveGame,
} from "../data/supabaseService";

describe("integration flows", () => {
  beforeEach(() => {
    resetDb();
    vi.useRealTimers();
  });

  it("cenario 1: Home com 2 domingos mesma data usa contagem do ID novo", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-15T10:00:00"));

    hoisted.db.games.push(
      {
        id: "legacy-sunday",
        day: "sunday",
        date: "2026-06-21",
        time: "09:00",
        status: "active",
      },
      {
        id: "sunday-2026-06-21",
        day: "sunday",
        date: "2026-06-21",
        time: "09:00",
        status: "active",
      },
      {
        id: "wednesday-2026-06-17",
        day: "wednesday",
        date: "2026-06-17",
        time: "19:30",
        status: "active",
      },
    );

    hoisted.db.game_registrations.push(
      {
        id: "r1",
        game_id: "legacy-sunday",
        slot: "main",
        registered_at: "2026-06-19T20:00:00.000Z",
      },
      {
        id: "r2",
        game_id: "sunday-2026-06-21",
        slot: "main",
        registered_at: "2026-06-19T20:05:00.000Z",
      },
    );

    const games = await getGames();
    const counts = await getRegistrationCountsByGame();

    const selectedSunday = games.find((game) => game.day === "sunday");

    expect(selectedSunday?.id).toBe("sunday-2026-06-21");
    expect(counts["sunday-2026-06-21"]).toBe(2);
    expect(counts["legacy-sunday"]).toBeUndefined();

    vi.useRealTimers();
  });

  it("cenario 2: convidado no sabado com vaga entra direto na main", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-20T10:00:00"));

    hoisted.db.games.push({
      id: "sunday-2026-06-21",
      day: "sunday",
      date: "2026-06-21",
      time: "09:00",
      status: "active",
    });

    hoisted.db.players.push({ id: "p1", status: "active", type: "member" });
    hoisted.db.guests.push({ id: "g1", name: "Convidado 1", invited_by: "p1" });

    const success = await joinGame(
      "sunday-2026-06-21",
      null,
      "guests",
      null,
      "p1",
      "g1",
    );

    expect(success).toBe(true);
    const inserted = hoisted.db.game_registrations.find((row) => row.guest_id === "g1");
    expect(inserted?.slot).toBe("main");

    vi.useRealTimers();
  });

  it("cenario 3: convidado no sabado sem vaga vai para waitlist", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-20T10:00:00"));

    hoisted.db.games.push({
      id: "sunday-2026-06-21",
      day: "sunday",
      date: "2026-06-21",
      time: "09:00",
      status: "active",
    });

    hoisted.db.players.push({ id: "p1", status: "active", type: "member" });
    hoisted.db.guests.push({ id: "g2", name: "Convidado 2", invited_by: "p1" });

    for (let index = 0; index < 21; index += 1) {
      hoisted.db.game_registrations.push({
        id: `m-${index + 1}`,
        game_id: "sunday-2026-06-21",
        slot: "main",
        registered_at: `2026-06-19T20:${String(index).padStart(2, "0")}:00.000Z`,
      });
    }

    const success = await joinGame(
      "sunday-2026-06-21",
      null,
      "guests",
      null,
      "p1",
      "g2",
    );

    expect(success).toBe(true);
    const inserted = hoisted.db.game_registrations.find((row) => row.guest_id === "g2");
    expect(inserted?.slot).toBe("waitlist");

    vi.useRealTimers();
  });

  it("cenario 4: leave promove waitlist e convidado de guests sobe para main quando abre vaga", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-20T12:00:00"));

    hoisted.db.games.push({
      id: "sunday-2026-06-21",
      day: "sunday",
      date: "2026-06-21",
      time: "09:00",
      status: "active",
    });

    hoisted.db.players.push(
      { id: "p-leave", status: "active", type: "member" },
      { id: "p-wait", status: "active", type: "member" },
    );
    hoisted.db.guests.push({ id: "g3", name: "Convidado 3", invited_by: "p-leave" });

    hoisted.db.game_registrations.push({
      id: "leave-main",
      game_id: "sunday-2026-06-21",
      player_id: "p-leave",
      slot: "main",
      registered_at: "2026-06-19T20:00:00.000Z",
    });

    for (let index = 0; index < 19; index += 1) {
      hoisted.db.game_registrations.push({
        id: `main-${index + 1}`,
        game_id: "sunday-2026-06-21",
        slot: "main",
        registered_at: `2026-06-19T20:${String(index).padStart(2, "0")}:00.000Z`,
      });
    }

    hoisted.db.game_registrations.push(
      {
        id: "wait-1",
        game_id: "sunday-2026-06-21",
        player_id: "p-wait",
        slot: "waitlist",
        registered_at: "2026-06-19T21:00:00.000Z",
      },
      {
        id: "guest-3",
        game_id: "sunday-2026-06-21",
        guest_id: "g3",
        invited_by: "p-leave",
        slot: "guests",
        registered_at: "2026-06-19T21:05:00.000Z",
      },
    );

    const success = await leaveGame("sunday-2026-06-21", "p-leave");

    expect(success).toBe(true);

    const waitlistPromoted = hoisted.db.game_registrations.find((row) => row.id === "wait-1");
    const guestMigrated = hoisted.db.game_registrations.find((row) => row.id === "guest-3");
    const leaverRegistration = hoisted.db.game_registrations.find((row) => row.id === "leave-main");

    expect(leaverRegistration).toBeUndefined();
    expect(waitlistPromoted?.slot).toBe("main");
    expect(guestMigrated?.slot).toBe("main");

    vi.useRealTimers();
  });

  it("cenario 5: penalizado tentando entrar na main vai para waitlist", async () => {
    hoisted.db.games.push({
      id: "wednesday-2026-06-17",
      day: "wednesday",
      date: "2026-06-17",
      time: "19:30",
      status: "active",
    });

    hoisted.db.players.push({
      id: "p-pen",
      status: "penalized",
      type: "member",
      on_injury_leave: false,
    });

    const success = await joinGame("wednesday-2026-06-17", "p-pen", "main");

    expect(success).toBe(true);

    const inserted = hoisted.db.game_registrations.find((row) => row.player_id === "p-pen");
    expect(inserted?.slot).toBe("waitlist");
  });

  it("cenario 6: on_injury_leave=true nao bloqueia entrada de jogador ativo", async () => {
    hoisted.db.games.push({
      id: "wednesday-2026-06-17",
      day: "wednesday",
      date: "2026-06-17",
      time: "19:30",
      status: "active",
    });

    hoisted.db.players.push({
      id: "p-injury",
      status: "active",
      type: "member",
      on_injury_leave: true,
    });

    const success = await joinGame("wednesday-2026-06-17", "p-injury", "main");

    expect(success).toBe(true);

    const inserted = hoisted.db.game_registrations.find((row) => row.player_id === "p-injury");
    expect(inserted?.slot).toBe("main");
  });
});
