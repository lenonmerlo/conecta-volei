// Página de detalhe do jogo — lista de inscritos, espera e regras de entrada

import { useParams } from "react-router-dom";
import Button from "../../components/Button/Button";
import { mockGames, mockPlayers } from "../../data/mockGames";
import { GAME_DAYS, PLAYER_STATUS, PLAYER_TYPE } from "../../domain/constants";
import "./GameDetail.css";

function formatName(player) {
  if (player.nickname) return `${player.name} (${player.nickname})`;
  return player.name;
}

function getPlayerById(id) {
  return mockPlayers.find((p) => p.id === id);
}

function GameDetail() {
  const { id } = useParams();
  const game = mockGames.find((g) => g.id === id);

  if (!game) {
    return (
      <div className="game-detail">
        <p className="game-detail__not-found">Jogo não encontrado.</p>
      </div>
    );
  }

  const isSunday = game.day === GAME_DAYS.SUNDAY;
  const players = game.players.map(getPlayerById).filter(Boolean);
  const waitlist = game.waitlist.map(getPlayerById).filter(Boolean);

  const members = players.filter((p) => p.type === PLAYER_TYPE.MEMBER);
  const guests = players.filter((p) => p.type === PLAYER_TYPE.GUEST);

  const dayLabel = isSunday ? "Domingo" : "Quarta-feira";

  return (
    <div className="game-detail">
      <div className="game-detail__header">
        <h2 className="game-detail__day">{dayLabel}</h2>
        <p className="game-detail__info">
          {game.date} às {game.time}
        </p>
        <p className="game-detail__info">{game.location}</p>
        <span className="game-detail__count">
          {players.length}/21 inscritos
        </span>
      </div>

      <div className="game-detail__section">
        <h3 className="game-detail__section-title">
          Membros ({members.length})
        </h3>
        {members.length === 0 && (
          <p className="game-detail__empty">Nenhum membro inscrito.</p>
        )}
        <ul className="game-detail__list">
          {members.map((p, i) => (
            <li key={p.id} className="game-detail__item">
              <span className="game-detail__position">{i + 1}</span>
              <span className="game-detail__name">{formatName(p)}</span>
              {p.status === PLAYER_STATUS.PENALIZED && (
                <span className="game-detail__badge game-detail__badge--penalized">
                  Penalizado
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div className="game-detail__section">
        <h3 className="game-detail__section-title">
          Convidados ({guests.length})
        </h3>
        {guests.length === 0 && (
          <p className="game-detail__empty">Nenhum convidado inscrito.</p>
        )}
        <ul className="game-detail__list">
          {guests.map((p, i) => (
            <li key={p.id} className="game-detail__item">
              <span className="game-detail__position">{i + 1}</span>
              <span className="game-detail__name">{formatName(p)}</span>
              <span className="game-detail__badge game-detail__badge--guest">
                Convidado
              </span>
            </li>
          ))}
        </ul>
      </div>

      {waitlist.length > 0 && (
        <div className="game-detail__section">
          <h3 className="game-detail__section-title">
            Lista de Espera ({waitlist.length})
          </h3>
          <ul className="game-detail__list">
            {waitlist.map((p, i) => (
              <li key={p.id} className="game-detail__item">
                <span className="game-detail__position">{i + 1}</span>
                <span className="game-detail__name">{formatName(p)}</span>
                {p.type === PLAYER_TYPE.GUEST && (
                  <span className="game-detail__badge game-detail__badge--guest">
                    Convidado
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="game-detail__action">
        <Button>Entrar na lista</Button>
      </div>
    </div>
  );
}

export default GameDetail;
