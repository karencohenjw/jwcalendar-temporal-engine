import { assertValidDate, createDate, daysInMonth, isLeapYear, type CivilDate } from "./core.js";
export interface OrdinalDate { readonly year: number; readonly dayOfYear: number }
export function dayOfYear(date: CivilDate): number {
  assertValidDate(date);
  let n = date.day;
  for (let month = 1; month < date.month; month++) n += daysInMonth(date.year, month);
  return n;
}
export function toOrdinalDate(date: CivilDate): OrdinalDate { return { year: date.year, dayOfYear: dayOfYear(date) }; }
export function fromOrdinalDate(value: OrdinalDate): CivilDate {
  if (!Number.isInteger(value.year) || value.year < 1 || value.year > 9999 || !Number.isInteger(value.dayOfYear) || value.dayOfYear < 1 || value.dayOfYear > (isLeapYear(value.year) ? 366 : 365)) throw new RangeError("ordinal date must contain a valid year and dayOfYear");
  let remaining = value.dayOfYear, month = 1;
  while (remaining > daysInMonth(value.year, month)) remaining -= daysInMonth(value.year, month++);
  return createDate(value.year, month, remaining);
}
export function daysRemainingInYear(date: CivilDate): number { return (isLeapYear(date.year) ? 366 : 365) - dayOfYear(date); }
