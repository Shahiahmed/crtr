export const CAPTAIN_SESSION_KEY = "crtr_captain_session";
export const CAPTAIN_SESSION_EVENT = "crtr-captain-session";

export type CaptainSession = {
  manageToken: string;
  manageUrl: string;
  teamName: string;
};

export function saveCaptainSession(session: CaptainSession): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(CAPTAIN_SESSION_KEY, JSON.stringify(session));
  window.dispatchEvent(new Event(CAPTAIN_SESSION_EVENT));
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

    if (!parsedValue.manageToken || !parsedValue.manageUrl) {
      return null;
    }

    return parsedValue;
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
      manageUrl: storedSession.manageUrl,
      teamName: payload.team?.name || storedSession.teamName,
    };

    saveCaptainSession(nextSession);
    return nextSession;
  } catch {
    return storedSession;
  }
}
