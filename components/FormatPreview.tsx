import {
  getSeriesPlainLabel,
  type SeriesLabel,
  type TournamentFormatOption,
} from "@/lib/formats";

type FormatPreviewProps = {
  format: TournamentFormatOption;
  teamNames: string[];
};

function resolveTeamLabels(teamNames: string[]): string[] {
  const labels = [...teamNames];

  while (labels.length < 6) {
    labels.push(`Команда ${labels.length + 1}`);
  }

  return labels.slice(0, 6);
}

function MatchChip({
  leftLabel,
  rightLabel,
  seriesLabel,
}: {
  leftLabel: string;
  rightLabel: string;
  seriesLabel: string;
}) {
  return (
    <div className="format-preview__match">
      <span className="format-preview__team">{leftLabel}</span>
      <span className="format-preview__vs">vs</span>
      <span className="format-preview__team">{rightLabel}</span>
      <span className="format-preview__series">{seriesLabel}</span>
    </div>
  );
}

function toChipSeries(seriesLabel: SeriesLabel): string {
  return getSeriesPlainLabel(seriesLabel);
}

function GroupsPlayoffPreview({
  format,
  teamLabels,
}: {
  format: TournamentFormatOption;
  teamLabels: string[];
}) {
  const groupA = teamLabels.slice(0, 3);
  const groupB = teamLabels.slice(3, 6);
  const groupSeriesLabel = toChipSeries(format.groupSeries);
  const playoffSeriesLabel = toChipSeries(format.playoffSeries);
  const thirdPlaceSeriesLabel = toChipSeries(
    format.id === "full_bo3" ? "BO3" : "BO1",
  );

  return (
    <div className="format-preview__body">
      <div className="format-preview__groups">
        <div className="format-preview__group">
          <h4>Группа A</h4>
          <ol>
            {groupA.map((teamName) => (
              <li key={teamName}>{teamName}</li>
            ))}
          </ol>
          <p className="format-preview__note">
            3 матча · {groupSeriesLabel}
          </p>
          <div className="format-preview__matches">
            <MatchChip
              leftLabel={groupA[0]}
              rightLabel={groupA[1]}
              seriesLabel={groupSeriesLabel}
            />
            <MatchChip
              leftLabel={groupA[0]}
              rightLabel={groupA[2]}
              seriesLabel={groupSeriesLabel}
            />
            <MatchChip
              leftLabel={groupA[1]}
              rightLabel={groupA[2]}
              seriesLabel={groupSeriesLabel}
            />
          </div>
        </div>

        <div className="format-preview__group">
          <h4>Группа B</h4>
          <ol>
            {groupB.map((teamName) => (
              <li key={teamName}>{teamName}</li>
            ))}
          </ol>
          <p className="format-preview__note">
            3 матча · {groupSeriesLabel}
          </p>
          <div className="format-preview__matches">
            <MatchChip
              leftLabel={groupB[0]}
              rightLabel={groupB[1]}
              seriesLabel={groupSeriesLabel}
            />
            <MatchChip
              leftLabel={groupB[0]}
              rightLabel={groupB[2]}
              seriesLabel={groupSeriesLabel}
            />
            <MatchChip
              leftLabel={groupB[1]}
              rightLabel={groupB[2]}
              seriesLabel={groupSeriesLabel}
            />
          </div>
        </div>
      </div>

      <div className="format-preview__flow" aria-hidden="true">
        <span>топ-2 из каждой группы</span>
      </div>

      <div className="format-preview__playoff">
        <div className="format-preview__stage">
          <h4>Полуфиналы</h4>
          <MatchChip
            leftLabel="1-е A"
            rightLabel="2-е B"
            seriesLabel={playoffSeriesLabel}
          />
          <MatchChip
            leftLabel="1-е B"
            rightLabel="2-е A"
            seriesLabel={playoffSeriesLabel}
          />
        </div>
        <div className="format-preview__stage">
          <h4>Финал</h4>
          <MatchChip
            leftLabel="Победитель ПФ1"
            rightLabel="Победитель ПФ2"
            seriesLabel={playoffSeriesLabel}
          />
        </div>
        <div className="format-preview__stage">
          <h4>За 3 место</h4>
          <MatchChip
            leftLabel="Проигравший ПФ1"
            rightLabel="Проигравший ПФ2"
            seriesLabel={thirdPlaceSeriesLabel}
          />
        </div>
      </div>
    </div>
  );
}

function buildAllPairs(teamLabels: string[]): Array<[string, string]> {
  const pairs: Array<[string, string]> = [];

  for (let leftIndex = 0; leftIndex < teamLabels.length; leftIndex += 1) {
    for (
      let rightIndex = leftIndex + 1;
      rightIndex < teamLabels.length;
      rightIndex += 1
    ) {
      pairs.push([teamLabels[leftIndex], teamLabels[rightIndex]]);
    }
  }

  return pairs;
}

function RoundRobinPreview({
  format,
  teamLabels,
}: {
  format: TournamentFormatOption;
  teamLabels: string[];
}) {
  const groupSeriesLabel = toChipSeries(format.groupSeries);
  const playoffSeriesLabel = toChipSeries(format.playoffSeries);
  const allPairs = buildAllPairs(teamLabels);

  return (
    <div className="format-preview__body">
      <div className="format-preview__group format-preview__group--wide">
        <h4>Одна таблица · 6 команд</h4>
        <ol className="format-preview__team-row">
          {teamLabels.map((teamName, index) => (
            <li key={teamName}>
              <span>{index + 1}.</span> {teamName}
            </li>
          ))}
        </ol>
        <p className="format-preview__note">
          Каждый играет с каждым: все {allPairs.length} матчей ·{" "}
          {groupSeriesLabel}. Можно параллельно 2–3 сервера.
        </p>
        <div className="format-preview__matches">
          {allPairs.map(([leftLabel, rightLabel]) => (
            <MatchChip
              key={`${leftLabel}-${rightLabel}`}
              leftLabel={leftLabel}
              rightLabel={rightLabel}
              seriesLabel={groupSeriesLabel}
            />
          ))}
        </div>
      </div>

      <div className="format-preview__flow" aria-hidden="true">
        <span>по таблице → опциональный финал топ-2</span>
      </div>

      <div className="format-preview__playoff">
        <div className="format-preview__stage">
          <h4>Финал (по желанию)</h4>
          <MatchChip
            leftLabel="1-е место"
            rightLabel="2-е место"
            seriesLabel={playoffSeriesLabel}
          />
        </div>
      </div>
    </div>
  );
}

export function FormatPreview({ format, teamNames }: FormatPreviewProps) {
  const teamLabels = resolveTeamLabels(teamNames);

  return (
    <div className="format-preview">
      <div className="format-preview__meta">
        <span>{format.matchCountLabel}</span>
        <span>{format.durationLabel}</span>
        <span>пример на 6 команд</span>
      </div>

      {format.previewKind === "round_robin" ? (
        <RoundRobinPreview format={format} teamLabels={teamLabels} />
      ) : (
        <GroupsPlayoffPreview format={format} teamLabels={teamLabels} />
      )}
    </div>
  );
}
