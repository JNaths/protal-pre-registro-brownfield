// D-07 / CR-01: the reception console filters pre-registros by the *local*
// calendar day the patient submitted, not by UTC. A date-only string such as
// "2026-07-31" is parsed by `new Date("2026-07-31")` as UTC midnight (mandated
// by the ECMAScript spec regardless of server TZ), so a naive
// [midnightUTC, +24h) range is shifted 6h from the Mexico-local day and returns
// the wrong records for a predictable window every evening.
//
// This helper builds the [start, end) range in the reception timezone and
// converts it to the UTC instants the query needs. The offset is derived at
// runtime via `Intl` for the specific date, so it stays correct even if the
// zone's UTC offset ever changes (DST-safe). Mexico City no longer observes DST
// (nationwide abolition, 2022), so today this resolves to a stable UTC-6, but we
// avoid hardcoding the offset so the logic survives future policy changes.

// The timezone the reception desk operates in. Kept as a single named constant
// so it can later be promoted to configuration without touching call sites.
export const RECEPTION_TIME_ZONE = "America/Mexico_City";

// Returns the offset, in milliseconds, that must be ADDED to a UTC instant to
// obtain the wall-clock time in `timeZone` at that instant. For UTC-6 this is
// -6h. Computed by formatting the instant in the target zone and diffing the
// resulting wall-clock (interpreted as if it were UTC) against the real instant.
function timeZoneOffsetMs(timeZone: string, instant: Date): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = dtf.formatToParts(instant);
  const map: Record<string, number> = {};
  for (const part of parts) {
    if (part.type !== "literal") {
      map[part.type] = Number(part.value);
    }
  }
  const wallAsUtc = Date.UTC(
    map.year,
    map.month - 1,
    map.day,
    map.hour,
    map.minute,
    map.second,
  );
  return wallAsUtc - instant.getTime();
}

/**
 * Given a date-only string ("YYYY-MM-DD"), returns the [start, end) UTC instants
 * that bound that calendar day in the reception timezone.
 *
 * Example (UTC-6): "2026-07-31" -> start = 2026-07-31T06:00:00Z,
 * end = 2026-08-01T06:00:00Z. A pre-registro created at local 2026-07-31 20:00
 * (02:00Z next day) then correctly falls inside the "31 July" range.
 */
export function receptionDayRangeUtc(
  fecha: string,
  timeZone: string = RECEPTION_TIME_ZONE,
): { start: Date; end: Date } {
  const [year, month, day] = fecha.split("-").map(Number);
  // Wall-clock local midnight, treated as if it were UTC.
  const naiveMidnight = Date.UTC(year, month - 1, day, 0, 0, 0);
  // Offset at that instant; subtracting it maps the wall-clock midnight to the
  // true UTC instant of local midnight.
  const offset = timeZoneOffsetMs(timeZone, new Date(naiveMidnight));
  const start = new Date(naiveMidnight - offset);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}
