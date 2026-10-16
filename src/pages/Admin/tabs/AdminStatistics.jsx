import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../../app/AuthContext";
import Button from "../../../components/Button/Button";
import {
  calculateMatchAwards,
  MATCH_STAT_FIELDS,
  STAT_AWARD_CATEGORIES,
} from "../../../domain/matchStatistics";
import { createMatchStatisticsMockParticipants } from "../../../mocks/matchStatisticsMock";
import {
  getGameTeams,
  getMatchParticipants,
  getMatchStatisticsResults,
  getSundayGamesHistory,
  publishMatchStatistics,
  saveMatchStatistics,
  unpublishMatchStatistics,
} from "../../../services/supabaseService.js";
import "./AdminStatistics.css";

function participantKey(participant) {
  if (participant.player_id) {
    return `player-${participant.player_id}`;
  }

  if (participant.guest_id) {
    return `guest-${participant.guest_id}`;
  }

  return null;
}

function participantName(participant) {
  if (participant.player) {
    const { name, nickname } = participant.player;
    return nickname ? `${name} (${nickname})` : name;
  }

  return participant.guest?.name || "Convidado";
}

function participantGender(participant) {
  return participant.player?.gender ?? participant.guest?.gender ?? null;
}

function genderLabel(gender) {
  if (gender === "F") return "Feminino";
  if (gender === "M") return "Masculino";
  return "Gênero não informado";
}

function teamPlayerKey(player) {
  const id = String(player?.id || "");

  if (!id) return null;

  if (player?.type === "guest" || id.startsWith("guest-")) {
    return id.startsWith("guest-") ? id : `guest-${id}`;
  }

  return `player-${id}`;
}

function shortTeamName(teamName) {
  return String(teamName || "").replace(/^Time\s+/i, "");
}

function buildMatchupOptions(teams) {
  const options = [];

  for (let firstIndex = 0; firstIndex < teams.length; firstIndex += 1) {
    for (
      let secondIndex = firstIndex + 1;
      secondIndex < teams.length;
      secondIndex += 1
    ) {
      const firstTeam = teams[firstIndex];
      const secondTeam = teams[secondIndex];

      options.push({
        key: `${firstTeam.id}-${secondTeam.id}`,
        label: `${shortTeamName(firstTeam.team_name)} × ${shortTeamName(
          secondTeam.team_name,
        )}`,
        teams: [firstTeam, secondTeam],
      });
    }
  }

  return options;
}

function sortParticipantsByName(participants) {
  return [...participants].sort((first, second) =>
    first.name.localeCompare(second.name, "pt-BR", {
      sensitivity: "base",
    }),
  );
}

function createEmptyStatistics(participant) {
  return {
    player_id: participant.player_id || null,
    guest_id: participant.guest_id || null,
    attack_points: 0,
    aces: 0,
    block_points: 0,
    defenses: 0,
    assists: 0,
  };
}

function mergeParticipantsWithStatistics(participants, statistics) {
  const statisticsByParticipant = new Map(
    (statistics || []).map((row) => [participantKey(row), row]),
  );

  return (participants || []).map((participant) => {
    const existing = statisticsByParticipant.get(participantKey(participant));

    const gender = participantGender(participant);

    return {
      key: participantKey(participant),
      name: participantName(participant),
      gender,
      genderLabel: genderLabel(gender),
      values: existing
        ? {
            player_id: existing.player_id || null,
            guest_id: existing.guest_id || null,
            attack_points: existing.attack_points ?? 0,
            aces: existing.aces ?? 0,
            block_points: existing.block_points ?? 0,
            defenses: existing.defenses ?? 0,
            assists: existing.assists ?? 0,
          }
        : createEmptyStatistics(participant),
    };
  });
}

function formatGameLabel(game) {
  const [year, month, day] = String(game.date || "")
    .split("T")[0]
    .split("-");

  const formattedDate =
    year && month && day ? `${day}/${month}/${year}` : game.date;

  return `${formattedDate} - ${game.location || "Local não informado"}`;
}

function buildPreviewRows(participants) {
  return participants.map((participant) => {
    const base = {
      ...participant.values,
    };

    if (participant.values.player_id) {
      return {
        ...base,
        player: {
          id: participant.values.player_id,
          name: participant.name,
          nickname: null,
          gender: participant.gender,
        },
        guest: null,
      };
    }

    return {
      ...base,
      player: null,
      guest: {
        id: participant.values.guest_id,
        name: participant.name,
        gender: participant.gender,
      },
    };
  });
}

function getWinnerNames(result) {
  if (!result?.winners?.length) return "—";

  return result.winners.map((winner) => winner.name).join(", ");
}

function formatResultValue(categoryKey, result) {
  if (!result) return "";

  const value = Number(result.value || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

  if (categoryKey === "mvp_male" || categoryKey === "mvp_female") {
    return `Nota ${value}`;
  }

  if (categoryKey === "top_scorer") {
    return `${value} pontos`;
  }

  if (categoryKey === "best_attack") {
    return `${value} ataques`;
  }

  if (categoryKey === "best_serve") {
    return `${value} aces`;
  }

  if (categoryKey === "best_block") {
    return `${value} bloqueios`;
  }

  if (categoryKey === "best_defense") {
    return `${value} defesas`;
  }

  if (categoryKey === "best_setting") {
    return `${value} assistências`;
  }

  return value;
}

function AdminStatistics() {
  const { user } = useAuth();

  const [games, setGames] = useState([]);
  const [selectedGameId, setSelectedGameId] = useState("");
  const [participants, setParticipants] = useState([]);
  const [teams, setTeams] = useState([]);
  const [selectedMatchup, setSelectedMatchup] = useState("");
  const [loadingGames, setLoadingGames] = useState(true);
  const [loadingStatistics, setLoadingStatistics] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [quickField, setQuickField] = useState(MATCH_STAT_FIELDS[0].key);
  const [lastQuickChange, setLastQuickChange] = useState(null);

  useEffect(() => {
    let active = true;

    async function loadGames() {
      setLoadingGames(true);
      setError("");

      const data = await getSundayGamesHistory();

      if (!active) return;

      const availableGames = (data || []).filter(
        (game) => game.status !== "cancelled",
      );

      setGames(availableGames);
      setSelectedGameId(availableGames[0]?.id || "");
      setLoadingGames(false);
    }

    loadGames();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function loadStatistics() {
      if (!selectedGameId) {
        setParticipants([]);
        setTeams([]);
        setSelectedMatchup("");
        setPublished(false);
        return;
      }

      setLoadingStatistics(true);
      setError("");
      setNotice("");
      setDemoMode(false);
      setDirty(false);

      try {
        const [registrationRows, statisticData, teamRows] = await Promise.all([
          getMatchParticipants(selectedGameId),
          getMatchStatisticsResults(selectedGameId),
          getGameTeams(selectedGameId),
        ]);

        if (!active) return;

        setParticipants(
          mergeParticipantsWithStatistics(
            registrationRows,
            statisticData.statistics,
          ),
        );

        const loadedTeams = teamRows || [];
        const matchupOptions = buildMatchupOptions(loadedTeams);

        setTeams(loadedTeams);
        setSelectedMatchup(matchupOptions[0]?.key || "");

        setPublished(statisticData.published);
      } catch {
        if (!active) return;

        setParticipants([]);
        setPublished(false);
        setError(
          "Não foi possível carregar os participantes e as estatísticas.",
        );
      } finally {
        if (active) {
          setLoadingStatistics(false);
        }
      }
    }

    loadStatistics();

    return () => {
      active = false;
    };
  }, [selectedGameId, reloadKey]);

  const selectedGame = useMemo(
    () => games.find((game) => game.id === selectedGameId) || null,
    [games, selectedGameId],
  );

  const matchupOptions = useMemo(() => buildMatchupOptions(teams), [teams]);

  const visibleParticipants = useMemo(() => {
    const sortedParticipants = sortParticipantsByName(participants);

    if (!selectedMatchup) {
      return sortedParticipants;
    }

    const matchup = matchupOptions.find(
      (option) => option.key === selectedMatchup,
    );

    if (!matchup) {
      return sortedParticipants;
    }

    const participantKeys = new Set(
      matchup.teams.flatMap((team) =>
        (team.players || []).map(teamPlayerKey).filter(Boolean),
      ),
    );

    return sortedParticipants.filter((participant) =>
      participantKeys.has(participant.key),
    );
  }, [matchupOptions, participants, selectedMatchup]);

  const previewResults = useMemo(
    () => calculateMatchAwards(buildPreviewRows(participants)),
    [participants],
  );

  const hasPerformance = useMemo(
    () =>
      participants.some((participant) =>
        MATCH_STAT_FIELDS.some(
          (field) => Number(participant.values[field.key] || 0) > 0,
        ),
      ),
    [participants],
  );

  function changeStatistic(participantKeyValue, field, value) {
    const parsedValue = Number.parseInt(value, 10);
    const safeValue = Number.isFinite(parsedValue)
      ? Math.max(0, parsedValue)
      : 0;

    setParticipants((current) =>
      current.map((participant) =>
        participant.key === participantKeyValue
          ? {
              ...participant,
              values: {
                ...participant.values,
                [field]: safeValue,
              },
            }
          : participant,
      ),
    );

    setLastQuickChange(null);
    setDirty(true);
    setNotice("");
  }

  function adjustStatistic(participantKeyValue, field, amount) {
    setParticipants((current) =>
      current.map((participant) => {
        if (participant.key !== participantKeyValue) {
          return participant;
        }

        const currentValue = Number(participant.values[field]) || 0;

        return {
          ...participant,
          values: {
            ...participant.values,
            [field]: Math.max(0, currentValue + amount),
          },
        };
      }),
    );

    setLastQuickChange(null);
    setDirty(true);
    setNotice("");
  }

  function addQuickStatistic(participant) {
    const field = quickField;
    const previousValue = Number(participant.values[field]) || 0;

    setParticipants((current) =>
      current.map((item) =>
        item.key === participant.key
          ? {
              ...item,
              values: {
                ...item.values,
                [field]: previousValue + 1,
              },
            }
          : item,
      ),
    );

    setLastQuickChange({
      participantKey: participant.key,
      participantName: participant.name,
      field,
      previousValue,
    });

    setDirty(true);
    setNotice("");
  }

  function undoLastQuickChange() {
    if (!lastQuickChange) return;

    setParticipants((current) =>
      current.map((participant) =>
        participant.key === lastQuickChange.participantKey
          ? {
              ...participant,
              values: {
                ...participant.values,
                [lastQuickChange.field]: lastQuickChange.previousValue,
              },
            }
          : participant,
      ),
    );

    setLastQuickChange(null);
    setDirty(true);
    setNotice("");
  }

  function toggleDemoMode() {
    setLastQuickChange(null);

    if (demoMode) {
      setDemoMode(false);
      setParticipants([]);
      setNotice("");
      setReloadKey((current) => current + 1);
      return;
    }

    setParticipants(createMatchStatisticsMockParticipants());
    setDemoMode(true);
    setPublished(false);
    setDirty(false);
    setError("");
    setNotice("Modo de demonstração: estes dados não serão salvos.");
  }

  async function saveDraft({ showNotice = true } = {}) {
    if (!selectedGameId || participants.length === 0 || demoMode) {
      return false;
    }

    setSaving(true);
    setError("");

    const result = await saveMatchStatistics(
      selectedGameId,
      participants.map((participant) => participant.values),
    );

    setSaving(false);

    if (!result.success) {
      setError(result.error || "Não foi possível salvar as estatísticas.");
      return false;
    }

    setPublished(false);
    setDirty(false);

    if (showNotice) {
      setNotice("Rascunho salvo. O resultado ainda não está público.");
    }

    return true;
  }

  async function handleSave() {
    await saveDraft();
  }

  async function handlePublish() {
    if (demoMode || !hasPerformance) return;

    setPublishing(true);
    setError("");
    setNotice("");

    const saved = await saveDraft({
      showNotice: false,
    });

    if (!saved) {
      setPublishing(false);
      return;
    }

    const result = await publishMatchStatistics(selectedGameId, user.id);

    setPublishing(false);

    if (!result.success) {
      setError(result.error || "Não foi possível publicar o resultado.");
      return;
    }

    setPublished(true);
    setDirty(false);
    setNotice("Resultado publicado na página de Prêmios.");
  }

  async function handleUnpublish() {
    if (demoMode || !selectedGameId) return;

    setPublishing(true);
    setError("");
    setNotice("");

    const result = await unpublishMatchStatistics(selectedGameId);

    setPublishing(false);

    if (!result.success) {
      setError(result.error || "Não foi possível retirar a publicação.");
      return;
    }

    setPublished(false);
    setNotice("Resultado retirado da página de Prêmios.");
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
        <p className="admin-tab__restricted">
          Nenhum jogo de domingo disponível.
        </p>
      </div>
    );
  }

  return (
    <div className="admin-tab admin-statistics">
      <div className="admin-statistics__header">
        <div>
          <h3 className="admin-statistics__title">Estatísticas da partida</h3>

          <p className="admin-statistics__description">
            Registre apenas as jogadas concluídas com sucesso.
          </p>
        </div>

        <div className="admin-statistics__game-select">
          <label htmlFor="statistics-game">Jogo</label>

          <select
            id="statistics-game"
            className="admin-tab__select"
            value={selectedGameId}
            onChange={(event) => setSelectedGameId(event.target.value)}
            disabled={saving || publishing}
          >
            {games.map((game) => (
              <option key={game.id} value={game.id}>
                {formatGameLabel(game)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedGame && (
        <div className="admin-statistics__selected-game">
          <span>{formatGameLabel(selectedGame)}</span>

          {!demoMode && (
            <strong
              className={`admin-statistics__publication-status ${
                published
                  ? "admin-statistics__publication-status--published"
                  : "admin-statistics__publication-status--draft"
              }`}
            >
              {published ? "Publicado" : "Rascunho"}
            </strong>
          )}
        </div>
      )}

      {error && <p className="admin-tab__restricted">{error}</p>}

      {notice && <p className="admin-statistics__notice">{notice}</p>}

      {loadingStatistics && (
        <p className="admin-tab__restricted">Carregando participantes...</p>
      )}

      {import.meta.env.DEV && !loadingStatistics && (
        <div className="admin-statistics__demo">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={toggleDemoMode}
            disabled={saving || publishing}
          >
            {demoMode
              ? "Remover dados de demonstração"
              : "Carregar dados de demonstração"}
          </Button>
        </div>
      )}

      {!loadingStatistics && participants.length === 0 && !demoMode && (
        <p className="admin-tab__restricted">
          Nenhum participante encontrado na lista principal deste jogo.
        </p>
      )}

      {!loadingStatistics && participants.length > 0 && (
        <>
          <section className="admin-statistics__quick">
            {matchupOptions.length > 0 && (
              <div className="admin-statistics__matchup">
                <div className="admin-statistics__matchup-header">
                  <div>
                    <strong>Times em quadra</strong>
                    <span>Selecione o confronto atual</span>
                  </div>

                  <span>{visibleParticipants.length} jogadores</span>
                </div>

                <div className="admin-statistics__matchup-options">
                  {matchupOptions.map((option) => (
                    <button
                      key={option.key}
                      type="button"
                      className={
                        selectedMatchup === option.key
                          ? "admin-statistics__matchup-option admin-statistics__matchup-option--active"
                          : "admin-statistics__matchup-option"
                      }
                      onClick={() => {
                        setSelectedMatchup(option.key);
                        setLastQuickChange(null);
                      }}
                      disabled={saving || publishing}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="admin-statistics__quick-toolbar">
              <span>Selecione o fundamento</span>

              <div className="admin-statistics__quick-fields">
                {MATCH_STAT_FIELDS.map((field) => (
                  <button
                    key={field.key}
                    type="button"
                    className={
                      quickField === field.key
                        ? "admin-statistics__quick-field admin-statistics__quick-field--active"
                        : "admin-statistics__quick-field"
                    }
                    onClick={() => setQuickField(field.key)}
                    disabled={saving || publishing}
                  >
                    {field.shortLabel}
                  </button>
                ))}
              </div>
            </div>

            <p className="admin-statistics__quick-instruction">
              Toque no jogador para adicionar:{" "}
              <strong>
                {
                  MATCH_STAT_FIELDS.find((field) => field.key === quickField)
                    ?.label
                }
              </strong>
            </p>

            <div className="admin-statistics__quick-players">
              {visibleParticipants.map((participant) => (
                <article
                  key={participant.key}
                  className="admin-statistics__quick-player"
                >
                  <span
                    className="admin-statistics__quick-name"
                    title={participant.name}
                  >
                    {participant.name}
                  </span>

                  <div className="admin-statistics__quick-counter">
                    <button
                      type="button"
                      className="admin-statistics__quick-control"
                      aria-label={`Diminuir ${
                        MATCH_STAT_FIELDS.find(
                          (field) => field.key === quickField,
                        )?.label
                      } de ${participant.name}`}
                      onClick={() =>
                        adjustStatistic(participant.key, quickField, -1)
                      }
                      disabled={
                        saving ||
                        publishing ||
                        participant.values[quickField] <= 0
                      }
                    >
                      −
                    </button>

                    <span className="admin-statistics__quick-value">
                      {participant.values[quickField]}
                    </span>

                    <button
                      type="button"
                      className="admin-statistics__quick-control admin-statistics__quick-plus"
                      aria-label={`Adicionar ${
                        MATCH_STAT_FIELDS.find(
                          (field) => field.key === quickField,
                        )?.label
                      } para ${participant.name}`}
                      onClick={() => addQuickStatistic(participant)}
                      disabled={saving || publishing}
                    >
                      +
                    </button>
                  </div>
                </article>
              ))}
            </div>

            <button
              type="button"
              className="admin-statistics__undo"
              onClick={undoLastQuickChange}
              disabled={!lastQuickChange || saving || publishing}
            >
              {lastQuickChange
                ? `Desfazer último lançamento: ${lastQuickChange.participantName}`
                : "Nenhum lançamento para desfazer"}
            </button>
          </section>
          <div className="admin-statistics__participants admin-statistics__participants--detailed">
            {participants.map((participant) => (
              <article
                key={participant.key}
                className="admin-statistics__participant"
              >
                <header className="admin-statistics__participant-header">
                  <strong>{participant.name}</strong>
                  <span>{participant.genderLabel}</span>
                </header>

                <div className="admin-statistics__fields">
                  {MATCH_STAT_FIELDS.map((field) => (
                    <div key={field.key} className="admin-statistics__field">
                      <label htmlFor={`${participant.key}-${field.key}`}>
                        {field.shortLabel}
                      </label>

                      <div className="admin-statistics__counter">
                        <button
                          type="button"
                          aria-label={`Diminuir ${field.label} de ${participant.name}`}
                          onClick={() =>
                            adjustStatistic(participant.key, field.key, -1)
                          }
                          disabled={
                            saving ||
                            publishing ||
                            participant.values[field.key] <= 0
                          }
                        >
                          −
                        </button>

                        <input
                          id={`${participant.key}-${field.key}`}
                          type="number"
                          min="0"
                          step="1"
                          inputMode="numeric"
                          value={participant.values[field.key]}
                          onChange={(event) =>
                            changeStatistic(
                              participant.key,
                              field.key,
                              event.target.value,
                            )
                          }
                          disabled={saving || publishing}
                        />

                        <button
                          type="button"
                          aria-label={`Aumentar ${field.label} de ${participant.name}`}
                          onClick={() =>
                            adjustStatistic(participant.key, field.key, 1)
                          }
                          disabled={saving || publishing}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>

          <section className="admin-statistics__preview">
            <div className="admin-statistics__preview-header">
              <div>
                <h3>Prévia dos resultados</h3>
                <p>O resultado muda automaticamente conforme os contadores.</p>
              </div>
            </div>

            <ul className="admin-statistics__preview-list">
              {STAT_AWARD_CATEGORIES.map(({ key, label, icon }) => {
                const result = previewResults[key];
                const tied = (result?.winners?.length || 0) > 1;

                return (
                  <li key={key}>
                    <span>
                      {icon} {label}
                    </span>

                    <strong>
                      {result
                        ? `${tied ? "Empate: " : ""}${getWinnerNames(
                            result,
                          )} — ${formatResultValue(key, result)}`
                        : "Sem registro"}
                    </strong>
                  </li>
                );
              })}
            </ul>
          </section>

          <div className="admin-statistics__actions">
            <Button
              type="button"
              variant="secondary"
              onClick={handleSave}
              disabled={saving || publishing || demoMode || !dirty}
            >
              {demoMode
                ? "Demonstração — não salva"
                : saving
                  ? "Salvando..."
                  : "Salvar rascunho"}
            </Button>

            {!demoMode && !published && (
              <Button
                type="button"
                onClick={handlePublish}
                disabled={saving || publishing || !hasPerformance}
              >
                {publishing ? "Publicando..." : "Publicar resultado"}
              </Button>
            )}

            {!demoMode && published && (
              <Button
                type="button"
                variant="warning"
                onClick={handleUnpublish}
                disabled={saving || publishing}
              >
                {publishing ? "Retirando..." : "Retirar publicação"}
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default AdminStatistics;
