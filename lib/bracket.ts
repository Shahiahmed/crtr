import { createEntityId } from "@/lib/ids";
import type {
  Bracket,
  BracketGroup,
  BracketGroupId,
  BracketMatch,
  GroupStanding,
  MatchStage,
} from "@/lib/types";

function shuffleTeamIds(teamIds: string[]): string[] {
  const shuffledTeamIds = [...teamIds];

  for (let index = shuffledTeamIds.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    const currentValue = shuffledTeamIds[index];
    shuffledTeamIds[index] = shuffledTeamIds[swapIndex];
    shuffledTeamIds[swapIndex] = currentValue;
  }

  return shuffledTeamIds;
}

function createMatch(options: {
  stage: MatchStage;
  groupId: BracketGroupId | null;
  round: number;
  position: number;
  teamAId?: string | null;
  teamBId?: string | null;
}): BracketMatch {
  return {
    id: createEntityId("match"),
    stage: options.stage,
    groupId: options.groupId,
    round: options.round,
    position: options.position,
    teamAId: options.teamAId ?? null,
    teamBId: options.teamBId ?? null,
    winnerId: null,
  };
}

function createRoundRobinMatches(
  teamIds: string[],
  groupId: BracketGroupId,
): BracketMatch[] {
  const matches: BracketMatch[] = [];
  let position = 0;

  for (let leftIndex = 0; leftIndex < teamIds.length; leftIndex += 1) {
    for (
      let rightIndex = leftIndex + 1;
      rightIndex < teamIds.length;
      rightIndex += 1
    ) {
      matches.push(
        createMatch({
          stage: "group",
          groupId,
          round: 1,
          position,
          teamAId: teamIds[leftIndex],
          teamBId: teamIds[rightIndex],
        }),
      );
      position += 1;
    }
  }

  return matches;
}

function splitIntoGroups(teamIds: string[]): BracketGroup[] {
  if (teamIds.length <= 4) {
    return [{ id: "A", teamIds: [...teamIds] }];
  }

  const midpoint = Math.ceil(teamIds.length / 2);

  return [
    { id: "A", teamIds: teamIds.slice(0, midpoint) },
    { id: "B", teamIds: teamIds.slice(midpoint) },
  ];
}

function createPlayoffShell(groupCount: number, teamCount: number): BracketMatch[] {
  if (teamCount === 2) {
    return [
      createMatch({
        stage: "final",
        groupId: null,
        round: 2,
        position: 0,
        teamAId: null,
        teamBId: null,
      }),
    ];
  }

  if (groupCount === 1) {
    const matches = [
      createMatch({
        stage: "final",
        groupId: null,
        round: 2,
        position: 0,
      }),
    ];

    if (teamCount >= 4) {
      matches.push(
        createMatch({
          stage: "third_place",
          groupId: null,
          round: 2,
          position: 1,
        }),
      );
    }

    return matches;
  }

  return [
    createMatch({
      stage: "semifinal",
      groupId: null,
      round: 2,
      position: 0,
    }),
    createMatch({
      stage: "semifinal",
      groupId: null,
      round: 2,
      position: 1,
    }),
    createMatch({
      stage: "final",
      groupId: null,
      round: 3,
      position: 0,
    }),
    createMatch({
      stage: "third_place",
      groupId: null,
      round: 3,
      position: 1,
    }),
  ];
}

export function buildBracket(teamIds: string[]): Bracket {
  if (teamIds.length < 2) {
    throw new Error("Нужно минимум 2 команды для жеребьёвки");
  }

  const shuffledTeamIds = shuffleTeamIds(teamIds);
  const groups = splitIntoGroups(shuffledTeamIds);
  const matches: BracketMatch[] = [];

  for (const group of groups) {
    matches.push(...createRoundRobinMatches(group.teamIds, group.id));
  }

  if (groups.length === 1 && shuffledTeamIds.length === 2) {
    matches.length = 0;
    matches.push(
      createMatch({
        stage: "final",
        groupId: null,
        round: 1,
        position: 0,
        teamAId: shuffledTeamIds[0],
        teamBId: shuffledTeamIds[1],
      }),
    );
  } else {
    matches.push(...createPlayoffShell(groups.length, shuffledTeamIds.length));
  }

  return {
    format: "groups_playoff",
    createdAt: new Date().toISOString(),
    teamIds: shuffledTeamIds,
    groups,
    matches,
  };
}

function buildAllPairs(teamIds: string[]): Array<[string, string]> {
  const pairs: Array<[string, string]> = [];

  for (let leftIndex = 0; leftIndex < teamIds.length; leftIndex += 1) {
    for (
      let rightIndex = leftIndex + 1;
      rightIndex < teamIds.length;
      rightIndex += 1
    ) {
      pairs.push([teamIds[leftIndex], teamIds[rightIndex]]);
    }
  }

  return pairs;
}

/** Pack pairs into rounds with at most `maxParallel` matches and no team twice. */
function packMatchesIntoRounds(
  pairs: Array<[string, string]>,
  maxParallel: number,
): Array<Array<[string, string]>> {
  const remainingPairs = [...pairs];
  const rounds: Array<Array<[string, string]>> = [];

  while (remainingPairs.length > 0) {
    const roundPairs: Array<[string, string]> = [];
    const usedTeamIds = new Set<string>();
    let pairIndex = 0;

    while (
      pairIndex < remainingPairs.length &&
      roundPairs.length < maxParallel
    ) {
      const [leftTeamId, rightTeamId] = remainingPairs[pairIndex];

      if (!usedTeamIds.has(leftTeamId) && !usedTeamIds.has(rightTeamId)) {
        roundPairs.push(remainingPairs[pairIndex]);
        usedTeamIds.add(leftTeamId);
        usedTeamIds.add(rightTeamId);
        remainingPairs.splice(pairIndex, 1);
        continue;
      }

      pairIndex += 1;
    }

    if (roundPairs.length === 0) {
      roundPairs.push(remainingPairs.shift()!);
    }

    rounds.push(roundPairs);
  }

  return rounds;
}

/**
 * Format C: everyone plays everyone.
 * maxParallel 2 = two servers; 3 = three servers (all teams can play each tour).
 * Then final (1st vs 2nd) as BO3 — no 3rd-place match.
 */
export function buildRoundRobinBracket(
  teamIds: string[],
  maxParallel: number = 2,
): Bracket {
  if (teamIds.length < 2) {
    throw new Error("Нужно минимум 2 команды для жеребьёвки");
  }

  const parallelLimit = maxParallel >= 3 ? 3 : 2;
  const shuffledTeamIds = shuffleTeamIds(teamIds);
  const pairs = buildAllPairs(shuffledTeamIds);
  const rounds = packMatchesIntoRounds(pairs, parallelLimit);
  const matches: BracketMatch[] = [];

  rounds.forEach((roundPairs, roundIndex) => {
    roundPairs.forEach(([teamAId, teamBId], position) => {
      matches.push(
        createMatch({
          stage: "group",
          groupId: "A",
          round: roundIndex + 1,
          position,
          teamAId,
          teamBId,
        }),
      );
    });
  });

  if (shuffledTeamIds.length === 2) {
    return {
      format: "round_robin",
      createdAt: new Date().toISOString(),
      teamIds: shuffledTeamIds,
      groups: [{ id: "A", teamIds: shuffledTeamIds }],
      matches: [
        createMatch({
          stage: "final",
          groupId: null,
          round: 1,
          position: 0,
          teamAId: shuffledTeamIds[0],
          teamBId: shuffledTeamIds[1],
        }),
      ],
      maxParallel: parallelLimit,
    };
  }

  matches.push(
    createMatch({
      stage: "final",
      groupId: null,
      round: rounds.length + 1,
      position: 0,
    }),
  );

  return {
    format: "round_robin",
    createdAt: new Date().toISOString(),
    teamIds: shuffledTeamIds,
    groups: [{ id: "A", teamIds: [...shuffledTeamIds] }],
    matches,
    maxParallel: parallelLimit,
  };
}

function getMatchLoser(match: BracketMatch): string | null {
  if (!match.winnerId) {
    return null;
  }

  if (match.winnerId === match.teamAId) {
    return match.teamBId;
  }

  if (match.winnerId === match.teamBId) {
    return match.teamAId;
  }

  return null;
}

export function getGroupStandings(
  bracket: Bracket,
  groupId: BracketGroupId,
): GroupStanding[] {
  const group = bracket.groups.find((item) => item.id === groupId);

  if (!group) {
    return [];
  }

  const stats = new Map<
    string,
    { played: number; wins: number; losses: number }
  >();

  for (const teamId of group.teamIds) {
    stats.set(teamId, { played: 0, wins: 0, losses: 0 });
  }

  const groupMatches = bracket.matches.filter(
    (match) => match.stage === "group" && match.groupId === groupId,
  );

  for (const match of groupMatches) {
    if (!match.teamAId || !match.teamBId || !match.winnerId) {
      continue;
    }

    const teamAStats = stats.get(match.teamAId);
    const teamBStats = stats.get(match.teamBId);

    if (!teamAStats || !teamBStats) {
      continue;
    }

    teamAStats.played += 1;
    teamBStats.played += 1;

    if (match.winnerId === match.teamAId) {
      teamAStats.wins += 1;
      teamBStats.losses += 1;
    } else if (match.winnerId === match.teamBId) {
      teamBStats.wins += 1;
      teamAStats.losses += 1;
    }
  }

  const headToHeadWinner = (leftTeamId: string, rightTeamId: string): number => {
    const mutualMatch = groupMatches.find(
      (match) =>
        match.winnerId &&
        ((match.teamAId === leftTeamId && match.teamBId === rightTeamId) ||
          (match.teamAId === rightTeamId && match.teamBId === leftTeamId)),
    );

    if (!mutualMatch?.winnerId) {
      return 0;
    }

    if (mutualMatch.winnerId === leftTeamId) {
      return -1;
    }

    if (mutualMatch.winnerId === rightTeamId) {
      return 1;
    }

    return 0;
  };

  const rankedTeamIds = [...group.teamIds].sort((leftTeamId, rightTeamId) => {
    const leftStats = stats.get(leftTeamId)!;
    const rightStats = stats.get(rightTeamId)!;

    if (rightStats.wins !== leftStats.wins) {
      return rightStats.wins - leftStats.wins;
    }

    const headToHead = headToHeadWinner(leftTeamId, rightTeamId);

    if (headToHead !== 0) {
      return headToHead;
    }

    return leftTeamId.localeCompare(rightTeamId);
  });

  return rankedTeamIds.map((teamId, index) => {
    const teamStats = stats.get(teamId)!;

    return {
      teamId,
      played: teamStats.played,
      wins: teamStats.wins,
      losses: teamStats.losses,
      place: index + 1,
    };
  });
}

function isGroupComplete(bracket: Bracket, groupId: BracketGroupId): boolean {
  const groupMatches = bracket.matches.filter(
    (match) => match.stage === "group" && match.groupId === groupId,
  );

  if (groupMatches.length === 0) {
    return false;
  }

  return groupMatches.every((match) => Boolean(match.winnerId));
}

function areAllGroupsComplete(bracket: Bracket): boolean {
  if (bracket.groups.length === 0) {
    return false;
  }

  return bracket.groups.every((group) => isGroupComplete(bracket, group.id));
}

function clearPlayoffAssignments(bracket: Bracket): void {
  for (const match of bracket.matches) {
    if (match.stage === "group") {
      continue;
    }

    if (match.stage === "final" && bracket.groups.length === 1 && bracket.teamIds.length === 2) {
      continue;
    }

    match.teamAId = null;
    match.teamBId = null;
    match.winnerId = null;
  }
}

function findMatch(
  bracket: Bracket,
  stage: MatchStage,
  position?: number,
): BracketMatch | undefined {
  return bracket.matches.find((match) => {
    if (match.stage !== stage) {
      return false;
    }

    if (position === undefined) {
      return true;
    }

    return match.position === position;
  });
}

function seedPlayoffs(bracket: Bracket): void {
  if (bracket.teamIds.length === 2) {
    return;
  }

  if (!areAllGroupsComplete(bracket)) {
    return;
  }

  if (bracket.format === "round_robin" || bracket.groups.length === 1) {
    const standings = getGroupStandings(bracket, "A");
    const finalMatch = findMatch(bracket, "final");
    const thirdPlaceMatch = findMatch(bracket, "third_place");

    if (finalMatch && standings.length >= 2) {
      finalMatch.teamAId = standings[0].teamId;
      finalMatch.teamBId = standings[1].teamId;
    }

    if (
      bracket.format !== "round_robin" &&
      thirdPlaceMatch &&
      standings.length >= 4
    ) {
      thirdPlaceMatch.teamAId = standings[2].teamId;
      thirdPlaceMatch.teamBId = standings[3].teamId;
    }

    return;
  }

  const standingsA = getGroupStandings(bracket, "A");
  const standingsB = getGroupStandings(bracket, "B");
  const firstSemifinal = findMatch(bracket, "semifinal", 0);
  const secondSemifinal = findMatch(bracket, "semifinal", 1);

  if (firstSemifinal && standingsA[0] && standingsB[1]) {
    firstSemifinal.teamAId = standingsA[0].teamId;
    firstSemifinal.teamBId = standingsB[1].teamId;
  }

  if (secondSemifinal && standingsB[0] && standingsA[1]) {
    secondSemifinal.teamAId = standingsB[0].teamId;
    secondSemifinal.teamBId = standingsA[1].teamId;
  }
}

function syncPlayoffsFromSemifinals(bracket: Bracket): void {
  const firstSemifinal = findMatch(bracket, "semifinal", 0);
  const secondSemifinal = findMatch(bracket, "semifinal", 1);
  const finalMatch = findMatch(bracket, "final");
  const thirdPlaceMatch = findMatch(bracket, "third_place");

  if (!firstSemifinal || !secondSemifinal || !finalMatch) {
    return;
  }

  const firstWinnerId = firstSemifinal.winnerId;
  const secondWinnerId = secondSemifinal.winnerId;
  const firstLoserId = getMatchLoser(firstSemifinal);
  const secondLoserId = getMatchLoser(secondSemifinal);

  if (firstWinnerId && secondWinnerId) {
    finalMatch.teamAId = firstWinnerId;
    finalMatch.teamBId = secondWinnerId;

    if (
      finalMatch.winnerId &&
      finalMatch.winnerId !== finalMatch.teamAId &&
      finalMatch.winnerId !== finalMatch.teamBId
    ) {
      finalMatch.winnerId = null;
    }
  } else {
    finalMatch.teamAId = null;
    finalMatch.teamBId = null;
    finalMatch.winnerId = null;
  }

  if (!thirdPlaceMatch) {
    return;
  }

  if (firstLoserId && secondLoserId) {
    thirdPlaceMatch.teamAId = firstLoserId;
    thirdPlaceMatch.teamBId = secondLoserId;

    if (
      thirdPlaceMatch.winnerId &&
      thirdPlaceMatch.winnerId !== thirdPlaceMatch.teamAId &&
      thirdPlaceMatch.winnerId !== thirdPlaceMatch.teamBId
    ) {
      thirdPlaceMatch.winnerId = null;
    }
  } else {
    thirdPlaceMatch.teamAId = null;
    thirdPlaceMatch.teamBId = null;
    thirdPlaceMatch.winnerId = null;
  }
}

export function applyMatchWinner(
  bracket: Bracket,
  matchId: string,
  winnerId: string,
): void {
  const match = bracket.matches.find((item) => item.id === matchId);

  if (!match) {
    throw new Error("Матч не найден");
  }

  if (winnerId !== match.teamAId && winnerId !== match.teamBId) {
    throw new Error("Победитель не из этого матча");
  }

  match.winnerId = winnerId;

  if (match.stage === "group") {
    clearPlayoffAssignments(bracket);
    seedPlayoffs(bracket);
    return;
  }

  if (match.stage === "semifinal") {
    syncPlayoffsFromSemifinals(bracket);
  }
}

export function getStageLabel(
  stage: MatchStage,
  options?: { seriesLabel?: string },
): string {
  let label = "Финал";

  if (stage === "group") {
    label = "Группа";
  } else if (stage === "semifinal") {
    label = "Полуфинал";
  } else if (stage === "third_place") {
    label = "За 3 место";
  }

  if (options?.seriesLabel) {
    return `${label} · ${options.seriesLabel}`;
  }

  return label;
}

export function getBracketFormatLabel(format: Bracket["format"], maxParallel?: number): string {
  if (format === "round_robin") {
    const servers = maxParallel === 3 ? "3 сервера" : "2 сервера";
    return `каждый с каждым (BO1, ${servers}) → финал топ-2 (BO3)`;
  }

  return "группы → полуфинал → финал и матч за 3 место";
}

export function isSupportedBracket(bracket: Bracket | null | undefined): boolean {
  if (!bracket) {
    return false;
  }

  const format = (bracket as { format?: string }).format;
  return format === "groups_playoff" || format === "round_robin";
}

export function isLegacyBracket(bracket: Bracket | null | undefined): boolean {
  if (!bracket) {
    return false;
  }

  return !isSupportedBracket(bracket);
}
