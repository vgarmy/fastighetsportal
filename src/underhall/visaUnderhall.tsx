import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

// --- Typer ---
type FastighetLite = { id: string; namn: string | null; adress: string | null };
type ByggnadLite = { id: string; namn: string | null };
type ObjektLite = { id: string; namn: string | null };

// Skötare = en rad i fastighets_users
type Skotare = { id: string; fornamn: string; efternamn: string; email?: string | null };

type Underhall = {
  id: string;
  rubrik: string;
  status: 'planerat' | 'pågående' | 'klart' | string;
  planerat_datum: string | null;
  klart_datum: string | null;
  fastighet_id: string;
  byggnad_id: string | null;
  objekt_id: string | null;
  fastigheter: FastighetLite | null;
  byggnader: ByggnadLite | null;
  objekt: ObjektLite | null;
  skotare: Skotare[];
};

type SortField = 'planerat_datum' | 'klart_datum' | 'rubrik' | 'status';

export function UnderhallLista() {
  const navigate = useNavigate();

  // --- Laddning/Error/Data ---
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<Underhall[]>([]);

  // --- Alla skötare (från fastighets_users) ---
  const [allSkotare, setAllSkotare] = useState<Skotare[]>([]);
  const [skotareLoadError, setSkotareLoadError] = useState<string | null>(null);

  // --- Filter ---
  const [status, setStatus] = useState<'alla' | 'planerat' | 'pågående' | 'klart'>('alla');
  const [fastighetId, setFastighetId] = useState('');
  const [byggnadId, setByggnadId] = useState('');
  const [objektId, setObjektId] = useState('');
  const [skotareId, setSkotareId] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // --- Sök (debounce + /-shortcut + clear) ---
  const searchRef = useRef<HTMLInputElement | null>(null);
  const [rawQ, setRawQ] = useState('');
  const [q, setQ] = useState('');

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

  // --- Sortering ---
  const [sortField, setSortField] = useState<SortField>('planerat_datum');
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  const changeSort = (field: SortField) => {
    if (field === sortField) setSortAsc((s) => !s);
    else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  // ---------- Ladda UNDERHÅLL + OBJEKT + SKÖTARE per underhåll ----------
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const { data: uh, error: uErr } = await supabase
          .from('underhåll')
          .select(`
            id,
            rubrik,
            status,
            planerat_datum,
            klart_datum,
            fastighet_id,
            byggnad_id,
            objekt_id,
            fastigheter ( id, namn, adress ),
            byggnader  ( id, namn )
          `)
          .order('planerat_datum', { ascending: true, nullsFirst: true });

        if (uErr) throw uErr;

        const base = (uh ?? []).map((u: any) => ({
          id: u.id,
          rubrik: u.rubrik,
          status: (u.status as string) ?? 'planerat',
          planerat_datum: u.planerat_datum ?? null,
          klart_datum: u.klart_datum ?? null,
          fastighet_id: u.fastighet_id,
          byggnad_id: u.byggnad_id ?? null,
          objekt_id: u.objekt_id ?? null,
          fastigheter: u.fastigheter ?? null,
          byggnader: u.byggnader ?? null,
          objekt: null as ObjektLite | null,
          skotare: [] as Skotare[],
        })) as Underhall[];

        const objektIds = [...new Set(base.map((r) => r.objekt_id).filter(Boolean))] as string[];
        if (objektIds.length > 0) {
          const { data: objs, error: oErr } = await supabase
            .from('byggnad_objekt')
            .select('id, namn')
            .in('id', objektIds);

          if (oErr) throw oErr;

          const omap = new Map<string, ObjektLite>(
            (objs ?? []).map((o: any) => [o.id, { id: o.id, namn: o.namn ?? null }])
          );

          base.forEach((r) => {
            r.objekt = r.objekt_id ? omap.get(r.objekt_id) ?? null : null;
          });
        }

        const underhallIds = base.map((r) => r.id);
        if (underhallIds.length > 0) {
          let caretRaw: any[] | null = null;
          let cErr: any = null;

          {
            const res = await supabase
              .from('underhåll_skotare')
              .select(`
                underhall_id:underhåll_id,
                user:fastighets_users!underhåll_skotare_user_id_fkey ( id, fornamn, efternamn, email ),
                user_id
              `)
              .in('underhåll_id', underhallIds);

            if (!res.error) {
              caretRaw = res.data ?? [];
            } else {
              cErr = res.error;
            }
          }

          if (!caretRaw || caretRaw.length === 0) {
            const res2 = await supabase
              .from('underhåll_skotare')
              .select(`
                underhall_id:underhåll_id,
                skotare:fastighets_users!underhåll_skotare_skotare_id_fkey ( id, fornamn, efternamn, email ),
                skotare_id
              `)
              .in('underhåll_id', underhallIds);

            if (!res2.error) {
              caretRaw = res2.data ?? [];
              cErr = null;
            } else {
              const res3 = await supabase
                .from('underhåll_skotare')
                .select('underhåll_id, user_id, skotare_id')
                .in('underhåll_id', underhallIds);

              caretRaw = res3.data ?? [];
              cErr = res2.error || res3.error;
            }
          }

          if (cErr) {
            console.warn('Kunde inte läsa underhåll_skotare med relationer:', cErr.message || cErr);
          }

          const map = new Map<string, Skotare[]>();

          (caretRaw ?? []).forEach((r: any) => {
            const uhId = r.underhall_id ?? r['underhåll_id'];
            const u: Skotare | null = r.user
              ? {
                  id: r.user.id,
                  fornamn: r.user.fornamn,
                  efternamn: r.user.efternamn,
                  email: r.user.email,
                }
              : r.skotare
                ? {
                    id: r.skotare.id,
                    fornamn: r.skotare.fornamn,
                    efternamn: r.skotare.efternamn,
                    email: r.skotare.email,
                  }
                : null;

            if (!uhId || !u) return;
            if (!map.has(uhId)) map.set(uhId, []);
            map.get(uhId)!.push(u);
          });

          base.forEach((r) => {
            r.skotare = map.get(r.id) ?? [];
          });
        }

        setRows(base);
      } catch (e: any) {
        setError(e.message || 'Kunde inte hämta underhåll.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  // ---------- Ladda ALLA skötare ----------
  useEffect(() => {
    const loadAllSkotare = async () => {
      setSkotareLoadError(null);
      try {
        const { data, error } = await supabase
          .from('fastighets_users')
          .select('id, fornamn, efternamn, email')
          .order('fornamn', { ascending: true })
          .order('efternamn', { ascending: true });

        if (error) throw error;
        setAllSkotare((data ?? []) as Skotare[]);
      } catch (e: any) {
        setSkotareLoadError(e.message || 'Kunde inte hämta fastighets_users.');
      }
    };
    loadAllSkotare();
  }, []);

  // ---------- Dropdown-options ----------
  const fastigheterOptions = useMemo(() => {
    const set = new Map<string, { id: string; label: string }>();
    rows.forEach((r) => {
      if (!r.fastigheter) return;
      const label = r.fastigheter.namn || r.fastigheter.adress || r.fastigheter.id;
      if (r.fastigheter.id && label) set.set(r.fastigheter.id, { id: r.fastigheter.id, label });
    });
    return Array.from(set.values()).sort((a, b) => a.label.localeCompare(b.label, 'sv'));
  }, [rows]);

  const byggnaderOptions = useMemo(() => {
    const set = new Map<string, { id: string; label: string }>();
    rows.forEach((r) => {
      if (fastighetId && r.fastighet_id !== fastighetId) return;
      if (!r.byggnader) return;
      const label = r.byggnader.namn || r.byggnader.id;
      if (r.byggnader.id && label) set.set(r.byggnader.id, { id: r.byggnader.id, label });
    });
    return Array.from(set.values()).sort((a, b) => a.label.localeCompare(b.label, 'sv'));
  }, [rows, fastighetId]);

  const objektOptions = useMemo(() => {
    const set = new Map<string, { id: string; label: string }>();
    rows.forEach((r) => {
      if (fastighetId && r.fastighet_id !== fastighetId) return;
      if (byggnadId && r.byggnad_id !== byggnadId) return;
      if (!r.objekt) return;
      const label = r.objekt.namn || r.objekt.id;
      if (r.objekt.id && label) set.set(r.objekt.id, { id: r.objekt.id, label });
    });
    return Array.from(set.values()).sort((a, b) => a.label.localeCompare(b.label, 'sv'));
  }, [rows, fastighetId, byggnadId]);

  const skotareDropdown = useMemo(() => {
    const fallback = Array.from(
      new Map(rows.flatMap((r) => r.skotare).map((s) => [s.id, s])).values()
    );
    const src = allSkotare.length ? allSkotare : fallback;

    return [...src].sort((a, b) =>
      `${a.fornamn} ${a.efternamn}`.localeCompare(`${b.fornamn} ${b.efternamn}`, 'sv')
    );
  }, [allSkotare, rows]);

  // ---------- Filtrerat resultat ----------
  const filtered = useMemo(() => {
    let out = [...rows];

    if (q.trim()) {
      const qs = q.trim().toLowerCase();
      out = out.filter(
        (r) =>
          r.rubrik.toLowerCase().includes(qs) ||
          (r.fastigheter?.namn || '').toLowerCase().includes(qs) ||
          (r.fastigheter?.adress || '').toLowerCase().includes(qs) ||
          (r.byggnader?.namn || '').toLowerCase().includes(qs) ||
          (r.objekt?.namn || '').toLowerCase().includes(qs) ||
          r.skotare.some((s) => `${s.fornamn} ${s.efternamn}`.toLowerCase().includes(qs))
      );
    }

    if (status !== 'alla') out = out.filter((r) => r.status === status);
    if (fastighetId) out = out.filter((r) => r.fastighet_id === fastighetId);
    if (byggnadId) out = out.filter((r) => r.byggnad_id === byggnadId);
    if (objektId) out = out.filter((r) => r.objekt_id === objektId);

    if (skotareId) {
      out = out.filter((r) => r.skotare.some((s) => s.id === skotareId));
    }

    if (fromDate) out = out.filter((r) => !r.planerat_datum || r.planerat_datum >= fromDate);
    if (toDate) out = out.filter((r) => !r.planerat_datum || r.planerat_datum <= toDate);

    out.sort((a, b) => {
      const dir = sortAsc ? 1 : -1;
      const av = (a as any)[sortField];
      const bv = (b as any)[sortField];

      if (av == null && bv == null) return 0;
      if (av == null) return -1 * dir;
      if (bv == null) return 1 * dir;

      return String(av).localeCompare(String(bv), 'sv') * dir;
    });

    return out;
  }, [rows, q, status, fastighetId, byggnadId, objektId, skotareId, fromDate, toDate, sortField, sortAsc]);

  // ---------- UI-hjälpare ----------
  const statusBadge = (s: Underhall['status']) => {
    const base = 'inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border whitespace-nowrap';
    switch (s) {
      case 'planerat':
        return <span className={`${base} bg-amber-50 text-amber-800 border-amber-200`}>Planerat</span>;
      case 'pågående':
        return <span className={`${base} bg-blue-50 text-blue-800 border-blue-200`}>Pågående</span>;
      case 'klart':
        return <span className={`${base} bg-green-50 text-green-800 border-green-200`}>Klart</span>;
      default:
        return <span className={`${base} bg-gray-50 text-gray-800 border-gray-200`}>{s}</span>;
    }
  };

  const SkotareBadges = ({ list }: { list: Skotare[] }) => {
    if (!list || list.length === 0) {
      return <span className="text-xs text-gray-500">Inga skötare</span>;
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
        <span className={`text-xs ${active ? 'text-white' : 'text-white'}`}>
          {active ? (sortAsc ? '↑' : '↓') : '↕'}
        </span>
      </button>
    );
  };

  // ---------- Render ----------
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
          <h1 className="text-3xl font-bold text-gray-900">Underhåll</h1>
          <p className="text-sm text-gray-600 mt-1">
            Visar <span className="font-semibold text-gray-900">{filtered.length}</span> av{' '}
            <span className="font-semibold text-gray-900">{rows.length}</span> underhåll
          </p>
        </div>

        <button
          onClick={() => navigate('/dashboard/underhall/create')}
          className="bg-blue-700 text-white px-4 py-2.5 rounded-lg hover:bg-blue-800 transition text-sm font-medium shadow-sm"
        >
          + Nytt underhåll
        </button>
      </div>

      {/* Filterpanel */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-12 gap-3 items-center">
          {/* Sök */}
          <div className="relative xl:col-span-3">
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
              placeholder="Sök rubrik / fastighet / byggnad / objekt / skötare… (tryck /)"
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

          {/* Status */}
          <div className="xl:col-span-1">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="w-full border border-gray-300 bg-white text-gray-900 rounded-lg px-3 py-2.5 text-sm shadow-sm focus:ring-2 focus:ring-blue-400"
            >
              <option value="alla">Alla statusar</option>
              <option value="planerat">Planerat</option>
              <option value="pågående">Pågående</option>
              <option value="klart">Klart</option>
            </select>
          </div>

          {/* Fastighet */}
          <div className="xl:col-span-2">
            <select
              value={fastighetId}
              onChange={(e) => {
                setFastighetId(e.target.value);
                setByggnadId('');
                setObjektId('');
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
          <div className="xl:col-span-1">
            <select
              value={byggnadId}
              onChange={(e) => {
                setByggnadId(e.target.value);
                setObjektId('');
              }}
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

          {/* Objekt */}
          <div className="xl:col-span-1">
            <select
              value={objektId}
              onChange={(e) => setObjektId(e.target.value)}
              disabled={!fastighetId || objektOptions.length === 0}
              className="w-full border border-gray-300 bg-white text-gray-900 rounded-lg px-3 py-2.5 text-sm disabled:bg-gray-100 disabled:text-gray-600 shadow-sm focus:ring-2 focus:ring-blue-400"
            >
              <option value="">Alla objekt</option>
              {objektOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
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
              {skotareDropdown.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.fornamn} {s.efternamn}
                  {s.email ? ` (${s.email})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Datum från */}
          <div className="xl:col-span-1">
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full border border-gray-300 bg-white text-gray-900 rounded-lg px-3 py-2.5 text-sm shadow-sm focus:ring-2 focus:ring-blue-400"
              title="Planerat från"
            />
          </div>

          {/* Datum till */}
          <div className="xl:col-span-1">
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full border border-gray-300 bg-white text-gray-900 rounded-lg px-3 py-2.5 text-sm shadow-sm focus:ring-2 focus:ring-blue-400"
              title="Planerat till"
            />
          </div>
        </div>

        {skotareLoadError && (
          <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1 inline-block">
            Kunde inte hämta komplett skötare-lista: {skotareLoadError}. Dropdownen visar skötare som förekommer i underhållen som fallback.
          </div>
        )}
      </div>

      {/* Tabell */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 text-gray-900 shadow-sm">
          Inga underhåll matchar dina filter.
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-[1300px] w-full text-sm">
              <thead className="bg-slate-800 border-b border-gray-200 sticky top-0 z-10">
                <tr>
                  <th className="text-left px-4 py-5 align-middle">
                    <SortHeader field="rubrik">Rubrik</SortHeader>
                  </th>
                  <th className="text-left px-4 py-5 align-middle">
                    <SortHeader field="status">Status</SortHeader>
                  </th>
                  <th className="text-left px-4 py-5 align-middle">
                    <SortHeader field="planerat_datum">Planerat</SortHeader>
                  </th>
                  <th className="text-left px-4 py-5 align-middle">
                    <SortHeader field="klart_datum">Klart</SortHeader>
                  </th>
                  <th className="text-left px-4 py-5 align-middle font-semibold text-white">Fastighet</th>
                  <th className="text-left px-4 py-5 align-middle font-semibold text-white">Byggnad</th>
                  <th className="text-left px-4 py-5 align-middle font-semibold text-white">Objekt</th>
                  <th className="text-left px-4 py-5 align-middle font-semibold text-white">Skötare</th>
                  <th className="text-left px-4 py-5 align-middle font-semibold text-white">Åtgärder</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200">
                {filtered.map((u, index) => {
                  const fastLabel = u.fastigheter?.namn || u.fastigheter?.adress || '—';
                  const byggLabel = u.byggnader?.namn || '—';
                  const objektLabel = u.objekt?.namn || '—';

                  return (
                    <tr
                      key={u.id}
                      className={`transition hover:bg-slate-200/70 ${
                        index % 2 === 0 ? 'bg-white' : 'bg-slate-100'
                      }`}
                    >
                      <td className="px-4 py-4 align-middle">
                        <div className="font-semibold text-gray-900">{u.rubrik}</div>
                      </td>

                      <td className="px-4 py-4 align-middle">
                        {statusBadge(u.status)}
                      </td>

                      <td className="px-4 py-4 align-middle text-gray-800 whitespace-nowrap">
                        {u.planerat_datum ?? '—'}
                      </td>

                      <td className="px-4 py-4 align-middle text-gray-800 whitespace-nowrap">
                        {u.klart_datum ?? '—'}
                      </td>

                      <td className="px-4 py-4 align-middle text-gray-800">
                        <div className="max-w-[220px] truncate" title={fastLabel}>
                          {fastLabel}
                        </div>
                      </td>

                      <td className="px-4 py-4 align-middle text-gray-800">
                        <div className="max-w-[180px] truncate" title={byggLabel}>
                          {byggLabel}
                        </div>
                      </td>

                      <td className="px-4 py-4 align-middle text-gray-800">
                        <div className="max-w-[180px] truncate" title={objektLabel}>
                          {objektLabel}
                        </div>
                      </td>

                      <td className="px-4 py-4 align-middle">
                        <div className="max-w-[260px]">
                          <SkotareBadges list={u.skotare} />
                        </div>
                      </td>

                      <td className="px-4 py-4 align-middle">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            onClick={() => navigate(`/dashboard/underhall/${u.id}`)}
                            className="px-3 py-1.5 text-sm border border-blue-300 text-blue-700 rounded bg-white hover:bg-blue-50 cursor-pointer"
                          >
                            Visa
                          </button>
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