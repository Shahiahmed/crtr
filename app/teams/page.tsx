import { getTournament, toPublicTeam } from "@/lib/db";

export const dynamic = "force-dynamic";

function shortName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);

  if (parts.length === 0) {
    return fullName;
  }

  if (parts.length === 1) {
    return parts[0];
  }

  const surname = parts[0];
  const initials = parts
    .slice(1)
    .map((part) => `${part.charAt(0).toUpperCase()}.`)
    .join("");

  return `${surname} ${initials}`;
}

export default async function TeamsPage() {
  const tournament = await getTournament();
  const teams = tournament.teams.map(toPublicTeam);

  return (
    <main className="page">
      <section className="section">
        <h1 className="section__title">Команды турнира</h1>
        <p className="section__text">
          Зелёный — из справочника. Жёлтый — добавлен вручную.
        </p>

        {teams.length === 0 ? (
          <p className="muted">Команд пока нет.</p>
        ) : (
          <div className="teams-table panel">
            <div className="teams-table__head">
              <span>Команда</span>
              <span>Состав</span>
              <span>Статус</span>
            </div>
            {teams.map((team) => {
              const captain = team.members.find((member) => member.role === "captain");
              const roster = team.members
                .filter((member) => member.role !== "substitute")
                .map((member) => shortName(member.fullName))
                .join(" · ");
              const substitutes = team.members
                .filter((member) => member.role === "substitute")
                .map((member) => shortName(member.fullName));

              return (
                <article key={team.id} className="teams-table__row">
                  <div>
                    <strong className="teams-table__name">{team.name}</strong>
                    <p className="teams-table__department">{team.department}</p>
                    {captain ? (
                      <p className="teams-table__captain">
                        Капитан: {shortName(captain.fullName)}
                      </p>
                    ) : null}
                  </div>
                  <div>
                    <p className="teams-table__roster">{roster || "—"}</p>
                    {substitutes.length > 0 ? (
                      <p className="teams-table__subs">
                        Запас: {substitutes.join(" · ")}
                      </p>
                    ) : null}
                    <p className="teams-table__meta">
                      <span className="badge badge--ok">{team.confirmedCount} OK</span>
                      {team.unconfirmedCount > 0 ? (
                        <span className="badge badge--warn">
                          {team.unconfirmedCount} вручную
                        </span>
                      ) : null}
                    </p>
                  </div>
                  <div className="teams-table__status">
                    <span className={`badge ${team.isReady ? "badge--ok" : "badge--muted"}`}>
                      {team.isReady ? "Готова" : `${team.starterCount}/5`}
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
