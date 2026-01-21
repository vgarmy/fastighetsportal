
import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useParams, useNavigate } from 'react-router-dom';

type Skotare = {
  id: string;
  fornamn: string;
  efternamn: string;
  email?: string | null;
};

type Fastighet = {
  id: string;
  namn: string | null;
  adress: string | null;
  kvarter: string | null;
  typ: string[] | null;
  byggår: number | null;
  bild_url: string | null;
};

type Byggnad = {
  id: string;
  namn: string;
  typ: string; // 'bostad' | 'kontor' | 'lager' | 'garage' | 'annan'
  våningar: number | null;
  area: number | null;
  byggår: number | null;
  skotare: Skotare[]; // ansvariga för byggnaden
};

export function FastighetDetaljer() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [fastighet, setFastighet] = useState<Fastighet | null>(null);
  const [fastighetSkotare, setFastighetSkotare] = useState<Skotare[]>([]);
  const [byggnader, setByggnader] = useState<Byggnad[]>([]);

  const fallbackImg =
    'https://images.unsplash.com/photo-1494526585095-c41746248156?q=80&w=1600&auto=format&fit=crop';

  useEffect(() => {
    if (!id) return;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        // 1) Fastighet
        const { data: f, error: fErr } = await supabase
          .from('fastigheter')
          .select('*')
          .eq('id', id)
          .single();

        if (fErr) throw fErr;

        // 2) Fastighetsskötare (join)
        const { data: fsData, error: fsErr } = await supabase
          .from('fastighet_skotare')
          .select('skotare_id(id, fornamn, efternamn, email)')
          .eq('fastighet_id', id);

        if (fsErr) throw fsErr;

        const fastSkotare: Skotare[] = (fsData ?? [])
          .map((row: any) => row.skotare_id)
          .filter(Boolean);

        // 3) Byggnader + deras skötare
        const { data: bData, error: bErr } = await supabase
          .from('byggnader')
          .select(`
            id,
            namn,
            typ,
            våningar,
            area,
            byggår,
            byggnad_skotare (
              skotare_id ( id, fornamn, efternamn, email )
            )
          `)
          .eq('fastighet_id', id)
          .order('namn', { ascending: true });

        if (bErr) throw bErr;

        const byggnaderMapped: Byggnad[] = (bData ?? []).map((b: any) => ({
          id: b.id,
          namn: b.namn,
          typ: b.typ,
          våningar: b['våningar'] ?? null,
          area: b.area ?? null,
          byggår: b['byggår'] ?? null,
          skotare:
            (b.byggnad_skotare ?? [])
              .map((k: any) => k.skotare_id)
              .filter(Boolean) ?? [],
        }));

        setFastighet(f as Fastighet);
        setFastighetSkotare(fastSkotare);
        setByggnader(byggnaderMapped);
      } catch (e: any) {
        setError(e.message || 'Kunde inte ladda fastighetens detaljer.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

  const title = useMemo(() => {
    if (!fastighet) return 'Fastighet';
    return fastighet.namn || fastighet.adress || fastighet.kvarter || 'Fastighet';
  }, [fastighet]);

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="w-full h-52 rounded-xl bg-gray-200 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-40 bg-gray-100 rounded-xl animate-pulse" />
          <div className="h-40 bg-gray-100 rounded-xl animate-pulse" />
        </div>
        <div className="h-64 bg-gray-100 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-red-600 font-medium">{error}</div>
      </div>
    );
  }

  if (!fastighet) {
    return (
      <div className="p-6">
        <div className="text-gray-700">Fastigheten kunde inte hittas.</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      {/* Header med bild */}
      <div className="relative overflow-hidden rounded-2xl border border-gray-200 shadow-sm">
        <div className="w-full h-[220px] bg-gray-100">
          <img
            src={fastighet.bild_url || fallbackImg}
            alt={title}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={(e) => {
              const target = e.currentTarget as HTMLImageElement;
              if (target.src !== fallbackImg) target.src = fallbackImg;
            }}
          />
        </div>
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-5 py-4">
          <h1 className="text-2xl md:text-3xl font-bold text-white drop-shadow">{title}</h1>
        </div>
      </div>

      {/* Info + Fastighetsskötare */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Info-kort */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Information om fastigheten</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-gray-800">
            <div>
              <div className="text-gray-500 text-sm">Namn</div>
              <div className="font-medium">{fastighet.namn ?? '-'}</div>
            </div>
            <div>
              <div className="text-gray-500 text-sm">Adress</div>
              <div className="font-medium">{fastighet.adress ?? '-'}</div>
            </div>
            <div>
              <div className="text-gray-500 text-sm">Kvarter</div>
              <div className="font-medium">{fastighet.kvarter ?? '-'}</div>
            </div>
            <div>
              <div className="text-gray-500 text-sm">Typ(er)</div>
              <div className="font-medium">
                {Array.isArray(fastighet.typ) ? (fastighet.typ.length ? fastighet.typ.join(', ') : '-') : fastighet.typ ?? '-'}
              </div>
            </div>
            <div>
              <div className="text-gray-500 text-sm">Byggår</div>
              <div className="font-medium">{fastighet.byggår ?? '-'}</div>
            </div>
          </div>
        </div>

        {/* Fastighetsskötare */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Fastighetsskötare</h2>
            <button
              onClick={() => navigate(`/dashboard/tilldela/fastighet-skotare?fastighet=${fastighet.id}`)}
              className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700 transition"
            >
              Hantera
            </button>
          </div>

          {fastighetSkotare.length === 0 ? (
            <p className="text-gray-700">Ingen skötare kopplad ännu.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {fastighetSkotare.map((s) => (
                <button
                  key={s.id}
                  onClick={() => navigate(`/dashboard/users/${s.id}`)}
                  className="bg-blue-50 text-blue-900 px-3 py-1.5 rounded border border-blue-200 hover:bg-blue-100 transition text-sm"
                >
                  {s.fornamn} {s.efternamn}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Byggnader */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Byggnader som tillhör fastigheten</h2>
          <div className="flex gap-2">
            <button
              onClick={() => navigate(`../byggnader/create?fastighet=${fastighet.id}`)}
              className="text-sm bg-green-600 text-white px-3 py-1.5 rounded-md hover:bg-green-700 transition"
            >
              Lägg till byggnad
            </button>
            <button
              onClick={() => navigate(`../byggnader/skotarform?fastighet=${fastighet.id}`)}
              className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700 transition"
            >
              Tilldela skötare
            </button>
          </div>
        </div>

        {byggnader.length === 0 ? (
          <p className="text-gray-700">Inga byggnader registrerade ännu.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {byggnader.map((b) => (
              <div
                key={b.id}
                className="rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow bg-white overflow-hidden flex flex-col"
              >
                <div className="p-5 flex-1">
                  <div className="flex items-start justify-between">
                    <h3 className="text-base font-semibold text-gray-900">{b.namn}</h3>
                    <span className="text-xs bg-gray-100 text-gray-800 px-2 py-0.5 rounded border">
                      {b.typ}
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-gray-800">
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

                <div className="p-5 pt-0">
                  <button
                    onClick={() => navigate(`/dashboard/byggnader/${b.id}`)}
                    className="inline-flex items-center gap-2 text-blue-700 hover:text-blue-800 text-sm font-medium"
                  >
                    Visa byggnadsdetaljer
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l5 5a.997.997 0 010 1.414l-5 5a1 1 0 11-1.414-1.414L13.586 11H4a1 1 0 110-2h9.586l-3.293-3.293a1 1 0 010-1.414z" clipRule="evenodd"/>
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}