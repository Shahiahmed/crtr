import { getTournament, toPublicTeam } from "@/lib/db";

export const dynamic = "force-dynamic";

const ROUND_LABELS: Record<number, string> = {
  1: "1/8 / старт",
  2: "1/4",
  3: "1/2",
  4: "Финал",
};

export default function BracketPage() {
  const tournament = getTournament();
  const teamsById = new Map(
    tournament.teams.map((team) => [team.id, toPublicTeam(team)]),
  );
  const bracket = tournament.bracket;

  if (!bracket) {
    return (
      <main className="page">
        <section className="section">
          <h1 className="section__title">Сетка турнира</h1>
          <p className="section__text">
            Жеребьёвка ещё не запускалась. Админ запускает её, когда готовы минимум 2
            команды с составом 5/5.
          </p>
        </section>
      </main>
    );
  }

  const rounds = [...new Set(bracket.matches.map((match) => match.round))].sort(
    (left, right) => left - right,
  );
  const maxRound = Math.max(...rounds);

  return (
    <main className="page">
      <section className="section">
        <h1 className="section__title">Сетка турнира</h1>
        <p className="section__text">
          Жеребьёвка от{" "}
          {new Date(bracket.createdAt).toLocaleString("ru-RU", {
            dateStyle: "medium",
            timeStyle: "short",
          })}
          . Участвует команд: {bracket.teamIds.length}.
        </p>

        <div className="bracket">
          <div className="bracket__rounds">
            {rounds.map((round) => {
              const roundMatches = bracket.matches
                .filter((match) => match.round === round)
                .sort((left, right) => left.position - right.position);

              const label =
                round === maxRound
                  ? "Финал"
                  : ROUND_LABELS[round] || `Раунд ${round}`;

              return (
                <div key={round} className="bracket__round">
                  <h3>{label}</h3>
                  {roundMatches.map((match) => {
                    const teamA = match.teamAId
                      ? teamsById.get(match.teamAId)
                      : null;
                    const teamB = match.teamBId
                      ? teamsById.get(match.teamBId)
                      : null;

                    return (
                      <div key={match.id} className="match">
                        <div
                          className={`match__side${match.winnerId && match.winnerId === match.teamAId ? " is-winner" : ""}`}
                        >
                          <span>{teamA?.name || "BYE"}</span>
                          <span>{teamA ? `${teamA.starterCount}/5` : "—"}</span>
                        </div>
                        <div
                          className={`match__side${match.winnerId && match.winnerId === match.teamBId ? " is-winner" : ""}`}
                        >
                          <span>{teamB?.name || "BYE"}</span>
                          <span>{teamB ? `${teamB.starterCount}/5` : "—"}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}
