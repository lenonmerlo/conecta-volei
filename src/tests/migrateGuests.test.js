// Teste mockado da migracao de convidados para waitlist sem Supabase real.

import { describe, expect, it } from "vitest";

function migrateGuestsToWaitlistMock(registrations) {
  return registrations.map((registration) => {
    if (registration.slot !== "guests") return registration;

    return {
      ...registration,
      slot: "waitlist",
    };
  });
}

function sortByRegisteredAtAsc(registrations) {
  return [...registrations].sort(
    (a, b) => new Date(a.registered_at) - new Date(b.registered_at),
  );
}

describe("migrateGuestsToWaitlistMock", () => {
  it("migracao preserva registered_at original dos convidados", () => {
    const lastThursday = new Date("2026-05-21T00:00:00.000Z");

    // 3 membros ja na waitlist desde quinta passada.
    const membersWaitlist = [
      {
        id: "m1",
        name: "Membro 1",
        type: "member",
        slot: "waitlist",
        registered_at: new Date(
          lastThursday.getTime() + 10 * 60 * 1000,
        ).toISOString(),
      },
      {
        id: "m2",
        name: "Membro 2",
        type: "member",
        slot: "waitlist",
        registered_at: new Date(
          lastThursday.getTime() + 20 * 60 * 1000,
        ).toISOString(),
      },
      {
        id: "m3",
        name: "Membro 3",
        type: "member",
        slot: "waitlist",
        registered_at: new Date(
          lastThursday.getTime() + 30 * 60 * 1000,
        ).toISOString(),
      },
    ];

    // 2 convidados em guests, com horario antigo (antes dos membros).
    const guests = [
      {
        id: "g1",
        name: "Convidado 1",
        type: "guest",
        slot: "guests",
        registered_at: new Date(
          lastThursday.getTime() + 2 * 60 * 1000,
        ).toISOString(),
      },
      {
        id: "g2",
        name: "Convidado 2",
        type: "guest",
        slot: "guests",
        registered_at: new Date(
          lastThursday.getTime() + 5 * 60 * 1000,
        ).toISOString(),
      },
    ];

    const initialRegistrations = [...membersWaitlist, ...guests];
    const migrated = migrateGuestsToWaitlistMock(initialRegistrations);
    const finalWaitlistOrder = sortByRegisteredAtAsc(
      migrated.filter((registration) => registration.slot === "waitlist"),
    );

    const firstTwoAreGuests = finalWaitlistOrder
      .slice(0, 2)
      .every((registration) => registration.type === "guest");
    const lastThreeAreMembers = finalWaitlistOrder
      .slice(2)
      .every((registration) => registration.type === "member");

    expect(firstTwoAreGuests).toBe(true);
    expect(lastThreeAreMembers).toBe(true);
    expect(
      migrated.find((registration) => registration.id === "g1")?.registered_at,
    ).toBe(guests[0].registered_at);
    expect(
      migrated.find((registration) => registration.id === "g2")?.registered_at,
    ).toBe(guests[1].registered_at);

    console.log("[migrateGuests.test] Ordem final da lista de espera:");
    console.table(
      finalWaitlistOrder.map((registration, index) => ({
        posicao: index + 1,
        id: registration.id,
        nome: registration.name,
        tipo: registration.type,
        slot: registration.slot,
        registered_at: registration.registered_at,
      })),
    );

    console.log("[migrateGuests.test] Teste passou.");
  });
});
