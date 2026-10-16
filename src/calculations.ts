export type Sex = 'male' | 'female';
export type Inputs = { weightKg: number; heightCm: number; ageYears: number; sex: Sex; activityFactor: number };
export function validateInputs(x: Inputs): void {
  if (![x.weightKg,x.heightCm,x.ageYears,x.activityFactor].every(Number.isFinite) || x.weightKg <= 0 || x.heightCm <= 0 || x.ageYears < 18 || x.activityFactor <= 0 || !['male', 'female'].includes(x.sex)) throw new Error('Ingresá valores válidos. Esta versión utiliza ecuaciones para adultos.');
}
export function mifflinStJeor(x: Inputs): number {
  validateInputs(x);
  const basal = 10*x.weightKg + 6.25*x.heightCm - 5*x.ageYears + (x.sex === 'male' ? 5 : -161);
  if (!Number.isFinite(basal) || basal <= 0) throw new Error('Los datos no permiten obtener un metabolismo basal positivo y finito.');
  return basal;
}
export function calculate(x: Inputs) {
  const basal = mifflinStJeor(x);
  const bmi = x.weightKg / (x.heightCm/100)**2;
  const total = basal*x.activityFactor;
  if (![bmi, total].every(value => Number.isFinite(value) && value > 0)) throw new Error('Los datos exceden el rango de cálculo. Revisá las unidades y los valores.');
  return { bmi, basal, total };
}
export function macros(energyKcal:number, weightKg:number, proteinGPerKg:number, fatGPerKg:number) {
  if (![energyKcal,weightKg,proteinGPerKg,fatGPerKg].every(Number.isFinite) || energyKcal<=0 || weightKg<=0 || proteinGPerKg<0 || fatGPerKg<0) throw new Error('Parámetros inválidos');
  const proteinG=weightKg*proteinGPerKg, fatG=weightKg*fatGPerKg;
  const carbsG=(energyKcal-4*proteinG-9*fatG)/4;
  if (![proteinG, fatG, carbsG].every(Number.isFinite)) throw new Error('Los parámetros exceden el rango de cálculo.');
  if (carbsG<0) throw new Error('Proteínas y grasas superan el objetivo energético.');
  return {proteinG,fatG,carbsG};
}
