// Aba de presencas do painel admin

import { useEffect, useMemo, useState } from "react";
import Button from "../../../components/Button/Button";
import { getGameRegistrations, getGames } from "../../../data/supabaseService";
import { GAME_DAYS } from "../../../domain/constants";

function normalizeGame(game) {
  return {
    id: game.id,
    day: game.day,
    date: game.date,
  };
}

function participantFromRegistration(registration) {
  if (registration.player) {
    return {
      id: `player-${registration.player.id}`,
      name: registration.player.name,
      nickname: registration.player.nickname || null,
    };
  }

  if (registration.guest_name) {
    return {
      id: `guest-${registration.id}`,
      name: registration.guest_name,
      nickname: null,
    };
  }

  return null;
}

function dayLabel(day) {
  return day === GAME_DAYS.SUNDAY ? "Domingo" : "Quarta";
}

function AdminPresence() {
  const [games, setGames] = useState([]);
  const [selectedGame, setSelectedGame] = useState("");
  const [registrations, setRegistrations] = useState([]);
  const [presences, setPresences] = useState({});
  const [loadingGames, setLoadingGames] = useState(true);
  const [loadingRegistrations, setLoadingRegistrations] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadGames() {
      setLoadingGames(true);
      setError("");

      const data = await getGames();
      if (!active) return;

      const normalizedGames = (data || []).map(normalizeGame);
      setGames(normalizedGames);
      setSelectedGame((prev) => prev || normalizedGames[0]?.id || "");
      setLoadingGames(false);
    }

    loadGames();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function loadRegistrations() {
      if (!selectedGame) {
        setRegistrations([]);
        return;
      }

      setLoadingRegistrations(true);
      setError("");

      const data = await getGameRegistrations(selectedGame);
      if (!active) return;

      setRegistrations(data || []);
      setPresences({});
      setLoadingRegistrations(false);
    }

    loadRegistrations();

    return () => {
      active = false;
    };
  }, [selectedGame]);

  const participants = useMemo(
    () =>
      registrations
        .map(participantFromRegistration)
        .filter(Boolean)
        .filter(
          (participant, index, arr) =>
            arr.findIndex((item) => item.id === participant.id) === index,
        ),
    [registrations],
  );

  function togglePresence(playerId) {
    setPresences((prev) => ({
      ...prev,
      [playerId]: !prev[playerId],
    }));
  }

  if (loadingGames) {
    return (
      <div className="admin-tab">
        <p className="admin-tab__restricted">Carregando jogos...</p>
      </div>
    );
  }

  if (games.length === 0) {
    return (
      <div className="admin-tab">
        <p className="admin-tab__restricted">Nenhum jogo encontrado.</p>
      </div>
    );
  }

  return (
    <div className="admin-tab">
      {error && <p className="admin-tab__restricted">{error}</p>}
      <div className="admin-tab__select-wrap">
        <select
          className="admin-tab__select"
          value={selectedGame}
          onChange={(e) => setSelectedGame(e.target.value)}
        >
          {games.map((g) => (
            <option key={g.id} value={g.id}>
              {dayLabel(g.day)} - {g.date}
            </option>
          ))}
        </select>
      </div>

      {loadingRegistrations && (
        <p className="admin-tab__restricted">Carregando inscritos...</p>
      )}

      {!loadingRegistrations && participants.length === 0 && (
        <p className="admin-tab__restricted">Nenhum inscrito para este jogo.</p>
      )}

      <ul className="admin-tab__list">
        {participants.map((p) => {
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
