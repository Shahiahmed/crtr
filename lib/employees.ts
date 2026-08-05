import employeesData from "@/data/employees.json";
import type { Employee } from "@/lib/types";

type EmployeesFileRaw = {
  departments: string[];
  employees: Array<{
    id: string;
    fullName: string;
    department: string;
  }>;
};

const employeesFile = employeesData as EmployeesFileRaw;

const employees: Employee[] = employeesFile.employees.map((employee) => ({
  id: employee.id,
  fullName: employee.fullName,
  department: employee.department,
}));

export function getDepartments(): string[] {
  return employeesFile.departments;
}

export function getEmployees(): Employee[] {
  return employees;
}

export function searchEmployees(query: string, limit = 12): Employee[] {
  const normalizedQuery = query.trim().toLocaleLowerCase("ru-RU");

  if (normalizedQuery.length < 2) {
    return [];
  }

  const results: Employee[] = [];

  for (const employee of employees) {
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
  return employees.find((employee) => employee.id === employeeId);
}
