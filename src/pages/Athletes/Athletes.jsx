// Pagina publica de atletas do grupo

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAllPlayers } from "../../data/supabaseService";
import { PLAYER_STATUS } from "../../domain/constants";
import "./Athletes.css";

function statusBadge(status) {
  if (status === PLAYER_STATUS.PENALIZED) {
    return (
      <span className="athlete__badge athlete__badge--penalized">
        Penalizado
      </span>
    );
  }
  if (status === PLAYER_STATUS.BLOCKED) {
    return (
      <span className="athlete__badge athlete__badge--blocked">Suspenso</span>
    );
  }
  return null;
}

function positionBadges(player) {
  return (
    <span className="athletes__role-badges">
      {player.is_captain && (
        <span className="athletes__badge athletes__badge--captain">C</span>
      )}
      {player.is_setter && (
        <span className="athletes__badge athletes__badge--setter">L</span>
      )}
    </span>
  );
}

function Athletes() {
  const navigate = useNavigate();
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function fetchPlayers() {
      const data = await getAllPlayers();
      setPlayers(data || []);
      setLoading(false);
    }
    fetchPlayers();
  }, []);

  const filtered = players.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.nickname && p.nickname.toLowerCase().includes(search.toLowerCase())),
  );

  if (loading) {
    return (
      <div className="athletes">
        <p className="athletes__loading">Carregando atletas...</p>
      </div>
    );
  }

  return (
    <div className="athletes">
      <h2 className="athletes__title">Atletas</h2>

      <div className="athletes__search">
        <input
          placeholder="Buscar atleta..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <ul className="athletes__list">
        {filtered.map((p) => (
          <li
            key={p.id}
            className="athletes__item"
            onClick={() => navigate(`/athlete/${p.id}`)}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                navigate(`/athlete/${p.id}`);
              }
            }}
          >
            <div className="athletes__avatar">
              {p.avatar_url ? (
                <img
                  src={p.avatar_url}
                  alt={p.name}
                  className="athletes__avatar-img"
                />
              ) : (
                <span>{p.name.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div className="athletes__info">
              <span className="athletes__name-wrap">
                <span className="athletes__name">
                  {p.name}
                  {p.nickname ? ` (${p.nickname})` : ""}
                </span>
              </span>
              <span className="athletes__meta">
                {(p.is_captain || p.is_setter) && positionBadges(p)}
                <span className="athletes__gender">
                  {p.gender === "F" ? "♀" : "♂"}
                </span>
              </span>
            </div>
            {statusBadge(p.status)}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Athletes;
