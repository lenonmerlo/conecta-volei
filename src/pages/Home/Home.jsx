// Página inicial — exibe os jogos da semana

import { useEffect, useState } from "react";
import GameCard from "../../components/GameCard/GameCard";
import { getGames } from "../../data/supabaseService";
import "./Home.css";

function normalizeGame(game) {
  const registeredCount = Number.isFinite(game.registered_count)
    ? game.registered_count
    : Number.isFinite(game.registeredCount)
      ? game.registeredCount
      : 0;

  return {
    id: game.id,
    day: game.day,
    time: game.time,
    date: game.date,
    location: game.location,
    mapUrl: game.map_url ?? game.mapUrl ?? null,
    players: Array.isArray(game.players)
      ? game.players
      : Array.from({ length: registeredCount }),
  };
}

function Home() {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadGames() {
      setLoading(true);
      const data = await getGames();
      if (!active) return;
      setGames((data || []).map(normalizeGame));
      setLoading(false);
    }

    loadGames();

    return () => {
      active = false;
    };
  }, []);

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
          games.map((game) => <GameCard key={game.id} game={game} />)}
      </div>
    </div>
  );
}

export default Home;
