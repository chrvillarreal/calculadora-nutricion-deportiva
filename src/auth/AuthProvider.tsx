import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { NhostClient, NhostSession } from '@nhost/nhost-js';
import { nhostConfig } from '../lib/nhost';
import { professionalSession } from './session';

export const SESSION_RESTORE_TIMEOUT_MS = 12000;

type AuthState = {
  client: NhostClient | null;
  session: NhostSession | null;
  loading: boolean;
  configError?: string;
  sessionError?: string;
  retrySession: () => void;
};
const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children, client = nhostConfig.client, configError }: {
  children: ReactNode; client?: NhostClient | null; configError?: string;
}) {
  const [state, setState] = useState<{ session: NhostSession | null; loading: boolean; sessionError?: string }>({ session: null, loading: !!client });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!client) { setState({ session: null, loading: false }); return; }
    let active = true;
    let revision = 0;
    let expiryTimer: ReturnType<typeof setTimeout> | undefined;
    setState({ session: null, loading: true });
    const restoreTimer = setTimeout(() => {
      if (active) setState({ session: null, loading: false, sessionError: 'Nhost no respondió a tiempo. Revisá la conexión y reintentá restaurar la sesión.' });
    }, SESSION_RESTORE_TIMEOUT_MS);
    const update = (session: NhostSession | null) => {
      revision++;
      if (!active) return;
      clearTimeout(restoreTimer);
      clearTimeout(expiryTimer);
      const validSession = professionalSession(session);
      setState({ session: validSession, loading: false, sessionError: session && !validSession ? 'La sesión venció o no tiene acceso profesional. Volvé a ingresar.' : undefined });
      if (validSession) {
        expiryTimer = setTimeout(() => {
          if (active) setState({ session: null, loading: false, sessionError: 'La sesión venció. Reintentá la conexión para renovarla.' });
        }, Math.min(validSession.accessTokenExpiresIn * 1000, 2147483647));
      }
    };
    const stopAuth = client.auth.onAuthStateChanged((_event, session) => update(session));
    const stopToken = client.auth.onTokenChanged(session => update(session));
    const initialRevision = revision;
    void client.auth.isAuthenticatedAsync().then(authenticated => {
      if (active && revision === initialRevision) update(authenticated ? client.auth.getSession() : null);
    }).catch(() => {
      clearTimeout(restoreTimer);
      if (active && revision === initialRevision) setState({ session: null, loading: false, sessionError: 'No se pudo restaurar la sesión. Reintentá la conexión.' });
    });
    return () => { active = false; clearTimeout(restoreTimer); clearTimeout(expiryTimer); stopAuth(); stopToken(); };
  }, [client, attempt]);
  return <AuthContext.Provider value={{ ...state, client, retrySession: () => setAttempt(value => value + 1), configError: client ? undefined : configError ?? nhostConfig.error }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('Falta AuthProvider');
  return context;
}
