/** Proleptic Gregorian civil date. Supported years are 1 through 9999. */
export interface CivilDate { readonly year: number; readonly month: number; readonly day: number }
export interface JulianCalendarDate { readonly year: number; readonly month: number; readonly day: number }
export type OverflowPolicy = "reject" | "constrain";

export class InvalidCivilDateError extends RangeError {
  readonly code = "ERR_INVALID_CIVIL_DATE";
  constructor(message: string, readonly input?: unknown) { super(message); this.name = "InvalidCivilDateError"; }
}
export class InvalidISOWeekDateError extends RangeError {
  readonly code = "ERR_INVALID_ISO_WEEK_DATE";
  constructor(message: string, readonly input?: unknown) { super(message); this.name = "InvalidISOWeekDateError"; }
}
export class InvalidHolidayRuleError extends TypeError {
  readonly code = "ERR_INVALID_HOLIDAY_RULE";
  constructor(message: string) { super(message); this.name = "InvalidHolidayRuleError"; }
}

export function isLeapYear(year: number): boolean {
  if (!Number.isInteger(year) || year < 1 || year > 9999) throw new RangeError("year must be an integer from 1 through 9999");
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}
export function daysInMonth(year: number, month: number): number {
  if (!Number.isInteger(month) || month < 1 || month > 12) throw new RangeError("month must be an integer from 1 through 12");
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  return month === 4 || month === 6 || month === 9 || month === 11 ? 30 : 31;
}
export function isValidDate(value: unknown): value is CivilDate {
  if (typeof value !== "object" || value === null) return false;
  const d = value as Record<string, unknown>;
  return Number.isInteger(d["year"]) && Number(d["year"]) >= 1 && Number(d["year"]) <= 9999 &&
    Number.isInteger(d["month"]) && Number(d["month"]) >= 1 && Number(d["month"]) <= 12 &&
    Number.isInteger(d["day"]) && Number(d["day"]) >= 1 && Number(d["day"]) <= monthLengthUnchecked(Number(d["year"]), Number(d["month"]));
}
function monthLengthUnchecked(year: number, month: number): number {
  return month === 2 ? ((year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)) ? 29 : 28) : ([4, 6, 9, 11].includes(month) ? 30 : 31);
}
export function assertValidDate(date: unknown): asserts date is CivilDate {
  if (!isValidDate(date)) throw new InvalidCivilDateError("Expected a valid Gregorian civil date with year 1–9999, month 1–12, and a real day of month", date);
}
export function createDate(year: number, month: number, day: number): CivilDate {
  const date = { year, month, day };
  assertValidDate(date);
  return date;
}
export function compareDates(a: CivilDate, b: CivilDate): -1 | 0 | 1 {
  assertValidDate(a); assertValidDate(b);
  return a.year !== b.year ? (a.year < b.year ? -1 : 1) : a.month !== b.month ? (a.month < b.month ? -1 : 1) : a.day === b.day ? 0 : a.day < b.day ? -1 : 1;
}

/** Rata Die: integer 1 is Gregorian 0001-01-01. Monday=1 ... Sunday=7. */
export function toAbsoluteDay(date: CivilDate): number {
  assertValidDate(date);
  const y = date.year - 1;
  const beforeYear = 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400);
  let beforeMonth = 0;
  for (let m = 1; m < date.month; m++) beforeMonth += monthLengthUnchecked(date.year, m);
  return beforeYear + beforeMonth + date.day;
}
export function fromAbsoluteDay(day: number): CivilDate {
  if (!Number.isSafeInteger(day) || day < 1 || day > toAbsoluteDay({ year: 9999, month: 12, day: 31 })) throw new RangeError("absolute day must map to a Gregorian date from 0001-01-01 through 9999-12-31");
  let lo = 1, hi = 10000;
  while (lo + 1 < hi) { const mid = Math.floor((lo + hi) / 2); if (toAbsoluteYearStart(mid) < day) lo = mid; else hi = mid; }
  let remaining = day - toAbsoluteYearStart(lo);
  let month = 1;
  while (remaining > monthLengthUnchecked(lo, month)) remaining -= monthLengthUnchecked(lo, month++);
  return { year: lo, month, day: remaining };
}
function toAbsoluteYearStart(year: number): number {
  const y = year - 1;
  return 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400);
}
export function dayOfWeek(date: CivilDate): 1 | 2 | 3 | 4 | 5 | 6 | 7 {
  const n = (toAbsoluteDay(date) - 1) % 7 + 1;
  return n as 1 | 2 | 3 | 4 | 5 | 6 | 7;
}
export function addDays(date: CivilDate, amount: number): CivilDate {
  assertValidDate(date);
  if (!Number.isSafeInteger(amount)) throw new RangeError("amount must be a safe integer");
  return fromAbsoluteDay(toAbsoluteDay(date) + amount);
}
export function addMonths(date: CivilDate, amount: number, options: { overflow?: OverflowPolicy } = {}): CivilDate {
  assertValidDate(date);
  if (!Number.isSafeInteger(amount)) throw new RangeError("amount must be a safe integer");
  const index = (date.year - 1) * 12 + (date.month - 1) + amount;
  if (index < 0 || index >= 9999 * 12) throw new RangeError("resulting year is outside the supported range 1–9999");
  const year = Math.floor(index / 12) + 1, month = index % 12 + 1;
  const max = daysInMonth(year, month);
  if (date.day > max && options.overflow !== "constrain") throw new InvalidCivilDateError("day does not exist in the target month; pass { overflow: 'constrain' } to use its final day", { date, amount });
  return { year, month, day: Math.min(date.day, max) };
}
export function addYears(date: CivilDate, amount: number, options: { overflow?: OverflowPolicy } = {}): CivilDate {
  assertValidDate(date);
  if (!Number.isSafeInteger(amount)) throw new RangeError("amount must be a safe integer");
  const year = date.year + amount;
  if (year < 1 || year > 9999) throw new RangeError("resulting year is outside the supported range 1–9999");
  return addMonths(date, amount * 12, options);
}
export function differenceInDays(a: CivilDate, b: CivilDate): number { return toAbsoluteDay(b) - toAbsoluteDay(a); }
export function formatDate(date: CivilDate): string {
  assertValidDate(date);
  return `${String(date.year).padStart(4, "0")}-${String(date.month).padStart(2, "0")}-${String(date.day).padStart(2, "0")}`;
}
export function parseDate(value: string): CivilDate {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new InvalidCivilDateError("date must use the exact YYYY-MM-DD format", value);
  return createDate(Number(match[1]), Number(match[2]), Number(match[3]));
}
