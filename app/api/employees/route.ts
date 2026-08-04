import { NextResponse } from "next/server";

import { searchEmployees, getDepartments } from "@/lib/employees";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") || "";
  const wantDepartments = searchParams.get("departments") === "1";

  if (wantDepartments) {
    return NextResponse.json({ departments: getDepartments() });
  }

  return NextResponse.json({
    employees: searchEmployees(query),
  });
}
