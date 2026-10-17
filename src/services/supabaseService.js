// Serviço de integração com o Supabase.
// As implementações ficam em src/services/supabase/.

export { getAuditLogs, logAction } from "./supabase/audit.js";

export {
  addWarning,
  deletePlayer,
  getAllPlayers,
  getPendingPlayers,
  getPlayerById,
  getPlayerByWhatsapp,
  getPlayerStats,
  getPublicPlayers,
  isSaturdayAfter21h,
  penalizePlayer,
  registerPlayer,
  removeWarning,
  resetWarnings,
  updatePlayerInjuryLeave,
  updatePlayerLevel,
  updatePlayerPosition,
  updatePlayerProfile,
  updatePlayerSpecialBadges,
  updatePlayerStatus,
} from "./supabase/players.js";

export { registerGuest, updateGuestLevel } from "./supabase/guests.js";

export {
  cancelGame,
  createGame,
  getAuditGameOptions,
  getCurrentGameIdForDay,
  getGameById,
  getGameContext,
  getGames,
  getSundayGamesHistory,
  resolveGameId,
  updateGame,
} from "./supabase/games.js";

export {
  autoMigrateGuests,
  getGameRegistrations,
  getGuestsByInviter,
  getGuestsByInviterFromTable,
  getRegistrationCountsByGame,
  isPlayerRegistered,
  joinGame,
  leaveGame,
  migrateGuestsToWaitlist,
  promoteFromWaitlist,
  removeGuest,
} from "./supabase/registrations.js";

export { updatePlayerAvatar, uploadAvatar } from "./supabase/avatars.js";

export { getGameTeams, saveGameTeams } from "./supabase/teams.js";

export {
  getGamePresences,
  markAbsenceAndWarn,
  upsertPresence,
} from "./supabase/presences.js";

export {
  createAnnouncement,
  deleteAnnouncement,
  getActiveAnnouncements,
  getAllAnnouncements,
  updateAnnouncement,
} from "./supabase/announcements.js";

export {
  getMyVotes,
  getVotesByGame,
  getVotingResults,
  submitVote,
} from "./supabase/votes.js";

export {
  acceptRulesVersion,
  getPlayerSession,
} from "./supabase/rulesAcceptance.js";

export {
  getMatchParticipants,
  getMatchStatistics,
  getMatchStatisticsResults,
  publishMatchStatistics,
  saveMatchStatistics,
  unpublishMatchStatistics,
} from "./supabase/matchStatistics.js";
