// Componente de card de jogo — exibido na Home

import { useNavigate } from "react-router-dom";
import "./GameCard.css";

function GameCard({ game }) {
  const navigate = useNavigate();
  const dayLabel = game.day === "wednesday" ? "Quarta-feira" : "Domingo";
  const spotsLeft = 21 - game.players.length;
  const isFull = spotsLeft <= 0;

  function openGame() {
    navigate(`/game/${game.id}`);
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openGame();
    }
  }

  return (
    <div
      className={`game-card ${isFull ? "game-card--full" : ""}`}
      onClick={openGame}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
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
        <span className="game-card__spots">
          {game.players.length}/21 inscritos
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
