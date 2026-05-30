export const MAX_PLAYERS = 21;
export const PLAYERS_PER_TEAM = 7;
export const TOTAL_TEAMS = 3;

export const GAME_DAYS = {
  WEDNESDAY: "wednesday",
  SUNDAY: "sunday",
};

export const LIST_OPEN_TIMES = {
  WEDNESDAY: { day: "monday", hour: 19 },
  SUNDAY: { day: "thursday", hour: 19 },
};

export const MEMBER_PRIORITY_WINDOW = {
  endsDay: "friday",
  endsHour: 23,
  endsMinute: 59,
};

export const LATE_WITHDRAWAL_WINDOW = {
  day: "saturday",
  startHour: 18,
  endHour: 19,
};

export const ABSENCE_REFERENCE_SUNDAYS = 8;

export const MAX_LATENESS_MINUTES = 30;

export const PLAYER_STATUS = {
  ACTIVE: "active",
  pending: "pending",
  INACTIVE: "inactive",
  PENALIZED: "penalized",
  BLOCKED: "blocked",
};

export const PLAYER_TYPE = {
  MEMBER: "member",
  GUEST: "guest",
};

export const SKILL_LEVELS = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];
