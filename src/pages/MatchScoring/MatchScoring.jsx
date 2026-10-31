import { CheckCircle2, ChevronLeft, RotateCcw, Wifi, WifiOff } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  getGameById,
  getGameTeams,
  getMatchParticipants,
  getMatchStatistics,
  joinMatchScoring,
  leaveMatchScoring,
  recordMatchStat,
  subscribeToMatchStatistics,
  touchMatchScorer,
  undoLastMatchStat,
} from "../../services/supabaseService.js";
import "./MatchScoring.css";

const ROLES = {
  attack_block: {
    title: "Ataque e bloqueio",
    description: "Marque ataques convertidos e pontos de bloqueio.",
    fields: [
      { key: "attack_points", label: "Ataque", short: "ATQ" },
      { key: "block_points", label: "Bloqueio", short: "BLQ" },
    ],
  },
  serve_defense_setting: {
    title: "Saque, defesa e levantamento",
    description: "Marque aces, defesas e levantamentos concluídos.",
    fields: [
      { key: "aces", label: "Ace", short: "ACE" },
      { key: "defenses", label: "Defesa", short: "DEF" },
      { key: "assists", label: "Levantamento", short: "LEV" },
    ],
  },
};

const SESSION_PREFIX = "conecta_live_scorer_";

function participantKey(row) {
  if (row.player_id) return `player-${row.player_id}`;
  if (row.guest_id) return `guest-${row.guest_id}`;
  return null;
}

function participantName(row) {
  if (row.player) return row.player.nickname || row.player.name;
  return row.guest?.name || "Convidado";
}

function teamPlayerKey(player) {
  const id = String(player?.id || "");
  if (!id) return null;
  if (player?.type === "guest" || id.startsWith("guest-")) {
    return id.startsWith("guest-") ? id : `guest-${id}`;
  }
  return `player-${id}`;
}

function mergeParticipants(registrations, statistics) {
  const statsByKey = new Map((statistics || []).map((row) => [participantKey(row), row]));

  return (registrations || [])
    .map((registration) => {
      const key = participantKey(registration);
      return {
        key,
        name: participantName(registration),
        playerId: registration.player_id || null,
        guestId: registration.guest_id || null,
        stats: statsByKey.get(key) || {},
      };
    })
    .sort((first, second) => first.name.localeCompare(second.name, "pt-BR"));
}

function formatGameDate(game) {
  if (!game?.date) return "Partida";
  const [year, month, day] = String(game.date).slice(0, 10).split("-");
  return `${day}/${month}/${year}`;
}

export default function MatchScoring() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const storageKey = `${SESSION_PREFIX}${gameId}`;
  const [game, setGame] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [statistics, setStatistics] = useState([]);
  const [teams, setTeams] = useState([]);
  const [selectedTeams, setSelectedTeams] = useState([]);
  const [session, setSession] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem(storageKey)) || null;
    } catch {
      return null;
    }
  });
  const [scorerName, setScorerName] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [selectedRole, setSelectedRole] = useState("attack_block");
  const [activeField, setActiveField] = useState("attack_points");
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [pending, setPending] = useState(0);
  const [online, setOnline] = useState(navigator.onLine);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [recentActions, setRecentActions] = useState([]);

  const loadData = useCallback(async () => {
    const [gameRow, participantRows, statisticRows, teamRows] = await Promise.all([
      getGameById(gameId),
      getMatchParticipants(gameId),
      getMatchStatistics(gameId),
      getGameTeams(gameId),
    ]);
    setGame(gameRow);
    setRegistrations(participantRows || []);
    setStatistics(statisticRows || []);
    setTeams(teamRows || []);
    setLoading(false);
  }, [gameId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      loadData().catch(() => {
        setError("Não foi possível carregar a partida.");
        setLoading(false);
      });
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadData]);

  useEffect(() => {
    function handleOnline() {
      setOnline(true);
      loadData();
    }
    function handleOffline() {
      setOnline(false);
    }
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [loadData]);

  useEffect(() => {
    if (!session?.access_token) return undefined;

    const stopSubscription = subscribeToMatchStatistics(gameId, () => loadData());
    const refreshId = window.setInterval(loadData, 10000);
    const heartbeatId = window.setInterval(
      () => touchMatchScorer(session.access_token),
      120000,
    );

    return () => {
      stopSubscription();
      window.clearInterval(refreshId);
      window.clearInterval(heartbeatId);
    };
  }, [gameId, loadData, session?.access_token]);

  const role = session ? ROLES[session.scorer_role] : ROLES[selectedRole];
  const participants = useMemo(
    () => mergeParticipants(registrations, statistics),
    [registrations, statistics],
  );

  const visibleParticipants = useMemo(() => {
    if (!selectedTeams.length) return participants;
    const keys = new Set(
      teams
        .filter((team) => selectedTeams.includes(team.id))
        .flatMap((team) => (team.players || []).map(teamPlayerKey).filter(Boolean)),
    );
    return participants.filter((participant) => keys.has(participant.key));
  }, [participants, selectedTeams, teams]);

  function toggleTeam(teamId) {
    setSelectedTeams((current) => {
      if (current.includes(teamId)) return current.filter((id) => id !== teamId);
      if (current.length >= 2) return [current[1], teamId];
      return [...current, teamId];
    });
  }

  async function handleJoin(event) {
    event.preventDefault();
    setJoining(true);
    setError("");
    const result = await joinMatchScoring({
      gameId,
      accessCode,
      scorerName,
      scorerRole: selectedRole,
    });
    setJoining(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    sessionStorage.setItem(storageKey, JSON.stringify(result.session));
    setSession(result.session);
    setActiveField(ROLES[result.session.scorer_role].fields[0].key);
    setNotice("Função assumida. Toque em um jogador para marcar.");
  }

  async function handleRecord(participant) {
    if (!session?.access_token || !online) return;
    const field = role.fields.find((item) => item.key === activeField);

    setPending((value) => value + 1);
    setError("");
    setNotice(`${field.label}: ${participant.name}`);
    setStatistics((current) => {
      const key = participant.key;
      const existing = current.find((row) => participantKey(row) === key);
      if (existing) {
        return current.map((row) =>
          participantKey(row) === key
            ? { ...row, [activeField]: Number(row[activeField] || 0) + 1 }
            : row,
        );
      }
      return [
        ...current,
        {
          game_id: gameId,
          player_id: participant.playerId,
          guest_id: participant.guestId,
          [activeField]: 1,
        },
      ];
    });

    if (navigator.vibrate) navigator.vibrate(35);

    const result = await recordMatchStat({
      accessToken: session.access_token,
      playerId: participant.playerId,
      guestId: participant.guestId,
      statField: activeField,
      clientEventId: crypto.randomUUID(),
    });

    setPending((value) => Math.max(0, value - 1));

    if (!result.success) {
      setError(result.error);
      loadData();
      return;
    }

    setRecentActions((current) => [
      { participant: participant.name, field: field.label },
      ...current,
    ].slice(0, 3));
    loadData();
  }

  async function handleUndo() {
    if (!session?.access_token || pending > 0) return;
    setPending((value) => value + 1);
    setError("");
    const result = await undoLastMatchStat(session.access_token);
    setPending((value) => Math.max(0, value - 1));

    if (!result.success) {
      setError(result.error);
      return;
    }

    setRecentActions((current) => current.slice(1));
    setNotice("Última marcação desfeita.");
    await loadData();
  }

  async function handleLeave() {
    if (session?.access_token) await leaveMatchScoring(session.access_token);
    sessionStorage.removeItem(storageKey);
    setSession(null);
    setRecentActions([]);
    setNotice("");
  }

  if (loading) {
    return <div className="scoring-page scoring-page--center">Carregando partida...</div>;
  }

  if (!game) {
    return <div className="scoring-page scoring-page--center">Partida não encontrada.</div>;
  }

  if (!session) {
    return (
      <main className="scoring-page scoring-join">
        <button className="scoring-back" type="button" onClick={() => navigate("/")}>
          <ChevronLeft size={20} /> Voltar
        </button>
        <div className="scoring-join__hero">
          <span>Modo Anotador</span>
          <h1>{formatGameDate(game)}</h1>
          <p>{game.location || "Local não informado"}</p>
        </div>

        <form className="scoring-join__form" onSubmit={handleJoin}>
          <label>
            Seu nome
            <input
              required
              minLength={2}
              maxLength={40}
              value={scorerName}
              onChange={(event) => setScorerName(event.target.value)}
              placeholder="Como podemos identificar você?"
            />
          </label>
          <label>
            Código da partida
            <input
              required
              inputMode="numeric"
              pattern="[0-9]{4,8}"
              value={accessCode}
              onChange={(event) => setAccessCode(event.target.value.replace(/\D/g, ""))}
              placeholder="000000"
              className="scoring-join__code"
            />
          </label>

          <fieldset>
            <legend>O que você vai anotar?</legend>
            {Object.entries(ROLES).map(([key, option]) => (
              <label key={key} className={`scoring-role ${selectedRole === key ? "scoring-role--active" : ""}`}>
                <input
                  type="radio"
                  name="role"
                  value={key}
                  checked={selectedRole === key}
                  onChange={() => setSelectedRole(key)}
                />
                <strong>{option.title}</strong>
                <span>{option.description}</span>
              </label>
            ))}
          </fieldset>

          {error && <p className="scoring-error">{error}</p>}
          <button className="scoring-primary" disabled={joining} type="submit">
            {joining ? "Entrando..." : "Assumir função"}
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="scoring-page scoring-live">
      <header className="scoring-live__header">
        <div>
          <span>{formatGameDate(game)} · {session.scorer_name}</span>
          <h1>{role.title}</h1>
        </div>
        <div className={`scoring-status ${online ? "scoring-status--online" : ""}`}>
          {online ? <Wifi size={16} /> : <WifiOff size={16} />}
          {online ? pending ? "Salvando" : "Sincronizado" : "Sem conexão"}
        </div>
      </header>

      <section className="scoring-fields" aria-label="Categoria da marcação">
        {role.fields.map((field) => (
          <button
            key={field.key}
            type="button"
            className={activeField === field.key ? "scoring-field scoring-field--active" : "scoring-field"}
            onClick={() => setActiveField(field.key)}
          >
            <span>{field.short}</span>
            {field.label}
          </button>
        ))}
      </section>

      {teams.length > 0 && (
        <section className="scoring-teams">
          <button
            type="button"
            className={!selectedTeams.length ? "active" : ""}
            onClick={() => setSelectedTeams([])}
          >
            Todos
          </button>
          {teams.map((team) => (
            <button
              key={team.id}
              type="button"
              className={selectedTeams.includes(team.id) ? "active" : ""}
              onClick={() => toggleTeam(team.id)}
            >
              {String(team.team_name || "Time").replace(/^Time\s+/i, "")}
            </button>
          ))}
        </section>
      )}

      {notice && <div className="scoring-notice"><CheckCircle2 size={18} /> {notice}</div>}
      {error && <p className="scoring-error scoring-error--live">{error}</p>}

      <section className="scoring-players">
        {visibleParticipants.map((participant) => (
          <button
            key={participant.key}
            type="button"
            className="scoring-player"
            disabled={!online}
            onClick={() => handleRecord(participant)}
          >
            <strong>{participant.name}</strong>
            <span>{Number(participant.stats?.[activeField] || 0)}</span>
          </button>
        ))}
      </section>

      <footer className="scoring-live__footer">
        <div className="scoring-recent">
          {recentActions.length ? recentActions.map((action, index) => (
            <span key={`${action.participant}-${action.field}-${index}`}>
              {action.field}: {action.participant}
            </span>
          )) : <span>Nenhuma marcação nesta sessão.</span>}
        </div>
        <button type="button" className="scoring-undo" onClick={handleUndo} disabled={!recentActions.length || pending > 0}>
          <RotateCcw size={20} /> Desfazer
        </button>
        <button type="button" className="scoring-leave" onClick={handleLeave}>Liberar função</button>
      </footer>
    </main>
  );
}
