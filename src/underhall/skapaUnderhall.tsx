
// pages/SkapaUnderhall.tsx
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams, createSearchParams } from 'react-router-dom';
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

export function SkapaUnderhall() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // ---- Form state ----
  const [tab, setTab] = useState<TabKey>('detaljer');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Detaljer
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

  // 🔹 NY: skötare som faktiskt får väljas baserat på Fastighet/Byggnad/Objekt
  const [tillgangligaSkotare, setTillgangligaSkotare] = useState<Skotare[]>([]);

  // ---- Load initial lists ----
  useEffect(() => {
    const loadFastigheter = async () => {
      setError(null);
      const { data, error } = await supabase
        .from('fastigheter')
        .select('id, namn, adress')
        .order('namn', { ascending: true });
      if (error) return setError(error.message);
      setFastigheter((data ?? []) as any);
    };
    loadFastigheter();
  }, []);

  // Load byggnader when fastighet changes
  useEffect(() => {
    const loadByggnader = async () => {
      setByggnader([]);
      setByggnadId('');
      setObjekt([]);
      setObjektId('');
      if (!fastighetId) return;

      const { data, error } = await supabase
        .from('byggnader')
        .select('id, namn, fastighet_id')
        .eq('fastighet_id', fastighetId)
        .order('namn', { ascending: true });

      if (error) return setError(error.message);
      setByggnader((data ?? []) as any);
    };
    loadByggnader();
  }, [fastighetId]);

  // Load objekt when byggnad changes
  useEffect(() => {
    const loadObjekt = async () => {
      setObjekt([]);
      setObjektId('');
      if (!byggnadId) return;

      const { data, error } = await supabase
        .from('byggnad_objekt')
        .select('id, namn, byggnad_id')
        .eq('byggnad_id', byggnadId)
        .order('namn', { ascending: true });

      if (error) return setError(error.message);
      setObjekt((data ?? []) as any);
    };
    loadObjekt();
  }, [byggnadId]);

  // If byggnad is selected, ensure fastighet sync
  useEffect(() => {
    if (!byggnadId || byggnader.length === 0) return;
    const b = byggnader.find(x => x.id === byggnadId);
    if (b && b.fastighet_id !== fastighetId) {
      setFastighetId(b.fastighet_id);
    }
  }, [byggnadId, byggnader]);

  // 🔹 Ladda tillgängliga skötare utifrån val (prioritet: objekt > byggnad > fastighet)
  useEffect(() => {
    let cancelled = false;

    async function loadAllowedCaretakers() {
      try {
        // Nollställ om inget valt
        if (!fastighetId && !byggnadId && !objektId) {
          if (!cancelled) setTillgangligaSkotare([]);
          return;
        }

        // 1) Objekt
        if (objektId) {
          const { data, error } = await supabase
            .from('byggnad_objekt_skotare')
            .select('skotare_id ( id, fornamn, efternamn, email )')
            .eq('objekt_id', objektId);
          if (error) throw error;
          const list: Skotare[] = (data ?? []).map((r: any) => r.skotare_id).filter(Boolean) ?? [];
          if (!cancelled) setTillgangligaSkotare(list);
          return;
        }

        // 2) Byggnad
        if (byggnadId) {
          const { data, error } = await supabase
            .from('byggnad_skotare')
            .select('skotare_id ( id, fornamn, efternamn, email )')
            .eq('byggnad_id', byggnadId);
          if (error) throw error;
          const list: Skotare[] = (data ?? []).map((r: any) => r.skotare_id).filter(Boolean) ?? [];
          if (!cancelled) setTillgangligaSkotare(list);
          return;
        }

        // 3) Fastighet
        if (fastighetId) {
          const { data, error } = await supabase
            .from('fastighet_skotare')
            .select('skotare_id ( id, fornamn, efternamn, email )')
            .eq('fastighet_id', fastighetId);
          if (error) throw error;
          const list: Skotare[] = (data ?? []).map((r: any) => r.skotare_id).filter(Boolean) ?? [];
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
    return () => { cancelled = true; };
  }, [fastighetId, byggnadId, objektId]);

  // 🔹 Rensa bort valda skötare som inte längre är tillgängliga när filter ändras
  useEffect(() => {
    setValdaSkotare(prev => prev.filter(id => tillgangligaSkotare.some(s => s.id === id)));
  }, [tillgangligaSkotare]);

  // Validation
  const valideringsFel = useMemo(() => {
    const fel: string[] = [];
    if (!rubrik.trim()) fel.push('Rubrik är obligatorisk.');
    if (!fastighetId) fel.push('Du måste välja en fastighet.');
    if (klartDatum && planeratDatum && klartDatum < planeratDatum) {
      fel.push('Klart datum kan inte vara före planerat datum.');
    }
    if (objektId && !byggnadId) {
      fel.push('Välj byggnad för valt objekt.');
    }
    return fel;
  }, [rubrik, fastighetId, planeratDatum, klartDatum, byggnadId, objektId]);

  const kanSpara = valideringsFel.length === 0 && !saving;

  // Save
  const handleSave = async () => {
    if (!kanSpara) return;
    setSaving(true);
    setError(null);
    try {
      // Skapa underhåll
      const body: any = {
        fastighet_id: fastighetId,
        byggnad_id: byggnadId || null,
        rubrik: rubrik.trim(),
        beskrivning: beskrivning.trim() || null,
        status, // 'planerat' | 'pågående' | 'klart'
        planerat_datum: planeratDatum || null,
        klart_datum: klartDatum || null,
      };
      if (objektId) body.objekt_id = objektId; // kräver kolumn i DB

      const { data: created, error: insErr } = await supabase
        .from('underhåll')
        .insert(body)
        .select('id')
        .single();

      if (insErr) throw insErr;
      const underhallId = (created as any).id as string;

      // Knyt skötare
      if (valdaSkotare.length > 0) {
        const rows = valdaSkotare.map((sid) => ({
          underhåll_id: underhallId,
          skotare_id: sid,
        }));
        const { error: linkErr } = await supabase
          .from('underhåll_skotare')
          .insert(rows);
        if (linkErr) throw linkErr;
      }

      // Navigera tillbaka/lista (justera efter din routing)
      navigate({
        pathname: '/dashboard/underhall',
        search: `?${createSearchParams({ fastighet: fastighetId })}`,
      });
    } catch (e: any) {
      setError(e.message || 'Kunde inte spara underhållsposten.');
    } finally {
      setSaving(false);
    }
  };

  // ---- UI ----
  return (
    <div className="p-6 space-y-6">

      {/* Header */}
      <div className="rounded-2xl border border-gray-300 shadow bg-white px-5 py-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Nytt underhåll</h1>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => navigate(-1)}
              className="text-sm bg-gray-200 text-gray-900 px-3 py-1.5 rounded-md hover:bg-gray-300 transition border border-gray-300"
            >
              Avbryt
            </button>

            <button
              onClick={handleSave}
              disabled={!kanSpara}
              className="text-sm bg-blue-700 text-white px-3 py-1.5 rounded-md hover:bg-blue-800 transition disabled:opacity-40"
            >
              Spara
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
        <div className="flex border-b border-gray-300 overflow-x-auto">
          <TabButton active={tab === 'detaljer'} onClick={() => setTab('detaljer')} label="Detaljer" />
          <TabButton active={tab === 'tillhor'} onClick={() => setTab('tillhor')} label="Tillhörighet" />
          <TabButton active={tab === 'skotare'} onClick={() => setTab('skotare')} label="Skötare" />
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

            {/* Fastighet */}
            <label className="block text-sm font-semibold text-gray-900">
              Fastighet *
              <select
                value={fastighetId}
                onChange={(e) => setFastighetId(e.target.value)}
                className="mt-1 w-full border border-gray-300 bg-white text-gray-900 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-400"
              >
                <option value="">Välj fastighet…</option>
                {fastigheter.map(f => (
                  <option key={f.id} value={f.id}>{f.namn} — {f.adress}</option>
                ))}
              </select>
            </label>

            {/* Byggnad */}
            <label className="block text-sm font-semibold text-gray-900">
              Byggnad (valfri)
              <select
                value={byggnadId}
                onChange={(e) => setByggnadId(e.target.value)}
                disabled={!fastighetId}
                className="mt-1 w-full border border-gray-300 bg-white text-gray-900 rounded-md px-3 py-2 disabled:bg-gray-100 disabled:text-gray-600 focus:ring-2 focus:ring-blue-400"
              >
                <option value="">— Ingen byggnad —</option>
                {byggnader.map(b => <option key={b.id} value={b.id}>{b.namn}</option>)}
              </select>
            </label>

            {/* Objekt */}
            <label className="block text-sm font-semibold text-gray-900">
              Objekt (valfri)
              <select
                value={objektId}
                onChange={(e) => setObjektId(e.target.value)}
                disabled={!byggnadId}
                className="mt-1 w-full border border-gray-300 bg-white text-gray-900 rounded-md px-3 py-2 disabled:bg-gray-100 disabled:text-gray-600 focus:ring-2 focus:ring-blue-400"
              >
                <option value="">— Inget objekt —</option>
                {objekt.map(o => <option key={o.id} value={o.id}>{o.namn || o.id}</option>)}
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

            {/* Info när inget är valt */}
            {!fastighetId && (
              <div className="mb-4 rounded border border-gray-300 bg-gray-50 text-gray-800 text-sm p-3">
                Välj först en <b>Fastighet</b> (och ev. Byggnad/Objekt) under <b>Tillhörighet</b> för att se tillgängliga skötare.
              </div>
            )}

            {/* Info om inga skötare hittas */}
            {fastighetId && tillgangligaSkotare.length === 0 && (
              <div className="mb-4 rounded border border-amber-300 bg-amber-50 text-amber-900 text-sm p-3">
                Inga skötare är kopplade till det aktuella valet. Tilldela skötare till fastighet/byggnad/objekt först.
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {tillgangligaSkotare.map(s => {
                const checked = valdaSkotare.includes(s.id);
                return (
                  <label
                    key={s.id}
                    className={[
                      'rounded-lg border p-4 cursor-pointer flex justify-between items-center shadow-sm',
                      checked
                        ? 'bg-indigo-100 border-indigo-400'
                        : 'bg-white hover:bg-gray-100 border-gray-300'
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
                        setValdaSkotare(prev =>
                          prev.includes(s.id)
                            ? prev.filter(x => x !== s.id)
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
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'relative px-4 py-3 text-sm whitespace-nowrap border-b-2',
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