// Pagina publica de atletas do grupo

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getPublicPlayers } from "../../data/supabaseService";
import {
  PLAYER_POSITIONS,
  PLAYER_POSITION_LABELS,
  PLAYER_STATUS,
  SKILL_LEVELS,
  SPECIAL_BADGE_FIELDS,
} from "../../domain/constants";
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
  const [levelFilter, setLevelFilter] = useState("all");
  const [positionFilter, setPositionFilter] = useState("all");
  const [badgeFilters, setBadgeFilters] = useState({});

  useEffect(() => {
    async function fetchPlayers() {
      const data = await getPublicPlayers();
      setPlayers(data || []);
      setLoading(false);
    }
    fetchPlayers();
  }, []);

  function toggleBadgeFilter(key) {
    setBadgeFilters((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    const activeBadgeKeys = SPECIAL_BADGE_FIELDS.filter(
      (badge) => badgeFilters[badge.key],
    );

    return players.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(term) ||
        (p.nickname && p.nickname.toLowerCase().includes(term));
      if (term && !matchesSearch) return false;

      if (
        levelFilter !== "all" &&
        Number(p.skill_level) !== Number(levelFilter)
      ) {
        return false;
      }

      if (
        positionFilter !== "all" &&
        (p.position || "all-around") !== positionFilter
      ) {
        return false;
      }

      if (
        activeBadgeKeys.length > 0 &&
        !activeBadgeKeys.some((badge) => Boolean(p[badge.field]))
      ) {
        return false;
      }

      return true;
    });
  }, [players, search, levelFilter, positionFilter, badgeFilters]);

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

      <div className="athletes__filters">
        <label className="athletes__filter-item">
          <span>Nivel</span>
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
          >
            <option value="all">Todos</option>
            {SKILL_LEVELS.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
        </label>

        <label className="athletes__filter-item">
          <span>Posicao</span>
          <select
            value={positionFilter}
            onChange={(e) => setPositionFilter(e.target.value)}
          >
            <option value="all">Todas</option>
            {PLAYER_POSITIONS.map((position) => (
              <option key={position} value={position}>
                {PLAYER_POSITION_LABELS[position] || position}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="athletes__badge-filters">
        {SPECIAL_BADGE_FIELDS.map((badge) => (
          <label
            key={badge.key}
            className={`athletes__badge-filter${
              badgeFilters[badge.key] ? " athletes__badge-filter--active" : ""
            }`}
          >
            <input
              type="checkbox"
              checked={Boolean(badgeFilters[badge.key])}
              onChange={() => toggleBadgeFilter(badge.key)}
            />
            {badge.label}
          </label>
        ))}
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
                  loading="lazy"
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
