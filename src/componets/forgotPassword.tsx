
import { useState } from 'react';
import { supabase } from '../lib/supabase';

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSent(true);
    } catch (e:any) {
      setErr(e?.message ?? 'Kunde inte skicka återställningsmejl.');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-dvh grid place-items-center p-6">
        <div className="w-full max-w-md rounded-xl border bg-white p-6 shadow">
          <h1 className="text-xl font-semibold">Kolla din e‑post</h1>
          <p className="mt-2 text-sm text-gray-600">
            Vi har skickat en länk för att återställa ditt lösenord (giltig en kort stund).
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh grid place-items-center p-6">
      <div className="w-full max-w-md rounded-xl border bg-white p-6 shadow">
        <h1 className="text-xl font-semibold">Glömt lösenord</h1>
        <p className="mt-1 text-sm text-gray-600">Ange din e‑postadress så skickar vi en länk.</p>
        <form onSubmit={onSubmit} className="mt-5 space-y-4">
          <input
            type="email"
            required
            placeholder="din@mejl.se"
            className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none focus:border-gray-900"
            value={email}
            onChange={(e)=>setEmail(e.target.value)}
          />
          {err && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-gray-900 px-4 py-2.5 text-white hover:bg-black disabled:opacity-60"
          >
            {loading ? 'Skickar…' : 'Skicka länk'}
          </button>
        </form>
      </div>
    </div>
  );
}
