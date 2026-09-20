// Página de votação do melhor do jogo (pós-jogo de domingo)

import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../app/AuthContext";
import Button from "../../components/Button/Button";
import { VOTE_CATEGORIES } from "../../domain/constants";
import { isVotingOpen } from "../../domain/gameRules";
import {
  getGameById,
  getGameRegistrations,
  getMyVotes,
  getVotingResults,
  submitVote,
} from "../../services/supabaseService.js";
import "./Voting.css";

function getCandidateName(registration) {
  if (registration.player) {
    const { name, nickname } = registration.player;
    return nickname ? `${name} (${nickname})` : name;
  }

  return registration.guest?.name || registration.guest_name || "Convidado";
}

function getCandidateId(registration) {
  if (registration.player_id) return registration.player_id;

  if (registration.guest_id) {
    return `guest-${registration.guest?.id || registration.guest_id}`;
  }

  return null;
}

function buildCandidates(registrations, currentUserId) {
  return registrations
    .filter((registration) => (registration.slot || "main") === "main")
    .map((registration) => ({
      id: getCandidateId(registration),
      name: getCandidateName(registration),
      gender:
        registration.player?.gender ??
        registration.guest?.gender ??
        null,
    }))
    .filter((candidate) => candidate.id && candidate.id !== currentUserId);
}

function getWinnerText(result) {
  if (!result) return "Sem votos ainda.";

  const winners = result.winners?.length ? result.winners : [result];
  const names = winners.map((winner) => winner.name).join(", ");
  const voteCount = `${result.count} ${
    result.count === 1 ? "voto" : "votos"
  }`;

  if (winners.length > 1) {
    return `🏆 Empate: ${names} (${voteCount} cada)`;
  }

  return `🏆 ${names} (${voteCount})`;
}

function Voting() {
  const { gameId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [game, setGame] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [canVote, setCanVote] = useState(false);
  const [myVotes, setMyVotes] = useState({});
  const [selectedVotes, setSelectedVotes] = useState({});
  const [results, setResults] = useState({});
  const [submittingCategory, setSubmittingCategory] = useState(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);

    const [gameData, registrations] = await Promise.all([
      getGameById(gameId),
      getGameRegistrations(gameId),
    ]);

    const mainList = (registrations || []).filter(
      (registration) => (registration.slot || "main") === "main",
    );

    const playedMain = mainList.some(
      (registration) => registration.player_id === user.id,
    );

    const votingOpen = isVotingOpen(gameData);
    const allowedToVote = votingOpen && playedMain;

    setGame(gameData);
    setCandidates(buildCandidates(mainList, user.id));
    setCanVote(allowedToVote);

    if (allowedToVote) {
      const votes = await getMyVotes(gameId, user.id);
      const votesByCategory = {};

      votes.forEach((vote) => {
        votesByCategory[vote.category] =
          vote.voted_player_id ||
          (vote.voted_guest_id ? `guest-${vote.voted_guest_id}` : null);
      });

      setMyVotes(votesByCategory);
      setSelectedVotes({});
    } else {
      setResults(await getVotingResults(gameId));
    }

    setLoading(false);
  }, [gameId, user.id]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadData();
    }, 0);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [loadData]);

  function handleSelectVote(category, candidateId) {
    if (myVotes[category]) return;

    setSelectedVotes((prev) => ({
      ...prev,
      [category]: candidateId,
    }));
  }

  async function handleVote(category) {
    if (myVotes[category]) return;

    const candidateId = selectedVotes[category];

    if (!candidateId) {
      setError("Selecione uma pessoa antes de confirmar o voto.");
      return;
    }

    setSubmittingCategory(category);
    setError("");

    const result = await submitVote(gameId, user.id, candidateId, category);
    setSubmittingCategory(null);

    if (!result.success) {
      setError(result.error || "Não foi possível registrar o voto.");
      return;
    }

    setMyVotes((prev) => ({ ...prev, [category]: candidateId }));
    setSelectedVotes((prev) => {
      const next = { ...prev };
      delete next[category];
      return next;
    });
    setNotice("Voto registrado!");
  }

  if (loading) {
    return (
      <div className="voting">
        <p className="voting__state">Carregando votação...</p>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="voting">
        <p className="voting__state">Jogo não encontrado.</p>
      </div>
    );
  }

  return (
    <div className="voting">
      <div className="voting__header">
        <h2 className="voting__title">Melhor do Jogo</h2>
        <p className="voting__subtitle">
          {game.date} — {game.location}
        </p>
      </div>

      {!canVote && (
        <p className="voting__info">
          {isVotingOpen(game)
            ? "Apenas quem jogou a lista principal pode votar."
            : "A votação está encerrada. Confira o resultado abaixo."}
        </p>
      )}

      {notice && <p className="voting__notice">{notice}</p>}
      {error && <p className="voting__error">{error}</p>}

      <div className="voting__categories">
        {VOTE_CATEGORIES.map(({ key, label, icon, candidateGender }) => {
          const categoryCandidates = candidateGender
            ? candidates.filter(
                (candidate) => candidate.gender === candidateGender,
              )
            : candidates;

          return (
            <div key={key} className="voting__category">
              <h3 className="voting__category-title">
                <span className="voting__category-icon" aria-hidden="true">
                  {icon}
                </span>
                {label}
              </h3>

              {canVote && (
                <div className="voting__candidates">
                  {categoryCandidates.length === 0 && (
                    <p className="voting__empty">
                      {candidateGender
                        ? "Nenhuma candidata disponível."
                        : "Nenhum candidato disponível."}
                    </p>
                  )}

                  {categoryCandidates.map((candidate) => (
                    <button
                      key={candidate.id}
                      type="button"
                      className={`voting__candidate ${
                        myVotes[key] === candidate.id ||
                        selectedVotes[key] === candidate.id
                          ? "voting__candidate--selected"
                          : ""
                      }`}
                      disabled={
                        submittingCategory === key || Boolean(myVotes[key])
                      }
                      onClick={() => handleSelectVote(key, candidate.id)}
                    >
                      {candidate.name}
                    </button>
                  ))}
                </div>
              )}

              {canVote ? (
                <div className="voting__category-actions">
                  {myVotes[key] ? (
                    <span className="voting__confirmed">Voto confirmado</span>
                  ) : (
                    <button
                      type="button"
                      className="voting__confirm-btn"
                      disabled={
                        submittingCategory === key || !selectedVotes[key]
                      }
                      onClick={() => handleVote(key)}
                    >
                      {submittingCategory === key
                        ? "Confirmando..."
                        : "Confirmar voto"}
                    </button>
                  )}
                </div>
              ) : (
                <p className="voting__winner">
                  {getWinnerText(results[key])}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <Button variant="secondary" onClick={() => navigate(-1)}>
        Voltar
      </Button>
    </div>
  );
}

export default Voting;