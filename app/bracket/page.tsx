import BracketBoard from "@/components/BracketBoard";
import { getTournament, toPublicTeam } from "@/lib/db";

export const revalidate = 5;

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
          <h1 className="section__title">Сетка турнира</h1>
          <p className="section__text">
            Формат: группы + плей-офф. Жеребьёвка ещё не запускалась. Админ
            запускает её, когда готовы минимум 2 команды с составом 5/5.
          </p>
        </section>
      </main>
    );
  }

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
          . Участвует команд: {bracket.teamIds.length}. Формат: группы →
          полуфинал → финал и матч за 3 место.
        </p>

        <BracketBoard bracket={bracket} teams={teams} />
      </section>
    </main>
  );
}
