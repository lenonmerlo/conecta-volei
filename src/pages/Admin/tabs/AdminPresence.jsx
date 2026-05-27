// Aba de presenças do painel admin

import { useState } from "react";
import Button from "../../../components/Button/Button";
import { mockGames, mockPlayers } from "../../../data/mockGames";

function getPlayerById(id) {
  return mockPlayers.find((p) => p.id === id);
}

function AdminPresence() {
  const [selectedGame, setSelectedGame] = useState(mockGames[0].id);
  const [presences, setPresences] = useState({});

  const game = mockGames.find((g) => g.id === selectedGame);
  const players = game.players.map(getPlayerById).filter(Boolean);

  function togglePresence(playerId) {
    setPresences((prev) => ({
      ...prev,
      [playerId]: !prev[playerId],
    }));
  }

  return (
    <div className="admin-tab">
      <div className="admin-tab__select-wrap">
        <select
          className="admin-tab__select"
          value={selectedGame}
          onChange={(e) => setSelectedGame(e.target.value)}
        >
          {mockGames.map((g) => (
            <option key={g.id} value={g.id}>
              {g.day === "wednesday" ? "Quarta" : "Domingo"} — {g.date}
            </option>
          ))}
        </select>
      </div>

      <ul className="admin-tab__list">
        {players.map((p) => {
          const present = presences[p.id] ?? false;
          return (
            <li key={p.id} className="admin-tab__item">
              <div className="admin-tab__info">
                <span className="admin-tab__name">
                  {p.name}
                  {p.nickname ? ` (${p.nickname})` : ""}
                </span>
                <span
                  className={`admin-tab__status admin-tab__status--${present ? "active" : "inactive"}`}
                >
                  {present ? "Presente" : "Ausente"}
                </span>
              </div>
              <div className="admin-tab__actions">
                <Button
                  size="sm"
                  variant={present ? "warning" : "success"}
                  className="admin-tab__btn"
                  onClick={() => togglePresence(p.id)}
                >
                  {present ? "Marcar falta" : "Marcar presença"}
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default AdminPresence;
