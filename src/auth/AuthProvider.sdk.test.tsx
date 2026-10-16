import { StrictMode } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { NhostClient } from '@nhost/nhost-js';
import { afterEach, expect, it } from 'vitest';
import { AuthProvider, useAuth } from './AuthProvider';
import { subscribeSession } from './sessionEvents';

afterEach(cleanup);
function Status() {
  const { loading } = useAuth();
  return <p>{loading ? 'restaurando' : 'sesión resuelta'}</p>;
}
it('el SDK real permanece operativo tras el ciclo setup/cleanup/setup de StrictMode', async () => {
  const storage = new Map<string, string>();
  const client = new NhostClient({ subdomain: 'audit-isolated', region: 'sa-east-1', autoSignIn: false, autoRefreshToken: false,
    clientStorageType: 'custom', clientStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => { storage.set(key, value); }, removeItem: key => { storage.delete(key); } } });
  // Sin sesión almacenada ni auto-signin, no se realizan solicitudes a Nhost.
  const view = render(<StrictMode><AuthProvider client={client}><Status /></AuthProvider></StrictMode>);
  await screen.findByText('sesión resuelta');
  expect(await client.auth.isAuthenticatedAsync()).toBe(false);
  view.unmount();
  expect(await client.auth.isAuthenticatedAsync()).toBe(false);
});

it('el puente deja de entregar eventos a componentes desmontados sin detener el SDK', () => {
  let authCallback: (event: string, session: null) => void = () => {};
  let calls = 0;
  const client = { auth: { onAuthStateChanged: (callback: typeof authCallback) => { authCallback = callback; }, onTokenChanged: () => {} } } as unknown as NhostClient;
  const remove = subscribeSession(client, () => { calls++; });
  authCallback('SIGNED_OUT', null); remove(); authCallback('SIGNED_OUT', null);
  expect(calls).toBe(1);
});
