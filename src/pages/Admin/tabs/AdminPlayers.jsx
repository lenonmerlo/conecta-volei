// Aba de jogadores do painel admin

import { useMemo, useState } from "react";
import { useAuth } from "../../../app/AuthContext";
import Button from "../../../components/Button/Button";
import {
  addWarning,
  removeWarning,
  resetWarnings,
  updatePlayerInjuryLeave,
  updatePlayerStatus,
} from "../../../data/supabaseService";
import { isSuperAdmin } from "../../../domain/admins";
import {
  PLAYER_POSITIONS,
  PLAYER_POSITION_LABELS,
  PLAYER_TYPE,
  SPECIAL_BADGE_FIELDS,
} from "../../../domain/constants";
import "./AdminTabs.css";

function statusLabel(status) {
  const map = {
    active: "Ativo",
    inactive: "Inativo",
    penalized: "Penalizado",
    blocked: "Bloqueado",
  };
  return map[status] || status;
}

const STATUS_FILTER_OPTIONS = ["active", "inactive", "penalized", "blocked"];

function buildWarningsReport(players) {
  const withWarnings = players
    .filter((player) => Math.max(0, Number(player.warnings) || 0) > 0)
    .sort((a, b) => {
      const diff = (Number(b.warnings) || 0) - (Number(a.warnings) || 0);
      if (diff !== 0) return diff;
      return String(a.name || "").localeCompare(String(b.name || ""));
    });

  const today = new Date().toLocaleDateString("pt-BR");
  const header = `Advertencias - Conecta Volei (${today})`;

  if (withWarnings.length === 0) {
    return `${header}\n\nNenhum atleta com advertencias no momento.`;
  }

  const lines = withWarnings.map((player, index) => {
    const warnings = Math.max(0, Number(player.warnings) || 0);
    const plural = warnings > 1 ? "advertencias" : "advertencia";
    return `${index + 1}. ${player.name}${player.nickname ? ` (${player.nickname})` : ""} - ${warnings} ${plural} - ${statusLabel(player.status)}`;
  });

  return [header, "", ...lines].join("\n");
}

function AdminPlayers({ players, loadingPlayers, onRefreshPlayers }) {
  const { user } = useAuth();
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [positionFilter, setPositionFilter] = useState("all");
  const [badgeFilters, setBadgeFilters] = useState({});
  const [onlyWithWarnings, setOnlyWithWarnings] = useState(false);
  const userCanUnblock = isSuperAdmin(user);

  function toggleBadgeFilter(key) {
    setBadgeFilters((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  const filteredPlayers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const activeBadgeKeys = SPECIAL_BADGE_FIELDS.filter(
      (badge) => badgeFilters[badge.key],
    );

    return players
      .filter((player) => {
        if (
          term &&
          !String(player.name || "")
            .toLowerCase()
            .includes(term)
        ) {
          return false;
        }

        if (
          positionFilter !== "all" &&
          (player.position || "all-around") !== positionFilter
        ) {
          return false;
        }

        if (statusFilter !== "all" && player.status !== statusFilter) {
          return false;
        }

        if (
          onlyWithWarnings &&
          Math.max(0, Number(player.warnings) || 0) <= 0
        ) {
          return false;
        }

        if (
          activeBadgeKeys.length > 0 &&
          !activeBadgeKeys.some((badge) => Boolean(player[badge.field]))
        ) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (!onlyWithWarnings) return 0;

        const warningsDiff =
          (Number(b.warnings) || 0) - (Number(a.warnings) || 0);
        if (warningsDiff !== 0) return warningsDiff;
        return String(a.name || "").localeCompare(String(b.name || ""));
      });
  }, [
    players,
    searchTerm,
    positionFilter,
    statusFilter,
    badgeFilters,
    onlyWithWarnings,
  ]);

  async function applyWarningAction(playerId, action) {
    let updatedPlayer = null;

    if (action === "add") {
      updatedPlayer = await addWarning(playerId);
    }

    if (action === "remove") {
      updatedPlayer = await removeWarning(playerId);
    }

    if (action === "reset") {
      updatedPlayer = await resetWarnings(playerId);
    }

    if (!updatedPlayer) {
      setError("Nao foi possivel atualizar as advertencias do jogador.");
      return;
    }

    setError("");
    await onRefreshPlayers({ silent: true });
  }

  async function handleToggleInjuryLeave(playerId, checked) {
    const result = await updatePlayerInjuryLeave(playerId, checked);

    if (!result.success) {
      setError(
        result.error || "Nao foi possivel atualizar afastamento por lesao.",
      );
      return;
    }

    setError("");
    await onRefreshPlayers({ silent: true });
  }

  async function handleUnblockPlayer(playerId) {
    const result = await updatePlayerStatus(playerId, "active", user);

    if (!result.success) {
      setError(result.error || "Nao foi possivel desbloquear o jogador.");
      return;
    }

    setError("");
    await onRefreshPlayers({ silent: true });
  }

  async function handleExportWarnings() {
    setError("");
    setNotice("");

    const report = buildWarningsReport(players);

    if (navigator.share) {
      try {
        await navigator.share({ text: report });
        return;
      } catch {
        // usuario cancelou o compartilhamento ou o navegador nao suporta; tenta copiar
      }
    }

    try {
      await navigator.clipboard.writeText(report);
      setNotice("Lista de advertencias copiada! Cole no grupo.");
    } catch {
      setError("Nao foi possivel exportar a lista de advertencias.");
    }
  }

  if (loadingPlayers) {
    return (
      <div className="admin-tab">
        <p className="admin-tab__restricted">Carregando jogadores...</p>
      </div>
    );
  }

  return (
    <div className="admin-tab">
      {error && <p className="admin-tab__restricted">{error}</p>}
      {notice && <p className="admin-tab__restricted">{notice}</p>}

      <div className="admin-tab__search-wrap">
        <input
          type="search"
          className="admin-tab__search-input"
          placeholder="Buscar atleta por nome"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          aria-label="Buscar atleta por nome"
        />
      </div>

      <div className="admin-tab__filters">
        <label className="admin-tab__filter-item">
          <span>Status</span>
          <select
            className="admin-tab__select"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="all">Todos</option>
            {STATUS_FILTER_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {statusLabel(status)}
              </option>
            ))}
          </select>
        </label>

        <label className="admin-tab__filter-item">
          <span>Posicao</span>
          <select
            className="admin-tab__select"
            value={positionFilter}
            onChange={(event) => setPositionFilter(event.target.value)}
          >
            <option value="all">Todas</option>
            {PLAYER_POSITIONS.map((position) => (
              <option key={position} value={position}>
                {PLAYER_POSITION_LABELS[position] || position}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="admin-tab__position-row">
        <label
          className={`admin-tab__check-label${
            onlyWithWarnings ? " admin-tab__check-label--active" : ""
          }`}
        >
          <input
            type="checkbox"
            checked={onlyWithWarnings}
            onChange={(event) => setOnlyWithWarnings(event.target.checked)}
          />
          Somente com advertencias
        </label>
        <Button
          size="sm"
          variant="secondary"
          className="admin-tab__btn"
          onClick={handleExportWarnings}
        >
          Exportar advertencias
        </Button>
        {SPECIAL_BADGE_FIELDS.map((badge) => (
          <label
            key={badge.key}
            className={`admin-tab__check-label${
              badgeFilters[badge.key] ? " admin-tab__check-label--active" : ""
            }`}
          >
            <input
              type="checkbox"
              checked={Boolean(badgeFilters[badge.key])}
              onChange={() => toggleBadgeFilter(badge.key)}
            />
            {badge.label}
          </label>
        ))}
      </div>

      {filteredPlayers.length === 0 && (
        <p className="admin-tab__restricted">Nenhum atleta encontrado.</p>
      )}

      <ul className="admin-tab__list">
        {filteredPlayers.map((p) => (
          <li
            key={p.id}
            className={`admin-tab__item ${p.on_injury_leave ? "admin-tab__item--injury" : ""}`}
          >
            <div className="admin-tab__info">
              <span className="admin-tab__name">
                {p.name}
                {p.nickname ? ` (${p.nickname})` : ""}
              </span>
              <span
                className={`admin-tab__status admin-tab__status--${p.status}`}
              >
                {statusLabel(p.status)}
              </span>
              <span className="admin-tab__type">
                {p.type === PLAYER_TYPE.MEMBER ? "Membro" : "Convidado"}
              </span>
              <span className="admin-tab__warning-count">
                Advertencias: {Math.max(0, Number(p.warnings) || 0)}
              </span>
              {p.on_injury_leave && (
                <span className="admin-tab__injury-tag">
                  Afastado por lesao
                </span>
              )}
            </div>
            <div className="admin-tab__injury-row">
              <label
                className="admin-tab__check-label"
                htmlFor={`injury-leave-${p.id}`}
              >
                <input
                  id={`injury-leave-${p.id}`}
                  type="checkbox"
                  checked={Boolean(p.on_injury_leave)}
                  onChange={(event) =>
                    handleToggleInjuryLeave(p.id, event.target.checked)
                  }
                />
                Afastado por lesao
              </label>
            </div>
            <div className="admin-tab__actions">
              <Button
                size="sm"
                variant="warning"
                className="admin-tab__btn"
                onClick={() => applyWarningAction(p.id, "add")}
              >
                +Advertencia
              </Button>
              <Button
                size="sm"
                variant="success"
                className="admin-tab__btn"
                onClick={() => applyWarningAction(p.id, "remove")}
              >
                -Advertencia
              </Button>
              <Button
                size="sm"
                variant="danger"
                className="admin-tab__btn"
                onClick={() => applyWarningAction(p.id, "reset")}
              >
                Zerar
              </Button>
              {userCanUnblock && p.status === "blocked" && (
                <Button
                  size="sm"
                  variant="secondary"
                  className="admin-tab__btn"
                  onClick={() => handleUnblockPlayer(p.id)}
                >
                  Desbloquear
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default AdminPlayers;
