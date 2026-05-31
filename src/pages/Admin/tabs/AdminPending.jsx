import { useMemo, useState } from "react";
import Button from "../../../components/Button/Button";
import {
  deletePlayer,
  updatePlayerStatus,
} from "../../../data/supabaseService";
import "./AdminTabs.css";

function formatDate(value) {
  if (!value) return "Data indisponivel";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Data indisponivel";

  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function AdminPending({ players, loadingPlayers, onRefreshPlayers }) {
  const [error, setError] = useState("");

  const pendingPlayers = useMemo(
    () => (players || []).filter((player) => player.status === "pending"),
    [players],
  );

  async function approvePlayer(playerId) {
    const success = await updatePlayerStatus(playerId, "active");
    if (!success) {
      setError("Nao foi possivel aprovar o cadastro.");
      return;
    }

    setError("");
    await onRefreshPlayers();
  }

  async function rejectPlayer(playerId) {
    const success = await deletePlayer(playerId);

    if (!success) {
      setError("Nao foi possivel recusar o cadastro.");
      return;
    }

    setError("");
    await onRefreshPlayers();
  }

  if (loadingPlayers) {
    return (
      <div className="admin-tab">
        <p className="admin-tab__restricted">Carregando pendentes...</p>
      </div>
    );
  }

  return (
    <div className="admin-tab">
      {error && <p className="admin-tab__restricted">{error}</p>}

      {pendingPlayers.length === 0 && (
        <p className="admin-tab__restricted">Nenhum cadastro pendente.</p>
      )}

      <ul className="admin-tab__list">
        {pendingPlayers.map((player) => (
          <li key={player.id} className="admin-tab__item">
            <div className="admin-tab__info admin-tab__info--pending">
              <span className="admin-tab__name">
                {player.name}
                {player.nickname ? ` (${player.nickname})` : ""}
              </span>
              <span className="admin-tab__status admin-tab__status--pending">
                Pendente
              </span>
            </div>

            <div className="admin-tab__pending-meta">
              <span>WhatsApp: {player.whatsapp}</span>
              <span>Genero: {player.gender || "Nao informado"}</span>
              <span>Criado em: {formatDate(player.created_at)}</span>
            </div>

            <div className="admin-tab__actions">
              <Button
                size="sm"
                variant="success"
                className="admin-tab__btn"
                onClick={() => approvePlayer(player.id)}
              >
                Aprovar
              </Button>
              <Button
                size="sm"
                variant="danger"
                className="admin-tab__btn"
                onClick={() => rejectPlayer(player.id)}
              >
                Recusar
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default AdminPending;
