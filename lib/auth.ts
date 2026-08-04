import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

const ADMIN_COOKIE_NAME = "crtr_admin_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 12;

function getAdminSecret(): string {
  return process.env.ADMIN_PASSWORD || "admin2026";
}

function getExpectedUsername(): string {
  return process.env.ADMIN_USERNAME || "admin";
}

function signPayload(payload: string): string {
  return createHmac("sha256", getAdminSecret()).update(payload).digest("hex");
}

export function verifyAdminCredentials(username: string, password: string): boolean {
  const expectedUsername = getExpectedUsername();
  const expectedPassword = getAdminSecret();

  if (username !== expectedUsername || password !== expectedPassword) {
    return false;
  }

  return true;
}

export function createAdminSessionValue(): string {
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const payload = `admin:${expiresAt}`;
  return `${payload}.${signPayload(payload)}`;
}

export function isValidAdminSessionValue(sessionValue: string | undefined): boolean {
  if (!sessionValue) {
    return false;
  }

  const [payload, signature] = sessionValue.split(".");

  if (!payload || !signature) {
    return false;
  }

  const expectedSignature = signPayload(payload);

  try {
    const providedBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (
      providedBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(providedBuffer, expectedBuffer)
    ) {
      return false;
    }
  } catch {
    return false;
  }

  const [, expiresAtRaw] = payload.split(":");
  const expiresAt = Number(expiresAtRaw);

  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) {
    return false;
  }

  return true;
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const sessionValue = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  return isValidAdminSessionValue(sessionValue);
}

export { ADMIN_COOKIE_NAME };
