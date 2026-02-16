
// pages/ByggnadDetaljer.tsx
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useParams, useNavigate, createSearchParams } from 'react-router-dom';

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

type ObjektLite = {
  id: string;
  namn: string | null;
  typ: string | null;
  plan: string | null;
  kvadratmeter: number | null;
};

type Byggnad = {
  id: string;
  namn: string;
  typ: string;
  våningar: number | null;
  area: number | null;
  byggår: number | null;
  fastighet_id: string;
  fastigheter: FastighetLite | null;
  skotare: Skotare[];
  objekt: ObjektLite[];
};

type TabKey = 'oversikt' | 'objekt' | 'skotare' | 'historik';

export function ByggnadDetaljer() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [byggnad, setByggnad] = useState<Byggnad | null>(null);
  const [tab, setTab] = useState<TabKey>('oversikt');
  const [objektSok, setObjektSok] = useState('');

  useEffect(() => {
    if (!id) return;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        // Aliasera å/ä/ö → ASCII för att slippa Supabase-parserfel
        const { data: byggRaw, error: bErr } = await supabase
          .from('byggnader')
          .select(`
            id,
            namn,
            typ,
            vaningar:våningar,
            area,
            byggar:byggår,
            fastighet_id,
            fastigheter ( id, namn, adress ),
            byggnad_skotare ( skotare_id ( id, fornamn, efternamn, email ) )
          `)
          .eq('id', id)
          .single();

        if (bErr) throw bErr;
        if (!byggRaw) throw new Error('Byggnaden kunde inte hittas.');

        // ⛑️ Lokal cast för att undvika TS ParserError på nested relationer
        const byggData: any = byggRaw;

        const fastRelRaw = byggData.fastigheter ?? null;
        const fastRel: FastighetLite | null = Array.isArray(fastRelRaw)
          ? (fastRelRaw[0] ?? null)
          : fastRelRaw;

        const skotare: Skotare[] =
          (byggData.byggnad_skotare ?? [])
            .map((k: any) => k.skotare_id)
            .filter(Boolean) ?? [];

        // Hämta objekt i byggnaden
        const { data: objRaw, error: oErr } = await supabase
          .from('byggnad_objekt')
          .select(`
            id,
            namn,
            typ,
            plan,
            kvadratmeter
          `)
          .eq('byggnad_id', id)
          .order('namn', { ascending: true });

        if (oErr) throw oErr;

        const objData: any[] = objRaw ?? [];

        const mapped: Byggnad = {
          id: byggData.id,
          namn: byggData.namn,
          typ: byggData.typ,
          våningar: byggData.vaningar ?? null, // ← alias tillbaka
          area: byggData.area ?? null,
          byggår: byggData.byggar ?? null,     // ← alias tillbaka
          fastighet_id: byggData.fastighet_id,
          fastigheter: fastRel,
          skotare,
          objekt: objData.map((o: any) => ({
            id: o.id,
            namn: o.namn ?? null,
            typ: o.typ ?? null,
            plan: o.plan ?? null,
            kvadratmeter: o.kvadratmeter ?? null,
          })),
        };

        setByggnad(mapped);
      } catch (e: any) {
        setError(e.message || 'Kunde inte hämta byggnadsdetaljer.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

  const fastLabel =
    byggnad?.fastigheter?.namn ||
    byggnad?.fastigheter?.adress ||
    'Namnlös fastighet';

  const filteredObjekt = useMemo(() => {
    if (!byggnad) return [];
    if (!objektSok) return byggnad.objekt;
    const q = objektSok.toLowerCase();
    return byggnad.objekt.filter((o) =>
      (o.namn ?? '').toLowerCase().includes(q) ||
      (o.typ ?? '').toLowerCase().includes(q) ||
      (o.plan ?? '').toLowerCase().includes(q)
    );
  }, [byggnad, objektSok]);

  const handleRemoveSkotare = async (skotare_id: string) => {
    if (!byggnad) return;
    setSaving(true);
    setError(null);
    try {
      const { error: delErr } = await supabase
        .from('byggnad_skotare')
        .delete()
        .match({ byggnad_id: byggnad.id, skotare_id });

      if (delErr) throw delErr;

      setByggnad(prev =>
        prev ? { ...prev, skotare: prev.skotare.filter(s => s.id !== skotare_id) } : prev
      );
    } catch (e: any) {
      setError(e.message || 'Kunde inte ta bort skötare.');
    } finally {
      setSaving(false);
    }
  };

  // ---------- UI ----------
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="w-full h-24 rounded-2xl bg-gray-200 animate-pulse" />
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
      <div>
        <div className="text-red-600 font-medium">{error}</div>
      </div>
    );
  }

  if (!byggnad) {
    return (
      <div>
        <div className="text-gray-700">Byggnaden kunde inte hittas.</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* HEADER */}
      <div className="rounded-2xl border border-gray-200 shadow-sm bg-white px-5 py-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{byggnad.namn}</h1>
              <span className="text-xs bg-gray-100 text-gray-800 px-2 py-0.5 rounded border">
                {byggnad.typ}
              </span>
            </div>
            <div className="text-sm text-gray-600 mt-1">
              Tillhör: <span className="font-medium text-gray-900">{fastLabel}</span>
              {byggnad.fastigheter?.id && (
                <>
                  {' · '}
                  <button
                    onClick={() => navigate(`/dashboard/fastigheter/${byggnad.fastigheter!.id}`)}
                    className="text-blue-700 hover:text-blue-800 font-medium"
                  >
                    Visa fastighet
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => navigate(-1)}
              className="text-sm bg-gray-100 text-gray-900 px-3 py-1.5 rounded-md hover:bg-gray-200 transition border"
            >
              Tillbaka
            </button>

            <button
              onClick={() =>
                navigate({
                  pathname: '/dashboard/byggnader/skotarform',
                  search: `?${createSearchParams({
                    fastighet: byggnad.fastighet_id || '',
                    byggnad: byggnad.id,
                  })}`,
                })
              }
              className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700 transition"
            >
              Tilldela skötare
            </button>

            <button
              onClick={() => navigate(`/dashboard/byggnader/${byggnad.id}/edit`)}
              className="text-sm bg-indigo-600 text-white px-3 py-1.5 rounded-md hover:bg-indigo-700 transition"
            >
              Redigera
            </button>

            <button
              onClick={() => navigate('/dashboard/byggnader')}
              className="text-sm bg-gray-100 text-gray-900 px-3 py-1.5 rounded-md hover:bg-gray-200 transition border"
            >
              Till listan
            </button>
          </div>
        </div>
      </div>

      {/* KEY METRICS */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard label="Våningar" value={byggnad.våningar ?? '-'} />
        <SummaryCard label="Area (m²)" value={byggnad.area ?? '-'} />
        <SummaryCard label="Byggår" value={byggnad.byggår ?? '-'} />
        <SummaryCard label="Objekt" value={byggnad.objekt.length} />
      </section>

      {/* TABS */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="flex border-b border-gray-200 overflow-x-auto">
          <TabButton active={tab === 'oversikt'} onClick={() => setTab('oversikt')} label="Översikt" />
          <TabButton active={tab === 'objekt'} onClick={() => setTab('objekt')} label="Objekt" badge={byggnad.objekt.length} />
          <TabButton active={tab === 'skotare'} onClick={() => setTab('skotare')} label="Skötare" badge={byggnad.skotare.length} />
          <TabButton active={tab === 'historik'} onClick={() => setTab('historik')} label="Historik" />
        </div>

        {/* PANELS */}
        {tab === 'oversikt' && (
          <div className="p-5">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Fakta */}
              <div className="lg:col-span-2 space-y-6">
                <div className="border rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Fakta</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <Field label="Typ" value={byggnad.typ} />
                    <Field label="Våningar" value={byggnad.våningar ?? '-'} />
                    <Field label="Area (m²)" value={byggnad.area ?? '-'} />
                    <Field label="Byggår" value={byggnad.byggår ?? '-'} />
                  </div>
                </div>

                <div className="border rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Fastighet</h3>
                  <div className="text-sm text-gray-700">
                    <div><span className="text-gray-500">Namn:</span> {byggnad.fastigheter?.namn ?? '-'}</div>
                    <div><span className="text-gray-500">Adress:</span> {byggnad.fastigheter?.adress ?? '-'}</div>
                  </div>
                </div>
              </div>

              {/* Snabbåtgärder */}
              <div className="space-y-3">
                <div className="border rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Snabbåtgärder</h3>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() =>
                        navigate({
                          pathname: '/dashboard/byggnadsobjekt/create',
                          search: `?${createSearchParams({ byggnad: byggnad.id })}`,
                        })
                      }
                      className="bg-green-600 text-white px-3 py-2 rounded-md hover:bg-green-700 text-sm"
                    >
                      Lägg till objekt
                    </button>
                    <button
                      onClick={() =>
                        navigate({
                          pathname: '/dashboard/byggnader/skotarform',
                          search: `?${createSearchParams({
                            fastighet: byggnad.fastighet_id || '',
                            byggnad: byggnad.id,
                          })}`,
                        })
                      }
                      className="bg-blue-600 text-white px-3 py-2 rounded-md hover:bg-blue-700 text-sm"
                    >
                      Tilldela skötare
                    </button>
                  </div>
                </div>

                <div className="border rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Skötare (antal)</h3>
                  <div className="text-2xl font-bold text-gray-900">{byggnad.skotare.length}</div>
                  {byggnad.skotare.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {byggnad.skotare.slice(0, 6).map((s) => (
                        <button
                          key={s.id}
                          onClick={() => navigate(`/dashboard/users/${s.id}`)}
                          className="bg-indigo-50 text-indigo-900 px-3 py-1 rounded border border-indigo-200 hover:bg-indigo-100 text-xs"
                        >
                          {s.fornamn} {s.efternamn}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === 'objekt' && (
          <div className="p-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
              <input
                value={objektSok}
                onChange={(e) => setObjektSok(e.target.value)}
                placeholder="Sök objekt (namn/typ/plan)…"
                className="w-full md:w-72 border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
              <button
                onClick={() =>
                  navigate({
                    pathname: '/dashboard/byggnadsobjekt/create',
                    search: `?${createSearchParams({ byggnad: byggnad.id })}`,
                  })
                }
                className="bg-green-600 text-white px-3 py-1.5 rounded-md hover:bg-green-700 text-sm"
              >
                Lägg till objekt
              </button>
            </div>

            {filteredObjekt.length === 0 ? (
              <div className="text-sm text-gray-600 border rounded-lg p-6">
                Inga objekt matchar filtret.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredObjekt.map((o) => (
                  <div key={o.id} className="border rounded-lg p-4 hover:shadow-sm transition">
                    <div className="flex items-start justify-between">
                      <div className="font-semibold text-gray-900">{o.namn ?? 'Namnlöst objekt'}</div>
                      <span className="text-xs bg-gray-100 text-gray-800 px-2 py-0.5 rounded border">
                        {o.typ ?? 'okänd'}
                      </span>
                    </div>
                    <div className="mt-2 text-sm text-gray-700 space-y-1">
                      <div><span className="text-gray-500">Plan:</span> {o.plan ?? '-'}</div>
                      <div><span className="text-gray-500">Area (m²):</span> {o.kvadratmeter ?? '-'}</div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        onClick={() => navigate(`/dashboard/objekt/${o.id}`)}
                        className="text-blue-700 hover:text-blue-800 text-sm font-medium"
                      >
                        Visa
                      </button>
                      <button
                        onClick={() =>
                          navigate({
                            pathname: '/dashboard/tilldela/objekt-skotare',
                            search: `?${createSearchParams({
                              fastighet: byggnad.fastighet_id || '',
                              byggnad: byggnad.id,
                              objekt: o.id,
                            })}`,
                          })
                        }
                        className="text-sm bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 transition"
                      >
                        Tilldela skötare
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'skotare' && (
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900">Ansvariga skötare</h3>
              <button
                onClick={() =>
                  navigate({
                    pathname: '/dashboard/byggnader/skotarform',
                    search: `?${createSearchParams({
                      fastighet: byggnad.fastighet_id || '',
                      byggnad: byggnad.id,
                    })}`,
                  })
                }
                className="bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700 text-sm"
              >
                Hantera
              </button>
            </div>

            {byggnad.skotare.length === 0 ? (
              <div className="text-sm text-gray-600 border rounded-lg p-6">
                Ingen ansvarig skötare registrerad ännu.
              </div>
            ) : (
              <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {byggnad.skotare.map((s) => (
                  <li key={s.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-900">
                          {s.fornamn} {s.efternamn}
                        </div>
                        <div className="text-sm text-gray-600">{s.email ?? '-'}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => navigate(`/dashboard/users/${s.id}`)}
                          className="text-blue-700 hover:text-blue-800 text-sm font-medium"
                        >
                          Visa profil
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveSkotare(s.id)}
                          disabled={saving}
                          className="text-red-600 hover:text-red-700 text-sm font-medium disabled:opacity-50"
                          title="Ta bort koppling"
                        >
                          Ta bort
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {tab === 'historik' && (
          <div className="p-5">
            <div className="text-sm text-gray-700">
              <p className="mb-3">
                Här kan du visa händelseloggar, besiktningshistorik, åtgärder, osv.
              </p>
              <div className="rounded border p-4 text-gray-600">
                <p className="mb-2">Exempel (placeholder):</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>2025‑10‑05 — Ny skötare tilldelad</li>
                  <li>2025‑09‑21 — Objekt A‑12 uppdaterat</li>
                  <li>2025‑09‑01 — Byggnadsdata justerad</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------- Små UI-komponenter ------- */

function SummaryCard({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-lg font-semibold text-gray-900 mt-1">{value}</div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="text-sm">
      <div className="text-gray-500">{label}</div>
      <div className="font-medium text-gray-900">{value}</div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  label,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  badge?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'relative px-4 py-3 text-sm whitespace-nowrap border-b-2',
        active
          ? 'text-blue-700 font-semibold border-blue-600'
          : 'text-gray-600 hover:text-gray-800 border-transparent hover:border-gray-200',
      ].join(' ')}
    >
      <span className="inline-flex items-center gap-2">
        {label}
        {typeof badge === 'number' && (
          <span
            className={[
              'inline-flex items-center justify-center min-w-5 h-5 px-2 text-xs rounded-full border',
              active
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : 'bg-gray-50 text-gray-700 border-gray-200',
            ].join(' ')}
          >
            {badge}
          </span>
        )}
      </span>
    </button>
  );
}
