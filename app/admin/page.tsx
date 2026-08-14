"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import BracketBoard from "@/components/BracketBoard";
import { TOURNAMENT_FORMATS } from "@/lib/formats";
import { formatPublicName } from "@/lib/names";
import type { Bracket, PublicTeam, TournamentSettings } from "@/lib/types";

type AdminTeam = PublicTeam & { manageToken: string };

type AdminFormatPoll = {
  totalVotes: number;
  counts: Record<string, number>;
  votes: Array<{
    id: string;
    voterName: string;
    department: string;
    isConfirmed: boolean;
    teamName: string;
    formatId: string;
    createdAt: string;
  }>;
};

type AdminState = {
  authenticated: boolean;
  settings?: TournamentSettings;
  teams?: AdminTeam[];
  bracket?: Bracket | null;
  formatPoll?: AdminFormatPoll;
};

export default function AdminPage() {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [state, setState] = useState<AdminState>({ authenticated: false });
  const [errorMessage, setErrorMessage] = useState("");
  const [isBusy, setIsBusy] = useState(false);

  const loadAdmin = useCallback(async () => {
    const response = await fetch("/api/admin");
    const payload = (await response.json()) as AdminState;
    setState(payload);
  }, []);

  useEffect(() => {
    void loadAdmin();
  }, [loadAdmin]);

  async function runAction(body: Record<string, unknown>) {
    setIsBusy(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "Ошибка запроса");
      }

      await loadAdmin();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Ошибка");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await runAction({ action: "login", username, password });
  }

  if (!state.authenticated) {
    return (
      <main className="page">
        <section className="section">
          <h1 className="section__title">Админ-панель</h1>
          <form className="panel" onSubmit={handleLogin} style={{ maxWidth: 420 }}>
            <div className="field">
              <label className="field__label" htmlFor="admin-user">
                Логин
              </label>
              <input
                id="admin-user"
                className="field__input"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                autoComplete="username"
              />
            </div>
            <div className="field">
              <label className="field__label" htmlFor="admin-pass">
                Пароль
              </label>
              <input
                id="admin-pass"
                className="field__input"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
              />
            </div>
            {errorMessage ? <p className="field__error">{errorMessage}</p> : null}
            <button className="button" type="submit" disabled={isBusy}>
              Войти
            </button>
          </form>
        </section>
      </main>
    );
  }

  const teams = state.teams || [];
  const readyTeams = teams.filter((team) => team.isReady);

  return (
    <main className="page">
      <section className="section">
        <h1 className="section__title">Админ-панель</h1>
        <p className="section__text">
          Управление регистрацией, жеребьёвкой и результатами матчей.
        </p>

        {errorMessage ? <p className="field__error">{errorMessage}</p> : null}

        <div className="stats-row">
          <div className="stat">
            <strong>{teams.length}</strong>
            <span>команд</span>
          </div>
          <div className="stat">
            <strong>{readyTeams.length}</strong>
            <span>готовы 5/5</span>
          </div>
          <div className="stat">
            <strong>{state.settings?.registrationOpen ? "ON" : "OFF"}</strong>
            <span>регистрация</span>
          </div>
          <div className="stat">
            <strong>{state.settings?.formatVotingOpen ? "ON" : "OFF"}</strong>
            <span>голос формат</span>
          </div>
          <div className="stat">
            <strong>{state.settings?.showFormatNav !== false ? "SHOW" : "HIDE"}</strong>
            <span>меню Формат</span>
          </div>
          <div className="stat">
            <strong>{state.settings?.showBracketNav !== false ? "SHOW" : "HIDE"}</strong>
            <span>меню Сетка</span>
          </div>
        </div>

        <div className="hero__actions" style={{ marginBottom: "1.5rem" }}>
          <button
            type="button"
            className="button"
            disabled={isBusy}
            onClick={() =>
              void runAction({
                action: "toggle-registration",
                registrationOpen: !state.settings?.registrationOpen,
              })
            }
          >
            {state.settings?.registrationOpen ? "Закрыть регистрацию" : "Открыть регистрацию"}
          </button>
          <button
            type="button"
            className="button"
            disabled={isBusy}
            onClick={() =>
              void runAction({
                action: "toggle-format-voting",
                formatVotingOpen: !state.settings?.formatVotingOpen,
              })
            }
          >
            {state.settings?.formatVotingOpen
              ? "Закрыть голосование за формат"
              : "Открыть голосование за формат"}
          </button>
          <button
            type="button"
            className="button"
            disabled={isBusy}
            onClick={() =>
              void runAction({
                action: "toggle-nav-visibility",
                showFormatNav: !(state.settings?.showFormatNav !== false),
              })
            }
          >
            {state.settings?.showFormatNav !== false
              ? "Скрыть «Формат» в меню"
              : "Показать «Формат» в меню"}
          </button>
          <button
            type="button"
            className="button"
            disabled={isBusy}
            onClick={() =>
              void runAction({
                action: "toggle-nav-visibility",
                showBracketNav: !(state.settings?.showBracketNav !== false),
              })
            }
          >
            {state.settings?.showBracketNav !== false
              ? "Скрыть «Сетка» в меню"
              : "Показать «Сетка» в меню"}
          </button>
          <button
            type="button"
            className="button button--teal"
            disabled={isBusy}
            onClick={() => {
              const isConfirmed = window.confirm(
                "Запустить жеребьёвку (группы + плей-офф)? Текущая сетка сбросится.",
              );

              if (!isConfirmed) {
                return;
              }

              void runAction({
                action: "draw",
                bracketFormat: "groups_playoff",
              });
            }}
          >
            Жеребьёвка: группы
          </button>
          <button
            type="button"
            className="button button--teal"
            disabled={isBusy}
            onClick={() => {
              const isConfirmed = window.confirm(
                "Запустить вариант C? Круговая BO1 (макс. 2 сервера), затем только финал топ-2 — BO3. Матча за 3 место нет. Текущая сетка сбросится.",
              );

              if (!isConfirmed) {
                return;
              }

              void runAction({
                action: "draw",
                bracketFormat: "round_robin",
              });
            }}
          >
            Жеребьёвка: вариант C
          </button>
          <button
            type="button"
            className="button button--ghost"
            disabled={isBusy || !state.bracket}
            onClick={() => {
              const isConfirmed = window.confirm(
                "Сбросить сетку? Группы, матчи и результаты будут удалены. Команды останутся.",
              );

              if (!isConfirmed) {
                return;
              }

              void runAction({ action: "clear-bracket" });
            }}
          >
            Сбросить сетку
          </button>
          <Link href="/bracket" className="button button--ghost">
            Открыть сетку
          </Link>
          <button
            type="button"
            className="button button--ghost"
            disabled={isBusy}
            onClick={() => void runAction({ action: "logout" })}
          >
            Выйти
          </button>
        </div>

        <article className="panel" style={{ marginBottom: "1rem" }}>
          <h2>Голосование за формат</h2>
          <p className="field__hint" style={{ marginTop: "0.5rem" }}>
            Страница для участников:{" "}
            <Link href="/vote">/vote</Link>. Сейчас:{" "}
            {state.settings?.formatVotingOpen ? "открыто" : "закрыто"}. Голосов:{" "}
            {state.formatPoll?.totalVotes ?? 0}.
          </p>
          <div className="format-admin__counts" style={{ marginTop: "1rem" }}>
            {TOURNAMENT_FORMATS.map((format) => {
              const voteCount = state.formatPoll?.counts?.[format.id] ?? 0;
              const formatVotes =
                state.formatPoll?.votes.filter(
                  (vote) => vote.formatId === format.id,
                ) || [];

              return (
                <div key={format.id} className="format-admin__block">
                  <div className="format-admin__row">
                    <span>{format.shortLabel}</span>
                    <strong>{voteCount}</strong>
                    <span className="muted">{format.title}</span>
                  </div>
                  {formatVotes.length > 0 ? (
                    <ul className="format-admin__voters">
                      {formatVotes.map((vote) => (
                        <li key={vote.id}>
                          {formatPublicName(vote.voterName, vote.isConfirmed)}
                          {vote.teamName ? ` · ${vote.teamName}` : ""}
                          <span className="muted">
                            {" "}
                            · {vote.isConfirmed ? "справочник" : "вручную"}
                            {vote.department ? ` · ${vote.department}` : ""}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              );
            })}
          </div>
          <div className="hero__actions" style={{ marginTop: "1rem" }}>
            <Link href="/vote" className="button button--ghost">
              Открыть страницу голосования
            </Link>
            <button
              type="button"
              className="button button--ghost"
              disabled={isBusy || !(state.formatPoll?.totalVotes ?? 0)}
              onClick={() => {
                const isConfirmed = window.confirm(
                  "Сбросить все голоса за формат?",
                );

                if (!isConfirmed) {
                  return;
                }

                void runAction({ action: "clear-format-votes" });
              }}
            >
              Сбросить голоса
            </button>
          </div>
        </article>

        <article className="panel">
          <h2>Команды</h2>
          <div className="team-grid" style={{ marginTop: "1rem" }}>
            {teams.map((team) => (
              <div key={team.id} className="team-card">
                <div className="team-card__top">
                  <h3>{team.name}</h3>
                  <span className={`badge ${team.isReady ? "badge--ok" : "badge--warn"}`}>
                    {team.starterCount}/5
                  </span>
                </div>
                {team.block ? <p>Блок: {team.block}</p> : null}
                <p>{team.department}</p>
                <p>
                  Подтверждено {team.confirmedCount} · Вручную {team.unconfirmedCount}
                </p>
                <div className="hero__actions" style={{ marginTop: "0.85rem" }}>
                  <Link href={`/manage/${team.manageToken}`} className="button">
                    Редактировать состав
                  </Link>
                  <button
                    type="button"
                    className="button button--ghost"
                    disabled={isBusy}
                    onClick={() => {
                      const isConfirmed = window.confirm(
                        `Удалить команду «${team.name}»?\nЭто действие нельзя отменить.`,
                      );

                      if (!isConfirmed) {
                        return;
                      }

                      void runAction({ action: "delete-team", teamId: team.id });
                    }}
                  >
                    Удалить
                  </button>
                </div>
              </div>
            ))}
          </div>
        </article>

        {state.bracket ? (
          <article className="panel" style={{ marginTop: "1rem" }}>
            <h2>Сетка — отметить победителя</h2>
            <p className="field__hint" style={{ marginTop: "0.5rem" }}>
              {state.bracket.format === "round_robin"
                ? "Вариант C: туры круговой — BO1. Когда все туры сыграны, топ-2 идут в финал BO3. Матча за 3 место нет — бронза по таблице."
                : "Сначала сыграйте групповые матчи. Когда группа завершена, топ-2 попадут в плей-офф автоматически."}
            </p>
            <div style={{ marginTop: "1rem" }}>
              <BracketBoard
                bracket={state.bracket}
                teams={teams.map((team) => ({
                  id: team.id,
                  name: team.name,
                  starterCount: team.starterCount,
                }))}
                interactive
                isBusy={isBusy}
                onSelectWinner={(matchId, winnerId) =>
                  void runAction({
                    action: "set-winner",
                    matchId,
                    winnerId,
                  })
                }
              />
            </div>
          </article>
        ) : null}
      </section>
    </main>
  );
}
