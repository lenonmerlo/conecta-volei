export function getCycleOpenAt(game) {
  if (!game?.date || !game?.day) return null;
  if (game.day !== "wednesday" && game.day !== "sunday") return null;

  const [year, month, day] = String(game.date)
    .split("T")[0]
    .split("-")
    .map((value) => Number.parseInt(value, 10));

  if (!year || !month || !day) return null;

  const gameDate = new Date(year, month - 1, day, 0, 0, 0, 0);
  const offsetDays = game.day === "wednesday" ? 2 : 3;

  gameDate.setDate(gameDate.getDate() - offsetDays);
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

function getDateInSaoPaulo(now = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(now)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );

  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
}

export function isGuestMigrationWindowOpen(game, now = new Date()) {
  if (game?.day !== "sunday" || !game?.date) return false;

  const [year, month, day] = String(game.date)
    .slice(0, 10)
    .split("-")
    .map(Number);

  if (!year || !month || !day) return false;

  const saturday = new Date(Date.UTC(year, month - 1, day));
  saturday.setUTCDate(saturday.getUTCDate() - 1);

  return getDateInSaoPaulo(now).getTime() >= saturday.getTime();
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
  if (game?.day === "wednesday" && isGuest) {
    return hasMainSpot ? "main" : "waitlist";
  }

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