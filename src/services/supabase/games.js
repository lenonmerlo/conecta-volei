import { supabase } from "../../lib/supabase";

export async function getGames() {
  const { data, error } = await supabase
    .from("games")
    .select("*")
    .order("date");

  if (error) return [];

  const games = data || [];
  const [currentWednesdayId, currentSundayId] = await Promise.all([
    getCurrentGameIdForDay("wednesday"),
    getCurrentGameIdForDay("sunday"),
  ]);

  const currentFixedGameIds = new Map(
    [
      ["wednesday", currentWednesdayId],
      ["sunday", currentSundayId],
    ].filter(([, gameId]) => Boolean(gameId)),
  );

  return games
    .filter((game) => {
      if (!isFixedDay(game?.day)) return true;

      const currentId = currentFixedGameIds.get(game.day);
      if (!currentId) return false;
      return String(game.id) === String(currentId);
    })
    .sort((a, b) => {
      const dateCompare = String(a?.date || "").localeCompare(
        String(b?.date || ""),
      );
      if (dateCompare !== 0) return dateCompare;
      return String(a?.time || "").localeCompare(String(b?.time || ""));
    });
}

export async function createGame(game) {
  const dayNames = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];
  const dateObj = new Date(`${game.date}T12:00:00Z`);
  const day = dayNames[dateObj.getUTCDay()];
  const id = `${day}-${game.date}`;

  const payload = {
    id,
    day,
    date: game.date,
    location: game.location,
    time: game.time,
    status: game.status || "active",
    notes: game.notes || null,
  };

  const { data, error } = await supabase
    .from("games")
    .insert(payload)
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, game: data };
}

export async function updateGame(gameId, data) {
  const payload = {
    location: data.location,
    time: data.time,
    date: data.date,
    status: data.status,
    notes: data.notes,
  };

  const cleanPayload = Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined),
  );

  const { error } = await supabase
    .from("games")
    .update(cleanPayload)
    .eq("id", gameId);

  return !error;
}

export async function cancelGame(gameId) {
  const { error } = await supabase
    .from("games")
    .update({ status: "cancelled" })
    .eq("id", gameId);

  return !error;
}

export async function getGameById(gameId) {
  const { data, error } = await supabase
    .from("games")
    .select("*")
    .eq("id", gameId)
    .single();

  if (error) return null;
  if (!data) return null;
  return data;
}

export function normalizeGameDate(value) {
  if (!value) return null;
  return String(value).split("T")[0] || null;
}

export function isFixedDay(day) {
  return day === "wednesday" || day === "sunday";
}

function formatLocalDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isNewFormatGameId(gameId, day) {
  return typeof gameId === "string" && gameId.startsWith(`${day}-`);
}

function pickCurrentGameIdForDay(day, games, now = new Date()) {
  if (!isFixedDay(day)) return null;

  const today = formatLocalDate(now);
  if (!today) return null;

  const upcomingGames = (games || [])
    .filter((game) => game?.day === day)
    .filter((game) => game?.status === "active")
    .filter((game) => {
      const normalizedDate = normalizeGameDate(game?.date);
      return Boolean(normalizedDate && normalizedDate >= today);
    });

  if (!upcomingGames.length) return null;

  const earliestDate = upcomingGames.reduce((currentEarliest, game) => {
    const gameDate = normalizeGameDate(game?.date);
    if (!currentEarliest) return gameDate;
    if (!gameDate) return currentEarliest;
    return gameDate < currentEarliest ? gameDate : currentEarliest;
  }, null);

  const gamesOnCurrentCycle = upcomingGames.filter(
    (game) => normalizeGameDate(game?.date) === earliestDate,
  );

  const preferred = gamesOnCurrentCycle.find((game) =>
    isNewFormatGameId(String(game?.id || ""), day),
  );
  if (preferred?.id) return String(preferred.id);

  const firstByTime = [...gamesOnCurrentCycle].sort((a, b) => {
    const timeCompare = String(a?.time || "").localeCompare(
      String(b?.time || ""),
    );
    if (timeCompare !== 0) return timeCompare;
    return String(a?.id || "").localeCompare(String(b?.id || ""));
  })[0];

  if (firstByTime?.id) return String(firstByTime.id);
  return null;
}

export async function getCurrentGameIdForDay(day, now = new Date()) {
  if (!isFixedDay(day)) return null;

  const { data, error } = await supabase
    .from("games")
    .select("id, day, date, time, status")
    .eq("day", day)
    .eq("status", "active")
    .order("date")
    .order("time");

  if (error) {
    console.error("[Supabase] Falha ao resolver jogo atual por dia:", {
      day,
      error,
    });
    return null;
  }

  const currentGameId = pickCurrentGameIdForDay(day, data || [], now);
  if (!currentGameId) {
    console.error("[Supabase] Nenhum jogo ativo encontrado para o dia:", {
      day,
      now: now.toISOString(),
    });
  }

  return currentGameId;
}

export function dedupeById(rows) {
  const seen = new Set();
  return (rows || []).filter((row) => {
    if (!row?.id) return false;
    if (seen.has(row.id)) return false;
    seen.add(row.id);
    return true;
  });
}

export async function resolveGameId(gameId) {
  if (!gameId) return gameId;

  const requestedId = String(gameId);
  const { data: requestedGame } = await supabase
    .from("games")
    .select("id, day, date")
    .eq("id", requestedId)
    .maybeSingle();

  if (!requestedGame || !isFixedDay(requestedGame.day)) {
    return requestedId;
  }

  const currentGameId = await getCurrentGameIdForDay(requestedGame.day);
  if (currentGameId) return currentGameId;

  const normalizedDate = normalizeGameDate(requestedGame.date);
  if (!normalizedDate) return requestedId;

  const newFormatId = `${requestedGame.day}-${normalizedDate}`;
  const { data: newFormatGame } = await supabase
    .from("games")
    .select("id")
    .eq("id", newFormatId)
    .maybeSingle();

  if (newFormatGame?.id) return newFormatGame.id;
  return requestedId;
}

export async function resolveEquivalentGameIds(gameId) {
  const requestedId = String(gameId || "");
  if (!requestedId) return [];

  const resolvedId = await resolveGameId(requestedId);
  const ids = new Set([resolvedId].filter(Boolean));

  const { data: resolvedGame } = await supabase
    .from("games")
    .select("day, date")
    .eq("id", resolvedId)
    .maybeSingle();

  if (!resolvedGame || !isFixedDay(resolvedGame.day)) {
    ids.add(requestedId);
    return Array.from(ids);
  }

  const normalizedDate = normalizeGameDate(resolvedGame.date);
  if (!normalizedDate) return Array.from(ids);

  const fallbackNewFormatId = `${resolvedGame.day}-${normalizedDate}`;
  ids.add(fallbackNewFormatId);

  const { data: sameDateGames } = await supabase
    .from("games")
    .select("id")
    .eq("day", resolvedGame.day)
    .eq("date", normalizedDate);

  (sameDateGames || []).forEach((game) => {
    if (game?.id) ids.add(game.id);
  });

  return Array.from(ids);
}

export async function getSundayGamesHistory() {
  const { data, error } = await supabase
    .from("games")
    .select("*")
    .eq("day", "sunday")
    .order("date", { ascending: false });

  if (error) return [];
  return data || [];
}

export async function getAuditGameOptions() {
  const { data, error } = await supabase
    .from("games")
    .select("id, date, time")
    .order("date", { ascending: false })
    .order("time", { ascending: false });

  if (error) {
    console.error("[getAuditGameOptions] falha ao carregar jogos", error);
    return [];
  }

  return data || [];
}