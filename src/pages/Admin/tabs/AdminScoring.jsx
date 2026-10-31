import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../../app/AuthContext";
import Button from "../../../components/Button/Button";
import {
  configureMatchScoring,
  disableMatchScoring,
  getSundayGamesHistory,
} from "../../../services/supabaseService.js";
import "./AdminScoring.css";

function generateAccessCode() {
  return String(crypto.getRandomValues(new Uint32Array(1))[0] % 1000000).padStart(
    6,
    "0",
  );
}

function gameLabel(game) {
  const [year, month, day] = String(game?.date || "").slice(0, 10).split("-");
  return `${day}/${month}/${year} — ${game?.location || "Local a definir"}`;
}

function publicAppOrigin() {
  const configuredOrigin = String(import.meta.env.VITE_PUBLIC_APP_URL || "")
    .trim()
    .replace(/\/$/, "");

  if (configuredOrigin) return configuredOrigin;

  if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
    return "https://conecta-volei.vercel.app";
  }

  return window.location.origin;
}

export default function AdminScoring() {
  const { user } = useAuth();
  const [games, setGames] = useState([]);
  const [gameId, setGameId] = useState("");
  const [accessCode, setAccessCode] = useState(generateAccessCode);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    getSundayGamesHistory().then((rows) => {
      if (!active) return;
      const available = (rows || []).filter((game) => game.status !== "cancelled");
      setGames(available);
      setGameId(available[0]?.id || "");
    });

    return () => {
      active = false;
    };
  }, []);

  const selectedGame = useMemo(
    () => games.find((game) => game.id === gameId) || null,
    [gameId, games],
  );

  const scoringUrl = gameId
    ? `${publicAppOrigin()}/score/${encodeURIComponent(gameId)}`
    : "";

  async function handleEnable() {
    if (!gameId || !/^\d{4,8}$/.test(accessCode)) {
      setError("Informe um código de 4 a 8 números.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    const expiresAt = selectedGame?.date
      ? new Date(`${String(selectedGame.date).slice(0, 10)}T23:59:59-03:00`).toISOString()
      : null;
    const result = await configureMatchScoring({
      gameId,
      accessCode,
      expiresAt,
      createdBy: user?.id || null,
    });

    setSaving(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    setEnabled(true);
    setMessage("Marcação pública habilitada. Compartilhe o link e o código.");
  }

  async function handleDisable() {
    setSaving(true);
    setError("");
    const result = await disableMatchScoring(gameId);
    setSaving(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    setEnabled(false);
    setMessage("Marcação encerrada e funções de anotador liberadas.");
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(
      `${scoringUrl}\nCódigo da partida: ${accessCode}`,
    );
    setMessage("Link e código copiados.");
  }

  return (
    <div className="admin-tab admin-scoring">
      <header>
        <h3>Modo Anotador</h3>
        <p>Prepare o acesso público antes da partida e compartilhe com os dois anotadores.</p>
      </header>

      <label>
        Partida
        <select value={gameId} onChange={(event) => {
          setGameId(event.target.value);
          setEnabled(false);
          setMessage("");
        }}>
          {games.map((game) => (
            <option key={game.id} value={game.id}>{gameLabel(game)}</option>
          ))}
        </select>
      </label>

      <label>
        Código de acesso
        <div className="admin-scoring__code-row">
          <input
            inputMode="numeric"
            maxLength={8}
            value={accessCode}
            onChange={(event) => setAccessCode(event.target.value.replace(/\D/g, ""))}
          />
          <Button variant="secondary" onClick={() => setAccessCode(generateAccessCode())}>
            Gerar outro
          </Button>
        </div>
      </label>

      {scoringUrl && (
        <div className="admin-scoring__share">
          <span>Link público</span>
          <strong>{scoringUrl}</strong>
          <span>Código: {accessCode}</span>
        </div>
      )}

      {error && <p className="admin-tab__restricted">{error}</p>}
      {message && <p className="admin-scoring__message">{message}</p>}

      <div className="admin-scoring__actions">
        <Button onClick={handleEnable} disabled={saving || !gameId}>
          {saving ? "Salvando..." : enabled ? "Atualizar acesso" : "Habilitar marcação"}
        </Button>
        <Button variant="secondary" onClick={handleCopy} disabled={!enabled}>
          Copiar convite
        </Button>
        {enabled && (
          <Button variant="warning" onClick={handleDisable} disabled={saving}>
            Encerrar marcação
          </Button>
        )}
      </div>
    </div>
  );
}
