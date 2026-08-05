"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { EmployeePicker } from "@/components/EmployeePicker";
import {
  clearLegionnaireSession,
  readLegionnaireSession,
  saveLegionnaireSession,
} from "@/lib/legionnaire-session";
import type { Employee } from "@/lib/types";

type CreateMode = "directory" | "manual";

export default function LegionnairePage() {
  const [mode, setMode] = useState<CreateMode>("directory");
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [manualFullName, setManualFullName] = useState("");
  const [manualDepartment, setManualDepartment] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [registeredName, setRegisteredName] = useState("");
  const [manageToken, setManageToken] = useState("");

  useEffect(() => {
    const session = readLegionnaireSession();

    if (session) {
      setRegisteredName(session.fullName);
      setManageToken(session.manageToken);
    }
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/legionnaires", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          employeeId: selectedEmployee?.id,
          manualFullName,
          manualDepartment,
        }),
      });

      const payload = (await response.json()) as {
        error?: string;
        manageToken?: string;
        legionnaire?: { fullName?: string };
      };

      if (!response.ok) {
        throw new Error(payload.error || "Не удалось отправить заявку");
      }

      const nextName = payload.legionnaire?.fullName || "";
      const nextToken = payload.manageToken || "";

      if (nextToken && nextName) {
        saveLegionnaireSession({
          manageToken: nextToken,
          fullName: nextName,
        });
      }

      setRegisteredName(nextName);
      setManageToken(nextToken);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Ошибка");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRemove() {
    if (!manageToken) {
      return;
    }

    setIsRemoving(true);
    setErrorMessage("");

    try {
      const response = await fetch(`/api/legionnaires?token=${manageToken}`, {
        method: "DELETE",
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "Не удалось снять заявку");
      }

      clearLegionnaireSession();
      setRegisteredName("");
      setManageToken("");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Ошибка");
    } finally {
      setIsRemoving(false);
    }
  }

  if (registeredName && manageToken) {
    return (
      <main className="page">
        <section className="section">
          <h1 className="section__title">Вы в списке легионеров</h1>
          <div className="success-box">
            <p>
              <strong>{registeredName}</strong> отображается на странице команд
              как игрок без команды. Капитаны могут вас найти и пригласить в состав.
            </p>
          </div>
          {errorMessage ? <p className="field__error">{errorMessage}</p> : null}
          <div className="hero__actions" style={{ marginTop: "1.25rem" }}>
            <Link href="/teams" className="button">
              Смотреть список
            </Link>
            <button
              type="button"
              className="button button--ghost"
              disabled={isRemoving}
              onClick={() => void handleRemove()}
            >
              {isRemoving ? "Убираем..." : "Убрать себя из списка"}
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="page">
      <section className="section">
        <h1 className="section__title">Легионер</h1>
        <p className="section__text">
          Нет команды? Оставьте заявку — вы появятся в отдельном списке на
          странице команд, и капитаны смогут вас взять.
        </p>

        <form className="panel" onSubmit={handleSubmit} style={{ maxWidth: 560 }}>
          <div className="tabs">
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
              label="Сотрудник"
              selectedEmployee={selectedEmployee}
              onSelect={setSelectedEmployee}
            />
          ) : (
            <>
              <div className="field">
                <label className="field__label" htmlFor="legionnaire-name">
                  Имя и фамилия
                </label>
                <input
                  id="legionnaire-name"
                  className="field__input"
                  value={manualFullName}
                  onChange={(event) => setManualFullName(event.target.value)}
                  placeholder="Шаһиахмед Асқар"
                  required
                />
              </div>
              <div className="field">
                <label className="field__label" htmlFor="legionnaire-department">
                  Подразделение
                </label>
                <input
                  id="legionnaire-department"
                  className="field__input"
                  value={manualDepartment}
                  onChange={(event) => setManualDepartment(event.target.value)}
                  required
                />
              </div>
            </>
          )}

          {errorMessage ? <p className="field__error">{errorMessage}</p> : null}

          <button className="button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Отправляем..." : "Объявить себя без команды"}
          </button>
        </form>
      </section>
    </main>
  );
}
