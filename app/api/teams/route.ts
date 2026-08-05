import { NextResponse } from "next/server";

import { isValidTeamBlock } from "@/lib/blocks";
import {
  createEntityId,
  createManageToken,
  getTournament,
  isPersonAlreadyRegistered,
  removeMatchingLegionnaires,
  saveTournament,
  toPublicTeam,
} from "@/lib/db";
import { findEmployeeById } from "@/lib/employees";
import type { Team, TeamMember } from "@/lib/types";

type CreateTeamBody = {
  teamName?: string;
  block?: string;
  employeeId?: string;
  manualFullName?: string;
  manualDepartment?: string;
  mode?: "directory" | "manual";
};

export async function GET() {
  const tournament = await getTournament();

  return NextResponse.json({
    settings: tournament.settings,
    teams: tournament.teams.map(toPublicTeam),
    bracket: tournament.bracket,
  });
}

export async function POST(request: Request) {
  try {
    const tournament = await getTournament();

    if (!tournament.settings.registrationOpen) {
      return NextResponse.json(
        { error: "Регистрация закрыта" },
        { status: 403 },
      );
    }

    const body = (await request.json()) as CreateTeamBody;
    const teamName = body.teamName?.trim() || "";
    const blockName = body.block?.trim() || "";
    const mode = body.mode || "directory";

    if (teamName.length < 2 || teamName.length > 40) {
      return NextResponse.json(
        { error: "Название команды: от 2 до 40 символов" },
        { status: 400 },
      );
    }

    if (!isValidTeamBlock(blockName)) {
      return NextResponse.json(
        { error: "Выберите блок из списка" },
        { status: 400 },
      );
    }

    if (
      tournament.teams.some(
        (team) =>
          team.name.toLocaleLowerCase("ru-RU") === teamName.toLocaleLowerCase("ru-RU"),
      )
    ) {
      return NextResponse.json(
        { error: "Команда с таким названием уже есть" },
        { status: 409 },
      );
    }

    let captain: TeamMember;

    if (mode === "directory") {
      if (!body.employeeId) {
        return NextResponse.json(
          { error: "Выберите капитана из справочника" },
          { status: 400 },
        );
      }

      const employee = findEmployeeById(body.employeeId);

      if (!employee) {
        return NextResponse.json(
          { error: "Сотрудник не найден в справочнике" },
          { status: 404 },
        );
      }

      if (await isPersonAlreadyRegistered(employee.fullName, employee.id)) {
        return NextResponse.json(
          { error: "Этот сотрудник уже в другой команде" },
          { status: 409 },
        );
      }

      captain = {
        id: createEntityId("member"),
        fullName: employee.fullName,
        department: employee.department,
        role: "captain",
        isConfirmed: true,
        employeeId: employee.id,
      };
    } else {
      const manualFullName = body.manualFullName?.trim() || "";
      const manualDepartment = body.manualDepartment?.trim() || "";

      if (manualFullName.length < 5) {
        return NextResponse.json(
          { error: "Укажите имя и фамилию капитана" },
          { status: 400 },
        );
      }

      if (manualDepartment.length < 2) {
        return NextResponse.json(
          { error: "Укажите подразделение" },
          { status: 400 },
        );
      }

      if (await isPersonAlreadyRegistered(manualFullName, null)) {
        return NextResponse.json(
          { error: "Человек с таким ФИО уже в команде" },
          { status: 409 },
        );
      }

      captain = {
        id: createEntityId("member"),
        fullName: manualFullName,
        department: manualDepartment,
        role: "captain",
        isConfirmed: false,
        employeeId: null,
      };
    }

    const team: Team = {
      id: createEntityId("team"),
      name: teamName,
      block: blockName,
      department: captain.department,
      manageToken: createManageToken(),
      members: [captain],
      createdAt: new Date().toISOString(),
    };

    tournament.teams.push(team);
    removeMatchingLegionnaires(tournament, captain.fullName, captain.employeeId);
    tournament.bracket = null;
    await saveTournament(tournament);

    return NextResponse.json({
      team: toPublicTeam(team),
      manageToken: team.manageToken,
      manageUrl: `/manage/${team.manageToken}`,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Не удалось сохранить команду";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
