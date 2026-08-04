import { randomBytes, randomUUID } from "crypto";
import fs from "fs";
import path from "path";

import { Redis } from "@upstash/redis";

import type {
  Bracket,
  BracketMatch,
  PublicTeam,
  Team,
  TeamMember,
  TournamentData,
} from "@/lib/types";

const DATA_PATH = path.join(process.cwd(), "data", "tournament.json");
const REDIS_KEY = "crtr:tournament";
const MAIN_ROSTER_SIZE = 5;
const MEMORY_CACHE_TTL_MS = 2000;

let memoryCache: { data: TournamentData; expiresAt: number } | null = null;

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

function hasRedisConfig(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
  );
}

function getRedisClient(): Redis | null {
  if (!hasRedisConfig()) {
    return null;
  }

  return Redis.fromEnv();
}

function readTournamentFromFile(): TournamentData {
  try {
    if (!fs.existsSync(DATA_PATH)) {
      return createEmptyTournament();
    }

    const rawContent = fs.readFileSync(DATA_PATH, "utf8");
    return JSON.parse(rawContent) as TournamentData;
  } catch {
    return createEmptyTournament();
  }
}

function writeTournamentToFile(data: TournamentData): void {
  const directoryPath = path.dirname(DATA_PATH);

  if (!fs.existsSync(directoryPath)) {
    fs.mkdirSync(directoryPath, { recursive: true });
  }

  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), "utf8");
}

export async function getTournament(): Promise<TournamentData> {
  if (memoryCache && Date.now() < memoryCache.expiresAt) {
    return memoryCache.data;
  }

  const redisClient = getRedisClient();
  let tournamentData: TournamentData;

  if (redisClient) {
    const storedValue = await redisClient.get<TournamentData>(REDIS_KEY);
    tournamentData = storedValue ?? createEmptyTournament();
  } else if (process.env.VERCEL) {
    // Vercel filesystem is read-only; without Redis return empty safe state.
    tournamentData = createEmptyTournament();
  } else {
    tournamentData = readTournamentFromFile();
  }

  memoryCache = {
    data: tournamentData,
    expiresAt: Date.now() + MEMORY_CACHE_TTL_MS,
  };

  return tournamentData;
}

export async function saveTournament(data: TournamentData): Promise<void> {
  memoryCache = {
    data,
    expiresAt: Date.now() + MEMORY_CACHE_TTL_MS,
  };

  const redisClient = getRedisClient();

  if (redisClient) {
    await redisClient.set(REDIS_KEY, data);
    return;
  }

  if (process.env.VERCEL) {
    throw new Error(
      "На Vercel нужно подключить Upstash Redis (UPSTASH_REDIS_REST_URL и UPSTASH_REDIS_REST_TOKEN).",
    );
  }

  writeTournamentToFile(data);
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
    block: team.block || "",
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

export async function findTeamById(teamId: string): Promise<Team | undefined> {
  const tournament = await getTournament();
  return tournament.teams.find((team) => team.id === teamId);
}

export async function findTeamByManageToken(
  manageToken: string,
): Promise<Team | undefined> {
  const tournament = await getTournament();
  return tournament.teams.find((team) => team.manageToken === manageToken);
}

export async function isPersonAlreadyRegistered(
  fullName: string,
  employeeId: string | null,
): Promise<boolean> {
  const normalizedName = fullName.trim().toLocaleLowerCase("ru-RU");
  const tournament = await getTournament();

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

  const bracketSize = Math.max(
    2,
    2 ** Math.ceil(Math.log2(Math.max(shuffledTeamIds.length, 2))),
  );
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
