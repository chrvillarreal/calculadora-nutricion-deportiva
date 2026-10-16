import { describe, expect, it } from 'vitest';
import { calculate, macros, mifflinStJeor, type Inputs } from './calculations';

const adult: Inputs = { weightKg: 80, heightCm: 180, ageYears: 30, sex: 'male', activityFactor: 1.55 };
describe('precisión, unidades y límites aritméticos', () => {
  it('Mifflin-St Jeor femenino, IMC en kg/m² y GET en kcal/día', () => {
    const result = calculate({ ...adult, sex: 'female' });
    expect(result.basal).toBe(1614);
    expect(result.total).toBeCloseTo(2501.7, 8);
    expect(result.bmi).toBeCloseTo(80 / 1.8 ** 2, 12);
  });
  it('no redondea los resultados internos de macronutrientes', () => {
    expect(macros(2759, 80, 1.6, 0.9)).toEqual({ proteinG: 128, fatG: 72, carbsG: 399.75 });
  });
  it('permite cero carbohidratos pero rechaza un balance energético negativo', () => {
    expect(macros(1160, 80, 1.6, 0.9).carbsG).toBe(0);
    expect(() => macros(1159, 80, 1.6, 0.9)).toThrow('superan');
  });
  it.each([
    { ...adult, sex: 'unknown' as Inputs['sex'] },
    { ...adult, ageYears: 17 },
    { ...adult, weightKg: Infinity },
    { ...adult, heightCm: NaN },
    { ...adult, activityFactor: 0 },
    { ...adult, weightKg: Number.MAX_VALUE },
    { ...adult, ageYears: 10000 },
    { ...adult, heightCm: Number.MIN_VALUE },
    { ...adult, activityFactor: Number.MAX_VALUE },
  ])('rechaza entradas inválidas, desbordamientos y resultados no físicos %#', input => {
    expect(() => calculate(input)).toThrow();
  });
  it('mifflinStJeor tampoco expone un resultado basal inválido directamente', () => {
    expect(() => mifflinStJeor({ ...adult, weightKg: Number.MAX_VALUE })).toThrow();
  });
  it('rechaza desbordamientos de macros aunque todos los parámetros sean finitos', () => {
    expect(() => macros(2000, Number.MAX_VALUE, 2, 0)).toThrow('rango');
  });
});
