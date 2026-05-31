// Aba de jogadores do painel admin

import { useState } from "react";
import Button from "../../../components/Button/Button";
import { updatePlayerStatus } from "../../../data/supabaseService";
import { PLAYER_STATUS, PLAYER_TYPE } from "../../../domain/constants";
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

  async function togglePenalized(id) {
    const current = players.find((player) => player.id === id);
    if (!current) return;

    const nextStatus =
      current.status === PLAYER_STATUS.PENALIZED
        ? PLAYER_STATUS.ACTIVE
        : PLAYER_STATUS.PENALIZED;

    const success = await updatePlayerStatus(id, nextStatus);
    if (!success) {
      setError("Nao foi possivel atualizar o status do jogador.");
      return;
    }

    setError("");
    await onRefreshPlayers();
  }

  async function toggleBlocked(id) {
    const current = players.find((player) => player.id === id);
    if (!current) return;

    const nextStatus =
      current.status === PLAYER_STATUS.BLOCKED
        ? PLAYER_STATUS.ACTIVE
        : PLAYER_STATUS.BLOCKED;

    const success = await updatePlayerStatus(id, nextStatus);
    if (!success) {
      setError("Nao foi possivel atualizar o status do jogador.");
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
            </div>
            <div className="admin-tab__actions">
              <Button
                size="sm"
                variant="warning"
                className="admin-tab__btn"
                onClick={() => togglePenalized(p.id)}
              >
                {p.status === PLAYER_STATUS.PENALIZED
                  ? "Remover penalidade"
                  : "Penalizar"}
              </Button>
              <Button
                size="sm"
                variant="danger"
                className="admin-tab__btn"
                onClick={() => toggleBlocked(p.id)}
              >
                {p.status === PLAYER_STATUS.BLOCKED
                  ? "Desbloquear"
                  : "Bloquear"}
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default AdminPlayers;
