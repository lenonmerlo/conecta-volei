// Aba de sorteio de times do painel admin

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../../../components/Button/Button";
import { getAllPlayers } from "../../../data/supabaseService";
import { PLAYER_STATUS, PLAYER_TYPE } from "../../../domain/constants";
import { drawTeams, swapPlayers } from "../../../domain/teamDraw";
import "./AdminDraw.css";
import "./AdminTabs.css";

function normalizePlayer(player) {
  return {
    id: player.id,
    name: player.name,
    nickname: player.nickname || null,
    gender: player.gender,
    skillLevel: Number(player.skill_level ?? player.skillLevel ?? 3),
    status: player.status,
    type: player.type,
  };
}

function AdminDraw() {
  const navigate = useNavigate();
  const [teams, setTeams] = useState(null);
  const [swap, setSwap] = useState(null); // { teamIndex, playerId }
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadPlayers() {
      setLoading(true);
      setError("");

      const data = await getAllPlayers();
      if (!active) return;

      const eligiblePlayers = (data || [])
        .map(normalizePlayer)
        .filter(
          (player) =>
            player.type === PLAYER_TYPE.MEMBER &&
            player.status === PLAYER_STATUS.ACTIVE,
        );

      setPlayers(eligiblePlayers);
      setLoading(false);
    }

    loadPlayers();

    return () => {
      active = false;
    };
  }, []);

  function handleDraw() {
    if (players.length === 0) {
      setError("Nenhum jogador elegivel para sorteio.");
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

  function handleConfirm() {
    navigate("/teams", { state: { teams } });
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
      {!teams ? (
        <div className="admin-draw__start">
          <p className="admin-draw__hint">
            Clique em sortear para montar os 3 times equilibrados.
          </p>
          {error && <p className="admin-tab__restricted">{error}</p>}
          <p className="admin-draw__hint">
            Jogadores elegiveis: {players.length}
          </p>
          <Button onClick={handleDraw}>Sortear times</Button>
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
                        <span className="admin-draw__player-gender">
                          {player.gender === "F" ? "♀" : "♂"}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>

          <div className="admin-draw__actions">
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
