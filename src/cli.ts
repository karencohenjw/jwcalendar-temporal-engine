#!/usr/bin/env node
import { formatDate, parseDate } from "./core.js";
import { generateMonthGrid, generateYear } from "./grid.js";
import { usFederalHolidays } from "./holidays.js";
import { explainDate, findEquivalentCalendarYears, scanBoundaryCases } from "./analysis.js";
import { toOrdinalDate } from "./ordinal.js";
import { toISOWeekDate } from "./week.js";
import { gregorianToJulianCalendar } from "./julian.js";

const args = process.argv.slice(2);
function usage(): void {
  process.stdout.write(`jwcal — timezone-free civil calendar tools\n\nUsage:\n  jwcal month YEAR MONTH [--week-start monday|sunday] [--json]\n  jwcal year YEAR [--json]\n  jwcal ordinal YYYY-MM-DD\n  jwcal iso-week YYYY-MM-DD\n  jwcal julian YYYY-MM-DD\n  jwcal holidays YEAR --region us-federal\n  jwcal explain YYYY-MM-DD\n  jwcal boundaries YEAR\n  jwcal equivalent-years YEAR --from YEAR --to YEAR\n  jwcal --version\n`);
}
function option(name: string, fallback?: string): string | undefined { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : fallback; }
function print(value: unknown, json: boolean): void { process.stdout.write(json || typeof value !== "string" ? `${JSON.stringify(value, null, 2)}\n` : `${value}\n`); }
try {
  if (args.includes("--help") || args.length === 0) { usage(); }
  else if (args.includes("--version")) { process.stdout.write("0.1.0\n"); }
  else {
    const json = args.includes("--json"), command = args[0];
    if (command === "month") {
      const year = Number(args[1]), month = Number(args[2]), weekStartsOn = option("--week-start", "monday");
      const grid = generateMonthGrid({ year, month, weekStartsOn: weekStartsOn === "sunday" ? "sunday" : "monday", includeAdjacentDays: true, includeWeekNumbers: true });
      if (json) print(grid, true);
      else {
        const headings = weekStartsOn === "sunday" ? ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
        process.stdout.write(`${headings.join(" ")}\n`);
        for (const row of grid.cells) process.stdout.write(`${row.map(cell => String(cell.inCurrentMonth ? cell.actualDate.day : "").padStart(3, " ")).join(" ")}\n`);
      }
    } else if (command === "year") print(generateYear(Number(args[1]), { includeAdjacentDays: true, includeWeekNumbers: true }), json);
    else if (command === "ordinal") print(toOrdinalDate(parseDate(args[1] ?? "")), json);
    else if (command === "iso-week") print(toISOWeekDate(parseDate(args[1] ?? "")), json);
    else if (command === "julian") print(gregorianToJulianCalendar(parseDate(args[1] ?? "")), json);
    else if (command === "holidays") {
      if (option("--region") !== "us-federal") throw new Error("supported region is --region us-federal");
      print(usFederalHolidays(Number(args[1])), json);
    } else if (command === "explain") print(explainDate(args[1] ?? ""), json);
    else if (command === "boundaries") print(scanBoundaryCases(Number(args[1])).map(formatDate), json);
    else if (command === "equivalent-years") print(findEquivalentCalendarYears(Number(args[1]), { from: Number(option("--from")), to: Number(option("--to")) }), json);
    else throw new Error(`unknown command: ${String(command)}`);
  }
} catch (error) {
  process.stderr.write(`jwcal: ${error instanceof Error ? error.message : String(error)}\nRun "jwcal --help" for usage.\n`);
  process.exitCode = 1;
}
