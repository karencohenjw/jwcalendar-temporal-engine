import { createServer, type Server, type ServerResponse } from "node:http";
import { createDate, dayOfWeek, daysInMonth, formatDate, isLeapYear, parseDate } from "./core.js";
import { dayOfYear } from "./ordinal.js";
import { toISOWeekDate } from "./week.js";

const SERVICE_NAME = "jwcalendar-temporal-engine";
const VERSION = process.env["APP_VERSION"] ?? "0.2.0";
const MONTH_NAMES = ["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"] as const;
const DAY_NAMES = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;

function sendJson(response: ServerResponse, statusCode: number, body: unknown): void {
  const payload = JSON.stringify(body);
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(payload),
    "cache-control": statusCode === 200 ? "public, max-age=300" : "no-store",
    "x-content-type-options": "nosniff",
    "referrer-policy": "no-referrer",
  });
  response.end(payload);
}

function monthPayload(year: number, month: number): Record<string, unknown> {
  const first = createDate(year, month, 1);
  const last = createDate(year, month, daysInMonth(year, month));
  const monthLength = daysInMonth(year, month);
  const leadingEmptyCells = dayOfWeek(first) - 1;
  const weekCount = Math.ceil((leadingEmptyCells + monthLength) / 7);
  const weeks = Array.from({ length: weekCount }, (_, row) => Array.from({ length: 7 }, (_, column) => {
    const day = row * 7 + column - leadingEmptyCells + 1;
    return day >= 1 && day <= monthLength ? formatDate(createDate(year, month, day)) : null;
  }));
  return {
    year,
    month,
    monthName: MONTH_NAMES[month] ?? "Unknown",
    daysInMonth: monthLength,
    firstDayOfWeek: dayOfWeek(first),
    firstDayOfWeekName: DAY_NAMES[dayOfWeek(first)],
    lastDayOfWeek: dayOfWeek(last),
    lastDayOfWeekName: DAY_NAMES[dayOfWeek(last)],
    weekStartsOn: "Monday",
    weeks,
  };
}

function datePayload(dateText: string): Record<string, unknown> {
  const date = parseDate(dateText);
  const iso = toISOWeekDate(date);
  return {
    date: formatDate(date),
    year: date.year,
    month: date.month,
    day: date.day,
    dayOfWeek: dayOfWeek(date),
    dayOfWeekName: DAY_NAMES[dayOfWeek(date)],
    dayOfYear: dayOfYear(date),
    isoWeek: iso.week,
    isoWeekYear: iso.weekYear,
    isLeapYear: isLeapYear(date.year),
  };
}

export function createTemporalApiServer(): Server {
  return createServer((request, response) => {
    if (request.method !== "GET") {
      response.setHeader("allow", "GET");
      sendJson(response, 405, { error: "method_not_allowed", message: "Only GET requests are supported." });
      return;
    }

    let pathname: string;
    try {
      pathname = new URL(request.url ?? "/", "http://localhost").pathname;
    } catch {
      sendJson(response, 400, { error: "invalid_request", message: "The request URL is invalid." });
      return;
    }

    try {
      if (pathname === "/health") {
        sendJson(response, 200, { status: "ok", service: SERVICE_NAME, version: VERSION });
        return;
      }

      const datePath = /^\/v1\/date\/(.*)$/.exec(pathname);
      if (datePath) {
        sendJson(response, 200, datePayload(datePath[1] ?? ""));
        return;
      }

      const isoWeekPath = /^\/v1\/iso-week\/(.*)$/.exec(pathname);
      if (isoWeekPath) {
        const date = parseDate(isoWeekPath[1] ?? "");
        const iso = toISOWeekDate(date);
        sendJson(response, 200, {
          date: formatDate(date),
          isoWeek: iso.week,
          isoWeekYear: iso.weekYear,
          isoWeekDay: iso.weekday,
        });
        return;
      }

      const monthPath = /^\/v1\/calendar\/month\/([^/]+)\/([^/]+)$/.exec(pathname);
      if (monthPath) {
        const yearText = monthPath[1] ?? "";
        const monthText = monthPath[2] ?? "";
        if (!/^[1-9]\d{0,3}$/.test(yearText) || !/^(?:[1-9]|1[0-2])$/.test(monthText)) {
          throw new RangeError("year must be 1–9999 and month must be 1–12");
        }
        sendJson(response, 200, monthPayload(Number(yearText), Number(monthText)));
        return;
      }

      const yearPath = /^\/v1\/calendar\/year\/([^/]+)$/.exec(pathname);
      if (yearPath) {
        const yearText = yearPath[1] ?? "";
        if (!/^[1-9]\d{0,3}$/.test(yearText)) throw new RangeError("year must be from 1 through 9999");
        const year = Number(yearText);
        const months = Array.from({ length: 12 }, (_, index) => monthPayload(year, index + 1));
        sendJson(response, 200, {
          year,
          daysInYear: isLeapYear(year) ? 366 : 365,
          isLeapYear: isLeapYear(year),
          months,
        });
        return;
      }

      const leapYearPath = /^\/v1\/leap-year\/([^/]+)$/.exec(pathname);
      if (leapYearPath) {
        const yearText = leapYearPath[1] ?? "";
        if (!/^[1-9]\d{0,3}$/.test(yearText)) throw new RangeError("year must be from 1 through 9999");
        const year = Number(yearText);
        const leap = isLeapYear(year);
        sendJson(response, 200, { year, isLeapYear: leap, daysInYear: leap ? 366 : 365 });
        return;
      }

      sendJson(response, 404, { error: "not_found", message: "No API route matches this path." });
    } catch (error) {
      if (error instanceof RangeError) {
        sendJson(response, 400, { error: "invalid_date_or_range", message: error.message });
        return;
      }
      sendJson(response, 500, { error: "internal_error", message: "The request could not be completed." });
    }
  });
}

export function startTemporalApiServer(): Server {
  const port = Number(process.env["PORT"] ?? "8080");
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new RangeError("PORT must be an integer from 1 through 65535");
  const host = process.env["HOST"] ?? "0.0.0.0";
  const server = createTemporalApiServer();
  server.listen(port, host, () => console.log(`JW Calendar Temporal Engine listening on ${host}:${port} (version ${VERSION})`));
  return server;
}
