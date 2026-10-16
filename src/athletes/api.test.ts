import { describe, expect, it, vi } from 'vitest';
import type { NhostClient } from '@nhost/nhost-js';
import { listAthletes, saveAthlete, validateAthlete, WRITES_BLOCKED } from './api';

function fakeClient(authenticated = true) {
  const request = vi.fn().mockResolvedValue({ data: { athletes: [] }, error: null });
  return { request, client: { auth: { getSession: () => authenticated ? { accessTokenExpiresIn: 3600, user: { id: 'a', isAnonymous: false, roles: ['user'] } } : null, getAccessToken: () => authenticated ? 'test-user-token' : undefined }, graphql: { request } } as unknown as NhostClient };
}
const input = { full_name: '  Deportista de prueba  ', birth_date: '1990-05-12', notes: '  Nota  ' };

describe('API de deportistas (pruebas unitarias, no verifican permisos del servidor)', () => {
  it('no consulta sin sesión', async () => {
    const { client, request } = fakeClient(false);
    await expect(listAthletes(client)).rejects.toThrow('sesión');
    expect(request).not.toHaveBeenCalled();
  });
  it('no envía solicitudes con un token vencido retenido por el SDK', async () => {
    const { client, request } = fakeClient();
    vi.spyOn(client.auth, 'getSession').mockReturnValue({ accessTokenExpiresIn: -1, user: { id: 'a', isAnonymous: false, roles: ['user'] } } as ReturnType<typeof client.auth.getSession>);
    await expect(listAthletes(client)).rejects.toThrow('sesión');
    expect(request).not.toHaveBeenCalled();
  });
  it('consulta con rol user, paginación y sin identificador de profesional', async () => {
    const { client, request } = fakeClient();
    expect(await listAthletes(client, 25)).toEqual([]);
    expect(request).toHaveBeenCalledWith(expect.any(String), { limit: 25, offset: 25 }, { headers: { 'x-hasura-role': 'user' } });
    expect(request.mock.calls[0][0]).not.toContain('professional_id');
  });
  it('no oculta errores de permisos ni devuelve datos parciales', async () => {
    const { client, request } = fakeClient();
    request.mockResolvedValue({ data: { athletes: [{ id: 'partial' }] }, error: { message: 'permission denied' } });
    await expect(listAthletes(client)).rejects.toThrow('permisos');
  });
  it('bloquea altas y ediciones antes de realizar solicitudes', async () => {
    const { client, request } = fakeClient();
    await expect(saveAthlete(client, input)).rejects.toThrow(WRITES_BLOCKED);
    await expect(saveAthlete(client, input, 'another-user-id')).rejects.toThrow(WRITES_BLOCKED);
    expect(request).not.toHaveBeenCalled();
  });
  it('limpia campos y elimina claves adicionales de identidad', () => {
    expect(validateAthlete({ ...input, professional_id: 'forged', id: 'forged' } as typeof input)).toEqual({ full_name: 'Deportista de prueba', birth_date: '1990-05-12', notes: 'Nota' });
  });
  it.each([
    { ...input, full_name: ' ' },
    { ...input, full_name: 'a'.repeat(161) },
    { ...input, birth_date: '2025-02-30' },
    { ...input, birth_date: 'not-a-date' },
    { ...input, birth_date: '2999-01-01' },
    { ...input, notes: 'a'.repeat(5001) },
  ])('rechaza datos inválidos %#', invalid => {
    expect(() => validateAthlete(invalid, '2026-10-16')).toThrow();
  });
  it('acepta fecha y notas opcionales', () => {
    expect(validateAthlete({ full_name: 'Prueba', birth_date: '', notes: ' ' })).toEqual({ full_name: 'Prueba', birth_date: null, notes: null });
  });
});
