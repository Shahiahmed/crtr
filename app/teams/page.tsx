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
    .replace(/^Департамент\s+/i, "")
    .replace(/^Служба\s+/i, "")
    .replace(/^Офис\s+/i, "");
}

function roleLabel(role: TeamMember["role"]): string {
  if (role === "captain") {
    return "кап.";
  }

  if (role === "substitute") {
    return "зап.";
  }

  return "осн.";
}

function sortMembers(members: TeamMember[]): TeamMember[] {
  const roleOrder = { captain: 0, starter: 1, substitute: 2 };

  return [...members].sort(
    (left, right) => roleOrder[left.role] - roleOrder[right.role],
  );
}

export default async function TeamsPage() {
  const tournament = await getTournament();
  const teams = tournament.teams.map(toPublicTeam);

  return (
    <main className="page">
      <section className="section">
        <h1 className="section__title">Команды турнира</h1>
        <p className="section__text">
          В одной строке: игрок, роль и его департамент.
        </p>

        {teams.length === 0 ? (
          <p className="muted">Команд пока нет.</p>
        ) : (
          <div className="teams-table panel">
            <div className="teams-table__head">
              <span>Команда</span>
              <span>Участники</span>
              <span>Состав</span>
            </div>
            {teams.map((team) => {
              const members = sortMembers(team.members);

              return (
                <article key={team.id} className="teams-table__row">
                  <div className="teams-table__team">
                    <strong className="teams-table__name">{team.name}</strong>
                    {team.block ? <span className="teams-table__block">{team.block}</span> : null}
                  </div>

                  <ul className="teams-people">
                    {members.length === 0 ? (
                      <li className="teams-people__empty">Пока никого нет</li>
                    ) : (
                      members.map((member) => (
                        <li key={member.id} className="teams-people__item">
                          <strong className="teams-people__name">
                            {shortName(member.fullName)}
                          </strong>
                          <span className="teams-people__role">{roleLabel(member.role)}</span>
                          <span
                            className={`teams-people__mark ${member.isConfirmed ? "is-ok" : "is-manual"}`}
                            title={member.isConfirmed ? "Из справочника" : "Вручную"}
                          >
                            {member.isConfirmed ? "●" : "○"}
                          </span>
                          <span className="teams-people__department" title={member.department}>
                            {shortDepartment(member.department)}
                          </span>
                        </li>
                      ))
                    )}
                  </ul>

                  <div className="teams-table__status">
                    <span className={`badge ${team.isReady ? "badge--ok" : "badge--muted"}`}>
                      {team.starterCount}/5
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
