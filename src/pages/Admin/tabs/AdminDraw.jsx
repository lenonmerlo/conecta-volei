// Aba de sorteio de times do painel admin

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../../../components/Button/Button";
import {
  getGameRegistrations,
  getGames,
  saveGameTeams,
} from "../../../data/supabaseService";
import { isListOpen } from "../../../domain/gameRules";
import { drawTeams, swapPlayers } from "../../../domain/teamDraw";
import "./AdminDraw.css";
import "./AdminTabs.css";

function renderRoleBadges(player) {
  return (
    <span className="admin-draw__role-badges">
      {player.is_captain && (
        <span className="admin-draw__badge admin-draw__badge--captain">C</span>
      )}
      {player.is_setter && (
        <span className="admin-draw__badge admin-draw__badge--setter">L</span>
      )}
    </span>
  );
}

function normalizePlayer(player) {
  return {
    id: player.id,
    name: player.name,
    nickname: player.nickname || null,
    gender: player.gender,
    skillLevel: Number(player.skill_level ?? player.skillLevel ?? 3),
    is_captain: Boolean(player.is_captain),
    is_setter: Boolean(player.is_setter),
    position: player.position || "all-around",
    status: player.status,
    type: player.type,
  };
}

function normalizeGame(game) {
  return {
    id: game.id,
    day: game.day,
    date: game.date,
    time: game.time,
  };
}

function getGameDateTime(game) {
  if (!game?.date) return null;

  const timeRaw = (game.time || "00:00").toString();
  const hhmm = timeRaw.length >= 5 ? timeRaw.slice(0, 5) : "00:00";
  const dateTime = new Date(`${game.date}T${hhmm}:00`);

  if (Number.isNaN(dateTime.getTime())) return null;
  return dateTime;
}

function getDefaultGameId(games) {
  if (!games || games.length === 0) return "";

  const now = new Date();

  const activeGames = games.filter((game) => isListOpen(game.day, now));
  if (activeGames.length > 0) {
    const sortedActive = [...activeGames].sort((a, b) => {
      const aTime = getGameDateTime(a)?.getTime() || Number.MAX_SAFE_INTEGER;
      const bTime = getGameDateTime(b)?.getTime() || Number.MAX_SAFE_INTEGER;
      return aTime - bTime;
    });
    return sortedActive[0].id;
  }

  const upcomingGames = games
    .map((game) => ({ game, dateTime: getGameDateTime(game) }))
    .filter(
      (entry) => entry.dateTime && entry.dateTime.getTime() >= now.getTime(),
    )
    .sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime());

  if (upcomingGames.length > 0) return upcomingGames[0].game.id;

  return games[0].id;
}

function AdminDraw() {
  const navigate = useNavigate();
  const [teams, setTeams] = useState(null);
  const [swap, setSwap] = useState(null); // { teamIndex, playerId }
  const [games, setGames] = useState([]);
  const [selectedGameId, setSelectedGameId] = useState("");
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadGames() {
      setLoading(true);
      setError("");

      const data = await getGames();
      if (!active) return;

      const normalizedGames = (data || []).map(normalizeGame);
      setGames(normalizedGames);
      setSelectedGameId((prev) => {
        const prevExists = normalizedGames.some(
          (game) => String(game.id) === String(prev),
        );
        if (prev && prevExists) return prev;
        return getDefaultGameId(normalizedGames);
      });
      setLoading(false);
    }

    loadGames();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function loadMainListPlayers() {
      if (!selectedGameId) {
        setPlayers([]);
        return;
      }

      setLoadingPlayers(true);
      setError("");

      const registrations = await getGameRegistrations(selectedGameId);
      if (!active) return;

      const mainPlayers = (registrations || [])
        .filter((registration) => registration.slot === "main")
        .map((registration) => registration.player)
        .filter(Boolean)
        .map(normalizePlayer);

      setPlayers(mainPlayers);
      setTeams(null);
      setSwap(null);
      setLoadingPlayers(false);
    }

    loadMainListPlayers();

    return () => {
      active = false;
    };
  }, [selectedGameId]);

  function handleDraw() {
    if (!selectedGameId) {
      setError("Selecione um jogo para sortear.");
      return;
    }

    if (players.length < 8) {
      setError("Jogadores insuficientes para sortear");
      return;
    }

    const eligible = players.slice(0, 21);
    setTeams(drawTeams(eligible));
    setSwap(null);
    setError("");
  }

  function handleSelectForSwap(teamIndex, playerId) {
    if (!swap) {
      setSwap({ teamIndex, playerId });
      return;
    }

    if (swap.teamIndex === teamIndex && swap.playerId === playerId) {
      setSwap(null);
      return;
    }

    setTeams((prev) =>
      swapPlayers(prev, swap.teamIndex, swap.playerId, teamIndex, playerId),
    );
    setSwap(null);
  }

  async function handleConfirm() {
    if (!selectedGameId || !teams) return;

    const success = await saveGameTeams(selectedGameId, teams);
    if (!success) {
      setError("Nao foi possivel salvar os times.");
      return;
    }

    setError("");
    navigate("/teams", { state: { teams, gameId: selectedGameId } });
  }

  if (loading) {
    return (
      <div className="admin-draw">
        <div className="admin-draw__start">
          <p className="admin-draw__hint">
            Carregando jogadores para sorteio...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-draw">
      <div className="admin-tab__select-wrap">
        <select
          className="admin-tab__select"
          value={selectedGameId}
          onChange={(event) => setSelectedGameId(event.target.value)}
        >
          {games.map((game) => (
            <option key={game.id} value={game.id}>
              {game.date} - {game.time}
            </option>
          ))}
        </select>
      </div>

      {!teams ? (
        <div className="admin-draw__start">
          <p className="admin-draw__hint">
            Clique em sortear para montar os times com base na lista principal.
          </p>
          {error && <p className="admin-tab__restricted">{error}</p>}
          {loadingPlayers && (
            <p className="admin-draw__hint">Carregando inscritos do jogo...</p>
          )}
          <p className="admin-draw__hint">
            Jogadores na lista principal: {players.length}
          </p>
          <Button
            onClick={handleDraw}
            disabled={loadingPlayers || !selectedGameId}
          >
            Sortear times
          </Button>
        </div>
      ) : (
        <>
          {swap && (
            <p className="admin-draw__swap-hint">
              Selecione o jogador do outro time para trocar com{" "}
              <strong>
                {
                  teams[swap.teamIndex].players.find(
                    (p) => p.id === swap.playerId,
                  )?.name
                }
              </strong>
            </p>
          )}

          <div className="admin-draw__teams">
            {teams.map((team, teamIndex) => (
              <div key={team.name} className="admin-draw__team">
                <div className="admin-draw__team-header">
                  <span className="admin-draw__team-name">{team.name}</span>
                  <span className="admin-draw__team-level">
                    Nível: {team.totalLevel.toFixed(1)}
                  </span>
                </div>
                <ul className="admin-draw__player-list">
                  {team.players.map((player) => {
                    const isSelected =
                      swap?.teamIndex === teamIndex &&
                      swap?.playerId === player.id;
                    return (
                      <li
                        key={player.id}
                        className={`admin-draw__player ${isSelected ? "admin-draw__player--selected" : ""}`}
                        onClick={() =>
                          handleSelectForSwap(teamIndex, player.id)
                        }
                      >
                        <span className="admin-draw__player-name">
                          {player.name}
                          {player.nickname ? ` (${player.nickname})` : ""}
                        </span>
                        <span className="admin-draw__player-meta">
                          {(player.is_captain || player.is_setter) &&
                            renderRoleBadges(player)}
                          <span className="admin-draw__player-gender">
                            {player.gender === "F" ? "♀" : "♂"}
                          </span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>

          <div className="admin-draw__actions">
            {error && <p className="admin-tab__restricted">{error}</p>}
            <Button size="sm" variant="secondary" onClick={handleDraw}>
              Novo sorteio
            </Button>
            <Button size="sm" variant="success" onClick={handleConfirm}>
              Confirmar times
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

export default AdminDraw;
