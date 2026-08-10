import FormatVoteClient from "@/components/FormatVoteClient";
import { getTournament } from "@/lib/db";
import {
  TOURNAMENT_FORMATS,
  type TournamentFormatId,
} from "@/lib/formats";
import type { PublicFormatVote, Team } from "@/lib/types";

export const revalidate = 5;

function buildInitialCounts(
  votes: Array<{ formatId: string }>,
): Record<TournamentFormatId, number> {
  const counts = Object.fromEntries(
    TOURNAMENT_FORMATS.map((format) => [format.id, 0]),
  ) as Record<TournamentFormatId, number>;

  for (const vote of votes) {
    if (vote.formatId in counts) {
      counts[vote.formatId as TournamentFormatId] += 1;
    }
  }

  return counts;
}

function normalizePersonName(fullName: string): string {
  return fullName.trim().toLocaleLowerCase("ru-RU");
}

function resolveTeamName(
  vote: {
    voterName: string;
    employeeId?: string | null;
    teamName?: string;
  },
  teams: Team[],
): string {
  const liveTeamName = teams.find((team) =>
    team.members.some((member) => {
      if (
        vote.employeeId &&
        member.employeeId &&
        vote.employeeId === member.employeeId
      ) {
        return true;
      }

      return (
        normalizePersonName(member.fullName) ===
        normalizePersonName(vote.voterName)
      );
    }),
  )?.name;

  return liveTeamName || vote.teamName || "";
}

function toPublicVotes(
  votes: Array<{
    voterName: string;
    department?: string;
    isConfirmed?: boolean;
    employeeId?: string | null;
    teamName?: string;
    formatId: string;
    createdAt: string;
  }>,
  teams: Team[],
): PublicFormatVote[] {
  return votes
    .map((vote) => ({
      voterName: vote.voterName,
      department: vote.department || "",
      isConfirmed: Boolean(vote.isConfirmed),
      teamName: resolveTeamName(vote, teams),
      formatId: vote.formatId,
      createdAt: vote.createdAt,
    }))
    .sort((leftVote, rightVote) =>
      leftVote.voterName.localeCompare(rightVote.voterName, "ru"),
    );
}

export default async function VotePage() {
  const tournament = await getTournament();
  const counts = buildInitialCounts(tournament.formatPoll.votes);
  const publicVotes = toPublicVotes(
    tournament.formatPoll.votes,
    tournament.teams,
  );

  return (
    <main className="page">
      <section className="section">
        <h1 className="section__title">Голосование за формат</h1>
        <p className="section__text">
          Четыре варианта ниже. Сразу видно, кто за что и из какой команды.
          Голос — в форме внизу (только игроки из команд).
        </p>

        <FormatVoteClient
          initialVotingOpen={tournament.settings.formatVotingOpen}
          initialCounts={counts}
          initialTotalVotes={tournament.formatPoll.votes.length}
          initialVotes={publicVotes}
        />
      </section>
    </main>
  );
}
