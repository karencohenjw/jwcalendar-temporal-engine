import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { addDays, addMonths, createDate, dayOfWeek, daysInMonth, fromAbsoluteDay, isLeapYear, parseDate, toAbsoluteDay } from "../src/core.js";
import { absoluteDayToJulianCalendar, gregorianToJulianCalendar, julianCalendarToAbsoluteDay, julianCalendarToGregorian, toJulianDayNumber, fromJulianDayNumber } from "../src/julian.js";
import { dayOfYear, fromOrdinalDate, toOrdinalDate } from "../src/ordinal.js";
import { fromISOWeekDate, toISOWeekDate, weeksInISOYear } from "../src/week.js";
import { generateMonthGrid, generateYear, monthGridSignature } from "../src/grid.js";
import { areCalendarYearsEquivalent, calendarFingerprint, explainDate, findEquivalentCalendarYears, generateCalendarTestVectors } from "../src/analysis.js";
import { defineHolidayCalendar, holidaysForCalendar, usFederalHolidays } from "../src/holidays.js";
import { holidaysToCSV, monthGridToCSV } from "../src/export.js";

describe("civil date kernel", () => {
  it("validates strictly and documents month overflow", () => {
    expect(() => createDate(2027, 2, 30)).toThrow(/valid Gregorian civil date/);
    expect(isLeapYear(1900)).toBe(false); expect(isLeapYear(2000)).toBe(true); expect(isLeapYear(2100)).toBe(false);
    expect(addMonths(createDate(2024, 1, 31), 1, { overflow: "constrain" })).toEqual(createDate(2024, 2, 29));
    expect(() => addMonths(createDate(2024, 1, 31), 1)).toThrow(/overflow/);
  });
  it("uses Rata Die with Gregorian 0001-01-01 as day 1", () => {
    expect(toAbsoluteDay(createDate(1, 1, 1))).toBe(1);
    expect(fromAbsoluteDay(1)).toEqual(createDate(1, 1, 1));
    expect(fromAbsoluteDay(toAbsoluteDay(createDate(2000, 2, 29)))).toEqual(createDate(2000, 2, 29));
    expect(dayOfWeek(createDate(2027, 1, 1))).toBe(5);
  });
  it("round-trips more than ten thousand generated Gregorian days", () => {
    const max = toAbsoluteDay(createDate(9999, 12, 31));
    fc.assert(fc.property(fc.integer({ min: 1, max }), n => { expect(toAbsoluteDay(fromAbsoluteDay(n))).toBe(n); }), { numRuns: 12000 });
  });
  it("supports strict ISO parsing and bounded day arithmetic", () => {
    expect(parseDate("2027-07-04")).toEqual(createDate(2027, 7, 4));
    expect(() => parseDate("2027-2-04")).toThrow();
    expect(addDays(createDate(2027, 12, 31), 1)).toEqual(createDate(2028, 1, 1));
  });
});

describe("coordinate conversions", () => {
  it("round-trips 10,000 ordinal and ISO week dates", () => {
    fc.assert(fc.property(fc.integer({ min: 2, max: 9998 }), fc.integer({ min: 1, max: 12 }), fc.integer({ min: 1, max: 28 }), (year, month, day) => {
      const date = createDate(year, month, Math.min(day, daysInMonth(year, month)));
      expect(fromOrdinalDate(toOrdinalDate(date))).toEqual(date);
      expect(fromISOWeekDate(toISOWeekDate(date))).toEqual(date);
      return true;
    }), { numRuns: 10000 });
    expect(dayOfYear(createDate(2027, 12, 31))).toBe(365);
    expect(weeksInISOYear(2020)).toBe(53);
    expect(toISOWeekDate(createDate(2027, 1, 1))).toEqual({ weekYear: 2026, week: 53, weekday: 5 });
  });
  it("round-trips Julian calendar conversions and keeps JDN separate", () => {
    const dates = [createDate(1900, 2, 28), createDate(2000, 2, 29), createDate(2027, 1, 1), createDate(2100, 3, 1)];
    for (const date of dates) expect(julianCalendarToGregorian(gregorianToJulianCalendar(date))).toEqual(date);
    expect(toJulianDayNumber(createDate(2000, 1, 1))).toBe(2451545);
    expect(fromJulianDayNumber(2451545)).toEqual(createDate(2000, 1, 1));
    fc.assert(fc.property(fc.integer({ min: 100, max: 9999 }), fc.integer({ min: 1, max: 12 }), fc.integer({ min: 1, max: 28 }), (year, month, day) => {
      const date = createDate(year, month, Math.min(day, daysInMonth(year, month)));
      expect(julianCalendarToGregorian(gregorianToJulianCalendar(date))).toEqual(date);
      return true;
    }), { numRuns: 12000 });
    fc.assert(fc.property(fc.integer({ min: 100, max: 9998 }), fc.integer({ min: 1, max: 12 }), fc.integer({ min: 1, max: 28 }), (year, month, day) => {
      const julian = gregorianToJulianCalendar(createDate(year, month, Math.min(day, daysInMonth(year, month))));
      expect(absoluteDayToJulianCalendar(julianCalendarToAbsoluteDay(julian))).toEqual(julian);
      return true;
    }), { numRuns: 10000 });
  });
});

describe("grids and diagnostics", () => {
  it("generates 2027 grids and stable structural signatures", () => {
    const jan = generateMonthGrid({ year: 2027, month: 1, weekStartsOn: "sunday", fixedWeeks: 6, includeAdjacentDays: true, includeWeekNumbers: true });
    expect(jan.weekCount).toBe(6); expect(jan.cells[0]?.[5]?.actualDate).toEqual(createDate(2027, 1, 1));
    expect(jan.weekNumbers).toHaveLength(6);
    expect(monthGridSignature({ year: 2027, month: 1, weekStartsOn: "sunday" })).toBe(monthGridSignature({ year: 2027, month: 1, weekStartsOn: 7 }));
    const year = generateYear(2027);
    expect(year.months).toHaveLength(12); expect(year.monthStartWeekdays).toEqual([5, 1, 1, 4, 6, 2, 4, 7, 3, 5, 1, 3]);
  });
  it("matches complete calendar structures, not just leap status", () => {
    expect(areCalendarYearsEquivalent(2027, 2038)).toBe(true);
    expect(areCalendarYearsEquivalent(2027, 2028)).toBe(false);
    expect(findEquivalentCalendarYears(2027, { from: 2027, to: 2038 })).toEqual([2027, 2038]);
    expect(calendarFingerprint(2027)).toContain("C|5|");
  });
  it("provides explain output and usable test vectors", () => {
    expect(explainDate("2027-01-01").gregorian).toEqual(createDate(2027, 1, 1));
    expect(generateCalendarTestVectors({ startYear: 2027, endYear: 2027 }).length).toBeGreaterThan(20);
  });
});

describe("holiday DSL and export", () => {
  it("matches OPM's 2027 federal holiday schedule", () => {
    const output = usFederalHolidays(2027).map(h => `${h.name}|${h.observedDate.year}-${String(h.observedDate.month).padStart(2, "0")}-${String(h.observedDate.day).padStart(2, "0")}`);
    expect(output).toEqual([
      "New Year's Day|2027-01-01", "Birthday of Martin Luther King, Jr.|2027-01-18", "Washington's Birthday|2027-02-15",
      "Memorial Day|2027-05-31", "Juneteenth National Independence Day|2027-06-18", "Independence Day|2027-07-05",
      "Labor Day|2027-09-06", "Columbus Day|2027-10-11", "Veterans Day|2027-11-11", "Thanksgiving Day|2027-11-25", "Christmas Day|2027-12-24",
    ]);
  });
  it("validates custom holiday definitions and outputs CRLF CSV", () => {
    const calendar = defineHolidayCalendar({ id: "sample", rules: [{ id: "launch", name: "Launch day", rule: { type: "fixed-date", month: 3, day: 14 }, observe: false }] });
    expect(holidaysForCalendar(2027, calendar)[0]?.date).toEqual(createDate(2027, 3, 14));
    expect(monthGridToCSV({ year: 2027, month: 1 }).startsWith("date,weekday,")).toBe(true);
    expect(holidaysToCSV(2027)).toContain("\r\n");
  });
});
