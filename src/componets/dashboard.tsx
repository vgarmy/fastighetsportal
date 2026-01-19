
// src/features/app/Dashboard.tsx
import { supabase } from '../lib/supabase';
import { useEffect, useState } from 'react';

export function Dashboard() {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setEmail(data.user?.email ?? null);
    })();
  }, []);

  return (
    <div className="min-h-dvh grid place-items-center p-8">
      <div className="w-full max-w-xl rounded-xl border bg-white p-6 shadow">
        <h1 className="text-2xl font-semibold">Välkommen</h1>
        <p className="mt-2 text-gray-700">
          {email ? `Inloggad som ${email}` : 'Hämtar användare…'}
        </p>
      </div>
    </div>
  );
}
