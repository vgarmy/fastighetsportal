import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { useUser } from './userContext';

export function Login() {
  const navigate = useNavigate();
  const { setUser } = useUser();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      // Logga in via Supabase auth
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      // Hämta användarens data från fastighets_users
      const { data, error: userError } = await supabase
        .from('fastighets_users')
        .select('*')
        .eq('email', email)
        .single();
      if (userError) throw userError;

      // Spara i context
      setUser(data);

      navigate('/dashboard');

    } catch (e: any) {
      setErr(e?.message ?? 'Kunde inte logga in.');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div
      className="relative min-h-dvh"
      style={{
        backgroundImage:
          'url(https://images.unsplash.com/photo-1501183638710-841dd1904471?q=80&w=1920&auto=format&fit=crop)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Mörk overlay */}
      <div className="absolute inset-0 bg-black/60" aria-hidden="true" />

      {/* Centrerat kort */}
      <div className="relative z-10 flex min-h-dvh items-center justify-center p-4">
        <div className="w-full max-w-md rounded-xl bg-white/90 backdrop-blur shadow-xl">
          <div className="px-6 py-7">
            <h1 className="text-center text-2xl font-semibold text-gray-900">Logga in</h1>
            <p className="mt-1 text-center text-sm text-gray-600">
              Ange e‑post och lösenord som din superadmin gett dig.
            </p>

            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-800">E‑post</label>
                <input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  required
                  placeholder="din@mejl.se"
                  className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none focus:border-gray-900"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-800">Lösenord</label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    placeholder="••••••••"
                    className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 pr-10 text-gray-900 outline-none focus:border-gray-900"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  {/* Ögon-ikon som knapp inuti inputen (högerkant) */}
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-800"
                    aria-label={showPw ? 'Dölj lösenord' : 'Visa lösenord'}
                    aria-pressed={showPw}
                    tabIndex={-1}
                  >
                    {showPw ? (
                      /* EyeSlash ikon (inline SVG) */
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                        fill="currentColor" className="h-5 w-5">
                        <path d="M3.53 2.47a.75.75 0 0 0-1.06 1.06l18 18a.75.75 0 1 0 1.06-1.06l-2.16-2.16c1.16-1.02 2.15-2.26 2.93-3.6a1.76 1.76 0 0 0 0-1.82C20.58 8.01 16.63 5 12 5a10.5 10.5 0 0 0-5.27 1.41L3.53 2.47Zm3.2 4.26A9 9 0 0 1 12 6.5c3.97 0 7.44 2.42 9.54 5.72a.26.26 0 0 1 0 .26 16.05 16.05 0 0 1-3.1 3.6l-2.33-2.33a5 5 0 0 0-6.86-6.86L6.73 6.73Zm4.36 4.36a3.5 3.5 0 0 1 4.82 4.82l-4.82-4.82ZM4.75 9.4a.26.26 0 0 0-.25.4c2.1 3.3 5.57 5.72 9.5 5.72.7 0 1.38-.07 2.03-.21l1.24 1.24A10.6 10.6 0 0 1 12 18.5c-4.63 0-8.58-3.01-11.27-7.14a1.76 1.76 0 0 1 0-1.82A19.7 19.7 0 0 1 4.75 9.4Z" />
                      </svg>
                    ) : (
                      /* Eye ikon */
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                        fill="currentColor" className="h-5 w-5">
                        <path d="M12 5c4.63 0 8.58 3.01 11.27 7.14.4.66.4 1.5 0 2.16C20.58 18.43 16.63 21.44 12 21.44S3.42 18.43.73 14.3a1.76 1.76 0 0 1 0-2.16C3.42 8.01 7.37 5 12 5Zm0 2C8.03 7 4.56 9.42 2.46 12.72a.26.26 0 0 0 0 .26C4.56 16.28 8.03 18.7 12 18.7s7.44-2.42 9.54-5.72a.26.26 0 0 0 0-.26C19.44 9.42 15.97 7 12 7Zm0 2.25A3.75 3.75 0 1 1 8.25 13 3.75 3.75 0 0 1 12 9.25Z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {err && (
                <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                  {err}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="inline-flex w-full items-center justify-center rounded-lg bg-gray-900 px-4 py-2.5 text-white transition hover:bg-black disabled:opacity-60"
              >
                {loading ? 'Loggar in…' : 'Logga in'}
              </button>
            </form>

            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => navigate('/forgot-password')}
                className="text-sm font-medium text-gray-900 underline underline-offset-4 hover:opacity-80"
              >
                Glömt lösenord?
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
