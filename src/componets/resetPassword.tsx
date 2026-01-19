
import { useState } from 'react';
import { supabase } from '../../frontend/lib/supabase';
import { useNavigate } from 'react-router-dom';

export function ResetPassword() {
  const navigate = useNavigate();
  const [pw1, setPw1] = useState('');
  const [pw2, setPw2] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (pw1.length < 8) return setErr('Lösenordet måste vara minst 8 tecken.');
    if (pw1 !== pw2) return setErr('Lösenorden matchar inte.');
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pw1 });
      if (error) throw error;
      setOk(true);
      setTimeout(() => navigate('/login'), 1200);
    } catch (e:any) {
      setErr(e?.message ?? 'Kunde inte uppdatera lösenordet.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh grid place-items-center p-6">
      <div className="w-full max-w-md rounded-xl border bg-white p-6 shadow">
        <h1 className="text-xl font-semibold">Sätt nytt lösenord</h1>
        <form onSubmit={onSubmit} className="mt-5 space-y-4">
          <input
            type="password"
            required
            placeholder="Nytt lösenord"
            className="block w-full rounded-lg border border-gray-300 px-3 py-2"
            value={pw1}
            onChange={(e)=>setPw1(e.target.value)}
          />
          <input
            type="password"
            required
            placeholder="Upprepa nytt lösenord"
            className="block w-full rounded-lg border border-gray-300 px-3 py-2"
            value={pw2}
            onChange={(e)=>setPw2(e.target.value)}
          />
          {err && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-gray-900 px-4 py-2.5 text-white hover:bg-black disabled:opacity-60"
          >
            {loading ? 'Sparar…' : 'Spara nytt lösenord'}
          </button>
          {ok && <p className="pt-2 text-sm text-green-700">Klart! Du skickas till login…</p>}
        </form>
      </div>
    </div>
  );
}
