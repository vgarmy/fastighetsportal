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

type HistorikRad = {
  id: string;
  typ: string;
  rubrik: string;
  beskrivning: string | null;
  skapad_at: string;
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
  const [historik, setHistorik] = useState<HistorikRad[]>([]);
  const [tab, setTab] = useState<TabKey>('oversikt');
  const [objektSok, setObjektSok] = useState('');

  useEffect(() => {
    if (!id) return;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const [
          { data: byggRaw, error: bErr },
          { data: objRaw, error: oErr },
          { data: historikRaw, error: hErr },
        ] = await Promise.all([
          supabase
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
            .single(),

          supabase
            .from('byggnad_objekt')
            .select(`
              id,
              namn,
              typ,
              plan,
              kvadratmeter
            `)
            .eq('byggnad_id', id)
            .order('namn', { ascending: true }),

          supabase
            .from('byggnad_historik')
            .select(`
              id,
              typ,
              rubrik,
              beskrivning,
              skapad_at
            `)
            .eq('byggnad_id', id)
            .order('skapad_at', { ascending: false }),
        ]);

        if (bErr) throw bErr;
        if (oErr) throw oErr;
        if (hErr) throw hErr;
        if (!byggRaw) throw new Error('Byggnaden kunde inte hittas.');

        const byggData: any = byggRaw;

        const fastRelRaw = byggData.fastigheter ?? null;
        const fastRel: FastighetLite | null = Array.isArray(fastRelRaw)
          ? (fastRelRaw[0] ?? null)
          : fastRelRaw;

        const skotare: Skotare[] =
          (byggData.byggnad_skotare ?? [])
            .map((k: any) => k.skotare_id)
            .filter(Boolean) ?? [];

        const objData: any[] = objRaw ?? [];
        const historikData: any[] = historikRaw ?? [];

        const mapped: Byggnad = {
          id: byggData.id,
          namn: byggData.namn,
          typ: byggData.typ,
          våningar: byggData.vaningar ?? null,
          area: byggData.area ?? null,
          byggår: byggData.byggar ?? null,
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
        setHistorik(
          historikData.map((h: any) => ({
            id: h.id,
            typ: h.typ,
            rubrik: h.rubrik,
            beskrivning: h.beskrivning ?? null,
            skapad_at: h.skapad_at,
          }))
        );
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
      const skotareObj = byggnad.skotare.find((s) => s.id === skotare_id);
      const skotareNamn = skotareObj
        ? `${skotareObj.fornamn} ${skotareObj.efternamn}`
        : 'Skötare';

      const { error: delErr } = await supabase
        .from('byggnad_skotare')
        .delete()
        .match({ byggnad_id: byggnad.id, skotare_id });

      if (delErr) throw delErr;

      const { data: historikInsert, error: historikErr } = await supabase
        .from('byggnad_historik')
        .insert([
          {
            byggnad_id: byggnad.id,
            typ: 'skotare_borttagen',
            rubrik: 'Skötare borttagen',
            beskrivning: `${skotareNamn} togs bort från byggnaden.`,
            metadata: { skotare_id: skotare_id, skotare_namn: skotareNamn },
          },
        ])
        .select('id, typ, rubrik, beskrivning, skapad_at')
        .single();

      if (historikErr) throw historikErr;

      setByggnad((prev) =>
        prev ? { ...prev, skotare: prev.skotare.filter((s) => s.id !== skotare_id) } : prev
      );

      if (historikInsert) {
        setHistorik((prev) => [historikInsert as HistorikRad, ...prev]);
      }
    } catch (e: any) {
      setError(e.message || 'Kunde inte ta bort skötare.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="w-full h-24 rounded-2xl bg-slate-200 animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="h-20 bg-slate-100 rounded-xl animate-pulse" />
          <div className="h-20 bg-slate-100 rounded-xl animate-pulse" />
          <div className="h-20 bg-slate-100 rounded-xl animate-pulse" />
          <div className="h-20 bg-slate-100 rounded-xl animate-pulse" />
        </div>
        <div className="h-80 bg-slate-100 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
        {error}
      </div>
    );
  }

  if (!byggnad) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-slate-700">
        Byggnaden kunde inte hittas.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-slate-50 shadow-sm">
        <div className="px-5 py-4">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl md:text-3xl font-bold text-slate-900 leading-tight">
                  {byggnad.namn}
                </h1>
                <span className="inline-flex items-center rounded-full border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700">
                  {byggnad.typ}
                </span>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-600">
                <span>Tillhör:</span>
                <span className="font-medium text-slate-900">{fastLabel}</span>

                {byggnad.fastigheter?.id && (
                  <>
                    <span className="text-slate-400">•</span>
                    <button
                      type="button"
                      onClick={() => navigate(`/dashboard/fastigheter/${byggnad.fastigheter!.id}`)}
                      className="font-medium text-blue-700 hover:text-blue-800"
                    >
                      Visa fastighet
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 xl:justify-end">
              <button
                type="button"
                onClick={() =>
                  navigate({
                    pathname: '/dashboard/byggnader/skotarform',
                    search: `?${createSearchParams({
                      fastighet: byggnad.fastighet_id || '',
                      byggnad: byggnad.id,
                    })}`,
                  })
                }
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 font-semibold cursor-pointer"
              >
                Redigera skötare
              </button>

              <button
                type="button"
                onClick={() =>
                  navigate({
                    pathname: '/dashboard/byggnader/create',
                    search: `?id=${byggnad.id}`,
                  })
                }
                className="text-white px-4 py-2 rounded font-semibold cursor-pointer bg-indigo-600 hover:bg-indigo-700"
              >
                Redigera byggnad
              </button>

              <button
                type="button"
                onClick={() => navigate('/dashboard/byggnader')}
                className="bg-white text-slate-800 px-4 py-2 rounded-lg hover:bg-slate-100 transition border border-slate-300 font-semibold cursor-pointer"
              >
                Till listan
              </button>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200 px-5 py-4">
          <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <SummaryCard label="Våningar" value={byggnad.våningar ?? '-'} tone="blue" />
            <SummaryCard label="Area (m²)" value={byggnad.area ?? '-'} tone="emerald" />
            <SummaryCard label="Byggår" value={byggnad.byggår ?? '-'} tone="amber" />
            <SummaryCard label="Objekt" value={byggnad.objekt.length} tone="slate" />
          </section>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-100/80 px-3 py-3">
          <div className="flex flex-wrap gap-2">
            <TabButton
              active={tab === 'oversikt'}
              onClick={() => setTab('oversikt')}
              label="Översikt"
            />
            <TabButton
              active={tab === 'objekt'}
              onClick={() => setTab('objekt')}
              label="Objekt"
              badge={byggnad.objekt.length}
            />
            <TabButton
              active={tab === 'skotare'}
              onClick={() => setTab('skotare')}
              label="Skötare"
              badge={byggnad.skotare.length}
            />
            <TabButton
              active={tab === 'historik'}
              onClick={() => setTab('historik')}
              label="Historik"
              badge={historik.length}
            />
          </div>
        </div>

        {tab === 'oversikt' && (
          <div className="p-4 md:p-5">
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
              <div className="xl:col-span-8 space-y-4">
                <div className="rounded-xl border border-slate-200 bg-white/70 p-4">
                  <h3 className="text-sm font-semibold text-slate-900 mb-3">Fakta</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Field label="Typ" value={byggnad.typ} />
                    <Field label="Våningar" value={byggnad.våningar ?? '-'} />
                    <Field label="Area (m²)" value={byggnad.area ?? '-'} />
                    <Field label="Byggår" value={byggnad.byggår ?? '-'} />
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white/70 p-4">
                  <h3 className="text-sm font-semibold text-slate-900 mb-3">Fastighet</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Field label="Namn" value={byggnad.fastigheter?.namn ?? '-'} />
                    <Field label="Adress" value={byggnad.fastigheter?.adress ?? '-'} />
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white/70 p-4">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <h3 className="text-sm font-semibold text-slate-900">Objekt (senaste)</h3>
                    <button
                      type="button"
                      onClick={() => setTab('objekt')}
                      className="text-sm font-medium text-blue-700 hover:text-blue-800"
                    >
                      Visa alla
                    </button>
                  </div>

                  {byggnad.objekt.length === 0 ? (
                    <div className="text-sm text-slate-600">Inga objekt registrerade ännu.</div>
                  ) : (
                    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                      <div className="hidden md:grid grid-cols-12 gap-3 bg-slate-100 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
                        <div className="col-span-5">Namn</div>
                        <div className="col-span-3">Typ</div>
                        <div className="col-span-2">Plan</div>
                        <div className="col-span-2">Area</div>
                      </div>

                      <div className="divide-y divide-slate-200">
                        {byggnad.objekt.slice(0, 4).map((o, i) => (
                          <div
                            key={o.id}
                            className={`grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-3 px-4 py-3 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'
                              }`}
                          >
                            <div className="md:col-span-5">
                              <div className="text-xs text-slate-500 md:hidden">Namn</div>
                              <div className="font-medium text-slate-900">
                                {o.namn ?? 'Namnlöst objekt'}
                              </div>
                            </div>

                            <div className="md:col-span-3">
                              <div className="text-xs text-slate-500 md:hidden">Typ</div>
                              <div className="text-slate-700">{o.typ ?? '-'}</div>
                            </div>

                            <div className="md:col-span-2">
                              <div className="text-xs text-slate-500 md:hidden">Plan</div>
                              <div className="text-slate-700">{o.plan ?? '-'}</div>
                            </div>

                            <div className="md:col-span-2">
                              <div className="text-xs text-slate-500 md:hidden">Area</div>
                              <div className="text-slate-700">{o.kvadratmeter ?? '-'} m²</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="xl:col-span-4 space-y-4">
                <div className="rounded-xl border border-slate-200 bg-white/70 p-4">
                  <h3 className="text-sm font-semibold text-slate-900 mb-3">Snabbåtgärder</h3>
                  <div className="flex gap-2">

                    <button
                      type="button"
                      onClick={() =>
                        navigate({
                          pathname: '/dashboard/objekt/create',
                          search: `?${createSearchParams({ byggnad: byggnad.id })}`,
                        })
                      }
                      className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm font-medium cursor-pointer"
                    >
                      Lägg till objekt
                    </button>


                    <button
                      type="button"
                      onClick={() =>
                        navigate({
                          pathname: '/dashboard/byggnader/skotarform',
                          search: `?${createSearchParams({
                            fastighet: byggnad.fastighet_id || '',
                            byggnad: byggnad.id,
                          })}`,
                        })
                      }
                      className="bg-blue-600 text-white px-4 py-2  rounded hover:bg-blue-700 text-sm font-medium cursor-pointer"
                    >
                      Hantera skötare
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        navigate({
                          pathname: '/dashboard/byggnader/create',
                          search: `?id=${byggnad.id}`,
                        })
                      }
                      className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 text-sm font-medium cursor-pointer"
                    >
                      Redigera byggnad
                    </button>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white/70 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold text-slate-900">Skötare</h3>
                    <span className="text-lg font-bold text-slate-900">
                      {byggnad.skotare.length}
                    </span>
                  </div>

                  {byggnad.skotare.length === 0 ? (
                    <div className="mt-3 text-sm text-slate-600">
                      Ingen ansvarig skötare registrerad ännu.
                    </div>
                  ) : (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {byggnad.skotare.slice(0, 6).map((s) => (
                        <button
                          type="button"
                          key={s.id}
                          onClick={() => navigate(`/dashboard/users/${s.id}`)}
                          className="bg-indigo-50 text-indigo-900 px-3 py-1.5 rounded-lg border border-indigo-200 hover:bg-indigo-100 text-xs font-medium"
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
          <div className="p-4 md:p-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
              <input
                value={objektSok}
                onChange={(e) => setObjektSok(e.target.value)}
                placeholder="Sök objekt (namn/typ/plan)…"
                className="w-full md:w-80 border border-slate-300 bg-white rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />

              <button
                type="button"
                onClick={() =>
                  navigate({
                    pathname: '/dashboard/byggnadsobjekt/create',
                    search: `?${createSearchParams({ byggnad: byggnad.id })}`,
                  })
                }
                className="bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 text-sm font-medium"
              >
                Lägg till objekt
              </button>
            </div>

            {filteredObjekt.length === 0 ? (
              <div className="text-sm text-slate-600 border border-slate-200 bg-white/70 rounded-xl p-5">
                Inga objekt matchar filtret.
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <div className="hidden md:grid grid-cols-12 gap-3 bg-slate-100 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
                  <div className="col-span-4">Namn</div>
                  <div className="col-span-2">Typ</div>
                  <div className="col-span-2">Plan</div>
                  <div className="col-span-2">Area</div>
                  <div className="col-span-2 text-right">Åtgärder</div>
                </div>

                <div className="divide-y divide-slate-200">
                  {filteredObjekt.map((o, i) => (
                    <div
                      key={o.id}
                      className={`grid grid-cols-1 md:grid-cols-12 gap-3 px-4 py-3 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'
                        }`}
                    >
                      <div className="md:col-span-4">
                        <div className="text-xs text-slate-500 md:hidden">Namn</div>
                        <div className="font-medium text-slate-900">
                          {o.namn ?? 'Namnlöst objekt'}
                        </div>
                      </div>

                      <div className="md:col-span-2">
                        <div className="text-xs text-slate-500 md:hidden">Typ</div>
                        <div className="text-slate-700">{o.typ ?? '-'}</div>
                      </div>

                      <div className="md:col-span-2">
                        <div className="text-xs text-slate-500 md:hidden">Plan</div>
                        <div className="text-slate-700">{o.plan ?? '-'}</div>
                      </div>

                      <div className="md:col-span-2">
                        <div className="text-xs text-slate-500 md:hidden">Area</div>
                        <div className="text-slate-700">{o.kvadratmeter ?? '-'} m²</div>
                      </div>

                      <div className="md:col-span-2">
                        <div className="text-xs text-slate-500 md:hidden">Åtgärder</div>
                        <div className="flex md:justify-end flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => navigate(`/dashboard/objekt/${o.id}`)}
                            className="text-blue-700 hover:text-blue-800 text-sm font-medium"
                          >
                            Visa
                          </button>

                          <button
                            type="button"
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
                            className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition font-medium"
                          >
                            Skötare
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'skotare' && (
          <div className="p-4 md:p-5">
            <div className="flex items-center justify-between mb-4 gap-3">
              <h3 className="text-sm font-semibold text-slate-900">Ansvariga skötare</h3>

              <button
                type="button"
                onClick={() =>
                  navigate({
                    pathname: '/dashboard/byggnader/skotarform',
                    search: `?${createSearchParams({
                      fastighet: byggnad.fastighet_id || '',
                      byggnad: byggnad.id,
                    })}`,
                  })
                }
                className="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
              >
                Hantera
              </button>
            </div>

            {byggnad.skotare.length === 0 ? (
              <div className="text-sm text-slate-600 border border-slate-200 bg-white/70 rounded-xl p-5">
                Ingen ansvarig skötare registrerad ännu.
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <div className="hidden md:grid grid-cols-12 gap-3 bg-slate-100 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
                  <div className="col-span-4">Namn</div>
                  <div className="col-span-4">E-post</div>
                  <div className="col-span-4 text-right">Åtgärder</div>
                </div>

                <div className="divide-y divide-slate-200">
                  {byggnad.skotare.map((s, i) => (
                    <div
                      key={s.id}
                      className={`grid grid-cols-1 md:grid-cols-12 gap-3 px-4 py-3 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'
                        }`}
                    >
                      <div className="md:col-span-4">
                        <div className="text-xs text-slate-500 md:hidden">Namn</div>
                        <div className="font-medium text-slate-900">
                          {s.fornamn} {s.efternamn}
                        </div>
                      </div>

                      <div className="md:col-span-4">
                        <div className="text-xs text-slate-500 md:hidden">E-post</div>
                        <div className="text-slate-700 break-all">{s.email ?? '-'}</div>
                      </div>

                      <div className="md:col-span-4">
                        <div className="text-xs text-slate-500 md:hidden">Åtgärder</div>
                        <div className="flex md:justify-end flex-wrap gap-3">
                          <button
                            type="button"
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
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'historik' && (
          <div className="p-4 md:p-5">
            {historik.length === 0 ? (
              <div className="text-sm text-slate-600 border border-slate-200 bg-white/70 rounded-xl p-5">
                Ingen historik registrerad ännu.
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <div className="divide-y divide-slate-200">
                  {historik.map((h, i) => (
                    <div
                      key={h.id}
                      className={`px-4 py-4 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'
                        }`}
                    >
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <HistorikBadge typ={h.typ} />
                            <div className="font-medium text-slate-900">{h.rubrik}</div>
                          </div>

                          {h.beskrivning && (
                            <div className="mt-1 text-sm text-slate-600">
                              {h.beskrivning}
                            </div>
                          )}
                        </div>

                        <div className="text-xs text-slate-500 shrink-0">
                          {formatDateTime(h.skapad_at)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ------- Små UI-komponenter ------- */

function SummaryCard({
  label,
  value,
  tone = 'slate',
}: {
  label: string;
  value: React.ReactNode;
  tone?: 'blue' | 'emerald' | 'amber' | 'slate';
}) {
  const toneClasses = {
    blue: 'bg-blue-50 border-blue-200',
    emerald: 'bg-emerald-50 border-emerald-200',
    amber: 'bg-amber-50 border-amber-200',
    slate: 'bg-slate-100 border-slate-200',
  };

  return (
    <div className={`rounded-xl border p-3 ${toneClasses[tone]}`}>
      <div className="text-[11px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className="text-lg font-semibold text-slate-900 mt-1">{value}</div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-3">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-medium text-slate-900">{value}</div>
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
        'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition border',
        active
          ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100',
      ].join(' ')}
    >
      <span>{label}</span>

      {typeof badge === 'number' && (
        <span
          className={[
            'inline-flex min-w-5 h-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold',
            active
              ? 'bg-white/15 text-white'
              : 'bg-slate-100 text-slate-700 border border-slate-200',
          ].join(' ')}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

function HistorikBadge({ typ }: { typ: string }) {
  const config: Record<string, { label: string; className: string }> = {
    byggnad_skapad: {
      label: 'Skapad',
      className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
    byggnad_uppdaterad: {
      label: 'Uppdaterad',
      className: 'bg-blue-50 text-blue-700 border-blue-200',
    },
    skotare_tillagd: {
      label: 'Skötare +',
      className: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    },
    skotare_borttagen: {
      label: 'Skötare -',
      className: 'bg-rose-50 text-rose-700 border-rose-200',
    },
    objekt_skapat: {
      label: 'Objekt +',
      className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
    objekt_uppdaterat: {
      label: 'Objekt ändrat',
      className: 'bg-amber-50 text-amber-700 border-amber-200',
    },
    objekt_borttaget: {
      label: 'Objekt -',
      className: 'bg-rose-50 text-rose-700 border-rose-200',
    },
  };

  const item = config[typ] ?? {
    label: typ,
    className: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${item.className}`}
    >
      {item.label}
    </span>
  );
}

function formatDateTime(value: string) {
  try {
    return new Date(value).toLocaleString('sv-SE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return value;
  }
}
