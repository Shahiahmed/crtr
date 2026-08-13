import { NextResponse } from "next/server";

import {
  ADMIN_COOKIE_NAME,
  createAdminSessionValue,
  isAdminAuthenticated,
  verifyAdminCredentials,
} from "@/lib/auth";
import {
  applyMatchWinner,
  buildBracket,
  buildRoundRobinBracket,
  isSupportedBracket,
} from "@/lib/bracket";
import {
  getTournament,
  isTeamReady,
  saveTournament,
  toPublicTeam,
} from "@/lib/db";
import { TOURNAMENT_FORMATS, isTournamentFormatId } from "@/lib/formats";

function buildFormatVoteCounts(
  votes: Array<{ formatId: string }>,
): Record<string, number> {
  const counts: Record<string, number> = {};

  for (const format of TOURNAMENT_FORMATS) {
    counts[format.id] = 0;
  }

  for (const vote of votes) {
    if (isTournamentFormatId(vote.formatId)) {
      counts[vote.formatId] += 1;
    }
  }

  return counts;
}

export async function GET() {
  const isAuthenticated = await isAdminAuthenticated();
  const tournament = await getTournament();

  if (!isAuthenticated) {
    return NextResponse.json({ authenticated: false });
  }

  return NextResponse.json({
    authenticated: true,
    settings: tournament.settings,
    teams: tournament.teams.map((team) => ({
      ...toPublicTeam(team),
      manageToken: team.manageToken,
    })),
    bracket: tournament.bracket,
    formatPoll: {
      totalVotes: tournament.formatPoll.votes.length,
      counts: buildFormatVoteCounts(tournament.formatPoll.votes),
      votes: tournament.formatPoll.votes.map((vote) => {
        const liveTeamName =
          tournament.teams.find((team) =>
            team.members.some((member) => {
              if (
                vote.employeeId &&
                member.employeeId &&
                vote.employeeId === member.employeeId
              ) {
                return true;
              }

              return (
                member.fullName.trim().toLocaleLowerCase("ru-RU") ===
                vote.voterName.trim().toLocaleLowerCase("ru-RU")
              );
            }),
          )?.name ||
          vote.teamName ||
          "";

        return {
          id: vote.id,
          voterName: vote.voterName,
          department: vote.department || "",
          isConfirmed: Boolean(vote.isConfirmed),
          teamName: liveTeamName,
          formatId: vote.formatId,
          createdAt: vote.createdAt,
        };
      }),
    },
  });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      action?: string;
      username?: string;
      password?: string;
      registrationOpen?: boolean;
      formatVotingOpen?: boolean;
      showBracketNav?: boolean;
      showFormatNav?: boolean;
      matchId?: string;
      winnerId?: string;
      teamId?: string;
      bracketFormat?: "groups_playoff" | "round_robin";
    };

    if (body.action === "login") {
      if (!verifyAdminCredentials(body.username || "", body.password || "")) {
        return NextResponse.json(
          { error: "Неверный логин или пароль" },
          { status: 401 },
        );
      }

      const response = NextResponse.json({ ok: true });
      response.cookies.set(ADMIN_COOKIE_NAME, createAdminSessionValue(), {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 12,
      });
      return response;
    }

    const isAuthenticated = await isAdminAuthenticated();

    if (!isAuthenticated) {
      return NextResponse.json({ error: "Нет доступа" }, { status: 401 });
    }

    const tournament = await getTournament();

    if (body.action === "logout") {
      const response = NextResponse.json({ ok: true });
      response.cookies.set(ADMIN_COOKIE_NAME, "", {
        httpOnly: true,
        path: "/",
        maxAge: 0,
      });
      return response;
    }

    if (body.action === "toggle-registration") {
      tournament.settings.registrationOpen = Boolean(body.registrationOpen);
      await saveTournament(tournament);
      return NextResponse.json({ settings: tournament.settings });
    }

    if (body.action === "toggle-format-voting") {
      tournament.settings.formatVotingOpen = Boolean(body.formatVotingOpen);
      await saveTournament(tournament);
      return NextResponse.json({ settings: tournament.settings });
    }

    if (body.action === "toggle-nav-visibility") {
      if (typeof body.showBracketNav === "boolean") {
        tournament.settings.showBracketNav = body.showBracketNav;
      }

      if (typeof body.showFormatNav === "boolean") {
        tournament.settings.showFormatNav = body.showFormatNav;
      }

      await saveTournament(tournament);
      return NextResponse.json({ settings: tournament.settings });
    }

    if (body.action === "clear-format-votes") {
      tournament.formatPoll.votes = [];
      await saveTournament(tournament);
      return NextResponse.json({
        formatPoll: {
          totalVotes: 0,
          counts: buildFormatVoteCounts([]),
          votes: [],
        },
      });
    }

    if (body.action === "draw") {
      const readyTeams = tournament.teams.filter(isTeamReady);

      if (readyTeams.length < 2) {
        return NextResponse.json(
          { error: "Нужно минимум 2 готовые команды (5/5 в основе)" },
          { status: 400 },
        );
      }

      const readyTeamIds = readyTeams.map((team) => team.id);
      const bracketFormat =
        body.bracketFormat === "round_robin" ? "round_robin" : "groups_playoff";

      tournament.bracket =
        bracketFormat === "round_robin"
          ? buildRoundRobinBracket(readyTeamIds)
          : buildBracket(readyTeamIds);

      await saveTournament(tournament);

      return NextResponse.json({ bracket: tournament.bracket });
    }

    if (body.action === "clear-bracket") {
      tournament.bracket = null;
      await saveTournament(tournament);

      return NextResponse.json({ bracket: null });
    }

    if (body.action === "set-winner") {
      if (!tournament.bracket || !body.matchId || !body.winnerId) {
        return NextResponse.json(
          { error: "Некорректные данные матча" },
          { status: 400 },
        );
      }

      if (!isSupportedBracket(tournament.bracket)) {
        return NextResponse.json(
          { error: "Старая сетка. Запустите жеребьёвку заново." },
          { status: 400 },
        );
      }

      try {
        applyMatchWinner(tournament.bracket, body.matchId, body.winnerId);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Ошибка обновления матча";
        const status = message === "Матч не найден" ? 404 : 400;
        return NextResponse.json({ error: message }, { status });
      }

      await saveTournament(tournament);
      return NextResponse.json({ bracket: tournament.bracket });
    }

    if (body.action === "delete-team") {
      if (!body.teamId) {
        return NextResponse.json({ error: "Не указана команда" }, { status: 400 });
      }

      tournament.teams = tournament.teams.filter((team) => team.id !== body.teamId);
      tournament.bracket = null;
      await saveTournament(tournament);

      return NextResponse.json({
        teams: tournament.teams.map(toPublicTeam),
      });
    }

    return NextResponse.json({ error: "Неизвестное действие" }, { status: 400 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Ошибка админ-действия";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
