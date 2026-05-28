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
  return team.reduce((acc, p) => acc + p.skillLevel, 0);
}

function getTeamCount(totalPlayers) {
  if (totalPlayers >= 14) return 3;
  if (totalPlayers >= 8) return 2;
  return 0;
}

export function drawTeams(players) {
  const teamCount = getTeamCount(players.length);
  if (teamCount === 0) return [];

  const females = shuffleArray(players.filter((p) => p.gender === "F"));
  const males = shuffleArray(players.filter((p) => p.gender === "M"));

  const teams = Array.from({ length: teamCount }, () => []);
  const maxPerTeam = Math.ceil(players.length / teamCount);

  // Distribui meninas o mais igualmente possível
  females.forEach((p, i) => {
    teams[i % teamCount].push(p);
  });

  // Distribui homens equilibrando nível
  males.forEach((player) => {
    // Encontra o time com menor soma de níveis que ainda tem vaga
    const target = teams
      .map((team, index) => ({
        index,
        sum: sumLevels(team),
        size: team.length,
      }))
      .filter((t) => t.size < maxPerTeam)
      .sort((a, b) => a.sum - b.sum)[0];

    if (target) teams[target.index].push(player);
  });

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
