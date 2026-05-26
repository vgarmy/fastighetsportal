import { useEffect, useMemo, useRef, useState } from 'react';
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
  typ: string | null;
  plan: string | null;
  kvadratmeter: number | null;
  beskrivning: string | null;
  byggnad_id: string;
  byggnader: ByggnadLite | null;
  skotare: Skotare[];
};

type SortField =
  | 'namn'
  | 'typ'
  | 'byggnad'
  | 'fastighet'
  | 'plan'
  | 'kvadratmeter';

export function VisaByggnadsobjekt() {
  const [objekt, setObjekt] = useState<Objekt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // --- Filter ---
  const [typFilter, setTypFilter] = useState('');
  const [fastighetId, setFastighetId] = useState('');
  const [byggnadId, setByggnadId] = useState('');
  const [skotareId, setSkotareId] = useState('');

  // --- Sök ---
  const searchRef = useRef<HTMLInputElement | null>(null);
  const [rawQ, setRawQ] = useState('');
  const [q, setQ] = useState('');

  // --- Sortering ---
  const [sortField, setSortField] = useState<SortField>('namn');
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  const changeSort = (field: SortField) => {
    if (field === sortField) {
      setSortAsc((s) => !s);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => setQ(rawQ), 250);
    return () => clearTimeout(t);
  }, [rawQ]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      if (e.key === '/') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    const loadObjekt = async () => {
      setLoading(true);
      setError(null);

      try {
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

  const typBadge = (typ: string | null) => {
    const base =
      'inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border whitespace-nowrap';

    switch (typ) {
      case 'lägenhet':
        return <span className={`${base} bg-emerald-50 text-emerald-800 border-emerald-200`}>Lägenhet</span>;
      case 'förråd':
        return <span className={`${base} bg-amber-50 text-amber-800 border-amber-200`}>Förråd</span>;
      case 'lokal':
        return <span className={`${base} bg-sky-50 text-sky-800 border-sky-200`}>Lokal</span>;
      default:
        return (
          <span className={`${base} bg-gray-50 text-gray-800 border-gray-200`}>
            {typ || 'okänd'}
          </span>
        );
    }
  };

  const SkotareBadges = ({ list }: { list: Skotare[] }) => {
    if (!list || list.length === 0) {
      return <span className="text-xs text-gray-500">Ingen ansvarig skötare</span>;
    }

    const first = list.slice(0, 2);
    const restCount = list.length - first.length;

    return (
      <div className="flex flex-wrap gap-1.5">
        {first.map((s) => (
          <span
            key={s.id}
            className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-900 px-2 py-0.5 rounded-md border border-indigo-200 text-xs whitespace-nowrap"
            title={s.email || ''}
          >
            {s.fornamn} {s.efternamn}
          </span>
        ))}

        {restCount > 0 && (
          <span className="inline-flex items-center bg-gray-100 text-gray-800 px-2 py-0.5 rounded-md border border-gray-300 text-xs whitespace-nowrap">
            +{restCount}
          </span>
        )}
      </div>
    );
  };

  const fastigheterOptions = useMemo(() => {
    const set = new Map<string, { id: string; label: string }>();

    objekt.forEach((o) => {
      const f = o.byggnader?.fastigheter;
      if (!f?.id) return;
      const label = f.namn || f.adress || f.id;
      set.set(f.id, { id: f.id, label });
    });

    return Array.from(set.values()).sort((a, b) => a.label.localeCompare(b.label, 'sv'));
  }, [objekt]);

  const byggnaderOptions = useMemo(() => {
    const set = new Map<string, { id: string; label: string }>();

    objekt.forEach((o) => {
      if (fastighetId && o.byggnader?.fastigheter?.id !== fastighetId) return;
      const b = o.byggnader;
      if (!b?.id) return;
      set.set(b.id, { id: b.id, label: b.namn || b.id });
    });

    return Array.from(set.values()).sort((a, b) => a.label.localeCompare(b.label, 'sv'));
  }, [objekt, fastighetId]);

  const skotareOptions = useMemo(() => {
    return Array.from(
      new Map(objekt.flatMap((o) => o.skotare).map((s) => [s.id, s])).values()
    ).sort((a, b) =>
      `${a.fornamn} ${a.efternamn}`.localeCompare(`${b.fornamn} ${b.efternamn}`, 'sv')
    );
  }, [objekt]);

  const typOptions = useMemo(() => {
    return Array.from(new Set(objekt.map((o) => o.typ).filter(Boolean) as string[])).sort((a, b) =>
      a.localeCompare(b, 'sv')
    );
  }, [objekt]);

  const filtered = useMemo(() => {
    let out = [...objekt];

    if (q.trim()) {
      const qs = q.trim().toLowerCase();
      out = out.filter(
        (o) =>
          (o.namn || '').toLowerCase().includes(qs) ||
          (o.typ || '').toLowerCase().includes(qs) ||
          (o.plan || '').toLowerCase().includes(qs) ||
          (o.beskrivning || '').toLowerCase().includes(qs) ||
          (o.byggnader?.namn || '').toLowerCase().includes(qs) ||
          (o.byggnader?.fastigheter?.namn || '').toLowerCase().includes(qs) ||
          (o.byggnader?.fastigheter?.adress || '').toLowerCase().includes(qs) ||
          o.skotare.some((s) =>
            `${s.fornamn} ${s.efternamn}`.toLowerCase().includes(qs)
          )
      );
    }

    if (typFilter) out = out.filter((o) => o.typ === typFilter);
    if (fastighetId) out = out.filter((o) => o.byggnader?.fastigheter?.id === fastighetId);
    if (byggnadId) out = out.filter((o) => o.byggnad_id === byggnadId);
    if (skotareId) out = out.filter((o) => o.skotare.some((s) => s.id === skotareId));

    out.sort((a, b) => {
      const dir = sortAsc ? 1 : -1;

      const aNamn = a.namn || '';
      const bNamn = b.namn || '';

      const aTyp = a.typ || '';
      const bTyp = b.typ || '';

      const aByggnad = a.byggnader?.namn || '';
      const bByggnad = b.byggnader?.namn || '';

      const aFastighet = a.byggnader?.fastigheter?.namn || a.byggnader?.fastigheter?.adress || '';
      const bFastighet = b.byggnader?.fastigheter?.namn || b.byggnader?.fastigheter?.adress || '';

      const aPlan = a.plan || '';
      const bPlan = b.plan || '';

      switch (sortField) {
        case 'namn':
          return aNamn.localeCompare(bNamn, 'sv') * dir;

        case 'typ':
          return aTyp.localeCompare(bTyp, 'sv') * dir;

        case 'byggnad':
          return aByggnad.localeCompare(bByggnad, 'sv') * dir;

        case 'fastighet':
          return aFastighet.localeCompare(bFastighet, 'sv') * dir;

        case 'plan':
          return aPlan.localeCompare(bPlan, 'sv') * dir;

        case 'kvadratmeter':
          return ((a.kvadratmeter ?? -1) - (b.kvadratmeter ?? -1)) * dir;

        default:
          return 0;
      }
    });

    return out;
  }, [objekt, q, typFilter, fastighetId, byggnadId, skotareId, sortField, sortAsc]);

  const SortHeader = ({
    field,
    children,
    className = '',
  }: {
    field: SortField;
    children: React.ReactNode;
    className?: string;
  }) => {
    const active = sortField === field;

    return (
      <button
        type="button"
        onClick={() => changeSort(field)}
        className={`inline-flex items-center gap-1 font-semibold text-white hover:text-gray-100 transition ${className} cursor-pointer`}
      >
        <span>{children}</span>
        <span className="text-xs text-white">
          {active ? (sortAsc ? '↑' : '↓') : '↕'}
        </span>
      </button>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-64 bg-gray-200 rounded animate-pulse" />
        <div className="h-24 w-full bg-gray-100 rounded-xl animate-pulse" />
        <div className="h-[420px] w-full bg-gray-100 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <div className="rounded-xl border border-red-300 bg-red-100 text-red-900 p-4">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Alla byggnadsobjekt</h1>
          <p className="text-sm text-gray-600 mt-1">
            Visar <span className="font-semibold text-gray-900">{filtered.length}</span> av{' '}
            <span className="font-semibold text-gray-900">{objekt.length}</span> objekt
          </p>
        </div>

        <button
          onClick={() => navigate('/dashboard/byggnadsobjekt/create')}
          className="bg-blue-700 text-white px-4 py-2.5 rounded-lg hover:bg-blue-800 transition text-sm font-medium shadow-sm"
        >
          + Lägg till objekt
        </button>
      </div>

      {/* Filterpanel */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-12 gap-3 items-center">
          {/* Sök */}
          <div className="relative xl:col-span-4">
            <svg
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M12.9 14.32a8 8 0 111.414-1.414l4.387 4.387a1 1 0 01-1.414 1.414l-4.387-4.387zM14 8a6 6 0 11-12 0 6 6 0 0112 0z"
                clipRule="evenodd"
              />
            </svg>

            <input
              ref={searchRef}
              value={rawQ}
              onChange={(e) => setRawQ(e.target.value)}
              placeholder="Sök objekt / typ / byggnad / fastighet / skötare… (tryck /)"
              className="w-full pl-9 pr-9 border border-gray-300 bg-white text-gray-900 rounded-lg px-3 py-2.5 text-sm shadow-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-400 placeholder:text-gray-400"
            />

            {rawQ && (
              <button
                type="button"
                onClick={() => setRawQ('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 inline-flex items-center justify-center rounded hover:bg-gray-100 text-gray-500"
                aria-label="Rensa sökning"
                title="Rensa"
              >
                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            )}
          </div>

          {/* Typ */}
          <div className="xl:col-span-2">
            <select
              value={typFilter}
              onChange={(e) => setTypFilter(e.target.value)}
              className="w-full border border-gray-300 bg-white text-gray-900 rounded-lg px-3 py-2.5 text-sm shadow-sm focus:ring-2 focus:ring-blue-400"
            >
              <option value="">Alla typer</option>
              {typOptions.map((typ) => (
                <option key={typ} value={typ}>
                  {typ}
                </option>
              ))}
            </select>
          </div>

          {/* Fastighet */}
          <div className="xl:col-span-2">
            <select
              value={fastighetId}
              onChange={(e) => {
                setFastighetId(e.target.value);
                setByggnadId('');
              }}
              className="w-full border border-gray-300 bg-white text-gray-900 rounded-lg px-3 py-2.5 text-sm shadow-sm focus:ring-2 focus:ring-blue-400"
            >
              <option value="">Alla fastigheter</option>
              {fastigheterOptions.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>

          {/* Byggnad */}
          <div className="xl:col-span-2">
            <select
              value={byggnadId}
              onChange={(e) => setByggnadId(e.target.value)}
              disabled={!fastighetId || byggnaderOptions.length === 0}
              className="w-full border border-gray-300 bg-white text-gray-900 rounded-lg px-3 py-2.5 text-sm disabled:bg-gray-100 disabled:text-gray-600 shadow-sm focus:ring-2 focus:ring-blue-400"
            >
              <option value="">Alla byggnader</option>
              {byggnaderOptions.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.label}
                </option>
              ))}
            </select>
          </div>

          {/* Skötare */}
          <div className="xl:col-span-2">
            <select
              value={skotareId}
              onChange={(e) => setSkotareId(e.target.value)}
              className="w-full border border-gray-300 bg-white text-gray-900 rounded-lg px-3 py-2.5 text-sm shadow-sm focus:ring-2 focus:ring-blue-400"
            >
              <option value="">Alla skötare</option>
              {skotareOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.fornamn} {s.efternamn}
                  {s.email ? ` (${s.email})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tabell */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 text-gray-900 shadow-sm">
          Inga byggnadsobjekt matchar dina filter.
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-[1450px] w-full text-sm">
              <thead className="bg-slate-800 border-b border-gray-200 sticky top-0 z-10">
                <tr>
                  <th className="text-left px-4 py-5 align-middle">
                    <SortHeader field="namn">Objekt</SortHeader>
                  </th>
                  <th className="text-left px-4 py-5 align-middle">
                    <SortHeader field="typ">Typ</SortHeader>
                  </th>
                  <th className="text-left px-4 py-5 align-middle">
                    <SortHeader field="byggnad">Byggnad</SortHeader>
                  </th>
                  <th className="text-left px-4 py-5 align-middle">
                    <SortHeader field="fastighet">Fastighet</SortHeader>
                  </th>
                  <th className="text-left px-4 py-5 align-middle">
                    <SortHeader field="plan">Plan</SortHeader>
                  </th>
                  <th className="text-left px-4 py-5 align-middle">
                    <SortHeader field="kvadratmeter">Area (m²)</SortHeader>
                  </th>
                  <th className="text-left px-4 py-5 align-middle font-semibold text-white">Beskrivning</th>
                  <th className="text-left px-4 py-5 align-middle font-semibold text-white">Ansvariga skötare</th>
                  <th className="text-left px-4 py-5 align-middle font-semibold text-white">Åtgärder</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200">
                {filtered.map((o, index) => {
                  const objektLabel = o.namn || 'Namnlöst objekt';
                  const byggLabel = o.byggnader?.namn || 'Namnlös byggnad';
                  const fastLabel =
                    o.byggnader?.fastigheter?.namn ||
                    o.byggnader?.fastigheter?.adress ||
                    'Namnlös fastighet';

                  const fastId = o.byggnader?.fastigheter?.id;
                  const byggId = o.byggnader?.id;

                  const shortDesc =
                    o.beskrivning && o.beskrivning.length > 120
                      ? `${o.beskrivning.slice(0, 120)}…`
                      : (o.beskrivning ?? '-');

                  return (
                    <tr
                      key={o.id}
                      className={`transition hover:bg-slate-200/70 ${
                        index % 2 === 0 ? 'bg-white' : 'bg-slate-100'
                      }`}
                    >
                      <td className="px-4 py-4 align-middle">
                        <div className="font-semibold text-gray-900">{objektLabel}</div>
                      </td>

                      <td className="px-4 py-4 align-middle">
                        {typBadge(o.typ)}
                      </td>

                      <td className="px-4 py-4 align-middle text-gray-800">
                        <div className="max-w-[220px] truncate" title={byggLabel}>
                          {byggLabel}
                        </div>
                      </td>

                      <td className="px-4 py-4 align-middle text-gray-800">
                        <div className="max-w-[220px] truncate" title={fastLabel}>
                          {fastLabel}
                        </div>
                      </td>

                      <td className="px-4 py-4 align-middle text-gray-800 whitespace-nowrap">
                        {o.plan ?? '-'}
                      </td>

                      <td className="px-4 py-4 align-middle text-gray-800 whitespace-nowrap">
                        {o.kvadratmeter ?? '-'}
                      </td>

                      <td className="px-4 py-4 align-middle text-gray-800">
                        <div className="max-w-[320px] truncate" title={o.beskrivning || ''}>
                          {shortDesc}
                        </div>
                      </td>

                      <td className="px-4 py-4 align-middle">
                        <div className="max-w-[260px]">
                          <SkotareBadges list={o.skotare} />
                        </div>
                      </td>

                      <td className="px-4 py-4 align-middle">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            onClick={() => navigate(`/dashboard/objekt/${o.id}`)}
                            className="px-3 py-1.5 text-sm border border-blue-300 text-blue-700 rounded bg-white hover:bg-blue-50 cursor-pointer"
                          >
                            Visa
                          </button>

                          <button
                            onClick={() =>
                              navigate(
                                `../objekt/skotarform?fastighet=${o.byggnader?.fastigheter?.id ?? ''}&byggnad=${byggId ?? ''}&objekt=${o.id}`
                              )
                            }
                            className="text-sm bg-blue-700 text-white px-3 py-1.5 rounded-md hover:bg-blue-800 transition cursor-pointer"
                          >
                            Tilldela skötare
                          </button>

                          {byggId && (
                            <button
                              onClick={() => navigate(`/dashboard/byggnader/${byggId}`)}
                              className="px-3 py-1.5 text-sm border border-slate-300 text-slate-700 rounded bg-white hover:bg-slate-50 cursor-pointer"
                            >
                              Visa byggnad
                            </button>
                          )}

                          {fastId && (
                            <button
                              onClick={() => navigate(`/dashboard/fastigheter/${fastId}`)}
                              className="px-3 py-1.5 text-sm border border-slate-300 text-slate-700 rounded bg-white hover:bg-slate-50 cursor-pointer"
                            >
                              Visa fastighet
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}