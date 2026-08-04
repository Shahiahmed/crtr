import { NextResponse } from "next/server";

import {
  ADMIN_COOKIE_NAME,
  createAdminSessionValue,
  isAdminAuthenticated,
  verifyAdminCredentials,
} from "@/lib/auth";
import {
  buildBracket,
  createAccessCode,
  getTournament,
  isTeamReady,
  saveTournament,
  toPublicTeam,
} from "@/lib/db";

export async function GET() {
  const isAuthenticated = await isAdminAuthenticated();
  const tournament = await getTournament();

  if (!isAuthenticated) {
    return NextResponse.json({ authenticated: false });
  }

  let hasUpdatedLegacyTeams = false;

  for (const team of tournament.teams) {
    if (!team.accessCode) {
      team.accessCode = createAccessCode();
      hasUpdatedLegacyTeams = true;
    }
  }

  if (hasUpdatedLegacyTeams) {
    await saveTournament(tournament);
  }

  return NextResponse.json({
    authenticated: true,
    settings: tournament.settings,
    teams: tournament.teams.map((team) => ({
      ...toPublicTeam(team),
      manageToken: team.manageToken,
      accessCode: team.accessCode,
    })),
    bracket: tournament.bracket,
  });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      action?: string;
      username?: string;
      password?: string;
      registrationOpen?: boolean;
      matchId?: string;
      winnerId?: string;
      teamId?: string;
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

    if (body.action === "draw") {
      const readyTeams = tournament.teams.filter(isTeamReady);

      if (readyTeams.length < 2) {
        return NextResponse.json(
          { error: "Нужно минимум 2 готовые команды (5/5 в основе)" },
          { status: 400 },
        );
      }

      tournament.bracket = buildBracket(readyTeams.map((team) => team.id));
      await saveTournament(tournament);

      return NextResponse.json({ bracket: tournament.bracket });
    }

    if (body.action === "set-winner") {
      if (!tournament.bracket || !body.matchId || !body.winnerId) {
        return NextResponse.json(
          { error: "Некорректные данные матча" },
          { status: 400 },
        );
      }

      const match = tournament.bracket.matches.find(
        (item) => item.id === body.matchId,
      );

      if (!match) {
        return NextResponse.json({ error: "Матч не найден" }, { status: 404 });
      }

      if (body.winnerId !== match.teamAId && body.winnerId !== match.teamBId) {
        return NextResponse.json(
          { error: "Победитель не из этого матча" },
          { status: 400 },
        );
      }

      match.winnerId = body.winnerId;

      const nextRound = match.round + 1;
      const nextPosition = Math.floor(match.position / 2);
      const nextMatch = tournament.bracket.matches.find(
        (item) => item.round === nextRound && item.position === nextPosition,
      );

      if (nextMatch) {
        if (match.position % 2 === 0) {
          nextMatch.teamAId = body.winnerId;
        } else {
          nextMatch.teamBId = body.winnerId;
        }

        if (nextMatch.teamAId && !nextMatch.teamBId) {
          nextMatch.winnerId = nextMatch.teamAId;
        } else if (!nextMatch.teamAId && nextMatch.teamBId) {
          nextMatch.winnerId = nextMatch.teamBId;
        } else if (
          nextMatch.winnerId &&
          nextMatch.winnerId !== nextMatch.teamAId &&
          nextMatch.winnerId !== nextMatch.teamBId
        ) {
          nextMatch.winnerId = null;
        }
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
