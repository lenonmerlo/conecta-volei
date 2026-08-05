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

function getSkillLevel(player) {
  return Number(player?.skillLevel || 0);
}

function isFemale(player) {
  return player?.gender === "F";
}

function isLowSkill(player) {
  return getSkillLevel(player) < 3;
}

function isHighSkill(player) {
  return getSkillLevel(player) > 4.5;
}

function isCaptain(player) {
  return Boolean(player?.is_captain);
}

function isSetter(player) {
  return Boolean(player?.is_setter) || player?.position === "setter";
}

function getTeamPlan(totalPlayers) {
  if (totalPlayers < 12) return null;

  if (totalPlayers <= 14) {
    const minSize = Math.floor(totalPlayers / 2);
    const maxSize = Math.ceil(totalPlayers / 2);
    return {
      teamCount: 2,
      capacities: [minSize, maxSize],
    };
  }

  const capacities = [6, 6, 6];
  const delta = totalPlayers - 18;

  if (delta < 0) {
    capacities[2] = 6 + delta;
  } else if (delta > 0) {
    for (let i = 0; i < delta; i += 1) {
      capacities[i % 3] += 1;
    }
  }

  return {
    teamCount: 3,
    capacities,
  };
}

export function drawTeams(players) {
  const plan = getTeamPlan(players.length);
  if (!plan) {
    throw new Error("Minimo de 12 jogadores necessario");
  }

  const { teamCount, capacities } = plan;
  const teams = Array.from({ length: teamCount }, () => []);

  const assignedIds = new Set();

  function canAddToTeam(teamIndex) {
    return teams[teamIndex].length < capacities[teamIndex];
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
        capacity: capacities[index],
        sum: sumLevels(team),
        femaleCount: team.filter(isFemale).length,
        lowSkillCount: team.filter(isLowSkill).length,
        highSkillCount: team.filter(isHighSkill).length,
        captainCount: team.filter(isCaptain).length,
        setterCount: team.filter(isSetter).length,
      }))
      .filter((meta) => meta.size < meta.capacity)
      .sort((a, b) => {
        const aFill = a.size / a.capacity;
        const bFill = b.size / b.capacity;
        if (aFill !== bFill) return aFill - bFill;
        if (a.size !== b.size) return a.size - b.size;
        if (a.sum !== b.sum) return a.sum - b.sum;
        return a.femaleCount - b.femaleCount;
      });
  }

  function assignToBestTeam(player, options = {}) {
    const {
      preferFemaleBalance = false,
      balanceLowSkill = false,
      balanceHighSkill = false,
    } = options;

    const targets = getSortedTargets();
    if (targets.length === 0) return false;

    const sortedTargets = [...targets].sort((a, b) => {
      const aFill = a.size / a.capacity;
      const bFill = b.size / b.capacity;
      if (aFill !== bFill) return aFill - bFill;

      if (balanceLowSkill && a.lowSkillCount !== b.lowSkillCount) {
        return a.lowSkillCount - b.lowSkillCount;
      }

      if (balanceHighSkill && a.highSkillCount !== b.highSkillCount) {
        return a.highSkillCount - b.highSkillCount;
      }

      if (preferFemaleBalance && a.femaleCount !== b.femaleCount) {
        return a.femaleCount - b.femaleCount;
      }

      if (a.captainCount !== b.captainCount) {
        return a.captainCount - b.captainCount;
      }

      if (a.setterCount !== b.setterCount) {
        return a.setterCount - b.setterCount;
      }

      if (a.sum !== b.sum) return a.sum - b.sum;
      return a.size - b.size;
    });

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

  // 3) Balanceia extremos tecnicos antes do restante
  const allNonRolePlayers = [...attackers, ...remaining];
  const lowSkillPlayers = shuffleArray(allNonRolePlayers.filter(isLowSkill));
  const highSkillPlayers = shuffleArray(allNonRolePlayers.filter(isHighSkill));

  lowSkillPlayers.forEach((player) => {
    if (assignedIds.has(player.id)) return;
    assignToBestTeam(player, { balanceLowSkill: true });
  });

  highSkillPlayers.forEach((player) => {
    if (assignedIds.has(player.id)) return;
    assignToBestTeam(player, { balanceHighSkill: true });
  });

  // 4) Distribui atacantes equilibrando entre os times
  attackers.forEach((player) => {
    if (assignedIds.has(player.id)) return;
    assignToBestTeam(player);
  });

  // 5) Completa com os demais equilibrando nivel e genero
  remaining.forEach((player) =>
    assignedIds.has(player.id)
      ? null
      : assignToBestTeam(player, {
          preferFemaleBalance: isFemale(player),
          balanceLowSkill: isLowSkill(player),
          balanceHighSkill: isHighSkill(player),
        }),
  );

  // Garantia: adiciona qualquer jogador nao distribuido por limite/parcial
  const notAssigned = players.filter((p) => !assignedIds.has(p.id));
  notAssigned.forEach((player) =>
    assignToBestTeam(player, {
      preferFemaleBalance: isFemale(player),
      balanceLowSkill: isLowSkill(player),
      balanceHighSkill: isHighSkill(player),
    }),
  );

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
