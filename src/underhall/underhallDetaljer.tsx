import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import {
  Calendar,
  CalendarCheck,
  Home,
  Building2,
  Package,
  Users,
  BookmarkCheck,
  ArrowLeft
} from "lucide-react";

/* ============================
   Typer (samma som i din lista)
   ============================ */
type FastighetLite = { id: string; namn: string | null; adress: string | null };
type ByggnadLite = { id: string; namn: string | null };
type ObjektLite = { id: string; namn: string | null };
type Skotare = { id: string; fornamn: string; efternamn: string; email?: string | null };

type Underhall = {
  id: string;
  rubrik: string;
  status: "planerat" | "pågående" | "klart" | string;
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

/* ============================
   Hjälpare
   ============================ */
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
    case "klart":    return "bg-emerald-100 text-emerald-900 border-emerald-200";
    default:         return "bg-slate-100 text-slate-900 border-slate-200";
  }
}

/**
 * Normaliserar relationella värden som kan komma som objekt ELLER array från Supabase.
 * Om det är en array -> ta första elementet, annars returnera objektet som är.
 */
function firstOrNull<T>(rel: T | T[] | null | undefined): T | null {
  if (!rel) return null;
  return Array.isArray(rel) ? (rel[0] ?? null) : rel;
}

/* ============================
   KOMPONENT: Underhåll Detalj
   ============================ */
export function UnderhallDetalj() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [item, setItem] = useState<Underhall | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!id) return;
      setLoading(true);
      setError(null);

      try {
        // 1) Hämta underhåll + fastigheter/byggnader (samma tabeller och fält som hos dig)
        const { data: u, error: uErr } = await supabase
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
          .eq("id", id)
          .single();

        if (uErr) throw uErr;

        // 2) Basobjekt + normalisering av relationer
        const base: Underhall = {
          id: u.id,
          rubrik: u.rubrik,
          status: (u.status as string) ?? "planerat",
          planerat_datum: u.planerat_datum ?? null,
          klart_datum: u.klart_datum ?? null,
          fastighet_id: u.fastighet_id,
          byggnad_id: u.byggnad_id ?? null,
          objekt_id: u.objekt_id ?? null,
          fastigheter: firstOrNull<FastighetLite>(u.fastigheter),
          byggnader: firstOrNull<ByggnadLite>(u.byggnader),
          objekt: null,
          skotare: [],
        };

        // 3) Hämta objekt-data (byggnad_objekt)
        if (base.objekt_id) {
          const { data: obj, error: oErr } = await supabase
            .from("byggnad_objekt")
            .select("id, namn")
            .eq("id", base.objekt_id)
            .maybeSingle();
          if (oErr) throw oErr;
          base.objekt = obj ? { id: obj.id, namn: obj.namn ?? null } : null;
        }

        // 4) Hämta skötare – robust för både user_id och skotare_id
        const { data: links, error: lErr } = await supabase
          .from("underhåll_skotare")
          .select("underhåll_id, skotare_id")
          .eq("underhåll_id", base.id);
        if (lErr) throw lErr;

        const userIds = new Set<string>();
        (links ?? []).forEach((row: any) => {
          if (row.user_id) userIds.add(row.user_id);
          if (row.skotare_id) userIds.add(row.skotare_id);
        });

        if (userIds.size > 0) {
          const { data: users, error: u2Err } = await supabase
            .from("fastighets_users")
            .select("id, fornamn, efternamn, email")
            .in("id", Array.from(userIds));
          if (u2Err) throw u2Err;
          base.skotare = (users ?? []) as Skotare[];
        }

        if (!cancelled) setItem(base);
      } catch (e: any) {
        if (!cancelled) setError(e.message || "Kunde inte hämta underhåll.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [id]);

  const fastighet = useMemo(() => item?.fastigheter?.namn ?? item?.fastigheter?.adress ?? null, [item]);
  const byggnad = useMemo(() => item?.byggnader?.namn ?? null, [item]);
  const objekt   = useMemo(() => item?.objekt?.namn ?? null, [item]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-12 bg-slate-200 rounded animate-pulse" />
        <div className="h-24 bg-slate-100 rounded animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md border border-red-300 bg-red-50 p-4 text-red-900">
        {error}
      </div>
    );
  }

  if (!item) {
    return (
      <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-amber-900">
        Kunde inte hitta underhållet.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* HEADER + BACK */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate("/dashboard/underhall")}
          className="inline-flex items-center gap-2 text-sm text-slate-700 hover:text-slate-900"
        >
          <ArrowLeft size={16} />
          Tillbaka till listan
        </button>

        <button
          onClick={() => navigate("/dashboard/underhall/create")}
          className="bg-blue-700 text-white px-4 py-2 rounded-md hover:bg-blue-800 transition text-sm"
        >
          + Nytt underhåll
        </button>
      </div>

      {/* TITEL + ACTIONS (samma knappar som du vill använda) */}
      <div className="rounded-2xl border border-slate-200 overflow-hidden shadow">
        <div className="p-6 bg-gradient-to-b from-slate-900 to-slate-800">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <h1 className="text-2xl font-semibold text-white">
              {item.rubrik ?? "(utan rubrik)"}
            </h1>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => navigate(`/dashboard/underhall/${item.id}`)}
                className="px-3 py-1.5 text-sm border border-slate-300 rounded bg-white/10 text-white hover:bg-white/20"
              >
                Visa
              </button>

              <button
                onClick={() => navigate(`/dashboard/underhall/edit/${item.id}`)}
                className="px-3 py-1.5 text-sm border border-blue-300 text-blue-700 rounded bg-white hover:bg-blue-50"
              >
                Redigera
              </button>

              <button
                onClick={() => navigate(`/dashboard/tilldela/underhall-skotare?underhall=${item.id}`)}
                className="px-3 py-1.5 text-sm border border-indigo-300 text-indigo-700 rounded bg-white hover:bg-indigo-50"
              >
                Lägg till skötare
              </button>

              <button
                onClick={async () => {
                  const today = toYMD(new Date());
                  await supabase
                    .from("underhåll")
                    .update({ status: "klart", klart_datum: today })
                    .eq("id", item.id);

                  setItem(prev => prev ? { ...prev, status: "klart", klart_datum: today } : prev);
                }}
                className="px-3 py-1.5 text-sm border border-emerald-300 text-emerald-700 rounded bg-white hover:bg-emerald-50"
              >
                Klart
              </button>

              <button
                onClick={async () => {
                  if (!confirm("Ta bort detta underhåll?")) return;
                  await supabase.from("underhåll").delete().eq("id", item.id);
                  navigate("/dashboard/underhall");
                }}
                className="px-3 py-1.5 text-sm border border-red-300 text-red-700 rounded bg-white hover:bg-red-50"
              >
                Ta bort
              </button>
            </div>
          </div>
        </div>

        {/* INNEHÅLL */}
        <div className="p-6 space-y-6 bg-white">
          {/* Status + Datum */}
          <div className="flex flex-wrap gap-6 items-start">
            {/* Status */}
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <BookmarkCheck size={16} />
                <strong>Status</strong>
              </div>
              <div>
                <span className={`text-xs px-2 py-1 rounded border font-semibold ${badgeColor(item.status)}`}>
                  {item.status}
                </span>
              </div>
            </div>

            {/* Planerat datum */}
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Calendar size={16} />
                <strong>Start Datum</strong>
              </div>
              <div className="text-sm text-slate-800">
                {item.planerat_datum ? formatSvDate(item.planerat_datum) : "—"}
              </div>
            </div>

            {/* Klart datum */}
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <CalendarCheck size={16} />
                <strong>Klart Datum</strong>
              </div>
              <div className="text-sm text-slate-800">
                {item.klart_datum ? formatSvDate(item.klart_datum) : "—"}
              </div>
            </div>
          </div>

          {/* Fastighet / Byggnad / Objekt */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Home size={16} />
                <strong>Fastighet</strong>
              </div>
              <div className="text-sm text-slate-800">{fastighet ?? "—"}</div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Building2 size={16} />
                <strong>Byggnad</strong>
              </div>
              <div className="text-sm text-slate-800">{byggnad ?? "—"}</div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Package size={16} />
                <strong>Objekt</strong>
              </div>
              <div className="text-sm text-slate-800">{objekt ?? "—"}</div>
            </div>
          </div>

          {/* Skötare */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Users size={16} />
              <strong>Skötare</strong>
            </div>
            <div className="flex flex-wrap gap-2">
              {item.skotare.length === 0 ? (
                <span className="text-xs text-slate-500">Ingen</span>
              ) : (
                item.skotare.map((s) => (
                  <span
                    key={s.id}
                    title={s.email || ""}
                    className="px-2 py-0.5 text-xs rounded border border-indigo-200 bg-indigo-50 text-indigo-900"
                  >
                    {s.fornamn} {s.efternamn}
                  </span>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}