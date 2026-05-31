// Aba de níveis técnicos — exclusivo para super admin

import { useEffect, useState } from "react";
import {
  getAllPlayers,
  updatePlayerLevel,
  updatePlayerPosition,
  updatePlayerSpecialBadges,
} from "../../../data/supabaseService";
import { SKILL_LEVELS } from "../../../domain/constants";
import "./AdminTabs.css";

const POSITION_OPTIONS = ["all-around", "attacker", "setter", "libero"];

function AdminLevels() {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  function normalizeSearch(value) {
    return (value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
  }

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

  async function updateSpecialBadges(id, nextValues) {
    const success = await updatePlayerSpecialBadges(id, nextValues);

    if (!success) {
      setError("Nao foi possivel atualizar os badges especiais.");
      return;
    }

    setError("");
    setPlayers((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              badge_monster_block: Boolean(nextValues.badgeMonsterBlock),
              badge_super_spike: Boolean(nextValues.badgeSuperSpike),
              badge_guardian: Boolean(nextValues.badgeGuardian),
            }
          : p,
      ),
    );
  }

  function handleSpecialBadgeChange(player, field, checked) {
    updateSpecialBadges(player.id, {
      badgeMonsterBlock:
        field === "badgeMonsterBlock"
          ? checked
          : Boolean(player.badge_monster_block),
      badgeSuperSpike:
        field === "badgeSuperSpike"
          ? checked
          : Boolean(player.badge_super_spike),
      badgeGuardian:
        field === "badgeGuardian" ? checked : Boolean(player.badge_guardian),
    });
  }

  if (loading) {
    return (
      <div className="admin-tab">
        <p className="admin-tab__restricted">Carregando niveis...</p>
      </div>
    );
  }

  const searchValue = normalizeSearch(search);
  const filteredPlayers = players.filter((player) => {
    if (!searchValue) return true;

    const name = normalizeSearch(player.name);
    const nickname = normalizeSearch(player.nickname || "");
    return name.includes(searchValue) || nickname.includes(searchValue);
  });

  return (
    <div className="admin-tab">
      {error && <p className="admin-tab__restricted">{error}</p>}

      <div className="admin-tab__search-wrap">
        <input
          type="search"
          className="admin-tab__search-input"
          placeholder="Buscar jogador por nome"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Buscar jogador por nome"
        />
      </div>

      {filteredPlayers.length === 0 && (
        <p className="admin-tab__restricted">Nenhum jogador encontrado.</p>
      )}

      <ul className="admin-tab__list">
        {filteredPlayers.map((p) => (
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

            <div className="admin-tab__level-grid">
              <div className="admin-tab__level-section">
                <span className="admin-tab__section-label">Funcoes</span>
                <div className="admin-tab__check-grid">
                  <label
                    className={`admin-tab__check-label${
                      p.is_captain ? " admin-tab__check-label--active" : ""
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(p.is_captain)}
                      onChange={(e) => handleCaptainChange(p, e.target.checked)}
                    />
                    Capitao
                  </label>

                  <label
                    className={`admin-tab__check-label${
                      p.is_setter ? " admin-tab__check-label--active" : ""
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(p.is_setter)}
                      onChange={(e) => handleSetterChange(p, e.target.checked)}
                    />
                    Levantador
                  </label>
                </div>
              </div>

              <div className="admin-tab__level-section">
                <span className="admin-tab__section-label">Posicao</span>
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

              <div className="admin-tab__level-section admin-tab__level-section--special">
                <span className="admin-tab__section-label">
                  Badges Especiais
                </span>
                <div className="admin-tab__check-grid admin-tab__check-grid--special">
                  <label
                    className={`admin-tab__check-label${
                      p.badge_monster_block
                        ? " admin-tab__check-label--active"
                        : ""
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(p.badge_monster_block)}
                      onChange={(e) =>
                        handleSpecialBadgeChange(
                          p,
                          "badgeMonsterBlock",
                          e.target.checked,
                        )
                      }
                    />
                    Monster Block
                  </label>

                  <label
                    className={`admin-tab__check-label${
                      p.badge_super_spike
                        ? " admin-tab__check-label--active"
                        : ""
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(p.badge_super_spike)}
                      onChange={(e) =>
                        handleSpecialBadgeChange(
                          p,
                          "badgeSuperSpike",
                          e.target.checked,
                        )
                      }
                    />
                    Super Spike
                  </label>

                  <label
                    className={`admin-tab__check-label${
                      p.badge_guardian ? " admin-tab__check-label--active" : ""
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(p.badge_guardian)}
                      onChange={(e) =>
                        handleSpecialBadgeChange(
                          p,
                          "badgeGuardian",
                          e.target.checked,
                        )
                      }
                    />
                    Guardian
                  </label>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default AdminLevels;
