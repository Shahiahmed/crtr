import fs from "fs";
import path from "path";

import type { Employee } from "@/lib/types";

type EmployeesFile = {
  departments: string[];
  employees: Employee[];
};

const EMPLOYEES_PATH = path.join(process.cwd(), "data", "employees.json");

function readEmployeesFile(): EmployeesFile {
  const rawContent = fs.readFileSync(EMPLOYEES_PATH, "utf8");
  return JSON.parse(rawContent) as EmployeesFile;
}

export function getDepartments(): string[] {
  return readEmployeesFile().departments;
}

export function getEmployees(): Employee[] {
  return readEmployeesFile().employees;
}

export function searchEmployees(query: string, limit = 12): Employee[] {
  const normalizedQuery = query.trim().toLocaleLowerCase("ru-RU");

  if (normalizedQuery.length < 2) {
    return [];
  }

  return getEmployees()
    .filter((employee) => {
      const fullName = employee.fullName.toLocaleLowerCase("ru-RU");
      const department = employee.department.toLocaleLowerCase("ru-RU");
      return fullName.includes(normalizedQuery) || department.includes(normalizedQuery);
    })
    .slice(0, limit);
}

export function findEmployeeById(employeeId: string): Employee | undefined {
  return getEmployees().find((employee) => employee.id === employeeId);
}
