"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { EmployeePicker } from "@/components/EmployeePicker";
import { saveCaptainSession } from "@/lib/captain-session";
import type { Employee } from "@/lib/types";

type CreateMode = "directory" | "manual";

export default function RegisterPage() {
  const [mode, setMode] = useState<CreateMode>("directory");
  const [teamName, setTeamName] = useState("");
  const [blockName, setBlockName] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [manualFullName, setManualFullName] = useState("");
  const [manualDepartment, setManualDepartment] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [manageUrl, setManageUrl] = useState("");
  const [createdTeamName, setCreatedTeamName] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          teamName,
          block: blockName,
          employeeId: selectedEmployee?.id,
          manualFullName,
          manualDepartment,
        }),
      });

      const payload = (await response.json()) as {
        error?: string;
        manageUrl?: string;
        manageToken?: string;
        team?: { name?: string };
      };

      if (!response.ok) {
        throw new Error(payload.error || "Не удалось создать команду");
      }

      const nextManageUrl = payload.manageUrl || "";
      const nextTeamName = payload.team?.name || teamName;

      if (payload.manageToken && nextManageUrl) {
        saveCaptainSession({
          manageToken: payload.manageToken,
          manageUrl: nextManageUrl,
          teamName: nextTeamName,
        });
      }

      setCreatedTeamName(nextTeamName);
      setManageUrl(nextManageUrl);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Ошибка");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (manageUrl) {
    return (
      <main className="page">
        <section className="section">
          <h1 className="section__title">Команда создана</h1>
          <div className="success-box">
            <p>
              <strong>{createdTeamName}</strong> сохранена в этом браузере. В меню сверху
              появилась подсвеченная кнопка <strong>«Моя команда»</strong> — через неё
              всегда можно вернуться к составу.
            </p>
          </div>
          <div className="hero__actions" style={{ marginTop: "1.25rem" }}>
            <Link href={manageUrl} className="button">
              Перейти к управлению
            </Link>
            <Link href="/teams" className="button button--ghost">
              К списку команд
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="page">
      <section className="section">
        <h1 className="section__title">Регистрация капитана</h1>
        <p className="section__text">
          Создай команду, затем добавь основу 5 человек и запасных. Из справочника —
          подтверждён, вручную — на проверке.
        </p>

        <form className="panel" onSubmit={handleSubmit} style={{ maxWidth: 640 }}>
          <div className="tabs" role="tablist" aria-label="Способ регистрации капитана">
            <button
              type="button"
              className={mode === "directory" ? "is-active" : ""}
              onClick={() => setMode("directory")}
            >
              Из справочника
            </button>
            <button
              type="button"
              className={mode === "manual" ? "is-active" : ""}
              onClick={() => setMode("manual")}
            >
              Вручную
            </button>
          </div>

          {mode === "directory" ? (
            <EmployeePicker
              label="Капитан из справочника ЦРТР"
              selectedEmployee={selectedEmployee}
              onSelect={setSelectedEmployee}
            />
          ) : (
            <>
              <div className="field">
                <label className="field__label" htmlFor="manual-name">
                  Имя и фамилия капитана
                </label>
                <input
                  id="manual-name"
                  className="field__input"
                  value={manualFullName}
                  onChange={(event) => setManualFullName(event.target.value)}
                  placeholder="Шаһиахмед Асқар"
                  required
                />
                <p className="field__hint">Будет со статусом «Вручную» — не подтверждён.</p>
              </div>
              <div className="field">
                <label className="field__label" htmlFor="manual-department">
                  Подразделение
                </label>
                <input
                  id="manual-department"
                  className="field__input"
                  value={manualDepartment}
                  onChange={(event) => setManualDepartment(event.target.value)}
                  placeholder="Департамент / служба"
                  required
                />
              </div>
            </>
          )}

          <div className="field">
            <label className="field__label" htmlFor="team-name">
              Название команды
            </label>
            <input
              id="team-name"
              className="field__input"
              value={teamName}
              onChange={(event) => setTeamName(event.target.value)}
              placeholder="Например: Enbek Force"
              required
              maxLength={40}
            />
          </div>

          <div className="field">
            <label className="field__label" htmlFor="team-block">
              Блок
            </label>
            <input
              id="team-block"
              className="field__input"
              value={blockName}
              onChange={(event) => setBlockName(event.target.value)}
              placeholder="Например: Блок 1 / Цифровизация"
              required
              maxLength={80}
            />
          </div>

          {errorMessage ? <p className="field__error">{errorMessage}</p> : null}

          <button className="button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Создаём..." : "Создать команду"}
          </button>
        </form>
      </section>
    </main>
  );
}
