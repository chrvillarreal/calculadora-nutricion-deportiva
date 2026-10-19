import { useId, useState } from "react";
import { type Student, type Assessment } from "./storage";
import { assessmentResults, chronological } from "./assessmentResults";
const fmt = (n: number) =>
  n.toLocaleString("es-AR", { maximumFractionDigits: 1 });
export function FollowUp({
  student,
  items,
}: {
  student?: Student;
  items: Assessment[];
}) {
  const [from, setFrom] = useState(""),
    [to, setTo] = useState(""),
    [metric, setMetric] = useState<"weight" | "total" | "target">("weight");
  const titleId = useId();
  const all = chronological(items);
  const selected = all.filter(
    (a) => (!from || a.date >= from) && (!to || a.date <= to),
  );
  const daily = [...new Map(selected.map((a) => [a.date, a])).values()];
  const values = daily.map((a) =>
    metric === "weight"
      ? a.inputs.weightKg
      : metric === "total"
        ? assessmentResults(a).energy.total
        : assessmentResults(a).macro.target,
  );
  const unit = metric === "weight" ? "kg" : "kcal/día";
  const min = Math.min(...values),
    max = Math.max(...values),
    padding = max === min ? Math.max(1, min * 0.02) : (max - min) * 0.15;
  const low = min - padding,
    high = max + padding;
  const first = daily[0],
    last = daily.at(-1);
  const firstTime = first ? Date.parse(first.date) : 0,
    lastTime = last ? Date.parse(last.date) : 0;
  const points = values.map((v, i) => ({
    x:
      lastTime === firstTime
        ? 180
        : 50 +
          ((Date.parse(daily[i].date) - firstTime) / (lastTime - firstTime)) *
            280,
    y: 160 - ((v - low) / (high - low)) * 130,
  }));
  return (
    <>
      <div className="grid">
        <label>
          Desde
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </label>
        <label>
          Hasta
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </label>
        <label>
          Variable del gráfico
          <select
            value={metric}
            onChange={(e) => setMetric(e.target.value as typeof metric)}
          >
            <option value="weight">Peso (kg)</option>
            <option value="total">GET (kcal/día)</option>
            <option value="target">Objetivo (kcal/día)</option>
          </select>
        </label>
      </div>
      {from && to && from > to ? (
        <p role="alert" className="notice error">
          La fecha Desde no puede ser posterior a Hasta.
        </p>
      ) : !student || !selected.length ? (
        <p>
          Seleccioná un alumno con evaluaciones en el período para ver su
          seguimiento.
        </p>
      ) : (
        <>
          <figure className="trend">
            <figcaption id={titleId}>
              {student.name} ·{" "}
              {metric === "weight"
                ? "Peso"
                : metric === "total"
                  ? "Gasto total estimado"
                  : "Objetivo energético"}{" "}
              ({unit})
            </figcaption>
            <svg viewBox="0 0 360 200" role="img" aria-labelledby={titleId}>
              <title>Evolución de {daily.length} días con registros</title>
              <desc>
                Último registro de cada día. La tabla siguiente incluye todas
                las evaluaciones. Eje vertical de {fmt(low)} a {fmt(high)}{" "}
                {unit}.
              </desc>
              <line x1="50" y1="30" x2="50" y2="160" stroke="#91aaa1" />
              <line x1="50" y1="160" x2="330" y2="160" stroke="#91aaa1" />
              <text x="44" y="34" textAnchor="end" fontSize="10" fill="#38534a">
                {fmt(high)}
              </text>
              <text
                x="44"
                y="162"
                textAnchor="end"
                fontSize="10"
                fill="#38534a"
              >
                {fmt(low)}
              </text>
              {points.length > 1 && (
                <polyline
                  fill="none"
                  stroke="#116951"
                  strokeWidth="2.5"
                  points={points.map((p) => `${p.x},${p.y}`).join(" ")}
                />
              )}{" "}
              {points.map((p, i) => (
                <circle
                  key={daily[i].id}
                  cx={p.x}
                  cy={p.y}
                  r="4"
                  fill="#116951"
                >
                  <title>
                    {daily[i].date}: {fmt(values[i])} {unit}
                  </title>
                </circle>
              ))}
              <text x="50" y="185" fontSize="10" fill="#38534a">
                {first.date}
              </text>
              {daily.length > 1 && (
                <text
                  x="330"
                  y="185"
                  textAnchor="end"
                  fontSize="10"
                  fill="#38534a"
                >
                  {last!.date}
                </text>
              )}
            </svg>
          </figure>
          <p className="muted">
            Escala vertical ajustada a los datos, no parte necesariamente de
            cero. Última evaluación de cada día; sin interpolar días faltantes.{" "}
            {daily.length === 1
              ? "Hace falta otro día con registros para observar una tendencia."
              : `Cambio de peso entre primer y último día del período: ${fmt(last!.inputs.weightKg - first.inputs.weightKg)} kg.`}
          </p>
          {new Set(selected.map((a) => a.formula)).size > 1 && (
            <p className="notice">
              En este período hay métodos energéticos distintos. Los cambios de
              GET pueden deberse al método y no a cambios de la persona.
            </p>
          )}
          <div className="table-wrap">
            <table>
              <caption>
                {student.name} · {selected.length} evaluaciones del período
              </caption>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Peso (kg)</th>
                  <th>Método</th>
                  <th>GET (kcal/día)</th>
                  <th>Objetivo (kcal/día)</th>
                  <th>Cambio de peso (kg)</th>
                </tr>
              </thead>
              <tbody>
                {selected.map((a, i) => {
                  const r = assessmentResults(a);
                  return (
                    <tr key={a.id}>
                      <td>{a.date}</td>
                      <td>{fmt(a.inputs.weightKg)}</td>
                      <td>{r.method.name}</td>
                      <td>{fmt(r.energy.total)}</td>
                      <td>{fmt(r.macro.target)}</td>
                      <td>
                        {i
                          ? fmt(
                              a.inputs.weightKg -
                                selected[i - 1].inputs.weightKg,
                            )
                          : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
