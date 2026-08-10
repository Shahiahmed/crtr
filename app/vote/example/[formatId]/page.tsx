import Link from "next/link";
import { notFound } from "next/navigation";

import { FormatPreview } from "@/components/FormatPreview";
import { getTournament } from "@/lib/db";
import {
  getFormatById,
  getSeriesPlainLabel,
  isTournamentFormatId,
} from "@/lib/formats";

export const revalidate = 5;

type FormatExamplePageProps = {
  params: Promise<{ formatId: string }>;
};

export default async function FormatExamplePage({
  params,
}: FormatExamplePageProps) {
  const { formatId } = await params;

  if (!isTournamentFormatId(formatId)) {
    notFound();
  }

  const format = getFormatById(formatId);

  if (!format) {
    notFound();
  }

  const tournament = await getTournament();
  const teamNames = tournament.teams.map((team) => team.name);

  return (
    <main className="page">
      <section className="section">
        <p className="field__hint" style={{ marginBottom: "0.75rem" }}>
          <Link href="/vote">← Назад к голосованию</Link>
        </p>

        <h1 className="section__title">{format.title}</h1>
        <p className="section__text">{format.summary}</p>

        <div className="stats-row" style={{ marginBottom: "1.25rem" }}>
          <div className="stat">
            <strong>{format.shortLabel}</strong>
            <span>вариант</span>
          </div>
          <div className="stat">
            <strong>{getSeriesPlainLabel(format.groupSeries)}</strong>
            <span>в группах</span>
          </div>
          <div className="stat">
            <strong>{getSeriesPlainLabel(format.playoffSeries)}</strong>
            <span>дальше</span>
          </div>
          <div className="stat">
            <strong>{format.durationLabel}</strong>
            <span>примерно</span>
          </div>
        </div>

        <article className="panel" style={{ marginBottom: "1.25rem" }}>
          <h2>Что важно</h2>
          <ul className="format-vote__highlights">
            {format.highlights.map((highlight) => (
              <li key={highlight}>{highlight}</li>
            ))}
          </ul>
        </article>

        <article className="panel" style={{ marginBottom: "1.25rem" }}>
          <h2>Пример сетки</h2>
          <p className="muted" style={{ marginBottom: "1rem" }}>
            Схема для понимания. Реальная жеребьёвка перемешает команды.
          </p>
          <FormatPreview format={format} teamNames={teamNames} />
        </article>

        <div className="hero__actions">
          <Link href="/vote#vote-form" className="button">
            Голосовать за формат
          </Link>
        </div>
      </section>
    </main>
  );
}
