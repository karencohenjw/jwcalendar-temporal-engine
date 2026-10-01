import { assertValidDate, fromAbsoluteDay, toAbsoluteDay, type CivilDate, type JulianCalendarDate } from "./core.js";

function julianDaysBeforeYear(year: number): number {
  // Astronomical year numbering is used internally here, so year 0 is 1 BCE.
  const y = year - 1;
  return 365 * y + Math.floor(y / 4);
}
function julianMonthLength(year: number, month: number): number {
  if (!Number.isInteger(month) || month < 1 || month > 12) throw new RangeError("month must be an integer from 1 through 12");
  if (month === 2) return year % 4 === 0 ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}
function validateJulian(date: JulianCalendarDate): void {
  if (!Number.isInteger(date.year) || date.year < 0 || date.year > 10000 || !Number.isInteger(date.month) || date.month < 1 || date.month > 12 || !Number.isInteger(date.day) || date.day < 1 || date.day > julianMonthLength(date.year, date.month)) throw new RangeError("Julian calendar date must have year 0–10000, month 1–12, and a valid day");
}
/** Convert a Julian-calendar date to the Rata Die index; year 0 denotes 1 BCE. */
export function julianCalendarToAbsoluteDay(date: JulianCalendarDate): number {
  validateJulian(date);
  const y = julianDaysBeforeYear(date.year);
  let m = 0;
  for (let month = 1; month < date.month; month++) m += julianMonthLength(date.year, month);
  return y + m + date.day - 2;
}
/** Convert a Gregorian date to its equivalent proleptic Julian-calendar date. */
export function gregorianToJulianCalendar(date: CivilDate): JulianCalendarDate {
  assertValidDate(date);
  const target = toAbsoluteDay(date);
  let lo = 0, hi = 10001;
  while (lo + 1 < hi) { const mid = Math.floor((lo + hi) / 2); if (julianDaysBeforeYear(mid) - 2 < target) lo = mid; else hi = mid; }
  const year = lo;
  let remaining = target - (julianDaysBeforeYear(year) - 2);
  if (remaining < 1) throw new RangeError("date falls outside supported Julian calendar range");
  let month = 1;
  while (remaining > julianMonthLength(year, month)) remaining -= julianMonthLength(year, month++);
  return { year, month, day: remaining };
}
/** Convert a proleptic Julian-calendar date to the supported Gregorian range. */
export function julianCalendarToGregorian(date: JulianCalendarDate): CivilDate {
  const absolute = julianCalendarToAbsoluteDay(date);
  return fromAbsoluteDay(absolute);
}
/** Integer Julian Day Number for the given date at noon (not a Julian calendar date). */
export function toJulianDayNumber(date: CivilDate): number { assertValidDate(date); return toAbsoluteDay(date) + 1721425; }
/** Convert an integer Julian Day Number, whose boundary is at noon, to its Gregorian civil date. */
export function fromJulianDayNumber(jdn: number): CivilDate {
  if (!Number.isSafeInteger(jdn)) throw new RangeError("Julian Day Number must be an integer");
  return fromAbsoluteDay(jdn - 1721425);
}
/** Strict inverse for Julian calendar dates, useful in round-trip workflows. */
export function absoluteDayToJulianCalendar(absoluteDay: number): JulianCalendarDate {
  if (!Number.isSafeInteger(absoluteDay)) throw new RangeError("absolute day must be an integer");
  const d = gregorianToJulianCalendar(fromAbsoluteDay(absoluteDay));
  return d;
}
export function createJulianCalendarDate(year: number, month: number, day: number): JulianCalendarDate {
  const date = { year, month, day }; validateJulian(date); return date;
}
