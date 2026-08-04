export const CAPTAIN_SESSION_KEY = "crtr_captain_session";

export type CaptainSession = {
  manageToken: string;
  manageUrl: string;
  teamName: string;
  accessCode: string;
};

export function saveCaptainSession(session: CaptainSession): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(CAPTAIN_SESSION_KEY, JSON.stringify(session));
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
    return JSON.parse(rawValue) as CaptainSession;
  } catch {
    return null;
  }
}

export function clearCaptainSession(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(CAPTAIN_SESSION_KEY);
}
