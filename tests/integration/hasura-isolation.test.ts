import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { NhostClient } from '@nhost/nhost-js';

// Opt-in exclusivo para una copia aislada. Nunca apuntar esta suite a producción.
const enabled = process.env.NHOST_TEST_ISOLATED === 'true';
const productionProject = 'nwjypkxthlvrtwlrfntu';
const tables = ['professional_profiles', 'athletes', 'assessments', 'calculation_results'];
type Result = { data?: Record<string, any>; errors?: { extensions?: { code?: string } }[] };
const clients: NhostClient[] = [];
let endpoint = '';

async function graphql(query: string, variables: Record<string, unknown> = {}, client?: NhostClient, role?: string): Promise<Result> {
  const token = client?.auth.getAccessToken();
  if (client && !token) throw new Error('Falta sesión de prueba');
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}), ...(role ? { 'x-hasura-role': role } : {}) },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`Hasura respondió HTTP ${response.status}; no se considera una prueba de aislamiento válida.`);
  return response.json();
}

function success(result: Result, operation: string) {
  // No incluir objetos de sesión, respuestas completas ni credenciales en aserciones/logs.
  expect(!result.errors && !!result.data, `${operation}: se requiere una respuesta GraphQL exitosa`).toBe(true);
  return result.data!;
}

function denied(result: Result) {
  const codes = result.errors?.map(error => error.extensions?.code);
  expect(!!codes?.length, 'La asociación ajena debe rechazarse, no devolver datos').toBe(true);
  expect(codes?.every(code => ['permission-error', 'constraint-violation', 'validation-failed', 'access-denied'].includes(code ?? '')),
    'Solo una denegación de permisos o restricción válida cuenta como aislamiento').toBe(true);
  expect(result.data == null).toBe(true);
}

async function create(client: NhostClient, table: string, object: Record<string, unknown>) {
  const data = success(await graphql(`mutation Create($object: ${table}_insert_input!) {
    insert_${table}_one(object: $object) { id professional_id }
  }`, { object }, client, 'user'), `Alta propia ${table}`);
  const row = data[`insert_${table}_one`];
  expect(!!row?.id).toBe(true);
  expect(row.professional_id).toBe(client.auth.getSession()!.user.id);
  return row.id as string;
}

async function invisible(client: NhostClient, table: string, id: string) {
  const data = success(await graphql(`query Other($id: uuid!) { ${table}(where: {id: {_eq: $id}}) { id } }`, { id }, client, 'user'), `Lectura aislada ${table}`);
  expect(data[table]).toEqual([]);
}

describe.skipIf(!enabled)('Hasura real: autorización con dos profesionales (solo entorno aislado)', () => {
  beforeAll(async () => {
    const required = ['NHOST_TEST_SUBDOMAIN', 'NHOST_TEST_REGION', 'NHOST_TEST_EMAIL_A', 'NHOST_TEST_PASSWORD_A', 'NHOST_TEST_EMAIL_B', 'NHOST_TEST_PASSWORD_B'];
    for (const name of required) if (!process.env[name]) throw new Error(`Falta ${name}; configurar fuera del repositorio.`);
    const subdomain = process.env.NHOST_TEST_SUBDOMAIN!;
    const region = process.env.NHOST_TEST_REGION!;
    if (subdomain === productionProject) throw new Error('Se rechaza el proyecto existente: usar una copia aislada aprobada.');
    if (![subdomain, region].every(value => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value))) throw new Error('Subdominio o región inválidos.');
    for (const suffix of ['A', 'B']) {
      const storage = new Map<string, string>();
      const client = new NhostClient({ subdomain, region, autoSignIn: false, autoRefreshToken: false,
        clientStorageType: 'custom', clientStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => { storage.set(key, value); }, removeItem: key => { storage.delete(key); } } });
      clients.push(client);
      const result = await client.auth.signIn({ email: process.env[`NHOST_TEST_EMAIL_${suffix}`]!, password: process.env[`NHOST_TEST_PASSWORD_${suffix}`]! });
      if (result.error || !result.session) throw new Error(`No se pudo autenticar la cuenta ${suffix}; revisar correo confirmado y rol user.`);
    }
    expect(clients[0].auth.getSession()!.user.id !== clients[1].auth.getSession()!.user.id, 'Se requieren dos identidades distintas').toBe(true);
    endpoint = clients[0].graphql.httpUrl;
  });
  afterAll(async () => {
    for (const client of clients) if (client.auth.getSession()) await client.auth.signOut();
  });

  it.each([undefined, 'anonymous', 'public'])('no expone tablas personales sin token (rol %s)', async role => {
    const result = await graphql('{ __schema { queryType { fields { name } } mutationType { fields { name } } } }', {}, undefined, role);
    if (result.errors) {
      expect(result.errors.every(error => error.extensions?.code === 'access-denied'), 'Un fallo de conexión/introspección no acredita permisos').toBe(true);
      return;
    }
    const data = success(result, 'Auditoría pública');
    const fields = [...(data.__schema.queryType?.fields ?? []), ...(data.__schema.mutationType?.fields ?? [])].map(field => field.name as string);
    expect(fields.filter(name => tables.some(table => name.includes(table)))).toEqual([]);
  });

  it('excluye identidad de inputs y no ofrece operaciones prohibidas', async () => {
    const names = ['athletes_insert_input', 'athletes_set_input', 'assessments_insert_input', 'assessments_set_input', 'calculation_results_insert_input', 'professional_profiles_insert_input'];
    for (const name of names) {
      const data = success(await graphql('query Input($name: String!) { __type(name: $name) { inputFields { name } } }', { name }, clients[0], 'user'), `Auditoría ${name}`);
      expect(!!data.__type, `${name} debe estar disponible`).toBe(true);
      const fields = data.__type.inputFields.map((field: { name: string }) => field.name);
      expect(fields).not.toContain('professional_id');
      if (name.endsWith('_set_input') || name === 'professional_profiles_insert_input') expect(fields).not.toContain('id');
    }
    const data = success(await graphql('{ __schema { mutationType { fields { name } } } }', {}, clients[0], 'user'), 'Operaciones disponibles');
    const fields = data.__schema.mutationType.fields.map((field: { name: string }) => field.name as string);
    expect(fields.filter((name: string) => tables.some(table => name.startsWith(`delete_${table}`)) || name.startsWith('update_calculation_results'))).toEqual([]);
  });

  it('oculta perfiles de otros profesionales', async () => {
    const [a, b] = clients;
    await invisible(a, 'professional_profiles', b.auth.getSession()!.user.id);
    await invisible(b, 'professional_profiles', a.auth.getSession()!.user.id);
  });

  it('A y B crean y editan sus fichas; no pueden leer ni editar la ficha ajena', async () => {
    const ids = await Promise.all(clients.map((client, index) => create(client, 'athletes', { full_name: `CODEX AISLADO ${Date.now()} ${index}`, birth_date: '1990-01-01', notes: 'Datos ficticios de prueba' })));
    for (const index of [0, 1]) {
      const client = clients[index];
      const own = success(await graphql('query Own($id: uuid!) { athletes(where: {id: {_eq: $id}}) { id } }', { id: ids[index] }, client, 'user'), 'Lectura propia');
      expect(own.athletes.map((row: { id: string }) => row.id)).toEqual([ids[index]]);
      const mutation = 'mutation Edit($id: uuid!, $changes: athletes_set_input!) { update_athletes(where: {id: {_eq: $id}}, _set: $changes) { affected_rows } }';
      const updated = success(await graphql(mutation, { id: ids[index], changes: { notes: 'Edición propia de prueba' } }, client, 'user'), 'Edición propia');
      expect(updated.update_athletes.affected_rows).toBe(1);
      await invisible(client, 'athletes', ids[1 - index]);
      const foreign = success(await graphql(mutation, { id: ids[1 - index], changes: { notes: 'Intento ajeno de prueba' } }, client, 'user'), 'Intento de edición ajena');
      expect(foreign.update_athletes.affected_rows).toBe(0);
    }
  });

  it('rechaza evaluaciones y resultados asociados a otro profesional en ambos sentidos', async () => {
    const athletes = await Promise.all(clients.map(client => create(client, 'athletes', { full_name: `CODEX FK AISLADO ${Date.now()}` })));
    const assessment = (athlete_id: string) => ({ athlete_id, assessment_date: '2026-10-16', weight_kg: 80, height_cm: 180, activity_factor: 1.55, goal: 'maintenance' });
    const assessments = await Promise.all(clients.map((client, index) => create(client, 'assessments', assessment(athletes[index]))));
    const calculation = (assessment_id: string) => ({ assessment_id, formula_key: 'mifflin-st-jeor', formula_version: '1', inputs: { weightKg: 80 }, result_value: 1780, result_unit: 'kcal/day' });
    const results = await Promise.all(clients.map((client, index) => create(client, 'calculation_results', calculation(assessments[index]))));
    for (const index of [0, 1]) {
      const client = clients[index]; const other = 1 - index;
      await invisible(client, 'assessments', assessments[other]);
      await invisible(client, 'calculation_results', results[other]);
      denied(await graphql('mutation Foreign($object: assessments_insert_input!) { insert_assessments_one(object: $object) { id } }', { object: assessment(athletes[other]) }, client, 'user'));
      denied(await graphql('mutation Foreign($object: calculation_results_insert_input!) { insert_calculation_results_one(object: $object) { id } }', { object: calculation(assessments[other]) }, client, 'user'));
      denied(await graphql('mutation Reassign($id: uuid!, $changes: assessments_set_input!) { update_assessments(where: {id: {_eq: $id}}, _set: $changes) { affected_rows } }', { id: assessments[index], changes: { athlete_id: athletes[other] } }, client, 'user'));
    }
  });
});
