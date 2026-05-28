// Página de detalhe do jogo — lista de inscritos, espera e regras de entrada

import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import JoinList from "../../components/JoinList/JoinList";
import {
  getGameById,
  getGameRegistrations,
  getGameTeams,
} from "../../data/supabaseService";
import { GAME_DAYS, PLAYER_STATUS, PLAYER_TYPE } from "../../domain/constants";
import "./GameDetail.css";

function formatName(player) {
  if (player.nickname) return `${player.name} (${player.nickname})`;
  return player.name;
}

function normalizeGame(game) {
  if (!game) return null;

  return {
    ...game,
    mapUrl: game.map_url ?? game.mapUrl ?? null,
  };
}

function buildListsFromRegistrations(registrations) {
  const list = { main: [], waitlist: [], guests: [] };

  registrations.forEach((registration) => {
    const slot = registration.slot || "main";
    const player = registration.player;
    const inviterName = registration.inviter?.name || null;

    if (player) {
      const normalizedPlayer = {
        id: player.id,
        name: player.name,
        nickname: player.nickname || null,
        whatsapp: player.whatsapp,
        type: player.type,
        gender: player.gender,
        status: player.status,
      };

      if (slot === "waitlist") {
        list.waitlist.push(normalizedPlayer);
      } else if (slot === "guests" || player.type === PLAYER_TYPE.GUEST) {
        list.guests.push({ ...normalizedPlayer, invitedBy: inviterName });
      } else {
        list.main.push(normalizedPlayer);
      }
      return;
    }

    if (registration.guest_name) {
      list.guests.push({
        id: registration.id,
        name: registration.guest_name,
        nickname: null,
        type: PLAYER_TYPE.GUEST,
        gender: null,
        status: PLAYER_STATUS.ACTIVE,
        invitedBy: inviterName,
      });
    }
  });

  return list;
}

function GameDetail() {
  const { id } = useParams();
  const [reloadVersion, setReloadVersion] = useState(0);
  const [game, setGame] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadGameDetail() {
      setLoading(true);

      const [supabaseGame, supabaseRegistrations, supabaseTeams] =
        await Promise.all([
          getGameById(id),
          getGameRegistrations(id),
          getGameTeams(id),
        ]);

      if (!active) return;

      setGame(normalizeGame(supabaseGame));
      setRegistrations(supabaseRegistrations || []);
      setTeams(supabaseTeams || []);
      setLoading(false);
    }

    loadGameDetail();

    return () => {
      active = false;
    };
  }, [id, reloadVersion]);

  if (loading) {
    return (
      <div className="game-detail">
        <p className="game-detail__state">Carregando detalhes do jogo...</p>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="game-detail">
        <p className="game-detail__not-found">Jogo não encontrado.</p>
      </div>
    );
  }

  const isSunday = game.day === GAME_DAYS.SUNDAY;
  const supabaseList = buildListsFromRegistrations(registrations);
  const mainPlayers = supabaseList.main;
  const waitlist = supabaseList.waitlist;
  const guests = supabaseList.guests;
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

      {teams.length > 0 && (
        <div className="game-detail__section">
          <h3 className="game-detail__section-title">Times</h3>
          <div className="game-detail__teams">
            {teams.map((team) => (
              <div
                key={team.id || team.team_name}
                className="game-detail__team-card"
              >
                <div className="game-detail__team-head">
                  <span className="game-detail__team-name">
                    {team.team_name}
                  </span>
                </div>
                <ul className="game-detail__list">
                  {(team.players || []).map((player) => (
                    <li
                      key={`${team.team_name}-${player.id || player.name}`}
                      className="game-detail__item"
                    >
                      <span className="game-detail__name">
                        {formatName(player)}
                      </span>
                      <span className="game-detail__player-gender">
                        {player.gender === "F" ? "♀" : "♂"}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="game-detail__action">
        <JoinList
          game={game}
          onUpdate={() => setReloadVersion((prev) => prev + 1)}
        />
      </div>
    </div>
  );
}

export default GameDetail;
