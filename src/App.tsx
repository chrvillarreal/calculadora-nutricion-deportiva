import { StudentForm } from "./StudentForm";
import { History } from "./History";
import { useEffect, useState } from "react";
import { Calculator } from "./Calculator";
import { calculate, type Inputs } from "./calculations";
import {
  db,
  deleteStudent,
  exportBackup,
  importBackup,
  localDate,
  parseBackup,
  saveAssessment,
  saveStudent,
  seedExamples,
  type Student,
  type Assessment,
} from "./storage";
const pages = [
  "Inicio",
  "Alumnos",
  "Calculadoras",
  "Evaluaciones",
  "Seguimiento",
  "Configuración",
] as const;
type Page = (typeof pages)[number];
const format = (n: number) =>
  n.toLocaleString("es-AR", { maximumFractionDigits: 1 });
export function App() {
  const [page, setPage] = useState<Page>("Inicio"),
    [students, setStudents] = useState<Student[]>([]),
    [assessments, setAssessments] = useState<Assessment[]>([]);
  const [selected, setSelected] = useState(""),
    [search, setSearch] = useState(""),
    [editing, setEditing] = useState<Student | null | undefined>(undefined);
  const [date, setDate] = useState(localDate()),
    [notes, setNotes] = useState(""),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true),
    [storageReady, setStorageReady] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  const [pendingBackup, setPendingBackup] = useState<{
    text: string;
    students: number;
    assessments: number;
  } | null>(null);
  async function refresh() {
    const data = await db.transaction(
      "r",
      db.students,
      db.assessments,
      async () => ({
        students: await db.students.orderBy("name").toArray(),
        assessments: await db.assessments.orderBy("date").reverse().toArray(),
      }),
    );
    setStudents(data.students);
    setAssessments(data.assessments);
    setStorageReady(true);
  }
  useEffect(() => {
    refresh()
      .catch(() => {
        setError(
          "No se pudo abrir el almacenamiento local. Habilitá IndexedDB en tu navegador. Las calculadoras siguen disponibles.",
        );
        setStorageReady(false);
      })
      .finally(() => setLoading(false));
  }, []);
  async function action(fn: () => Promise<void>, success: string) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await fn();
      await refresh();
      setMessage(success);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "No se pudo completar la operación. Revisá el almacenamiento local.",
      );
    } finally {
      setBusy(false);
    }
  }
  const student = students.find((s) => s.id === selected),
    own = assessments.filter((a) => a.studentId === selected);
  const changePage = (p: Page) => {
    setPage(p);
    setEditing(undefined);
    setMessage("");
    setError("");
  };
  async function addAssessment(inputs: Inputs, protein: number, fat: number) {
    await action(async () => {
      await saveAssessment({
        id: crypto.randomUUID(),
        studentId: selected,
        date,
        inputs: { ...inputs },
        protein,
        fat,
        notes,
        formula: "mifflin-st-jeor-v1",
        createdAt: new Date().toISOString(),
      });
      setNotes("");
    }, "Evaluación guardada en este dispositivo.");
  }
  async function download() {
    await action(async () => {
      const backup = await exportBackup();
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(backup, null, 2)], {
          type: "application/json",
        }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = `nutrisport-pro-${localDate()}.json`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, "Copia generada. Guardá el archivo en un lugar protegido.");
  }
  return (
    <div className="shell">
      <aside>
        <a className="brand" href="#main">
          NUTRISPORT <span>PRO</span>
          <small>ESPACIO PROFESIONAL · MVP 1.0</small>
        </a>
        <nav aria-label="Principal">
          {pages.map((p, i) => (
            <button
              key={p}
              aria-current={page === p ? "page" : undefined}
              onClick={() => changePage(p)}
            >
              <span aria-hidden="true">
                {["◈", "○", "∑", "▤", "↗", "⚙"][i]}
              </span>
              {p}
            </button>
          ))}
        </nav>
        <div className="local-badge">
          <span className="dot" /> Datos en tu dispositivo
          <small>Sin cuenta · Sin nube</small>
        </div>
      </aside>
      <main id="main">
        <header className="section-heading">
          <div>
            <p className="eyebrow">
              NUTRICIÓN DEPORTIVA / {page.toUpperCase()}
            </p>
            <h1>{page === "Inicio" ? "Tu espacio de trabajo" : page}</h1>
            <p className="muted">
              {page === "Inicio"
                ? "Evaluá, organizá y acompañá cada proceso."
                : "Herramientas simples para una práctica organizada."}
            </p>
          </div>
          <span className="pill">LOCAL · GRATUITO</span>
        </header>
        {loading && <p role="status">Abriendo almacenamiento local…</p>}
        {error && (
          <p role="alert" className="notice error">
            {error}
          </p>
        )}
        {message && (
          <p role="status" className="notice">
            {message}
          </p>
        )}
        {page === "Inicio" && (
          <>
            <section className="hero">
              <div>
                <p className="eyebrow">MENOS PLANILLAS, MÁS CONTEXTO</p>
                <h2>
                  Cada evaluación,
                  <br />
                  en su lugar.
                </h2>
                <p>
                  Fichas, cálculos e historial en un solo espacio.
                  <br />
                  Vos elegís cuándo hacer una copia de seguridad.
                </p>
                <div className="actions">
                  <button
                    disabled={!storageReady}
                    onClick={() => {
                      changePage("Alumnos");
                      setEditing(null);
                    }}
                  >
                    Agregar alumno
                  </button>
                  <button
                    className="secondary"
                    onClick={() => changePage("Calculadoras")}
                  >
                    Abrir calculadoras
                  </button>
                </div>
              </div>
              <div className="hero-mark" aria-hidden="true">
                N<span>+</span>
              </div>
            </section>
            <section className="metrics overview">
              <article>
                <small>Alumnos registrados</small>
                <strong>{students.length}</strong>
                <small>Fichas locales</small>
              </article>
              <article>
                <small>Evaluaciones guardadas</small>
                <strong>{assessments.length}</strong>
                <small>Historial reproducible</small>
              </article>
              <article>
                <small>Tu información</small>
                <strong>100% local</strong>
                <small>Respaldos bajo tu control</small>
              </article>
            </section>
            <section className="panel">
              <h2>Empezá en tres pasos</h2>
              <ol>
                <li>Creá una ficha con nombre o alias, deporte y objetivo.</li>
                <li>Guardá una evaluación con sus datos y resultados.</li>
                <li>Exportá una copia desde Configuración.</li>
              </ol>
              <p className="muted">
                Sin sincronización automática. Borrar los datos del navegador
                puede eliminar tus fichas.
              </p>
            </section>
          </>
        )}
        {page === "Alumnos" && (
          <>
            <div className="toolbar">
              <label className="search">
                Buscar alumno
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Nombre o deporte"
                />
              </label>
              <button
                disabled={!storageReady || busy}
                onClick={() => setEditing(null)}
              >
                Nuevo alumno
              </button>
            </div>
            {editing !== undefined && (
              <StudentForm
                key={editing?.id ?? "new"}
                student={editing ?? undefined}
                busy={busy}
                onCancel={() => setEditing(undefined)}
                onSave={async (s) => {
                  setBusy(true);
                  try {
                    await saveStudent(s);
                    await refresh();
                    setSelected(s.id);
                    setEditing(undefined);
                    setMessage("Ficha guardada.");
                  } finally {
                    setBusy(false);
                  }
                }}
              />
            )}
            <div className="student-grid">
              {students
                .filter((s) =>
                  `${s.name} ${s.sport}`
                    .toLowerCase()
                    .includes(search.toLowerCase()),
                )
                .map((s) => (
                  <article className="panel student-card" key={s.id}>
                    <div className="avatar" aria-hidden="true">
                      {s.name.slice(0, 1).toUpperCase()}
                    </div>
                    <h2>{s.name}</h2>
                    <p className="muted">{s.sport || "Sin deporte indicado"}</p>
                    <p>{s.goal || "Sin objetivo indicado"}</p>
                    <button
                      className="secondary"
                      onClick={() => setSelected(s.id)}
                    >
                      Abrir ficha
                    </button>
                  </article>
                ))}
            </div>
            {!students.length && (
              <section className="panel empty">
                <h2>Tu primer alumno empieza acá</h2>
                <p>
                  Agregá una ficha o cargá un ejemplo ficticio desde
                  Configuración.
                </p>
              </section>
            )}
            {student && (
              <section className="panel">
                <div className="section-heading">
                  <h2>Ficha · {student.name}</h2>
                  <div className="actions">
                    <button
                      className="secondary"
                      onClick={() => setEditing(student)}
                    >
                      Editar
                    </button>
                    <button
                      className="danger"
                      disabled={busy}
                      onClick={() => {
                        if (
                          window.confirm(
                            `¿Eliminar a ${student.name} y todas sus evaluaciones? Esta acción no se puede deshacer.`,
                          )
                        )
                          void action(async () => {
                            await deleteStudent(student.id);
                            setSelected("");
                          }, "Ficha y evaluaciones eliminadas.");
                      }}
                    >
                      Eliminar alumno
                    </button>
                  </div>
                </div>
                <p>
                  <b>Deporte:</b> {student.sport || "Sin especificar"}
                </p>
                <p>
                  <b>Objetivo:</b> {student.goal || "Sin especificar"}
                </p>
                <p className="preserve">{student.notes || "Sin notas."}</p>
                <button onClick={() => changePage("Evaluaciones")}>
                  Nueva evaluación
                </button>
                <h2>Historial individual</h2>
                <History items={own} students={students} />
              </section>
            )}
          </>
        )}
        {page === "Calculadoras" && <Calculator />}
        {page === "Evaluaciones" && (
          <>
            <section className="panel">
              <h2>Guardar una nueva evaluación</h2>
              <p className="muted">
                Los resultados se recalculan a partir de los datos originales.
                Revisión profesional requerida.
              </p>
              <div className="grid">
                <label>
                  Alumno
                  <select
                    value={selected}
                    onChange={(e) => setSelected(e.target.value)}
                  >
                    <option value="">Seleccionar alumno</option>
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Fecha
                  <input
                    type="date"
                    min="1900-01-01"
                    max={localDate()}
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </label>
              </div>
              <label>
                Notas de evaluación
                <textarea
                  maxLength={2000}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                />
              </label>
            </section>
            {student ? (
              <Calculator
                key={student.id}
                onSave={addAssessment}
                busy={busy || !storageReady}
              />
            ) : (
              <p className="notice">
                Seleccioná un alumno para guardar una evaluación. Podés calcular
                sin ficha en Calculadoras.
              </p>
            )}
            <h2>
              {student
                ? `Historial · ${student.name}`
                : "Todas las evaluaciones"}
            </h2>
            <History
              items={student ? own : assessments}
              students={students}
              onDelete={(id) => {
                if (window.confirm("¿Eliminar esta evaluación?"))
                  void action(
                    () => db.assessments.delete(id),
                    "Evaluación eliminada.",
                  );
              }}
            />
          </>
        )}
        {page === "Seguimiento" && (
          <>
            <section className="panel">
              <h2>Evolución por alumno</h2>
              <label>
                Alumno
                <select
                  value={selected}
                  onChange={(e) => setSelected(e.target.value)}
                >
                  <option value="">Seleccionar alumno</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
              <p className="muted">
                Registro cronológico de peso y gasto estimado. Los cambios no
                implican por sí solos una mejora o un deterioro.
              </p>
              {student && own.length ? (
                <div className="table-wrap">
                  <table>
                    <caption>{student.name} · mediciones guardadas</caption>
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Peso (kg)</th>
                        <th>GET (kcal/día)</th>
                        <th>Cambio de peso (kg)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...own].reverse().map((a, i, arr) => (
                        <tr key={a.id}>
                          <td>{a.date}</td>
                          <td>{format(a.inputs.weightKg)}</td>
                          <td>{format(calculate(a.inputs).total)}</td>
                          <td>
                            {i
                              ? format(
                                  a.inputs.weightKg -
                                    arr[i - 1].inputs.weightKg,
                                )
                              : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p>
                  Seleccioná un alumno con evaluaciones guardadas para ver su
                  seguimiento.
                </p>
              )}
            </section>
          </>
        )}
        {page === "Configuración" && (
          <>
            <section className="panel">
              <h2>Copias de seguridad</h2>
              <p>
                Exportá fichas y evaluaciones en JSON. La importación reemplaza
                todos los datos de este navegador: exportá antes una copia
                actual.
              </p>
              <div className="actions">
                <button disabled={busy || !storageReady} onClick={download}>
                  Exportar copia JSON
                </button>
                <label className="file-label">
                  Elegir copia JSON
                  <input
                    type="file"
                    accept=".json,application/json"
                    disabled={busy || !storageReady}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      setPendingBackup(null);
                      setError("");
                      if (!file) return;
                      try {
                        if (file.size > 5_000_000)
                          throw new Error(
                            "El archivo supera el límite de 5 MB.",
                          );
                        const text = await file.text();
                        const backup = parseBackup(text);
                        setPendingBackup({
                          text,
                          students: backup.students.length,
                          assessments: backup.assessments.length,
                        });
                      } catch {
                        setError(
                          "Copia no válida: debe ser JSON NutriSport Pro v1, de hasta 5 MB, con datos y referencias válidos.",
                        );
                      }
                    }}
                  />
                </label>
              </div>
              {pendingBackup && (
                <div className="notice">
                  <p>
                    Copia validada: {pendingBackup.students} alumnos y{" "}
                    {pendingBackup.assessments} evaluaciones. Se reemplazarán{" "}
                    {students.length} alumnos y {assessments.length}{" "}
                    evaluaciones actuales.
                  </p>
                  <div className="actions">
                    <button
                      disabled={busy}
                      onClick={() => {
                        if (
                          window.confirm(
                            "¿Reemplazar todos los datos locales con esta copia?",
                          )
                        )
                          void action(async () => {
                            await importBackup(pendingBackup.text);
                            setPendingBackup(null);
                            setSelected("");
                          }, "Copia restaurada correctamente.");
                      }}
                    >
                      Reemplazar datos con esta copia
                    </button>
                    <button
                      className="secondary"
                      onClick={() => setPendingBackup(null)}
                    >
                      Cancelar importación
                    </button>
                  </div>
                </div>
              )}
            </section>
            <section className="panel">
              <h2>Privacidad y persistencia</h2>
              <ul>
                <li>
                  Fichas y evaluaciones permanecen en IndexedDB de este
                  navegador y origen. La app no las envía a servidores.
                </li>
                <li>
                  No hay cifrado propio, contraseña ni sincronización entre
                  dispositivos. Cualquier persona con acceso a este perfil del
                  navegador puede ver los datos.
                </li>
                <li>
                  El modo privado, la limpieza del navegador, cambiar de dominio
                  o el desalojo de almacenamiento pueden provocar pérdida de
                  acceso o datos.
                </li>
                <li>
                  Las copias JSON contienen información legible: guardalas
                  protegidas y compartilas solo con autorización.
                </li>
                <li>
                  Usá alias y registrá solo lo necesario. Mantené copias
                  periódicas en un lugar seguro.
                </li>
              </ul>
              <button
                className="secondary"
                disabled={!storageReady || busy}
                onClick={() =>
                  void action(async () => {
                    const persisted = await navigator.storage?.persist?.();
                    if (!persisted)
                      throw new Error(
                        "El navegador no concedió persistencia. Exportá copias periódicas.",
                      );
                  }, "El navegador concedió almacenamiento persistente. Seguí realizando copias.")
                }
              >
                Solicitar persistencia al navegador
              </button>
            </section>
            <section className="panel">
              <h2>Datos de prueba</h2>
              <p>
                Agrega una ficha y evaluación ficticias identificadas como
                ejemplo. No reemplaza tus datos. Podés eliminarlas desde
                Alumnos.
              </p>
              <button
                className="secondary"
                disabled={!storageReady || busy}
                onClick={() =>
                  void action(
                    () => seedExamples(),
                    "Ejemplo ficticio disponible en Alumnos.",
                  )
                }
              >
                Cargar ejemplo ficticio
              </button>
            </section>
          </>
        )}
        <footer>
          NutriSport Pro MVP 1.0 · Estimaciones para adultos · Herramienta de
          apoyo con revisión profesional.
        </footer>
      </main>
    </div>
  );
}
