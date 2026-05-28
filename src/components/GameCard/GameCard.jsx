// Componente de card de jogo — exibido na Home

import { useNavigate } from "react-router-dom";
import { isListOpen } from "../../domain/gameRules";
import "./GameCard.css";

function GameCard({ game, registeredCount = 0 }) {
  const navigate = useNavigate();
  const dayLabel = game.day === "wednesday" ? "Quarta-feira" : "Domingo";
  const spotsLeft = 21 - registeredCount;
  const isFull = spotsLeft <= 0;
  const listOpen = isListOpen(game.day);
  const isInteractive = listOpen;

  function openGame() {
    if (!isInteractive) return;
    navigate(`/game/${game.id}`);
  }

  function handleKeyDown(e) {
    if (!isInteractive) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openGame();
    }
  }

  return (
    <div
      className={`game-card ${isFull ? "game-card--full" : ""} ${
        !listOpen ? "game-card--list-closed" : ""
      } ${isInteractive ? "game-card--interactive" : "game-card--disabled"}`}
      onClick={isInteractive ? openGame : undefined}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={isInteractive ? 0 : -1}
      aria-disabled={!isInteractive}
    >
      <div className="game-card__header">
        <span className="game-card__day">{dayLabel}</span>
        <span className="game-card__time">{game.time}</span>
      </div>
      <div className="game-card__body">
        <p className="game-card__location">{game.location}</p>
        <p className="game-card__date">{game.date}</p>
        {game.mapUrl && (
          <a
            className="game-card__map-link"
            href={game.mapUrl}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
          >
            Ver mapa
          </a>
        )}
      </div>
      <div className="game-card__footer">
        <span className="game-card__spots">{registeredCount}/21 inscritos</span>
        <span
          className={`game-card__list-pill ${
            listOpen
              ? "game-card__list-pill--open"
              : "game-card__list-pill--closed"
          }`}
        >
          {listOpen ? "Lista aberta" : "Lista fechada"}
        </span>
        {!isFull ? (
          <span className="game-card__badge game-card__badge--open">
            {spotsLeft} vagas
          </span>
        ) : (
          <span className="game-card__badge game-card__badge--full">
            Lista cheia
          </span>
        )}
      </div>
    </div>
  );
}

export default GameCard;
