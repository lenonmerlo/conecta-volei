// Página inicial — exibe os jogos da semana

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../../app/AuthContext";
import GameCard from "../../components/GameCard/GameCard";
import {
  getActiveAnnouncements,
  getGames,
  getPlayerStats,
  getRegistrationCountsByGame,
} from "../../data/supabaseService";
import { supabase } from "../../lib/supabase";
import "./Home.css";

function normalizeLocation(value) {
  return (value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function getFixedMapUrlByLocation(location) {
  const normalized = normalizeLocation(location);

  if (normalized.includes("jardim camburi")) {
    return "https://maps.app.goo.gl/CrL7HdThrLErg3TQ7";
  }

  if (
    normalized.includes("ilha de santa maria") ||
    normalized.includes("ilha de sta maria")
  ) {
    return "https://maps.app.goo.gl/rQgsrSFC3WmMBci7A";
  }

  return null;
}

function resolveMapUrl(game) {
  const fixedUrl = getFixedMapUrlByLocation(game.location);
  if (fixedUrl) return fixedUrl;

  const directUrl =
    game.map_url ??
    game.mapUrl ??
    game.maps_url ??
    game.mapsUrl ??
    game.location_url ??
    game.locationUrl ??
    null;

  if (typeof directUrl === "string" && directUrl.trim()) {
    return directUrl.trim();
  }

  if (typeof game.location === "string" && game.location.trim()) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(game.location.trim())}`;
  }

  return null;
}

function normalizeGame(game) {
  return {
    id: game.id,
    day: game.day,
    time: game.time,
    date: game.date,
    location: game.location,
    status: game.status || "active",
    notes: game.notes || null,
    mapUrl: resolveMapUrl(game),
  };
}

function getTodayDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getGameDateTime(game) {
  if (!game?.date || !game?.time) return null;
  const dateTime = new Date(`${game.date}T${game.time}:00`);
  return Number.isNaN(dateTime.getTime()) ? null : dateTime;
}

function formatCountdown(targetDate, now) {
  const diffMs = targetDate.getTime() - now;
  if (diffMs <= 0) return null;

  const totalMinutes = Math.floor(diffMs / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}min`;
  return `${minutes}min`;
}

function isGameVisible(game) {
  const normalizedDate = String(game?.date || "").split("T")[0] || "";
  const today = getTodayDateString();
  const isFixed = game.day === "wednesday" || game.day === "sunday";
  if (isFixed) {
    if (game.status !== "active") return false;
    if (!normalizedDate) return false;
    return normalizedDate >= today;
  }

  if (game.status === "cancelled") return false;

  if (game.status !== "active") return false;
  if (!game.date || !game.time) return false;

  const [hours, minutes] = game.time.split(":");
  const gameStart = new Date(`${game.date}T${game.time}:00Z`);

  if (Number.isNaN(gameStart.getTime())) return false;

  gameStart.setUTCHours(
    Number.parseInt(hours || "0", 10) + 2,
    Number.parseInt(minutes || "0", 10),
    0,
    0,
  );

  return new Date() < gameStart;
}

function Home() {
  const { user } = useAuth();
  const [games, setGames] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [streak, setStreak] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const realtimeDebounceRef = useRef(null);

  const fetchGames = useCallback(async () => {
    setLoading(true);
    const [data, registrationCounts, activeAnnouncements, playerStats] =
      await Promise.all([
        getGames(),
        getRegistrationCountsByGame(),
        getActiveAnnouncements(),
        user?.id ? getPlayerStats(user.id) : Promise.resolve(null),
      ]);

    const normalizedGames = (data || [])
      .map(normalizeGame)
      .filter(isGameVisible);
    const gamesWithCounts = normalizedGames.map((game) => ({
      ...game,
      registeredCount: registrationCounts?.[game.id] || 0,
    }));

    setGames(gamesWithCounts);
    setAnnouncements(activeAnnouncements || []);
    setStreak(playerStats?.currentStreak || 0);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchGames();
    }, 0);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [fetchGames]);

  useEffect(() => {
    const intervalId = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(intervalId);
  }, []);

  const nextGame = useMemo(() => {
    const upcoming = games
      .map((game) => ({ game, dateTime: getGameDateTime(game) }))
      .filter((entry) => entry.dateTime && entry.dateTime.getTime() > now)
      .sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime());

    return upcoming[0] || null;
  }, [games, now]);

  const countdownLabel = nextGame
    ? formatCountdown(nextGame.dateTime, now)
    : null;

  useEffect(() => {
    function scheduleRealtimeRefresh() {
      if (realtimeDebounceRef.current) {
        clearTimeout(realtimeDebounceRef.current);
      }

      realtimeDebounceRef.current = setTimeout(() => {
        fetchGames();
      }, 300);
    }

    const channel = supabase
      .channel("home-game-registrations")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "game_registrations",
        },
        scheduleRealtimeRefresh,
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "game_registrations",
        },
        scheduleRealtimeRefresh,
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "game_registrations",
        },
        scheduleRealtimeRefresh,
      )
      .subscribe();

    return () => {
      if (realtimeDebounceRef.current) {
        clearTimeout(realtimeDebounceRef.current);
      }
      supabase.removeChannel(channel);
    };
  }, [fetchGames]);

  return (
    <div className="home">
      <div className="home__hero">
        <h2 className="home__title">Jogos da Semana</h2>
        <p className="home__subtitle">
          Quadra pronta, energia no alto e organização em tempo real.
        </p>
      </div>

      {!loading && (streak > 0 || countdownLabel) && (
        <div className="home__highlights">
          {streak > 0 && (
            <span className="home__highlight-chip home__highlight-chip--streak">
              🔥 Sequência de {streak} {streak === 1 ? "jogo" : "jogos"}
            </span>
          )}
          {countdownLabel && (
            <span className="home__highlight-chip home__highlight-chip--countdown">
              ⏳ Faltam {countdownLabel} para o próximo jogo
            </span>
          )}
        </div>
      )}

      <div className="home__list">
        {loading && <p className="home__state">Carregando jogos...</p>}
        {!loading && games.length === 0 && (
          <p className="home__state">Nenhum jogo disponível no momento.</p>
        )}
        {!loading &&
          games.map((game) => (
            <GameCard
              key={game.id}
              game={game}
              registeredCount={game.registeredCount || 0}
            />
          ))}
      </div>

      {!loading && announcements.length > 0 && (
        <div className="home__announcements">
          <h3 className="home__announcements-title">Avisos</h3>
          <ul className="home__announcements-list">
            {announcements.map((announcement) => (
              <li
                key={announcement.id}
                className={`home__announcements-item ${announcement.urgent ? "home__announcements-item--urgent" : ""}`}
              >
                <strong className="home__announcements-item-title">
                  {announcement.urgent ? "URGENTE - " : ""}
                  {announcement.title}
                </strong>
                <p className="home__announcements-item-body">
                  {announcement.body}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default Home;
