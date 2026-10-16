import { act, cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { NhostClient, NhostSession } from '@nhost/nhost-js';
import { App } from './App';
import { AuthProvider } from './auth/AuthProvider';

afterEach(() => { cleanup(); window.location.hash = ''; });
function setup({ initialSession = null, restoring = false }: { initialSession?: NhostSession | null; restoring?: boolean } = {}) {
  let session = initialSession;
  let authCallback: (event: string, value: NhostSession | null) => void = () => {};
  const request = vi.fn().mockResolvedValue({ data: { athletes: [{ id: '1', full_name: 'Ficha privada A', birth_date: null, notes: null }] }, error: null });
  const stopAuth = vi.fn(); const stopToken = vi.fn();
  const signOut = vi.fn().mockImplementation(async () => { session = null; authCallback('SIGNED_OUT', null); return { error: null }; });
  const client = { auth: {
    onAuthStateChanged: (fn: typeof authCallback) => { authCallback = fn; return stopAuth; },
    onTokenChanged: () => stopToken,
    isAuthenticatedAsync: () => restoring ? new Promise(() => {}) : Promise.resolve(!!session),
    getSession: () => session,
    getAccessToken: () => session ? 'test-user-token' : undefined,
    signOut,
  }, graphql: { request } } as unknown as NhostClient;
  const rendered = render(<AuthProvider client={client}><App /></AuthProvider>);
  return { request, signOut, stopAuth, stopToken, ...rendered, expire: () => act(() => { session = null; authCallback('SIGNED_OUT', null); }) };
}
const sessionA = { user: { id: 'a', isAnonymous: false, roles: ['user'] } } as NhostSession;
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
    const { request } = setup({ initialSession: { user: { id: 'anonymous', isAnonymous: true, roles: ['user'] } } as NhostSession });
    await screen.findByRole('heading', { name: 'Acceso profesional' });
    expect(request).not.toHaveBeenCalled();
  });
  it('rechaza sesiones sin rol user', async () => {
    window.location.hash = '#deportistas';
    const { request } = setup({ initialSession: { user: { id: 'unassigned', isAnonymous: false, roles: ['me'] } } as NhostSession });
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
});
