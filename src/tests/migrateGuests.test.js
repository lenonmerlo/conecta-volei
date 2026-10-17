import { describe, expect, it } from "vitest";

function migrateGuestsToWaitlistMock(registrations, migratedAt) {
  let guestIndex = 0;

  return registrations.map((registration) => {
    if (registration.slot !== "guests") return registration;

    const slotEnteredAt = new Date(
      migratedAt.getTime() + guestIndex,
    ).toISOString();
    guestIndex += 1;

    return {
      ...registration,
      slot: "waitlist",
      slot_entered_at: slotEnteredAt,
    };
  });
}

function sortByCurrentSlotOrder(registrations) {
  return [...registrations].sort((a, b) => {
    const aOrder = a.slot_entered_at || a.registered_at;
    const bOrder = b.slot_entered_at || b.registered_at;
    const dateCompare = String(aOrder).localeCompare(String(bOrder));

    if (dateCompare !== 0) return dateCompare;
    return String(a.id).localeCompare(String(b.id));
  });
}

describe("migrateGuestsToWaitlistMock", () => {
  it("ordena membros antigos, convidados migrados e membro de sabado", () => {
    const thursday = new Date("2026-05-21T22:00:00.000Z");
    const saturdayMigration = new Date("2026-05-23T03:00:00.000Z");

    const existingMembers = [
      {
        id: "m1",
        type: "member",
        slot: "waitlist",
        registered_at: new Date(thursday.getTime() + 10_000).toISOString(),
        slot_entered_at: new Date(thursday.getTime() + 10_000).toISOString(),
      },
      {
        id: "m2",
        type: "member",
        slot: "waitlist",
        registered_at: new Date(thursday.getTime() + 20_000).toISOString(),
        slot_entered_at: new Date(thursday.getTime() + 20_000).toISOString(),
      },
    ];

    const guests = [
      {
        id: "g1",
        type: "guest",
        slot: "guests",
        registered_at: new Date(thursday.getTime() + 1_000).toISOString(),
      },
      {
        id: "g2",
        type: "guest",
        slot: "guests",
        registered_at: new Date(thursday.getTime() + 2_000).toISOString(),
      },
    ];

    const migrated = migrateGuestsToWaitlistMock(
      [...existingMembers, ...guests],
      saturdayMigration,
    );

    const saturdayMember = {
      id: "m3",
      type: "member",
      slot: "waitlist",
      registered_at: new Date(
        saturdayMigration.getTime() + 60_000,
      ).toISOString(),
      slot_entered_at: new Date(
        saturdayMigration.getTime() + 60_000,
      ).toISOString(),
    };

    const finalOrder = sortByCurrentSlotOrder([
      ...migrated.filter((registration) => registration.slot === "waitlist"),
      saturdayMember,
    ]);

    expect(finalOrder.map((registration) => registration.id)).toEqual([
      "m1",
      "m2",
      "g1",
      "g2",
      "m3",
    ]);
    expect(
      finalOrder.find((registration) => registration.id === "g1")
        ?.registered_at,
    ).toBe(guests[0].registered_at);
    expect(
      finalOrder.find((registration) => registration.id === "g2")
        ?.registered_at,
    ).toBe(guests[1].registered_at);
  });
});
