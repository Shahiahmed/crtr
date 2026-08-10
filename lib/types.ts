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
  block: string;
  department: string;
  manageToken: string;
  accessCode?: string;
  members: TeamMember[];
  createdAt: string;
};

export type MatchStage = "group" | "semifinal" | "final" | "third_place";

export type BracketGroupId = "A" | "B";

export type BracketMatch = {
  id: string;
  stage: MatchStage;
  groupId: BracketGroupId | null;
  round: number;
  position: number;
  teamAId: string | null;
  teamBId: string | null;
  winnerId: string | null;
};

export type BracketGroup = {
  id: BracketGroupId;
  teamIds: string[];
};

export type Bracket = {
  format: "groups_playoff";
  createdAt: string;
  teamIds: string[];
  groups: BracketGroup[];
  matches: BracketMatch[];
};

export type GroupStanding = {
  teamId: string;
  played: number;
  wins: number;
  losses: number;
  place: number;
};

export type TournamentSettings = {
  registrationOpen: boolean;
  tournamentName: string;
  companyName: string;
  formatVotingOpen: boolean;
};

export type FormatVote = {
  id: string;
  voterKey: string;
  voterName: string;
  department: string;
  employeeId: string | null;
  isConfirmed: boolean;
  teamName: string;
  formatId: string;
  createdAt: string;
};

export type PublicFormatVote = {
  voterName: string;
  department: string;
  isConfirmed: boolean;
  teamName: string;
  formatId: string;
  createdAt: string;
};

export type FormatPoll = {
  votes: FormatVote[];
};

export type Legionnaire = {
  id: string;
  fullName: string;
  department: string;
  isConfirmed: boolean;
  employeeId: string | null;
  manageToken: string;
  createdAt: string;
};

export type PublicLegionnaire = Omit<Legionnaire, "manageToken">;

export type TournamentData = {
  teams: Team[];
  legionnaires: Legionnaire[];
  bracket: Bracket | null;
  settings: TournamentSettings;
  formatPoll: FormatPoll;
};

export type Employee = {
  id: string;
  fullName: string;
  department: string;
};

export type PublicTeam = Omit<Team, "manageToken" | "accessCode"> & {
  starterCount: number;
  substituteCount: number;
  isReady: boolean;
  confirmedCount: number;
  unconfirmedCount: number;
};
