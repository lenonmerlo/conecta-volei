// Aba de presencas do painel admin

import { useEffect, useMemo, useState } from "react";
import Button from "../../../components/Button/Button";
import {
  getGamePresences,
  getGameRegistrations,
  getGames,
  migrateGuestsToWaitlist,
  penalizePlayer,
  upsertPresence,
} from "../../../data/supabaseService";
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
      id: registration.player.id,
      name: registration.player.name,
      nickname: registration.player.nickname || null,
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
  const [migratingGuests, setMigratingGuests] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const isSaturday = new Date().getDay() === 6;
  const selectedGameData = games.find((game) => game.id === selectedGame);
  const canMigrateGuests =
    isSaturday && selectedGameData?.day === GAME_DAYS.SUNDAY;

  async function loadRegistrationsForGame(gameId) {
    if (!gameId) {
      setRegistrations([]);
      setPresences({});
      return;
    }

    setLoadingRegistrations(true);
    setError("");
    setNotice("");

    const [registrationsData, presencesData] = await Promise.all([
      getGameRegistrations(gameId),
      getGamePresences(gameId),
    ]);

    const initialPresences = (presencesData || []).reduce((acc, presence) => {
      // Default is present; only explicit false should mark the player absent.
      acc[presence.player_id] = presence.present === false ? false : true;
      return acc;
    }, {});

    setRegistrations(registrationsData || []);
    setPresences(initialPresences);
    setLoadingRegistrations(false);
  }

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
      if (!active) return;
      await loadRegistrationsForGame(selectedGame);
    }

    loadRegistrations();

    return () => {
      active = false;
    };
  }, [selectedGame]);

  async function handleMigrateGuests() {
    if (!selectedGame || !canMigrateGuests) return;

    setMigratingGuests(true);
    const success = await migrateGuestsToWaitlist(selectedGame);
    setMigratingGuests(false);

    if (!success) {
      setError("Nao foi possivel migrar convidados para lista de espera.");
      return;
    }

    await loadRegistrationsForGame(selectedGame);
    setNotice("Convidados migrados para lista de espera.");
  }

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

  async function togglePresence(playerId) {
    const nextPresent = !(presences[playerId] ?? true);

    const saved = await upsertPresence(selectedGame, playerId, nextPresent);
    if (!saved) {
      setError("Nao foi possivel salvar a presenca.");
      return;
    }

    setPresences((prev) => ({
      ...prev,
      [playerId]: nextPresent,
    }));
    setError("");

    if (!nextPresent) {
      const penalized = await penalizePlayer(playerId);
      if (!penalized) {
        setError("Presenca salva, mas nao foi possivel penalizar o jogador.");
        return;
      }

      setNotice("Jogador penalizado.");
      return;
    }

    setNotice("");
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
      {notice && <p className="admin-tab__restricted">{notice}</p>}
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

      {canMigrateGuests && (
        <div className="admin-tab__actions">
          <Button
            size="sm"
            variant="secondary"
            className="admin-tab__btn"
            onClick={handleMigrateGuests}
            disabled={migratingGuests}
          >
            Migrar convidados para lista de espera
          </Button>
        </div>
      )}

      {loadingRegistrations && (
        <p className="admin-tab__restricted">Carregando inscritos...</p>
      )}

      {!loadingRegistrations && participants.length === 0 && (
        <p className="admin-tab__restricted">Nenhum inscrito para este jogo.</p>
      )}

      <ul className="admin-tab__list">
        {participants.map((p) => {
          const present = presences[p.id] ?? true;
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
