import {
  macros,
  mifflinStJeor,
  validateInputs,
  type Inputs,
} from "./calculations";
export const methods = {
  "mifflin-st-jeor-v1": {
    name: "Mifflin-St Jeor (1990)",
    source: "https://pubmed.ncbi.nlm.nih.gov/2305711/",
    description:
      "Peso, altura, edad y constante por sexo. Estimación de reposo para adultos.",
  },
  "harris-benedict-1984-v1": {
    name: "Harris-Benedict revisada (1984)",
    source: "https://pubmed.ncbi.nlm.nih.gov/6741850/",
    description:
      "Revisión de Roza y Shizgal. No es la ecuación original de 1919.",
  },
  "cunningham-1980-v1": {
    name: "Cunningham (1980)",
    source: "https://pubmed.ncbi.nlm.nih.gov/7435418/",
    description:
      "500 + 22 × masa magra (kg). Depende de la calidad de su estimación; no es la versión 1991.",
  },
} as const;
export type Method = keyof typeof methods;
export const methodKeys = Object.keys(methods) as Method[];
export type Plan = {
  mode: "gkg" | "percent";
  protein: number;
  fat: number;
  adjustmentPercent: number;
  meals: number;
};
export type EvaluationDraft = {
  inputs: Inputs;
  formula: Method;
  leanMassKg: number | null;
  plan: Plan;
};
export const defaultPlan: Plan = {
  mode: "gkg",
  protein: 1.6,
  fat: 0.9,
  adjustmentPercent: 0,
  meals: 4,
};
export function estimate(
  inputs: Inputs,
  method: Method,
  leanMassKg: number | null = null,
) {
  validateInputs(inputs);
  if (!Object.hasOwn(methods, method)) throw new Error("Método no reconocido.");
  if (
    leanMassKg !== null &&
    (!Number.isFinite(leanMassKg) ||
      leanMassKg <= 0 ||
      leanMassKg > inputs.weightKg)
  )
    throw new Error(
      "La masa magra debe ser mayor que cero y no superar el peso.",
    );
  let basal: number;
  if (method === "mifflin-st-jeor-v1") basal = mifflinStJeor(inputs);
  else if (method === "harris-benedict-1984-v1")
    basal =
      inputs.sex === "male"
        ? 88.362 +
          13.397 * inputs.weightKg +
          4.799 * inputs.heightCm -
          5.677 * inputs.ageYears
        : 447.593 +
          9.247 * inputs.weightKg +
          3.098 * inputs.heightCm -
          4.33 * inputs.ageYears;
  else {
    if (leanMassKg === null)
      throw new Error("Ingresá la masa magra para utilizar Cunningham.");
    basal = 500 + 22 * leanMassKg;
  }
  if (!Number.isFinite(basal) || basal <= 0)
    throw new Error("Los datos no producen una estimación válida.");
  return {
    bmi: inputs.weightKg / (inputs.heightCm / 100) ** 2,
    basal,
    total: basal * inputs.activityFactor,
  };
}
export function planMacros(total: number, weightKg: number, plan: Plan) {
  if (
    !plan ||
    !["gkg", "percent"].includes(plan.mode) ||
    ![
      total,
      weightKg,
      plan.protein,
      plan.fat,
      plan.adjustmentPercent,
      plan.meals,
    ].every(Number.isFinite) ||
    total <= 0 ||
    weightKg <= 0 ||
    plan.protein < 0 ||
    plan.fat < 0 ||
    plan.adjustmentPercent < -30 ||
    plan.adjustmentPercent > 30 ||
    !Number.isInteger(plan.meals) ||
    plan.meals < 1 ||
    plan.meals > 8
  )
    throw new Error(
      "Revisá el plan: ajuste de -30 a +30 %, 1–8 comidas y macros no negativos.",
    );
  if (plan.mode === "gkg" && (plan.protein > 5 || plan.fat > 5))
    throw new Error("El plan admite 0–5 g/kg de proteína y grasa.");
  if (
    plan.mode === "percent" &&
    (plan.protein > 100 || plan.fat > 100 || plan.protein + plan.fat > 100)
  )
    throw new Error(
      "Los porcentajes de proteína y grasa no pueden superar 100 % en conjunto.",
    );
  const target = total * (1 + plan.adjustmentPercent / 100);
  const m =
    plan.mode === "gkg"
      ? macros(target, weightKg, plan.protein, plan.fat)
      : {
          proteinG: (target * plan.protein) / 400,
          fatG: (target * plan.fat) / 900,
          carbsG: (target * (100 - plan.protein - plan.fat)) / 400,
        };
  if (![target, m.proteinG, m.fatG, m.carbsG].every(Number.isFinite))
    throw new Error("El cálculo excede los límites numéricos.");
  return {
    ...m,
    target,
    proteinPercent: (m.proteinG * 400) / target,
    fatPercent: (m.fatG * 900) / target,
    carbsPercent: (m.carbsG * 400) / target,
    proteinPerKg: m.proteinG / weightKg,
    fatPerKg: m.fatG / weightKg,
    carbsPerKg: m.carbsG / weightKg,
    perMeal: {
      energy: target / plan.meals,
      proteinG: m.proteinG / plan.meals,
      fatG: m.fatG / plan.meals,
      carbsG: m.carbsG / plan.meals,
    },
  };
}
export function comparison(inputs: Inputs, leanMassKg: number | null) {
  return methodKeys.map((method) => {
    try {
      return {
        method,
        result: estimate(inputs, method, leanMassKg),
        error: null,
      };
    } catch (e) {
      return {
        method,
        result: null,
        error: e instanceof Error ? e.message : "Datos inválidos",
      };
    }
  });
}
export function formulaText(
  inputs: Inputs,
  method: Method,
  leanMassKg: number | null,
) {
  const { weightKg: w, heightCm: h, ageYears: a, sex } = inputs;
  if (method === "mifflin-st-jeor-v1")
    return `10 × ${w} + 6,25 × ${h} - 5 × ${a} ${sex === "male" ? "+ 5" : "- 161"}`;
  if (method === "harris-benedict-1984-v1")
    return sex === "male"
      ? `88,362 + 13,397 × ${w} + 4,799 × ${h} - 5,677 × ${a}`
      : `447,593 + 9,247 × ${w} + 3,098 × ${h} - 4,330 × ${a}`;
  return `500 + 22 × ${leanMassKg}`;
}
