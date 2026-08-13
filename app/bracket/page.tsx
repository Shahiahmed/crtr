import BracketBoard from "@/components/BracketBoard";
import PrizePodium from "@/components/PrizePodium";
import { getBracketFormatLabel } from "@/lib/bracket";
import { getTournament, toPublicTeam } from "@/lib/db";
import type { Bracket } from "@/lib/types";

export const revalidate = 5;

function getTeamNameById(
  teams: Array<{ id: string; name: string }>,
  teamId: string | null | undefined,
): string | null {
  if (!teamId) {
    return null;
  }

  return teams.find((team) => team.id === teamId)?.name || null;
}

function getMatchLoserId(match: {
  teamAId: string | null;
  teamBId: string | null;
  winnerId: string | null;
}): string | null {
  if (!match.winnerId) {
    return null;
  }

  if (match.winnerId === match.teamAId) {
    return match.teamBId;
  }

  if (match.winnerId === match.teamBId) {
    return match.teamAId;
  }

  return null;
}

function getPodiumNames(
  bracket: Bracket,
  teams: Array<{ id: string; name: string }>,
) {
  const finalMatch = bracket.matches.find((match) => match.stage === "final");
  const thirdPlaceMatch = bracket.matches.find(
    (match) => match.stage === "third_place",
  );

  const championName = getTeamNameById(teams, finalMatch?.winnerId);
  const secondPlaceName = championName
    ? getTeamNameById(teams, finalMatch ? getMatchLoserId(finalMatch) : null)
    : null;
  const thirdPlaceName = getTeamNameById(teams, thirdPlaceMatch?.winnerId);

  return { championName, secondPlaceName, thirdPlaceName };
}

export default async function BracketPage() {
  const tournament = await getTournament();
  const teams = tournament.teams.map((team) => {
    const publicTeam = toPublicTeam(team);

    return {
      id: publicTeam.id,
      name: publicTeam.name,
      starterCount: publicTeam.starterCount,
    };
  });
  const bracket = tournament.bracket;

  if (!bracket) {
    return (
      <main className="page">
        <section className="section">
          <PrizePodium />
          <h1 className="section__title">Сетка турнира</h1>
          <p className="section__text">
            Жеребьёвка ещё не запускалась. В админке можно выбрать формат:
            группы + плей-офф или вариант C (каждый с каждым, 2 сервера).
            Нужно минимум 2 команды с составом 5/5.
          </p>
        </section>
      </main>
    );
  }

  const podium = getPodiumNames(bracket, teams);

  return (
    <main className="page">
      <section className="section">
        <PrizePodium
          championName={podium.championName}
          secondPlaceName={podium.secondPlaceName}
          thirdPlaceName={podium.thirdPlaceName}
        />

        <h1 className="section__title">Сетка турнира</h1>
        <p className="section__text">
          Жеребьёвка от{" "}
          {new Date(bracket.createdAt).toLocaleString("ru-RU", {
            dateStyle: "medium",
            timeStyle: "short",
            timeZone: "Asia/Almaty",
          })}
          . Участвует команд: {bracket.teamIds.length}. Формат:{" "}
          {getBracketFormatLabel(bracket.format)}.
        </p>

        <BracketBoard bracket={bracket} teams={teams} />
      </section>
    </main>
  );
}
