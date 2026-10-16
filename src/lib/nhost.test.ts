import { describe, expect, it } from 'vitest';
import { readConfig, createClient } from './nhost';

describe('configuración pública Nhost', () => {
  it('no crea un cliente sin las dos variables', () => {
    expect(createClient({}).client).toBeNull();
    expect(readConfig({ VITE_NHOST_SUBDOMAIN: 'project' }).error).toContain('VITE_NHOST_REGION');
  });
  it('rechaza URLs y hosts inyectados', () => {
    expect(readConfig({ VITE_NHOST_SUBDOMAIN: 'https://evil.test', VITE_NHOST_REGION: 'sa-east-1' }).error).toBeTruthy();
  });
  it('normaliza únicamente la configuración pública admitida', () => {
    expect(readConfig({ VITE_NHOST_SUBDOMAIN: ' project ', VITE_NHOST_REGION: ' sa-east-1 ' })).toEqual({ subdomain: 'project', region: 'sa-east-1' });
  });
});
