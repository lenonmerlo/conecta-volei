// Aba de jogadores do painel admin

import { useState } from "react";
import Button from "../../../components/Button/Button";
import {
  addWarning,
  removeWarning,
  resetWarnings,
} from "../../../data/supabaseService";
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
  const [error, setError] = useState("");

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
      <ul className="admin-tab__list">
        {players.map((p) => (
          <li key={p.id} className="admin-tab__item">
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
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default AdminPlayers;
