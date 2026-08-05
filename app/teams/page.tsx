import Link from "next/link";

import { TEAM_BLOCKS } from "@/lib/blocks";
import { getTournament, toPublicLegionnaire, toPublicTeam } from "@/lib/db";
import { formatPublicName } from "@/lib/names";
import type { PublicTeam, TeamMember } from "@/lib/types";

export const revalidate = 5;

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

function buildBlockSummary(teams: PublicTeam[]) {
  const teamsByBlock = new Map<string, string[]>();

  for (const blockName of TEAM_BLOCKS) {
    teamsByBlock.set(blockName, []);
  }

  for (const team of teams) {
    const blockName = team.block?.trim() || "Без блока";
    const teamNames = teamsByBlock.get(blockName);

    if (teamNames) {
      teamNames.push(team.name);
    } else {
      teamsByBlock.set(blockName, [team.name]);
    }
  }

  return [...teamsByBlock.entries()]
    .map(([blockName, teamNames]) => ({
      blockName,
      teamNames,
      teamCount: teamNames.length,
    }))
    .sort((left, right) => {
      if (left.teamCount === 0 && right.teamCount > 0) {
        return 1;
      }

      if (left.teamCount > 0 && right.teamCount === 0) {
        return -1;
      }

      return 0;
    });
}

export default async function TeamsPage() {
  const tournament = await getTournament();
  const teams = tournament.teams.map(toPublicTeam);
  const legionnaires = tournament.legionnaires.map(toPublicLegionnaire);
  const blockSummaries = buildBlockSummary(teams);

  return (
    <main className="page">
      <section className="section">
        {teams.length === 0 ? (
          <p className="muted">Команд пока нет.</p>
        ) : (
          <>
            <div className="blocks-summary">
              <p className="blocks-summary__meta">
                Всего команд: <strong>{teams.length}</strong>
              </p>
              <ul className="blocks-summary__list">
                {blockSummaries.map((blockSummary) => (
                  <li
                    key={blockSummary.blockName}
                    className={`blocks-summary__item${blockSummary.teamCount === 0 ? " is-empty" : ""}`}
                  >
                    <span className="blocks-summary__block">{blockSummary.blockName}</span>
                    <span className="blocks-summary__count">{blockSummary.teamCount}</span>
                    <span className="blocks-summary__teams">
                      {blockSummary.teamNames.length > 0
                        ? blockSummary.teamNames.map((teamName) => (
                            <span key={teamName} className="blocks-summary__team">
                              {teamName}
                            </span>
                          ))
                        : "—"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

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
                      {team.block ? (
                        <span className="teams-table__block">Блок: {team.block}</span>
                      ) : null}
                    </div>

                    <ul className="teams-people">
                      {members.length === 0 ? (
                        <li className="teams-people__empty">Пока никого нет</li>
                      ) : (
                        members.map((member) => (
                          <li key={member.id} className="teams-people__item">
                            <strong className="teams-people__name">
                              {formatPublicName(member.fullName, member.isConfirmed)}
                            </strong>
                            <span className="teams-people__role">
                              {roleLabel(member.role)}
                            </span>
                            <span
                              className={`teams-people__status ${member.isConfirmed ? "is-ok" : "is-manual"}`}
                            >
                              {member.isConfirmed ? "Справочник" : "Вручную"}
                            </span>
                            <span
                              className="teams-people__department"
                              title={member.department}
                            >
                              {member.department}
                            </span>
                          </li>
                        ))
                      )}
                    </ul>

                    <div className="teams-table__status">
                      <span
                        className={`badge ${team.isReady ? "badge--ok" : "badge--muted"}`}
                      >
                        {team.starterCount}/5
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )}

        <div className="legionnaires panel">
          <div className="legionnaires__top">
            <div>
              <h2 className="legionnaires__title">Легионеры</h2>
              <p className="legionnaires__text">
                Игроки без команды. Капитаны могут пригласить их в состав.
              </p>
            </div>
            <Link href="/legionnaire" className="button button--ghost">
              Я без команды
            </Link>
          </div>

          {legionnaires.length === 0 ? (
            <p className="muted">Пока никого нет.</p>
          ) : (
            <ul className="legionnaires__list">
              {legionnaires.map((legionnaire) => (
                <li key={legionnaire.id} className="legionnaires__item">
                  <strong className="legionnaires__name">
                    {formatPublicName(legionnaire.fullName, legionnaire.isConfirmed)}
                  </strong>
                  <span
                    className={`legionnaires__status ${legionnaire.isConfirmed ? "is-ok" : "is-manual"}`}
                  >
                    {legionnaire.isConfirmed ? "Справочник" : "Вручную"}
                  </span>
                  <span
                    className="legionnaires__department"
                    title={legionnaire.department}
                  >
                    {legionnaire.department}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </main>
  );
}
