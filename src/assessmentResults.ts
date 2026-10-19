import { calculate, macros } from "./calculations";
import {
  estimate,
  planMacros,
  methods,
  formulaText,
  type Plan,
} from "./planning";
import { isPlanned, type Assessment } from "./storage";
export function assessmentResults(a: Assessment) {
  const plan: Plan = isPlanned(a)
    ? a.plan
    : {
        mode: "gkg",
        protein: a.protein,
        fat: a.fat,
        adjustmentPercent: 0,
        meals: 1,
      };
  const leanMassKg = isPlanned(a) ? a.leanMassKg : null;
  const energy = isPlanned(a)
    ? estimate(a.inputs, a.formula, leanMassKg)
    : calculate(a.inputs);
  // Legacy results retain the original math, without imposing new plan limits.
  const raw = isPlanned(a)
    ? planMacros(energy.total, a.inputs.weightKg, plan)
    : {
        ...macros(energy.total, a.inputs.weightKg, a.protein, a.fat),
        target: energy.total,
      };
  return {
    energy,
    macro: raw,
    plan,
    leanMassKg,
    method: methods[a.formula],
    expression: formulaText(a.inputs, a.formula, leanMassKg),
  };
}
export function chronological(items: Assessment[]) {
  return [...items].sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      a.createdAt.localeCompare(b.createdAt) ||
      a.id.localeCompare(b.id),
  );
}
