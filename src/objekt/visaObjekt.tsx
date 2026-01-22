
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

type ByggnadLite = {
  id: string;
  namn: string;
  fastighet_id: string;
  fastigheter: FastighetLite | null;
};

type Objekt = {
  id: string;
  namn: string | null;
  typ: string | null;            // t.ex. 'lägenhet', 'förråd', etc.
  plan: string | null;           // våningsplan, text
  kvadratmeter: number | null;
  beskrivning: string | null;
  byggnad_id: string;
  byggnader: ByggnadLite | null; // nested join
  skotare: Skotare[];            // ansvariga för objektet
};

export function VisaByggnadsobjekt() {
  const [objekt, setObjekt] = useState<Objekt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const loadObjekt = async () => {
      setLoading(true);
      setError(null);
      try {
        // Hämta alla objekt + byggnad + fastighet + skötare
        const { data, error: qErr } = await supabase
          .from('byggnad_objekt')
          .select(`
            id,
            namn,
            typ,
            plan,
            kvadratmeter,
            beskrivning,
            byggnad_id,
            byggnader (
              id,
              namn,
              fastighet_id,
              fastigheter ( id, namn, adress )
            ),
            byggnad_objekt_skotare (
              skotare_id ( id, fornamn, efternamn, email )
            )
          `)
          .order('namn', { ascending: true });

        if (qErr) throw qErr;

        const mapped: Objekt[] =
          (data ?? []).map((o: any) => ({
            id: o.id,
            namn: o.namn ?? null,
            typ: o.typ ?? null,
            plan: o.plan ?? null,
            kvadratmeter: o.kvadratmeter ?? null,
            beskrivning: o.beskrivning ?? null,
            byggnad_id: o.byggnad_id,
            byggnader: o.byggnader
              ? {
                  id: o.byggnader.id,
                  namn: o.byggnader.namn,
                  fastighet_id: o.byggnader.fastighet_id,
                  fastigheter: o.byggnader.fastigheter ?? null,
                }
              : null,
            skotare:
              (o.byggnad_objekt_skotare ?? [])
                .map((k: any) => k.skotare_id)
                .filter(Boolean) ?? [],
          })) ?? [];

        setObjekt(mapped);
      } catch (e: any) {
        setError(e.message || 'Ett fel uppstod vid hämtning av byggnadsobjekt.');
      } finally {
        setLoading(false);
      }
    };

    loadObjekt();
  }, []);

  if (loading) return <div className="p-6 text-gray-700">Laddar byggnadsobjekt…</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Alla byggnadsobjekt</h1>
        {/* Snabbknapp — går till objekt-formulär (utan förval) */}
        <button
          onClick={() => navigate('/dashboard/byggnadsobjekt/create')}
          className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition text-sm"
        >
          Lägg till objekt
        </button>
      </div>

      {/* GRID: 3 kort per rad på lg */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {objekt.map((o) => {
          const byggLabel = o.byggnader?.namn || 'Namnlös byggnad';
          const fastLabel =
            o.byggnader?.fastigheter?.namn ||
            o.byggnader?.fastigheter?.adress ||
            'Namnlös fastighet';
          const fastId = o.byggnader?.fastigheter?.id;
          const byggId = o.byggnader?.id;

          const shortDesc =
            o.beskrivning && o.beskrivning.length > 140
              ? o.beskrivning.slice(0, 140) + '…'
              : (o.beskrivning ?? '-');

          return (
            <div
              key={o.id}
              className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-200 overflow-hidden flex flex-col"
            >
              {/* Header-rad med objektets namn och typ */}
              <div className="px-5 pt-5">
                <div className="flex items-start justify-between">
                  <h3 className="text-base font-semibold text-gray-900">
                    {o.namn || 'Namnlöst objekt'}
                  </h3>
                  <span className="text-xs bg-gray-100 text-gray-800 px-2 py-0.5 rounded border">
                    {o.typ || 'okänd'}
                  </span>
                </div>
              </div>

              {/* Innehåll */}
              <div className="p-5 flex-1">
                {/* Tillhör: byggnad & fastighet */}
                <div className="mb-4 space-y-2">
                  <div>
                    <div className="text-gray-500 text-xs">Byggnad</div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{byggLabel}</span>
                      {byggId && (
                        <button
                          onClick={() => navigate(`/dashboard/byggnader/${byggId}`)}
                          className="text-blue-700 hover:text-blue-800 text-xs font-medium"
                        >
                          Visa
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="text-gray-500 text-xs">Fastighet</div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{fastLabel}</span>
                      {fastId && (
                        <button
                          onClick={() => navigate(`/dashboard/fastigheter/${fastId}`)}
                          className="text-blue-700 hover:text-blue-800 text-xs font-medium"
                        >
                          Visa
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Fakta-grid */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-gray-800">
                  <div>
                    <div className="text-gray-500 text-xs">Plan</div>
                    <div className="font-medium">{o.plan ?? '-'}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 text-xs">Area (m²)</div>
                    <div className="font-medium">{o.kvadratmeter ?? '-'}</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-gray-500 text-xs">Beskrivning</div>
                    <div className="font-medium text-gray-800">{shortDesc}</div>
                  </div>
                </div>

                {/* Skötare för objektet */}
                <div className="mt-4">
                  <div className="text-gray-900 font-medium text-sm mb-2">Ansvariga skötare</div>
                  {o.skotare.length === 0 ? (
                    <p className="text-gray-600 text-sm">Ingen ansvarig skötare.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {o.skotare.map((s) => (
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
                {/* Om du bygger en detaljsida för objekt: uppdatera denna route */}
                <button
                  onClick={() => navigate(`/dashboard/objekt/${o.id}`)}
                  className="inline-flex items-center gap-2 text-blue-700 hover:text-blue-800 text-sm font-medium"
                >
                  Visa objekt
                </button>

                <button
                  onClick={() =>
                    navigate(
                      `../objekt/skotarform?fastighet=${o.byggnader?.fastigheter?.id ?? ''}&byggnad=${byggId ?? ''}&objekt=${o.id}`
                    )
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