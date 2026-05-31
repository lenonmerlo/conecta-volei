import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../app/AuthContext";
import { deleteScrap, getAllScraps } from "../../data/supabaseService";
import { isAdmin } from "../../domain/admins";
import "./Scrapbook.css";

const MONTHS_PT = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
];

function formatScrapDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Agora";

  const day = String(date.getDate()).padStart(2, "0");
  const month = MONTHS_PT[date.getMonth()] || "";
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${day} ${month} ${year}, ${hours}:${minutes}`;
}

function getPlayerLabel(player) {
  if (!player) return "Atleta";
  if (player.nickname) return `${player.name} (${player.nickname})`;
  return player.name || "Atleta";
}

function PlayerMiniCard({ player, onClick, clickable = false }) {
  const label = getPlayerLabel(player);

  if (!clickable) {
    return (
      <div className="scrapbook__player scrapbook__player--static">
        <span className="scrapbook__avatar" aria-hidden="true">
          {player?.avatar_url ? (
            <img src={player.avatar_url} alt={label} loading="lazy" />
          ) : (
            <span>{(player?.name || "?").charAt(0).toUpperCase()}</span>
          )}
        </span>
        <span className="scrapbook__player-name">{label}</span>
      </div>
    );
  }

  return (
    <button
      type="button"
      className="scrapbook__player scrapbook__player--clickable"
      onClick={onClick}
    >
      <span className="scrapbook__avatar" aria-hidden="true">
        {player?.avatar_url ? (
          <img src={player.avatar_url} alt={label} loading="lazy" />
        ) : (
          <span>{(player?.name || "?").charAt(0).toUpperCase()}</span>
        )}
      </span>
      <span className="scrapbook__player-name">{label}</span>
    </button>
  );
}

function Scrapbook() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [scraps, setScraps] = useState([]);

  const loadScraps = useCallback(async () => {
    setLoading(true);
    setError("");

    const data = await getAllScraps();
    setScraps(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadScraps();
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [loadScraps]);

  function canDeleteScrap(scrap) {
    if (!user?.id) return false;
    return (
      user.id === scrap.from_player_id ||
      user.id === scrap.to_player_id ||
      isAdmin(user)
    );
  }

  async function handleDelete(scrapId) {
    const success = await deleteScrap(scrapId);
    if (!success) {
      setError("Não foi possível apagar o scrap.");
      return;
    }

    setError("");
    setScraps((prev) => prev.filter((scrap) => scrap.id !== scrapId));
  }

  return (
    <section className="scrapbook-page">
      <header className="scrapbook-page__header">
        <h2>Scrapbook</h2>
        <p>Recados da comunidade do Conecta Vôlei</p>
      </header>

      {error && <p className="scrapbook-page__error">{error}</p>}
      {loading && <p className="scrapbook-page__state">Carregando scraps...</p>}

      {!loading && scraps.length === 0 && (
        <p className="scrapbook-page__state">Ainda não há scraps no feed.</p>
      )}

      <ul className="scrapbook-page__list">
        {scraps.map((scrap) => {
          const fromPlayer = scrap.from_player || null;
          const toPlayer = scrap.to_player || null;

          return (
            <li key={scrap.id} className="scrapbook-page__item">
              <div className="scrapbook-page__top">
                <PlayerMiniCard player={fromPlayer} />

                <span className="scrapbook-page__arrow">
                  deixou um scrap para
                </span>

                <PlayerMiniCard
                  player={toPlayer}
                  clickable
                  onClick={() => navigate(`/athlete/${scrap.to_player_id}`)}
                />
              </div>

              <p className="scrapbook-page__message">{scrap.message}</p>

              <div className="scrapbook-page__meta">
                <span>{formatScrapDate(scrap.created_at)}</span>

                {canDeleteScrap(scrap) && (
                  <button
                    type="button"
                    className="scrapbook-page__delete"
                    onClick={() => handleDelete(scrap.id)}
                  >
                    Apagar
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default Scrapbook;
