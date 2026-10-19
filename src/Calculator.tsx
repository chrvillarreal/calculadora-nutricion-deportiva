import { useState } from "react";
import { type Inputs } from "./calculations";
import {
  methods,
  methodKeys,
  estimate,
  comparison,
  defaultPlan,
  planMacros,
  formulaText,
  type Method,
  type Plan,
  type EvaluationDraft,
} from "./planning";
const num = (n: number) =>
  n.toLocaleString("es-AR", { maximumFractionDigits: 1 });
export function Calculator({
  onSave,
  busy = false,
}: {
  onSave?: (draft: EvaluationDraft) => void;
  busy?: boolean;
}) {
  const [data, setData] = useState<Inputs>({
    weightKg: 80,
    heightCm: 180,
    ageYears: 30,
    sex: "male",
    activityFactor: 1.55,
  });
  const [formula, setFormula] = useState<Method>("mifflin-st-jeor-v1"),
    [lean, setLean] = useState(""),
    [plan, setPlan] = useState<Plan>({ ...defaultPlan });
  const set = (key: keyof Inputs, value: string) =>
    setData((p) => ({ ...p, [key]: key === "sex" ? value : Number(value) }));
  const setP = (key: keyof Plan, value: string) =>
    setPlan((p) => ({ ...p, [key]: Number(value) }));
  const leanMassKg = lean === "" ? null : Number(lean);
  let result: ReturnType<typeof estimate> | undefined,
    macro: ReturnType<typeof planMacros> | undefined,
    error = "";
  try {
    result = estimate(data, formula, leanMassKg);
    macro = planMacros(result.total, data.weightKg, plan);
  } catch (e) {
    error = e instanceof Error ? e.message : "Error de cálculo";
  }
  const compared = comparison(data, leanMassKg);
  const ref = compared[0].result?.total;
  return (
    <div>
      <section className="panel">
        <h2>Calculadora energética</h2>
        <p className="muted">
          Estimaciones para adultos. Los valores iniciales son editables y no
          constituyen una recomendación individual.
        </p>
        <div className="grid">
          <label>
            Peso (kg)
            <input
              type="number"
              min="20"
              max="400"
              step="0.1"
              value={data.weightKg}
              onChange={(e) => set("weightKg", e.target.value)}
            />
          </label>
          <label>
            Altura (cm)
            <input
              type="number"
              min="100"
              max="250"
              step="0.1"
              value={data.heightCm}
              onChange={(e) => set("heightCm", e.target.value)}
            />
          </label>
          <label>
            Edad (años)
            <input
              type="number"
              min="18"
              max="120"
              step="1"
              value={data.ageYears}
              onChange={(e) => set("ageYears", e.target.value)}
            />
          </label>
          <label>
            Sexo utilizado por la ecuación
            <select
              value={data.sex}
              onChange={(e) => set("sex", e.target.value)}
            >
              <option value="male">Masculino</option>
              <option value="female">Femenino</option>
            </select>
          </label>
          <label>
            Factor de actividad
            <select
              value={data.activityFactor}
              onChange={(e) => set("activityFactor", e.target.value)}
            >
              {[1.2, 1.375, 1.55, 1.725, 1.9].map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label>
            Método energético
            <select
              value={formula}
              onChange={(e) => setFormula(e.target.value as Method)}
            >
              {methodKeys.map((k) => (
                <option key={k} value={k}>
                  {methods[k].name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Masa magra (kg, opcional)
            <input
              type="number"
              min="0.1"
              max={data.weightKg}
              step="0.1"
              value={lean}
              onChange={(e) => setLean(e.target.value)}
              placeholder="Necesaria para Cunningham"
            />
          </label>
        </div>
        <p className="muted">
          {methods[formula].description} El factor incluye la actividad diaria y
          el entrenamiento; no se suman calorías de ejercicio adicionales. La
          masa magra debe provenir de una evaluación válida; registrá su método
          en las notas de evaluación.
        </p>
        <details>
          <summary>Comparar métodos con los mismos datos</summary>
          <div className="table-wrap">
            <table>
              <caption>
                Estimaciones, sin promedio ni selección automática
              </caption>
              <thead>
                <tr>
                  <th>Método</th>
                  <th>Reposo (kcal/día)</th>
                  <th>GET (kcal/día)</th>
                  <th>Diferencia vs. Mifflin</th>
                </tr>
              </thead>
              <tbody>
                {compared.map((c) => (
                  <tr key={c.method}>
                    <th scope="row">{methods[c.method].name}</th>
                    {c.result ? (
                      <>
                        <td>{num(c.result.basal)}</td>
                        <td>{num(c.result.total)}</td>
                        <td>
                          {ref
                            ? `${num((c.result.total / ref - 1) * 100)} %`
                            : "—"}
                        </td>
                      </>
                    ) : (
                      <td colSpan={3}>{c.error}</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="muted">
            La diferencia entre ecuaciones no es un intervalo de confianza.
            Compararlas no determina cuál predice mejor a esta persona.
          </p>
        </details>
      </section>
      <section className="panel">
        <h2>Planificación de macronutrientes</h2>
        <div className="grid">
          <label>
            Ajuste energético (%)
            <input
              type="number"
              min="-30"
              max="30"
              step="1"
              value={plan.adjustmentPercent}
              onChange={(e) => setP("adjustmentPercent", e.target.value)}
            />
          </label>
          <label>
            Modo de planificación
            <select
              value={plan.mode}
              onChange={(e) =>
                setPlan((p) => ({
                  ...p,
                  mode: e.target.value as Plan["mode"],
                  protein: e.target.value === "gkg" ? 1.6 : 25,
                  fat: e.target.value === "gkg" ? 0.9 : 30,
                }))
              }
            >
              <option value="gkg">Gramos por kg</option>
              <option value="percent">Porcentaje de energía</option>
            </select>
          </label>
          <label>
            {plan.mode === "gkg"
              ? "Proteína (g/kg)"
              : "Proteína (% energético)"}
            <input
              type="number"
              min="0"
              max={plan.mode === "gkg" ? 5 : 100}
              step="0.1"
              value={plan.protein}
              onChange={(e) => setP("protein", e.target.value)}
            />
          </label>
          <label>
            {plan.mode === "gkg" ? "Grasas (g/kg)" : "Grasas (% energético)"}
            <input
              type="number"
              min="0"
              max={plan.mode === "gkg" ? 5 : 100}
              step="0.1"
              value={plan.fat}
              onChange={(e) => setP("fat", e.target.value)}
            />
          </label>
          <label>
            Comidas por día
            <input
              type="number"
              min="1"
              max="8"
              step="1"
              value={plan.meals}
              onChange={(e) => setP("meals", e.target.value)}
            />
          </label>
        </div>
        <p className="muted">
          0 % mantiene el GET estimado; un valor negativo reduce el objetivo y
          uno positivo lo aumenta. El ajuste y los macros se deciden con
          evaluación profesional. Carbohidratos completan la energía restante.
        </p>
      </section>
      {error ? (
        <section role="alert" className="panel error">
          {error}
        </section>
      ) : result && macro ? (
        <section className="panel">
          <h2>Resultados estimados</h2>
          <div className="metrics">
            <article>
              <small>IMC</small>
              <strong>{num(result.bmi)}</strong>
              <small>kg/m²</small>
            </article>
            <article>
              <small>Gasto en reposo</small>
              <strong>{num(result.basal)}</strong>
              <small>kcal/día</small>
            </article>
            <article>
              <small>Gasto total</small>
              <strong>{num(result.total)}</strong>
              <small>kcal/día</small>
            </article>
          </div>
          <div className="notice">
            <b>Objetivo energético: {num(macro.target)} kcal/día</b>
            <p>
              GET × (1 + {plan.adjustmentPercent}/100). El objetivo es distinto
              de la estimación de gasto cuando hay un ajuste.
            </p>
          </div>
          <h2>Macronutrientes diarios</h2>
          <div className="metrics">
            {(
              [
                ["Proteínas", "protein"],
                ["Grasas", "fat"],
                ["Carbohidratos", "carbs"],
              ] as const
            ).map(([label, k]) => (
              <article key={k}>
                <small>{label}</small>
                <strong>{num(macro[`${k}G`])}</strong>
                <small>
                  g/día · {num(macro[`${k}PerKg`])} g/kg ·{" "}
                  {num(macro[`${k}Percent`])} %
                </small>
              </article>
            ))}
          </div>
          <p>
            Distribución equivalente por comida ({plan.meals}):{" "}
            {num(macro.perMeal.energy)} kcal, {num(macro.perMeal.proteinG)} g de
            proteína, {num(macro.perMeal.fatG)} g de grasa y{" "}
            {num(macro.perMeal.carbsG)} g de carbohidratos.
          </p>
          <p className="muted">
            Es una división aritmética, no una indicación de timing ni un menú.
            Energía: 4/9/4 kcal/g. IMC no mide composición corporal.
          </p>
          <details>
            <summary>Ver resolución y fuente</summary>
            <p>
              {formulaText(data, formula, leanMassKg)} = {num(result.basal)}{" "}
              kcal/día. GET = {num(result.basal)} × {data.activityFactor} ={" "}
              {num(result.total)} kcal/día. Se conserva precisión completa hasta
              presentar el resultado.
            </p>
            <a href={methods[formula].source} target="_blank" rel="noreferrer">
              Fuente primaria · {methods[formula].name}
            </a>
          </details>
          <div className="actions">
            {onSave && (
              <button
                disabled={busy}
                onClick={() =>
                  onSave({
                    inputs: { ...data },
                    formula,
                    leanMassKg,
                    plan: { ...plan },
                  })
                }
              >
                Guardar evaluación
              </button>
            )}
            <button className="secondary" onClick={() => window.print()}>
              Imprimir / guardar PDF
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
