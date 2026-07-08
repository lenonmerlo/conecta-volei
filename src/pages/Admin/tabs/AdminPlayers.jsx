// Aba de jogadores do painel admin

import { useMemo, useState } from "react";
import { useAuth } from "../../../app/AuthContext";
import Button from "../../../components/Button/Button";
import {
  addWarning,
  removeWarning,
  resetWarnings,
  updatePlayerInjuryLeave,
  updatePlayerStatus,
} from "../../../data/supabaseService";
import { isSuperAdmin } from "../../../domain/admins";
import { PLAYER_TYPE } from "../../../domain/constants";
import "./AdminTabs.css";

function statusLabel(status) {
  const map = {
    active: "Ativo",
    inactive: "Inativo",
    penalized: "Penalizado",
    blocked: "Bloqueado",
  };
  return map[status] || status;
}

function AdminPlayers({ players, loadingPlayers, onRefreshPlayers }) {
  const { user } = useAuth();
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const userCanUnblock = isSuperAdmin(user);

  const filteredPlayers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return players;

    return players.filter((player) =>
      String(player.name || "")
        .toLowerCase()
        .includes(term),
    );
  }, [players, searchTerm]);

  async function applyWarningAction(playerId, action) {
    let updatedPlayer = null;

    if (action === "add") {
      updatedPlayer = await addWarning(playerId);
    }

    if (action === "remove") {
      updatedPlayer = await removeWarning(playerId);
    }

    if (action === "reset") {
      updatedPlayer = await resetWarnings(playerId);
    }

    if (!updatedPlayer) {
      setError("Nao foi possivel atualizar as advertencias do jogador.");
      return;
    }

    setError("");
    await onRefreshPlayers();
  }

  async function handleToggleInjuryLeave(playerId, checked) {
    const result = await updatePlayerInjuryLeave(playerId, checked);

    if (!result.success) {
      setError(
        result.error || "Nao foi possivel atualizar afastamento por lesao.",
      );
      return;
    }

    setError("");
    await onRefreshPlayers();
  }

  async function handleUnblockPlayer(playerId) {
    const result = await updatePlayerStatus(playerId, "active", user);

    if (!result.success) {
      setError(result.error || "Nao foi possivel desbloquear o jogador.");
      return;
    }

    setError("");
    await onRefreshPlayers();
  }

  if (loadingPlayers) {
    return (
      <div className="admin-tab">
        <p className="admin-tab__restricted">Carregando jogadores...</p>
      </div>
    );
  }

  return (
    <div className="admin-tab">
      {error && <p className="admin-tab__restricted">{error}</p>}

      <div className="admin-tab__search-wrap">
        <input
          type="search"
          className="admin-tab__search-input"
          placeholder="Buscar atleta por nome"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          aria-label="Buscar atleta por nome"
        />
      </div>

      {filteredPlayers.length === 0 && (
        <p className="admin-tab__restricted">Nenhum atleta encontrado.</p>
      )}

      <ul className="admin-tab__list">
        {filteredPlayers.map((p) => (
          <li
            key={p.id}
            className={`admin-tab__item ${p.on_injury_leave ? "admin-tab__item--injury" : ""}`}
          >
            <div className="admin-tab__info">
              <span className="admin-tab__name">
                {p.name}
                {p.nickname ? ` (${p.nickname})` : ""}
              </span>
              <span
                className={`admin-tab__status admin-tab__status--${p.status}`}
              >
                {statusLabel(p.status)}
              </span>
              <span className="admin-tab__type">
                {p.type === PLAYER_TYPE.MEMBER ? "Membro" : "Convidado"}
              </span>
              <span className="admin-tab__warning-count">
                Advertencias: {Math.max(0, Number(p.warnings) || 0)}
              </span>
              {p.on_injury_leave && (
                <span className="admin-tab__injury-tag">
                  Afastado por lesao
                </span>
              )}
            </div>
            <div className="admin-tab__injury-row">
              <label
                className="admin-tab__check-label"
                htmlFor={`injury-leave-${p.id}`}
              >
                <input
                  id={`injury-leave-${p.id}`}
                  type="checkbox"
                  checked={Boolean(p.on_injury_leave)}
                  onChange={(event) =>
                    handleToggleInjuryLeave(p.id, event.target.checked)
                  }
                />
                Afastado por lesao
              </label>
            </div>
            <div className="admin-tab__actions">
              <Button
                size="sm"
                variant="warning"
                className="admin-tab__btn"
                onClick={() => applyWarningAction(p.id, "add")}
              >
                +Advertencia
              </Button>
              <Button
                size="sm"
                variant="success"
                className="admin-tab__btn"
                onClick={() => applyWarningAction(p.id, "remove")}
              >
                -Advertencia
              </Button>
              <Button
                size="sm"
                variant="danger"
                className="admin-tab__btn"
                onClick={() => applyWarningAction(p.id, "reset")}
              >
                Zerar
              </Button>
              {userCanUnblock && p.status === "blocked" && (
                <Button
                  size="sm"
                  variant="secondary"
                  className="admin-tab__btn"
                  onClick={() => handleUnblockPlayer(p.id)}
                >
                  Desbloquear
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default AdminPlayers;
