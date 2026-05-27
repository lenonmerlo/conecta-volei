// Página de detalhe do jogo — lista de inscritos, espera e regras de entrada

import { useState } from "react";
import { useParams } from "react-router-dom";
import JoinList from "../../components/JoinList/JoinList";
import { getGameList } from "../../data/listStorage";
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
  const [, setListVersion] = useState(0);
  const game = mockGames.find((g) => g.id === id);

  if (!game) {
    return (
      <div className="game-detail">
        <p className="game-detail__not-found">Jogo não encontrado.</p>
      </div>
    );
  }

  const isSunday = game.day === GAME_DAYS.SUNDAY;
  const storedList = getGameList(game.id);
  const hasStoredEntries =
    storedList.main.length > 0 ||
    storedList.waitlist.length > 0 ||
    storedList.guests.length > 0;

  const fallbackPlayers = game.players.map(getPlayerById).filter(Boolean);
  const fallbackWaitlist = game.waitlist.map(getPlayerById).filter(Boolean);

  const mainPlayers = hasStoredEntries ? storedList.main : fallbackPlayers;
  const waitlist = hasStoredEntries ? storedList.waitlist : fallbackWaitlist;
  const guests = hasStoredEntries
    ? storedList.guests
    : fallbackPlayers.filter((p) => p.type === PLAYER_TYPE.GUEST);
  const members = mainPlayers.filter((p) => p.type === PLAYER_TYPE.MEMBER);

  const dayLabel = isSunday ? "Domingo" : "Quarta-feira";

  return (
    <div className="game-detail">
      <div className="game-detail__header">
        <h2 className="game-detail__day">{dayLabel}</h2>
        <p className="game-detail__info">
          {game.date} às {game.time}
        </p>
        <p className="game-detail__info">{game.location}</p>
        {game.mapUrl && (
          <a
            className="game-detail__map-link"
            href={game.mapUrl}
            target="_blank"
            rel="noreferrer"
          >
            Abrir no mapa
          </a>
        )}
        <span className="game-detail__count">
          {mainPlayers.length}/21 inscritos
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
              {p.invitedBy && (
                <span className="game-detail__invited-by">
                  por {p.invitedBy}
                </span>
              )}
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
        <JoinList
          game={game}
          onUpdate={() => setListVersion((prev) => prev + 1)}
        />
      </div>
    </div>
  );
}

export default GameDetail;
