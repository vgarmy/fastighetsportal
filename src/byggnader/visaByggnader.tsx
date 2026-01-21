
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

type Skotare = {
  id: string;
  fornamn: string;
  efternamn: string;
  email?: string | null;
};

type FastighetLite = {
  id: string;
  namn: string | null;
  adress: string | null;
};

type Byggnad = {
  id: string;
  namn: string;
  typ: string; // 'bostad' | 'kontor' | 'lager' | 'garage' | 'annan'
  våningar: number | null;
  area: number | null;
  byggår: number | null;
  fastighet_id: string;
  fastigheter: FastighetLite | null; // nested join
  skotare: Skotare[]; // ansvariga för byggnaden
};

export function VisaByggnader() {
  const [byggnader, setByggnader] = useState<Byggnad[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const loadByggnader = async () => {
      setLoading(true);
      setError(null);
      try {
        // Hämta alla byggnader + tillhörande fastighet + skötare
        const { data, error: qErr } = await supabase
          .from('byggnader')
          .select(`
            id,
            namn,
            typ,
            våningar,
            area,
            byggår,
            fastighet_id,
            fastigheter ( id, namn, adress ),
            byggnad_skotare (
              skotare_id ( id, fornamn, efternamn, email )
            )
          `)
          .order('namn', { ascending: true });

        if (qErr) throw qErr;

        const mapped: Byggnad[] =
          (data ?? []).map((b: any) => ({
            id: b.id,
            namn: b.namn,
            typ: b.typ,
            våningar: b['våningar'] ?? null,
            area: b.area ?? null,
            byggår: b['byggår'] ?? null,
            fastighet_id: b.fastighet_id,
            fastigheter: b.fastigheter ?? null,
            skotare:
              (b.byggnad_skotare ?? [])
                .map((k: any) => k.skotare_id)
                .filter(Boolean) ?? [],
          })) ?? [];

        setByggnader(mapped);
      } catch (e: any) {
        setError(e.message || 'Ett fel uppstod vid hämtning av byggnader.');
      } finally {
        setLoading(false);
      }
    };

    loadByggnader();
  }, []);

  if (loading) return <div className="p-6 text-gray-700">Laddar byggnader…</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Alla byggnader</h1>
        {/* Snabbknapp — går till formulär utan förvald fastighet */}
        <button
          onClick={() => navigate('/dashboard/byggnader/create')}
          className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition text-sm"
        >
          Lägg till byggnad
        </button>
      </div>

      {/* GRID: 3 kort per rad på lg (ändra gärna till lg:grid-cols-4 om du vill) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {byggnader.map((b) => {
          const fastLabel = b.fastigheter?.namn || b.fastigheter?.adress || 'Namnlös fastighet';
          return (
            <div
              key={b.id}
              className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-200 overflow-hidden flex flex-col"
            >
              {/* Header-rad med byggnadsnamn och typ */}
              <div className="px-5 pt-5">
                <div className="flex items-start justify-between">
                  <h3 className="text-base font-semibold text-gray-900">{b.namn}</h3>
                  <span className="text-xs bg-gray-100 text-gray-800 px-2 py-0.5 rounded border">
                    {b.typ}
                  </span>
                </div>
              </div>

              {/* Innehåll */}
              <div className="p-5 flex-1">
                {/* Fastighet info */}
                <div className="mb-4">
                  <div className="text-gray-500 text-xs">Fastighet</div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{fastLabel}</span>
                    {b.fastigheter?.id && (
                      <button
                        onClick={() => navigate(`/dashboard/fastigheter/${b.fastigheter!.id}`)}
                        className="text-blue-700 hover:text-blue-800 text-xs font-medium"
                      >
                        Visa
                      </button>
                    )}
                  </div>
                </div>

                {/* Fakta-grid */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-gray-800">
                  <div>
                    <div className="text-gray-500 text-xs">Våningar</div>
                    <div className="font-medium">{b['våningar'] ?? '-'}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 text-xs">Area (m²)</div>
                    <div className="font-medium">{b.area ?? '-'}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 text-xs">Byggår</div>
                    <div className="font-medium">{b['byggår'] ?? '-'}</div>
                  </div>
                </div>

                {/* Skötare för byggnaden */}
                <div className="mt-4">
                  <div className="text-gray-900 font-medium text-sm mb-2">Ansvariga skötare</div>
                  {b.skotare.length === 0 ? (
                    <p className="text-gray-600 text-sm">Ingen ansvarig skötare.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {b.skotare.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => navigate(`/dashboard/users/${s.id}`)}
                          className="bg-indigo-50 text-indigo-900 px-3 py-1 rounded border border-indigo-200 hover:bg-indigo-100 transition text-xs"
                        >
                          {s.fornamn} {s.efternamn}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Åtgärder */}
              <div className="px-5 pb-5 pt-0 flex flex-wrap gap-2">
                <button
                  onClick={() => navigate(`/dashboard/byggnader/${b.id}`)}
                  className="inline-flex items-center gap-2 text-blue-700 hover:text-blue-800 text-sm font-medium"
                >
                  Visa byggnadsdetaljer
                </button>

                <button
                  onClick={() =>
                    navigate(`/dashboard/byggnader/skotarform?fastighet=${b.fastighet_id}&byggnad=${b.id}`)
                  }
                  className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700 transition"
                >
                  Tilldela skötare
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
