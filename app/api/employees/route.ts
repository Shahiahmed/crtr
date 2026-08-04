import { NextResponse } from "next/server";

import { searchEmployees, getDepartments } from "@/lib/employees";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") || "";
  const wantDepartments = searchParams.get("departments") === "1";

  const payload = wantDepartments
    ? { departments: getDepartments() }
    : { employees: searchEmployees(query) };

  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120",
    },
  });
}
