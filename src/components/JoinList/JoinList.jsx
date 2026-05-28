// Componente de inscricao na lista de um jogo

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../app/AuthContext";
import {
  getAllPlayers,
  getGameRegistrations,
  isPlayerRegistered,
  joinGame,
  leaveGame,
  removeGuest,
} from "../../data/supabaseService";
import { PLAYER_TYPE } from "../../domain/constants";
import Button from "../Button/Button";
import "./JoinList.css";

const MAX_MAIN_LIST = 21;

function getRegistrationSlot(registration) {
  if (registration.slot) return registration.slot;
  if (registration.guest_name) return "guests";
  return "main";
}

function JoinList({ game, onUpdate }) {
  const { user } = useAuth();
  const [step, setStep] = useState("idle"); // idle | adding | confirm
  const [addMode, setAddMode] = useState(null); // 'member' | 'guest'
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMember, setSelectedMember] = useState(null);
  const [guestName, setGuestName] = useState("");
  const [error, setError] = useState("");
  const [players, setPlayers] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadData() {
      setLoading(true);
      const [allPlayers, allRegistrations] = await Promise.all([
        getAllPlayers(),
        getGameRegistrations(game.id),
      ]);

      if (!active) return;

      setPlayers(allPlayers || []);
      setRegistrations(allRegistrations || []);
      setLoading(false);
    }

    loadData();

    return () => {
      active = false;
    };
  }, [game.id]);

  async function refreshData() {
    const updatedRegistrations = await getGameRegistrations(game.id);
    setRegistrations(updatedRegistrations || []);
  }

  const registeredPlayerIds = useMemo(
    () =>
      new Set(
        registrations
          .map((registration) => registration.player_id)
          .filter(Boolean),
      ),
    [registrations],
  );

  const mainListCount = useMemo(
    () =>
      registrations.filter(
        (registration) => getRegistrationSlot(registration) === "main",
      ).length,
    [registrations],
  );

  const alreadyIn = Boolean(user?.id && registeredPlayerIds.has(user.id));
  const userId = user?.id;

  const myGuests = useMemo(
    () =>
      registrations.filter(
        (registration) =>
          registration.invited_by === userId &&
          !registration.player_id &&
          registration.guest_name,
      ),
    [registrations, userId],
  );

  const registeredMembers = players.filter(
    (player) =>
      player.id !== user.id &&
      player.type === PLAYER_TYPE.MEMBER &&
      !registeredPlayerIds.has(player.id),
  );

  const filteredMembers = searchTerm.trim()
    ? registeredMembers.filter(
        (m) =>
          m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          m.whatsapp.includes(searchTerm),
      )
    : [];

  async function handleJoinSelf() {
    if (alreadyIn) {
      setError("Jogador ja esta na lista.");
      return;
    }

    setActionLoading(true);

    const playerAlreadyRegistered = await isPlayerRegistered(game.id, user.id);
    if (playerAlreadyRegistered) {
      setActionLoading(false);
      setError("Jogador ja esta na lista.");
      return;
    }

    const slot = mainListCount < MAX_MAIN_LIST ? "main" : "waitlist";
    const success = await joinGame(game.id, user.id, slot);
    setActionLoading(false);

    if (!success) {
      setError("Nao foi possivel entrar na lista.");
      return;
    }

    setStep("adding");
    setError("");
    await refreshData();
    onUpdate();
  }

  async function handleLeave() {
    setActionLoading(true);
    const success = await leaveGame(game.id, user.id);
    setActionLoading(false);

    if (!success) {
      setError("Nao foi possivel sair da lista.");
      return;
    }

    setStep("idle");
    setAddMode(null);
    setSelectedMember(null);
    setGuestName("");
    setError("");
    await refreshData();
    onUpdate();
  }

  async function handleAddMember() {
    if (!selectedMember) {
      setError("Selecione um membro.");
      return;
    }

    if (registeredPlayerIds.has(selectedMember.id)) {
      setError("Jogador ja esta na lista.");
      return;
    }

    const slot = mainListCount < MAX_MAIN_LIST ? "main" : "waitlist";
    const success = await joinGame(game.id, selectedMember.id, slot);
    if (!success) {
      setError("Nao foi possivel adicionar o membro.");
      return;
    }

    setStep("idle");
    setAddMode(null);
    setSelectedMember(null);
    setSearchTerm("");
    setError("");
    await refreshData();
    onUpdate();
  }

  async function handleAddGuest() {
    if (!guestName.trim()) {
      setError("Informe o nome do convidado.");
      return;
    }

    const guestAlreadyIn = registrations.some(
      (registration) =>
        (registration.guest_name || "").trim().toLowerCase() ===
        guestName.trim().toLowerCase(),
    );

    if (guestAlreadyIn) {
      setError("Convidado ja esta na lista.");
      return;
    }

    const success = await joinGame(
      game.id,
      null,
      "guests",
      guestName.trim(),
      user.id,
    );

    if (!success) {
      setError("Nao foi possivel adicionar o convidado.");
      return;
    }

    setStep("idle");
    setAddMode(null);
    setGuestName("");
    setError("");
    await refreshData();
    onUpdate();
  }

  if (loading) {
    return (
      <div className="join-list">
        <p className="join-list__info">Carregando lista...</p>
      </div>
    );
  }

  if (alreadyIn && step === "idle") {
    return (
      <div className="join-list">
        <p className="join-list__info">Voce esta inscrito neste jogo.</p>

        {myGuests.length > 0 && (
          <div className="join-list__my-guests">
            <p className="join-list__info">Seus convidados:</p>
            <ul className="join-list__results">
              {myGuests.map((guest) => (
                <li
                  key={guest.id}
                  className="join-list__result join-list__result--guest"
                >
                  <span>{guest.guest_name}</span>
                  <button
                    className="join-list__remove-guest"
                    onClick={async () => {
                      setActionLoading(true);
                      const success = await removeGuest(guest.id);
                      setActionLoading(false);

                      if (!success) {
                        setError("Nao foi possivel remover o convidado.");
                        return;
                      }

                      setError("");
                      await refreshData();
                      onUpdate();
                    }}
                  >
                    Remover
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {error && <p className="join-list__error">{error}</p>}
        <div className="join-list__actions">
          <Button
            variant="secondary"
            onClick={() => setStep("adding")}
            disabled={actionLoading}
          >
            Adicionar pessoa
          </Button>
          <Button
            variant="danger"
            onClick={handleLeave}
            disabled={actionLoading}
          >
            Sair da lista
          </Button>
        </div>
      </div>
    );
  }

  if (!alreadyIn && step === "idle") {
    return (
      <div className="join-list">
        {error && <p className="join-list__error">{error}</p>}
        <Button onClick={handleJoinSelf}>Entrar na lista</Button>
      </div>
    );
  }

  if (step === "adding") {
    return (
      <div className="join-list">
        <p className="join-list__info">Deseja adicionar mais alguem?</p>
        {error && <p className="join-list__error">{error}</p>}

        {!addMode && (
          <div className="join-list__actions">
            <Button onClick={() => setAddMode("member")} variant="secondary">
              + Membro cadastrado
            </Button>
            <Button onClick={() => setAddMode("guest")} variant="secondary">
              + Convidado externo
            </Button>
            <Button onClick={() => setStep("idle")} variant="secondary">
              Nao, obrigado
            </Button>
          </div>
        )}

        {addMode === "member" && (
          <div className="join-list__search">
            <input
              placeholder="Buscar por nome ou WhatsApp"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setSelectedMember(null);
              }}
            />
            {filteredMembers.length > 0 && (
              <ul className="join-list__results">
                {filteredMembers.map((m) => (
                  <li
                    key={m.id}
                    className={`join-list__result ${selectedMember?.id === m.id ? "join-list__result--selected" : ""}`}
                    onClick={() => setSelectedMember(m)}
                  >
                    {m.name}
                    {m.nickname ? ` (${m.nickname})` : ""}
                  </li>
                ))}
              </ul>
            )}
            {searchTerm.trim() && filteredMembers.length === 0 && (
              <p className="join-list__empty">Nenhum membro encontrado.</p>
            )}
            <div className="join-list__actions">
              <Button onClick={handleAddMember}>Confirmar</Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setAddMode(null);
                  setSearchTerm("");
                  setSelectedMember(null);
                }}
              >
                Voltar
              </Button>
            </div>
          </div>
        )}

        {addMode === "guest" && (
          <div className="join-list__guest">
            <input
              placeholder="Nome do convidado"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
            />
            <div className="join-list__actions">
              <Button onClick={handleAddGuest}>Confirmar</Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setAddMode(null);
                  setGuestName("");
                }}
              >
                Voltar
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
}

export default JoinList;
