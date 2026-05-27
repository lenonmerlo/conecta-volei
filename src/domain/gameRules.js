import { MAX_PLAYERS, PLAYER_STATUS, PLAYER_TYPE } from "./constants";

export function hasSpotAvailable(currentCount) {
  return currentCount < MAX_PLAYERS;
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
