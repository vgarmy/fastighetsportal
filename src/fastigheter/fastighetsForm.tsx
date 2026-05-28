import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { useSearchParams } from 'react-router-dom';

interface FastighetFormProps {
  onSaved?: () => void;
}

type Fastighet = {
  id: string;
  namn: string | null;
  adress: string | null;
  kvarter: string | null;
  typ: string[] | null;
  byggår: number | null;
  bild_url: string | null;
};

export function FastighetForm({ onSaved }: FastighetFormProps) {
  const [searchParams] = useSearchParams();
  const id = searchParams.get('id');
  const isEditMode = Boolean(id);

  const navigate = useNavigate();

  const [namn, setNamn] = useState('');
  const [adress, setAdress] = useState('');
  const [kvarter, setKvarter] = useState('');
  const [typ, setTyp] = useState<string[]>([]);
  const [byggar, setByggar] = useState('');
  const [bild, setBild] = useState<File | null>(null);
  const [existingBildUrl, setExistingBildUrl] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [loadingFastighet, setLoadingFastighet] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTypChange = (value: string) => {
    if (typ.includes(value)) {
      setTyp(typ.filter((t) => t !== value));
    } else {
      setTyp([...typ, value]);
    }
  };

  useEffect(() => {
    if (!id) return;

    const loadFastighet = async () => {
      setLoadingFastighet(true);
      setError(null);

      try {
        const { data, error } = await supabase
          .from('fastigheter')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;

        const fastighet = data as Fastighet;

        setNamn(fastighet.namn ?? '');
        setAdress(fastighet.adress ?? '');
        setKvarter(fastighet.kvarter ?? '');
        setTyp(Array.isArray(fastighet.typ) ? fastighet.typ : []);
        setByggar(fastighet.byggår ? String(fastighet.byggår) : '');
        setExistingBildUrl(fastighet.bild_url ?? null);
      } catch (err: any) {
        setError(err.message || 'Kunde inte ladda fastigheten.');
      } finally {
        setLoadingFastighet(false);
      }
    };

    loadFastighet();
  }, [id]);

  const handleSave = async () => {
    setLoading(true);
    setError(null);

    try {
      let bild_url: string | null = existingBildUrl;

      if (bild) {
        const filnamn = `${Date.now()}_${bild.name}`;

        const { error: uploadError } = await supabase.storage
          .from('fastigheter')
          .upload(filnamn, bild, {
            cacheControl: '3600',
            upsert: true,
          });

        if (uploadError) throw uploadError;

        const { data: publicData } = supabase.storage
          .from('fastigheter')
          .getPublicUrl(filnamn);

        bild_url = publicData.publicUrl;
      }

      const payload = {
        namn: namn || null,
        adress: adress || null,
        kvarter: kvarter || null,
        typ: typ.length > 0 ? typ : null,
        byggår: byggar.trim() !== '' ? Number(byggar) : null,
        bild_url,
      };

      if (isEditMode && id) {
        const { error: updateError } = await supabase
          .from('fastigheter')
          .update(payload)
          .eq('id', id);

        if (updateError) throw updateError;

        if (onSaved) onSaved();
        alert('Fastighet uppdaterad!');
        navigate(`/dashboard/fastigheter/${id}`);
      } else {
        const { data: insertedData, error: insertError } = await supabase
          .from('fastigheter')
          .insert([payload])
          .select()
          .single();

        if (insertError) throw insertError;

        setNamn('');
        setAdress('');
        setKvarter('');
        setByggar('');
        setTyp([]);
        setBild(null);
        setExistingBildUrl(null);

        if (onSaved) onSaved();
        alert('Fastighet sparad!');

        if (insertedData?.id) {
          navigate(`/dashboard/fastigheter/${insertedData.id}`);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Ett fel uppstod');
    } finally {
      setLoading(false);
    }
  };

  if (loadingFastighet) {
    return (
      <div className="p-6 bg-white rounded-xl shadow-md max-w-md mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/2" />
          <div className="h-12 bg-gray-100 rounded" />
          <div className="h-12 bg-gray-100 rounded" />
          <div className="h-12 bg-gray-100 rounded" />
          <div className="h-12 bg-gray-100 rounded" />
          <div className="h-12 bg-gray-100 rounded" />
        </div>
      </div>
    );
  }

  return (
    <form className="p-6 bg-white rounded-xl shadow-md max-w-md mx-auto space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">
        {isEditMode ? 'Redigera fastighet' : 'Fastighet'}
      </h2>

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
          <label className="block text-gray-700 font-medium mb-1">
            Typ (valfritt, flera val möjliga)
          </label>
          <div className="flex flex-wrap gap-2">
            {['bostad', 'kommersiell', 'industri', 'mark', 'annan'].map((t) => (
              <button
                type="button"
                key={t}
                onClick={() => handleTypChange(t)}
                className={`cursor-pointer px-3 py-1 rounded-md border ${typ.includes(t)
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-900 border-gray-300 hover:bg-gray-100'
                  }`}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {existingBildUrl && (
          <div className="bg-white p-3 rounded border border-gray-200">
            <label className="block text-gray-900 font-medium mb-2">Nuvarande bild</label>
            <img
              src={existingBildUrl}
              alt="Nuvarande fastighetsbild"
              className="w-full h-40 object-cover rounded-lg border"
            />
          </div>
        )}

        <div className="bg-white p-3 rounded">
          <label className="block text-gray-900 font-medium mb-1">
            {isEditMode ? 'Byt bild (valfritt)' : 'Bild (valfritt)'}
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setBild(e.target.files?.[0] ?? null)}
            className="w-full rounded border border-gray-300 bg-white text-gray-900 p-2 focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer"
          />
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex-1 font-semibold cursor-pointer"
          >
            {loading
              ? isEditMode
                ? 'Uppdaterar...'
                : 'Sparar...'
              : isEditMode
                ? 'Uppdatera fastighet'
                : 'Spara fastighet'}
          </button>

          {isEditMode && (
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="bg-gray-200 text-gray-900 px-4 py-2 rounded hover:bg-gray-300 font-semibold cursor-pointer"
            >
              Avbryt
            </button>
          )}
        </div>
      </div>
    </form>
  );
}