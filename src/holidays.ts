import { InvalidHolidayRuleError, addDays, assertValidDate, createDate, dayOfWeek, daysInMonth, formatDate, type CivilDate } from "./core.js";

export type WeekdayName = "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";
const weekdayNumber: Record<WeekdayName, number> = { monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6, sunday: 7 };
export type HolidayRule =
  | { readonly type: "fixed-date"; readonly month: number; readonly day: number }
  | { readonly type: "nth-weekday"; readonly month: number; readonly weekday: WeekdayName; readonly occurrence: number }
  | { readonly type: "last-weekday"; readonly month: number; readonly weekday: WeekdayName }
  | { readonly type: "nearest-weekday"; readonly month: number; readonly day: number }
  | { readonly type: "relative-date"; readonly month: number; readonly day: number; readonly offsetDays: number };
export interface HolidayDefinition { readonly id: string; readonly name: string; readonly rule: HolidayRule; readonly observe?: "nearest-weekday" | false }
export interface Holiday { readonly id: string; readonly name: string; readonly date: CivilDate; readonly observedDate: CivilDate; readonly rule: HolidayRule }
export interface HolidayCalendar { readonly id: string; readonly rules: readonly HolidayDefinition[] }
export function fixedDate(month: number, day: number): HolidayRule { return { type: "fixed-date", month, day }; }
export function nthWeekdayOfMonth(month: number, weekday: WeekdayName, occurrence: number): HolidayRule { return { type: "nth-weekday", month, weekday, occurrence }; }
export function lastWeekdayOfMonth(month: number, weekday: WeekdayName): HolidayRule { return { type: "last-weekday", month, weekday }; }
export function nearestWeekday(month: number, day: number): HolidayRule { return { type: "nearest-weekday", month, day }; }
export function relativeDate(month: number, day: number, offsetDays: number): HolidayRule { return { type: "relative-date", month, day, offsetDays }; }
export function observedDate(date: CivilDate): CivilDate {
  assertValidDate(date);
  const weekday = dayOfWeek(date);
  return weekday === 6 ? addDays(date, -1) : weekday === 7 ? addDays(date, 1) : date;
}
function validateDefinition(definition: HolidayDefinition): void {
  const { rule } = definition;
  if (!definition.id || !definition.name || !rule || typeof rule !== "object") throw new InvalidHolidayRuleError("holiday definitions require a non-empty id, name, and rule");
  if (!("month" in rule) || !Number.isInteger(rule.month) || rule.month < 1 || rule.month > 12) throw new InvalidHolidayRuleError("holiday rule month must be an integer from 1 through 12");
  if ((rule.type === "fixed-date" || rule.type === "nearest-weekday" || rule.type === "relative-date") && (!Number.isInteger(rule.day) || rule.day < 1 || rule.day > 31)) throw new InvalidHolidayRuleError("holiday rule day must be an integer from 1 through 31");
  if (rule.type === "nth-weekday" && (!Object.hasOwn(weekdayNumber, rule.weekday) || !Number.isInteger(rule.occurrence) || rule.occurrence < 1 || rule.occurrence > 5)) throw new InvalidHolidayRuleError("nth-weekday requires a weekday and occurrence 1 through 5");
  if (rule.type === "last-weekday" && !Object.hasOwn(weekdayNumber, rule.weekday)) throw new InvalidHolidayRuleError("last-weekday requires a valid weekday");
  if (rule.type === "relative-date" && !Number.isSafeInteger(rule.offsetDays)) throw new InvalidHolidayRuleError("relative-date offsetDays must be a safe integer");
}
export function resolveHolidayRule(year: number, definition: HolidayDefinition): CivilDate {
  if (!Number.isInteger(year) || year < 1 || year > 9999) throw new RangeError("year must be an integer from 1 through 9999");
  validateDefinition(definition);
  const rule = definition.rule;
  if (rule.type === "fixed-date") return createDate(year, rule.month, rule.day);
  if (rule.type === "relative-date") return addDays(createDate(year, rule.month, rule.day), rule.offsetDays);
  if (rule.type === "nearest-weekday") {
    const date = createDate(year, rule.month, rule.day), weekday = dayOfWeek(date);
    return weekday === 6 ? addDays(date, -1) : weekday === 7 ? addDays(date, 1) : date;
  }
  const target = weekdayNumber[rule.weekday];
  if (rule.type === "nth-weekday") {
    const first = createDate(year, rule.month, 1);
    const day = 1 + ((target - dayOfWeek(first) + 7) % 7) + 7 * (rule.occurrence - 1);
    if (day > daysInMonth(year, rule.month)) throw new InvalidHolidayRuleError("requested weekday occurrence does not exist in this month");
    return createDate(year, rule.month, day);
  }
  let date = createDate(year, rule.month, daysInMonth(year, rule.month));
  while (dayOfWeek(date) !== target) date = addDays(date, -1);
  return date;
}
export function defineHolidayCalendar(calendar: HolidayCalendar): HolidayCalendar {
  if (!calendar.id || !Array.isArray(calendar.rules)) throw new InvalidHolidayRuleError("holiday calendar requires an id and a rules array");
  const ids = new Set<string>();
  for (const definition of calendar.rules) { validateDefinition(definition); if (ids.has(definition.id)) throw new InvalidHolidayRuleError(`duplicate holiday id: ${definition.id}`); ids.add(definition.id); }
  return { id: calendar.id, rules: calendar.rules.map(rule => ({ ...rule })) };
}
export function holidaysForCalendar(year: number, calendar: HolidayCalendar): Holiday[] {
  const defined = defineHolidayCalendar(calendar);
  return defined.rules.map(definition => { const date = resolveHolidayRule(year, definition); const observed = definition.observe === "nearest-weekday" ? observedDate(date) : date; return { id: definition.id, name: definition.name, date, observedDate: observed, rule: definition.rule }; });
}
const usRules: readonly HolidayDefinition[] = [
  { id: "new-years-day", name: "New Year's Day", rule: { type: "fixed-date", month: 1, day: 1 }, observe: "nearest-weekday" },
  { id: "martin-luther-king-jr-day", name: "Birthday of Martin Luther King, Jr.", rule: nthWeekdayOfMonth(1, "monday", 3) },
  { id: "washingtons-birthday", name: "Washington's Birthday", rule: nthWeekdayOfMonth(2, "monday", 3) },
  { id: "memorial-day", name: "Memorial Day", rule: lastWeekdayOfMonth(5, "monday") },
  { id: "juneteenth", name: "Juneteenth National Independence Day", rule: { type: "fixed-date", month: 6, day: 19 }, observe: "nearest-weekday" },
  { id: "independence-day", name: "Independence Day", rule: { type: "fixed-date", month: 7, day: 4 }, observe: "nearest-weekday" },
  { id: "labor-day", name: "Labor Day", rule: nthWeekdayOfMonth(9, "monday", 1) },
  { id: "columbus-day", name: "Columbus Day", rule: nthWeekdayOfMonth(10, "monday", 2) },
  { id: "veterans-day", name: "Veterans Day", rule: { type: "fixed-date", month: 11, day: 11 }, observe: "nearest-weekday" },
  { id: "thanksgiving-day", name: "Thanksgiving Day", rule: nthWeekdayOfMonth(11, "thursday", 4) },
  { id: "christmas-day", name: "Christmas Day", rule: { type: "fixed-date", month: 12, day: 25 }, observe: "nearest-weekday" },
];
export function usFederalHolidays(year: number): Holiday[] { return holidaysForCalendar(year, { id: "us-federal", rules: usRules }); }
export function composeRules(...rules: HolidayDefinition[]): readonly HolidayDefinition[] { return defineHolidayCalendar({ id: "composed", rules }).rules; }
export function holidayDates(year: number): Readonly<Record<string, string>> { return Object.fromEntries(usFederalHolidays(year).map(h => [h.id, formatDate(h.observedDate)])); }
