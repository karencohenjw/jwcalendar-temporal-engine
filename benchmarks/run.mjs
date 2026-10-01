import { performance } from "node:perf_hooks";
import { generateMonthGrid, generateYear, gregorianToJulianCalendar, createDate, toISOWeekDate, usFederalHolidays } from "../dist/index.js";

function measure(label, count, fn) {
  const start = performance.now();
  for (let i = 0; i < count; i++) fn(i);
  const elapsed = performance.now() - start;
  process.stdout.write(`${label}: ${count} operations in ${elapsed.toFixed(2)} ms (${(elapsed / count).toFixed(5)} ms/op)\n`);
}
measure("month grids", 10_000, i => generateMonthGrid({ year: 2000 + (i % 8000), month: i % 12 + 1, weekStartsOn: "monday" }));
measure("Gregorian to Julian", 100_000, i => gregorianToJulianCalendar(createDate(1 + (i % 9999), i % 12 + 1, i % 28 + 1)));
measure("ISO week conversion", 100_000, i => toISOWeekDate(createDate(1 + (i % 9999), i % 12 + 1, i % 28 + 1)));
measure("federal holiday years", 1_000, i => usFederalHolidays(1900 + i));
measure("year grids", 100, i => generateYear(1900 + i));
