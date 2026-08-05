import { NextResponse } from "next/server";

import {
  createEntityId,
  createManageToken,
  getTournament,
  isPersonAlreadyRegistered,
  isPersonLegionnaire,
  saveTournament,
  toPublicLegionnaire,
} from "@/lib/db";
import { findEmployeeById } from "@/lib/employees";
import type { Legionnaire } from "@/lib/types";

type CreateLegionnaireBody = {
  mode?: "directory" | "manual";
  employeeId?: string;
  manualFullName?: string;
  manualDepartment?: string;
};

export async function GET(request: Request) {
  const tournament = await getTournament();
  const { searchParams } = new URL(request.url);
  const manageToken = searchParams.get("token");

  if (manageToken) {
    const legionnaire = tournament.legionnaires.find(
      (item) => item.manageToken === manageToken,
    );

    if (!legionnaire) {
      return NextResponse.json(
        { error: "Заявка легионера не найдена" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      legionnaire: toPublicLegionnaire(legionnaire),
    });
  }

  return NextResponse.json({
    legionnaires: tournament.legionnaires.map(toPublicLegionnaire),
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

    const body = (await request.json()) as CreateLegionnaireBody;
    const mode = body.mode || "directory";

    let legionnaire: Legionnaire;

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
          { error: "Вы уже в команде" },
          { status: 409 },
        );
      }

      if (await isPersonLegionnaire(employee.fullName, employee.id)) {
        return NextResponse.json(
          { error: "Вы уже в списке легионеров" },
          { status: 409 },
        );
      }

      legionnaire = {
        id: createEntityId("legionnaire"),
        fullName: employee.fullName,
        department: employee.department,
        isConfirmed: true,
        employeeId: employee.id,
        manageToken: createManageToken(),
        createdAt: new Date().toISOString(),
      };
    } else {
      const manualFullName = body.manualFullName?.trim() || "";
      const manualDepartment = body.manualDepartment?.trim() || "";

      if (manualFullName.length < 5) {
        return NextResponse.json(
          { error: "Укажите имя и фамилию" },
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

      if (await isPersonLegionnaire(manualFullName, null)) {
        return NextResponse.json(
          { error: "Вы уже в списке легионеров" },
          { status: 409 },
        );
      }

      legionnaire = {
        id: createEntityId("legionnaire"),
        fullName: manualFullName,
        department: manualDepartment,
        isConfirmed: false,
        employeeId: null,
        manageToken: createManageToken(),
        createdAt: new Date().toISOString(),
      };
    }

    tournament.legionnaires.push(legionnaire);
    await saveTournament(tournament);

    return NextResponse.json({
      legionnaire: toPublicLegionnaire(legionnaire),
      manageToken: legionnaire.manageToken,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Не удалось сохранить заявку";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const manageToken = searchParams.get("token");

    if (!manageToken) {
      return NextResponse.json({ error: "Не указан токен" }, { status: 400 });
    }

    const tournament = await getTournament();
    const legionnaireIndex = tournament.legionnaires.findIndex(
      (item) => item.manageToken === manageToken,
    );

    if (legionnaireIndex < 0) {
      return NextResponse.json(
        { error: "Заявка легионера не найдена" },
        { status: 404 },
      );
    }

    tournament.legionnaires.splice(legionnaireIndex, 1);
    await saveTournament(tournament);

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Не удалось удалить заявку";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
