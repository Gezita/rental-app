import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { isLocked, recordFailure, clearAttempts } from "../rate-limit";

const EMAIL = "test@example.com";
const OTHER_EMAIL = "other@example.com";

// The module uses module-level Maps, so we clear state between tests
beforeEach(() => {
  clearAttempts(EMAIL);
  clearAttempts(OTHER_EMAIL);
  vi.useRealTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("isLocked", () => {
  it("returns false for an unknown email", () => {
    expect(isLocked(EMAIL)).toBe(false);
  });

  it("returns false after fewer than 5 failures", () => {
    recordFailure(EMAIL);
    recordFailure(EMAIL);
    recordFailure(EMAIL);
    recordFailure(EMAIL);
    expect(isLocked(EMAIL)).toBe(false);
  });

  it("returns true after 5 failures", () => {
    for (let i = 0; i < 5; i++) recordFailure(EMAIL);
    expect(isLocked(EMAIL)).toBe(true);
  });

  it("returns false after the lock duration expires", () => {
    vi.useFakeTimers();
    for (let i = 0; i < 5; i++) recordFailure(EMAIL);
    expect(isLocked(EMAIL)).toBe(true);

    // Advance past the 15-minute lock window
    vi.advanceTimersByTime(15 * 60 * 1000 + 1);
    expect(isLocked(EMAIL)).toBe(false);
  });

  it("auto-clears state when the lock expires", () => {
    vi.useFakeTimers();
    for (let i = 0; i < 5; i++) recordFailure(EMAIL);
    vi.advanceTimersByTime(15 * 60 * 1000 + 1);

    // Should be unlocked — further failures start a fresh count
    isLocked(EMAIL); // triggers the auto-clear
    recordFailure(EMAIL);
    expect(isLocked(EMAIL)).toBe(false); // only 1 failure, not at threshold
  });
});

describe("recordFailure", () => {
  it("does not lock before the 5th failure", () => {
    for (let i = 0; i < 4; i++) recordFailure(EMAIL);
    expect(isLocked(EMAIL)).toBe(false);
  });

  it("locks exactly on the 5th failure", () => {
    for (let i = 0; i < 5; i++) recordFailure(EMAIL);
    expect(isLocked(EMAIL)).toBe(true);
  });

  it("keeps the account locked on subsequent failures beyond the threshold", () => {
    for (let i = 0; i < 8; i++) recordFailure(EMAIL);
    expect(isLocked(EMAIL)).toBe(true);
  });

  it("tracks different emails independently", () => {
    for (let i = 0; i < 5; i++) recordFailure(EMAIL);
    expect(isLocked(EMAIL)).toBe(true);
    expect(isLocked(OTHER_EMAIL)).toBe(false);
  });
});

describe("clearAttempts", () => {
  it("removes a lock set by recordFailure", () => {
    for (let i = 0; i < 5; i++) recordFailure(EMAIL);
    expect(isLocked(EMAIL)).toBe(true);

    clearAttempts(EMAIL);
    expect(isLocked(EMAIL)).toBe(false);
  });

  it("resets the counter so failures start fresh", () => {
    for (let i = 0; i < 4; i++) recordFailure(EMAIL);
    clearAttempts(EMAIL);

    // After clear, 4 more failures should not trigger a lock
    for (let i = 0; i < 4; i++) recordFailure(EMAIL);
    expect(isLocked(EMAIL)).toBe(false);
  });

  it("is a no-op for an email with no recorded attempts", () => {
    expect(() => clearAttempts(EMAIL)).not.toThrow();
    expect(isLocked(EMAIL)).toBe(false);
  });

  it("only clears the targeted email", () => {
    for (let i = 0; i < 5; i++) recordFailure(EMAIL);
    for (let i = 0; i < 5; i++) recordFailure(OTHER_EMAIL);

    clearAttempts(EMAIL);
    expect(isLocked(EMAIL)).toBe(false);
    expect(isLocked(OTHER_EMAIL)).toBe(true);
  });
});
