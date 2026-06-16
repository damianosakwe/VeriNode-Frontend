export function getItem<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function setItem<T>(key: string, value: T): void {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('sessionStore: failed to write', key, e);
  }
}

export function removeItem(key: string): void {
  try {
    sessionStorage.removeItem(key);
  } catch (e) {
    console.error('sessionStore: failed to remove', key, e);
  }
}
