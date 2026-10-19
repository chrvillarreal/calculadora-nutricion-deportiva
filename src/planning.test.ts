import { describe, it, expect } from "vitest";
import {
  estimate,
  planMacros,
  comparison,
  defaultPlan,
  type Plan,
} from "./planning";
const x = {
  weightKg: 80,
  heightCm: 180,
  ageYears: 30,
  sex: "male" as const,
  activityFactor: 1.55,
};
describe("métodos verificados", () => {
  it("conserva Mifflin 1990 y GET", () => {
    const r = estimate(x, "mifflin-st-jeor-v1");
    expect(r.basal).toBe(1780);
    expect(r.total).toBe(2759);
  });
  it("Roza-Shizgal masculino con kg/cm/años", () => {
    const r = estimate(x, "harris-benedict-1984-v1");
    expect(r.basal).toBeCloseTo(1853.632, 6);
    expect(r.total).toBeCloseTo(2873.1296, 6);
  });
  it("Roza-Shizgal femenino", () =>
    expect(
      estimate({ ...x, sex: "female" }, "harris-benedict-1984-v1").basal,
    ).toBeCloseTo(1615.093, 6));
  it("Cunningham 1980 con masa magra medida", () => {
    const r = estimate(x, "cunningham-1980-v1", 64);
    expect(r.basal).toBe(1908);
    expect(r.total).toBeCloseTo(2957.4, 6);
  });
  it.each([null, 0, -1, 81, Infinity, NaN])(
    "Cunningham rechaza masa magra %s",
    (lean) => expect(() => estimate(x, "cunningham-1980-v1", lean)).toThrow(),
  );
  it("no acepta método arbitrario", () =>
    expect(() => estimate(x, "unverified" as any)).toThrow());
  it("compara sin inventar masa magra ni promediar", () => {
    const c = comparison(x, null);
    expect(c.map((a) => a.result?.total)).toEqual([
      2759,
      2873.1296000000004,
      undefined,
    ]);
    expect(c[2].error).toContain("masa magra");
  });
});
describe("plan energético y macros", () => {
  it("0% conserva cálculo original", () => {
    const m = planMacros(2759, 80, defaultPlan);
    expect(m.target).toBe(2759);
    expect(m.proteinG).toBe(128);
    expect(m.fatG).toBe(72);
    expect(m.carbsG).toBe(399.75);
  });
  it("ajuste no cambia GET: macros calculados sobre objetivo", () => {
    const m = planMacros(2759, 80, { ...defaultPlan, adjustmentPercent: -10 });
    expect(m.target).toBeCloseTo(2483.1);
    expect(m.carbsG).toBeCloseTo(330.775);
  });
  it.each(["gkg", "percent"] as const)(
    "energía y comidas cierran en modo %s",
    (mode) => {
      const p = {
        ...defaultPlan,
        mode,
        protein: mode === "gkg" ? 1.6 : 25,
        fat: mode === "gkg" ? 0.9 : 30,
        adjustmentPercent: 10,
        meals: 5,
      };
      const m = planMacros(2759, 80, p);
      expect(4 * m.proteinG + 9 * m.fatG + 4 * m.carbsG).toBeCloseTo(
        m.target,
        8,
      );
      expect(m.perMeal.energy * 5).toBeCloseTo(m.target, 8);
      expect(m.perMeal.proteinG * 5).toBeCloseTo(m.proteinG, 8);
      expect(m.proteinPercent + m.fatPercent + m.carbsPercent).toBeCloseTo(
        100,
        8,
      );
    },
  );
  it("25/30/45% usa objetivo ajustado", () => {
    const m = planMacros(2759, 80, {
      mode: "percent",
      protein: 25,
      fat: 30,
      adjustmentPercent: -10,
      meals: 4,
    });
    expect(m.proteinG).toBeCloseTo(155.19375, 6);
    expect(m.fatG).toBeCloseTo(82.77, 6);
    expect(m.carbsG).toBeCloseTo(279.34875, 6);
  });
  it.each([
    { mode: "percent", protein: 80, fat: 30 },
    { mode: "gkg", protein: 6 },
    { adjustmentPercent: -31 },
    { adjustmentPercent: 31 },
    { meals: 0 },
    { meals: 9 },
    { meals: 2.5 },
    { protein: NaN },
    { fat: -1 },
    { mode: "other" },
  ])("rechaza plan inválido %#", (p) =>
    expect(() =>
      planMacros(2759, 80, { ...defaultPlan, ...p } as Plan),
    ).toThrow(),
  );
  it("rechaza macros que exceden presupuesto tras déficit", () =>
    expect(() =>
      planMacros(1000, 80, { ...defaultPlan, adjustmentPercent: -30 }),
    ).toThrow());
});
