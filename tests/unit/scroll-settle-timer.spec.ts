import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createScrollSettleTimer,
  DEFAULT_SETTLE_MS,
  hasSettled,
} from "~/utils/mobilePaneSync";

describe("hasSettled", () => {
  it("is not settled before the threshold elapses", () => {
    expect(hasSettled(DEFAULT_SETTLE_MS - 1)).toBe(false);
  });

  it("is settled once the threshold elapses", () => {
    expect(hasSettled(DEFAULT_SETTLE_MS)).toBe(true);
  });

  it("honours a custom threshold", () => {
    expect(hasSettled(50, 40)).toBe(true);
    expect(hasSettled(30, 40)).toBe(false);
  });
});

describe("createScrollSettleTimer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("fires onSettle once settleMs has passed since the last ping", () => {
    const onSettle = vi.fn();
    const timer = createScrollSettleTimer(onSettle, 100);

    timer.ping();
    vi.advanceTimersByTime(99);
    expect(onSettle).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(onSettle).toHaveBeenCalledTimes(1);
  });

  it("restarts the countdown on every ping — doesn't fire mid-gesture", () => {
    const onSettle = vi.fn();
    const timer = createScrollSettleTimer(onSettle, 100);

    timer.ping();
    vi.advanceTimersByTime(60);
    timer.ping(); // simulates another IntersectionObserver callback mid-drag
    vi.advanceTimersByTime(60);
    expect(onSettle).not.toHaveBeenCalled(); // only 60ms since the last ping

    vi.advanceTimersByTime(40);
    expect(onSettle).toHaveBeenCalledTimes(1);
  });

  it("never fires if cancelled before settling", () => {
    const onSettle = vi.fn();
    const timer = createScrollSettleTimer(onSettle, 100);

    timer.ping();
    vi.advanceTimersByTime(50);
    timer.cancel();
    vi.advanceTimersByTime(100);

    expect(onSettle).not.toHaveBeenCalled();
  });

  it("cancel is a no-op when nothing is pending", () => {
    const onSettle = vi.fn();
    const timer = createScrollSettleTimer(onSettle, 100);

    expect(() => timer.cancel()).not.toThrow();
    expect(onSettle).not.toHaveBeenCalled();
  });

  it("uses DEFAULT_SETTLE_MS when no threshold is given", () => {
    const onSettle = vi.fn();
    const timer = createScrollSettleTimer(onSettle);

    timer.ping();
    vi.advanceTimersByTime(DEFAULT_SETTLE_MS - 1);
    expect(onSettle).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(onSettle).toHaveBeenCalledTimes(1);
  });
});
