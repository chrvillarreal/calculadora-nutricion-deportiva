export type Sex = "male" | "female";
export type Inputs = {
  weightKg: number;
  heightCm: number;
  ageYears: number;
  sex: Sex;
  activityFactor: number;
};
export function validateInputs(x: Inputs): void {
  if (
    !x ||
    ![x.weightKg, x.heightCm, x.ageYears, x.activityFactor].every(
      Number.isFinite,
    ) ||
    x.weightKg < 20 ||
    x.weightKg > 400 ||
    x.heightCm < 100 ||
    x.heightCm > 250 ||
    !Number.isInteger(x.ageYears) ||
    x.ageYears < 18 ||
    x.ageYears > 120 ||
    !["male", "female"].includes(x.sex) ||
    x.activityFactor < 1 ||
    x.activityFactor > 2.5
  )
    throw new Error(
      "Revisá los datos: peso 20–400 kg, altura 100–250 cm, edad entera 18–120 años y factor 1–2,5. Uso exclusivo para adultos.",
    );
}
export function mifflinStJeor(x: Inputs): number {
  validateInputs(x);
  const basal =
    10 * x.weightKg +
    6.25 * x.heightCm -
    5 * x.ageYears +
    (x.sex === "male" ? 5 : -161);
  if (!Number.isFinite(basal) || basal <= 0)
    throw new Error(
      "La combinación de datos no produce una estimación basal válida.",
    );
  return basal;
}
export function calculate(x: Inputs) {
  const basal = mifflinStJeor(x);
  return {
    bmi: x.weightKg / (x.heightCm / 100) ** 2,
    basal,
    total: basal * x.activityFactor,
  };
}
export function macros(
  energyKcal: number,
  weightKg: number,
  proteinGPerKg: number,
  fatGPerKg: number,
) {
  if (
    ![energyKcal, weightKg, proteinGPerKg, fatGPerKg].every(Number.isFinite) ||
    energyKcal <= 0 ||
    weightKg <= 0 ||
    proteinGPerKg < 0 ||
    fatGPerKg < 0
  )
    throw new Error("Parámetros inválidos");
  const proteinG = weightKg * proteinGPerKg,
    fatG = weightKg * fatGPerKg;
  const carbsG = (energyKcal - 4 * proteinG - 9 * fatG) / 4;
  if (![proteinG, fatG, carbsG].every(Number.isFinite))
    throw new Error("El cálculo excede los límites numéricos.");
  if (carbsG < 0)
    throw new Error("Proteínas y grasas superan el objetivo energético.");
  return { proteinG, fatG, carbsG };
}
