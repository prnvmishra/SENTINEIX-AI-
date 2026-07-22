const SESSION_KEY = "sentinelx.session.token";

export const sessionStorageKeys = {
  token: SESSION_KEY,
};

export function readStoredToken(): string | null {
  try {
    return localStorage.getItem(SESSION_KEY) ?? sessionStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

export function persistToken(token: string, remember: boolean): void {
  try {
    if (remember) {
      localStorage.setItem(SESSION_KEY, token);
      sessionStorage.removeItem(SESSION_KEY);
    } else {
      sessionStorage.setItem(SESSION_KEY, token);
      localStorage.removeItem(SESSION_KEY);
    }
  } catch {
    // Storage unavailable (e.g. private browsing) — session simply won't persist.
  }
}

export function clearStoredToken(): void {
  try {
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
}
