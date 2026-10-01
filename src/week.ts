import { InvalidISOWeekDateError, assertValidDate, createDate, dayOfWeek, fromAbsoluteDay, toAbsoluteDay, type CivilDate } from "./core.js";

export interface WeekModel { readonly firstDay: 1 | 2 | 3 | 4 | 5 | 6 | 7; readonly minimalDaysInFirstWeek: number }
export interface ISOWeekDate { readonly weekYear: number; readonly week: number; readonly weekday: 1 | 2 | 3 | 4 | 5 | 6 | 7 }
export const ISO_WEEK_MODEL: WeekModel = Object.freeze({ firstDay: 1, minimalDaysInFirstWeek: 4 });
export const MONDAY_WEEK_MODEL: WeekModel = Object.freeze({ firstDay: 1, minimalDaysInFirstWeek: 1 });
export const SUNDAY_WEEK_MODEL: WeekModel = Object.freeze({ firstDay: 7, minimalDaysInFirstWeek: 1 });
function validateModel(model: WeekModel): void {
  if (!Number.isInteger(model.firstDay) || model.firstDay < 1 || model.firstDay > 7 || !Number.isInteger(model.minimalDaysInFirstWeek) || model.minimalDaysInFirstWeek < 1 || model.minimalDaysInFirstWeek > 7) throw new RangeError("WeekModel requires firstDay and minimalDaysInFirstWeek from 1 through 7");
}
function startOfWeekYear(year: number, model: WeekModel): number {
  if (!Number.isInteger(year) || year < 1 || year > 9999) throw new RangeError("year must be an integer from 1 through 9999");
  validateModel(model);
  const jan1 = toAbsoluteDay(createDate(year, 1, 1));
  const offset = (dayOfWeek(createDate(year, 1, 1)) - model.firstDay + 7) % 7;
  const firstStart = jan1 - offset;
  const daysInYearFirstWeek = 7 - offset;
  return daysInYearFirstWeek >= model.minimalDaysInFirstWeek ? firstStart : firstStart + 7;
}
export function weekYear(date: CivilDate, model: WeekModel = ISO_WEEK_MODEL): number {
  assertValidDate(date); validateModel(model);
  const absolute = toAbsoluteDay(date);
  let year = date.year;
  if (absolute < startOfWeekYear(year, model)) year--;
  else if (year < 9999 && absolute >= startOfWeekYear(year + 1, model)) year++;
  return year;
}
export function weekOfYear(date: CivilDate, model: WeekModel = ISO_WEEK_MODEL): number {
  const year = weekYear(date, model);
  return Math.floor((toAbsoluteDay(date) - startOfWeekYear(year, model)) / 7) + 1;
}
export function weeksInYear(year: number, model: WeekModel = ISO_WEEK_MODEL): number {
  const start = startOfWeekYear(year, model);
  const next = year < 9999 ? startOfWeekYear(year + 1, model) : toAbsoluteDay(createDate(year, 12, 31)) + 1 + ((model.firstDay - dayOfWeek(createDate(year, 12, 31)) + 7) % 7);
  return Math.round((next - start) / 7);
}
export function toISOWeekDate(date: CivilDate): ISOWeekDate {
  const weekYearValue = weekYear(date, ISO_WEEK_MODEL);
  return { weekYear: weekYearValue, week: weekOfYear(date, ISO_WEEK_MODEL), weekday: dayOfWeek(date) };
}
export function weeksInISOYear(year: number): number { return weeksInYear(year, ISO_WEEK_MODEL); }
export function fromISOWeekDate(value: ISOWeekDate): CivilDate {
  const { weekYear: year, week, weekday } = value;
  if (!Number.isInteger(year) || year < 1 || year > 9999 || !Number.isInteger(week) || !Number.isInteger(weekday) || weekday < 1 || weekday > 7 || week < 1 || week > weeksInISOYear(year)) throw new InvalidISOWeekDateError("ISO week date must have a supported week-year, a real week in that year, and weekday 1–7", value);
  const absolute = startOfWeekYear(year, ISO_WEEK_MODEL) + (week - 1) * 7 + weekday - 1;
  try { return fromAbsoluteDay(absolute); } catch { throw new InvalidISOWeekDateError("ISO week date falls outside supported Gregorian years 1–9999", value); }
}
