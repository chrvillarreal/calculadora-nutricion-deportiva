export type Sex = 'male' | 'female';
export type Inputs = { weightKg: number; heightCm: number; ageYears: number; sex: Sex; activityFactor: number };
export function validateInputs(x: Inputs): void {
  if (![x.weightKg,x.heightCm,x.ageYears,x.activityFactor].every(Number.isFinite) || x.weightKg <= 0 || x.heightCm <= 0 || x.ageYears < 18 || x.activityFactor <= 0) throw new Error('Ingresá valores válidos. Esta versión utiliza ecuaciones para adultos.');
}
export function mifflinStJeor(x: Inputs): number {
  validateInputs(x);
  return 10*x.weightKg + 6.25*x.heightCm - 5*x.ageYears + (x.sex === 'male' ? 5 : -161);
}
export function calculate(x: Inputs) {
  const basal = mifflinStJeor(x);
  return { bmi: x.weightKg / (x.heightCm/100)**2, basal, total: basal*x.activityFactor };
}
export function macros(energyKcal:number, weightKg:number, proteinGPerKg:number, fatGPerKg:number) {
  if (![energyKcal,weightKg,proteinGPerKg,fatGPerKg].every(Number.isFinite) || energyKcal<=0 || weightKg<=0 || proteinGPerKg<0 || fatGPerKg<0) throw new Error('Parámetros inválidos');
  const proteinG=weightKg*proteinGPerKg, fatG=weightKg*fatGPerKg;
  const carbsG=(energyKcal-4*proteinG-9*fatG)/4;
  if (carbsG<0) throw new Error('Proteínas y grasas superan el objetivo energético.');
  return {proteinG,fatG,carbsG};
}
