"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { EmployeePicker } from "@/components/EmployeePicker";
import { MemberList } from "@/components/MemberList";
import type { Employee, PublicTeam } from "@/lib/types";

type AddMode = "directory" | "manual";

export default function ManageTeamPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;

  const [team, setTeam] = useState<PublicTeam | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [mode, setMode] = useState<AddMode>("directory");
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [manualFullName, setManualFullName] = useState("");
  const [manualDepartment, setManualDepartment] = useState("");
  const [asSubstitute, setAsSubstitute] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadTeam = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const response = await fetch(`/api/manage/${token}`);
      const payload = (await response.json()) as {
        error?: string;
        team?: PublicTeam;
      };

      if (!response.ok || !payload.team) {
        throw new Error(payload.error || "Команда не найдена");
      }

      setTeam(payload.team);
      setManualDepartment(payload.team.department);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Ошибка загрузки");
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadTeam();
  }, [loadTeam]);

  async function handleAddMember(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const response = await fetch(`/api/manage/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          employeeId: selectedEmployee?.id,
          manualFullName,
          manualDepartment,
          asSubstitute,
        }),
      });

      const payload = (await response.json()) as {
        error?: string;
        team?: PublicTeam;
      };

      if (!response.ok || !payload.team) {
        throw new Error(payload.error || "Не удалось добавить");
      }

      setTeam(payload.team);
      setSelectedEmployee(null);
      setManualFullName("");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Ошибка");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRemoveMember(memberId: string) {
    setErrorMessage("");

    const response = await fetch(`/api/manage/${token}?memberId=${memberId}`, {
      method: "DELETE",
    });
    const payload = (await response.json()) as {
      error?: string;
      team?: PublicTeam;
    };

    if (!response.ok || !payload.team) {
      setErrorMessage(payload.error || "Не удалось удалить");
      return;
    }

    setTeam(payload.team);
  }

  if (isLoading) {
    return (
      <main className="page">
        <p className="muted">Загрузка команды...</p>
      </main>
    );
  }

  if (!team) {
    return (
      <main className="page">
        <p className="field__error">{errorMessage || "Команда не найдена"}</p>
      </main>
    );
  }

  const starters = team.members.filter(
    (member) => member.role === "captain" || member.role === "starter",
  );
  const substitutes = team.members.filter((member) => member.role === "substitute");

  return (
    <main className="page">
      <section className="section">
        <h1 className="section__title">{team.name}</h1>
        <p className="section__text">
          {team.block ? `Блок: ${team.block}. ` : ""}
          {team.department}. Основа {team.starterCount}/5
          {team.isReady ? " — команда готова к жеребьёвке." : "."}
        </p>

        <div className="stats-row">
          <div className="stat">
            <strong>{team.confirmedCount}</strong>
            <span>из справочника</span>
          </div>
          <div className="stat">
            <strong>{team.unconfirmedCount}</strong>
            <span>вручную</span>
          </div>
          <div className="stat">
            <strong>{team.substituteCount}</strong>
            <span>запасных</span>
          </div>
        </div>

        <div className="grid-2">
          <div>
            <article className="panel">
              <h2>Основной состав</h2>
              <MemberList
                members={starters}
                showActions
                onRemove={handleRemoveMember}
              />
            </article>
            <article className="panel">
              <h2>Запасные</h2>
              <MemberList
                members={substitutes}
                showActions
                onRemove={handleRemoveMember}
              />
            </article>
          </div>

          <form className="panel" onSubmit={handleAddMember}>
            <h2>Добавить игрока</h2>
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
                  <label className="field__label" htmlFor="add-name">
                    ФИО
                  </label>
                  <input
                    id="add-name"
                    className="field__input"
                    value={manualFullName}
                    onChange={(event) => setManualFullName(event.target.value)}
                    required
                  />
                </div>
                <div className="field">
                  <label className="field__label" htmlFor="add-department">
                    Подразделение
                  </label>
                  <input
                    id="add-department"
                    className="field__input"
                    value={manualDepartment}
                    onChange={(event) => setManualDepartment(event.target.value)}
                    required
                  />
                  <p className="field__hint">Статус будет «Вручную».</p>
                </div>
              </>
            )}

            <label className="field" style={{ flexDirection: "row", alignItems: "center" }}>
              <input
                type="checkbox"
                checked={asSubstitute}
                onChange={(event) => setAsSubstitute(event.target.checked)}
              />
              <span>Добавить как запасного</span>
            </label>

            {errorMessage ? <p className="field__error">{errorMessage}</p> : null}

            <button className="button" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Добавляем..." : "Добавить в команду"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
