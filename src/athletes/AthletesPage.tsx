import { useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { ATHLETE_WRITES_VERIFIED, WRITES_BLOCKED, listAthletes, saveAthlete, validateAthlete, type Athlete, type AthleteInput } from './api';

export function AthleteForm({ athlete, onSave, onCancel, disabled = !ATHLETE_WRITES_VERIFIED }: {
  athlete?: Athlete; onSave: (input: AthleteInput) => Promise<void>; onCancel: () => void; disabled?: boolean;
}) {
  const [name, setName] = useState(athlete?.full_name ?? '');
  const [birthDate, setBirthDate] = useState(athlete?.birth_date ?? '');
  const [notes, setNotes] = useState(athlete?.notes ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (disabled || busy) return;
    setError('');
    try {
      const input = validateAthlete({ full_name: name, birth_date: birthDate, notes });
      setBusy(true);
      await onSave(input);
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo guardar.'); }
    finally { setBusy(false); }
  }
  return <form onSubmit={submit} noValidate aria-busy={busy}>
    <h2>{athlete ? 'Editar deportista' : 'Nuevo deportista'}</h2>
    <fieldset disabled={disabled || busy} className="form-fields">
      <label>Nombre completo<input value={name} onChange={e => setName(e.target.value)} maxLength={160} required /></label>
      <label>Fecha de nacimiento<input type="date" max={new Date().toISOString().slice(0, 10)} value={birthDate} onChange={e => setBirthDate(e.target.value)} /></label>
      <label>Notas<textarea value={notes} onChange={e => setNotes(e.target.value)} maxLength={5000} rows={4} /></label>
      <button type="submit">{busy ? 'Guardando…' : 'Guardar deportista'}</button>
    </fieldset>
    {error && <p role="alert" className="error">{error}</p>}
    <button type="button" className="secondary" onClick={onCancel} disabled={busy}>Cancelar</button>
  </form>;
}

export function AthletesPage() {
  const { client, session } = useAuth();
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [offset, setOffset] = useState(0);
  const [refresh, setRefresh] = useState(0);
  const [editing, setEditing] = useState<Athlete | 'new' | null>(null);
  useEffect(() => {
    let active = true;
    if (!client || !session) { setAthletes([]); setLoading(false); return; }
    setLoading(true); setError(''); setAthletes([]);
    void listAthletes(client, offset).then(rows => { if (active) setAthletes(rows); })
      .catch(() => { if (active) setError('No se pudo cargar el listado. Verificá la conexión y el permiso SELECT de athletes para el rol user.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [client, session?.user.id, offset, refresh]);
  if (!client || !session) return <p role="alert">Ingresá para ver tus deportistas.</p>;
  return <section className="panel" aria-labelledby="athletes-title">
    <div className="section-heading"><h1 id="athletes-title">Mis deportistas</h1><button disabled={!ATHLETE_WRITES_VERIFIED} onClick={() => setEditing('new')}>Nuevo deportista</button></div>
    {!ATHLETE_WRITES_VERIFIED && <p role="status" className="notice">{WRITES_BLOCKED}</p>}
    {editing && <AthleteForm key={editing === 'new' ? 'new' : editing.id} athlete={editing === 'new' ? undefined : editing} onCancel={() => setEditing(null)} onSave={async input => {
      await saveAthlete(client, input, editing === 'new' ? undefined : editing.id);
      setEditing(null); setRefresh(value => value + 1);
    }} />}
    {loading ? <p role="status">Cargando deportistas…</p> : error ? <div role="alert"><p className="error">{error}</p><button onClick={() => setRefresh(value => value + 1)}>Reintentar</button></div> : athletes.length === 0 ? <p>No hay deportistas en esta página.</p> : <ul className="athletes-list">{athletes.map(athlete => <li key={athlete.id}>
      <div><h2>{athlete.full_name}</h2><p>Nacimiento: {athlete.birth_date ?? 'Sin registrar'}</p>{athlete.notes && <p className="athlete-notes">{athlete.notes}</p>}</div>
      <button className="secondary" disabled={!ATHLETE_WRITES_VERIFIED} onClick={() => setEditing(athlete)} aria-label={`Editar a ${athlete.full_name}`}>Editar</button>
    </li>)}</ul>}
    <nav aria-label="Páginas de deportistas" className="actions"><button className="secondary" disabled={loading || offset === 0} onClick={() => setOffset(value => Math.max(0, value - 25))}>Anterior</button><span>Página {offset / 25 + 1}</span><button className="secondary" disabled={loading || !!error || athletes.length < 25} onClick={() => setOffset(value => value + 25)}>Siguiente</button></nav>
  </section>;
}
