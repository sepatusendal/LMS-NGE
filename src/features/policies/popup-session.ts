// What "a session" and "opening the app" mean for the policy pop-up. Browser
// only; losing this memory just means a reminder may appear once more.

/** A session ends after this long without activity. */
const IDLE_MS = 30 * 60_000;
/** Coming back after this long away counts as opening the app again. */
const AWAY_MS = 5 * 60_000;
const TOUCH_EVERY_MS = 60_000;
const STORAGE_KEY = "policy-popup-session";

interface StoredSession {
  /** Signing in again starts a new session. */
  login: string;
  id: string;
  activeAt: number;
}

// Fallback for browsers that refuse storage.
let memory: StoredSession | null = null;
// Lives as long as the loaded page: a reload empties it.
const shownThisOpen = new Set<string>();

function read(): StoredSession | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredSession) : memory;
  } catch {
    return memory;
  }
}

function write(session: StoredSession) {
  memory = session;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // The in-memory copy still covers this page.
  }
}

/** Marks activity and returns the current session id. */
export function touchSession(login: string, now = Date.now()): string {
  const stored = read();
  const alive = stored && stored.login === login && now - stored.activeAt <= IDLE_MS;
  const id = alive ? stored.id : `${now.toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  write({ login, id, activeAt: now });
  return id;
}

export function wasShownThisOpen(login: string, packetId: string): boolean {
  return shownThisOpen.has(`${login}:${packetId}`);
}

export function markShownThisOpen(login: string, packetId: string) {
  shownThisOpen.add(`${login}:${packetId}`);
}

/** Keeps the session alive while the app is used, and reports a return after
 * being away. Returns the function that stops watching. */
export function watchPolicySession(login: string, onReopen: () => void): () => void {
  let hiddenAt: number | null = null;
  let touchedAt = 0;

  const activity = () => {
    const now = Date.now();
    if (now - touchedAt < TOUCH_EVERY_MS) return;
    touchedAt = now;
    touchSession(login, now);
  };
  const visibility = () => {
    const now = Date.now();
    if (document.visibilityState === "hidden") {
      hiddenAt = now;
      touchSession(login, now);
      return;
    }
    const away = hiddenAt === null ? 0 : now - hiddenAt;
    hiddenAt = null;
    if (away >= AWAY_MS) {
      shownThisOpen.clear();
      onReopen();
    }
  };

  document.addEventListener("visibilitychange", visibility);
  window.addEventListener("pointerdown", activity);
  window.addEventListener("keydown", activity);
  return () => {
    document.removeEventListener("visibilitychange", visibility);
    window.removeEventListener("pointerdown", activity);
    window.removeEventListener("keydown", activity);
  };
}
