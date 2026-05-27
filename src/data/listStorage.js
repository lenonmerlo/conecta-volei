// Servico de gerenciamento das listas de jogos

const LISTS_KEY = "conecta_volei_lists";

export function getLists() {
  const data = localStorage.getItem(LISTS_KEY);
  return data ? JSON.parse(data) : {};
}

export function getGameList(gameId) {
  const lists = getLists();
  return lists[gameId] || { main: [], waitlist: [], guests: [] };
}

export function saveGameList(gameId, list) {
  const lists = getLists();
  lists[gameId] = list;
  localStorage.setItem(LISTS_KEY, JSON.stringify(lists));
}

export function isPlayerInGame(gameId, playerId) {
  const list = getGameList(gameId);
  return (
    list.main.some((p) => p.id === playerId) ||
    list.waitlist.some((p) => p.id === playerId) ||
    list.guests.some((p) => p.id === playerId)
  );
}

export function joinList(gameId, player, asGuest = false, invitedBy = null) {
  const list = getGameList(gameId);

  if (isPlayerInGame(gameId, player.id)) {
    return { success: false, error: "Jogador ja esta na lista." };
  }

  if (asGuest) {
    list.guests.push({ ...player, invitedBy });
    saveGameList(gameId, list);
    return { success: true, slot: "guests" };
  }

  if (list.main.length < 21) {
    list.main.push(player);
    saveGameList(gameId, list);
    return { success: true, slot: "main" };
  }

  list.waitlist.push(player);
  saveGameList(gameId, list);
  return { success: true, slot: "waitlist" };
}

export function leaveList(gameId, playerId) {
  const list = getGameList(gameId);
  list.main = list.main.filter((p) => p.id !== playerId);
  list.waitlist = list.waitlist.filter((p) => p.id !== playerId);
  list.guests = list.guests.filter((p) => p.id !== playerId);
  saveGameList(gameId, list);
}
