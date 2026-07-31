import { describe, it, expect } from "vitest";
import { receptionDayRangeUtc } from "./timezone";

// CR-01: locks in that a picked calendar date is interpreted as a LOCAL day in
// the reception timezone (America/Mexico_City), not as UTC midnight. These
// assertions are timezone-independent of the machine running the test because
// receptionDayRangeUtc derives the offset from the IANA zone via Intl.

describe("receptionDayRangeUtc", () => {
  it("maps a local calendar day to its UTC bounds (Mexico City is UTC-6)", () => {
    const { start, end } = receptionDayRangeUtc("2026-07-31");
    // Local 2026-07-31 00:00 (UTC-6) === 2026-07-31 06:00Z
    expect(start.toISOString()).toBe("2026-07-31T06:00:00.000Z");
    // Exclusive end is the next local midnight.
    expect(end.toISOString()).toBe("2026-08-01T06:00:00.000Z");
  });

  it("includes an evening-created record under its LOCAL date, not the UTC date", () => {
    const { start, end } = receptionDayRangeUtc("2026-07-31");
    // Patient submits at local 2026-07-31 20:00 -> 2026-08-01 02:00Z. A naive
    // UTC-midnight range would exclude this; the local-day range must include it.
    const eveningSubmission = new Date("2026-08-01T02:00:00.000Z");
    expect(eveningSubmission.getTime()).toBeGreaterThanOrEqual(start.getTime());
    expect(eveningSubmission.getTime()).toBeLessThan(end.getTime());
  });

  it("excludes a submission that belongs to the previous local evening", () => {
    const { start } = receptionDayRangeUtc("2026-07-31");
    // Local 2026-07-30 20:00 -> 2026-07-31 02:00Z. Under a naive UTC range this
    // would wrongly appear under 31 July; the local-day range excludes it.
    const previousEvening = new Date("2026-07-31T02:00:00.000Z");
    expect(previousEvening.getTime()).toBeLessThan(start.getTime());
  });

  it("spans exactly 24 hours", () => {
    const { start, end } = receptionDayRangeUtc("2026-02-15");
    expect(end.getTime() - start.getTime()).toBe(24 * 60 * 60 * 1000);
  });
});
