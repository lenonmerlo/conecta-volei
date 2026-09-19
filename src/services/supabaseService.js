// Serviço de integração com o Supabase.
// As implementações ficam em src/services/supabase/.

export {
  logAction,
  getAuditLogs,
} from "./supabase/audit.js";

export {
  registerPlayer,
  getPlayerByWhatsapp,
  getPlayerById,
  getAllPlayers,
  getPublicPlayers,
  getPendingPlayers,
  deletePlayer,
  updatePlayerStatus,
  updatePlayerInjuryLeave,
  isSaturdayAfter21h,
  addWarning,
  removeWarning,
  resetWarnings,
  updatePlayerLevel,
  updatePlayerPosition,
  updatePlayerSpecialBadges,
  updatePlayerProfile,
  getPlayerStats,
  penalizePlayer,
} from "./supabase/players.js";

export {
  registerGuest,
  updateGuestLevel,
} from "./supabase/guests.js";

export {
  getGames,
  getAuditGameOptions,
  createGame,
  updateGame,
  cancelGame,
  getGameById,
  getCurrentGameIdForDay,
  resolveGameId,
  getSundayGamesHistory,
} from "./supabase/games.js";

export {
  autoMigrateGuests,
  getGameRegistrations,
  getRegistrationCountsByGame,
  joinGame,
  leaveGame,
  promoteFromWaitlist,
  migrateGuestsToWaitlist,
  isPlayerRegistered,
  getGuestsByInviter,
  getGuestsByInviterFromTable,
  removeGuest,
} from "./supabase/registrations.js";

export {
  uploadAvatar,
  updatePlayerAvatar,
} from "./supabase/avatars.js";

export {
  saveGameTeams,
  getGameTeams,
} from "./supabase/teams.js";

export {
  getGamePresences,
  upsertPresence,
  markAbsenceAndWarn,
} from "./supabase/presences.js";

export {
  getActiveAnnouncements,
  getAllAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
} from "./supabase/announcements.js";

export {
  submitVote,
  getVotesByGame,
  getMyVotes,
  getVotingResults,
} from "./supabase/votes.js";