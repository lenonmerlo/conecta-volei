import { useEffect, useMemo, useState } from "react";
import {
  getAuditGameOptions,
  getAuditLogs,
} from "../../../services/supabaseService.js";
import "./AdminTabs.css";

const PAGE_SIZE = 20;

const ACTION_LABELS = {
  joined_main: "Entrou na lista principal",
  joined_waitlist: "Entrou na lista de espera",
  joined_guests: "Entrou na lista de convidados",
  left_list: "Saiu da lista",
  promoted_to_main: "Promovido para lista principal",
  penalized: "Penalizado",
  warning_added: "Recebeu advertência",
  approved: "Cadastro aprovado",
  rejected: "Cadastro recusado",
};

function formatDateTime(value) {
  if (!value) return "Data indisponível";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Data indisponível";

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
  const guestName = log?.guest?.name;

  if (name && nickname) return `${name} (${nickname})`;
  if (name) return name;
  if (guestName) return guestName;

  if (
    log?.action === "promoted_to_main" &&
    log?.details?.startsWith("Convidado promovido")
  ) {
    return "Convidado não identificado (registro antigo)";
  }

  return "Sistema";
}

function resolveDetails(log) {
  const inviter = log?.inviter;
  if (!inviter) return log.details || "-";

  const inviterName = inviter.nickname
    ? `${inviter.name} (${inviter.nickname})`
    : inviter.name;

  if (log.details === "Convidado externo") {
    return `Convidado externo - por ${inviterName}`;
  }

  return [log.details, `por ${inviterName}`]
    .filter(Boolean)
    .join(" - ");
}

function resolveActionLabel(action) {
  return ACTION_LABELS[action] || action;
}

function AdminAudit({ refreshKey = 0 }) {
  const [logs, setLogs] = useState([]);
  const [games, setGames] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedGameId, setSelectedGameId] = useState("all");
  const [selectedAction, setSelectedAction] = useState("all");

  useEffect(() => {
    let active = true;

    getAuditGameOptions()
      .then((rows) => {
        if (active) setGames(rows || []);
      })
      .catch((loadError) => {
        console.error("[AdminAudit] falha ao carregar jogos", loadError);
      });

    return () => {
      active = false;
    };
  }, [refreshKey]);

  useEffect(() => {
    let active = true;

    async function loadLogs() {
      setLoading(true);
      setError("");

      try {
        const result = await getAuditLogs({
          page,
          pageSize: PAGE_SIZE,
          gameId: selectedGameId,
          action: selectedAction,
        });

        if (!active) return;

        const lastPage = Math.max(1, Math.ceil(result.total / PAGE_SIZE));

        if (page > lastPage) {
          setPage(lastPage);
          return;
        }

        setLogs(result.logs);
        setTotal(result.total);
      } catch (loadError) {
        if (!active) return;

        console.error("[AdminAudit] falha ao carregar auditoria", loadError);
        setLogs([]);
        setTotal(0);
        setError("Não foi possível carregar os logs de auditoria.");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadLogs();

    return () => {
      active = false;
    };
  }, [page, selectedGameId, selectedAction, refreshKey]);

  const gameOptions = useMemo(() => {
    const seen = new Set();

    return games.filter((game) => {
      if (!game?.id || seen.has(game.id)) return false;
      seen.add(game.id);
      return true;
    });
  }, [games]);

  const actionOptions = useMemo(
    () =>
      Object.entries(ACTION_LABELS).sort((a, b) =>
        a[1].localeCompare(b[1], "pt-BR"),
      ),
    [],
  );

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const firstItem = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const lastItem = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="admin-tab">
      <div className="admin-tab__filters">
        <label className="admin-tab__filter-item">
          <span>Jogo</span>
          <select
            className="admin-tab__select"
            value={selectedGameId}
            onChange={(event) => {
              setSelectedGameId(event.target.value);
              setPage(1);
            }}
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
          <span>Ação</span>
          <select
            className="admin-tab__select"
            value={selectedAction}
            onChange={(event) => {
              setSelectedAction(event.target.value);
              setPage(1);
            }}
          >
            <option value="all">Todas</option>
            {actionOptions.map(([action, label]) => (
              <option key={action} value={action}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && <p className="admin-tab__restricted">{error}</p>}

      {loading ? (
        <p className="admin-tab__restricted">Carregando auditoria...</p>
      ) : (
        <>
          {logs.length === 0 && !error && (
            <p className="admin-tab__restricted">Nenhum log encontrado.</p>
          )}

          <ul className="admin-tab__list">
            {logs.map((log) => (
              <li key={log.id} className="admin-tab__item">
                <div className="admin-tab__info admin-tab__info--audit">
                  <span className="admin-tab__name">
                    {resolveActionLabel(log.action)}
                  </span>
                  <span className="admin-tab__type">
                    {formatDateTime(log.created_at)}
                  </span>
                </div>

                <div className="admin-tab__pending-meta">
                  <span>Participante: {resolvePlayerName(log)}</span>
                  <span>Jogo: {log.game_id || "Não informado"}</span>
                  <span>Detalhes: {resolveDetails(log)}</span>
                </div>
              </li>
            ))}
          </ul>

          {total > 0 && (
            <nav
              className="admin-tab__pagination"
              aria-label="Paginação da auditoria"
            >
              <button
                type="button"
                onClick={() => setPage((current) => current - 1)}
                disabled={page === 1}
              >
                Anterior
              </button>

              <span>
                {firstItem}–{lastItem} de {total}
                {" · "}
                Página {page} de {totalPages}
              </span>

              <button
                type="button"
                onClick={() => setPage((current) => current + 1)}
                disabled={page >= totalPages}
              >
                Próxima
              </button>
            </nav>
          )}
        </>
      )}
    </div>
  );
}

export default AdminAudit;