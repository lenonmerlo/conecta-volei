// Página de detalhe do jogo — lista de inscritos, espera e regras de entrada

import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import JoinList from "../../components/JoinList/JoinList";
import {
  getGameById,
  getGameRegistrations,
  getGameTeams,
} from "../../data/supabaseService";
import { PLAYER_STATUS, PLAYER_TYPE } from "../../domain/constants";
import { supabase } from "../../lib/supabase";
import "./GameDetail.css";

function getDayLabel(dateStr) {
  const days = [
    "Domingo",
    "Segunda-feira",
    "Terça-feira",
    "Quarta-feira",
    "Quinta-feira",
    "Sexta-feira",
    "Sábado",
  ];

  const date = new Date(`${dateStr}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return "Data inválida";
  return days[date.getUTCDay()];
}

function normalizeLocation(value) {
  return (value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function normalizeComparableName(value) {
  return (value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function getFixedMapUrlByLocation(location) {
  const normalized = normalizeLocation(location);

  if (normalized.includes("jardim camburi")) {
    return "https://maps.app.goo.gl/CrL7HdThrLErg3TQ7";
  }

  if (
    normalized.includes("ilha de santa maria") ||
    normalized.includes("ilha de sta maria")
  ) {
    return "https://maps.app.goo.gl/rQgsrSFC3WmMBci7A";
  }

  return null;
}

function formatName(player) {
  if (player.nickname) return `${player.name} (${player.nickname})`;
  return player.name;
}

function hasCaptainBadge(player) {
  return Boolean(player.is_captain ?? player.isCaptain);
}

function hasSetterBadge(player) {
  return Boolean(player.is_setter ?? player.isSetter);
}

function normalizeGame(game) {
  if (!game) return null;

  const fixedUrl = getFixedMapUrlByLocation(game.location);

  return {
    ...game,
    mapUrl: fixedUrl || game.map_url || game.mapUrl || null,
  };
}

function buildListsFromRegistrations(registrations, isSundayGame) {
  const list = { main: [], waitlist: [], guests: [] };

  registrations.forEach((r) => {
    const slot = r.slot || "main";
    const player = r.player;
    const inviter = r.inviter || null;
    const inviterName = r.inviter?.name || null;

    if (player) {
      const normalizedPlayer = {
        id: player.id,
        name: player.name,
        nickname: player.nickname || null,
        whatsapp: player.whatsapp,
        type: player.type,
        gender: player.gender,
        status: player.status,
        is_captain: Boolean(r.player?.is_captain ?? r.player?.isCaptain),
        is_setter: Boolean(r.player?.is_setter ?? r.player?.isSetter),
        position: player.position || "all-around",
      };

      if (slot === "waitlist") {
        list.waitlist.push(normalizedPlayer);
      } else if (
        isSundayGame &&
        (slot === "guests" || player.type === PLAYER_TYPE.GUEST)
      ) {
        list.guests.push({ ...normalizedPlayer, invitedBy: inviterName });
      } else {
        list.main.push(normalizedPlayer);
      }
      return;
    }

    if (r.guest_id && !player) {
      const guestName = r.guest?.name || r.guest_name || "Convidado";
      const isPenalizedMemberProxy =
        Boolean(inviterName) &&
        normalizeComparableName(guestName) ===
          normalizeComparableName(inviterName);

      const normalizedGuest = {
        id: isPenalizedMemberProxy
          ? inviter?.id || `guest-${r.guest?.id || r.guest_id}`
          : `guest-${r.guest?.id || r.guest_id}`,
        name: isPenalizedMemberProxy ? inviter?.name || guestName : guestName,
        nickname: isPenalizedMemberProxy ? inviter?.nickname || null : null,
        type: isPenalizedMemberProxy ? PLAYER_TYPE.MEMBER : PLAYER_TYPE.GUEST,
        gender: isPenalizedMemberProxy
          ? inviter?.gender || r.guest?.gender || null
          : r.guest?.gender || null,
        status: isPenalizedMemberProxy
          ? inviter?.status || PLAYER_STATUS.ACTIVE
          : PLAYER_STATUS.ACTIVE,
        is_captain: isPenalizedMemberProxy
          ? Boolean(inviter?.is_captain ?? inviter?.isCaptain)
          : false,
        is_setter: isPenalizedMemberProxy
          ? Boolean(inviter?.is_setter ?? inviter?.isSetter)
          : false,
        position: isPenalizedMemberProxy
          ? inviter?.position || "all-around"
          : "all-around",
        skill_level: Number(r.guest?.skill_level ?? 3),
        invitedBy: isPenalizedMemberProxy ? null : inviterName,
      };

      if (isSundayGame && slot === "guests") {
        list.guests.push(normalizedGuest);
      } else if (slot === "waitlist") {
        list.waitlist.push(normalizedGuest);
      } else {
        list.main.push(normalizedGuest);
      }
      return;
    }

    if (r.guest_name) {
      const isPenalizedMemberProxy =
        Boolean(inviterName) &&
        normalizeComparableName(r.guest_name) ===
          normalizeComparableName(inviterName);

      const normalizedGuest = {
        id: isPenalizedMemberProxy
          ? inviter?.id || `guest-legacy-${r.id}`
          : `guest-legacy-${r.id}`,
        name: isPenalizedMemberProxy
          ? inviter?.name || r.guest_name
          : r.guest_name,
        nickname: isPenalizedMemberProxy ? inviter?.nickname || null : null,
        type: isPenalizedMemberProxy ? PLAYER_TYPE.MEMBER : PLAYER_TYPE.GUEST,
        gender: isPenalizedMemberProxy ? inviter?.gender || null : null,
        status: isPenalizedMemberProxy
          ? inviter?.status || PLAYER_STATUS.ACTIVE
          : PLAYER_STATUS.ACTIVE,
        is_captain: isPenalizedMemberProxy
          ? Boolean(inviter?.is_captain ?? inviter?.isCaptain)
          : false,
        is_setter: isPenalizedMemberProxy
          ? Boolean(inviter?.is_setter ?? inviter?.isSetter)
          : false,
        position: isPenalizedMemberProxy
          ? inviter?.position || "all-around"
          : "all-around",
        skill_level: 3,
        invitedBy: isPenalizedMemberProxy ? null : inviterName,
      };

      if (isSundayGame && slot === "guests") {
        list.guests.push(normalizedGuest);
      } else if (slot === "waitlist") {
        list.waitlist.push(normalizedGuest);
      } else {
        list.main.push(normalizedGuest);
      }
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

  const fetchData = useCallback(async () => {
    setLoading(true);

    const [supabaseGame, supabaseRegistrations, supabaseTeams] =
      await Promise.all([
        getGameById(id),
        getGameRegistrations(id),
        getGameTeams(id),
      ]);

    setGame(normalizeGame(supabaseGame));
    setRegistrations(supabaseRegistrations || []);
    setTeams(supabaseTeams || []);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchData();
    }, 0);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [fetchData, reloadVersion]);

  useEffect(() => {
    const channel = supabase
      .channel(`game-${id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "game_registrations",
          filter: `game_id=eq.${id}`,
        },
        () => fetchData(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, fetchData]);

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

  const isSundayGame = game.day === "sunday";
  const supabaseList = buildListsFromRegistrations(registrations, isSundayGame);
  const mainPlayers = supabaseList.main;
  const waitlist = supabaseList.waitlist;
  const guests = supabaseList.guests;
  const mainListDisplay = mainPlayers;
  const dayLabel = getDayLabel(game.date);

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
          {`Lista Principal (${mainListDisplay.length})`}
        </h3>
        {mainListDisplay.length === 0 && (
          <p className="game-detail__empty">
            Nenhum jogador na lista principal.
          </p>
        )}
        <ul className="game-detail__list">
          {mainListDisplay.map((player, i) => (
            <li key={player.id} className="game-detail__item">
              <span className="game-detail__position">{i + 1}</span>
              <span className="game-detail__name">{formatName(player)}</span>
              {player.is_captain && (
                <span className="game-detail__badge game-detail__badge--captain">
                  C
                </span>
              )}
              {player.is_setter && (
                <span className="game-detail__badge game-detail__badge--setter">
                  L
                </span>
              )}
              {player.status === PLAYER_STATUS.PENALIZED && (
                <span className="game-detail__badge game-detail__badge--penalized">
                  Penalizado
                </span>
              )}
              {player.type === PLAYER_TYPE.GUEST && player.invitedBy && (
                <span className="game-detail__invited-by">
                  por {player.invitedBy}
                </span>
              )}
              {player.type === PLAYER_TYPE.GUEST && (
                <span className="game-detail__badge game-detail__badge--guest">
                  Convidado
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div className="game-detail__section">
        <h3 className="game-detail__section-title">
          Lista de Espera ({waitlist.length})
        </h3>
        {waitlist.length === 0 && (
          <p className="game-detail__empty">
            Nenhum jogador na lista de espera.
          </p>
        )}
        <ul className="game-detail__list">
          {waitlist.map((p, i) => (
            <li key={p.id} className="game-detail__item">
              <span className="game-detail__position">{i + 1}</span>
              <span className="game-detail__name">{formatName(p)}</span>
              {p.type === PLAYER_TYPE.MEMBER && p.is_captain && (
                <span className="game-detail__badge game-detail__badge--captain">
                  C
                </span>
              )}
              {p.type === PLAYER_TYPE.MEMBER && p.is_setter && (
                <span className="game-detail__badge game-detail__badge--setter">
                  L
                </span>
              )}
              {p.type === PLAYER_TYPE.GUEST && p.invitedBy && (
                <span className="game-detail__invited-by">
                  por {p.invitedBy}
                </span>
              )}
              {p.type === PLAYER_TYPE.GUEST && (
                <span className="game-detail__badge game-detail__badge--guest">
                  Convidado
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>

      {isSundayGame && (
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
                      <span className="game-detail__player-meta">
                        {hasCaptainBadge(player) && (
                          <span className="game-detail__badge game-detail__badge--captain">
                            C
                          </span>
                        )}
                        {hasSetterBadge(player) && (
                          <span className="game-detail__badge game-detail__badge--setter">
                            L
                          </span>
                        )}
                        <span className="game-detail__player-gender">
                          {player.gender === "F" ? "♀" : "♂"}
                        </span>
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
