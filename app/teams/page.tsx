import { getTournament, toPublicTeam } from "@/lib/db";
import type { TeamMember } from "@/lib/types";

export const revalidate = 5;

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

function shortDepartment(department: string): string {
  return department
    .replace(/^Департамент\s+/i, "Деп. ")
    .replace(/^Служба\s+/i, "Сл. ")
    .replace(/^Офис\s+/i, "Офис ");
}

function roleLabel(role: TeamMember["role"]): string {
  if (role === "captain") {
    return "Капитан";
  }

  if (role === "substitute") {
    return "Запас";
  }

  return "Основа";
}

export default async function TeamsPage() {
  const tournament = await getTournament();
  const teams = tournament.teams.map(toPublicTeam);

  return (
    <main className="page">
      <section className="section">
        <h1 className="section__title">Команды турнира</h1>
        <p className="section__text">
          У каждого игрока — свой департамент. Зелёный бейдж: из справочника, жёлтый —
          вручную.
        </p>

        {teams.length === 0 ? (
          <p className="muted">Команд пока нет.</p>
        ) : (
          <div className="teams-table panel">
            <div className="teams-table__head">
              <span>Команда</span>
              <span>Участники</span>
              <span>Статус</span>
            </div>
            {teams.map((team) => {
              const starters = team.members.filter(
                (member) => member.role === "captain" || member.role === "starter",
              );
              const substitutes = team.members.filter(
                (member) => member.role === "substitute",
              );

              return (
                <article key={team.id} className="teams-table__row">
                  <div>
                    <strong className="teams-table__name">{team.name}</strong>
                    {team.block ? (
                      <p className="teams-table__captain">Блок: {team.block}</p>
                    ) : null}
                    <p className="teams-table__meta" style={{ marginTop: "0.55rem" }}>
                      <span className="badge badge--ok">{team.confirmedCount} OK</span>
                      {team.unconfirmedCount > 0 ? (
                        <span className="badge badge--warn">
                          {team.unconfirmedCount} вручную
                        </span>
                      ) : null}
                    </p>
                  </div>

                  <div className="teams-table__people">
                    {starters.length === 0 ? (
                      <p className="teams-table__roster">—</p>
                    ) : (
                      <ul className="teams-people">
                        {starters.map((member) => (
                          <li key={member.id} className="teams-people__item">
                            <div className="teams-people__main">
                              <strong>{shortName(member.fullName)}</strong>
                              <span className="teams-people__role">
                                {roleLabel(member.role)}
                              </span>
                              <span
                                className={`badge ${member.isConfirmed ? "badge--ok" : "badge--warn"}`}
                              >
                                {member.isConfirmed ? "OK" : "вручную"}
                              </span>
                            </div>
                            <p className="teams-people__department">
                              {shortDepartment(member.department)}
                            </p>
                          </li>
                        ))}
                      </ul>
                    )}

                    {substitutes.length > 0 ? (
                      <ul className="teams-people teams-people--subs">
                        {substitutes.map((member) => (
                          <li key={member.id} className="teams-people__item">
                            <div className="teams-people__main">
                              <strong>{shortName(member.fullName)}</strong>
                              <span className="teams-people__role">Запас</span>
                            </div>
                            <p className="teams-people__department">
                              {shortDepartment(member.department)}
                            </p>
                          </li>
                        ))}
                      </ul>
                    ) : null}
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
