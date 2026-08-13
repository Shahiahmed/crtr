"use client";

import {
  getBracketFormatLabel,
  getGroupStandings,
  getStageLabel,
  isLegacyBracket,
} from "@/lib/bracket";
import type { Bracket, BracketMatch, MatchStage } from "@/lib/types";

type TeamInfo = {
  id: string;
  name: string;
  starterCount?: number;
};

type BracketBoardProps = {
  bracket: Bracket;
  teams: TeamInfo[];
  interactive?: boolean;
  isBusy?: boolean;
  onSelectWinner?: (matchId: string, winnerId: string) => void;
};

function emptySlotLabel(match: BracketMatch): string {
  if (match.stage === "group") {
    return "—";
  }

  return "ожидание";
}

function MatchBlock({
  match,
  teamsById,
  interactive,
  isBusy,
  onSelectWinner,
  serverLabel,
}: {
  match: BracketMatch;
  teamsById: Map<string, TeamInfo>;
  interactive?: boolean;
  isBusy?: boolean;
  onSelectWinner?: (matchId: string, winnerId: string) => void;
  serverLabel?: string;
}) {
  const teamA = match.teamAId ? teamsById.get(match.teamAId) : null;
  const teamB = match.teamBId ? teamsById.get(match.teamBId) : null;
  const teamALabel = teamA?.name || emptySlotLabel(match);
  const teamBLabel = teamB?.name || emptySlotLabel(match);
  const teamAMeta =
    teamA?.starterCount !== undefined ? `${teamA.starterCount}/5` : "";
  const teamBMeta =
    teamB?.starterCount !== undefined ? `${teamB.starterCount}/5` : "";

  return (
    <div className="match">
      {serverLabel ? (
        <p className="match__server">{serverLabel}</p>
      ) : null}

      {interactive && onSelectWinner ? (
        <>
          <button
            type="button"
            className={match.winnerId === match.teamAId ? "is-winner" : ""}
            disabled={!match.teamAId || isBusy}
            onClick={() =>
              match.teamAId && onSelectWinner(match.id, match.teamAId)
            }
          >
            <span>{teamALabel}</span>
            <span>{teamA ? "A" : "—"}</span>
          </button>
          <button
            type="button"
            className={match.winnerId === match.teamBId ? "is-winner" : ""}
            disabled={!match.teamBId || isBusy}
            onClick={() =>
              match.teamBId && onSelectWinner(match.id, match.teamBId)
            }
          >
            <span>{teamBLabel}</span>
            <span>{teamB ? "B" : "—"}</span>
          </button>
        </>
      ) : (
        <>
          <div
            className={`match__side${match.winnerId && match.winnerId === match.teamAId ? " is-winner" : ""}`}
          >
            <span>{teamALabel}</span>
            <span>{teamAMeta || "—"}</span>
          </div>
          <div
            className={`match__side${match.winnerId && match.winnerId === match.teamBId ? " is-winner" : ""}`}
          >
            <span>{teamBLabel}</span>
            <span>{teamBMeta || "—"}</span>
          </div>
        </>
      )}
    </div>
  );
}

function StageColumn({
  title,
  matches,
  teamsById,
  interactive,
  isBusy,
  onSelectWinner,
}: {
  title: string;
  matches: BracketMatch[];
  teamsById: Map<string, TeamInfo>;
  interactive?: boolean;
  isBusy?: boolean;
  onSelectWinner?: (matchId: string, winnerId: string) => void;
}) {
  if (matches.length === 0) {
    return null;
  }

  return (
    <div className="bracket__round">
      <h3>{title}</h3>
      {matches.map((match) => (
        <MatchBlock
          key={match.id}
          match={match}
          teamsById={teamsById}
          interactive={interactive}
          isBusy={isBusy}
          onSelectWinner={onSelectWinner}
        />
      ))}
    </div>
  );
}

function GroupPanel({
  groupId,
  bracket,
  teamsById,
  interactive,
  isBusy,
  onSelectWinner,
}: {
  groupId: "A" | "B";
  bracket: Bracket;
  teamsById: Map<string, TeamInfo>;
  interactive?: boolean;
  isBusy?: boolean;
  onSelectWinner?: (matchId: string, winnerId: string) => void;
}) {
  const group = bracket.groups.find((item) => item.id === groupId);

  if (!group) {
    return null;
  }

  const standings = getGroupStandings(bracket, groupId);
  const matches = bracket.matches
    .filter((match) => match.stage === "group" && match.groupId === groupId)
    .sort((left, right) => left.position - right.position);

  return (
    <div className="bracket-group">
      <h3 className="bracket-group__title">Группа {groupId}</h3>

      <table className="standings">
        <thead>
          <tr>
            <th>#</th>
            <th>Команда</th>
            <th>И</th>
            <th>В</th>
            <th>П</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((standing) => {
            const team = teamsById.get(standing.teamId);

            return (
              <tr
                key={standing.teamId}
                className={standing.place <= 2 ? "is-qualify" : undefined}
              >
                <td>{standing.place}</td>
                <td>{team?.name || standing.teamId}</td>
                <td>{standing.played}</td>
                <td>{standing.wins}</td>
                <td>{standing.losses}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="bracket-group__matches">
        {matches.map((match) => (
          <MatchBlock
            key={match.id}
            match={match}
            teamsById={teamsById}
            interactive={interactive}
            isBusy={isBusy}
            onSelectWinner={onSelectWinner}
          />
        ))}
      </div>
    </div>
  );
}

function RoundRobinBoard({
  bracket,
  teamsById,
  interactive,
  isBusy,
  onSelectWinner,
}: {
  bracket: Bracket;
  teamsById: Map<string, TeamInfo>;
  interactive?: boolean;
  isBusy?: boolean;
  onSelectWinner?: (matchId: string, winnerId: string) => void;
}) {
  const standings = getGroupStandings(bracket, "A");
  const groupMatches = bracket.matches.filter(
    (match) => match.stage === "group",
  );
  const roundNumbers = [
    ...new Set(groupMatches.map((match) => match.round)),
  ].sort((left, right) => left - right);

  return (
    <div className="bracket-rr">
      <div className="bracket-group">
        <h3 className="bracket-group__title">Общая таблица</h3>
        <p className="field__hint" style={{ marginBottom: "0.75rem" }}>
          Топ-2 → финал. 3–4 место → матч за бронзу. Максимум 2 матча в туре
          (2 сервера).
        </p>

        <table className="standings">
          <thead>
            <tr>
              <th>#</th>
              <th>Команда</th>
              <th>И</th>
              <th>В</th>
              <th>П</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((standing) => {
              const team = teamsById.get(standing.teamId);

              return (
                <tr
                  key={standing.teamId}
                  className={
                    standing.place <= 2
                      ? "is-qualify"
                      : standing.place <= 4
                        ? "is-bronze-zone"
                        : undefined
                  }
                >
                  <td>{standing.place}</td>
                  <td>{team?.name || standing.teamId}</td>
                  <td>{standing.played}</td>
                  <td>{standing.wins}</td>
                  <td>{standing.losses}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="bracket-rr__rounds">
        {roundNumbers.map((roundNumber) => {
          const roundMatches = groupMatches
            .filter((match) => match.round === roundNumber)
            .sort((left, right) => left.position - right.position);

          const playingTeamIds = new Set<string>();
          for (const match of roundMatches) {
            if (match.teamAId) {
              playingTeamIds.add(match.teamAId);
            }
            if (match.teamBId) {
              playingTeamIds.add(match.teamBId);
            }
          }

          const restingTeams = bracket.teamIds
            .filter((teamId) => !playingTeamIds.has(teamId))
            .map((teamId) => teamsById.get(teamId)?.name || teamId);

          return (
            <article key={roundNumber} className="bracket-rr__round panel">
              <h3>Тур {roundNumber}</h3>
              {restingTeams.length > 0 ? (
                <p className="field__hint">
                  Отдыхают: {restingTeams.join(", ")}
                </p>
              ) : null}
              <div className="bracket-rr__matches">
                {roundMatches.map((match) => (
                  <MatchBlock
                    key={match.id}
                    match={match}
                    teamsById={teamsById}
                    interactive={interactive}
                    isBusy={isBusy}
                    onSelectWinner={onSelectWinner}
                    serverLabel={`Сервер ${match.position + 1}`}
                  />
                ))}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

export default function BracketBoard({
  bracket,
  teams,
  interactive = false,
  isBusy = false,
  onSelectWinner,
}: BracketBoardProps) {
  const teamsById = new Map(teams.map((team) => [team.id, team]));

  if (isLegacyBracket(bracket)) {
    return (
      <p className="section__text">
        Старая сетка больше не поддерживается. Запустите жеребьёвку заново в
        админке.
      </p>
    );
  }

  const playoffStages: MatchStage[] = ["semifinal", "final", "third_place"];
  const playoffMatches = bracket.matches.filter((match) =>
    playoffStages.includes(match.stage),
  );

  const semifinals = playoffMatches
    .filter((match) => match.stage === "semifinal")
    .sort((left, right) => left.position - right.position);
  const finals = playoffMatches
    .filter((match) => match.stage === "final")
    .sort((left, right) => left.position - right.position);
  const thirdPlace = playoffMatches
    .filter((match) => match.stage === "third_place")
    .sort((left, right) => left.position - right.position);

  if (bracket.format === "round_robin") {
    return (
      <div className="bracket-board">
        <p className="field__hint" style={{ marginBottom: "1rem" }}>
          Формат: {getBracketFormatLabel(bracket.format)}
        </p>
        <RoundRobinBoard
          bracket={bracket}
          teamsById={teamsById}
          interactive={interactive}
          isBusy={isBusy}
          onSelectWinner={onSelectWinner}
        />
        {playoffMatches.length > 0 ? (
          <div className="bracket" style={{ marginTop: "1.25rem" }}>
            <div className="bracket__rounds">
              <StageColumn
                title={getStageLabel("final")}
                matches={finals}
                teamsById={teamsById}
                interactive={interactive}
                isBusy={isBusy}
                onSelectWinner={onSelectWinner}
              />
              <StageColumn
                title={getStageLabel("third_place")}
                matches={thirdPlace}
                teamsById={teamsById}
                interactive={interactive}
                isBusy={isBusy}
                onSelectWinner={onSelectWinner}
              />
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  const hasGroups =
    bracket.groups.length > 0 &&
    bracket.matches.some((match) => match.stage === "group");

  return (
    <div className="bracket-board">
      {hasGroups ? (
        <div className="bracket-groups">
          {bracket.groups.map((group) => (
            <GroupPanel
              key={group.id}
              groupId={group.id}
              bracket={bracket}
              teamsById={teamsById}
              interactive={interactive}
              isBusy={isBusy}
              onSelectWinner={onSelectWinner}
            />
          ))}
        </div>
      ) : null}

      {playoffMatches.length > 0 ? (
        <div className="bracket">
          <div className="bracket__rounds">
            <StageColumn
              title={getStageLabel("semifinal")}
              matches={semifinals}
              teamsById={teamsById}
              interactive={interactive}
              isBusy={isBusy}
              onSelectWinner={onSelectWinner}
            />
            <StageColumn
              title={getStageLabel("final")}
              matches={finals}
              teamsById={teamsById}
              interactive={interactive}
              isBusy={isBusy}
              onSelectWinner={onSelectWinner}
            />
            <StageColumn
              title={getStageLabel("third_place")}
              matches={thirdPlace}
              teamsById={teamsById}
              interactive={interactive}
              isBusy={isBusy}
              onSelectWinner={onSelectWinner}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
