import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { NhostClient } from '@nhost/nhost-js';
import { AuthForm, validateCredentials } from './AuthForm';
import { AuthProvider } from './AuthProvider';

afterEach(cleanup);
function setup(result: unknown = { error: null, session: null }) {
  const signIn = vi.fn().mockResolvedValue(result);
  const signUp = vi.fn().mockResolvedValue(result);
  const client = { auth: { signIn, signUp, onAuthStateChanged: () => () => {}, onTokenChanged: () => () => {}, isAuthenticatedAsync: async () => false, getSession: () => null } } as unknown as NhostClient;
  render(<AuthProvider client={client}><AuthForm /></AuthProvider>);
  return { signIn, signUp, user: userEvent.setup() };
}
async function fill(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Correo electrónico'), 'pro@example.test');
  await user.type(screen.getByLabelText('Contraseña'), 'test-password-123');
}
describe('acceso profesional', () => {
  it('permite usar la pantalla sin configuración y bloquea envíos', () => {
    render(<AuthProvider client={null} configError="Configuración pendiente"><AuthForm /></AuthProvider>);
    expect(screen.getByRole('alert').textContent).toContain('Configuración pendiente');
    expect(screen.getByRole('button', { name: 'Ingresar' }).matches(':disabled')).toBe(true);
  });
  it('valida correo y longitud de contraseña en registro', () => {
    expect(validateCredentials('bad', '123456789', true)).toContain('correo');
    expect(validateCredentials('a@b.test', '123', true)).toContain('9 caracteres');
  });
  it('no llama al SDK con formulario inválido', async () => {
    const { user, signIn } = setup();
    await user.click(screen.getByRole('button', { name: 'Ingresar' }));
    expect(signIn).not.toHaveBeenCalled();
    expect(screen.getByRole('alert').textContent).toContain('correo');
  });
  it('inicia sesión con la API verificada del SDK', async () => {
    const { user, signIn } = setup({ error: null, session: { user: { id: 'a' } } });
    await fill(user); await user.click(screen.getByRole('button', { name: 'Ingresar' }));
    expect(signIn).toHaveBeenCalledWith({ email: 'pro@example.test', password: 'test-password-123' });
    expect((screen.getByLabelText('Contraseña') as HTMLInputElement).value).toBe('');
  });
  it('explica la confirmación por correo al registrar sin sesión', async () => {
    const { user, signUp } = setup();
    await user.click(screen.getByRole('button', { name: 'Crear una cuenta' }));
    await fill(user); await user.click(screen.getByRole('button', { name: 'Registrarme' }));
    expect(signUp).toHaveBeenCalled();
    expect(screen.getByRole('status').textContent).toContain('confirmar');
  });
  it('muestra error genérico sin exponer la respuesta del servidor', async () => {
    const { user } = setup({ error: { message: 'sensitive server detail' }, session: null });
    await fill(user); await user.click(screen.getByRole('button', { name: 'Ingresar' }));
    expect(screen.getByRole('alert').textContent).toContain('No se pudo iniciar sesión');
    expect(screen.queryByText(/sensitive server/)).toBeNull();
  });
  it('muestra carga y bloquea envíos duplicados', async () => {
    const { user, signIn } = setup();
    let resolve!: (value: unknown) => void;
    signIn.mockReturnValue(new Promise(done => { resolve = done; }));
    await fill(user); await user.click(screen.getByRole('button', { name: 'Ingresar' }));
    expect(screen.getByRole('button', { name: 'Procesando…' }).matches(':disabled')).toBe(true);
    resolve({ error: null, session: null });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Ingresar' })).toBeTruthy());
  });
  it('maneja fallos de red', async () => {
    const { user, signIn } = setup(); signIn.mockRejectedValue(new Error('network'));
    await fill(user); await user.click(screen.getByRole('button', { name: 'Ingresar' }));
    expect(screen.getByRole('alert').textContent).toContain('conectar');
  });
});
