import type { NhostClient } from '@nhost/nhost-js';
import { professionalSession } from '../auth/session';

export type Athlete = { id: string; full_name: string; birth_date: string | null; notes: string | null };
export type AthleteInput = Pick<Athlete, 'full_name' | 'birth_date' | 'notes'>;

// Bloqueo deliberado hasta revisar los presets y aprobar las pruebas reales A/B.
// Una bandera del navegador no es un control de autorización; Hasura debe imponer los permisos.
export const ATHLETE_WRITES_VERIFIED = false;
export const WRITES_BLOCKED = 'Altas y ediciones bloqueadas hasta verificar los permisos y el aislamiento multiusuario en Hasura. No ingreses datos reales.';

export const LIST_ATHLETES = `query ListAthletes($limit: Int!, $offset: Int!) {
  athletes(order_by: [{full_name: asc}, {id: asc}], limit: $limit, offset: $offset) { id full_name birth_date notes }
}`;
export const INSERT_ATHLETE = `mutation CreateAthlete($object: athletes_insert_input!) {
  insert_athletes_one(object: $object) { id full_name birth_date notes }
}`;
export const UPDATE_ATHLETE = `mutation EditAthlete($id: uuid!, $changes: athletes_set_input!) {
  update_athletes(where: {id: {_eq: $id}}, _set: $changes) { affected_rows returning { id full_name birth_date notes } }
}`;

export function validateAthlete(input: AthleteInput, today = new Date().toISOString().slice(0, 10)): AthleteInput {
  const full_name = input.full_name.trim();
  if (!full_name || full_name.length > 160) throw new Error('Ingresá un nombre de entre 1 y 160 caracteres.');
  const birth_date = input.birth_date || null;
  if (birth_date && (!/^\d{4}-\d{2}-\d{2}$/.test(birth_date) || !Number.isFinite(Date.parse(birth_date)) || new Date(birth_date).toISOString().slice(0, 10) !== birth_date || birth_date > today)) {
    throw new Error('Ingresá una fecha de nacimiento válida que no sea futura.');
  }
  const notes = input.notes?.trim() || null;
  if (notes && notes.length > 5000) throw new Error('Las notas no pueden superar los 5000 caracteres.');
  // Construir una lista explícita de campos; ignorar claves adicionales recibidas en runtime.
  return { full_name, birth_date, notes };
}

export async function userRequest<T>(client: NhostClient, query: string, variables: Record<string, unknown>) {
  const session = client.auth.getSession();
  if (!professionalSession(session) || !client.auth.getAccessToken()) throw new Error('La sesión venció o no tiene acceso profesional. Volvé a ingresar.');
  const { data, error } = await client.graphql.request<T>(query, variables, { headers: { 'x-hasura-role': 'user' } });
  if (error || !data) throw new Error('No se pudo completar la operación. Revisá la conexión y los permisos del rol user en Hasura.');
  return data;
}

export async function listAthletes(client: NhostClient, offset = 0) {
  const data = await userRequest<{ athletes: Athlete[] }>(client, LIST_ATHLETES, { limit: 25, offset });
  return data.athletes;
}

export async function saveAthlete(client: NhostClient, input: AthleteInput, id?: string) {
  if (!ATHLETE_WRITES_VERIFIED) throw new Error(WRITES_BLOCKED);
  const fields = validateAthlete(input);
  if (id) {
    const data = await userRequest<{ update_athletes: { affected_rows: number; returning: Athlete[] } }>(client, UPDATE_ATHLETE, { id, changes: fields });
    if (data.update_athletes.affected_rows !== 1) throw new Error('El deportista no está disponible o no tenés permiso para editarlo.');
    return data.update_athletes.returning[0];
  }
  const data = await userRequest<{ insert_athletes_one: Athlete | null }>(client, INSERT_ATHLETE, { object: fields });
  if (!data.insert_athletes_one) throw new Error('No se pudo crear el deportista.');
  return data.insert_athletes_one;
}
