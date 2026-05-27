// Componente de card de jogo — exibido na Home

import { useNavigate } from 'react-router-dom'
import './GameCard.css'

function GameCard({ game }) {
  const navigate = useNavigate()
  const dayLabel = game.day === 'wednesday' ? 'Quarta-feira' : 'Domingo'
  const spotsLeft = 21 - game.players.length

  return (
    <div className="game-card" onClick={() => navigate(`/game/${game.id}`)}>
      <div className="game-card__header">
        <span className="game-card__day">{dayLabel}</span>
        <span className="game-card__time">{game.time}</span>
      </div>
      <div className="game-card__body">
        <p className="game-card__location">{game.location}</p>
        <p className="game-card__date">{game.date}</p>
      </div>
      <div className="game-card__footer">
        <span className="game-card__spots">
          {game.players.length}/21 inscritos
        </span>
        {spotsLeft > 0 ? (
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
  )
}

export default GameCard