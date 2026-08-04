import { NextResponse } from "next/server";

import { getTournament } from "@/lib/db";

type CaptainLoginBody = {
  teamName?: string;
  accessCode?: string;
};

export async function POST(request: Request) {
  const body = (await request.json()) as CaptainLoginBody;
  const teamName = body.teamName?.trim() || "";
  const accessCode = body.accessCode?.trim() || "";

  if (teamName.length < 2 || accessCode.length < 4) {
    return NextResponse.json(
      { error: "Укажите название команды и код капитана" },
      { status: 400 },
    );
  }

  const tournament = await getTournament();
  const matchedTeam = tournament.teams.find(
    (team) =>
      team.name.toLocaleLowerCase("ru-RU") === teamName.toLocaleLowerCase("ru-RU") &&
      team.accessCode === accessCode,
  );

  if (!matchedTeam) {
    return NextResponse.json(
      { error: "Команда или код не найдены. Проверьте название и код капитана." },
      { status: 404 },
    );
  }

  return NextResponse.json({
    teamName: matchedTeam.name,
    manageToken: matchedTeam.manageToken,
    manageUrl: `/manage/${matchedTeam.manageToken}`,
    accessCode: matchedTeam.accessCode,
  });
}
