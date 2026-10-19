import { describe, it, expect } from "vitest";
import { calculate, macros, mifflinStJeor } from "./calculations";
describe("calculadoras", () => {
  const x = {
    weightKg: 80,
    heightCm: 180,
    ageYears: 30,
    sex: "male" as const,
    activityFactor: 1.55,
  };
  it("Mifflin-St Jeor", () => expect(mifflinStJeor(x)).toBe(1780));
  it("GET", () => expect(calculate(x).total).toBeCloseTo(2759));
  it("macros suman calorías", () => {
    const m = macros(2759, 80, 1.6, 0.9);
    expect(m.proteinG * 4 + m.fatG * 9 + m.carbsG * 4).toBeCloseTo(2759);
  });
  it("rechaza entradas inválidas", () =>
    expect(() => calculate({ ...x, weightKg: 0 })).toThrow());
});
describe("regresiones y límites", () => {
  const x = {
    weightKg: 80,
    heightCm: 180,
    ageYears: 30,
    sex: "male" as const,
    activityFactor: 1.55,
  };
  it("ecuación femenina conserva constante -161", () =>
    expect(mifflinStJeor({ ...x, sex: "female" })).toBe(1614));
  it("IMC original", () => expect(calculate(x).bmi).toBeCloseTo(24.691358));
  it.each([NaN, Infinity, -1, 0, 401])("rechaza peso %s", (weightKg) =>
    expect(() => calculate({ ...x, weightKg })).toThrow(),
  );
  it.each([17, 30.5, 121, Infinity])("rechaza edad %s", (ageYears) =>
    expect(() => calculate({ ...x, ageYears })).toThrow(),
  );
  it("rechaza sexo desconocido", () =>
    expect(() => calculate({ ...x, sex: "unknown" as any })).toThrow());
  it("rechaza factor imposible", () =>
    expect(() => calculate({ ...x, activityFactor: 100 })).toThrow());
  it("rechaza parámetros macro negativos", () =>
    expect(() => macros(2000, 80, -1, 0.9)).toThrow());
  it("rechaza exceso de energía asignada", () =>
    expect(() => macros(100, 80, 2, 1)).toThrow());
  it("rechaza overflow de macros", () =>
    expect(() => macros(2000, Number.MAX_VALUE, 2, 1)).toThrow());
});
