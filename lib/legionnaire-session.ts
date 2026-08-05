export const LEGIONNAIRE_SESSION_KEY = "crtr_legionnaire_session";
export const LEGIONNAIRE_SESSION_EVENT = "crtr-legionnaire-session";

export type LegionnaireSession = {
  manageToken: string;
  fullName: string;
};

export function saveLegionnaireSession(session: LegionnaireSession): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(LEGIONNAIRE_SESSION_KEY, JSON.stringify(session));
  window.dispatchEvent(new Event(LEGIONNAIRE_SESSION_EVENT));
}

export function readLegionnaireSession(): LegionnaireSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  const rawValue = window.localStorage.getItem(LEGIONNAIRE_SESSION_KEY);

  if (!rawValue) {
    return null;
  }

  try {
    const parsedValue = JSON.parse(rawValue) as LegionnaireSession;

    if (!parsedValue.manageToken || !parsedValue.fullName) {
      return null;
    }

    return parsedValue;
  } catch {
    return null;
  }
}

export function clearLegionnaireSession(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(LEGIONNAIRE_SESSION_KEY);
  window.dispatchEvent(new Event(LEGIONNAIRE_SESSION_EVENT));
}
