// Página inicial — exibe os jogos da semana

import { useCallback, useEffect, useState } from "react";
import GameCard from "../../components/GameCard/GameCard";
import {
  getGameRegistrations,
  getGames,
  updateGameDates,
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

function isGameVisible(game) {
  const isFixed = game.day === "wednesday" || game.day === "sunday";
  if (isFixed) return true;

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
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchGames = useCallback(async () => {
    setLoading(true);
    await updateGameDates();
    const data = await getGames();

    const normalizedGames = (data || [])
      .map(normalizeGame)
      .filter(isGameVisible);
    const gamesWithCounts = await Promise.all(
      normalizedGames.map(async (game) => {
        const registrations = await getGameRegistrations(game.id);
        const registeredCount = (registrations || []).filter(
          (registration) => (registration.slot || "main") === "main",
        ).length;

        return { ...game, registeredCount };
      }),
    );

    setGames(gamesWithCounts);
    setLoading(false);
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchGames();
    }, 0);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [fetchGames]);

  useEffect(() => {
    const channel = supabase
      .channel("home-game-registrations")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "game_registrations",
        },
        () => fetchGames(),
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "game_registrations",
        },
        () => fetchGames(),
      )
      .subscribe();

    return () => {
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
    </div>
  );
}

export default Home;
