import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { NhostClient, NhostSession } from '@nhost/nhost-js';
import { App } from './App';
import { AuthProvider } from './auth/AuthProvider';

afterEach(() => { cleanup(); vi.useRealTimers(); window.location.hash = ''; });
function setup({ initialSession = null, restoring = false, authReady }: { initialSession?: NhostSession | null; restoring?: boolean; authReady?: boolean } = {}) {
  let session = initialSession;
  let authCallback: (event: string, value: NhostSession | null) => void = () => {};
  let tokenCallback: (value: NhostSession | null) => void = () => {};
  const request = vi.fn().mockResolvedValue({ data: { athletes: [{ id: '1', full_name: 'Ficha privada A', birth_date: null, notes: null }] }, error: null });
  const stopAuth = vi.fn(); const stopToken = vi.fn();
  const signOut = vi.fn().mockImplementation(async () => { session = null; authCallback('SIGNED_OUT', null); return { error: null }; });
  const client = { auth: {
    onAuthStateChanged: (fn: typeof authCallback) => { authCallback = fn; return stopAuth; },
    onTokenChanged: (fn: typeof tokenCallback) => { tokenCallback = fn; return stopToken; },
    isAuthenticatedAsync: () => restoring ? new Promise(() => {}) : Promise.resolve(authReady ?? !!session),
    getSession: () => session,
    getAccessToken: () => session ? 'test-user-token' : undefined,
    signOut,
  }, graphql: { request } } as unknown as NhostClient;
  const rendered = render(<AuthProvider client={client}><App /></AuthProvider>);
  return { request, signOut, stopAuth, stopToken, ...rendered,
    renew: (value: NhostSession) => act(() => { session = value; tokenCallback(value); }),
    expire: () => act(() => { session = null; authCallback('SIGNED_OUT', null); }) };
}
const sessionA = { accessTokenExpiresIn: 3600, user: { id: 'a', isAnonymous: false, roles: ['user'] } } as NhostSession;
describe('rutas privadas y ciclo de sesión', () => {
  it('mantiene la calculadora pública sin consultar GraphQL', () => {
    const { request } = setup();
    expect(screen.getByText('Calculadora energética')).toBeTruthy();
    expect(request).not.toHaveBeenCalled();
  });
  it('protege la ruta directa de deportistas mientras restaura la sesión', () => {
    window.location.hash = '#deportistas';
    const { request } = setup({ restoring: true });
    expect(screen.getByRole('status').textContent).toContain('Restaurando');
    expect(request).not.toHaveBeenCalled();
  });
  it('presenta acceso en la ruta privada sin sesión', async () => {
    window.location.hash = '#deportistas'; const { request } = setup();
    await screen.findByRole('heading', { name: 'Acceso profesional' });
    expect(request).not.toHaveBeenCalled();
  });
  it('retira los datos privados cuando expira la sesión', async () => {
    window.location.hash = '#deportistas'; const { expire } = setup({ initialSession: sessionA });
    await screen.findByText('Ficha privada A'); expire();
    expect(screen.queryByText('Ficha privada A')).toBeNull();
    expect(screen.getByRole('heading', { name: 'Acceso profesional' })).toBeTruthy();
  });
  it('rechaza sesiones anónimas aunque tengan un token', async () => {
    window.location.hash = '#deportistas';
    const { request } = setup({ initialSession: { accessTokenExpiresIn: 3600, user: { id: 'anonymous', isAnonymous: true, roles: ['user'] } } as NhostSession });
    await screen.findByRole('heading', { name: 'Acceso profesional' });
    expect(request).not.toHaveBeenCalled();
  });
  it('rechaza sesiones sin rol user', async () => {
    window.location.hash = '#deportistas';
    const { request } = setup({ initialSession: { accessTokenExpiresIn: 3600, user: { id: 'unassigned', isAnonymous: false, roles: ['me'] } } as NhostSession });
    await screen.findByRole('heading', { name: 'Acceso profesional' });
    expect(request).not.toHaveBeenCalled();
  });
  it('cierra sesión y elimina las fichas de la pantalla', async () => {
    window.location.hash = '#deportistas'; const { signOut } = setup({ initialSession: sessionA });
    await screen.findByText('Ficha privada A');
    await userEvent.setup().click(screen.getByRole('button', { name: 'Cerrar sesión' }));
    expect(signOut).toHaveBeenCalledOnce();
    expect(screen.queryByText('Ficha privada A')).toBeNull();
  });
  it('cancela las suscripciones al desmontar', () => {
    const { unmount, stopAuth, stopToken } = setup(); unmount();
    expect(stopAuth).toHaveBeenCalledOnce(); expect(stopToken).toHaveBeenCalledOnce();
  });
  it('termina la carga si Nhost no responde y permite reintentar sin exponer fichas', async () => {
    vi.useFakeTimers(); window.location.hash = '#deportistas';
    const { request } = setup({ restoring: true });
    await act(async () => { vi.advanceTimersByTime(12000); });
    expect(screen.getByRole('alert').textContent).toContain('no respondió a tiempo');
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar conexión' }));
    expect(screen.getByRole('status').textContent).toContain('Restaurando');
    expect(request).not.toHaveBeenCalled();
  });
  it('no recupera un snapshot cuando el SDK informa que no está autenticado', async () => {
    window.location.hash = '#deportistas'; const { request } = setup({ initialSession: sessionA, authReady: false });
    await screen.findByRole('heading', { name: 'Acceso profesional' });
    expect(request).not.toHaveBeenCalled();
  });
  it('rechaza tokens vencidos aunque el SDK retenga el usuario', async () => {
    window.location.hash = '#deportistas';
    const { request } = setup({ initialSession: { ...sessionA, accessTokenExpiresIn: -1 } });
    await screen.findByRole('heading', { name: 'Acceso profesional' });
    expect(request).not.toHaveBeenCalled();
  });
  it('retira las fichas al vencer el token aunque no llegue SIGNED_OUT', async () => {
    vi.useFakeTimers(); window.location.hash = '#deportistas';
    setup({ initialSession: { ...sessionA, accessTokenExpiresIn: 1 } });
    await act(async () => {});
    expect(screen.getByText('Ficha privada A')).toBeTruthy();
    await act(async () => { vi.advanceTimersByTime(1000); });
    expect(screen.queryByText('Ficha privada A')).toBeNull();
    expect(screen.getByRole('alert').textContent).toContain('venció');
  });
  it('renueva el plazo local al recibir TOKEN_CHANGED sin cerrar la sesión prematuramente', async () => {
    vi.useFakeTimers(); window.location.hash = '#deportistas';
    const { renew } = setup({ initialSession: { ...sessionA, accessTokenExpiresIn: 1 } });
    await act(async () => {});
    await act(async () => { vi.advanceTimersByTime(500); });
    renew({ ...sessionA, accessTokenExpiresIn: 10 });
    await act(async () => { vi.advanceTimersByTime(500); });
    expect(screen.getByText('Ficha privada A')).toBeTruthy();
    await act(async () => { vi.advanceTimersByTime(10000); });
    expect(screen.queryByText('Ficha privada A')).toBeNull();
  });
});
