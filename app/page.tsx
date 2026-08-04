import Image from "next/image";
import Link from "next/link";

import { getTournament, toPublicTeam } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const tournament = await getTournament();
  const teams = tournament.teams.map(toPublicTeam);
  const readyCount = teams.filter((team) => team.isReady).length;

  return (
    <>
      <section className="hero">
        <div className="hero__bg" aria-hidden="true" />
        <div className="hero__layout">
          <div className="hero__content">
            <p className="hero__eyebrow">Live lobby · 5v5</p>
            <p className="hero__brand">
              ЦРТР <span>CS2</span>
            </p>
            <h1 className="hero__headline">Corporate Tournament</h1>
            <p className="hero__text">
              Капитаны собирают пятёрки по подразделениям. Из справочника — свой, вручную —
              на проверке. Потом жеребьёвка и сетка.
            </p>
            <div className="hero__actions">
              <Link href="/register" className="button">
                Создать команду
              </Link>
              <Link href="/teams" className="button button--ghost">
                Смотреть команды
              </Link>
            </div>
            <div className="hero__sides" aria-hidden="true">
              <span className="hero__side hero__side--t">T</span>
              <span className="hero__side hero__side--ct">CT</span>
            </div>
          </div>

          <div className="hero__visual">
            <Image
              src="/hero.png"
              alt="Terrorists CS2"
              width={920}
              height={920}
              priority
              className="hero__image"
            />
          </div>
        </div>
      </section>

      <main className="page">
        <section className="section">
          <h2 className="section__title">Как проходит набор</h2>
          <p className="section__text">
            Один капитан — одна команда. Основа из 5 игроков, запасные без лимита.
          </p>
          <div className="stats-row">
            <div className="stat">
              <strong>{teams.length}</strong>
              <span>команд</span>
            </div>
            <div className="stat">
              <strong>{readyCount}</strong>
              <span>готовы 5/5</span>
            </div>
            <div className="stat">
              <strong>{tournament.settings.registrationOpen ? "OPEN" : "CLOSED"}</strong>
              <span>регистрация</span>
            </div>
          </div>
          <div className="grid-2">
            <article className="panel">
              <h3>1. Капитан регистрируется</h3>
              <p className="muted">
                Выбирает себя из справочника ЦРТР или вносит вручную и задаёт название
                команды.
              </p>
            </article>
            <article className="panel">
              <h3>2. Добавляет состав</h3>
              <p className="muted">
                Из справочника — статус «подтверждён». Вручную — «на проверке», чтобы
                было видно чужих.
              </p>
            </article>
          </div>
        </section>

        <section className="section">
          <h2 className="section__title">Свежие команды</h2>
          {teams.length === 0 ? (
            <p className="muted">Пока никто не создал команду. Будь первым капитаном.</p>
          ) : (
            <div className="team-grid">
              {teams.slice(0, 6).map((team) => (
                <article key={team.id} className="team-card">
                  <div className="team-card__top">
                    <h3>{team.name}</h3>
                    <span className={`badge ${team.isReady ? "badge--ok" : "badge--muted"}`}>
                      {team.starterCount}/5
                    </span>
                  </div>
                  <p>{team.department}</p>
                  <p>
                    Подтверждено: {team.confirmedCount} · Вручную: {team.unconfirmedCount}
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
}
