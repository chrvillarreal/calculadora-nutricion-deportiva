import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { NhostClient } from '@nhost/nhost-js';
import { AuthProvider } from '../auth/AuthProvider';
import { AthletesPage, AthleteForm } from './AthletesPage';
afterEach(cleanup);

function setup(request = vi.fn().mockResolvedValue({ data: { athletes: [] }, error: null })) {
  const client = { auth: { onAuthStateChanged: () => () => {}, onTokenChanged: () => () => {}, isAuthenticatedAsync: async () => true, getSession: () => ({ accessTokenExpiresIn: 3600, user: { id: 'a', isAnonymous: false, roles: ['user'] } }), getAccessToken: () => 'test-user-token' }, graphql: { request } } as unknown as NhostClient;
  render(<AuthProvider client={client}><AthletesPage /></AuthProvider>);
  return { request, user: userEvent.setup() };
}

describe('pantalla de deportistas', () => {
  it('no muestra ni solicita fichas sin sesión', () => {
    render(<AuthProvider client={null}><AthletesPage /></AuthProvider>);
    expect(screen.getByRole('alert').textContent).toContain('Ingresá');
    expect(screen.queryByText('Mis deportistas')).toBeNull();
  });
  it('muestra carga sin datos anteriores', async () => {
    setup(vi.fn().mockReturnValue(new Promise(() => {})));
    await waitFor(() => expect(screen.getByText('Cargando deportistas…')).toBeTruthy());
  });
  it('muestra vacío y mantiene las escrituras bloqueadas', async () => {
    setup();
    await screen.findByText('No hay deportistas en esta página.');
    expect((screen.getByRole('button', { name: 'Nuevo deportista' }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByRole('status').textContent).toContain('bloqueadas');
  });
  it('muestra listado y notas como texto, sin ejecutar HTML', async () => {
    setup(vi.fn().mockResolvedValue({ data: { athletes: [{ id: '1', full_name: 'Prueba', birth_date: null, notes: '<script>bad()</script>' }] }, error: null }));
    await screen.findByText('Prueba');
    expect(screen.getByText('<script>bad()</script>')).toBeTruthy();
    expect(document.querySelector('script')).toBeNull();
  });
  it('permite reintentar después de un error', async () => {
    const request = vi.fn().mockResolvedValueOnce({ error: {}, data: null }).mockResolvedValue({ error: null, data: { athletes: [] } });
    const { user } = setup(request);
    await user.click(await screen.findByRole('button', { name: 'Reintentar' }));
    await screen.findByText('No hay deportistas en esta página.');
    expect(request).toHaveBeenCalledTimes(2);
  });
  it('valida formulario antes de llamar a guardar', async () => {
    const save = vi.fn(); const user = userEvent.setup();
    render(<AthleteForm disabled={false} onSave={save} onCancel={() => {}} />);
    await user.click(screen.getByRole('button', { name: 'Guardar deportista' }));
    expect(save).not.toHaveBeenCalled();
    expect(screen.getByRole('alert').textContent).toContain('nombre');
  });
  it('envía solo los tres campos editables y muestra error de guardado', async () => {
    const save = vi.fn().mockRejectedValue(new Error('Sin permisos')); const user = userEvent.setup();
    render(<AthleteForm disabled={false} athlete={{ id: '1', full_name: 'Prueba', birth_date: null, notes: null }} onSave={save} onCancel={() => {}} />);
    await user.type(screen.getByLabelText('Notas'), 'Nota');
    await user.click(screen.getByRole('button', { name: 'Guardar deportista' }));
    expect(save).toHaveBeenCalledWith({ full_name: 'Prueba', birth_date: null, notes: 'Nota' });
    expect(screen.getByRole('alert').textContent).toContain('Sin permisos');
  });
});
