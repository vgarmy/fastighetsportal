
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

type Skotare = {
  id: string;
  fornamn: string;
  efternamn: string;
};

type Fastighet = {
  id: string;
  namn: string | null;
  adress: string | null;
  kvarter: string | null;
  typ: string[] | null;
  byggår: number | null;
  skotare: Skotare[];
  bild_url: string | null;
};

export function VisaFastigheter() {
  const [fastigheter, setFastigheter] = useState<Fastighet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const loadFastigheter = async () => {
      setLoading(true);
      try {
        // Hämta alla fastigheter
        const { data: fastData, error: fastError } = await supabase
          .from('fastigheter')
          .select('*')
          .order('kvarter', { ascending: true });

        if (fastError) throw fastError;
        if (!fastData) {
          setFastigheter([]);
          setLoading(false);
          return;
        }

        // Hämta skötare kopplade till fastighet
        const fastighetIds = fastData.map((f) => f.id);
        const { data: skotData, error: skotError } = await supabase
          .from('fastighet_skotare')
          .select('fastighet_id, skotare_id(id, fornamn, efternamn)')
          .in('fastighet_id', fastighetIds);

        if (skotError) throw skotError;

        // Koppla skötare till rätt fastighet
        const fastigheterWithSkotare: Fastighet[] = fastData.map((f) => {
          const skotare: Skotare[] =
            skotData
              ?.filter((s: any) => s.fastighet_id === f.id)
              .map((s: any) => {
                // Supabase kan returnera skotare_id som array eller objekt
                if (Array.isArray(s.skotare_id)) return s.skotare_id[0];
                return s.skotare_id;
              })
              .filter(Boolean) ?? [];
          return { ...f, skotare };
        });

        setFastigheter(fastigheterWithSkotare);
      } catch (err: any) {
        setError(err.message || 'Ett fel uppstod');
      } finally {
        setLoading(false);
      }
    };

    loadFastigheter();
  }, []);

  if (loading) return <div className="p-6 text-gray-700">Laddar fastigheter…</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  // Generisk fallback-bild (Unsplash, neutral byggnad)
  const fallbackImg =
    'https://images.unsplash.com/photo-1494526585095-c41746248156?q=80&w=1200&auto=format&fit=crop';

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Alla fastigheter</h1>

      {/* GRID: 3 cards per rad på desktop */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {fastigheter.map((f) => (
          <div
            key={f.id}
            className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-200 overflow-hidden flex flex-col"
          >
            {/* Bild överst, 300px hög */}
            <div className="w-full h-[300px] bg-gray-100">
              <img
                src={f.bild_url || fallbackImg}
                alt={f.namn ?? 'Fastighet'}
                loading="lazy"
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.currentTarget as HTMLImageElement;
                  if (target.src !== fallbackImg) target.src = fallbackImg;
                }}
              />
            </div>

            {/* Innehåll */}
            <div className="p-6 flex flex-col gap-4">
              <div className="text-gray-800 space-y-1">
                <p>
                  <span className="font-medium">Namn:</span> {f.namn ?? '-'}
                </p>
                <p>
                  <span className="font-medium">Adress:</span> {f.adress ?? '-'}
                </p>
                <p>
                  <span className="font-medium">Kvarter:</span> {f.kvarter ?? '-'}
                </p>
                <p>
                  <span className="font-medium">Typ:</span>{' '}
                  {Array.isArray(f.typ) ? (f.typ.length ? f.typ.join(', ') : '-') : f.typ ?? '-'}
                </p>
                <p>
                  <span className="font-medium">Byggår:</span> {f.byggår ?? '-'}
                </p>

                <p className="font-medium pt-2">Skötare:</p>
                {(f.skotare?.length ?? 0) === 0 ? (
                  <p className="text-gray-700 ml-4">Ingen skötare kopplad</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {f.skotare.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => navigate(`/dashboard/users/${s.id}`)}
                        className="bg-blue-50 text-blue-900 px-3 py-1 rounded hover:bg-blue-100 transition text-sm border border-blue-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                      >
                        {s.fornamn} {s.efternamn}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-2">
                <button
                  onClick={() => navigate(`/dashboard/fastigheter/${f.id}`)}
                  className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  Visa detaljer
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 opacity-90"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10.293 3.293a1 1 0 011.414 0l5 5a.997.997 0 010 1.414l-5 5a1 1 0 11-1.414-1.414L13.586 11H4a1 1 0 110-2h9.586l-3.293-3.293a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
