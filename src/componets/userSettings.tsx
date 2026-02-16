import { useEffect, useMemo, useState } from "react";
import { useUser } from "./userContext";
import { supabase } from "../lib/supabase";
import { generateWeeklyPlanPdf } from "../lib/pdf"; // anpassa sökväg
import {
  User as UserIcon,
  Mail,
  MapPin,
  Shield,
  Settings,
  ChevronRight,
  CalendarDays,
  Clock,
  ListChecks,
  Printer
} from "lucide-react";

/* =========================
   Typer
   ========================= */
type Underhall = {
  id: string;
  rubrik: string | null;
  status: "planerat" | "pågående" | "klart";
  planerat_datum: string | null; // YYYY-MM-DD
};


/* =========================
   Hjälpfunktioner (ISO-vecka Mån–Sön)
   ========================= */
function getISOWeekNumber(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7)); // torsdag i aktuell vecka
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((+d - +yearStart) / 86400000 + 1) / 7);
  return weekNo;
}

function getCurrentISOWeekRange(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() === 0 ? 7 : d.getUTCDay(); // 1=mån ... 7=sön
  const mondayUTC = new Date(d);
  mondayUTC.setUTCDate(d.getUTCDate() - day + 1);
  mondayUTC.setUTCHours(0, 0, 0, 0);

  const sundayUTC = new Date(mondayUTC);
  sundayUTC.setUTCDate(mondayUTC.getUTCDate() + 6);
  sundayUTC.setUTCHours(23, 59, 59, 999);

  return { start: mondayUTC, end: sundayUTC, week: getISOWeekNumber(date) };
}

function toYMD(date: Date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatSvDate(d: string | Date) {
  const date = typeof d === "string" ? new Date(d + "T00:00:00Z") : d;
  return new Intl.DateTimeFormat("sv-SE", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  }).format(date);
}

function statusBadgeColor(status: Underhall["status"]) {
  switch (status) {
    case "planerat":
      return "bg-amber-100 text-amber-900 border-amber-200";
    case "pågående":
      return "bg-blue-100 text-blue-900 border-blue-200";
    case "klart":
      return "bg-emerald-100 text-emerald-900 border-emerald-200";
    default:
      return "bg-slate-100 text-slate-900 border-slate-200";
  }
}

/* =========================
   Komponent
   ========================= */
export function UserSettings() {
  const { user } = useUser();

  // ---- Underhållsplan state ----
  const [{ start, end, week }] = useState(() => getCurrentISOWeekRange());
  const ymdStart = useMemo(() => toYMD(start), [start]);
  const ymdEnd = useMemo(() => toYMD(end), [end]);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);
  const [items, setItems] = useState<Underhall[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadWeeklyPlan() {
      setLoadingPlan(true);
      setPlanError(null);
      try {
        // Vi använder skötarens ID – finns det som user.skotare_id i din app.
        const skotareId = (user as any)?.skotare_id ?? (user as any)?.id ?? null;
        if (!skotareId) {
          if (!cancelled) setItems([]);
          return;
        }

        // 🔒 Bara mina: INNER JOIN mot underhåll_skotare
        // Viktigt: Tabellnamn och kolumnnamn exakt som i din DB:
        //  - Tabell: underhåll_skotare (med å)
        //  - Kolumn: skotare_id (utan ö), underhåll_id (med å)
        const { data, error } = await supabase
          .from("underhåll")
          .select(
            `
          id, rubrik, status, planerat_datum,
          underhåll_skotare!inner(skotare_id)
        `
          )
          .gte("planerat_datum", ymdStart)
          .lte("planerat_datum", ymdEnd)
          .eq("underhåll_skotare.skotare_id", skotareId) // <-- kolumnen är ASCII här
          .order("planerat_datum", { ascending: true })
          .returns<
            (Underhall & { underhåll_skotare: { skotare_id: string }[] })[]
          >();

        if (error) throw error;

        const rows: Underhall[] = (data ?? []).map((r) => ({
          id: r.id,
          rubrik: r.rubrik,
          status: r.status,
          planerat_datum: r.planerat_datum,
        }));

        if (!cancelled) setItems(rows);
      } catch (e: any) {
        if (!cancelled) {
          setPlanError(e.message ?? "Kunde inte hämta din personliga underhållsplan.");
          setItems([]);
        }
      } finally {
        if (!cancelled) setLoadingPlan(false);
      }
    }

    loadWeeklyPlan();
    return () => {
      cancelled = true;
    };
  }, [ymdStart, ymdEnd, user]); // se till att du INTE har kvar 'onlyMine' här

  if (!user)
    return (
      <div className="p-6 text-gray-700 text-lg font-medium">
        Laddar användarinställningar…
      </div>
    );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-gray-300 shadow bg-white px-5 py-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Settings className="w-6 h-6 text-gray-700" />
            Användarinställningar
          </h1>
          <div className="flex flex-wrap gap-2">{/* plats för knappar */}</div>
        </div>
      </div>

      {/* Grid: vänster profil (2 spalter), höger veckoplan */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Vänster: Profil */}
        <div className="lg:col-span-2">
          <div className="bg-white shadow-xl border border-slate-200 rounded-2xl p-8 space-y-8">
            {/* Profilinfo */}
            <div>
              <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2 mb-4">
                <Shield className="w-5 h-5 text-slate-400" />
                Din profil
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-slate-700">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <UserIcon className="w-5 h-5 text-slate-400" />
                  <div>
                    <p className="text-xs uppercase font-semibold text-slate-500">
                      Förnamn
                    </p>
                    <p className="font-medium">{user.fornamn}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <UserIcon className="w-5 h-5 text-slate-400" />
                  <div>
                    <p className="text-xs uppercase font-semibold text-slate-500">
                      Efternamn
                    </p>
                    <p className="font-medium">{user.efternamn}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <Mail className="w-5 h-5 text-slate-400" />
                  <div>
                    <p className="text-xs uppercase font-semibold text-slate-500">
                      E‑post
                    </p>
                    <p className="font-medium break-all">{user.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <MapPin className="w-5 h-5 text-slate-400" />
                  <div>
                    <p className="text-xs uppercase font-semibold text-slate-500">
                      Adress
                    </p>
                    <p className="font-medium">{user.adress ?? "-"}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Roll-info */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 flex items-start gap-4">
              <Shield className="w-6 h-6 text-slate-400 mt-1" />
              <div>
                <h3 className="font-semibold text-slate-800">Behörighetsnivå</h3>
                <p className="text-slate-600 text-sm">
                  Du är inloggad som{" "}
                  <span className="font-semibold">{user.roll}</span>.
                </p>
              </div>
            </div>

            {/* Inställningsknappar (framtid) */}
            <div className="pt-4 border-t border-slate-200">
              <h2 className="text-xl font-semibold text-slate-800 mb-4">
                Fler inställningar
              </h2>

              <div className="space-y-3">
                <button className="w-full flex items-center justify-between bg-white hover:bg-slate-100 transition p-4 rounded-lg border border-slate-200">
                  <span className="font-medium text-slate-700">
                    Ändra lösenord
                  </span>
                  <ChevronRight className="text-slate-400" />
                </button>

                <button className="w-full flex items-center justify-between bg-white hover:bg-slate-100 transition p-4 rounded-lg border border-slate-200">
                  <span className="font-medium text-slate-700">
                    Uppdatera kontaktuppgifter
                  </span>
                  <ChevronRight className="text-slate-400" />
                </button>

                <button className="w-full flex items-center justify-between bg-white hover:bg-slate-100 transition p-4 rounded-lg border border-slate-200">
                  <span className="font-medium text-slate-700">
                    Notifikationsinställningar
                  </span>
                  <ChevronRight className="text-slate-400" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Höger: Underhållsplan för vecka */}
        <aside className="lg:col-span-1">
          <div className="bg-white shadow-xl border border-slate-200 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-slate-500" />
                Underhållsplan — vecka {week}
              </h2>
            </div>

            <p className="text-sm text-slate-600 mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" />
              {formatSvDate(start)} – {formatSvDate(end)}
            </p>

            {/* Fel */}
            {planError && (
              <div className="mb-3 rounded border border-red-300 bg-red-50 text-red-900 text-sm p-3">
                {planError}
              </div>
            )}

            {/* Laddar */}
            {loadingPlan && (
              <div className="space-y-2">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="animate-pulse h-12 rounded-md bg-slate-100 border border-slate-200"
                  />
                ))}
              </div>
            )}

            {/* Tomt */}
            {!loadingPlan && items.length === 0 && (
              <div className="rounded-md border border-slate-200 bg-slate-50 text-slate-700 p-4 text-sm">
                Inga underhåll hittades denna vecka.
              </div>
            )}

            {/* Lista */}
            {!loadingPlan && items.length > 0 && (
              <ul className="space-y-3">
                {items.map((u) => (
                  <li
                    key={u.id}
                    className="p-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm text-slate-500 mb-1">
                          {u.planerat_datum
                            ? formatSvDate(u.planerat_datum)
                            : "—"}
                        </div>
                        <div className="font-medium text-slate-900 truncate">
                          {u.rubrik ?? "(utan rubrik)"}
                        </div>
                      </div>
                      <span
                        className={
                          "text-xs px-2 py-1 rounded border " +
                          statusBadgeColor(u.status)
                        }
                        title={u.status}
                      >
                        {u.status}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {/* Länk/knapp till underhållet (kan kopplas till routing) */}

            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50 transition"
                onClick={() => {
                  // Navigera till hela underhållsvyn om du vill
                  // navigate('/dashboard/underhall?vecka=' + week)
                }}
              >
                <ListChecks className="w-4 h-4" />
                Gå till underhållet
              </button>

              <button
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md border border-blue-200 text-white bg-blue-600 hover:bg-blue-700 transition"
                onClick={() =>
                  generateWeeklyPlanPdf({
                    user: { fornamn: user.fornamn, efternamn: user.efternamn, email: user.email },
                    items, // <- dina redan filtrerade personliga uppdrag
                    week,
                    start,
                    end,
                  })
                }
              >
                <Printer className="w-4 h-4" />
                Skriv ut underhållsplan (PDF)
              </button>
            </div>

          </div>
        </aside>
      </div>
    </div>
  );
}