// Dados mockados dos jogos da semana

import { GAME_DAYS, PLAYER_STATUS, PLAYER_TYPE } from '../domain/constants.js';

export const mockPlayers = [
  { id: '1',  name: 'Lenon Merlo',     nickname: null,      type: PLAYER_TYPE.MEMBER, status: PLAYER_STATUS.ACTIVE,    gender: 'M', skillLevel: 3.5 },
  { id: '2',  name: 'Carlos Silva',    nickname: 'Cadu',    type: PLAYER_TYPE.MEMBER, status: PLAYER_STATUS.ACTIVE,    gender: 'M', skillLevel: 3.0 },
  { id: '3',  name: 'Fernanda Rocha',  nickname: 'Fê',      type: PLAYER_TYPE.MEMBER, status: PLAYER_STATUS.ACTIVE,    gender: 'F', skillLevel: 2.5 },
  { id: '4',  name: 'Rafael Souza',    nickname: null,      type: PLAYER_TYPE.MEMBER, status: PLAYER_STATUS.ACTIVE,    gender: 'M', skillLevel: 4.0 },
  { id: '5',  name: 'Juliana Pires',   nickname: 'Jú',      type: PLAYER_TYPE.MEMBER, status: PLAYER_STATUS.ACTIVE,    gender: 'F', skillLevel: 3.0 },
  { id: '6',  name: 'Bruno Lima',      nickname: null,      type: PLAYER_TYPE.MEMBER, status: PLAYER_STATUS.PENALIZED, gender: 'M', skillLevel: 2.0 },
  { id: '7',  name: 'Mariana Costa',   nickname: 'Mari',    type: PLAYER_TYPE.MEMBER, status: PLAYER_STATUS.ACTIVE,    gender: 'F', skillLevel: 3.5 },
  { id: '8',  name: 'Pedro Alves',     nickname: 'Pedrão',  type: PLAYER_TYPE.GUEST,  status: PLAYER_STATUS.ACTIVE,    gender: 'M', skillLevel: 2.0 },
  { id: '9',  name: 'Tatiane Mendes',  nickname: null,      type: PLAYER_TYPE.GUEST,  status: PLAYER_STATUS.ACTIVE,    gender: 'F', skillLevel: 1.5 },
  { id: '10', name: 'Diego Ferreira',  nickname: 'Diegão',  type: PLAYER_TYPE.MEMBER, status: PLAYER_STATUS.ACTIVE,    gender: 'M', skillLevel: 4.5 },
];

export const mockGames = [
  {
    id: 'wed-2026-05-27',
    day: GAME_DAYS.WEDNESDAY,
    date: '2026-05-27',
    location: 'Quadra do Bairro',
    time: '20:00',
    players: ['1', '2', '3', '4', '5', '6', '7', '8'],
    waitlist: [],
  },
  {
    id: 'sun-2026-06-01',
    day: GAME_DAYS.SUNDAY,
    date: '2026-06-01',
    location: 'Quadra do Bairro',
    time: '08:00',
    players: ['1', '2', '3', '4', '5', '7', '10'],
    waitlist: ['8', '9'],
  },
];