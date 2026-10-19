import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  LocalDatabase,
  saveStudent,
  saveAssessment,
  exportBackup,
  importBackup,
  parseBackup,
  deleteStudent,
  seedExamples,
  localDate,
  type Student,
  type Assessment,
} from "./storage";
let db: LocalDatabase;
const now = "2026-01-01T12:00:00.000Z";
const s: Student = {
  id: "student-1",
  name: "Persona Ficticia",
  sport: "Fútbol",
  goal: "Mantenimiento",
  notes: "Prueba",
  createdAt: now,
  updatedAt: now,
};
const a: Assessment = {
  id: "assessment-1",
  studentId: s.id,
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
  notes: "Prueba",
  formula: "mifflin-st-jeor-v1",
  createdAt: now,
};
beforeEach(() => {
  db = new LocalDatabase(`test-${crypto.randomUUID()}`);
});
afterEach(async () => {
  vi.restoreAllMocks();
  await db.delete();
});
describe("almacenamiento local y respaldo", () => {
  it("alta, lectura, edición y borrado en cascada", async () => {
    await saveStudent(s, db);
    await saveAssessment(a, db);
    await saveStudent({ ...s, name: "Nombre editado" }, db);
    expect((await db.students.get(s.id))?.name).toBe("Nombre editado");
    await deleteStudent(s.id, db);
    expect(await db.students.count()).toBe(0);
    expect(await db.assessments.count()).toBe(0);
  });
  it("persiste tras cerrar y abrir la conexión", async () => {
    await saveStudent(s, db);
    db.close();
    await db.open();
    expect(await db.students.get(s.id)).toEqual(s);
  });
  it("rechaza alumno inválido y evaluación huérfana", async () => {
    await expect(saveStudent({ ...s, name: " " }, db)).rejects.toThrow();
    await expect(saveAssessment(a, db)).rejects.toThrow();
    expect(await db.assessments.count()).toBe(0);
  });
  it("roundtrip completo con reemplazo", async () => {
    await saveStudent(s, db);
    await saveAssessment(a, db);
    const backup = await exportBackup(db);
    await saveStudent({ ...s, id: "extra" }, db);
    await importBackup(JSON.stringify(backup), db);
    expect(await db.students.toArray()).toEqual([s]);
    expect(await db.assessments.toArray()).toEqual([a]);
  });
  it("no siembra ejemplos automáticamente y la carga es idempotente", async () => {
    expect(await db.students.count()).toBe(0);
    await seedExamples(db);
    await seedExamples(db);
    expect(await db.students.count()).toBe(1);
    expect(await db.assessments.count()).toBe(1);
  });
  it("revierte todos los borrados si falla la restauración", async () => {
    await saveStudent(s, db);
    await saveAssessment(a, db);
    const backup = JSON.stringify(await exportBackup(db));
    vi.spyOn(db.assessments, "bulkAdd").mockRejectedValueOnce(
      new Error("Cuota excedida"),
    );
    await expect(importBackup(backup, db)).rejects.toThrow();
    expect(await db.students.toArray()).toEqual([s]);
    expect(await db.assessments.toArray()).toEqual([a]);
  });
  it.each(["{", "null", "[]", '{"app":"otra"}'])(
    "rechaza JSON inválido sin tocar datos: %s",
    async (text) => {
      await saveStudent(s, db);
      await expect(importBackup(text, db)).rejects.toThrow();
      expect(await db.students.count()).toBe(1);
    },
  );
  it.each([
    (b: any) => (b.version = 2),
    (b: any) => b.students.push(s),
    (b: any) => b.assessments.push(a),
    (b: any) => (b.assessments[0].studentId = "missing"),
    (b: any) => (b.assessments[0].date = "2026-02-30"),
    (b: any) => (b.assessments[0].date = "2999-01-01"),
    (b: any) => (b.assessments[0].inputs.sex = "unknown"),
    (b: any) => (b.assessments[0].inputs.weightKg = "80"),
    (b: any) => (b.assessments[0].protein = -1),
    (b: any) => (b.assessments[0].fat = 6),
    (b: any) => (b.assessments[0].formula = "unverified"),
    (b: any) => (b.students[0].notes = "x".repeat(2001)),
    (b: any) => (b.students[0].createdAt = "invalid"),
    (b: any) => (b.students[0].surprise = true),
    (b: any) => (b.students[0].id = "../unsafe"),
  ])("rechaza estructura, relaciones y mediciones inválidas #%#", (mutate) => {
    const backup = {
      app: "nutrisport-pro",
      version: 1,
      exportedAt: now,
      students: [structuredClone(s)],
      assessments: [structuredClone(a)],
    };
    mutate(backup);
    expect(() => parseBackup(JSON.stringify(backup))).toThrow();
  });
  it("rechaza archivos superiores a 5 MB", () => {
    expect(() => parseBackup(" ".repeat(5_000_001))).toThrow();
  });
  it("fecha local válida", () =>
    expect(localDate()).toMatch(/^\d{4}-\d{2}-\d{2}$/));
});
