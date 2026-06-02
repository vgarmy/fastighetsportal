// pages/SkapaUnderhall.tsx
import { useEffect, useMemo, useState } from 'react';
import {
  useNavigate,
  useSearchParams,
  createSearchParams,
  useParams,
} from 'react-router-dom';
import { supabase } from '../lib/supabase';

type Skotare = {
  id: string;
  fornamn: string;
  efternamn: string;
  email?: string | null;
};

type FastighetLite = {
  id: string;
  namn: string;
  adress: string;
};

type ByggnadLite = {
  id: string;
  namn: string;
  fastighet_id: string;
};

type ObjektLite = {
  id: string;
  namn: string | null;
  byggnad_id: string;
};

type TabKey = 'detaljer' | 'tillhor' | 'skotare';

function uniqueSkotare(list: Skotare[]) {
  const map = new Map<string, Skotare>();
  for (const s of list) {
    if (!s?.id) continue;
    map.set(s.id, s);
  }
  return Array.from(map.values());
}

export function SkapaUnderhall() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { id: routeId } = useParams<{ id: string }>();

  const editId = routeId || searchParams.get('id') || '';
  const isEditMode = !!editId;

  // ---- UI state ----
  const [tab, setTab] = useState<TabKey>('tillhor');
  const [saving, setSaving] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ---- Form state ----
  const [rubrik, setRubrik] = useState('');
  const [beskrivning, setBeskrivning] = useState('');
  const [status, setStatus] = useState<'planerat' | 'pågående' | 'klart'>('planerat');
  const [planeratDatum, setPlaneratDatum] = useState<string>('');
  const [klartDatum, setKlartDatum] = useState<string>('');

  // Tillhörighet
  const [fastigheter, setFastigheter] = useState<FastighetLite[]>([]);
  const [byggnader, setByggnader] = useState<ByggnadLite[]>([]);
  const [objekt, setObjekt] = useState<ObjektLite[]>([]);

  const [fastighetId, setFastighetId] = useState<string>(searchParams.get('fastighet') || '');
  const [byggnadId, setByggnadId] = useState<string>(searchParams.get('byggnad') || '');
  const [objektId, setObjektId] = useState<string>(searchParams.get('objekt') || '');

  // Skötare
  const [valdaSkotare, setValdaSkotare] = useState<string[]>([]);
  const [tillgangligaSkotare, setTillgangligaSkotare] = useState<Skotare[]>([]);
  const [redanValdaSkotareData, setRedanValdaSkotareData] = useState<Skotare[]>([]);

  // -----------------------------------
  // Ladda fastigheter
  // -----------------------------------
  useEffect(() => {
    const loadFastigheter = async () => {
      setError(null);

      const { data, error } = await supabase
        .from('fastigheter')
        .select('id, namn, adress')
        .order('namn', { ascending: true });

      if (error) {
        setError(error.message);
        return;
      }

      setFastigheter((data ?? []) as FastighetLite[]);
    };

    loadFastigheter();
  }, []);

  // -----------------------------------
  // Edit-läge: hämta befintligt underhåll
  // -----------------------------------
  useEffect(() => {
    let cancelled = false;

    async function loadExisting() {
      if (!isEditMode || !editId) return;

      setLoadingInitial(true);
      setError(null);

      try {
        const { data, error } = await supabase
          .from('underhåll')
          .select(`
            id,
            rubrik,
            beskrivning,
            status,
            planerat_datum,
            klart_datum,
            fastighet_id,
            byggnad_id,
            objekt_id
          `)
          .eq('id', editId)
          .single();

        if (error) throw error;

        const item = data as any;

        if (!cancelled) {
          setRubrik(item.rubrik ?? '');
          setBeskrivning(item.beskrivning ?? '');
          setStatus((item.status ?? 'planerat') as 'planerat' | 'pågående' | 'klart');
          setPlaneratDatum(item.planerat_datum ?? '');
          setKlartDatum(item.klart_datum ?? '');
          setFastighetId(item.fastighet_id ?? '');
          setByggnadId(item.byggnad_id ?? '');
          setObjektId(item.objekt_id ?? '');
        }

        // Hämta kopplade skötare
        const { data: links, error: linkErr } = await supabase
          .from('underhåll_skotare')
          .select('skotare_id')
          .eq('underhåll_id', editId);

        if (linkErr) throw linkErr;

        const ids = Array.from(
          new Set((links ?? []).map((row: any) => row.skotare_id).filter(Boolean))
        ) as string[];

        if (ids.length > 0) {
          if (!cancelled) setValdaSkotare(ids);

          const { data: users, error: usersErr } = await supabase
            .from('fastighets_users')
            .select('id, fornamn, efternamn, email')
            .in('id', ids);

          if (usersErr) throw usersErr;

          if (!cancelled) {
            setRedanValdaSkotareData((users ?? []) as Skotare[]);
          }
        } else {
          if (!cancelled) {
            setValdaSkotare([]);
            setRedanValdaSkotareData([]);
          }
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e.message || 'Kunde inte läsa in underhållet.');
        }
      } finally {
        if (!cancelled) {
          setLoadingInitial(false);
        }
      }
    }

    loadExisting();
    return () => {
      cancelled = true;
    };
  }, [editId, isEditMode]);

  // -----------------------------------
  // Ladda byggnader när fastighet ändras
  // Behåll byggnad om den fortfarande finns
  // -----------------------------------
  useEffect(() => {
    let cancelled = false;

    async function loadByggnader() {
      setError(null);

      if (!fastighetId) {
        setByggnader([]);
        setByggnadId('');
        setObjekt([]);
        setObjektId('');
        return;
      }

      const { data, error } = await supabase
        .from('byggnader')
        .select('id, namn, fastighet_id')
        .eq('fastighet_id', fastighetId)
        .order('namn', { ascending: true });

      if (error) {
        if (!cancelled) setError(error.message);
        return;
      }

      const list = (data ?? []) as ByggnadLite[];

      if (!cancelled) {
        setByggnader(list);

        if (byggnadId && !list.some((b) => b.id === byggnadId)) {
          setByggnadId('');
          setObjekt([]);
          setObjektId('');
        }
      }
    }

    loadByggnader();

    return () => {
      cancelled = true;
    };
  }, [fastighetId]);

  // -----------------------------------
  // Ladda objekt när byggnad ändras
  // Behåll objekt om det fortfarande finns
  // -----------------------------------
  useEffect(() => {
    let cancelled = false;

    async function loadObjekt() {
      setError(null);

      if (!byggnadId) {
        setObjekt([]);
        setObjektId('');
        return;
      }

      const { data, error } = await supabase
        .from('byggnad_objekt')
        .select('id, namn, byggnad_id')
        .eq('byggnad_id', byggnadId)
        .order('namn', { ascending: true });

      if (error) {
        if (!cancelled) setError(error.message);
        return;
      }

      const list = (data ?? []) as ObjektLite[];

      if (!cancelled) {
        setObjekt(list);

        if (objektId && !list.some((o) => o.id === objektId)) {
          setObjektId('');
        }
      }
    }

    loadObjekt();

    return () => {
      cancelled = true;
    };
  }, [byggnadId]);

  // -----------------------------------
  // Synka fastighet om byggnad är vald
  // -----------------------------------
  useEffect(() => {
    if (!byggnadId || byggnader.length === 0) return;
    const b = byggnader.find((x) => x.id === byggnadId);
    if (b && b.fastighet_id !== fastighetId) {
      setFastighetId(b.fastighet_id);
    }
  }, [byggnadId, byggnader, fastighetId]);

  // -----------------------------------
  // Ladda tillgängliga skötare
  // prioritet: objekt > byggnad > fastighet
  // -----------------------------------
  useEffect(() => {
    let cancelled = false;

    async function loadAllowedCaretakers() {
      try {
        setError(null);

        if (!fastighetId && !byggnadId && !objektId) {
          if (!cancelled) setTillgangligaSkotare([]);
          return;
        }

        if (objektId) {
          const { data, error } = await supabase
            .from('byggnad_objekt_skotare')
            .select('skotare_id ( id, fornamn, efternamn, email )')
            .eq('objekt_id', objektId);

          if (error) throw error;

          const list: Skotare[] = (data ?? [])
            .map((r: any) => r.skotare_id)
            .filter(Boolean);

          if (!cancelled) setTillgangligaSkotare(list);
          return;
        }

        if (byggnadId) {
          const { data, error } = await supabase
            .from('byggnad_skotare')
            .select('skotare_id ( id, fornamn, efternamn, email )')
            .eq('byggnad_id', byggnadId);

          if (error) throw error;

          const list: Skotare[] = (data ?? [])
            .map((r: any) => r.skotare_id)
            .filter(Boolean);

          if (!cancelled) setTillgangligaSkotare(list);
          return;
        }

        if (fastighetId) {
          const { data, error } = await supabase
            .from('fastighet_skotare')
            .select('skotare_id ( id, fornamn, efternamn, email )')
            .eq('fastighet_id', fastighetId);

          if (error) throw error;

          const list: Skotare[] = (data ?? [])
            .map((r: any) => r.skotare_id)
            .filter(Boolean);

          if (!cancelled) setTillgangligaSkotare(list);
          return;
        }

        if (!cancelled) setTillgangligaSkotare([]);
      } catch (e: any) {
        if (!cancelled) {
          setTillgangligaSkotare([]);
          setError(e.message || 'Kunde inte hämta skötare för valet.');
        }
      }
    }

    loadAllowedCaretakers();

    return () => {
      cancelled = true;
    };
  }, [fastighetId, byggnadId, objektId]);

  // Visa både tillgängliga + redan kopplade skötare i edit-läge
  const synligaSkotare = useMemo(() => {
    return uniqueSkotare([...tillgangligaSkotare, ...redanValdaSkotareData]);
  }, [tillgangligaSkotare, redanValdaSkotareData]);

  // -----------------------------------
  // Validering
  // -----------------------------------
  const valideringsFel = useMemo(() => {
    const fel: string[] = [];

    if (!fastighetId) fel.push('Du måste välja en fastighet.');
    if (!rubrik.trim()) fel.push('Rubrik är obligatorisk.');
   
    if (klartDatum && planeratDatum && klartDatum < planeratDatum) {
      fel.push('Klart datum kan inte vara före planerat datum.');
    }

    if (objektId && !byggnadId) {
      fel.push('Välj byggnad för valt objekt.');
    }

    return fel;
  }, [rubrik, fastighetId, planeratDatum, klartDatum, byggnadId, objektId]);

  const kanSpara = valideringsFel.length === 0 && !saving && !loadingInitial;

  // -----------------------------------
  // Spara / Uppdatera
  // -----------------------------------
  const handleSave = async () => {
    if (!kanSpara) return;

    setSaving(true);
    setError(null);

    try {
      const body: any = {
        fastighet_id: fastighetId,
        byggnad_id: byggnadId || null,
        objekt_id: objektId || null,
        rubrik: rubrik.trim(),
        beskrivning: beskrivning.trim() || null,
        status,
        planerat_datum: planeratDatum || null,
        klart_datum: klartDatum || null,
      };

      let underhallId = editId;

      if (isEditMode) {
        const { error: updErr } = await supabase
          .from('underhåll')
          .update(body)
          .eq('id', editId);

        if (updErr) throw updErr;
      } else {
        const { data: created, error: insErr } = await supabase
          .from('underhåll')
          .insert(body)
          .select('id')
          .single();

        if (insErr) throw insErr;
        underhallId = (created as any).id as string;
      }

      // Synka skötare: ta bort gamla och lägg in nya
      const { error: deleteLinksErr } = await supabase
        .from('underhåll_skotare')
        .delete()
        .eq('underhåll_id', underhallId);

      if (deleteLinksErr) throw deleteLinksErr;

      if (valdaSkotare.length > 0) {
        const rows = valdaSkotare.map((sid) => ({
          underhåll_id: underhallId,
          skotare_id: sid,
        }));

        const { error: insertLinksErr } = await supabase
          .from('underhåll_skotare')
          .insert(rows);

        if (insertLinksErr) throw insertLinksErr;
      }

      if (isEditMode) {
        navigate(`/dashboard/underhall/${underhallId}`);
      } else {
        navigate({
          pathname: '/dashboard/underhall',
          search: `?${createSearchParams({ fastighet: fastighetId })}`,
        });
      }
    } catch (e: any) {
      setError(e.message || 'Kunde inte spara underhållsposten.');
    } finally {
      setSaving(false);
    }
  };

  if (loadingInitial) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-16 rounded-2xl bg-gray-200 animate-pulse" />
        <div className="h-96 rounded-2xl bg-gray-100 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-gray-300 shadow bg-white px-5 py-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            {isEditMode ? 'Redigera underhåll' : 'Nytt underhåll'}
          </h1>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() =>
                isEditMode
                  ? navigate(`/dashboard/underhall/${editId}`)
                  : navigate(-1)
              }
              className="text-sm bg-gray-200 text-gray-900 px-3 py-1.5 rounded-md hover:bg-gray-300 transition border border-gray-300"
            >
              Avbryt
            </button>

            <button
              onClick={handleSave}
              disabled={!kanSpara}
              className="text-sm bg-blue-700 text-white px-3 py-1.5 rounded-md hover:bg-blue-800 transition disabled:opacity-40"
            >
              {saving ? 'Sparar...' : isEditMode ? 'Uppdatera' : 'Spara'}
            </button>
          </div>
        </div>
      </div>

      {/* Felmeddelanden */}
      {(error || valideringsFel.length > 0) && (
        <div className="rounded-lg border border-red-300 p-4 bg-red-100 text-sm text-red-900">
          {error && <div className="mb-2 font-semibold">{error}</div>}
          {valideringsFel.length > 0 && (
            <ul className="list-disc pl-5 space-y-1">
              {valideringsFel.map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow border border-gray-300">
        <div className="flex border-b border-gray-300 overflow-x-auto rounded-t-xl">
          <TabButton
            active={tab === 'tillhor'}
            onClick={() => setTab('tillhor')}
            label="Tillhörighet"
            first
          />
          <TabButton
            active={tab === 'detaljer'}
            onClick={() => setTab('detaljer')}
            label="Detaljer"
          />
          <TabButton
            active={tab === 'skotare'}
            onClick={() => setTab('skotare')}
            label="Skötare"
            last
          />
        </div>

        {/* DETALJER */}
        {tab === 'detaljer' && (
          <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <label className="block text-sm font-semibold text-gray-900">
                Rubrik *
                <input
                  value={rubrik}
                  onChange={(e) => setRubrik(e.target.value)}
                  className="mt-1 w-full border border-gray-300 bg-white text-gray-900 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400"
                  placeholder="Ex. Målning av trapphus"
                />
              </label>

              <label className="block text-sm font-semibold text-gray-900">
                Status
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="mt-1 w-full border border-gray-300 bg-white text-gray-900 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400"
                >
                  <option value="planerat">Planerat</option>
                  <option value="pågående">Pågående</option>
                  <option value="klart">Klart</option>
                </select>
              </label>
            </div>

            <div className="space-y-4">
              <label className="block text-sm font-semibold text-gray-900">
                Planerat datum
                <input
                  type="date"
                  value={planeratDatum}
                  onChange={(e) => setPlaneratDatum(e.target.value)}
                  className="mt-1 w-full border border-gray-300 bg-white text-gray-900 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400"
                />
              </label>

              <label className="block text-sm font-semibold text-gray-900">
                Klart datum
                <input
                  type="date"
                  value={klartDatum}
                  onChange={(e) => setKlartDatum(e.target.value)}
                  className="mt-1 w-full border border-gray-300 bg-white text-gray-900 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400"
                />
              </label>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-900">
                Beskrivning
                <textarea
                  value={beskrivning}
                  onChange={(e) => setBeskrivning(e.target.value)}
                  rows={5}
                  className="mt-1 w-full border border-gray-300 bg-white text-gray-900 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400"
                  placeholder="Kort beskrivning av underhållet..."
                />
              </label>
            </div>
          </div>
        )}

        {/* TILLHÖRIGHET */}
        {tab === 'tillhor' && (
          <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-6">
            <label className="block text-sm font-semibold text-gray-900">
              Fastighet *
              <select
                value={fastighetId}
                onChange={(e) => setFastighetId(e.target.value)}
                className="mt-1 w-full border border-gray-300 bg-white text-gray-900 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-400"
              >
                <option value="">Välj fastighet…</option>
                {fastigheter.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.namn} — {f.adress}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm font-semibold text-gray-900">
              Byggnad (valfri)
              <select
                value={byggnadId}
                onChange={(e) => setByggnadId(e.target.value)}
                disabled={!fastighetId}
                className="mt-1 w-full border border-gray-300 bg-white text-gray-900 rounded-md px-3 py-2 disabled:bg-gray-100 disabled:text-gray-600 focus:ring-2 focus:ring-blue-400"
              >
                <option value="">— Ingen byggnad —</option>
                {byggnader.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.namn}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm font-semibold text-gray-900">
              Objekt (valfri)
              <select
                value={objektId}
                onChange={(e) => setObjektId(e.target.value)}
                disabled={!byggnadId}
                className="mt-1 w-full border border-gray-300 bg-white text-gray-900 rounded-md px-3 py-2 disabled:bg-gray-100 disabled:text-gray-600 focus:ring-2 focus:ring-blue-400"
              >
                <option value="">— Inget objekt —</option>
                {objekt.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.namn || o.id}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}

        {/* SKÖTARE */}
        {tab === 'skotare' && (
          <div className="p-5">
            <p className="text-sm text-gray-900 mb-4">
              Välj en eller flera skötare som ska ansvara.
            </p>

            {!fastighetId && (
              <div className="mb-4 rounded border border-gray-300 bg-gray-50 text-gray-800 text-sm p-3">
                Välj först en <b>Fastighet</b> (och ev. Byggnad/Objekt) under <b>Tillhörighet</b> för att se tillgängliga skötare.
              </div>
            )}

            {fastighetId && synligaSkotare.length === 0 && (
              <div className="mb-4 rounded border border-amber-300 bg-amber-50 text-amber-900 text-sm p-3">
                Inga skötare är kopplade till det aktuella valet. Tilldela skötare till fastighet/byggnad/objekt först.
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {synligaSkotare.map((s) => {
                const checked = valdaSkotare.includes(s.id);

                return (
                  <label
                    key={s.id}
                    className={[
                      'rounded-lg border p-4 cursor-pointer flex justify-between items-center shadow-sm',
                      checked
                        ? 'bg-indigo-100 border-indigo-400'
                        : 'bg-white hover:bg-gray-100 border-gray-300',
                    ].join(' ')}
                  >
                    <div>
                      <div className="font-semibold text-gray-900">
                        {s.fornamn} {s.efternamn}
                      </div>
                      <div className="text-sm text-gray-800">{s.email}</div>
                    </div>

                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        setValdaSkotare((prev) =>
                          prev.includes(s.id)
                            ? prev.filter((x) => x !== s.id)
                            : [...prev, s.id]
                        )
                      }
                      className="h-5 w-5"
                    />
                  </label>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------- Tab button ------- */
function TabButton({
  active,
  onClick,
  label,
  first = false,
  last = false,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  first?: boolean;
  last?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'relative px-4 py-3 text-sm whitespace-nowrap border-b-2 transition cursor-pointer',
        first ? 'rounded-tl-xl' : '',
        last ? 'rounded-tr-xl' : '',
        active
          ? 'text-blue-900 font-bold border-blue-700 bg-blue-50'
          : 'text-gray-700 hover:text-gray-900 border-transparent hover:bg-gray-100',
      ].join(' ')}
      role="tab"
      aria-selected={active}
    >
      {label}
    </button>
  );
}