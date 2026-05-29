// Aba de níveis técnicos — exclusivo para super admin

import { useEffect, useState } from "react";
import {
  getAllPlayers,
  updatePlayerLevel,
  updatePlayerPosition,
} from "../../../data/supabaseService";
import { SKILL_LEVELS } from "../../../domain/constants";
import "./AdminTabs.css";

const POSITION_OPTIONS = ["all-around", "attacker", "setter", "libero"];

function AdminLevels() {
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
      setPlayers(data || []);
      setLoading(false);
    }

    loadPlayers();

    return () => {
      active = false;
    };
  }, []);

  async function updateLevel(id, level) {
    const parsedLevel = parseFloat(level);
    const success = await updatePlayerLevel(id, parsedLevel);

    if (!success) {
      setError("Nao foi possivel atualizar o nivel tecnico.");
      return;
    }

    setError("");
    setPlayers((prev) =>
      prev.map((p) => (p.id === id ? { ...p, skill_level: parsedLevel } : p)),
    );
  }

  async function updatePosition(id, nextValues) {
    const success = await updatePlayerPosition(id, nextValues);

    if (!success) {
      setError("Nao foi possivel atualizar as posicoes do jogador.");
      return;
    }

    setError("");
    setPlayers((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...nextValues } : p)),
    );
  }

  function handleCaptainChange(player, checked) {
    updatePosition(player.id, {
      is_captain: checked,
      is_setter: Boolean(player.is_setter),
      position: player.position || "all-around",
    });
  }

  function handleSetterChange(player, checked) {
    updatePosition(player.id, {
      is_captain: Boolean(player.is_captain),
      is_setter: checked,
      position: player.position || "all-around",
    });
  }

  function handlePositionChange(player, position) {
    updatePosition(player.id, {
      is_captain: Boolean(player.is_captain),
      is_setter: Boolean(player.is_setter),
      position,
    });
  }

  if (loading) {
    return (
      <div className="admin-tab">
        <p className="admin-tab__restricted">Carregando niveis...</p>
      </div>
    );
  }

  return (
    <div className="admin-tab">
      {error && <p className="admin-tab__restricted">{error}</p>}
      <ul className="admin-tab__list">
        {players.map((p) => (
          <li key={p.id} className="admin-tab__item admin-tab__item--level">
            <div className="admin-tab__info admin-tab__info--level">
              <span className="admin-tab__name">
                {p.name}
                {p.nickname ? ` (${p.nickname})` : ""}
              </span>
              <select
                className="admin-tab__select admin-tab__select--level"
                value={p.skill_level ?? p.skillLevel ?? SKILL_LEVELS[0]}
                onChange={(e) => updateLevel(p.id, e.target.value)}
              >
                {SKILL_LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
            </div>

            <div className="admin-tab__position-row">
              <label className="admin-tab__check-label">
                <input
                  type="checkbox"
                  checked={Boolean(p.is_captain)}
                  onChange={(e) => handleCaptainChange(p, e.target.checked)}
                />
                Capitao
              </label>

              <label className="admin-tab__check-label">
                <input
                  type="checkbox"
                  checked={Boolean(p.is_setter)}
                  onChange={(e) => handleSetterChange(p, e.target.checked)}
                />
                Levantador
              </label>

              <select
                className="admin-tab__select admin-tab__select--position"
                value={p.position || "all-around"}
                onChange={(e) => handlePositionChange(p, e.target.value)}
              >
                {POSITION_OPTIONS.map((position) => (
                  <option key={position} value={position}>
                    {position}
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
