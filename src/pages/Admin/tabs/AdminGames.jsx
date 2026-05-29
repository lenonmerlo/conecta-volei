// Aba de gestao de jogos do painel admin

import { useEffect, useState } from "react";
import Button from "../../../components/Button/Button";
import {
  cancelGame,
  createGame,
  getGames,
  updateGame,
} from "../../../data/supabaseService";
import "./AdminTabs.css";

const EMPTY_NEW_GAME = {
  date: "",
  location: "",
  time: "",
};

function getDayValueFromDate(dateValue) {
  if (!dateValue) return null;

  const date = new Date(`${dateValue}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;

  const weekDay = date.getUTCDay();
  if (weekDay === 3) return "wednesday";
  if (weekDay === 0) return "sunday";
  return "other";
}

function normalizeGame(game) {
  return {
    id: game.id,
    day: game.day,
    date: game.date,
    location: game.location,
    time: game.time,
    status: game.status || "active",
    notes: game.notes || "",
  };
}

function getDayLabel(dateStr) {
  const days = [
    "Domingo",
    "Segunda-feira",
    "Terça-feira",
    "Quarta-feira",
    "Quinta-feira",
    "Sexta-feira",
    "Sábado",
  ];

  const date = new Date(`${dateStr}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return "Data inválida";
  return days[date.getUTCDay()];
}

function getStatusLabel(status) {
  if (status === "cancelled") return "Cancelado";
  return "Ativo";
}

function AdminGames() {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newGame, setNewGame] = useState(EMPTY_NEW_GAME);
  const [editingGameId, setEditingGameId] = useState(null);
  const [editingData, setEditingData] = useState({
    date: "",
    location: "",
    time: "",
    notes: "",
  });
  const [gameToCancel, setGameToCancel] = useState(null);

  useEffect(() => {
    loadGames();
  }, []);

  async function loadGames() {
    setLoading(true);
    setError("");

    const data = await getGames();
    const normalized = (data || [])
      .map(normalizeGame)
      .filter(
        (game) =>
          !(
            game.status === "cancelled" &&
            game.day !== "wednesday" &&
            game.day !== "sunday"
          ),
      );
    setGames(normalized);
    setLoading(false);
  }

  function startEditing(game) {
    setEditingGameId(game.id);
    setEditingData({
      date: game.date || "",
      location: game.location || "",
      time: game.time || "",
      notes: game.notes || "",
    });
  }

  function cancelEditing() {
    setEditingGameId(null);
    setEditingData({ date: "", location: "", time: "", notes: "" });
  }

  async function handleSaveEdit(gameId, gameStatus) {
    const success = await updateGame(gameId, {
      date: editingData.date,
      location: editingData.location,
      time: editingData.time,
      notes: editingData.notes || null,
      status: gameStatus,
    });

    if (!success) {
      setError("Nao foi possivel atualizar o jogo.");
      return;
    }

    setError("");
    cancelEditing();
    await loadGames();
  }

  async function handleCancelGame(gameId) {
    const success = await cancelGame(gameId);
    if (!success) {
      setError("Nao foi possivel cancelar o jogo.");
      return;
    }

    setError("");
    setGameToCancel(null);
    await loadGames();
  }

  async function handleReactivateGame(gameId) {
    const success = await updateGame(gameId, { status: "active" });
    if (!success) {
      setError("Nao foi possivel reativar o jogo.");
      return;
    }

    setError("");
    await loadGames();
  }

  async function handleCreateGame() {
    if (!newGame.date || !newGame.location || !newGame.time) {
      setError("Preencha data, local e horario para criar o jogo.");
      return;
    }

    const derivedDay = getDayValueFromDate(newGame.date);
    if (!derivedDay) {
      setError("Data invalida para calcular o dia do jogo.");
      return;
    }

    const result = await createGame({
      day: derivedDay,
      date: newGame.date,
      location: newGame.location.trim(),
      time: newGame.time,
      status: "active",
      notes: null,
    });

    if (!result.success) {
      setError(result.error || "Nao foi possivel criar o jogo.");
      return;
    }

    setError("");
    setNewGame(EMPTY_NEW_GAME);
    await loadGames();
  }

  return (
    <div className="admin-tab admin-games">
      {error && <p className="admin-tab__restricted">{error}</p>}

      <div className="admin-games__create">
        <h3 className="admin-games__section-title">Novo jogo</h3>
        <div className="admin-games__form-grid">
          <input
            className="admin-games__input"
            type="date"
            value={newGame.date}
            onChange={(event) =>
              setNewGame((prev) => ({ ...prev, date: event.target.value }))
            }
          />
          <input
            className="admin-games__input"
            type="time"
            value={newGame.time}
            onChange={(event) =>
              setNewGame((prev) => ({ ...prev, time: event.target.value }))
            }
          />
          <input
            className="admin-games__input admin-games__input--full"
            type="text"
            placeholder="Local"
            value={newGame.location}
            onChange={(event) =>
              setNewGame((prev) => ({ ...prev, location: event.target.value }))
            }
          />
        </div>
        <Button size="sm" variant="success" onClick={handleCreateGame}>
          Criar jogo
        </Button>
      </div>

      {loading ? (
        <p className="admin-tab__restricted">Carregando jogos...</p>
      ) : (
        <ul className="admin-tab__list">
          {games.map((game) => {
            const isEditing = editingGameId === game.id;

            return (
              <li key={game.id} className="admin-tab__item">
                <div className="admin-tab__info">
                  <span className="admin-tab__name">
                    {getDayLabel(game.date)} - {game.date} - {game.time}
                  </span>
                  <span
                    className={`admin-tab__status ${
                      game.status === "cancelled"
                        ? "admin-tab__status--blocked"
                        : "admin-tab__status--active"
                    }`}
                  >
                    {getStatusLabel(game.status)}
                  </span>
                </div>

                {!isEditing ? (
                  <>
                    <p className="admin-games__meta">Local: {game.location}</p>
                    {game.notes && (
                      <p className="admin-games__meta">Obs: {game.notes}</p>
                    )}
                    <div className="admin-tab__actions">
                      <Button
                        size="sm"
                        variant="secondary"
                        className="admin-tab__btn"
                        onClick={() => startEditing(game)}
                      >
                        Editar
                      </Button>

                      {game.status === "cancelled" ? (
                        <Button
                          size="sm"
                          variant="success"
                          className="admin-tab__btn"
                          onClick={() => handleReactivateGame(game.id)}
                        >
                          Reativar
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="danger"
                          className="admin-tab__btn"
                          onClick={() => setGameToCancel(game)}
                        >
                          Cancelar
                        </Button>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="admin-games__edit-wrap">
                    <div className="admin-games__form-grid">
                      <input
                        className="admin-games__input"
                        type="date"
                        value={editingData.date}
                        onChange={(event) =>
                          setEditingData((prev) => ({
                            ...prev,
                            date: event.target.value,
                          }))
                        }
                      />
                      <input
                        className="admin-games__input"
                        type="time"
                        value={editingData.time}
                        onChange={(event) =>
                          setEditingData((prev) => ({
                            ...prev,
                            time: event.target.value,
                          }))
                        }
                      />
                      <input
                        className="admin-games__input admin-games__input--full"
                        type="text"
                        placeholder="Local"
                        value={editingData.location}
                        onChange={(event) =>
                          setEditingData((prev) => ({
                            ...prev,
                            location: event.target.value,
                          }))
                        }
                      />
                      <textarea
                        className="admin-games__input admin-games__input--full admin-games__textarea"
                        placeholder="Observacao"
                        rows={2}
                        value={editingData.notes}
                        onChange={(event) =>
                          setEditingData((prev) => ({
                            ...prev,
                            notes: event.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="admin-tab__actions">
                      <Button
                        size="sm"
                        variant="success"
                        className="admin-tab__btn"
                        onClick={() => handleSaveEdit(game.id, game.status)}
                      >
                        Salvar
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="admin-tab__btn"
                        onClick={cancelEditing}
                      >
                        Fechar
                      </Button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {gameToCancel && (
        <div className="admin-games__modal-backdrop">
          <div className="admin-games__modal" role="dialog" aria-modal="true">
            <p className="admin-games__modal-title">Cancelar jogo</p>
            <p className="admin-games__modal-text">
              Deseja marcar este jogo como cancelado?
            </p>
            <p className="admin-games__modal-meta">
              {getDayLabel(gameToCancel.date)} - {gameToCancel.date} -{" "}
              {gameToCancel.time}
            </p>
            <div className="admin-games__modal-actions">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setGameToCancel(null)}
              >
                Voltar
              </Button>
              <Button
                size="sm"
                variant="danger"
                onClick={() => handleCancelGame(gameToCancel.id)}
              >
                Confirmar cancelamento
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminGames;
