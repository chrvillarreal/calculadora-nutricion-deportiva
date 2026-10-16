import { useState, type FormEvent } from 'react';
import { useAuth } from './AuthProvider';

export function validateCredentials(email: string, password: string, register: boolean) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return 'Ingresá un correo válido.';
  if (!password || (register && password.length < 9)) return register ? 'La contraseña debe tener al menos 9 caracteres.' : 'Ingresá tu contraseña.';
  return null;
}

export function AuthForm() {
  const { client, configError, sessionError } = useAuth();
  const [register, setRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!client || busy) return;
    const invalid = validateCredentials(email, password, register);
    if (invalid) { setError(invalid); return; }
    setBusy(true); setError(''); setMessage('');
    try {
      const result = register
        ? await client.auth.signUp({ email: email.trim(), password })
        : await client.auth.signIn({ email: email.trim(), password });
      if (result.error) {
        setError(register ? 'No se pudo completar el registro. Revisá los datos o intentá más tarde.' : 'No se pudo iniciar sesión. Revisá tus credenciales y la confirmación del correo.');
      } else if (!result.session) {
        setMessage(register ? 'Revisá tu correo para confirmar la cuenta antes de ingresar.' : 'No se obtuvo una sesión. Si tu cuenta requiere MFA, completá el acceso con el proveedor de Nhost.');
      }
      setPassword('');
    } catch {
      setError('No se pudo conectar con Nhost. Intentá nuevamente.');
    } finally { setBusy(false); }
  }
  return <section className="panel auth-panel" aria-labelledby="auth-title">
    <h1 id="auth-title">{register ? 'Crear cuenta profesional' : 'Acceso profesional'}</h1>
    <p>Ingresá para consultar tus deportistas. La calculadora sigue disponible sin cuenta.</p>
    {(configError || sessionError) && <p role="alert">{configError || sessionError}</p>}
    <form onSubmit={submit} noValidate aria-busy={busy}>
      <fieldset disabled={!client || busy} className="form-fields">
        <label>Correo electrónico<input type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required /></label>
        <label>Contraseña<input type="password" autoComplete={register ? 'new-password' : 'current-password'} value={password} onChange={e => setPassword(e.target.value)} minLength={register ? 9 : undefined} required /></label>
        {register && <p className="muted">Usá al menos 9 caracteres. El servidor puede exigir una contraseña más fuerte.</p>}
        <button type="submit">{busy ? 'Procesando…' : register ? 'Registrarme' : 'Ingresar'}</button>
      </fieldset>
    </form>
    {error && <p role="alert" className="error">{error}</p>}
    {message && <p role="status">{message}</p>}
    <button type="button" className="secondary" disabled={busy} onClick={() => { setRegister(!register); setError(''); setMessage(''); setPassword(''); }}>{register ? 'Ya tengo cuenta' : 'Crear una cuenta'}</button>
  </section>;
}
