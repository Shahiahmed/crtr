import { NextResponse } from "next/server";

import { createEntityId, findTeamMembership, getTournament, saveTournament } from "@/lib/db";
import { findEmployeeById } from "@/lib/employees";
import {
  TOURNAMENT_FORMATS,
  isTournamentFormatId,
  type TournamentFormatId,
} from "@/lib/formats";
import type { FormatVote, PublicFormatVote } from "@/lib/types";

function buildVoteCounts(votes: FormatVote[]): Record<TournamentFormatId, number> {
  const counts = Object.fromEntries(
    TOURNAMENT_FORMATS.map((format) => [format.id, 0]),
  ) as Record<TournamentFormatId, number>;

  for (const vote of votes) {
    if (isTournamentFormatId(vote.formatId)) {
      counts[vote.formatId] += 1;
    }
  }

  return counts;
}

function normalizePersonName(fullName: string): string {
  return fullName.trim().toLocaleLowerCase("ru-RU");
}

function toPublicVotes(
  votes: FormatVote[],
  teams: Array<{ name: string; members: Array<{ fullName: string; employeeId: string | null }> }>,
): PublicFormatVote[] {
  return votes
    .map((vote) => {
      const liveTeamName =
        teams.find((team) =>
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
        )?.name ||
        vote.teamName ||
        "";

      return {
        voterName: vote.voterName,
        department: vote.department || "",
        isConfirmed: Boolean(vote.isConfirmed),
        teamName: liveTeamName,
        formatId: vote.formatId,
        createdAt: vote.createdAt,
      };
    })
    .sort((leftVote, rightVote) =>
      leftVote.voterName.localeCompare(rightVote.voterName, "ru"),
    );
}

function findExistingVoteIndex(
  votes: FormatVote[],
  options: {
    voterKey: string;
    employeeId: string | null;
    voterName: string;
  },
): number {
  if (options.employeeId) {
    const byEmployeeId = votes.findIndex(
      (vote) => vote.employeeId === options.employeeId,
    );

    if (byEmployeeId >= 0) {
      return byEmployeeId;
    }
  }

  const normalizedName = normalizePersonName(options.voterName);
  const byName = votes.findIndex(
    (vote) => normalizePersonName(vote.voterName) === normalizedName,
  );

  if (byName >= 0) {
    return byName;
  }

  return votes.findIndex((vote) => vote.voterKey === options.voterKey);
}

function normalizeStoredVotes(votes: FormatVote[]): FormatVote[] {
  return votes.map((vote) => ({
    id: vote.id,
    voterKey: vote.voterKey,
    voterName: vote.voterName,
    department: vote.department || "",
    employeeId: vote.employeeId ?? null,
    isConfirmed: Boolean(vote.isConfirmed),
    teamName: vote.teamName || "",
    formatId: vote.formatId,
    createdAt: vote.createdAt,
  }));
}

export async function GET() {
  const tournament = await getTournament();
  const votes = normalizeStoredVotes(tournament.formatPoll.votes);

  return NextResponse.json({
    votingOpen: tournament.settings.formatVotingOpen,
    totalVotes: votes.length,
    counts: buildVoteCounts(votes),
    votes: toPublicVotes(votes, tournament.teams),
    formats: TOURNAMENT_FORMATS,
    teamNames: tournament.teams.map((team) => team.name),
  });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      voterKey?: string;
      mode?: "directory" | "manual";
      employeeId?: string;
      manualFullName?: string;
      manualDepartment?: string;
      formatId?: string;
    };

    const tournament = await getTournament();

    if (!tournament.settings.formatVotingOpen) {
      return NextResponse.json(
        { error: "Голосование закрыто" },
        { status: 403 },
      );
    }

    const voterKey = body.voterKey?.trim() || "";
    const formatId = body.formatId?.trim() || "";
    const mode = body.mode === "manual" ? "manual" : "directory";

    if (!voterKey || voterKey.length < 8 || voterKey.length > 80) {
      return NextResponse.json(
        { error: "Некорректный ключ голоса" },
        { status: 400 },
      );
    }

    if (!isTournamentFormatId(formatId)) {
      return NextResponse.json(
        { error: "Неизвестный формат" },
        { status: 400 },
      );
    }

    let voterName = "";
    let department = "";
    let employeeId: string | null = null;
    let isConfirmed = false;

    if (mode === "directory") {
      const employee = findEmployeeById(body.employeeId?.trim() || "");

      if (!employee) {
        return NextResponse.json(
          { error: "Выберите сотрудника из справочника" },
          { status: 400 },
        );
      }

      voterName = employee.fullName;
      department = employee.department;
      employeeId = employee.id;
      isConfirmed = true;
    } else {
      voterName = body.manualFullName?.trim() || "";
      department = body.manualDepartment?.trim() || "";

      if (!voterName || voterName.length < 2 || voterName.length > 80) {
        return NextResponse.json(
          { error: "Укажите ФИО (от 2 до 80 символов)" },
          { status: 400 },
        );
      }

      if (!department || department.length < 2 || department.length > 160) {
        return NextResponse.json(
          { error: "Укажите подразделение" },
          { status: 400 },
        );
      }

      isConfirmed = false;
    }

    const teamMembership = await findTeamMembership(voterName, employeeId);

    if (!teamMembership) {
      return NextResponse.json(
        {
          error:
            "Голосовать могут только игроки, уже состоящие в команде. Добавьтесь в состав или зарегистрируйте команду.",
        },
        { status: 403 },
      );
    }

    tournament.formatPoll.votes = normalizeStoredVotes(
      tournament.formatPoll.votes,
    );

    const existingVoteIndex = findExistingVoteIndex(
      tournament.formatPoll.votes,
      { voterKey, employeeId, voterName },
    );

    const nextVote: FormatVote = {
      id:
        existingVoteIndex >= 0
          ? tournament.formatPoll.votes[existingVoteIndex].id
          : createEntityId("vote"),
      voterKey,
      voterName,
      department,
      employeeId,
      isConfirmed,
      teamName: teamMembership.teamName,
      formatId,
      createdAt: new Date().toISOString(),
    };

    if (existingVoteIndex >= 0) {
      tournament.formatPoll.votes[existingVoteIndex] = nextVote;
    } else {
      tournament.formatPoll.votes.push(nextVote);
    }

    await saveTournament(tournament);

    return NextResponse.json({
      ok: true,
      changed: existingVoteIndex >= 0,
      votingOpen: tournament.settings.formatVotingOpen,
      totalVotes: tournament.formatPoll.votes.length,
      counts: buildVoteCounts(tournament.formatPoll.votes),
      votes: toPublicVotes(tournament.formatPoll.votes, tournament.teams),
      yourVote: {
        formatId: nextVote.formatId,
        voterName: nextVote.voterName,
        department: nextVote.department,
        isConfirmed: nextVote.isConfirmed,
        employeeId: nextVote.employeeId,
        teamName: nextVote.teamName,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Не удалось сохранить голос";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
