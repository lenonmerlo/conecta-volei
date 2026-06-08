import { useEffect, useMemo, useState } from "react";
import { getAuditLogs, getGames } from "../../../data/supabaseService";
import "./AdminTabs.css";

const ACTION_LABELS = {
  joined_main: "Entrou na lista principal",
  joined_waitlist: "Entrou na lista de espera",
  joined_guests: "Entrou na lista de convidados",
  left_list: "Saiu da lista",
  promoted_to_main: "Promovido para lista principal",
  penalized: "Penalizado",
  approved: "Cadastro aprovado",
  rejected: "Cadastro recusado",
};

function formatDateTime(value) {
  if (!value) return "Data indisponivel";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Data indisponivel";

  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function resolvePlayerName(log) {
  const nickname = log?.player?.nickname;
  const name = log?.player?.name;

  if (name && nickname) return `${name} (${nickname})`;
  if (name) return name;
  return "Sistema / Convidado";
}

function resolveActionLabel(action) {
  return ACTION_LABELS[action] || action;
}

function AdminAudit() {
  const [logs, setLogs] = useState([]);
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedGameId, setSelectedGameId] = useState("all");
  const [selectedAction, setSelectedAction] = useState("all");

  useEffect(() => {
    let active = true;

    async function loadData() {
      setLoading(true);
      setError("");

      const [auditRows, gameRows] = await Promise.all([getAuditLogs(), getGames()]);
      if (!active) return;

      setLogs(auditRows || []);
      setGames(gameRows || []);
      setLoading(false);
    }

    loadData().catch(() => {
      if (!active) return;
      setError("Nao foi possivel carregar os logs de auditoria.");
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, []);

  const gameOptions = useMemo(() => {
    const seen = new Set();
    return (games || []).filter((game) => {
      if (!game?.id || seen.has(game.id)) return false;
      seen.add(game.id);
      return true;
    });
  }, [games]);

  const actionOptions = useMemo(() => {
    const values = new Set((logs || []).map((row) => row.action).filter(Boolean));
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [logs]);

  const filteredLogs = useMemo(
    () =>
      (logs || []).filter((row) => {
        const byGame = selectedGameId === "all" || row.game_id === selectedGameId;
        const byAction = selectedAction === "all" || row.action === selectedAction;
        return byGame && byAction;
      }),
    [logs, selectedGameId, selectedAction],
  );

  if (loading) {
    return (
      <div className="admin-tab">
        <p className="admin-tab__restricted">Carregando auditoria...</p>
      </div>
    );
  }

  return (
    <div className="admin-tab">
      {error && <p className="admin-tab__restricted">{error}</p>}

      <div className="admin-tab__filters">
        <label className="admin-tab__filter-item">
          <span>Jogo</span>
          <select
            className="admin-tab__select"
            value={selectedGameId}
            onChange={(event) => setSelectedGameId(event.target.value)}
          >
            <option value="all">Todos</option>
            {gameOptions.map((game) => (
              <option key={game.id} value={game.id}>
                {game.id}
              </option>
            ))}
          </select>
        </label>

        <label className="admin-tab__filter-item">
          <span>Acao</span>
          <select
            className="admin-tab__select"
            value={selectedAction}
            onChange={(event) => setSelectedAction(event.target.value)}
          >
            <option value="all">Todas</option>
            {actionOptions.map((action) => (
              <option key={action} value={action}>
                {resolveActionLabel(action)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {filteredLogs.length === 0 && (
        <p className="admin-tab__restricted">Nenhum log encontrado.</p>
      )}

      <ul className="admin-tab__list">
        {filteredLogs.map((log) => (
          <li key={log.id} className="admin-tab__item">
            <div className="admin-tab__info admin-tab__info--audit">
              <span className="admin-tab__name">{resolveActionLabel(log.action)}</span>
              <span className="admin-tab__type">{formatDateTime(log.created_at)}</span>
            </div>

            <div className="admin-tab__pending-meta">
              <span>Jogador: {resolvePlayerName(log)}</span>
              <span>Jogo: {log.game_id || "Nao informado"}</span>
              <span>Detalhes: {log.details || "-"}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default AdminAudit;