import employeesData from "@/data/employees.json";
import type { Employee } from "@/lib/types";

type EmployeesFile = {
  departments: string[];
  employees: Employee[];
};

const employeesFile = employeesData as EmployeesFile;

export function getDepartments(): string[] {
  return employeesFile.departments;
}

export function getEmployees(): Employee[] {
  return employeesFile.employees;
}

export function searchEmployees(query: string, limit = 12): Employee[] {
  const normalizedQuery = query.trim().toLocaleLowerCase("ru-RU");

  if (normalizedQuery.length < 2) {
    return [];
  }

  const results: Employee[] = [];

  for (const employee of employeesFile.employees) {
    const fullName = employee.fullName.toLocaleLowerCase("ru-RU");
    const department = employee.department.toLocaleLowerCase("ru-RU");

    if (fullName.includes(normalizedQuery) || department.includes(normalizedQuery)) {
      results.push(employee);

      if (results.length >= limit) {
        break;
      }
    }
  }

  return results;
}

export function findEmployeeById(employeeId: string): Employee | undefined {
  return employeesFile.employees.find((employee) => employee.id === employeeId);
}
