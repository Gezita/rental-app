const LOCK_THRESHOLD = 5;
const LOCK_DURATION = 15 * 60 * 1000; // 15 minutes

// In-memory only — resets on server restart, not suitable for multi-instance deployments
const failedAttempts = new Map<string, number>();
const lockedUntil = new Map<string, number>();

export function isLocked(key: string): boolean {
  const expiry = lockedUntil.get(key);
  if (!expiry) return false;
  if (Date.now() >= expiry) {
    lockedUntil.delete(key);
    failedAttempts.delete(key);
    return false;
  }
  return true;
}

export function recordFailure(key: string): void {
  const count = (failedAttempts.get(key) ?? 0) + 1;
  failedAttempts.set(key, count);
  if (count >= LOCK_THRESHOLD) {
    lockedUntil.set(key, Date.now() + LOCK_DURATION);
  }
}

export function clearAttempts(key: string): void {
  failedAttempts.delete(key);
  lockedUntil.delete(key);
}
