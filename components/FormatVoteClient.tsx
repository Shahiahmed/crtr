"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { EmployeePicker } from "@/components/EmployeePicker";
import {
  TOURNAMENT_FORMATS,
  type TournamentFormatId,
} from "@/lib/formats";
import { formatPublicName } from "@/lib/names";
import type { Employee, PublicFormatVote } from "@/lib/types";

const VOTER_KEY_STORAGE = "crtr_format_voter_key";
const VOTER_STATE_STORAGE = "crtr_format_voter_state";

type VoteMode = "directory" | "manual";

type VoteCounts = Record<TournamentFormatId, number>;

type StoredVoterState = {
  mode: VoteMode;
  employeeId: string | null;
  voterName: string;
  department: string;
  formatId: TournamentFormatId;
};

type FormatVoteClientProps = {
  initialVotingOpen: boolean;
  initialCounts: VoteCounts;
  initialTotalVotes: number;
  initialVotes: PublicFormatVote[];
};

function createVoterKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `voter_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function emptyCounts(): VoteCounts {
  return Object.fromEntries(
    TOURNAMENT_FORMATS.map((format) => [format.id, 0]),
  ) as VoteCounts;
}

function readStoredVoterState(): StoredVoterState | null {
  const rawValue = window.localStorage.getItem(VOTER_STATE_STORAGE);

  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue) as StoredVoterState;
  } catch {
    return null;
  }
}

export default function FormatVoteClient({
  initialVotingOpen,
  initialCounts,
  initialTotalVotes,
  initialVotes,
}: FormatVoteClientProps) {
  const [votingOpen, setVotingOpen] = useState(initialVotingOpen);
  const [counts, setCounts] = useState<VoteCounts>(initialCounts);
  const [totalVotes, setTotalVotes] = useState(initialTotalVotes);
  const [votes, setVotes] = useState<PublicFormatVote[]>(initialVotes);
  const [selectedFormatId, setSelectedFormatId] =
    useState<TournamentFormatId>("groups_playoff_bo3");
  const [mode, setMode] = useState<VoteMode>("directory");
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(
    null,
  );
  const [manualFullName, setManualFullName] = useState("");
  const [manualDepartment, setManualDepartment] = useState("");
  const [voterKey, setVoterKey] = useState("");
  const [yourFormatId, setYourFormatId] = useState<TournamentFormatId | null>(
    null,
  );
  const [yourVoterName, setYourVoterName] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const storedKey = window.localStorage.getItem(VOTER_KEY_STORAGE);
    const nextKey = storedKey || createVoterKey();

    if (!storedKey) {
      window.localStorage.setItem(VOTER_KEY_STORAGE, nextKey);
    }

    setVoterKey(nextKey);

    const storedState = readStoredVoterState();

    if (!storedState) {
      return;
    }

    setMode(storedState.mode || "directory");
    setManualFullName(storedState.voterName || "");
    setManualDepartment(storedState.department || "");
    if (storedState.voterName) {
      setYourVoterName(
        formatPublicName(
          storedState.voterName,
          storedState.mode !== "manual",
        ),
      );
    }

    if (
      storedState.formatId &&
      TOURNAMENT_FORMATS.some((format) => format.id === storedState.formatId)
    ) {
      setYourFormatId(storedState.formatId);
      setSelectedFormatId(storedState.formatId);
    }

    if (storedState.mode === "directory" && storedState.employeeId) {
      void fetch(`/api/employees?q=${encodeURIComponent(storedState.voterName)}`)
        .then(async (response) => {
          if (!response.ok) {
            return null;
          }

          return response.json() as Promise<{ employees: Employee[] }>;
        })
        .then((payload) => {
          const employee = payload?.employees.find(
            (candidate) => candidate.id === storedState.employeeId,
          );

          if (employee) {
            setSelectedEmployee(employee);
          }
        })
        .catch(() => {
          // Ignore restore errors — user can pick again.
        });
    }
  }, []);

  const votesByFormat = useMemo(() => {
    const grouped = Object.fromEntries(
      TOURNAMENT_FORMATS.map((format) => [format.id, [] as PublicFormatVote[]]),
    ) as Record<TournamentFormatId, PublicFormatVote[]>;

    for (const vote of votes) {
      if (vote.formatId in grouped) {
        grouped[vote.formatId as TournamentFormatId].push(vote);
      }
    }

    return grouped;
  }, [votes]);

  const applyPollPayload = useCallback(
    (payload: {
      votingOpen?: boolean;
      totalVotes?: number;
      counts?: VoteCounts;
      votes?: PublicFormatVote[];
    }) => {
      if (typeof payload.votingOpen === "boolean") {
        setVotingOpen(payload.votingOpen);
      }

      if (typeof payload.totalVotes === "number") {
        setTotalVotes(payload.totalVotes);
      }

      if (payload.counts) {
        setCounts({ ...emptyCounts(), ...payload.counts });
      }

      if (payload.votes) {
        setVotes(payload.votes);
      }
    },
    [],
  );

  const refreshCounts = useCallback(async () => {
    const response = await fetch("/api/format-vote");
    const payload = (await response.json()) as {
      votingOpen?: boolean;
      totalVotes?: number;
      counts?: VoteCounts;
      votes?: PublicFormatVote[];
    };

    applyPollPayload(payload);
  }, [applyPollPayload]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      void refreshCounts();
    }, 15000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [refreshCounts]);

  async function handleVote(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");
    setInfoMessage("");

    try {
      if (mode === "directory" && !selectedEmployee) {
        throw new Error("Выберите себя из справочника");
      }

      const response = await fetch("/api/format-vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          voterKey,
          mode,
          employeeId: selectedEmployee?.id,
          manualFullName,
          manualDepartment,
          formatId: selectedFormatId,
        }),
      });

      const payload = (await response.json()) as {
        error?: string;
        changed?: boolean;
        totalVotes?: number;
        counts?: VoteCounts;
        votes?: PublicFormatVote[];
        yourVote?: {
          formatId: TournamentFormatId;
          voterName: string;
          department: string;
          isConfirmed: boolean;
          employeeId: string | null;
        };
      };

      if (!response.ok) {
        throw new Error(payload.error || "Не удалось проголосовать");
      }

      applyPollPayload(payload);

      if (payload.yourVote) {
        setYourFormatId(payload.yourVote.formatId);
        setYourVoterName(
          formatPublicName(
            payload.yourVote.voterName,
            payload.yourVote.isConfirmed,
          ),
        );

        window.localStorage.setItem(
          VOTER_STATE_STORAGE,
          JSON.stringify({
            mode,
            employeeId: payload.yourVote.employeeId,
            voterName: payload.yourVote.voterName,
            department: payload.yourVote.department,
            formatId: payload.yourVote.formatId,
          } satisfies StoredVoterState),
        );
      }

      setInfoMessage(
        payload.changed ? "Голос обновлён." : "Голос учтён. Спасибо!",
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Ошибка");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="format-vote">
      <div className="format-vote__status">
        <span>{votingOpen ? "Открыто" : "Закрыто"}</span>
        <span aria-hidden="true">·</span>
        <span>{totalVotes} голосов</span>
        {yourVoterName && yourFormatId ? (
          <>
            <span aria-hidden="true">·</span>
            <span>
              ваш выбор:{" "}
              {
                TOURNAMENT_FORMATS.find((format) => format.id === yourFormatId)
                  ?.shortLabel
              }
            </span>
          </>
        ) : null}
      </div>

      <div className="format-vote__list">
        {TOURNAMENT_FORMATS.map((format) => {
          const voteCount = counts[format.id] || 0;
          const formatVotes = votesByFormat[format.id] || [];
          const isSelected = selectedFormatId === format.id;
          const isYours = yourFormatId === format.id;

          return (
            <article
              key={format.id}
              className={`format-row${isSelected ? " is-selected" : ""}${isYours ? " is-yours" : ""}`}
            >
              <button
                type="button"
                className="format-row__main"
                onClick={() => setSelectedFormatId(format.id)}
              >
                <div className="format-row__head">
                  <span className="format-row__letter">
                    {format.shortLabel.split("·")[0].trim()}
                  </span>
                  <div className="format-row__titles">
                    <strong>{format.title}</strong>
                    <span>
                      {format.durationLabel}
                      {isYours ? " · ваш голос" : ""}
                    </span>
                  </div>
                  <strong className="format-row__count">{voteCount}</strong>
                </div>
                <p className="format-row__summary">{format.teaser}</p>
              </button>

              <div className="format-row__voters">
                {formatVotes.length > 0 ? (
                  <p>
                    {formatVotes
                      .map((vote) => {
                        const displayName = formatPublicName(
                          vote.voterName,
                          vote.isConfirmed,
                        );

                        return vote.teamName
                          ? `${displayName} (${vote.teamName})`
                          : displayName;
                      })
                      .join(", ")}
                  </p>
                ) : (
                  <p className="format-row__empty">Пока никто не голосовал</p>
                )}
                <Link
                  href={`/vote/example/${format.id}`}
                  className="button format-row__example"
                >
                  Пример сетки
                </Link>
              </div>
            </article>
          );
        })}
      </div>

      <section className="format-vote__ballot panel" id="vote-form">
        <h2>Отдать голос</h2>
        <p className="muted">
          Только игроки из состава команды. Выберите вариант выше, укажите себя
          и отправьте голос.
        </p>

        {!votingOpen ? (
          <p className="field__hint">Голосование сейчас закрыто.</p>
        ) : null}

        <form className="format-vote__form" onSubmit={handleVote}>
          <fieldset className="format-vote__choices" disabled={!votingOpen}>
            <legend className="field__label">Вариант</legend>
            {TOURNAMENT_FORMATS.map((format) => (
              <label key={format.id} className="format-vote__choice">
                <input
                  type="radio"
                  name="format-choice"
                  value={format.id}
                  checked={selectedFormatId === format.id}
                  onChange={() => setSelectedFormatId(format.id)}
                  disabled={!votingOpen || isSubmitting}
                />
                <span>
                  <strong>{format.shortLabel}</strong>
                  <small>{format.title}</small>
                </span>
              </label>
            ))}
          </fieldset>

          <div className="tabs" role="tablist" aria-label="Кто голосует">
            <button
              type="button"
              className={mode === "directory" ? "is-active" : ""}
              onClick={() => setMode("directory")}
              disabled={!votingOpen || isSubmitting}
            >
              Из справочника
            </button>
            <button
              type="button"
              className={mode === "manual" ? "is-active" : ""}
              onClick={() => setMode("manual")}
              disabled={!votingOpen || isSubmitting}
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
                <label className="field__label" htmlFor="vote-manual-name">
                  ФИО
                </label>
                <input
                  id="vote-manual-name"
                  className="field__input"
                  value={manualFullName}
                  onChange={(event) => setManualFullName(event.target.value)}
                  placeholder="Как в составе команды"
                  maxLength={80}
                  required
                  disabled={!votingOpen || isSubmitting}
                />
              </div>
              <div className="field">
                <label
                  className="field__label"
                  htmlFor="vote-manual-department"
                >
                  Подразделение
                </label>
                <input
                  id="vote-manual-department"
                  className="field__input"
                  value={manualDepartment}
                  onChange={(event) => setManualDepartment(event.target.value)}
                  placeholder="Департамент / офис"
                  maxLength={160}
                  required
                  disabled={!votingOpen || isSubmitting}
                />
              </div>
            </>
          )}

          {errorMessage ? <p className="field__error">{errorMessage}</p> : null}
          {infoMessage ? <p className="field__hint">{infoMessage}</p> : null}

          <button
            type="submit"
            className="button"
            disabled={!votingOpen || isSubmitting || !voterKey}
          >
            {yourFormatId ? "Обновить голос" : "Проголосовать"}
          </button>
        </form>
      </section>
    </div>
  );
}
