import { describe, expect, it } from "vitest";
import { approxAreaHa, toGeoJSON } from "./utils";

describe("geometry helpers", () => {
  it("approximates a ~1 ha square", () => {
    const d = 0.0000899; // ~10 m in degrees latitude
    const pts: [number, number][] = [[13, 77], [13 + 10 * d, 77], [13 + 10 * d, 77 + 10 * d / Math.cos(13 * Math.PI / 180)], [13, 77 + 10 * d / Math.cos(13 * Math.PI / 180)]];
    expect(approxAreaHa(pts)).toBeGreaterThan(0.9);
    expect(approxAreaHa(pts)).toBeLessThan(1.1);
  });
  it("returns 0 for fewer than 3 points", () => expect(approxAreaHa([[1, 1], [2, 2]])).toBe(0));
  it("closes the GeoJSON ring in lon/lat order", () => {
    const g: any = toGeoJSON([[13, 77], [13, 78], [14, 78]]);
    expect(g.coordinates[0][0]).toEqual([77, 13]);
    expect(g.coordinates[0].at(-1)).toEqual([77, 13]);
  });
});
