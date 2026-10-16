import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { NhostClient, NhostSession } from '@nhost/nhost-js';
import { nhostConfig } from '../lib/nhost';

type AuthState = {
  client: NhostClient | null;
  session: NhostSession | null;
  loading: boolean;
  configError?: string;
  sessionError?: string;
};
const AuthContext = createContext<AuthState | null>(null);

function professionalSession(session: NhostSession | null) {
  return session && !session.user.isAnonymous && session.user.roles.includes('user') ? session : null;
}

export function AuthProvider({ children, client = nhostConfig.client, configError }: {
  children: ReactNode; client?: NhostClient | null; configError?: string;
}) {
  const [state, setState] = useState<{ session: NhostSession | null; loading: boolean; sessionError?: string }>({ session: null, loading: !!client });
  useEffect(() => {
    if (!client) { setState({ session: null, loading: false }); return; }
    let active = true;
    let revision = 0;
    const update = (session: NhostSession | null) => {
      revision++;
      if (active) setState({ session: professionalSession(session), loading: false });
    };
    const stopAuth = client.auth.onAuthStateChanged((_event, session) => update(session));
    const stopToken = client.auth.onTokenChanged(session => update(session));
    const initialRevision = revision;
    void client.auth.isAuthenticatedAsync().then(() => {
      if (active && revision === initialRevision) update(client.auth.getSession());
    }).catch(() => {
      if (active && revision === initialRevision) setState({ session: null, loading: false, sessionError: 'No se pudo restaurar la sesión. Volvé a ingresar.' });
    });
    return () => { active = false; stopAuth(); stopToken(); };
  }, [client]);
  return <AuthContext.Provider value={{ ...state, client, configError: client ? undefined : configError ?? nhostConfig.error }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('Falta AuthProvider');
  return context;
}
