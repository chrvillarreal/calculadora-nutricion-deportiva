import type { NhostClient, NhostSession } from '@nhost/nhost-js';

type Listener = (session: NhostSession | null) => void;
const listenersByClient = new WeakMap<NhostClient, Set<Listener>>();

export function subscribeSession(client: NhostClient, listener: Listener) {
  let listeners = listenersByClient.get(client);
  if (!listeners) {
    listeners = new Set();
    listenersByClient.set(client, listeners);
    const notify = (session: NhostSession | null) => {
      for (const callback of listeners!) callback(session);
    };
    // Nhost 3.3.1 devuelve un cleanup que llama interpreter.stop(), no solo
    // desuscribe el callback. Ejecutarlo en un effect detiene Auth en StrictMode.
    // Instalar un único puente por cliente durante su vida; React solo elimina
    // sus propios listeners. No se retienen componentes desmontados.
    client.auth.onAuthStateChanged((_event, session) => notify(session));
    client.auth.onTokenChanged(notify);
  }
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
