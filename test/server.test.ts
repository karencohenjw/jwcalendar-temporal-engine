import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTemporalApiServer } from "../src/server.js";

const server = createTemporalApiServer();
let baseUrl = "";

beforeAll(async () => {
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("test server did not bind to a TCP port");
  baseUrl = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

async function getJson(path: string): Promise<{ response: Response; body: Record<string, unknown> }> {
  const response = await fetch(`${baseUrl}${path}`);
  return { response, body: await response.json() as Record<string, unknown> };
}

describe("temporal HTTP API", () => {
  it("reports service health and version", async () => {
    const { response, body } = await getJson("/health");
    expect(response.status).toBe(200);
    expect(body).toMatchObject({ status: "ok", service: "jwcalendar-temporal-engine", version: process.env["APP_VERSION"] ?? "development" });
  });

  it("returns date metadata without timestamp conversion", async () => {
    const { response, body } = await getJson("/v1/date/2027-01-01");
    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      date: "2027-01-01", year: 2027, month: 1, day: 1, dayOfWeek: 5,
      dayOfWeekName: "Friday", dayOfYear: 1, isoWeek: 53, isoWeekYear: 2026, isLeapYear: false,
    });
  });

  it("returns month grids with null cells outside the month", async () => {
    const { response, body } = await getJson("/v1/calendar/month/2028/2");
    expect(response.status).toBe(200);
    expect(body).toMatchObject({ year: 2028, month: 2, monthName: "February", daysInMonth: 29, firstDayOfWeek: 2, lastDayOfWeek: 2, weekStartsOn: "Monday" });
    expect(body.weeks).toHaveLength(5);
    expect((body.weeks as unknown[][])[0]).toEqual([null, "2028-02-01", "2028-02-02", "2028-02-03", "2028-02-04", "2028-02-05", "2028-02-06"]);
  });

  it("returns all twelve month grids for a year", async () => {
    const { response, body } = await getJson("/v1/calendar/year/2027");
    expect(response.status).toBe(200);
    expect(body).toMatchObject({ year: 2027, daysInYear: 365, isLeapYear: false });
    expect(body.months).toHaveLength(12);
  });

  it("keeps month grids valid at the supported Gregorian range edges", async () => {
    const first = await getJson("/v1/calendar/month/1/1");
    expect(first.response.status).toBe(200);
    expect((first.body.weeks as unknown[][])[0]?.[0]).toBe("0001-01-01");
    const last = await getJson("/v1/calendar/month/9999/12");
    expect(last.response.status).toBe(200);
    const weeks = last.body.weeks as Array<Array<string | null>>;
    expect(weeks.flat().filter(Boolean).at(-1)).toBe("9999-12-31");
  });

  it("handles Gregorian leap-year century rules", async () => {
    const cases: Array<[number, boolean, number]> = [[2000, true, 366], [1900, false, 365], [2024, true, 366], [2027, false, 365], [2028, true, 366]];
    for (const [year, leap, days] of cases) {
      const { response, body } = await getJson(`/v1/leap-year/${year}`);
      expect(response.status).toBe(200);
      expect(body).toEqual({ year, isLeapYear: leap, daysInYear: days });
    }
  });

  it("keeps ISO week-year boundaries correct", async () => {
    const cases: Array<[string, number, number, number]> = [
      ["2026-12-31", 2026, 53, 4],
      ["2027-01-01", 2026, 53, 5],
      ["2027-12-31", 2027, 52, 5],
      ["2028-01-01", 2027, 52, 6],
      ["2028-02-29", 2028, 9, 2],
    ];
    for (const [date, isoWeekYear, isoWeek, isoWeekDay] of cases) {
      const { response, body } = await getJson(`/v1/iso-week/${date}`);
      expect(response.status).toBe(200);
      expect(body).toEqual({ date, isoWeekYear, isoWeek, isoWeekDay });
    }
  });

  it("rejects impossible dates and invalid month/year ranges", async () => {
    for (const path of ["/v1/date/2027-02-29", "/v1/date/2027-2-01", "/v1/iso-week/2028-02-30", "/v1/calendar/month/2027/13", "/v1/calendar/year/0", "/v1/leap-year/10000"]) {
      const { response, body } = await getJson(path);
      expect(response.status, path).toBe(400);
      expect(body.error).toBe("invalid_date_or_range");
    }
  });

  it("rejects unsupported methods and unknown paths", async () => {
    const methodResponse = await fetch(`${baseUrl}/health`, { method: "POST" });
    expect(methodResponse.status).toBe(405);
    expect(methodResponse.headers.get("allow")).toBe("GET");
    const { response, body } = await getJson("/v2/date/2027-01-01");
    expect(response.status).toBe(404);
    expect(body.error).toBe("not_found");
  });
});
