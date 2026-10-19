import { useState, type FormEvent } from "react";
import { type Student } from "./storage";
export function StudentForm({
  student,
  onSave,
  onCancel,
  busy,
}: {
  student?: Student;
  onSave: (s: Student) => Promise<void>;
  onCancel: () => void;
  busy: boolean;
}) {
  const [error, setError] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const now = new Date().toISOString();
    try {
      await onSave({
        id: student?.id ?? crypto.randomUUID(),
        name: String(form.get("name")).trim(),
        sport: String(form.get("sport")).trim(),
        goal: String(form.get("goal")).trim(),
        notes: String(form.get("notes")).trim(),
        createdAt: student?.createdAt ?? now,
        updatedAt: now,
      });
    } catch {
      setError(
        "No se pudo guardar. Revisá el nombre (mínimo 2 caracteres) y el almacenamiento del navegador.",
      );
    }
  }
  return (
    <form className="panel" onSubmit={submit}>
      <h2>{student ? "Editar ficha" : "Nuevo alumno"}</h2>
      <div className="grid">
        <label>
          Nombre o alias
          <input
            name="name"
            required
            minLength={2}
            maxLength={120}
            defaultValue={student?.name}
          />
        </label>
        <label>
          Deporte
          <input name="sport" maxLength={120} defaultValue={student?.sport} />
        </label>
        <label>
          Objetivo
          <input name="goal" maxLength={200} defaultValue={student?.goal} />
        </label>
      </div>
      <label>
        Notas
        <textarea
          name="notes"
          maxLength={2000}
          rows={3}
          defaultValue={student?.notes}
        />
      </label>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <div className="actions">
        <button disabled={busy}>Guardar ficha</button>
        <button type="button" className="secondary" onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
