"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import {
  clearCaptainSession,
  readCaptainSession,
  saveCaptainSession,
  type CaptainSession,
} from "@/lib/captain-session";

export default function MyTeamPage() {
  const router = useRouter();
  const [session, setSession] = useState<CaptainSession | null>(null);
  const [teamName, setTeamName] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const storedSession = readCaptainSession();

    if (!storedSession?.manageToken) {
      setIsChecking(false);
      return;
    }

    fetch(`/api/manage/${storedSession.manageToken}`)
      .then(async (response) => {
        if (!response.ok) {
          clearCaptainSession();
          setSession(null);
          return;
        }

        setSession(storedSession);
      })
      .catch(() => {
        clearCaptainSession();
        setSession(null);
      })
      .finally(() => {
        setIsChecking(false);
      });
  }, []);

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/captain/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamName, accessCode }),
      });

      const payload = (await response.json()) as {
        error?: string;
        manageToken?: string;
        manageUrl?: string;
        teamName?: string;
        accessCode?: string;
      };

      if (!response.ok || !payload.manageToken || !payload.manageUrl) {
        throw new Error(payload.error || "Не удалось войти");
      }

      const nextSession: CaptainSession = {
        manageToken: payload.manageToken,
        manageUrl: payload.manageUrl,
        teamName: payload.teamName || teamName,
        accessCode: payload.accessCode || accessCode,
      };

      saveCaptainSession(nextSession);
      router.push(nextSession.manageUrl);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Ошибка");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isChecking) {
    return (
      <main className="page">
        <p className="muted">Проверяем сохранённый вход...</p>
      </main>
    );
  }

  if (session) {
    return (
      <main className="page">
        <section className="section">
          <h1 className="section__title">Моя команда</h1>
          <p className="section__text">
            В этом браузере сохранён вход капитана. Можно сразу открыть управление.
          </p>

          <div className="panel" style={{ maxWidth: 560 }}>
            <h2>{session.teamName}</h2>
            <p className="muted">Код капитана: {session.accessCode}</p>
            <div className="hero__actions" style={{ marginTop: "1rem" }}>
              <Link href={session.manageUrl} className="button">
                Открыть команду
              </Link>
              <button
                type="button"
                className="button button--ghost"
                onClick={() => {
                  clearCaptainSession();
                  setSession(null);
                }}
              >
                Выйти с этого устройства
              </button>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="page">
      <section className="section">
        <h1 className="section__title">Моя команда</h1>
        <p className="section__text">
          Если закрыл ссылку — войди по названию команды и коду капитана (6 цифр). Код
          показывается один раз при создании команды.
        </p>

        <form className="panel" onSubmit={handleLogin} style={{ maxWidth: 560 }}>
          <div className="field">
            <label className="field__label" htmlFor="login-team">
              Название команды
            </label>
            <input
              id="login-team"
              className="field__input"
              value={teamName}
              onChange={(event) => setTeamName(event.target.value)}
              required
              maxLength={40}
            />
          </div>

          <div className="field">
            <label className="field__label" htmlFor="login-code">
              Код капитана
            </label>
            <input
              id="login-code"
              className="field__input"
              value={accessCode}
              onChange={(event) => setAccessCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              placeholder="6 цифр"
              required
              maxLength={6}
            />
          </div>

          {errorMessage ? <p className="field__error">{errorMessage}</p> : null}

          <button className="button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Входим..." : "Войти в команду"}
          </button>
        </form>
      </section>
    </main>
  );
}
