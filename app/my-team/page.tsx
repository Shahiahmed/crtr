"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { clearCaptainSession, syncCaptainSession } from "@/lib/captain-session";

export default function MyTeamPage() {
  const router = useRouter();
  const [statusMessage, setStatusMessage] = useState("Проверяем вашу команду...");

  useEffect(() => {
    let isMounted = true;

    async function openCaptainTeam() {
      const session = await syncCaptainSession();

      if (!isMounted) {
        return;
      }

      if (!session) {
        setStatusMessage("Команда в этом браузере не найдена. Создайте команду или откройте ссылку капитана.");
        return;
      }

      router.replace(session.manageUrl);
    }

    void openCaptainTeam();

    return () => {
      isMounted = false;
    };
  }, [router]);

  return (
    <main className="page">
      <section className="section">
        <h1 className="section__title">Моя команда</h1>
        <p className="section__text">{statusMessage}</p>
        <div className="hero__actions">
          <Link href="/register" className="button">
            Создать команду
          </Link>
          <button
            type="button"
            className="button button--ghost"
            onClick={() => {
              clearCaptainSession();
              setStatusMessage("Локальный вход очищен.");
            }}
          >
            Очистить сохранённый вход
          </button>
        </div>
      </section>
    </main>
  );
}
