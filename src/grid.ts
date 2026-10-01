import { createDate, dayOfWeek, daysInMonth, isLeapYear, toAbsoluteDay, fromAbsoluteDay, type CivilDate } from "./core.js";
import { ISO_WEEK_MODEL, SUNDAY_WEEK_MODEL, toISOWeekDate, weekOfYear, type WeekModel } from "./week.js";
import { calendarFingerprint } from "./analysis.js";

export type WeekStart = "monday" | "sunday" | 1 | 2 | 3 | 4 | 5 | 6 | 7;
export interface MonthGridOptions {
  readonly year: number; readonly month: number; readonly weekStartsOn?: WeekStart;
  readonly fixedWeeks?: 4 | 5 | 6; readonly includeAdjacentDays?: boolean; readonly includeWeekNumbers?: boolean;
  readonly weekModel?: WeekModel; readonly weekendDays?: readonly number[];
}
export interface MonthGridCell {
  readonly date: CivilDate | null; readonly actualDate: CivilDate; readonly dayOfWeek: number;
  readonly ordinalDay: number; readonly isoWeek: number; readonly isoWeekYear: number;
  readonly inCurrentMonth: boolean; readonly isWeekend: boolean; readonly row: number; readonly column: number;
}
export interface MonthGrid { readonly year: number; readonly month: number; readonly weekStartsOn: number; readonly weekCount: number; readonly weekNumbers: readonly number[] | null; readonly cells: readonly (readonly MonthGridCell[])[] }
function weekdayNumber(value: WeekStart | undefined): number { return value === undefined ? 1 : value === "monday" ? 1 : value === "sunday" ? 7 : value; }
export function generateMonthGrid(options: MonthGridOptions): MonthGrid {
  const { year, month } = options; daysInMonth(year, month);
  const start = weekdayNumber(options.weekStartsOn);
  if (!Number.isInteger(start) || start < 1 || start > 7) throw new RangeError("weekStartsOn must be monday, sunday, or an ISO weekday 1–7");
  const first = createDate(year, month, 1), offset = (dayOfWeek(first) - start + 7) % 7;
  const naturalWeeks = Math.ceil((offset + daysInMonth(year, month)) / 7);
  const weekCount = options.fixedWeeks ?? naturalWeeks;
  if (![4, 5, 6].includes(weekCount) || weekCount < naturalWeeks) throw new RangeError(`fixedWeeks must be 4, 5, or 6 and cannot be smaller than the natural ${naturalWeeks}-week grid`);
  const firstDayIndex = toAbsoluteDay(first) - offset;
  const weekends = new Set(options.weekendDays ?? [6, 7]);
  const model = options.weekModel ?? (start === 7 ? SUNDAY_WEEK_MODEL : ISO_WEEK_MODEL);
  const rows: MonthGridCell[][] = [], weekNumbers: number[] = [];
  for (let row = 0; row < weekCount; row++) {
    const cells: MonthGridCell[] = [];
    for (let column = 0; column < 7; column++) {
      const actualDate = fromAbsoluteDay(firstDayIndex + row * 7 + column);
      const inCurrentMonth = actualDate.year === year && actualDate.month === month;
      const ordinalDay = actualDate.month === 1 ? actualDate.day : (() => { let n = actualDate.day; for (let m = 1; m < actualDate.month; m++) n += daysInMonth(actualDate.year, m); return n; })();
      const iso = toISOWeekDate(actualDate);
      cells.push({ date: inCurrentMonth || options.includeAdjacentDays ? actualDate : null, actualDate, dayOfWeek: dayOfWeek(actualDate), ordinalDay, isoWeek: iso.week, isoWeekYear: iso.weekYear, inCurrentMonth, isWeekend: weekends.has(dayOfWeek(actualDate)), row, column });
    }
    const firstDate = cells[0]?.actualDate;
    if (firstDate) weekNumbers.push(options.includeWeekNumbers ? weekOfYear(firstDate, model) : 0);
    rows.push(cells);
  }
  return { year, month, weekStartsOn: start, weekCount, weekNumbers: options.includeWeekNumbers ? weekNumbers : null, cells: rows };
}
export interface YearGridOptions extends Omit<MonthGridOptions, "year" | "month"> { readonly months?: readonly number[] }
export interface YearCalendar { readonly year: number; readonly daysInYear: number; readonly isoWeeks: number; readonly leapYear: boolean; readonly monthStartWeekdays: readonly number[]; readonly fingerprint: string; readonly months: readonly MonthGrid[] }
export function generateYear(year: number, options: YearGridOptions = {}): YearCalendar {
  if (!Number.isInteger(year) || year < 1 || year > 9999) throw new RangeError("year must be an integer from 1 through 9999");
  const months = (options.months ?? Array.from({ length: 12 }, (_, i) => i + 1)).map(month => generateMonthGrid({ ...options, year, month }));
  return { year, daysInYear: isLeapYear(year) ? 366 : 365, isoWeeks: (awaitWeeksInYear(year)), leapYear: isLeapYear(year), monthStartWeekdays: Array.from({ length: 12 }, (_, i) => dayOfWeek(createDate(year, i + 1, 1))), fingerprint: calendarFingerprint(year), months };
}
import { weeksInISOYear as awaitWeeksInYear } from "./week.js";
export function monthGridSignature(options: MonthGridOptions): string {
  const grid = generateMonthGrid({ ...options, includeAdjacentDays: true });
  return `${grid.weekStartsOn}|${grid.weekCount}|${grid.cells.map(row => row.map(cell => cell.inCurrentMonth ? String(cell.actualDate.day).padStart(2, "0") : "..").join(",")).join("/")}`;
}
