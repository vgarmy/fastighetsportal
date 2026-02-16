import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import {
    Calendar,
    Home,
    Building2,
    Package,
    Users,
    BookmarkCheck,
    CalendarCheck
} from "lucide-react";

/* ============================
   Hjälpfunktioner – samma som i UserSettings
   ============================ */
function getISOWeekNumber(date = new Date()): number {
    const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const day = d.getUTCDay() || 7;      // 1..7 (sön=7)
    d.setUTCDate(d.getUTCDate() + 4 - day); // flytta till torsdag i veckan
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const days = Math.floor((Number(d) - Number(yearStart)) / 86400000) + 1;
    return Math.ceil(days / 7);
}

function getCurrentISOWeekRange(baseDate = new Date()) {
    const d = new Date(Date.UTC(baseDate.getUTCFullYear(), baseDate.getUTCMonth(), baseDate.getUTCDate()));
    const day = d.getUTCDay() || 7; // 1=mon..7=sun
    const monday = new Date(d);
    monday.setUTCDate(d.getUTCDate() - day + 1);
    monday.setUTCHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setUTCDate(monday.getUTCDate() + 6);
    sunday.setUTCHours(23, 59, 59, 999);

    return { start: monday, end: sunday, week: getISOWeekNumber(d) };
}

function toYMD(date: Date): string {
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, "0");
    const d = String(date.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

function formatSvDate(input: string | Date): string {
    const date = typeof input === "string" ? new Date(input + "T00:00:00.000Z") : input;
    return new Intl.DateTimeFormat("sv-SE", {
        weekday: "short",
        day: "2-digit",
        month: "short",
    }).format(date);
}

function badgeColor(status: string) {
    switch (status) {
        case "planerat": return "bg-amber-100 text-amber-900 border-amber-200";
        case "pågående": return "bg-blue-100 text-blue-900 border-blue-200";
        case "klart": return "bg-emerald-100 text-emerald-900 border-emerald-200";
        default: return "bg-slate-100 text-slate-900 border-slate-200";
    }
}

/* ============================
   Minimal typ för att ta bort TS(7006) i map((s) => ...)
   ============================ */
type Skotare = { id: string; fornamn: string; efternamn: string; email?: string | null };

/* ============================
   KOMPONENT
   ============================ */
export function WeeklyUnderhall() {
    const navigate = useNavigate();
    const [{ start, end, week }] = useState(() => getCurrentISOWeekRange());
    const ymdStart = useMemo(() => toYMD(start), [start]);
    const ymdEnd = useMemo(() => toYMD(end), [end]);

    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState<any[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            setLoading(true);
            setError(null);

            try {
                // 1) Hämta veckans underhåll + fastighet/byggnad (precis som hos dig)
                const { data: uh, error: uErr } = await supabase
                    .from("underhåll")
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
                    .gte("planerat_datum", ymdStart)
                    .lte("planerat_datum", ymdEnd)
                    .order("planerat_datum", { ascending: true })
                    .gte("klart_datum", ymdStart)
                    .lte("klart_datum", ymdEnd)
                    .order("klart_datum", { ascending: true });

                if (uErr) throw uErr;

                const base = (uh ?? []).map((u: any) => ({
                    ...u,
                    objekt: null as { id: string; namn: string | null } | null,
                    skotare: [] as Skotare[], // behåller din form, typat för TS
                }));

                // 2) Hämta objekt-data (byggnad_objekt) i batch
                const objektIds = [...new Set(base.map(r => r.objekt_id).filter(Boolean))] as string[];
                if (objektIds.length > 0) {
                    const { data: objs, error: oErr } = await supabase
                        .from("byggnad_objekt")
                        .select("id, namn")
                        .in("id", objektIds);
                    if (oErr) throw oErr;

                    const omap = new Map<string, { id: string; namn: string | null }>(
                        (objs ?? []).map((o: any) => [o.id, { id: o.id, namn: o.namn ?? null }])
                    );
                    base.forEach(r => { r.objekt = r.objekt_id ? (omap.get(r.objekt_id) ?? null) : null; });
                }

                // 3) Hämta skötare per underhåll – TVÅ STEG (robust, inga alias krävs)
                const underhallIds = base.map(r => r.id);
                if (underhallIds.length > 0) {
                    // 3a) Läs pivottabellen – ta med både user_id och skotare_id om de finns
                    const { data: links, error: lErr } = await supabase
                        .from("underhåll_skotare")
                        .select("underhåll_id, skotare_id")
                        .in("underhåll_id", underhallIds);
                    if (lErr) throw lErr;

                    // Samla ihop alla unika userIds (user_id eller skotare_id)
                    const userIds = new Set<string>();
                    (links ?? []).forEach((row: any) => {
                        if (row.user_id) userIds.add(row.user_id);
                        if (row.skotare_id) userIds.add(row.skotare_id);
                    });

                    // 3b) Hämta användarna i en batch från fastighets_users
                    let usersById = new Map<string, any>();
                    if (userIds.size > 0) {
                        const { data: users, error: u2Err } = await supabase
                            .from("fastighets_users")
                            .select("id, fornamn, efternamn, email")
                            .in("id", Array.from(userIds));
                        if (u2Err) throw u2Err;
                        usersById = new Map<string, any>((users ?? []).map((u: any) => [u.id, u]));
                    }

                    // Mappa in skötarna på varje underhåll
                    const skMap = new Map<string, Skotare[]>();
                    (links ?? []).forEach((row: any) => {
                        const uhId = row["underhåll_id"];
                        const uid = row.user_id ?? row.skotare_id ?? null;
                        if (!uhId || !uid) return;
                        const u = usersById.get(uid);
                        if (!u) return;
                        if (!skMap.has(uhId)) skMap.set(uhId, []);
                        skMap.get(uhId)!.push(u);
                    });

                    base.forEach(r => { r.skotare = skMap.get(r.id) ?? []; });
                }

                if (!cancelled) setItems(base);
            } catch (e: any) {
                if (!cancelled) setError(e.message || "Kunde inte hämta veckans underhåll.");
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        load();
        return () => { cancelled = true; };
    }, [ymdStart, ymdEnd]);

    /* ============================
       UI – två rader istället för en lång kolumn
       ============================ */
    return (
        <aside className="bg-white shadow-xl border border-slate-200 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                    Underhåll – Vecka {week}
                </h2>
            </div>

            <p className="text-sm text-slate-600 mb-4">
                {formatSvDate(start)} – {formatSvDate(end)}
            </p>

            {error && (
                <div className="mb-3 rounded-md border border-red-300 bg-red-50 p-3 text-red-900 text-sm">
                    {error}
                </div>
            )}

            {!loading && items.length > 0 && (
                <ul className="space-y-3">
                    {items.map((u) => {
                        const fastighet = u.fastigheter?.namn ?? u.fastigheter?.adress ?? null;
                        const byggnad = u.byggnader?.namn || null;
                        const objekt = u.objekt?.namn || null;

                        return (
<li
  key={u.id}
  className="rounded-xl border border-slate-200 hover:bg-slate-50 transition"
>
  {/* === RAD 1: Rubrik (vänster) + Knappar (höger) === */}
  <div className="p-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between bg-gradient-to-b from-slate-900 to-slate-800 rounded-t-xl">
    {/* Rubrik (egen rad, en-linjers) */}
    <div className="flex-1 min-w-0">
      <div className="text-lg font-semibold text-white truncate">
        {u.rubrik ?? "(utan rubrik)"}
      </div>
    </div>

    {/* Knappar till höger i en rad */}
    <div className="flex flex-wrap items-center gap-2 sm:shrink-0 ">
      <button
        onClick={() => navigate(`/dashboard/underhall/${u.id}`)}
        className="px-3 py-1.5 text-sm border border-slate-300 rounded hover:bg-slate-100"
      >
        Visa
      </button>

      <button
        onClick={() => navigate(`/dashboard/underhall/edit/${u.id}`)}
        className="px-3 py-1.5 text-sm border border-blue-300 text-blue-700 rounded hover:bg-blue-50"
      >
        Redigera
      </button>

      <button
        onClick={() => navigate(`/dashboard/tilldela/underhall-skotare?underhall=${u.id}`)}
        className="px-3 py-1.5 text-sm border border-indigo-300 text-indigo-700 rounded hover:bg-indigo-50"
      >
        Lägg till skötare
      </button>

      <button
        onClick={async () => {
          await supabase
            .from("underhåll")
            .update({ status: "klart", klart_datum: toYMD(new Date()) })
            .eq("id", u.id);

          setItems(prev =>
            prev.map(it =>
              it.id === u.id
                ? { ...it, status: "klart", klart_datum: toYMD(new Date()) }
                : it
            )
          );
        }}
        className="px-3 py-1.5 text-sm border border-emerald-300 text-emerald-700 rounded hover:bg-emerald-50"
      >
        Klart
      </button>

      <button
        onClick={async () => {
          if (!confirm("Ta bort detta underhåll?")) return;
          await supabase.from("underhåll").delete().eq("id", u.id);
          setItems(prev => prev.filter(it => it.id !== u.id));
        }}
        className="px-3 py-1.5 text-sm border border-red-300 text-red-700 rounded hover:bg-red-50"
      >
        Ta bort
      </button>
    </div>
  </div>

  {/* === INNEHÅLLSRAD: Datum + Status + Fastighet + Byggnad + Objekt + Skötare === */}
  <div className="mt-3 p-4 flex flex-wrap items-start gap-6">
    {/* Datum */}
    <div>
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Calendar size={16} />
        <strong>Start Datum</strong>
      </div>
      <div className="text-sm text-slate-800">
        {u.planerat_datum ? formatSvDate(u.planerat_datum) : "—"}
      </div>
    </div>

        <div>
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <CalendarCheck size={16} />
        <strong>Klart Datum</strong>
      </div>
      <div className="text-sm text-slate-800">
        {u.klart_datum ? formatSvDate(u.klart_datum) : "—"}
      </div>
    </div>

    {/* Status */}
    <div>
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <BookmarkCheck size={16} />
        <strong>Status</strong>
      </div>
      <div>
        <span className={`text-xs px-2 py-1 rounded border font-semibold ${badgeColor(u.status)}`}>
          {u.status}
        </span>
      </div>
    </div>

    {/* FASTIGHET */}
    {fastighet && (
      <div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Home size={16} />
          <strong>Fastighet</strong>
        </div>
        <div className="text-sm text-slate-800">{fastighet}</div>
      </div>
    )}

    {/* BYGGNAD */}
    {byggnad && (
      <div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Building2 size={16} />
          <strong>Byggnad</strong>
        </div>
        <div className="text-sm text-slate-800">{byggnad}</div>
      </div>
    )}

    {/* OBJEKT */}
    {objekt && (
      <div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Package size={16} />
          <strong>Objekt</strong>
        </div>
        <div className="text-sm text-slate-800">{objekt}</div>
      </div>
    )}

    {/* SKÖTARE */}
    <div>
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Users size={16} />
        <strong>Skötare</strong>
      </div>
      <div className="flex flex-wrap gap-1 mt-2">
        {u.skotare.length === 0 ? (
          <span className="text-xs text-slate-500">Ingen</span>
        ) : (
          u.skotare.map((s: Skotare) => (
            <span
              key={s.id}
              className="px-2 py-0.5 text-xs rounded border border-indigo-200 bg-indigo-50 text-indigo-900"
            >
              {s.fornamn} {s.efternamn}
            </span>
          ))
        )}
      </div>
    </div>
  </div>
</li>
                        );
                    })}
                </ul>
            )}
        </aside>
    );
}
