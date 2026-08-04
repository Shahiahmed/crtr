"use client";

import { useDeferredValue, useEffect, useState } from "react";

import type { Employee } from "@/lib/types";

type EmployeePickerProps = {
  label: string;
  selectedEmployee: Employee | null;
  onSelect: (employee: Employee | null) => void;
};

export function EmployeePicker({
  label,
  selectedEmployee,
  onSelect,
}: EmployeePickerProps) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [results, setResults] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (deferredQuery.trim().length < 2) {
      setResults([]);
      return;
    }

    const controller = new AbortController();
    setIsLoading(true);

    fetch(`/api/employees?q=${encodeURIComponent(deferredQuery)}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Не удалось загрузить сотрудников");
        }

        return response.json() as Promise<{ employees: Employee[] }>;
      })
      .then((payload) => {
        setResults(payload.employees);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setResults([]);
      })
      .finally(() => {
        setIsLoading(false);
      });

    return () => controller.abort();
  }, [deferredQuery]);

  if (selectedEmployee) {
    return (
      <div className="field">
        <span className="field__label">{label}</span>
        <div className="picker-selected">
          <div>
            <strong>{selectedEmployee.fullName}</strong>
            <p>{selectedEmployee.department}</p>
            <small>{selectedEmployee.position}</small>
          </div>
          <button
            type="button"
            className="button button--ghost"
            onClick={() => {
              onSelect(null);
              setQuery("");
            }}
          >
            Сменить
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="field">
      <label className="field__label" htmlFor="employee-search">
        {label}
      </label>
      <input
        id="employee-search"
        className="field__input"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Начните вводить ФИО..."
        autoComplete="off"
      />
      {isLoading ? <p className="field__hint">Поиск...</p> : null}
      {results.length > 0 ? (
        <ul className="picker-results">
          {results.map((employee) => (
            <li key={employee.id}>
              <button
                type="button"
                onClick={() => {
                  onSelect(employee);
                  setQuery("");
                  setResults([]);
                }}
              >
                <strong>{employee.fullName}</strong>
                <span>{employee.department}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
