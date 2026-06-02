import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate, useSearchParams } from 'react-router-dom';

type Fastighet = {
  id: string;
  namn: string | null;
  adress: string | null;
  kvarter: string | null;
};

type Skotare = {
  id: string;
  fornamn: string;
  efternamn: string;
  email?: string | null;
};

export function FastighetSkotareForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const fastighetIdFromQuery = searchParams.get('fastighet') || '';
  const isEditMode = Boolean(fastighetIdFromQuery);

  const [fastigheter, setFastigheter] = useState<Fastighet[]>([]);
  const [skotare, setSkotare] = useState<Skotare[]>([]);
  const [valdFastighet, setValdFastighet] = useState<string>(fastighetIdFromQuery);
  const [valdaSkotare, setValdaSkotare] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Hämta alla fastigheter
  useEffect(() => {
    const fetchFastigheter = async () => {
      const { data, error } = await supabase
        .from('fastigheter')
        .select('id, namn, adress, kvarter')
        .order('namn', { ascending: true });

      if (error) {
        setError(error.message);
      } else {
        setFastigheter(data ?? []);
      }
    };

    fetchFastigheter();
  }, []);

  // Hämta alla skötare
  useEffect(() => {
    const fetchSkotare = async () => {
      const { data, error } = await supabase
        .from('fastighets_users')
        .select('id, fornamn, efternamn, email')
        .order('efternamn', { ascending: true });

      if (error) {
        setError(error.message);
      } else {
        setSkotare(data ?? []);
      }
    };

    fetchSkotare();
  }, []);

  // Sätt vald fastighet från querystring om den ändras
  useEffect(() => {
    if (fastighetIdFromQuery) {
      setValdFastighet(fastighetIdFromQuery);
    }
  }, [fastighetIdFromQuery]);

  // Hämta redan kopplade skötare för vald fastighet
  useEffect(() => {
    const fetchExistingAssignments = async () => {
      if (!valdFastighet) {
        setValdaSkotare([]);
        setInitialLoading(false);
        return;
      }

      setInitialLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('fastighet_skotare')
        .select('skotare_id')
        .eq('fastighet_id', valdFastighet);

      if (error) {
        setError(error.message);
        setValdaSkotare([]);
      } else {
        setValdaSkotare((data ?? []).map((row: any) => row.skotare_id).filter(Boolean));
      }

      setInitialLoading(false);
    };

    fetchExistingAssignments();
  }, [valdFastighet]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!valdFastighet) {
      setError('Välj en fastighet');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error: deleteError } = await supabase
        .from('fastighet_skotare')
        .delete()
        .eq('fastighet_id', valdFastighet);

      if (deleteError) throw deleteError;

      if (valdaSkotare.length > 0) {
        const inserts = valdaSkotare.map((skotare_id) => ({
          fastighet_id: valdFastighet,
          skotare_id,
          tilldelad_datum: new Date().toISOString(),
        }));

        const { error: insertError } = await supabase
          .from('fastighet_skotare')
          .insert(inserts);

        if (insertError) throw insertError;
      }

      alert(isEditMode ? 'Fastighetsskötare uppdaterade!' : 'Fastighetsskötare sparade!');
      navigate(`/dashboard/fastigheter/${valdFastighet}`);
    } catch (err: any) {
      setError(err.message || 'Ett fel uppstod vid uppdatering.');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="p-8 bg-white rounded-2xl shadow-lg max-w-lg mx-auto space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-2/3 mx-auto" />
          <div className="h-14 bg-gray-100 rounded-lg" />
          <div className="h-40 bg-gray-100 rounded-lg" />
          <div className="h-12 bg-gray-100 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="p-8 bg-white rounded-2xl shadow-lg max-w-lg mx-auto space-y-6"
    >
      <h2 className="text-2xl font-bold text-gray-900 text-center">
        {isEditMode ? 'Uppdatera fastighetsskötare' : 'Koppla fastighetsskötare'}
      </h2>

      {error && (
        <div className="text-red-600 font-medium text-center border border-red-200 bg-red-50 rounded-md p-2">
          {error}
        </div>
      )}

      <div className="space-y-3">
        <label className="block font-semibold text-gray-700">Välj fastighet</label>
        <select
          value={valdFastighet}
          onChange={(e) => setValdFastighet(e.target.value)}
          className="p-3 border border-gray-300 rounded-lg w-full bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
        >
          <option value="">-- Välj fastighet --</option>
          {fastigheter.map((f) => (
            <option key={f.id} value={f.id}>
              {f.namn || f.adress || f.kvarter || 'Unnamed'}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-3">
        <label className="block font-semibold text-gray-700">
          Välj skötare (flera möjliga)
        </label>
        <select
          multiple
          value={valdaSkotare}
          onChange={(e) =>
            setValdaSkotare(Array.from(e.target.selectedOptions, (o) => o.value))
          }
          className="p-3 border border-gray-300 rounded-lg w-full h-40 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
          style={{ color: '#111827' }}
        >
          {skotare.map((s) => (
            <option key={s.id} value={s.id} className="text-gray-900">
              {s.fornamn} {s.efternamn} {s.email ? `(${s.email})` : ''}
            </option>
          ))}
        </select>
        <p className="text-sm text-gray-500">
          Håll nere Ctrl eller Cmd för att välja flera.
        </p>
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex-1 font-semibold cursor-pointer"
        >
          {loading
            ? isEditMode
              ? 'Uppdaterar...'
              : 'Sparar...'
            : isEditMode
              ? 'Uppdatera skötare'
              : 'Spara skötare'}
        </button>
        {isEditMode && (
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="bg-gray-200 text-gray-900 px-4 py-2 rounded hover:bg-gray-300 font-semibold cursor-pointer"
          >
            Tillbaka
          </button>
        )}
      </div>
    </form>
  );
}