import { NextResponse } from "next/server";

import {
  ADMIN_COOKIE_NAME,
  createAdminSessionValue,
  isAdminAuthenticated,
  verifyAdminCredentials,
} from "@/lib/auth";
import { applyMatchWinner, buildBracket } from "@/lib/bracket";
import {
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

  return NextResponse.json({
    authenticated: true,
    settings: tournament.settings,
    teams: tournament.teams.map((team) => ({
      ...toPublicTeam(team),
      manageToken: team.manageToken,
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

      if ((tournament.bracket as { format?: string }).format !== "groups_playoff") {
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
