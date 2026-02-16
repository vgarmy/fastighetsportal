
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
  const [skotareId, setSkotareId] = useState(''); // <-- dropdown
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
      if (tag === 'input' || tag === 'textarea') return;
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
    if (field === sortField) setSortAsc(s => !s);
    else { setSortField(field); setSortAsc(true); }
  };

  // ---------- Ladda UNDERHÅLL + OBJEKT + SKÖTARE per underhåll ----------
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        // 1) Hämta underhåll
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

        // 2) Hämta objekt separat och mappa in
        const objektIds = [...new Set(base.map(r => r.objekt_id).filter(Boolean))] as string[];
        if (objektIds.length > 0) {
          const { data: objs, error: oErr } = await supabase
            .from('byggnad_objekt')
            .select('id, namn')
            .in('id', objektIds);
          if (oErr) throw oErr;

          const omap = new Map<string, ObjektLite>((objs ?? []).map((o: any) => [o.id, { id: o.id, namn: o.namn ?? null }]));
          base.forEach(r => { r.objekt = r.objekt_id ? (omap.get(r.objekt_id) ?? null) : null; });
        }

        // 3) Hämta skötare per underhåll (robust för både user_id och skotare_id)
        const underhallIds = base.map(r => r.id);
        if (underhallIds.length > 0) {
          // Försök läsa via user_id -> fastighets_users
          let caretRaw: any[] | null = null;
          let cErr: any = null;

          // Försök 1: user_id
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

          // Försök 2: skotare_id (om du råkar ha den äldre kolumnen)
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
              // sista fallback: hämta bara id och slå ihop med allSkotare senare (om du vill)
              const res3 = await supabase
                .from('underhåll_skotare')
                .select('underhåll_id, user_id, skotare_id')
                .in('underhåll_id', underhallIds);
              caretRaw = res3.data ?? [];
              cErr = res2.error || res3.error;
            }
          }

          if (cErr) {
            // visa inte error UI; men logga
            console.warn('Kunde inte läsa underhåll_skotare med relationer:', cErr.message || cErr);
          }

          const map = new Map<string, Skotare[]>();

          (caretRaw ?? []).forEach((r: any) => {
            const uhId = r.underhall_id ?? r['underhåll_id'];
            // matcha antingen r.user eller r.skotare (båda är fastighets_users)
            const u: Skotare | null =
              r.user
                ? { id: r.user.id, fornamn: r.user.fornamn, efternamn: r.user.efternamn, email: r.user.email }
                : r.skotare
                  ? { id: r.skotare.id, fornamn: r.skotare.fornamn, efternamn: r.skotare.efternamn, email: r.skotare.email }
                  : null;
            if (!uhId || !u) return;
            if (!map.has(uhId)) map.set(uhId, []);
            map.get(uhId)!.push(u);
          });

          base.forEach(r => { r.skotare = map.get(r.id) ?? []; });
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

  // ---------- Ladda ALLA skötare från fastighets_users ----------
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

  // ---------- Alternativ för dropdowns ----------
  const fastigheterOptions = useMemo(() => {
    const set = new Map<string, { id: string; label: string }>();
    rows.forEach(r => {
      if (!r.fastigheter) return;
      const label = r.fastigheter.namn || r.fastigheter.adress || r.fastigheter.id;
      if (r.fastigheter.id && label) set.set(r.fastigheter.id, { id: r.fastigheter.id, label });
    });
    return Array.from(set.values()).sort((a, b) => a.label.localeCompare(b.label, 'sv'));
  }, [rows]);

  const byggnaderOptions = useMemo(() => {
    const set = new Map<string, { id: string; label: string }>();
    rows.forEach(r => {
      if (fastighetId && r.fastighet_id !== fastighetId) return;
      if (!r.byggnader) return;
      const label = r.byggnader.namn || r.byggnader.id;
      if (r.byggnader.id && label) set.set(r.byggnader.id, { id: r.byggnader.id, label });
    });
    return Array.from(set.values()).sort((a, b) => a.label.localeCompare(b.label, 'sv'));
  }, [rows, fastighetId]);

  const objektOptions = useMemo(() => {
    const set = new Map<string, { id: string; label: string }>();
    rows.forEach(r => {
      if (fastighetId && r.fastighet_id !== fastighetId) return;
      if (byggnadId && r.byggnad_id !== byggnadId) return;
      if (!r.objekt) return;
      const label = r.objekt.namn || r.objekt.id;
      if (r.objekt.id && label) set.set(r.objekt.id, { id: r.objekt.id, label });
    });
    return Array.from(set.values()).sort((a, b) => a.label.localeCompare(b.label, 'sv'));
  }, [rows, fastighetId, byggnadId]);

  // Skötare-dropdownens källista: alla från fastighets_users
  const skotareDropdown = useMemo(() => {
    // om hämtning misslyckas/tom → fallback: skötare som förekommer på raderna
    const fallback = Array.from(
      new Map(rows.flatMap(r => r.skotare).map(s => [s.id, s])).values()
    );
    const src = allSkotare.length ? allSkotare : fallback;
    return src.sort((a, b) =>
      `${a.fornamn} ${a.efternamn}`.localeCompare(`${b.fornamn} ${b.efternamn}`, 'sv')
    );
  }, [allSkotare, rows]);

  // ---------- Filtrerat resultat ----------
  const filtered = useMemo(() => {
    let out = [...rows];

    if (q.trim()) {
      const qs = q.trim().toLowerCase();
      out = out.filter(r =>
        r.rubrik.toLowerCase().includes(qs) ||
        (r.fastigheter?.namn || '').toLowerCase().includes(qs) ||
        (r.fastigheter?.adress || '').toLowerCase().includes(qs) ||
        (r.byggnader?.namn || '').toLowerCase().includes(qs) ||
        (r.objekt?.namn || '').toLowerCase().includes(qs) ||
        r.skotare.some(s => `${s.fornamn} ${s.efternamn}`.toLowerCase().includes(qs))
      );
    }

    if (status !== 'alla') out = out.filter(r => r.status === status);
    if (fastighetId) out = out.filter(r => r.fastighet_id === fastighetId);
    if (byggnadId) out = out.filter(r => r.byggnad_id === byggnadId);
    if (objektId) out = out.filter(r => r.objekt_id === objektId);

    if (skotareId) {
      out = out.filter(r => r.skotare.some(s => s.id === skotareId));
    }

    if (fromDate) out = out.filter(r => !r.planerat_datum || r.planerat_datum >= fromDate);
    if (toDate) out = out.filter(r => !r.planerat_datum || r.planerat_datum <= toDate);

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
    const base = 'inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border';
    switch (s) {
      case 'planerat': return <span className={`${base} bg-amber-50 text-amber-800 border-amber-200`}>Planerat</span>;
      case 'pågående': return <span className={`${base} bg-blue-50  text-blue-800  border-blue-200`}>Pågående</span>;
      case 'klart': return <span className={`${base} bg-green-50 text-green-800 border-green-200`}>Klart</span>;
      default: return <span className={`${base} bg-gray-50  text-gray-800  border-gray-200`}>{s}</span>;
    }
  };

  const SkotareBadges = ({ list }: { list: Skotare[] }) => {
    if (!list || list.length === 0) {
      return <span className="text-xs text-gray-600">Inga skötare tilldelade</span>;
    }
    const first = list.slice(0, 3);
    const restCount = list.length - first.length;
    return (
      <div className="flex flex-wrap gap-2">
        {first.map(s => (
          <span
            key={s.id}
            className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-900 px-2 py-0.5 rounded border border-indigo-200 text-xs"
            title={s.email || ''}
          >
            {s.fornamn} {s.efternamn}
          </span>
        ))}
        {restCount > 0 && (
          <span className="inline-flex items-center bg-gray-100 text-gray-800 px-2 py-0.5 rounded border border-gray-300 text-xs">
            +{restCount}
          </span>
        )}
      </div>
    );
  };

  // ---------- Render ----------
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-64 bg-gray-200 rounded animate-pulse" />
        <div className="h-16 w-full bg-gray-100 rounded animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="h-40 bg-gray-100 rounded animate-pulse" />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <div className="rounded border border-red-300 bg-red-100 text-red-900 p-4">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1
          onClick={() => changeSort('planerat_datum')}
          className="text-3xl font-bold text-gray-900 cursor-pointer select-none"
        >
          Underhåll
        </h1>
        <button
          onClick={() => navigate('/dashboard/underhall/create')}
          className="bg-blue-700 text-white px-4 py-2 rounded-md hover:bg-blue-800 transition text-sm"
        >
          + Nytt underhåll
        </button>
      </div>

      {/* Filterpanel */}
      <div className="rounded-xl border border-gray-300 bg-white shadow p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-8 gap-3">
          {/* SÖKRUTA */}
          <div className="relative">
            <svg
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
              viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"
            >
              <path fillRule="evenodd" d="M12.9 14.32a8 8 0 111.414-1.414l4.387 4.387a1 1 0 01-1.414 1.414l-4.387-4.387zM14 8a6 6 0 11-12 0 6 6 0 0112 0z" clipRule="evenodd" />
            </svg>

            <input
              ref={searchRef}
              value={rawQ}
              onChange={(e) => setRawQ(e.target.value)}
              placeholder="Sök rubrik / fastighet / byggnad / objekt / skötare… (tryck /)"
              className="w-full pl-9 pr-9 border border-gray-300 bg-white text-gray-900 rounded-lg px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-400 placeholder:text-gray-400"
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
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            )}
          </div>

          {/* Status */}
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as any)}
            className="border border-gray-300 bg-white text-gray-900 rounded-lg px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-blue-400"
          >
            <option value="alla">Alla statusar</option>
            <option value="planerat">Planerat</option>
            <option value="pågående">Pågående</option>
            <option value="klart">Klart</option>
          </select>

          {/* Fastighet */}
          <select
            value={fastighetId}
            onChange={(e) => { setFastighetId(e.target.value); setByggnadId(''); setObjektId(''); }}
            className="border border-gray-300 bg-white text-gray-900 rounded-lg px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-blue-400"
          >
            <option value="">Alla fastigheter</option>
            {fastigheterOptions.map(f => (
              <option key={f.id} value={f.id}>{f.label}</option>
            ))}
          </select>

          {/* Byggnad */}
          <select
            value={byggnadId}
            onChange={(e) => { setByggnadId(e.target.value); setObjektId(''); }}
            disabled={!fastighetId || byggnaderOptions.length === 0}
            className="border border-gray-300 bg-white text-gray-900 rounded-lg px-3 py-2 text-sm disabled:bg-gray-100 disabled:text-gray-600 shadow-sm focus:ring-2 focus:ring-blue-400"
          >
            <option value="">Alla byggnader</option>
            {byggnaderOptions.map(b => (
              <option key={b.id} value={b.id}>{b.label}</option>
            ))}
          </select>

          {/* Objekt */}
          <select
            value={objektId}
            onChange={(e) => setObjektId(e.target.value)}
            disabled={!fastighetId || objektOptions.length === 0}
            className="border border-gray-300 bg-white text-gray-900 rounded-lg px-3 py-2 text-sm disabled:bg-gray-100 disabled:text-gray-600 shadow-sm focus:ring-2 focus:ring-blue-400"
          >
            <option value="">Alla objekt</option>
            {objektOptions.map(o => (
              <option key={o.id} value={o.id}>{o.label}</option>
            ))}
          </select>

          {/* Skötare (från fastighets_users) */}
          <select
            value={skotareId}
            onChange={(e) => setSkotareId(e.target.value)}
            className="border border-gray-300 bg-white text-gray-900 rounded-lg px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-blue-400"
          >
            <option value="">Alla skötare</option>
            {skotareDropdown.map(s => (
              <option key={s.id} value={s.id}>
                {s.fornamn} {s.efternamn}{s.email ? ` (${s.email})` : ''}
              </option>
            ))}
          </select>

          {/* Datum från/till */}
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="border border-gray-300 bg-white text-gray-900 rounded-lg px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-blue-400"
            title="Planerat från"
          />

          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="border border-gray-300 bg-white text-gray-900 rounded-lg px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-blue-400"
            title="Planerat till"
          />
        </div>

        {skotareLoadError && (
          <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded px-2 py-1 inline-block">
            Kunde inte hämta komplett skötare-lista: {skotareLoadError}. Dropdownen visar skötare som förekommer i underhållen som fallback.
          </div>
        )}
      </div>

      {/* Lista */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-gray-300 bg-white p-6 text-gray-900">
          Inga underhåll matchar dina filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((u) => {
            const fastLabel = u.fastigheter?.namn || u.fastigheter?.adress || '—';
            const byggLabel = u.byggnader?.namn || '—';
            const objektLabel = u.objekt?.namn || '—';

            return (
              <div key={u.id} className="rounded-xl border border-gray-300 bg-white shadow-sm p-4 flex flex-col gap-3">
                <div className="flex items-start justify-between">
                  <h3 className="text-base font-semibold text-gray-900 line-clamp-2">{u.rubrik}</h3>
                  {statusBadge(u.status)}
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm text-gray-900">
                  <div>
                    <div className="text-gray-600 text-xs">Planerat</div>
                    <div className="font-medium">{u.planerat_datum ?? '—'}</div>
                  </div>
                  <div>
                    <div className="text-gray-600 text-xs">Klart</div>
                    <div className="font-medium">{u.klart_datum ?? '—'}</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-gray-600 text-xs">Fastighet</div>
                    <div className="font-medium">{fastLabel}</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-gray-600 text-xs">Byggnad</div>
                    <div className="font-medium">{byggLabel}</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-gray-600 text-xs">Objekt</div>
                    <div className="font-medium">{objektLabel}</div>
                  </div>
                </div>

                {/* Skötare */}
                <div>
                  <div className="text-gray-600 text-xs mb-1">Skötare</div>
                  <SkotareBadges list={u.skotare} />
                </div>

                <div className="mt-1 flex gap-2">
                  <button
                    onClick={() => navigate(`/dashboard/underhall/${u.id}`)}
                    className="text-blue-700 hover:text-blue-800 text-sm font-medium"
                  >
                    Visa
                  </button>

                  <button
                    onClick={() => navigate(`/dashboard/tilldela/underhall-skotare?underhall=${u.id}`)}
                    className="text-sm bg-blue-700 text-white px-3 py-1 rounded-md hover:bg-blue-800 transition"
                  >
                    Tilldela skötare
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}