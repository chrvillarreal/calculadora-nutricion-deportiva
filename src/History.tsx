import { calculate, macros } from "./calculations";
import { type Student, type Assessment } from "./storage";
const format = (n: number) =>
  n.toLocaleString("es-AR", { maximumFractionDigits: 1 });
export function History({
  items,
  students,
  onDelete,
}: {
  items: Assessment[];
  students: Student[];
  onDelete?: (id: string) => void;
}) {
  return items.length ? (
    <div className="history">
      {items.map((a) => {
        const r = calculate(a.inputs),
          m = macros(r.total, a.inputs.weightKg, a.protein, a.fat);
        return (
          <article className="panel" key={a.id}>
            <div className="section-heading">
              <h3>
                {a.date.split("-").reverse().join("/")} ·{" "}
                {students.find((s) => s.id === a.studentId)?.name}
              </h3>
              {onDelete && (
                <button className="danger" onClick={() => onDelete(a.id)}>
                  Eliminar evaluación
                </button>
              )}
            </div>
            <div className="metrics">
              <article>
                <small>Peso</small>
                <strong>{format(a.inputs.weightKg)}</strong>
                <small>kg</small>
              </article>
              <article>
                <small>Gasto estimado</small>
                <strong>{format(r.total)}</strong>
                <small>kcal/día</small>
              </article>
              <article>
                <small>IMC</small>
                <strong>{format(r.bmi)}</strong>
                <small>kg/m²</small>
              </article>
            </div>
            <details>
              <summary>Ver datos y cálculo reproducible</summary>
              <p>
                Mifflin-St Jeor v1: 10 × {a.inputs.weightKg} + 6,25 ×{" "}
                {a.inputs.heightCm} − 5 × {a.inputs.ageYears}{" "}
                {a.inputs.sex === "male" ? "+ 5" : "− 161"} = {format(r.basal)}{" "}
                kcal/día. GET = {format(r.basal)} × {a.inputs.activityFactor} ={" "}
                {format(r.total)} kcal/día.
              </p>
              <p>
                Proteínas: {a.protein} g/kg → {format(m.proteinG)} g; grasas:{" "}
                {a.fat} g/kg → {format(m.fatG)} g; carbohidratos por diferencia:{" "}
                {format(m.carbsG)} g. Energía: 4/9/4 kcal/g.
              </p>
              <p className="preserve">{a.notes || "Sin notas."}</p>
              <small>
                Registro: {new Date(a.createdAt).toLocaleString("es-AR")}
              </small>
            </details>
          </article>
        );
      })}
    </div>
  ) : (
    <div className="panel empty">
      <h2>Todavía no hay evaluaciones</h2>
      <p>Guardá una evaluación para empezar el historial.</p>
    </div>
  );
}
