import fs from "fs";
import path from "path";

import { Redis } from "@upstash/redis";

import type {
  Legionnaire,
  PublicLegionnaire,
  PublicTeam,
  Team,
  TeamMember,
  TournamentData,
} from "@/lib/types";
import { createEntityId, createManageToken } from "@/lib/ids";

export { createEntityId, createManageToken };

const DATA_PATH = path.join(process.cwd(), "data", "tournament.json");
const REDIS_KEY = "crtr:tournament";
const MAIN_ROSTER_SIZE = 5;
const MEMORY_CACHE_TTL_MS = 15000;

let memoryCache: { data: TournamentData; expiresAt: number } | null = null;
let redisClient: Redis | null | undefined;

function createEmptyTournament(): TournamentData {
  return {
    teams: [],
    legionnaires: [],
    bracket: null,
    settings: {
      registrationOpen: true,
      tournamentName: "ЦРТР CS Tournament",
      companyName: "АО «ЦРТР»",
    },
  };
}

function normalizeTournament(data: TournamentData): TournamentData {
  return {
    ...createEmptyTournament(),
    ...data,
    teams: Array.isArray(data.teams) ? data.teams : [],
    legionnaires: Array.isArray(data.legionnaires) ? data.legionnaires : [],
    bracket: data.bracket ?? null,
    settings: {
      ...createEmptyTournament().settings,
      ...(data.settings || {}),
    },
  };
}

function hasRedisConfig(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
  );
}

function getRedisClient(): Redis | null {
  if (redisClient !== undefined) {
    return redisClient;
  }

  if (!hasRedisConfig()) {
    redisClient = null;
    return null;
  }

  redisClient = Redis.fromEnv();
  return redisClient;
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
    tournamentData = normalizeTournament(storedValue ?? createEmptyTournament());
  } else if (process.env.VERCEL) {
    // Vercel filesystem is read-only; without Redis return empty safe state.
    tournamentData = createEmptyTournament();
  } else {
    tournamentData = normalizeTournament(readTournamentFromFile());
  }

  memoryCache = {
    data: tournamentData,
    expiresAt: Date.now() + MEMORY_CACHE_TTL_MS,
  };

  return tournamentData;
}

export async function saveTournament(data: TournamentData): Promise<void> {
  const normalizedData = normalizeTournament(data);

  memoryCache = {
    data: normalizedData,
    expiresAt: Date.now() + MEMORY_CACHE_TTL_MS,
  };

  const redisClient = getRedisClient();

  if (redisClient) {
    await redisClient.set(REDIS_KEY, normalizedData);
    return;
  }

  if (process.env.VERCEL) {
    throw new Error(
      "На Vercel нужно подключить Upstash Redis (UPSTASH_REDIS_REST_URL и UPSTASH_REDIS_REST_TOKEN).",
    );
  }

  writeTournamentToFile(normalizedData);
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

function isSamePerson(
  fullName: string,
  employeeId: string | null,
  candidateFullName: string,
  candidateEmployeeId: string | null,
): boolean {
  if (employeeId && candidateEmployeeId && employeeId === candidateEmployeeId) {
    return true;
  }

  return (
    candidateFullName.trim().toLocaleLowerCase("ru-RU") ===
    fullName.trim().toLocaleLowerCase("ru-RU")
  );
}

export async function isPersonAlreadyRegistered(
  fullName: string,
  employeeId: string | null,
): Promise<boolean> {
  const tournament = await getTournament();

  return tournament.teams.some((team) =>
    team.members.some((member) =>
      isSamePerson(fullName, employeeId, member.fullName, member.employeeId),
    ),
  );
}

export async function isPersonLegionnaire(
  fullName: string,
  employeeId: string | null,
): Promise<boolean> {
  const tournament = await getTournament();

  return tournament.legionnaires.some((legionnaire) =>
    isSamePerson(
      fullName,
      employeeId,
      legionnaire.fullName,
      legionnaire.employeeId,
    ),
  );
}

export function toPublicLegionnaire(legionnaire: Legionnaire): PublicLegionnaire {
  return {
    id: legionnaire.id,
    fullName: legionnaire.fullName,
    department: legionnaire.department,
    isConfirmed: legionnaire.isConfirmed,
    employeeId: legionnaire.employeeId,
    createdAt: legionnaire.createdAt,
  };
}

export function removeMatchingLegionnaires(
  tournament: TournamentData,
  fullName: string,
  employeeId: string | null,
): void {
  tournament.legionnaires = tournament.legionnaires.filter(
    (legionnaire) =>
      !isSamePerson(
        fullName,
        employeeId,
        legionnaire.fullName,
        legionnaire.employeeId,
      ),
  );
}

export { MAIN_ROSTER_SIZE };
