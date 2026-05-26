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
};

type SortField =
  | 'namn'
  | 'typ'
  | 'fastighet'
  | 'våningar'
  | 'area'
  | 'byggår';

export function VisaByggnader() {
  const [byggnader, setByggnader] = useState<Byggnad[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // --- Filter ---
  const [typFilter, setTypFilter] = useState('');
  const [fastighetId, setFastighetId] = useState('');
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
    const loadByggnader = async () => {
      setLoading(true);
      setError(null);

      try {
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

  const typBadge = (typ: string) => {
    const base =
      'inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border whitespace-nowrap';

    switch (typ) {
      case 'bostad':
        return <span className={`${base} bg-emerald-50 text-emerald-800 border-emerald-200`}>Bostad</span>;
      case 'kontor':
        return <span className={`${base} bg-sky-50 text-sky-800 border-sky-200`}>Kontor</span>;
      case 'lager':
        return <span className={`${base} bg-amber-50 text-amber-800 border-amber-200`}>Lager</span>;
      case 'garage':
        return <span className={`${base} bg-slate-100 text-slate-800 border-slate-300`}>Garage</span>;
      default:
        return <span className={`${base} bg-gray-50 text-gray-800 border-gray-200`}>{typ || '—'}</span>;
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

    byggnader.forEach((b) => {
      if (!b.fastigheter?.id) return;
      const label = b.fastigheter.namn || b.fastigheter.adress || b.fastigheter.id;
      set.set(b.fastigheter.id, { id: b.fastigheter.id, label });
    });

    return Array.from(set.values()).sort((a, b) => a.label.localeCompare(b.label, 'sv'));
  }, [byggnader]);

  const skotareOptions = useMemo(() => {
    return Array.from(
      new Map(byggnader.flatMap((b) => b.skotare).map((s) => [s.id, s])).values()
    ).sort((a, b) =>
      `${a.fornamn} ${a.efternamn}`.localeCompare(`${b.fornamn} ${b.efternamn}`, 'sv')
    );
  }, [byggnader]);

  const typOptions = useMemo(() => {
    return Array.from(new Set(byggnader.map((b) => b.typ).filter(Boolean))).sort((a, b) =>
      a.localeCompare(b, 'sv')
    );
  }, [byggnader]);

  const filtered = useMemo(() => {
    let out = [...byggnader];

    if (q.trim()) {
      const qs = q.trim().toLowerCase();
      out = out.filter(
        (b) =>
          b.namn.toLowerCase().includes(qs) ||
          (b.typ || '').toLowerCase().includes(qs) ||
          (b.fastigheter?.namn || '').toLowerCase().includes(qs) ||
          (b.fastigheter?.adress || '').toLowerCase().includes(qs) ||
          b.skotare.some((s) =>
            `${s.fornamn} ${s.efternamn}`.toLowerCase().includes(qs)
          )
      );
    }

    if (typFilter) out = out.filter((b) => b.typ === typFilter);
    if (fastighetId) out = out.filter((b) => b.fastighet_id === fastighetId);
    if (skotareId) out = out.filter((b) => b.skotare.some((s) => s.id === skotareId));

    out.sort((a, b) => {
      const dir = sortAsc ? 1 : -1;

      const aFastighet = a.fastigheter?.namn || a.fastigheter?.adress || '';
      const bFastighet = b.fastigheter?.namn || b.fastigheter?.adress || '';

      switch (sortField) {
        case 'namn':
          return a.namn.localeCompare(b.namn, 'sv') * dir;

        case 'typ':
          return (a.typ || '').localeCompare(b.typ || '', 'sv') * dir;

        case 'fastighet':
          return aFastighet.localeCompare(bFastighet, 'sv') * dir;

        case 'våningar':
          return ((a.våningar ?? -1) - (b.våningar ?? -1)) * dir;

        case 'area':
          return ((a.area ?? -1) - (b.area ?? -1)) * dir;

        case 'byggår':
          return ((a.byggår ?? -1) - (b.byggår ?? -1)) * dir;

        default:
          return 0;
      }
    });

    return out;
  }, [byggnader, q, typFilter, fastighetId, skotareId, sortField, sortAsc]);

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
          <h1 className="text-3xl font-bold text-gray-900">Alla byggnader</h1>
          <p className="text-sm text-gray-600 mt-1">
            Visar <span className="font-semibold text-gray-900">{filtered.length}</span> av{' '}
            <span className="font-semibold text-gray-900">{byggnader.length}</span> byggnader
          </p>
        </div>

        <button
          onClick={() => navigate('/dashboard/byggnader/create')}
          className="bg-blue-700 text-white px-4 py-2.5 rounded-lg hover:bg-blue-800 transition text-sm font-medium shadow-sm"
        >
          + Lägg till byggnad
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
              placeholder="Sök byggnad / typ / fastighet / skötare… (tryck /)"
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
          <div className="xl:col-span-3">
            <select
              value={fastighetId}
              onChange={(e) => setFastighetId(e.target.value)}
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

          {/* Skötare */}
          <div className="xl:col-span-3">
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
          Inga byggnader matchar dina filter.
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-[1250px] w-full text-sm">
              <thead className="bg-slate-800 border-b border-gray-200 sticky top-0 z-10">
                <tr>
                  <th className="text-left px-4 py-5 align-middle">
                    <SortHeader field="namn">Byggnad</SortHeader>
                  </th>
                  <th className="text-left px-4 py-5 align-middle">
                    <SortHeader field="typ">Typ</SortHeader>
                  </th>
                  <th className="text-left px-4 py-5 align-middle">
                    <SortHeader field="fastighet">Fastighet</SortHeader>
                  </th>
                  <th className="text-left px-4 py-5 align-middle">
                    <SortHeader field="våningar">Våningar</SortHeader>
                  </th>
                  <th className="text-left px-4 py-5 align-middle">
                    <SortHeader field="area">Area (m²)</SortHeader>
                  </th>
                  <th className="text-left px-4 py-5 align-middle">
                    <SortHeader field="byggår">Byggår</SortHeader>
                  </th>
                  <th className="text-left px-4 py-5 align-middle font-semibold text-white">Ansvariga skötare</th>
                  <th className="text-left px-4 py-5 align-middle font-semibold text-white">Åtgärder</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200">
                {filtered.map((b, index) => {
                  const fastLabel =
                    b.fastigheter?.namn || b.fastigheter?.adress || 'Namnlös fastighet';
                  const fastighetViewId = b.fastigheter?.id;

                  return (
                    <tr
                      key={b.id}
                      className={`transition hover:bg-slate-200/70 ${
                        index % 2 === 0 ? 'bg-white' : 'bg-slate-100'
                      }`}
                    >
                      <td className="px-4 py-4 align-middle">
                        <div className="font-semibold text-gray-900">{b.namn}</div>
                      </td>

                      <td className="px-4 py-4 align-middle">
                        {typBadge(b.typ)}
                      </td>

                      <td className="px-4 py-4 align-middle text-gray-800">
                        <div className="max-w-[260px] truncate" title={fastLabel}>
                          {fastLabel}
                        </div>
                      </td>

                      <td className="px-4 py-4 align-middle text-gray-800 whitespace-nowrap">
                        {b['våningar'] ?? '-'}
                      </td>

                      <td className="px-4 py-4 align-middle text-gray-800 whitespace-nowrap">
                        {b.area ?? '-'}
                      </td>

                      <td className="px-4 py-4 align-middle text-gray-800 whitespace-nowrap">
                        {b['byggår'] ?? '-'}
                      </td>

                      <td className="px-4 py-4 align-middle">
                        <div className="max-w-[260px]">
                          <SkotareBadges list={b.skotare} />
                        </div>
                      </td>

                      <td className="px-4 py-4 align-middle">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            onClick={() => navigate(`/dashboard/byggnader/${b.id}`)}
                            className="px-3 py-1.5 text-sm border border-blue-300 text-blue-700 rounded bg-white hover:bg-blue-50 cursor-pointer"
                          >
                            Visa
                          </button>

                          <button
                            onClick={() =>
                              navigate(`/dashboard/byggnader/skotarform?fastighet=${b.fastighet_id}&byggnad=${b.id}`)
                            }
                            className="text-sm bg-blue-700 text-white px-3 py-1.5 rounded-md hover:bg-blue-800 transition cursor-pointer"
                          >
                            Tilldela skötare
                          </button>

                          {fastighetViewId && (
                            <button
                              onClick={() => navigate(`/dashboard/fastigheter/${fastighetViewId}`)}
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