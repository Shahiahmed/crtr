export type MemberRole = "captain" | "starter" | "substitute";

export type TeamMember = {
  id: string;
  fullName: string;
  department: string;
  role: MemberRole;
  isConfirmed: boolean;
  employeeId: string | null;
};

export type Team = {
  id: string;
  name: string;
  department: string;
  manageToken: string;
  members: TeamMember[];
  createdAt: string;
};

export type BracketMatch = {
  id: string;
  round: number;
  position: number;
  teamAId: string | null;
  teamBId: string | null;
  winnerId: string | null;
};

export type Bracket = {
  createdAt: string;
  teamIds: string[];
  matches: BracketMatch[];
};

export type TournamentSettings = {
  registrationOpen: boolean;
  tournamentName: string;
  companyName: string;
};

export type TournamentData = {
  teams: Team[];
  bracket: Bracket | null;
  settings: TournamentSettings;
};

export type Employee = {
  id: string;
  fullName: string;
  position: string;
  department: string;
};

export type PublicTeam = Omit<Team, "manageToken"> & {
  starterCount: number;
  substituteCount: number;
  isReady: boolean;
  confirmedCount: number;
  unconfirmedCount: number;
};
