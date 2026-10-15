import { describe, expect, it } from "vitest";
import { limaDayRange, todayInLima } from "../use-cases/lima-day";

describe("lima-day", () => {
  it("antes de las 5 a. m. UTC todavía es el día anterior en Lima", () => {
    expect(todayInLima(new Date("2026-10-15T04:59:59Z"))).toBe("2026-10-14");
    expect(todayInLima(new Date("2026-10-15T05:00:00Z"))).toBe("2026-10-15");
  });

  it("el día de Lima va de 05:00 UTC a 05:00 UTC del día siguiente", () => {
    expect(limaDayRange("2026-10-15")).toEqual({
      from: new Date("2026-10-15T05:00:00Z"),
      to: new Date("2026-10-16T05:00:00Z"),
    });
  });
});
