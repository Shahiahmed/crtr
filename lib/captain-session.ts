export const CAPTAIN_SESSION_KEY = "crtr_captain_session";
export const CAPTAIN_SESSION_EVENT = "crtr-captain-session";

export type CaptainSession = {
  manageToken: string;
  manageUrl: string;
  teamName: string;
};

function buildManageUrl(manageToken: string): string {
  return `/manage/${manageToken}`;
}

export function saveCaptainSession(session: CaptainSession): void {
  if (typeof window === "undefined") {
    return;
  }

  const nextSession: CaptainSession = {
    manageToken: session.manageToken,
    manageUrl: buildManageUrl(session.manageToken),
    teamName: session.teamName,
  };

  window.localStorage.setItem(CAPTAIN_SESSION_KEY, JSON.stringify(nextSession));
  window.dispatchEvent(new Event(CAPTAIN_SESSION_EVENT));
}

/**
 * Save only if this browser has no captain team yet,
 * or the token already belongs to the stored team.
 * Prevents admin "edit roster" links from stealing "Моя команда".
 */
export function claimCaptainSession(session: CaptainSession): void {
  const existingSession = readCaptainSession();

  if (
    existingSession &&
    existingSession.manageToken !== session.manageToken
  ) {
    return;
  }

  saveCaptainSession(session);
}

export function readCaptainSession(): CaptainSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  const rawValue = window.localStorage.getItem(CAPTAIN_SESSION_KEY);

  if (!rawValue) {
    return null;
  }

  try {
    const parsedValue = JSON.parse(rawValue) as CaptainSession;

    if (!parsedValue.manageToken) {
      return null;
    }

    return {
      manageToken: parsedValue.manageToken,
      manageUrl: buildManageUrl(parsedValue.manageToken),
      teamName: parsedValue.teamName || "",
    };
  } catch {
    return null;
  }
}

export function clearCaptainSession(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(CAPTAIN_SESSION_KEY);
  window.dispatchEvent(new Event(CAPTAIN_SESSION_EVENT));
}

export function clearCaptainSessionIfToken(manageToken: string): void {
  const existingSession = readCaptainSession();

  if (existingSession?.manageToken === manageToken) {
    clearCaptainSession();
  }
}

export async function syncCaptainSession(): Promise<CaptainSession | null> {
  const storedSession = readCaptainSession();

  if (!storedSession) {
    return null;
  }

  try {
    const response = await fetch(`/api/manage/${storedSession.manageToken}`);

    if (!response.ok) {
      clearCaptainSession();
      return null;
    }

    const payload = (await response.json()) as { team?: { name?: string } };
    const nextSession: CaptainSession = {
      manageToken: storedSession.manageToken,
      manageUrl: buildManageUrl(storedSession.manageToken),
      teamName: payload.team?.name || storedSession.teamName,
    };

    saveCaptainSession(nextSession);
    return nextSession;
  } catch {
    return storedSession;
  }
}
