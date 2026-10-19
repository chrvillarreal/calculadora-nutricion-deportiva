import "fake-indexeddb/auto";
import { describe, it, expect } from "vitest";
import {
  LocalDatabase,
  parseBackup,
  importBackup,
  exportBackup,
  validateAssessment,
  type LegacyAssessment,
  type PlannedAssessment,
} from "./storage";
import { assessmentResults, chronological } from "./assessmentResults";
import { defaultPlan } from "./planning";
const timestamp = "2026-01-01T12:00:00.000Z";
const student = {
  id: "one",
  name: "Ficticio",
  sport: "",
  goal: "",
  notes: "",
  createdAt: timestamp,
  updatedAt: timestamp,
};
const legacy: LegacyAssessment = {
  id: "legacy",
  studentId: "one",
  date: "2026-01-01",
  inputs: {
    weightKg: 80,
    heightCm: 180,
    ageYears: 30,
    sex: "male",
    activityFactor: 1.55,
  },
  protein: 1.6,
  fat: 0.9,
  notes: "",
  formula: "mifflin-st-jeor-v1",
  createdAt: timestamp,
};
const modern: PlannedAssessment = {
  id: "modern",
  studentId: "one",
  date: "2026-01-01",
  inputs: { ...legacy.inputs },
  notes: "",
  schemaVersion: 2,
  formula: "cunningham-1980-v1",
  leanMassKg: 64,
  plan: { ...defaultPlan, adjustmentPercent: -10 },
  createdAt: timestamp,
};
const backup = (version: number, assessments: unknown[]) =>
  JSON.stringify({
    app: "nutrisport-pro",
    version,
    exportedAt: timestamp,
    students: [student],
    assessments,
  });
describe("compatibilidad histórica", () => {
  it("importa v1 sin reescribir el registro ni cambiar resultados", () => {
    const p = parseBackup(backup(1, [legacy]));
    expect(p.assessments[0]).toEqual(legacy);
    const r = assessmentResults(p.assessments[0]);
    expect(r.energy.total).toBe(2759);
    expect(r.macro.carbsG).toBe(399.75);
  });
  it("respaldo v2 admite registros v1 y v2 juntos", () => {
    const p = parseBackup(backup(2, [legacy, modern]));
    expect(p.assessments).toEqual([legacy, modern]);
    expect(assessmentResults(p.assessments[1]).macro.target).toBeCloseTo(
      2661.66,
      6,
    );
  });
  it("import/export no altera registros originales", async () => {
    const db = new LocalDatabase(`compat-${crypto.randomUUID()}`);
    try {
      await importBackup(backup(2, [legacy, modern]), db);
      const b = await exportBackup(db);
      expect(b.version).toBe(2);
      expect(b.assessments).toEqual([legacy, modern]);
    } finally {
      await db.delete();
    }
  });
  it("no permite etiquetar registros nuevos como backup v1", () =>
    expect(() => parseBackup(backup(1, [modern]))).toThrow());
  it("no acepta datos de planificación ocultos en registro legacy", () =>
    expect(() =>
      validateAssessment({ ...legacy, plan: modern.plan }),
    ).toThrow());
  it.each([
    { schemaVersion: 3 },
    { formula: "unknown" },
    { leanMassKg: null },
    { leanMassKg: 100 },
    { plan: { ...defaultPlan, meals: 0 } },
    { plan: { ...defaultPlan, extra: 1 } },
  ])("rechaza v2 inválido %#", (changes) =>
    expect(() => validateAssessment({ ...modern, ...changes })).toThrow(),
  );
  it("ordena mismo día por timestamp, sin mutar original", () => {
    const earlier = {
      ...legacy,
      id: "earlier",
      createdAt: "2026-01-01T08:00:00.000Z",
    };
    const list = [legacy, earlier];
    expect(chronological(list).map((a) => a.id)).toEqual(["earlier", "legacy"]);
    expect(list[0].id).toBe("legacy");
  });
});
