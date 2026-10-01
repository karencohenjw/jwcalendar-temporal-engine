import { assertValidDate, createDate, dayOfWeek, daysInMonth, isLeapYear, parseDate, toAbsoluteDay, type CivilDate } from "./core.js";
import { julianCalendarToAbsoluteDay, gregorianToJulianCalendar, toJulianDayNumber } from "./julian.js";
import { toOrdinalDate } from "./ordinal.js";
import { toISOWeekDate, weeksInISOYear } from "./week.js";
import { generateMonthGrid, generateYear, monthGridSignature, type MonthGrid, type YearCalendar } from "./grid.js";
import { usFederalHolidays, type Holiday } from "./holidays.js";

/** Structural fingerprint: leap flag, Jan 1 weekday, then each month's length and first weekday. */
export function calendarFingerprint(year: number): string {
  if (!Number.isInteger(year) || year < 1 || year > 9999) throw new RangeError("year must be an integer from 1 through 9999");
  const parts = [isLeapYear(year) ? "L" : "C", String(dayOfWeek(createDate(year, 1, 1)))];
  for (let month = 1; month <= 12; month++) parts.push(`${daysInMonth(year, month)}:${dayOfWeek(createDate(year, month, 1))}`);
  return parts.join("|");
}
export function areCalendarYearsEquivalent(yearA: number, yearB: number): boolean { return calendarFingerprint(yearA) === calendarFingerprint(yearB); }
export function findEquivalentCalendarYears(year: number, range: { readonly from: number; readonly to: number }): number[] {
  if (!Number.isInteger(range.from) || !Number.isInteger(range.to) || range.from < 1 || range.to > 9999 || range.from > range.to) throw new RangeError("range must be an inclusive ascending interval within years 1–9999");
  const fingerprint = calendarFingerprint(year);
  const result: number[] = [];
  for (let candidate = range.from; candidate <= range.to; candidate++) if (calendarFingerprint(candidate) === fingerprint) result.push(candidate);
  return result;
}
export interface BoundaryAnalysis {
  readonly date: CivilDate; readonly monthStart: boolean; readonly monthEnd: boolean; readonly yearStart: boolean; readonly yearEnd: boolean;
  readonly leapDay: boolean; readonly leapYear: boolean; readonly isoWeekYearMismatch: boolean; readonly firstISOWeek: boolean;
  readonly lastISOWeek: boolean; readonly adjacentToLeapDay: boolean; readonly gregorianJulianDivergenceDays: number;
}
export function analyzeDateBoundary(date: CivilDate): BoundaryAnalysis {
  assertValidDate(date);
  const iso = toISOWeekDate(date), leapDay = date.month === 2 && date.day === 29;
  let adjacentToLeapDay = false;
  const abs = toAbsoluteDay(date);
  for (const year of [date.year - 1, date.year, date.year + 1]) if (year >= 1 && year <= 9999 && isLeapYear(year)) {
    const leapAbs = toAbsoluteDay(createDate(year, 2, 29));
    if (Math.abs(abs - leapAbs) <= 1) adjacentToLeapDay = true;
  }
  const sameLabelJulianAbs = julianCalendarToAbsoluteDay({ year: date.year, month: date.month, day: Math.min(date.day, daysInMonth(date.year, date.month)) });
  return {
    date, monthStart: date.day === 1, monthEnd: date.day === daysInMonth(date.year, date.month),
    yearStart: date.month === 1 && date.day === 1, yearEnd: date.month === 12 && date.day === 31,
    leapDay, leapYear: isLeapYear(date.year), isoWeekYearMismatch: iso.weekYear !== date.year,
    firstISOWeek: iso.week === 1, lastISOWeek: iso.week === weeksInISOYear(iso.weekYear), adjacentToLeapDay,
    gregorianJulianDivergenceDays: toAbsoluteDay(date) - sameLabelJulianAbs,
  };
}
export function scanBoundaryCases(year: number): CivilDate[] {
  if (!Number.isInteger(year) || year < 1 || year > 9999) throw new RangeError("year must be an integer from 1 through 9999");
  const dates = new Map<number, CivilDate>();
  const add = (date: CivilDate) => { if (date.year >= 1 && date.year <= 9999) dates.set(toAbsoluteDay(date), date); };
  for (let month = 1; month <= 12; month++) { add(createDate(year, month, 1)); add(createDate(year, month, daysInMonth(year, month))); }
  for (let day = 29; day <= 31; day++) { if (day <= daysInMonth(year, 12)) add(createDate(year, 12, day)); }
  for (let day = 1; day <= 4; day++) add(createDate(year, 1, day));
  if (isLeapYear(year)) add(createDate(year, 2, 29));
  if (year > 1) for (let day = 29; day <= 31; day++) add(createDate(year - 1, 12, day));
  return [...dates.entries()].sort(([a], [b]) => a - b).map(([, date]) => date);
}
export type TestVectorCategory = "leap-years" | "month-boundaries" | "iso-week-boundaries" | "year-boundaries" | "gregorian-julian" | "holiday-observance" | "53-week-years";
export interface CalendarTestVector { readonly category: TestVectorCategory; readonly date: CivilDate; readonly expected: Readonly<Record<string, string | number | boolean>> }
export function generateCalendarTestVectors(options: { readonly startYear: number; readonly endYear: number; readonly categories?: readonly TestVectorCategory[] }): CalendarTestVector[] {
  const { startYear, endYear } = options;
  if (!Number.isInteger(startYear) || !Number.isInteger(endYear) || startYear < 1 || endYear > 9999 || startYear > endYear) throw new RangeError("startYear and endYear must be an ascending interval within 1–9999");
  if (endYear - startYear > 1000) throw new RangeError("test-vector intervals are limited to 1001 years");
  const selected = new Set(options.categories ?? ["leap-years", "month-boundaries", "iso-week-boundaries", "year-boundaries", "gregorian-julian", "holiday-observance", "53-week-years"]);
  const vectors: CalendarTestVector[] = [];
  const push = (category: TestVectorCategory, date: CivilDate, expected: Record<string, string | number | boolean>) => { if (selected.has(category)) vectors.push({ category, date, expected }); };
  for (let year = startYear; year <= endYear; year++) {
    if (isLeapYear(year)) push("leap-years", createDate(year, 2, 29), { leapYear: true, dayOfYear: 60 });
    if (weeksInISOYear(year) === 53) push("53-week-years", createDate(year, 12, 31), { isoWeeks: 53 });
    for (let month = 1; month <= 12; month++) {
      push("month-boundaries", createDate(year, month, 1), { monthStart: true, weekday: dayOfWeek(createDate(year, month, 1)) });
      push("month-boundaries", createDate(year, month, daysInMonth(year, month)), { monthEnd: true });
    }
    for (const day of [1, 2, 3, 4, 29, 30, 31]) {
      if (day > 31 || (day > 28 && day > daysInMonth(year, day <= 4 ? 1 : 12))) continue;
      const date = day <= 4 ? createDate(year, 1, day) : createDate(year, 12, day);
      const iso = toISOWeekDate(date);
      push("iso-week-boundaries", date, { weekYear: iso.weekYear, week: iso.week, weekday: iso.weekday });
    }
    push("year-boundaries", createDate(year, 1, 1), { yearStart: true, ordinal: 1 });
    push("year-boundaries", createDate(year, 12, 31), { yearEnd: true, ordinal: isLeapYear(year) ? 366 : 365 });
    if (selected.has("gregorian-julian")) { const date = createDate(year, 7, 1); const j = gregorianToJulianCalendar(date); push("gregorian-julian", date, { julianYear: j.year, julianMonth: j.month, julianDay: j.day }); }
    if (selected.has("holiday-observance")) for (const holiday of usFederalHolidays(year)) if (toAbsoluteDay(holiday.date) !== toAbsoluteDay(holiday.observedDate)) push("holiday-observance", holiday.date, { holiday: holiday.id, observedDate: toAbsoluteDay(holiday.observedDate) });
  }
  return vectors;
}
export interface DateExplanation {
  readonly gregorian: CivilDate; readonly julianCalendar: ReturnType<typeof gregorianToJulianCalendar>; readonly julianDayNumber: number;
  readonly ordinal: ReturnType<typeof toOrdinalDate>; readonly isoWeek: ReturnType<typeof toISOWeekDate>; readonly weekday: number;
  readonly monthGridCoordinates: readonly { readonly weekStartsOn: string; readonly row: number; readonly column: number }[];
  readonly boundaryFlags: BoundaryAnalysis; readonly holidays: readonly Holiday[];
}
export function explainDate(input: string | CivilDate): DateExplanation {
  const date = typeof input === "string" ? parseDate(input) : input;
  assertValidDate(date);
  const coords = (["monday", "sunday"] as const).map(start => { const grid = generateMonthGrid({ year: date.year, month: date.month, weekStartsOn: start, includeAdjacentDays: true }); const cell = grid.cells.flat().find(item => item.actualDate.day === date.day && item.actualDate.month === date.month && item.actualDate.year === date.year); return { weekStartsOn: start, row: cell?.row ?? -1, column: cell?.column ?? -1 }; });
  return { gregorian: date, julianCalendar: gregorianToJulianCalendar(date), julianDayNumber: toJulianDayNumber(date), ordinal: toOrdinalDate(date), isoWeek: toISOWeekDate(date), weekday: dayOfWeek(date), monthGridCoordinates: coords, boundaryFlags: analyzeDateBoundary(date), holidays: usFederalHolidays(date.year).filter(h => h.date.year === date.year && (h.date.month === date.month && h.date.day === date.day || h.observedDate.month === date.month && h.observedDate.day === date.day)) };
}
export interface ExplainYearOptions { readonly includeMonths?: boolean; readonly equivalentRange?: { readonly from: number; readonly to: number } }
export interface YearExplanation { readonly year: number; readonly leapYear: boolean; readonly daysInYear: number; readonly isoWeeks: number; readonly fingerprint: string; readonly monthStartWeekdays: readonly number[]; readonly equivalentYears: readonly number[]; readonly federalHolidays: readonly Holiday[]; readonly boundaryCases: readonly CivilDate[]; readonly months?: readonly MonthGrid[] }
export function explainYear(year: number, options: ExplainYearOptions = {}): YearExplanation {
  const full: YearCalendar = generateYear(year, { includeAdjacentDays: true, includeWeekNumbers: true });
  const range = options.equivalentRange ?? { from: Math.max(1, year - 14), to: Math.min(9999, year + 14) };
  const base = { year, leapYear: full.leapYear, daysInYear: full.daysInYear, isoWeeks: full.isoWeeks, fingerprint: full.fingerprint, monthStartWeekdays: full.monthStartWeekdays, equivalentYears: findEquivalentCalendarYears(year, range), federalHolidays: usFederalHolidays(year), boundaryCases: scanBoundaryCases(year) };
  return options.includeMonths ? { ...base, months: full.months } : base;
}
export function calendarLayoutExample(year: number, month: number): { readonly signature: string; readonly grid: MonthGrid } { return { signature: monthGridSignature({ year, month, weekStartsOn: "sunday" }), grid: generateMonthGrid({ year, month, weekStartsOn: "sunday", includeAdjacentDays: true }) }; }
