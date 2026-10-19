import Dexie, { type EntityTable } from "dexie";
import { calculate, macros, type Inputs } from "./calculations";
import { estimate, planMacros, type Method, type Plan } from "./planning";
export type Student = {
  id: string;
  name: string;
  sport: string;
  goal: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
};
export type LegacyAssessment = {
  id: string;
  studentId: string;
  date: string;
  inputs: Inputs;
  protein: number;
  fat: number;
  notes: string;
  formula: "mifflin-st-jeor-v1";
  createdAt: string;
};
export type PlannedAssessment = Omit<
  LegacyAssessment,
  "formula" | "protein" | "fat"
> & {
  schemaVersion: 2;
  formula: Method;
  leanMassKg: number | null;
  plan: Plan;
};
export type Assessment = LegacyAssessment | PlannedAssessment;
export function isPlanned(a: Assessment): a is PlannedAssessment {
  return "schemaVersion" in a && a.schemaVersion === 2;
}
export type Backup = {
  app: "nutrisport-pro";
  version: 2;
  exportedAt: string;
  students: Student[];
  assessments: Assessment[];
};
export class LocalDatabase extends Dexie {
  students!: EntityTable<Student, "id">;
  assessments!: EntityTable<Assessment, "id">;
  constructor(name = "nutrisport-pro-local") {
    super(name);
    this.version(1).stores({
      students: "id,name,updatedAt",
      assessments: "id,studentId,date",
    });
  }
}
export const db = new LocalDatabase();
const invalid = () => {
  throw new Error(
    "Archivo o datos inválidos. No se modificó la información local.",
  );
};
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    return invalid();
  return value as Record<string, unknown>;
}
function keys(x: Record<string, unknown>, expected: string[]) {
  if (Object.keys(x).sort().join() !== [...expected].sort().join()) invalid();
}
function str(x: unknown, max: number, min = 0): string {
  if (typeof x !== "string" || x.length > max || x.trim().length < min)
    return invalid();
  return x;
}
function id(x: unknown): string {
  const s = str(x, 80, 1);
  if (!/^[a-zA-Z0-9-]+$/.test(s)) return invalid();
  return s;
}
function timestamp(x: unknown): string {
  const s = str(x, 24, 24);
  if (!Number.isFinite(Date.parse(s)) || new Date(s).toISOString() !== s)
    return invalid();
  return s;
}
export function validDate(x: unknown): string {
  const s = str(x, 10, 10);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(s) ||
    !Number.isFinite(Date.parse(s)) ||
    new Date(s).toISOString().slice(0, 10) !== s ||
    s < "1900-01-01" ||
    s > localDate()
  )
    return invalid();
  return s;
}
export function localDate() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function validateStudent(value: unknown): Student {
  const x = record(value);
  keys(x, ["id", "name", "sport", "goal", "notes", "createdAt", "updatedAt"]);
  return {
    id: id(x.id),
    name: str(x.name, 120, 2).trim(),
    sport: str(x.sport, 120).trim(),
    goal: str(x.goal, 200).trim(),
    notes: str(x.notes, 2000).trim(),
    createdAt: timestamp(x.createdAt),
    updatedAt: timestamp(x.updatedAt),
  };
}
export function validateAssessment(value: unknown): Assessment {
  const x = record(value);
  const planned = x.schemaVersion === 2;
  const commonFields = [
    "id",
    "studentId",
    "date",
    "inputs",
    "notes",
    "formula",
    "createdAt",
  ];
  keys(
    x,
    planned
      ? [...commonFields, "schemaVersion", "leanMassKg", "plan"]
      : [...commonFields, "protein", "fat"],
  );
  const i = record(x.inputs);
  keys(i, ["weightKg", "heightCm", "ageYears", "sex", "activityFactor"]);
  const inputs = i as Inputs;
  const common = {
    id: id(x.id),
    studentId: id(x.studentId),
    date: validDate(x.date),
    inputs: { ...inputs },
    notes: str(x.notes, 2000).trim(),
    createdAt: timestamp(x.createdAt),
  };
  if (planned) {
    const p = record(x.plan);
    keys(p, ["mode", "protein", "fat", "adjustmentPercent", "meals"]);
    if (
      typeof x.formula !== "string" ||
      (x.leanMassKg !== null && typeof x.leanMassKg !== "number")
    )
      return invalid();
    const formula = x.formula as Method,
      leanMassKg = x.leanMassKg as number | null,
      plan = p as Plan;
    const r = estimate(inputs, formula, leanMassKg);
    planMacros(r.total, inputs.weightKg, plan);
    return {
      ...common,
      schemaVersion: 2,
      formula,
      leanMassKg,
      plan: { ...plan },
    };
  }
  const result = calculate(inputs);
  if (
    typeof x.protein !== "number" ||
    typeof x.fat !== "number" ||
    x.protein > 5 ||
    x.fat > 5 ||
    x.formula !== "mifflin-st-jeor-v1"
  )
    return invalid();
  macros(result.total, inputs.weightKg, x.protein, x.fat);
  return { ...common, protein: x.protein, fat: x.fat, formula: x.formula };
}

export function parseBackup(text: string): Backup {
  if (new Blob([text]).size > 5_000_000) return invalid();
  const x = record(JSON.parse(text));
  keys(x, ["app", "version", "exportedAt", "students", "assessments"]);
  if (
    x.app !== "nutrisport-pro" ||
    ![1, 2].includes(x.version as number) ||
    !Array.isArray(x.students) ||
    !Array.isArray(x.assessments) ||
    x.students.length > 5000 ||
    x.assessments.length > 20000
  )
    return invalid();
  const students = x.students.map(validateStudent),
    assessments = x.assessments.map(validateAssessment);
  if (x.version === 1 && assessments.some(isPlanned)) return invalid();
  const ids = new Set(students.map((s) => s.id));
  if (
    ids.size !== students.length ||
    new Set(assessments.map((a) => a.id)).size !== assessments.length ||
    assessments.some((a) => !ids.has(a.studentId))
  )
    return invalid();
  return {
    app: "nutrisport-pro",
    version: 2,
    exportedAt: timestamp(x.exportedAt),
    students,
    assessments,
  };
}
export async function exportBackup(database = db): Promise<Backup> {
  const backup: Backup = await database.transaction(
    "r",
    database.students,
    database.assessments,
    async () => ({
      app: "nutrisport-pro",
      version: 2,
      exportedAt: new Date().toISOString(),
      students: await database.students.toArray(),
      assessments: await database.assessments.toArray(),
    }),
  );
  try {
    parseBackup(JSON.stringify(backup));
  } catch {
    throw new Error(
      "No se pudo crear una copia importable. Revisá los límites de 5 MB, 5.000 alumnos y 20.000 evaluaciones y la integridad de los datos locales.",
    );
  }
  return backup;
}
export async function importBackup(text: string, database = db) {
  const backup = parseBackup(text);
  await database.transaction(
    "rw",
    database.students,
    database.assessments,
    async () => {
      await database.assessments.clear();
      await database.students.clear();
      await database.students.bulkAdd(backup.students);
      await database.assessments.bulkAdd(backup.assessments);
    },
  );
}
export async function saveStudent(student: Student, database = db) {
  await database.students.put(validateStudent(student));
}
export async function saveAssessment(assessment: Assessment, database = db) {
  const value = validateAssessment(assessment);
  await database.transaction(
    "rw",
    database.students,
    database.assessments,
    async () => {
      if (!(await database.students.get(value.studentId)))
        throw new Error("Seleccioná un alumno existente.");
      await database.assessments.add(value);
    },
  );
}
export async function deleteStudent(studentId: string, database = db) {
  await database.transaction(
    "rw",
    database.students,
    database.assessments,
    async () => {
      await database.assessments.where("studentId").equals(studentId).delete();
      await database.students.delete(studentId);
    },
  );
}
export async function seedExamples(database = db) {
  const now = new Date().toISOString();
  await database.transaction(
    "rw",
    database.students,
    database.assessments,
    async () => {
      if (await database.students.get("demo-alex")) return;
      await saveStudent(
        {
          id: "demo-alex",
          name: "Alex Ejemplo (ficticio)",
          sport: "Musculación",
          goal: "Mantenimiento",
          notes: "Ficha ficticia de prueba. Se puede eliminar.",
          createdAt: now,
          updatedAt: now,
        },
        database,
      );
      await saveAssessment(
        {
          id: "demo-eval-1",
          studentId: "demo-alex",
          date: localDate(),
          inputs: {
            weightKg: 80,
            heightCm: 180,
            ageYears: 30,
            sex: "male",
            activityFactor: 1.55,
          },
          protein: 1.6,
          fat: 0.9,
          notes: "Evaluación ficticia de prueba.",
          formula: "mifflin-st-jeor-v1",
          createdAt: now,
        },
        database,
      );
    },
  );
}
