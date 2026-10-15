import { useEffect, useState } from "react";
import { VOTE_CATEGORIES } from "../../domain/constants";
import { STAT_AWARD_CATEGORIES } from "../../domain/matchStatistics";
import {
  getGames,
  getMatchStatisticsResults,
  getSundayGamesHistory,
  getVotingResults,
} from "../../services/supabaseService.js";
import "./Awards.css";

function getWinnerNames(result) {
  if (!result) return null;

  const winners = result.winners?.length ? result.winners : [result];

  return winners
    .map((winner) => winner.name || winner.nome || "Desconhecido")
    .join(", ");
}

function isTie(result) {
  return (result?.winners?.length || 0) > 1;
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function getStatisticDetail(categoryKey, result) {
  if (!result) return "";

  const value = Number(result.value || 0);
  const formattedValue = formatNumber(value);

  if (categoryKey === "mvp_male" || categoryKey === "mvp_female") {
    return `nota ${formattedValue}`;
  }

  if (categoryKey === "top_scorer") {
    return `${formattedValue} ${value === 1 ? "ponto" : "pontos"}`;
  }

  if (categoryKey === "best_attack") {
    return `${formattedValue} ${value === 1 ? "ataque" : "ataques"}`;
  }

  if (categoryKey === "best_serve") {
    return `${formattedValue} ${value === 1 ? "ace" : "aces"}`;
  }

  if (categoryKey === "best_block") {
    return `${formattedValue} ${value === 1 ? "bloqueio" : "bloqueios"}`;
  }

  if (categoryKey === "best_defense") {
    return `${formattedValue} ${value === 1 ? "defesa" : "defesas"}`;
  }

  if (categoryKey === "best_setting") {
    return `${formattedValue} ${value === 1 ? "assistência" : "assistências"}`;
  }

  return "";
}

function buildWinnerText(categoryKey, result, source) {
  if (!result) return "—";

  const tieLabel = isTie(result) ? "Empate: " : "";
  const names = getWinnerNames(result);

  if (source !== "statistics") {
    return `🏆 ${tieLabel}${names}`;
  }

  const detail = getStatisticDetail(categoryKey, result);

  return `🏆 ${tieLabel}${names}${detail ? ` — ${detail}` : ""}`;
}

function buildAwardsWhatsappText(entry) {
  const { game, results, categories, source } = entry;

  const lines = [
    "🏐 *Destaques da Partida*",
    `${game.date} - ${game.location}`,
    "",
  ];

  categories.forEach(({ key, label, icon }) => {
    const result = results[key];

    if (!result) {
      lines.push(`${icon} *${label}*: Sem registro`);
      return;
    }

    const tieLabel = isTie(result) ? "Empate: " : "";
    const names = getWinnerNames(result);
    const detail =
      source === "statistics" ? getStatisticDetail(key, result) : "";

    lines.push(
      `${icon} *${label}*: ${tieLabel}${names}${detail ? ` (${detail})` : ""}`,
    );
  });

  return lines.join("\n").trim();
}

function Awards() {
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState([]);
  const [currentGame, setCurrentGame] = useState(null);
  const [currentResultReady, setCurrentResultReady] = useState(false);
  const [copyNotice, setCopyNotice] = useState(null);

  useEffect(() => {
    let active = true;

    async function loadHistory() {
      setLoading(true);

      try {
        const [games, sundayGames] = await Promise.all([
          getGames(),
          getSundayGamesHistory(),
        ]);

        const availableGames = (sundayGames || []).filter(
          (game) => game.status !== "cancelled",
        );

        const withResults = await Promise.all(
          availableGames.map(async (game) => {
            try {
              const statisticData = await getMatchStatisticsResults(game.id);

              if (statisticData.hasStatistics && statisticData.published) {
                return {
                  game,
                  source: "statistics",
                  categories: STAT_AWARD_CATEGORIES,
                  results: statisticData.results,
                };
              }
            } catch (statisticsError) {
              console.error("[Awards] Falha ao carregar estatísticas:", {
                gameId: game.id,
                error: statisticsError,
              });
            }

            const votingResults = await getVotingResults(game.id);

            return {
              game,
              source: "votes",
              categories: VOTE_CATEGORIES,
              results: votingResults,
            };
          }),
        );

        const withAwards = withResults.filter(({ results }) =>
          Object.values(results || {}).some(Boolean),
        );

        const sundayCurrentGame =
          (games || []).find((game) => game.day === "sunday") || null;

        const currentEntry = sundayCurrentGame
          ? withAwards.find(({ game }) => game.id === sundayCurrentGame.id)
          : null;

        if (!active) return;

        setCurrentGame(sundayCurrentGame);
        setCurrentResultReady(Boolean(currentEntry));
        setEntries(withAwards);
      } catch (loadError) {
        console.error("[Awards] Falha ao carregar premiações:", loadError);

        if (active) {
          setCurrentGame(null);
          setCurrentResultReady(false);
          setEntries([]);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
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

  async function handleCopyWinners(entry) {
    const text = buildAwardsWhatsappText(entry);

    try {
      await navigator.clipboard.writeText(text);

      setCopyNotice({
        gameId: entry.game.id,
        type: "success",
        message: "Resultado copiado. Agora é só colar no WhatsApp.",
      });
    } catch {
      setCopyNotice({
        gameId: entry.game.id,
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
        <p className="awards__subtitle">
          Histórico dos destaques de cada partida
        </p>
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
              currentResultReady
                ? "awards__status-pill--closed"
                : "awards__status-pill--open"
            }`}
          >
            {currentResultReady
              ? "Resultado publicado"
              : "Estatísticas pendentes"}
          </span>
        </div>
      )}

      {entries.length === 0 && (
        <div className="awards__empty">
          <p className="awards__empty-title">
            Nenhum resultado publicado ainda
          </p>

          <p className="awards__empty-text">
            Os destaques aparecerão aqui depois que os administradores
            registrarem as estatísticas.
          </p>
        </div>
      )}

      <div className="awards__list">
        {entries.map((entry) => {
          const { game, results, categories, source } = entry;

          return (
            <div key={game.id} className="awards__game">
              <div className="awards__game-header">
                <div className="awards__game-info">
                  <span className="awards__game-date">{game.date}</span>

                  <span className="awards__game-location">{game.location}</span>

                  <span className="awards__game-source">
                    {source === "statistics"
                      ? "Resultado por estatísticas"
                      : "Resultado da votação"}
                  </span>
                </div>

                <button
                  type="button"
                  className="awards__copy-btn"
                  onClick={() => handleCopyWinners(entry)}
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
                {categories.map(({ key, label, icon }) => {
                  const result = results[key];

                  return (
                    <li key={key} className="awards__winner">
                      <span className="awards__winner-category">
                        <span
                          className="awards__winner-icon"
                          aria-hidden="true"
                        >
                          {icon}
                        </span>

                        {label}
                      </span>

                      <span className="awards__winner-name">
                        {buildWinnerText(key, result, source)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default Awards;
