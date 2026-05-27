// Componente de inscricao na lista de um jogo

import { useState } from "react";
import { useAuth } from "../../app/AuthContext";
import { getRegisteredMembers } from "../../data/authStorage";
import { isPlayerInGame, joinList, leaveList } from "../../data/listStorage";
import { PLAYER_TYPE } from "../../domain/constants";
import Button from "../Button/Button";
import "./JoinList.css";

function JoinList({ game, onUpdate }) {
  const { user } = useAuth();
  const [step, setStep] = useState("idle"); // idle | adding | confirm
  const [addMode, setAddMode] = useState(null); // 'member' | 'guest'
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMember, setSelectedMember] = useState(null);
  const [guestName, setGuestName] = useState("");
  const [error, setError] = useState("");

  const alreadyIn = isPlayerInGame(game.id, user.id);

  const registeredMembers = getRegisteredMembers().filter(
    (m) => m.id !== user.id && !isPlayerInGame(game.id, m.id),
  );

  const filteredMembers = searchTerm.trim()
    ? registeredMembers.filter(
        (m) =>
          m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          m.whatsapp.includes(searchTerm),
      )
    : [];

  function handleJoinSelf() {
    const result = joinList(game.id, {
      id: user.id,
      name: user.name,
      nickname: user.nickname || null,
      type: PLAYER_TYPE.MEMBER,
      gender: user.gender,
    });
    if (!result.success) {
      setError(result.error);
      return;
    }
    setStep("adding");
    setError("");
    onUpdate();
  }

  function handleLeave() {
    leaveList(game.id, user.id);
    setStep("idle");
    setAddMode(null);
    setSelectedMember(null);
    setGuestName("");
    onUpdate();
  }

  function handleAddMember() {
    if (!selectedMember) {
      setError("Selecione um membro.");
      return;
    }
    const result = joinList(game.id, {
      id: selectedMember.id,
      name: selectedMember.name,
      nickname: selectedMember.nickname || null,
      type: PLAYER_TYPE.MEMBER,
      gender: selectedMember.gender,
    });
    if (!result.success) {
      setError(result.error);
      return;
    }
    setStep("idle");
    setAddMode(null);
    setSelectedMember(null);
    setSearchTerm("");
    setError("");
    onUpdate();
  }

  function handleAddGuest() {
    if (!guestName.trim()) {
      setError("Informe o nome do convidado.");
      return;
    }
    const result = joinList(
      game.id,
      {
        id: crypto.randomUUID(),
        name: guestName.trim(),
        nickname: null,
        type: PLAYER_TYPE.GUEST,
        gender: "M",
      },
      true,
      user.name,
    );
    if (!result.success) {
      setError(result.error);
      return;
    }
    setStep("idle");
    setAddMode(null);
    setGuestName("");
    setError("");
    onUpdate();
  }

  if (alreadyIn && step === "idle") {
    return (
      <div className="join-list">
        <p className="join-list__info">Voce esta inscrito neste jogo.</p>
        <div className="join-list__actions">
          <Button variant="secondary" onClick={() => setStep("adding")}>
            Adicionar pessoa
          </Button>
          <Button variant="danger" onClick={handleLeave}>
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
