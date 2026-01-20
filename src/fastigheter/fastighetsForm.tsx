import { useState } from 'react';
import { supabase } from '../lib/supabase';

interface FastighetFormProps {
  onSaved?: () => void;
}

export function FastighetForm({ onSaved }: FastighetFormProps) {
  const [namn, setNamn] = useState('');
  const [adress, setAdress] = useState('');
  const [kvarter, setKvarter] = useState('');
  const [typ, setTyp] = useState<string[]>([]);
  const [byggar, setByggar] = useState('');
  const [bild, setBild] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTypChange = (value: string) => {
    if (typ.includes(value)) setTyp(typ.filter((t) => t !== value));
    else setTyp([...typ, value]);
  };

  const handleSave = async () => {
    setLoading(true);
    setError(null);

    try {
      let bild_url: string | null = null;

      if (bild) {
        const filnamn = `${Date.now()}_${bild.name}`;
        const { error: uploadError } = await supabase.storage
          .from('fastigheter')
          .upload(filnamn, bild, { cacheControl: '3600', upsert: true });

        if (uploadError) throw uploadError;

        const { data: publicData } = supabase.storage
          .from('fastigheter')
          .getPublicUrl(filnamn);

        bild_url = publicData.publicUrl;
      }

      const { error: insertError } = await supabase.from('fastigheter').insert([
        {
          namn: namn || null,
          adress: adress || null,
          kvarter: kvarter || null,
          typ: typ.length > 0 ? typ : null,
          byggår: byggar || null,
          bild_url,
        },
      ]);

      if (insertError) throw insertError;

      // Rensa formulär
      setNamn('');
      setAdress('');
      setKvarter('');
      setByggar('');
      setTyp([]);
      setBild(null);

      if (onSaved) onSaved();
      alert('Fastighet sparad!');
    } catch (err: any) {
      setError(err.message || 'Ett fel uppstod');
    } finally {
      setLoading(false);
    }
  };
  return (
    <form className="p-6 bg-white rounded-xl shadow-md max-w-md mx-auto space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">Fastighet</h2>

      {error && <div className="text-red-600 font-medium text-center">{error}</div>}

      <div className="space-y-3">
        <div>
          <label className="block text-gray-700 font-medium mb-1">Namn (valfritt)</label>
          <input
            value={namn}
            onChange={(e) => setNamn(e.target.value)}
            placeholder="T.ex. Domkyrkan"
            className="p-3 border rounded w-full bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        <div>
          <label className="block text-gray-700 font-medium mb-1">Adress (valfritt)</label>
          <input
            value={adress}
            onChange={(e) => setAdress(e.target.value)}
            placeholder="T.ex. Sjövägen 12"
            className="p-3 border rounded w-full bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        <div>
          <label className="block text-gray-700 font-medium mb-1">Kvarter (valfritt)</label>
          <input
            value={kvarter}
            onChange={(e) => setKvarter(e.target.value)}
            placeholder="T.ex. Gamla Stan"
            className="p-3 border rounded w-full bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        <div>
          <label className="block text-gray-700 font-medium mb-1">Byggår (valfritt)</label>
          <input
            value={byggar}
            onChange={(e) => setByggar(e.target.value)}
            placeholder="T.ex. 1985"
            className="p-3 border rounded w-full bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        <div>
          <label className="block text-gray-700 font-medium mb-1">Typ (valfritt, flera val möjliga)</label>
          <div className="flex flex-wrap gap-2">
            {['bostad', 'kommersiell', 'industri', 'mark', 'annan'].map((t) => (
              <button
                type="button"
                key={t}
                onClick={() => handleTypChange(t)}
                className={`px-3 py-1 rounded-md border ${typ.includes(t)
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-900 border-gray-300 hover:bg-gray-100'
                  }`}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>

<div className="bg-white p-3 rounded">
  <label className="block text-gray-900 font-medium mb-1">Bild (valfritt)</label>
  <input
    type="file"
    accept="image/*"
    onChange={(e) => setBild(e.target.files?.[0] ?? null)}
    className="w-full rounded border border-gray-300 bg-white text-gray-900 p-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
  />
</div>

        <button
          type="button"
          onClick={handleSave}
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 w-full font-semibold"
        >
          {loading ? 'Sparar...' : 'Spara fastighet'}
        </button>
      </div>
    </form>
  );
}