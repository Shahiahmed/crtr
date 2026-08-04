import { getTournament, toPublicTeam } from "@/lib/db";
import type { TeamMember } from "@/lib/types";

export const revalidate = 5;

function TrophyCup({ tone }: { tone: "gold" | "silver" | "bronze" }) {
  return (
    <svg
      className={`prizes__cup prizes__cup--${tone}`}
      viewBox="0 0 64 72"
      aria-hidden="true"
      focusable="false"
    >
      <path
        className="prizes__cup-bowl"
        d="M16 10h32v10c0 11-7 20-16 20S16 31 16 20V10z"
      />
      <path className="prizes__cup-handle" d="M16 14H10c-3 0-5 3-5 6 0 7 4 12 11 14" />
      <path className="prizes__cup-handle" d="M48 14h6c3 0 5 3 5 6 0 7-4 12-11 14" />
      <rect className="prizes__cup-stem" x="28" y="40" width="8" height="10" rx="1" />
      <path className="prizes__cup-base" d="M22 50h20l4 8H18l4-8z" />
      <rect className="prizes__cup-plate" x="14" y="58" width="36" height="5" rx="1.5" />
    </svg>
  );
}

function displayName(fullName: string, isFromDirectory: boolean): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return fullName;
  }

  if (parts.length === 1) {
    return parts[0];
  }

  // Manual entry is already "FirstName Surname"
  if (!isFromDirectory) {
    return `${parts[0]} ${parts[1]}`;
  }

  // Directory format: Surname FirstName [Patronymic] → FirstName Surname
  return `${parts[1]} ${parts[0]}`;
}

function roleLabel(role: TeamMember["role"]): string {
  if (role === "captain") {
    return "Капитан";
  }

  if (role === "substitute") {
    return "Запас";
  }

  return "Основной";
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

        <div className="prizes" aria-label="Призовые места">
          <article className="prizes__item prizes__item--silver">
            <TrophyCup tone="silver" />
            <span className="prizes__place">2 место</span>
            <strong className="prizes__amount">30 000 ₸</strong>
          </article>
          <article className="prizes__item prizes__item--gold">
            <TrophyCup tone="gold" />
            <span className="prizes__place">1 место</span>
            <strong className="prizes__amount">50 000 ₸</strong>
          </article>
          <article className="prizes__item prizes__item--bronze">
            <TrophyCup tone="bronze" />
            <span className="prizes__place">3 место</span>
            <strong className="prizes__amount">20 000 ₸</strong>
          </article>
        </div>

        {teams.length === 0 ? (
          <p className="muted">Команд пока нет.</p>
        ) : (
          <div className="teams-table panel">
            <div className="teams-table__head">
              <span>Команда</span>
              <div className="teams-people__head">
                <span>Участник</span>
                <span>Роль</span>
                <span>Статус</span>
                <span>Департамент</span>
              </div>
              <span>Состав</span>
            </div>
            {teams.map((team) => {
              const members = sortMembers(team.members);

              return (
                <article key={team.id} className="teams-table__row">
                  <div className="teams-table__team">
                    <strong className="teams-table__name">{team.name}</strong>
                    {team.block ? <span className="teams-table__block">Блок: {team.block}</span> : null}
                  </div>

                  <ul className="teams-people">
                    {members.length === 0 ? (
                      <li className="teams-people__empty">Пока никого нет</li>
                    ) : (
                      members.map((member) => (
                        <li key={member.id} className="teams-people__item">
                          <strong className="teams-people__name">
                            {displayName(member.fullName, member.isConfirmed)}
                          </strong>
                          <span className="teams-people__role">{roleLabel(member.role)}</span>
                          <span
                            className={`teams-people__status ${member.isConfirmed ? "is-ok" : "is-manual"}`}
                          >
                            {member.isConfirmed ? "Справочник" : "Вручную"}
                          </span>
                          <span className="teams-people__department">
                            {member.department}
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
