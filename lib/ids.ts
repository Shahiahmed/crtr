import { randomBytes, randomUUID } from "crypto";

export function createManageToken(): string {
  return randomBytes(24).toString("hex");
}

export function createEntityId(prefix: string): string {
  return `${prefix}_${randomUUID().replace(/-/g, "").slice(0, 12)}`;
}
