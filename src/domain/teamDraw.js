// Algoritmo de sorteio equilibrado de times

function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function sumLevels(team) {
  return team.reduce((acc, p) => acc + Number(p.skillLevel || 0), 0);
}

function getTeamCount(totalPlayers) {
  if (totalPlayers >= 14) return 3;
  if (totalPlayers >= 8) return 2;
  return 0;
}

export function drawTeams(players) {
  const teamCount = getTeamCount(players.length);
  if (teamCount === 0) return [];
  const teams = Array.from({ length: teamCount }, () => []);
  const maxPerTeam = Math.ceil(players.length / teamCount);

  const assignedIds = new Set();

  function canAddToTeam(teamIndex) {
    return teams[teamIndex].length < maxPerTeam;
  }

  function tryAdd(teamIndex, player) {
    if (!player || assignedIds.has(player.id) || !canAddToTeam(teamIndex)) {
      return false;
    }
    teams[teamIndex].push(player);
    assignedIds.add(player.id);
    return true;
  }

  function getSortedTargets() {
    return teams
      .map((team, index) => ({
        index,
        size: team.length,
        sum: sumLevels(team),
        femaleCount: team.filter((p) => p.gender === "F").length,
      }))
      .filter((meta) => meta.size < maxPerTeam)
      .sort((a, b) => {
        if (a.size !== b.size) return a.size - b.size;
        if (a.sum !== b.sum) return a.sum - b.sum;
        return a.femaleCount - b.femaleCount;
      });
  }

  function assignToBestTeam(player, options = {}) {
    const { preferFemaleBalance = false } = options;

    const targets = getSortedTargets();
    if (targets.length === 0) return false;

    const sortedTargets = preferFemaleBalance
      ? [...targets].sort((a, b) => {
          if (a.size !== b.size) return a.size - b.size;
          if (a.femaleCount !== b.femaleCount)
            return a.femaleCount - b.femaleCount;
          return a.sum - b.sum;
        })
      : targets;

    return tryAdd(sortedTargets[0].index, player);
  }

  const captains = shuffleArray(players.filter((p) => p.is_captain));
  const fixedSetters = shuffleArray(
    players.filter((p) => p.position === "setter" && !p.is_captain),
  );
  const optionalSetters = shuffleArray(
    players.filter(
      (p) => p.is_setter && p.position !== "setter" && !p.is_captain,
    ),
  );
  const attackers = shuffleArray(
    players.filter(
      (p) => p.position === "attacker" && !p.is_captain && !p.is_setter,
    ),
  );
  const remaining = shuffleArray(
    players.filter(
      (p) =>
        !p.is_captain &&
        p.position !== "setter" &&
        !p.is_setter &&
        p.position !== "attacker",
    ),
  );

  // 1) Distribui capitaes (1 por time quando houver quantidade suficiente)
  for (let teamIndex = 0; teamIndex < teamCount; teamIndex += 1) {
    const captain = captains.shift();
    if (!captain) break;
    tryAdd(teamIndex, captain);
  }

  // Capitaes restantes entram no balanceamento geral
  captains.forEach((player) => assignToBestTeam(player));

  // 2) Distribui levantadores (1 por time, priorizando fixos)
  for (let teamIndex = 0; teamIndex < teamCount; teamIndex += 1) {
    let setter = fixedSetters.shift();
    if (!setter) setter = optionalSetters.shift();
    if (!setter) continue;
    tryAdd(teamIndex, setter);
  }

  fixedSetters.forEach((player) => assignToBestTeam(player));
  optionalSetters.forEach((player) => assignToBestTeam(player));

  // 3) Distribui atacantes equilibrando entre os times
  attackers.forEach((player) => assignToBestTeam(player));

  // 4) Completa com os demais equilibrando nivel e genero
  remaining.forEach((player) =>
    assignToBestTeam(player, { preferFemaleBalance: player.gender === "F" }),
  );

  // Garantia: adiciona qualquer jogador nao distribuido por limite/parcial
  const notAssigned = players.filter((p) => !assignedIds.has(p.id));
  notAssigned.forEach((player) => assignToBestTeam(player));

  return teams.map((team, i) => ({
    name: `Time ${String.fromCharCode(65 + i)}`, // Time A, B, C
    players: team,
    totalLevel: sumLevels(team),
  }));
}

export function swapPlayers(
  teams,
  fromTeamIndex,
  fromPlayerId,
  toTeamIndex,
  toPlayerId,
) {
  if (!Array.isArray(teams) || teams.length < 2) return teams;
  if (fromTeamIndex === toTeamIndex) return teams;
  if (!teams[fromTeamIndex] || !teams[toTeamIndex]) return teams;

  const newTeams = teams.map((team) => ({
    ...team,
    players: [...team.players],
  }));

  const fromTeam = newTeams[fromTeamIndex];
  const toTeam = newTeams[toTeamIndex];

  const fromIndex = fromTeam.players.findIndex((p) => p.id === fromPlayerId);
  const toIndex = toTeam.players.findIndex((p) => p.id === toPlayerId);

  if (fromIndex === -1 || toIndex === -1) return teams;

  const temp = fromTeam.players[fromIndex];
  fromTeam.players[fromIndex] = toTeam.players[toIndex];
  toTeam.players[toIndex] = temp;

  newTeams[fromTeamIndex].totalLevel = sumLevels(fromTeam.players);
  newTeams[toTeamIndex].totalLevel = sumLevels(toTeam.players);

  return newTeams;
}
