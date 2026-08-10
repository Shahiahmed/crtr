import { NextResponse } from "next/server";

import { getTournament } from "@/lib/db";

export async function GET() {
  const tournament = await getTournament();

  return NextResponse.json({
    registrationOpen: tournament.settings.registrationOpen,
    formatVotingOpen: tournament.settings.formatVotingOpen,
    showBracketNav: tournament.settings.showBracketNav,
    showFormatNav: tournament.settings.showFormatNav,
  });
}
