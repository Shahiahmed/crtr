import { randomBytes, randomUUID } from "crypto";
import fs from "fs";
import path from "path";

import type {
  Bracket,
  BracketMatch,
  PublicTeam,
  Team,
  TeamMember,
  TournamentData,
} from "@/lib/types";

const DATA_PATH = path.join(process.cwd(), "data", "tournament.json");
const MAIN_ROSTER_SIZE = 5;

function createEmptyTournament(): TournamentData {
  return {
    teams: [],
    bracket: null,
    settings: {
      registrationOpen: true,
      tournamentName: "ЦРТР CS Tournament",
      companyName: "АО «ЦРТР»",
    },
  };
}

function readTournament(): TournamentData {
  if (!fs.existsSync(DATA_PATH)) {
    const emptyTournament = createEmptyTournament();
    writeTournament(emptyTournament);
    return emptyTournament;
  }

  const rawContent = fs.readFileSync(DATA_PATH, "utf8");
  return JSON.parse(rawContent) as TournamentData;
}

function writeTournament(data: TournamentData): void {
  const directoryPath = path.dirname(DATA_PATH);

  if (!fs.existsSync(directoryPath)) {
    fs.mkdirSync(directoryPath, { recursive: true });
  }

  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), "utf8");
}

export function getTournament(): TournamentData {
  return readTournament();
}

export function saveTournament(data: TournamentData): void {
  writeTournament(data);
}

export function createManageToken(): string {
  return randomBytes(24).toString("hex");
}

export function createEntityId(prefix: string): string {
  return `${prefix}_${randomUUID().replace(/-/g, "").slice(0, 12)}`;
}

export function getStarterMembers(team: Team): TeamMember[] {
  return team.members.filter(
    (member) => member.role === "captain" || member.role === "starter",
  );
}

export function getSubstituteMembers(team: Team): TeamMember[] {
  return team.members.filter((member) => member.role === "substitute");
}

export function isTeamReady(team: Team): boolean {
  return getStarterMembers(team).length === MAIN_ROSTER_SIZE;
}

export function toPublicTeam(team: Team): PublicTeam {
  const starters = getStarterMembers(team);
  const substitutes = getSubstituteMembers(team);
  const confirmedCount = team.members.filter((member) => member.isConfirmed).length;
  const unconfirmedCount = team.members.length - confirmedCount;

  return {
    id: team.id,
    name: team.name,
    department: team.department,
    members: team.members,
    createdAt: team.createdAt,
    starterCount: starters.length,
    substituteCount: substitutes.length,
    isReady: starters.length === MAIN_ROSTER_SIZE,
    confirmedCount,
    unconfirmedCount,
  };
}

export function findTeamById(teamId: string): Team | undefined {
  return readTournament().teams.find((team) => team.id === teamId);
}

export function findTeamByManageToken(manageToken: string): Team | undefined {
  return readTournament().teams.find((team) => team.manageToken === manageToken);
}

export function isPersonAlreadyRegistered(fullName: string, employeeId: string | null): boolean {
  const normalizedName = fullName.trim().toLocaleLowerCase("ru-RU");
  const tournament = readTournament();

  return tournament.teams.some((team) =>
    team.members.some((member) => {
      if (employeeId && member.employeeId === employeeId) {
        return true;
      }

      return member.fullName.trim().toLocaleLowerCase("ru-RU") === normalizedName;
    }),
  );
}

export function buildBracket(teamIds: string[]): Bracket {
  const shuffledTeamIds = [...teamIds];

  for (let index = shuffledTeamIds.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    const currentValue = shuffledTeamIds[index];
    shuffledTeamIds[index] = shuffledTeamIds[swapIndex];
    shuffledTeamIds[swapIndex] = currentValue;
  }

  const bracketSize = Math.max(2, 2 ** Math.ceil(Math.log2(Math.max(shuffledTeamIds.length, 2))));
  const paddedTeamIds: Array<string | null> = [...shuffledTeamIds];

  while (paddedTeamIds.length < bracketSize) {
    paddedTeamIds.push(null);
  }

  const matches: BracketMatch[] = [];
  let roundTeamIds: Array<string | null> = paddedTeamIds;
  let round = 1;

  while (roundTeamIds.length > 1) {
    const nextRoundTeamIds: Array<string | null> = [];

    for (let position = 0; position < roundTeamIds.length / 2; position += 1) {
      const teamAId = roundTeamIds[position * 2] ?? null;
      const teamBId = roundTeamIds[position * 2 + 1] ?? null;
      let winnerId: string | null = null;

      if (teamAId && !teamBId) {
        winnerId = teamAId;
      } else if (!teamAId && teamBId) {
        winnerId = teamBId;
      }

      matches.push({
        id: createEntityId("match"),
        round,
        position,
        teamAId,
        teamBId,
        winnerId,
      });

      nextRoundTeamIds.push(winnerId);
    }

    roundTeamIds = nextRoundTeamIds;
    round += 1;
  }

  return {
    createdAt: new Date().toISOString(),
    teamIds: shuffledTeamIds,
    matches,
  };
}

export { MAIN_ROSTER_SIZE };
