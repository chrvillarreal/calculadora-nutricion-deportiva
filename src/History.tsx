import { useState } from "react";
import { assessmentResults } from "./assessmentResults";
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
  const [pdfBusy, setPdfBusy] = useState<string | null>(null),
    [pdfError, setPdfError] = useState("");
  async function pdf(a: Assessment) {
    setPdfBusy(a.id);
    setPdfError("");
    try {
      const student = students.find((s) => s.id === a.studentId);
      if (!student) throw new Error("Alumno no disponible");
      const { downloadReport } = await import("./report");
      await downloadReport(student, a, items);
    } catch {
      setPdfError(
        "No se pudo generar el informe. Revisá el almacenamiento disponible e intentá nuevamente.",
      );
    } finally {
      setPdfBusy(null);
    }
  }
  return items.length ? (
    <div className="history">
      {pdfError && (
        <p role="alert" className="notice error">
          {pdfError}
        </p>
      )}
      {items.map((a) => {
        const result = assessmentResults(a),
          r = result.energy,
          m = result.macro;
        return (
          <article className="panel" key={a.id}>
            <div className="section-heading">
              <h3>
                {a.date.split("-").reverse().join("/")} ·{" "}
                {students.find((s) => s.id === a.studentId)?.name}
              </h3>
              <div className="actions">
                <button
                  className="secondary"
                  disabled={pdfBusy !== null}
                  onClick={() => void pdf(a)}
                >
                  {pdfBusy === a.id
                    ? "Generando PDF…"
                    : "Descargar informe PDF"}
                </button>
                {onDelete && (
                  <button className="danger" onClick={() => onDelete(a.id)}>
                    Eliminar evaluación
                  </button>
                )}
              </div>
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
                {result.method.name} · {a.formula}: {result.expression} ={" "}
                {format(r.basal)} kcal/día. GET = {format(r.basal)} ×{" "}
                {a.inputs.activityFactor} = {format(r.total)} kcal/día.
              </p>
              <p>
                Objetivo: {format(m.target)} kcal/día. Ajuste:{" "}
                {result.plan.adjustmentPercent} %. Proteína:{" "}
                {format(m.proteinG)} g; grasas: {format(m.fatG)} g;
                carbohidratos: {format(m.carbsG)} g. Energía 4/9/4 kcal/g. Plan:{" "}
                {result.plan.mode === "gkg" ? "g/kg" : "% energético"};
                parámetros originales proteína {result.plan.protein}, grasa{" "}
                {result.plan.fat}.
              </p>
              <a href={result.method.source} target="_blank" rel="noreferrer">
                Fuente del método
              </a>
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
