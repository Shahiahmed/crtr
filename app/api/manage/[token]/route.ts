import { NextResponse } from "next/server";

import { isValidTeamBlock } from "@/lib/blocks";
import {
  createEntityId,
  getStarterMembers,
  getTournament,
  isPersonAlreadyRegistered,
  MAIN_ROSTER_SIZE,
  removeMatchingLegionnaires,
  saveTournament,
  toPublicTeam,
} from "@/lib/db";
import { findEmployeeById } from "@/lib/employees";
import type { MemberRole, TeamMember } from "@/lib/types";

type RouteContext = {
  params: Promise<{ token: string }>;
};

type AddMemberBody = {
  action?: "add-member" | "update-team";
  mode?: "directory" | "manual";
  employeeId?: string;
  manualFullName?: string;
  manualDepartment?: string;
  asSubstitute?: boolean;
  teamName?: string;
  block?: string;
};

export async function GET(_request: Request, context: RouteContext) {
  const { token } = await context.params;
  const tournament = await getTournament();
  const teamIndex = tournament.teams.findIndex((team) => team.manageToken === token);

  if (teamIndex < 0) {
    return NextResponse.json({ error: "Команда не найдена" }, { status: 404 });
  }

  const team = tournament.teams[teamIndex];

  return NextResponse.json({
    team: toPublicTeam(team),
    manageToken: team.manageToken,
  });
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { token } = await context.params;
    const tournament = await getTournament();
    const teamIndex = tournament.teams.findIndex(
      (team) => team.manageToken === token,
    );

    if (teamIndex < 0) {
      return NextResponse.json({ error: "Команда не найдена" }, { status: 404 });
    }

    const body = (await request.json()) as AddMemberBody;
    const action = body.action || "add-member";

    if (action === "update-team") {
      const teamName = body.teamName?.trim() || "";
      const blockName = body.block?.trim() || "";

      if (teamName.length < 2) {
        return NextResponse.json(
          { error: "Укажите название команды" },
          { status: 400 },
        );
      }

      if (teamName.length > 40) {
        return NextResponse.json(
          { error: "Название команды слишком длинное" },
          { status: 400 },
        );
      }

      if (!isValidTeamBlock(blockName)) {
        return NextResponse.json(
          { error: "Выберите блок из списка" },
          { status: 400 },
        );
      }

      const normalizedTeamName = teamName.toLocaleLowerCase("ru-RU");
      const hasDuplicateName = tournament.teams.some(
        (team, index) =>
          index !== teamIndex &&
          team.name.trim().toLocaleLowerCase("ru-RU") === normalizedTeamName,
      );

      if (hasDuplicateName) {
        return NextResponse.json(
          { error: "Команда с таким названием уже есть" },
          { status: 409 },
        );
      }

      tournament.teams[teamIndex].name = teamName;
      tournament.teams[teamIndex].block = blockName;
      await saveTournament(tournament);

      return NextResponse.json({
        team: toPublicTeam(tournament.teams[teamIndex]),
      });
    }

    if (!tournament.settings.registrationOpen) {
      return NextResponse.json(
        { error: "Регистрация закрыта" },
        { status: 403 },
      );
    }

    const mode = body.mode || "directory";
    const asSubstitute = Boolean(body.asSubstitute);
    const team = tournament.teams[teamIndex];
    const starterCount = getStarterMembers(team).length;

    if (!asSubstitute && starterCount >= MAIN_ROSTER_SIZE) {
      return NextResponse.json(
        { error: "Основной состав уже заполнен (5). Добавьте как запасного." },
        { status: 400 },
      );
    }

    let member: TeamMember;
    const role: MemberRole = asSubstitute ? "substitute" : "starter";

    if (mode === "directory") {
      if (!body.employeeId) {
        return NextResponse.json(
          { error: "Выберите сотрудника из справочника" },
          { status: 400 },
        );
      }

      const employee = findEmployeeById(body.employeeId);

      if (!employee) {
        return NextResponse.json(
          { error: "Сотрудник не найден" },
          { status: 404 },
        );
      }

      if (await isPersonAlreadyRegistered(employee.fullName, employee.id)) {
        return NextResponse.json(
          { error: "Этот сотрудник уже в команде" },
          { status: 409 },
        );
      }

      member = {
        id: createEntityId("member"),
        fullName: employee.fullName,
        department: employee.department,
        role,
        isConfirmed: true,
        employeeId: employee.id,
      };
    } else {
      const manualFullName = body.manualFullName?.trim() || "";
      const manualDepartment = body.manualDepartment?.trim() || team.department;

      if (manualFullName.length < 5) {
        return NextResponse.json({ error: "Укажите имя и фамилию" }, { status: 400 });
      }

      if (await isPersonAlreadyRegistered(manualFullName, null)) {
        return NextResponse.json(
          { error: "Человек с таким ФИО уже в команде" },
          { status: 409 },
        );
      }

      member = {
        id: createEntityId("member"),
        fullName: manualFullName,
        department: manualDepartment,
        role,
        isConfirmed: false,
        employeeId: null,
      };
    }

    tournament.teams[teamIndex].members.push(member);
    removeMatchingLegionnaires(tournament, member.fullName, member.employeeId);
    tournament.bracket = null;
    await saveTournament(tournament);

    return NextResponse.json({
      team: toPublicTeam(tournament.teams[teamIndex]),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Не удалось сохранить участника";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { token } = await context.params;
    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get("memberId");
    const tournament = await getTournament();
    const teamIndex = tournament.teams.findIndex(
      (team) => team.manageToken === token,
    );

    if (teamIndex < 0) {
      return NextResponse.json({ error: "Команда не найдена" }, { status: 404 });
    }

    if (!memberId) {
      return NextResponse.json({ error: "Не указан участник" }, { status: 400 });
    }

    const team = tournament.teams[teamIndex];
    const member = team.members.find((item) => item.id === memberId);

    if (!member) {
      return NextResponse.json({ error: "Участник не найден" }, { status: 404 });
    }

    if (member.role === "captain") {
      return NextResponse.json(
        { error: "Капитана нельзя удалить" },
        { status: 400 },
      );
    }

    tournament.teams[teamIndex].members = team.members.filter(
      (item) => item.id !== memberId,
    );
    tournament.bracket = null;
    await saveTournament(tournament);

    return NextResponse.json({
      team: toPublicTeam(tournament.teams[teamIndex]),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Не удалось удалить участника";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
