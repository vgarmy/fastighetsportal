
import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';

export default function App() {
  const [ok, setOk] = useState<'pending'|'ok'|'fail'>('pending');
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        // Ett oskyldigt "ping": fråga auth-klienten om session
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        setOk('ok');
      } catch (e:any) {
        setErr(e.message);
        setOk('fail');
      }
    })();
  }, []);

  if (ok === 'pending') return <p>Kontrollerar koppling till Supabase…</p>;
  if (ok === 'fail') return <p className="text-red-600">Koppling misslyckades: {err}</p>;
  return <p className="text-green-700">Supabase är kopplat! ✨</p>;
}
