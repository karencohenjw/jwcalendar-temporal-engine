import { formatDate } from "./core.js";
import { generateMonthGrid, type MonthGrid } from "./grid.js";
import { usFederalHolidays } from "./holidays.js";
import { explainYear } from "./analysis.js";

export function calendarToJSON(year: number, options: { readonly includeMonths?: boolean } = {}): string {
  return JSON.stringify(explainYear(year, { includeMonths: options.includeMonths ?? true }), null, 2);
}
function csv(value: string | number | boolean): string {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}
export function monthGridToCSV(gridOrOptions: MonthGrid | { readonly year: number; readonly month: number; readonly weekStartsOn?: "monday" | "sunday" }): string {
  const grid = "cells" in gridOrOptions ? gridOrOptions : generateMonthGrid({ ...gridOrOptions, includeAdjacentDays: true });
  const lines = ["date,weekday,iso_week_year,iso_week,in_current_month,is_weekend,row,column"];
  for (const row of grid.cells) for (const cell of row) lines.push([cell.actualDate, cell.dayOfWeek, cell.isoWeekYear, cell.isoWeek, cell.inCurrentMonth, cell.isWeekend, cell.row, cell.column].map((value, i) => csv(i === 0 ? formatDate(value as typeof cell.actualDate) : value as string | number | boolean)).join(","));
  return `${lines.join("\r\n")}\r\n`;
}
export function holidaysToCSV(year: number): string {
  const lines = ["id,name,date,observed_date"];
  for (const holiday of usFederalHolidays(year)) lines.push([holiday.id, holiday.name, formatDate(holiday.date), formatDate(holiday.observedDate)].map(csv).join(","));
  return `${lines.join("\r\n")}\r\n`;
}
