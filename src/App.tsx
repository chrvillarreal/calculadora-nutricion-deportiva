import { useEffect, useState } from 'react';
import { Calculator } from './Calculator';
import { AuthForm } from './auth/AuthForm';
import { useAuth } from './auth/AuthProvider';
import { AthletesPage } from './athletes/AthletesPage';

export function App() {
  const { loading, session, client } = useAuth();
  const [route, setRoute] = useState(window.location.hash || '#calculadora');
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    const change = () => { setRoute(window.location.hash || '#calculadora'); setError(''); };
    window.addEventListener('hashchange', change);
    return () => window.removeEventListener('hashchange', change);
  }, []);
  async function signOut() {
    if (!client || signingOut) return;
    setSigningOut(true); setError('');
    try {
      const result = await client.auth.signOut();
      if (result.error) { setError('No se pudo cerrar la sesión. Intentá nuevamente.'); return; }
      window.location.hash = '#calculadora';
    } catch { setError('No se pudo cerrar la sesión. Revisá la conexión.'); }
    finally { setSigningOut(false); }
  }
  return <main><header>
    <div className="brand">NUTRISPORT <span>LAB</span></div><p>Evaluación nutricional deportiva</p>
    <nav aria-label="Navegación principal" className="actions">
      <a href="#calculadora" aria-current={route === '#calculadora' ? 'page' : undefined}>Calculadora</a>
      <a href="#deportistas" aria-current={route === '#deportistas' ? 'page' : undefined}>Deportistas</a>
      {session ? <button className="secondary" onClick={signOut} disabled={signingOut}>{signingOut ? 'Cerrando sesión…' : 'Cerrar sesión'}</button> : <a href="#acceso">Acceso profesional</a>}
    </nav>
  </header>
  {error && <p role="alert" className="error">{error}</p>}
  {route === '#calculadora' || !['#acceso', '#deportistas'].includes(route) ? <Calculator /> : loading ? <p role="status">Restaurando sesión…</p> : session ? <AthletesPage key={session.user.id} /> : <AuthForm />}
  </main>;
}
