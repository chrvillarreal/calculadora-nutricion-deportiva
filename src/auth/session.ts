import type { NhostSession } from '@nhost/nhost-js';

// Comprobación local de estado; la autorización efectiva corresponde a Hasura.
export function professionalSession(session: NhostSession | null) {
  return session && !session.user.isAnonymous && session.user.roles.includes('user')
    && Number.isFinite(session.accessTokenExpiresIn) && session.accessTokenExpiresIn > 0 ? session : null;
}
