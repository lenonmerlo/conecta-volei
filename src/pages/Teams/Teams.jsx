// Página pública de visualização dos times sorteados

import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./Teams.css";

function formatName(player) {
  return `${player.name}${player.nickname ? ` (${player.nickname})` : ""}`;
}

function getBadgesText(player) {
  let suffix = "";
  if (player.is_captain) suffix += " (C)";
  if (player.is_setter) suffix += " (L)";
  return suffix;
}

function buildWhatsappText(teams) {
  const lines = ["🏐 *Times de Hoje*", ""];

  teams.forEach((team) => {
    lines.push(`*${team.name}*`);
    (team.players || []).forEach((player, index) => {
      lines.push(`${index + 1}. ${formatName(player)}${getBadgesText(player)}`);
    });
    lines.push("");
  });

  return lines.join("\n").trim();
}

function Teams() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const teams = state?.teams;
  const gameId = state?.gameId;
  const [copyNotice, setCopyNotice] = useState(null);

  useEffect(() => {
    if (!copyNotice) return undefined;

    const timeoutId = setTimeout(() => {
      setCopyNotice(null);
    }, 2600);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [copyNotice]);

  async function handleCopyToWhatsapp() {
    if (!teams || teams.length === 0) return;
    const text = buildWhatsappText(teams);
    try {
      await navigator.clipboard.writeText(text);
      setCopyNotice({
        type: "success",
        message: "Times copiados. Agora é só colar no WhatsApp.",
      });
    } catch {
      setCopyNotice({
        type: "error",
        message: "Não foi possível copiar. Tente novamente.",
      });
    }
  }

  if (!teams) {
    return (
      <div className="teams">
        <p className="teams__empty">Nenhum time sorteado ainda.</p>
        <button className="teams__back" onClick={() => navigate("/admin")}>
          Ir para o Admin
        </button>
      </div>
    );
  }

  return (
    <div className="teams">
      {copyNotice && (
        <div
          className={`teams__notice teams__notice--${copyNotice.type}`}
          role="status"
          aria-live="polite"
        >
          {copyNotice.message}
        </div>
      )}

      <h2 className="teams__title">Times de Hoje</h2>

      <div className="teams__list">
        {teams.map((team) => {
          const females = team.players.filter((p) => p.gender === "F");
          const males = team.players.filter((p) => p.gender === "M");

          return (
            <div key={team.name} className="teams__team">
              <div className="teams__team-header">
                <span className="teams__team-name">{team.name}</span>
              </div>

              <ul className="teams__player-list">
                {females.map((p) => (
                  <li
                    key={p.id}
                    className="teams__player teams__player--female"
                  >
                    <span className="teams__player-name">{formatName(p)}</span>
                    <div className="teams__player-meta">
                      {p.is_captain && (
                        <span className="teams__badge teams__badge--captain">
                          C
                        </span>
                      )}
                      {p.is_setter && (
                        <span className="teams__badge teams__badge--setter">
                          L
                        </span>
                      )}
                      <span className="teams__player-gender">♀</span>
                    </div>
                  </li>
                ))}
                {males.map((p) => (
                  <li key={p.id} className="teams__player">
                    <span className="teams__player-name">{formatName(p)}</span>
                    <div className="teams__player-meta">
                      {p.is_captain && (
                        <span className="teams__badge teams__badge--captain">
                          C
                        </span>
                      )}
                      {p.is_setter && (
                        <span className="teams__badge teams__badge--setter">
                          L
                        </span>
                      )}
                      <span className="teams__player-gender">♂</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      <div className="teams__actions">
        <button className="teams__back" onClick={handleCopyToWhatsapp}>
          Copiar para WhatsApp
        </button>
        {gameId && (
          <button
            className="teams__back"
            onClick={() => navigate(`/game/${gameId}`)}
          >
            Ver no jogo
          </button>
        )}
        <button className="teams__back" onClick={() => navigate(-1)}>
          Voltar
        </button>
      </div>
    </div>
  );
}

export default Teams;
