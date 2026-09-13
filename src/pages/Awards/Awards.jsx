// Página pública de histórico de premiações (melhor do jogo)

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getGames,
  getSundayGamesHistory,
  getVotingResults,
} from "../../data/supabaseService";
import { VOTE_CATEGORIES } from "../../domain/constants";
import { isVotingOpen } from "../../domain/gameRules";
import "./Awards.css";

function getTodayDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getWinnerName(winner) {
  return winner?.name || winner?.nome || "Desconhecido";
}

function buildAwardsWhatsappText(game, results) {
  const lines = [
    "🏐 *Melhores do Jogo*",
    `${game.date} - ${game.location}`,
    "",
  ];

  VOTE_CATEGORIES.forEach(({ key, label, icon }) => {
    const winner = results[key];
    lines.push(
      `${icon} *${label}*: ${winner ? getWinnerName(winner) : "Sem votos"}`,
    );
  });

  return lines.join("\n").trim();
}

function Awards() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState([]);
  const [currentGame, setCurrentGame] = useState(null);
  const [copyNotice, setCopyNotice] = useState(null);

  useEffect(() => {
    let active = true;

    async function loadHistory() {
      setLoading(true);
      const [games, sundayGames] = await Promise.all([
        getGames(),
        getSundayGamesHistory(),
      ]);
      const today = getTodayDateString();
      const pastGames = (sundayGames || []).filter((game) => game.date < today);
      const sundayCurrentGame =
        (games || []).find((game) => game.day === "sunday") || null;

      const withResults = await Promise.all(
        pastGames.map(async (game) => ({
          game,
          results: await getVotingResults(game.id),
        })),
      );

      const withVotes = withResults.filter(({ results }) =>
        Object.values(results).some(Boolean),
      );

      if (!active) return;
      setCurrentGame(sundayCurrentGame);
      setEntries(withVotes);
      setLoading(false);
    }

    loadHistory();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!copyNotice) return undefined;

    const timeoutId = setTimeout(() => {
      setCopyNotice(null);
    }, 2400);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [copyNotice]);

  async function handleCopyWinners(game, results) {
    const text = buildAwardsWhatsappText(game, results);

    try {
      await navigator.clipboard.writeText(text);
      setCopyNotice({
        gameId: game.id,
        type: "success",
        message: "Resultado copiado. Agora é só colar no WhatsApp.",
      });
    } catch {
      setCopyNotice({
        gameId: game.id,
        type: "error",
        message: "Não foi possível copiar. Tente novamente.",
      });
    }
  }

  if (loading) {
    return (
      <div className="awards">
        <p className="awards__state">Carregando premiações...</p>
      </div>
    );
  }

  return (
    <div className="awards">
      <div className="awards__header">
        <h2 className="awards__title">Prêmios</h2>
        <p className="awards__subtitle">Histórico do melhor do jogo</p>
      </div>

      {currentGame && (
        <div className="awards__status">
          <div className="awards__status-kicker">Status da rodada</div>
          <div className="awards__status-info">
            <span className="awards__status-date">{currentGame.date}</span>
            <span className="awards__status-location">
              {currentGame.location}
            </span>
          </div>
          <span
            className={`awards__status-pill ${
              isVotingOpen(currentGame)
                ? "awards__status-pill--open"
                : "awards__status-pill--closed"
            }`}
          >
            {isVotingOpen(currentGame) ? "Votação aberta" : "Votação fechada"}
          </span>
          {isVotingOpen(currentGame) && (
            <button
              type="button"
              className="awards__status-vote-btn"
              onClick={() => navigate(`/voting/${currentGame.id}`)}
            >
              Votar agora
            </button>
          )}
        </div>
      )}

      {entries.length === 0 && (
        <div className="awards__empty">
          <p className="awards__empty-title">Nenhuma votação encerrada ainda</p>
          <p className="awards__empty-text">
            Os vencedores vão aparecer aqui assim que a janela de votação
            terminar.
          </p>
        </div>
      )}

      <div className="awards__list">
        {entries.map(({ game, results }) => (
          <div key={game.id} className="awards__game">
            <div className="awards__game-header">
              <div className="awards__game-info">
                <span className="awards__game-date">{game.date}</span>
                <span className="awards__game-location">{game.location}</span>
              </div>
              <button
                type="button"
                className="awards__copy-btn"
                onClick={() => handleCopyWinners(game, results)}
              >
                Copiar para WhatsApp
              </button>
            </div>
            {copyNotice?.gameId === game.id && (
              <p
                className={`awards__copy-notice awards__copy-notice--${copyNotice.type}`}
              >
                {copyNotice.message}
              </p>
            )}
            <ul className="awards__winners">
              {VOTE_CATEGORIES.map(({ key, label, icon }) => (
                <li key={key} className="awards__winner">
                  <span className="awards__winner-category">
                    <span className="awards__winner-icon" aria-hidden="true">
                      {icon}
                    </span>
                    {label}
                  </span>
                  <span className="awards__winner-name">
                    {results[key] ? `🏆 ${getWinnerName(results[key])}` : "—"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Awards;
