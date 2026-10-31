export function getCycleOpenAt(game) {
  if (!game?.date || !game?.day) return null;
  if (game.day !== "sunday") return null;

  const [year, month, day] = String(game.date)
    .split("T")[0]
    .split("-")
    .map((value) => Number.parseInt(value, 10));

  if (!year || !month || !day) return null;

  const gameDate = new Date(year, month - 1, day, 0, 0, 0, 0);
  gameDate.setDate(gameDate.getDate() - 3);
  gameDate.setHours(19, 0, 0, 0);

  return gameDate;
}

export function isRegistrationInCurrentCycle(registration, game) {
  const openAt = getCycleOpenAt(game);
  if (!openAt) return true;

  const registeredAt = new Date(registration?.registered_at);
  if (Number.isNaN(registeredAt.getTime())) return false;

  return registeredAt.getTime() >= openAt.getTime();
}

export function getGuestMigrationOpenAt(game) {
  if (game?.day !== "sunday" || !game?.date) return null;

  const [year, month, day] = String(game.date)
    .slice(0, 10)
    .split("-")
    .map(Number);

  if (!year || !month || !day) return null;

  // Meia-noite de sábado em São Paulo corresponde a 03h UTC.
  const migrationOpenAt = new Date(
    Date.UTC(year, month - 1, day, 3, 0, 0, 0),
  );

  migrationOpenAt.setUTCDate(migrationOpenAt.getUTCDate() - 1);

  return migrationOpenAt;
}

export function isGuestMigrationWindowOpen(game, now = new Date()) {
  const migrationOpenAt = getGuestMigrationOpenAt(game);

  if (!migrationOpenAt) return false;

  return now.getTime() >= migrationOpenAt.getTime();
}

function resolveSundaySlot({
  game,
  isGuest,
  hasMainSpot,
  now = new Date(),
}) {
  if (!isGuest) {
    return hasMainSpot ? "main" : "waitlist";
  }

  if (!isGuestMigrationWindowOpen(game, now)) {
    return "guests";
  }

  return hasMainSpot ? "main" : "waitlist";
}

export function resolveJoinSlot({
  game,
  isGuest,
  isPenalized,
  hasMainSpot,
  now = new Date(),
}) {

  if (isPenalized) {
    return "waitlist";
  }

  if (game?.day === "sunday") {
    return resolveSundaySlot({
      game,
      isGuest,
      hasMainSpot,
      now,
    });
  }

  return hasMainSpot ? "main" : "waitlist";
}