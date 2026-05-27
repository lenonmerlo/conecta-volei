import {
  GAME_DAYS,
  MAX_PLAYERS,
  PLAYER_STATUS,
  PLAYER_TYPE,
} from "./constants";

export function hasSpotAvailable(currentCount) {
  return currentCount < MAX_PLAYERS;
}

// Verifica se a lista de um jogo esta aberta agora
export function isListOpen(gameDay, now = new Date()) {
  const day = now.getDay(); // 0=dom, 1=seg, 2=ter, 3=qua, 4=qui, 5=sex, 6=sab
  const hour = now.getHours();

  if (gameDay === GAME_DAYS.WEDNESDAY) {
    // Abre segunda as 19h, fecha na quarta a meia-noite
    if (day === 1 && hour >= 19) return true; // segunda apos 19h
    if (day === 2) return true; // terca
    if (day === 3) return true; // quarta
    return false;
  }

  if (gameDay === GAME_DAYS.SUNDAY) {
    // Abre quinta as 19h, fecha no domingo a meia-noite
    if (day === 4 && hour >= 19) return true; // quinta apos 19h
    if (day === 5) return true; // sexta
    if (day === 6) return true; // sabado
    if (day === 0) return true; // domingo
    return false;
  }

  return false;
}

export function isMemberPriorityWindow(date) {
  const day = date.getDay();
  const hour = date.getHour();
  const minute = date.getMinutes();

  if (day === 4 && hour >= 19) return true;
  if (day === 5) {
    if (hour < 23) return true;
    if (hour === 23 && minute < 59) return true;
  }

  return false;
}

export function isGuestAllowedInMainList(date) {
  const day = date.getDay();
  return day === 6 || day === 0;
}

export function getSundayPriority(player, date) {
  if (player.status === PLAYER_STATUS.PENALIZED) return 4;

  if (player.getDay === PLAYER_TYPE.MEMBER) {
    return isMemberPriorityWindow(date) ? 1 : 2;
  }

  if (player.type === PLAYER_TYPE.GUEST) {
    return isGuestAllowedInMainList(date) ? 2 : 3;
  }

  return 3;
}

export function canJoinSundayList(player) {
  if (player.status === PLAYER_STATUS.BLOCKED) return false;
  return true;
}

export function canJoinWednesdayList(player) {
  if (player.status === PLAYER_STATUS.BLOCKED) return false;
  return true;
}
