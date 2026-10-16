import { NhostClient } from '@nhost/nhost-js';

export type PublicConfig = { VITE_NHOST_SUBDOMAIN?: string; VITE_NHOST_REGION?: string };

export function readConfig(env: PublicConfig) {
  const subdomain = env.VITE_NHOST_SUBDOMAIN?.trim();
  const region = env.VITE_NHOST_REGION?.trim();
  if (!subdomain || !region) {
    return { error: 'Configurá VITE_NHOST_SUBDOMAIN y VITE_NHOST_REGION para habilitar el acceso profesional.' };
  }
  if (![subdomain, region].every(value => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value))) {
    return { error: 'La configuración pública de Nhost debe contener subdominio y región, sin URLs.' };
  }
  return { subdomain, region };
}

export function createClient(env: PublicConfig) {
  const config = readConfig(env);
  if (config.error || !config.subdomain || !config.region) return { client: null, error: config.error };
  const client = new NhostClient({ subdomain: config.subdomain, region: config.region });
  client.setRole('user');
  return { client, error: undefined };
}

// Solo se leen estas dos variables públicas. Nunca pasar el entorno completo al SDK.
export const nhostConfig = createClient({
  VITE_NHOST_SUBDOMAIN: import.meta.env.VITE_NHOST_SUBDOMAIN,
  VITE_NHOST_REGION: import.meta.env.VITE_NHOST_REGION,
});
