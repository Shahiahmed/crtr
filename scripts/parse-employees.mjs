import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const text = fs.readFileSync(path.join(root, "data/employees-raw.csv"), "utf8");
const lines = text.split(/\r?\n/);

function parseCsvLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];

    if (character === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (character === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
      continue;
    }

    current += character;
  }

  result.push(current.trim());
  return result;
}

const hasCyrillic = (value) => /[А-Яа-яЁёӘәІіҢңҒғҮүҰұҚқӨөҺһ]/.test(value);

let currentDepartment = "Без подразделения";
const employees = [];
const departments = new Set();

for (const line of lines) {
  if (!line.trim() || /^,+$/.test(line.trim())) {
    continue;
  }

  const columns = parseCsvLine(line);
  const columnZero = (columns[0] || "").replace(/\n/g, " ").trim();
  const columnOne = (columns[1] || "").trim();
  const columnTwo = (columns[2] || "").trim();
  const isNumbered = /^\d+$/.test(columnZero);

  if (!isNumbered && columnZero && !columnTwo && columnZero.length > 3) {
    if (
      !hasCyrillic(columnZero) ||
      columnZero.startsWith("Управление") ||
      columnZero.includes("Наименование должностей") ||
      columnZero.includes("п/п")
    ) {
      continue;
    }

    currentDepartment = columnZero;
    departments.add(currentDepartment);
    continue;
  }

  if (!isNumbered || !columnTwo || columnTwo.length < 5 || columnTwo === "-") {
    continue;
  }

  if (!hasCyrillic(columnTwo) || /^\d+$/.test(columnTwo)) {
    continue;
  }

  employees.push({
    id: `emp-${String(employees.length + 1).padStart(3, "0")}`,
    fullName: columnTwo,
    position: columnOne,
    department: currentDepartment,
  });
}

const payload = {
  departments: [...departments],
  employees,
};

fs.writeFileSync(
  path.join(root, "data/employees.json"),
  JSON.stringify(payload, null, 2),
  "utf8",
);

console.log(`Departments: ${departments.size}`);
console.log([...departments].join("\n"));
console.log(`Employees: ${employees.length}`);
console.log(employees.slice(0, 2));
console.log(employees.slice(-2));
