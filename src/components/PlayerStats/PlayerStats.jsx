import { useEffect, useMemo, useState } from "react";
import { getPlayerStats } from "../../data/supabaseService";
import { BADGES, BadgeIcon, getEarnedBadges } from "../../domain/badges";
import "./PlayerStats.css";

const EMPTY_STATS = {
  totalGames: 0,
  totalAbsences: 0,
  totalPenalties: 0,
  totalGuests: 0,
  currentStreak: 0,
  isCaptain: false,
  isSetter: false,
};

function PlayerStats({ playerId, compact = false }) {
  const [stats, setStats] = useState(EMPTY_STATS);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadStats() {
      setLoading(true);
      const data = await getPlayerStats(playerId);
      if (!active) return;
      setStats(data || EMPTY_STATS);
      setLoading(false);
    }

    if (playerId) loadStats();

    return () => {
      active = false;
    };
  }, [playerId]);

  const earnedIds = useMemo(
    () => new Set(getEarnedBadges(stats).map((badge) => badge.id)),
    [stats],
  );

  if (loading) {
    return <p className="player-stats__loading">Carregando estatisticas...</p>;
  }

  return (
    <section
      className={`player-stats ${compact ? "player-stats--compact" : ""}`}
    >
      <div className="player-stats__numbers">
        <div className="player-stats__number-card">
          <span className="player-stats__number">{stats.totalGames}</span>
          <span className="player-stats__label">Jogos</span>
        </div>
        <div className="player-stats__number-card">
          <span className="player-stats__number">{stats.totalAbsences}</span>
          <span className="player-stats__label">Faltas</span>
        </div>
        <div className="player-stats__number-card">
          <span className="player-stats__number">{stats.totalGuests}</span>
          <span className="player-stats__label">Convidados</span>
        </div>
      </div>

      <div className="player-stats__badges">
        {BADGES.map((badge) => {
          const earned = earnedIds.has(badge.id);
          const title = `${badge.label} - ${badge.description}`;

          return (
            <div
              key={badge.id}
              className={`player-stats__badge ${earned ? "player-stats__badge--earned" : "player-stats__badge--locked"}`}
              title={title}
            >
              <BadgeIcon
                id={badge.id}
                size={compact ? 30 : 40}
                dimmed={!earned}
              />
              <span className="player-stats__badge-name">{badge.label}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default PlayerStats;
