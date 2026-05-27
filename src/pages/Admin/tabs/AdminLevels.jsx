// Aba de níveis técnicos — exclusivo para super admin

import { useState } from "react";
import { mockPlayers } from "../../../data/mockGames";
import { SKILL_LEVELS } from "../../../domain/constants";

function AdminLevels() {
  const [players, setPlayers] = useState(mockPlayers);

  function updateLevel(id, level) {
    setPlayers((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, skillLevel: parseFloat(level) } : p,
      ),
    );
  }

  return (
    <div className="admin-tab">
      <ul className="admin-tab__list">
        {players.map((p) => (
          <li key={p.id} className="admin-tab__item">
            <div className="admin-tab__info">
              <span className="admin-tab__name">
                {p.name}
                {p.nickname ? ` (${p.nickname})` : ""}
              </span>
            </div>
            <div className="admin-tab__actions">
              <select
                className="admin-tab__select"
                value={p.skillLevel}
                onChange={(e) => updateLevel(p.id, e.target.value)}
              >
                {SKILL_LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default AdminLevels;
