
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useSearchParams } from 'react-router-dom';

interface ByggnadsObjektFormProps {
  onSaved?: () => void;
  // Valfritt: förförvald & låst kontext
  presetFastighetId?: string;
  presetByggnadId?: string;
}

type FastighetOption = {
  id: string;
  namn: string | null;
  adress: string | null;
};

type ByggnadOption = {
  id: string;
  namn: string;
  fastighet_id: string;
};

// Justerbar lista beroende på din domän
const OBJEKT_TYPER = ['lägenhet', 'förråd', 'soprum', 'källare', 'lokal', 'kontor', 'gård', 'annan'] as const;
type ObjektTyp = (typeof OBJEKT_TYPER)[number];

export function ByggnadsObjektForm({
  onSaved,
  presetFastighetId,
  presetByggnadId,
}: ByggnadsObjektFormProps) {
  const [searchParams] = useSearchParams();
  const fastighetFromQuery = searchParams.get('fastighet') || undefined;
  const byggnadFromQuery = searchParams.get('byggnad') || undefined;

  // Stabil initialisering (låser om preset/URL finns)
  const initialFastighetPreset = presetFastighetId ?? fastighetFromQuery ?? '';
  const initialByggnadPreset = presetByggnadId ?? byggnadFromQuery ?? '';

  // State
  const [fastigheter, setFastigheter] = useState<FastighetOption[]>([]);
  const [byggnader, setByggnader] = useState<ByggnadOption[]>([]);
  const [loadingInit, setLoadingInit] = useState(true);

  const [fastighetId, setFastighetId] = useState<string>(initialFastighetPreset);
  const [byggnadId, setByggnadId] = useState<string>(initialByggnadPreset);

  const [namn, setNamn] = useState('');
  const [typ, setTyp] = useState<ObjektTyp>('lägenhet');
  const [plan, setPlan] = useState('');
  const [kvadratmeter, setKvadratmeter] = useState(''); // input string -> parseFloat
  const [beskrivning, setBeskrivning] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMessage, setOkMessage] = useState<string | null>(null);

  // Låsning (om preset/URL finns)
  const isFastighetLocked = Boolean(initialFastighetPreset);
  const isByggnadLocked = Boolean(initialByggnadPreset);

  // Etikettbyggare
  const labelForFastighet = (f?: FastighetOption | null) => {
    if (!f) return 'Namnlös';
    const base = f.namn || 'Namnlös';
    return f.adress ? `${base} — ${f.adress}` : base;
  };

  // Ladda fastigheter + byggnader en gång
  useEffect(() => {
    const load = async () => {
      setLoadingInit(true);
      setError(null);
      try {
        const [
          { data: fData, error: fErr },
          { data: bData, error: bErr },
        ] = await Promise.all([
          supabase.from('fastigheter').select('id, namn, adress').order('namn', { ascending: true }),
          supabase.from('byggnader').select('id, namn, fastighet_id').order('namn', { ascending: true }),
        ]);

        if (fErr) throw fErr;
        if (bErr) throw bErr;

        const fList = fData ?? [];
        const bList = bData ?? [];

        setFastigheter(fList);
        setByggnader(bList);

        // Om ingen preset/URL för fastighet: välj första
        if (!initialFastighetPreset) {
          if (fList.length > 0 && !fastighetId) {
            setFastighetId(fList[0].id);
          }
        }

        // Efter att listor finns: synka byggnad preset med vald fastighet
        setTimeout(() => {
          const currentFastighet = initialFastighetPreset || fastighetId;
          const byggUnderFast = bList.filter((b) => b.fastighet_id === currentFastighet);

          if (initialByggnadPreset) {
            const exists = bList.some((b) => b.id === initialByggnadPreset);
            const belongs = bList.some(
              (b) => b.id === initialByggnadPreset && b.fastighet_id === currentFastighet
            );
            if (exists && belongs) {
              setByggnadId(initialByggnadPreset);
            } else if (byggUnderFast.length > 0) {
              setByggnadId(byggUnderFast[0].id);
            } else {
              setByggnadId('');
            }
          } else {
            // Ingen byggnad låst -> välj första under fastighet
            if (byggUnderFast.length > 0) {
              setByggnadId(byggUnderFast[0].id);
            } else {
              setByggnadId('');
            }
          }
        }, 0);
      } catch (e: any) {
        setError(e.message || 'Kunde inte hämta fastigheter/byggnader.');
      } finally {
        setLoadingInit(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filtrerade byggnader
  const byggnaderForFastighet = useMemo(
    () => byggnader.filter((b) => b.fastighet_id === fastighetId),
    [byggnader, fastighetId]
  );

  // När fastighet ändras (manuellt), välj första byggnad under fastigheten (om inte låst)
  useEffect(() => {
    if (!loadingInit) {
      const under = byggnaderForFastighet;
      if (!isByggnadLocked) {
        setByggnadId(under.length > 0 ? under[0].id : '');
      }
      setOkMessage(null);
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fastighetId]);

  // Anti-blink: injicera temporära optioner
  const injectedFastighetOption = useMemo(() => {
    if (!fastighetId) return null;
    const inList = fastigheter.some((f) => f.id === fastighetId);
    if (inList) return null;
    return (
      <option key={`injected-f-${fastighetId}`} value={fastighetId}>
        {loadingInit ? 'Laddar vald fastighet…' : 'Vald fastighet'}
      </option>
    );
  }, [fastighetId, fastigheter, loadingInit]);

  const injectedByggnadOption = useMemo(() => {
    if (!byggnadId) return null;
    const inList = byggnaderForFastighet.some((b) => b.id === byggnadId);
    if (inList) return null;
    return (
      <option key={`injected-b-${byggnadId}`} value={byggnadId}>
        {loadingInit ? 'Laddar vald byggnad…' : 'Vald byggnad'}
      </option>
    );
  }, [byggnadId, byggnaderForFastighet, loadingInit]);

  const resetForm = () => {
    // Behåll låsta val, annars återställ till första
    if (!isFastighetLocked) {
      setFastighetId(fastigheter[0]?.id ?? '');
    }
    if (!isByggnadLocked) {
      const under = byggnaderForFastighet;
      setByggnadId(under[0]?.id ?? '');
    }
    setNamn('');
    setTyp('lägenhet');
    setPlan('');
    setKvadratmeter('');
    setBeskrivning('');
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setOkMessage(null);

    // Grundvalidering
    if (!fastighetId) {
      setError('Välj en fastighet.');
      setSaving(false);
      return;
    }
    if (!byggnadId) {
      setError('Välj en byggnad.');
      setSaving(false);
      return;
    }
    if (!namn.trim()) {
      setError('Namn är obligatoriskt.');
      setSaving(false);
      return;
    }

    // Konverteringar
    const kvadratVal = kvadratmeter.trim()
      ? parseFloat(kvadratmeter.trim().replace(',', '.'))
      : null;
    if (kvadratmeter.trim() && Number.isNaN(kvadratVal)) {
      setError('Kvadratmeter måste vara ett tal (använd punkt eller komma).');
      setSaving(false);
      return;
    }

    try {
      const { error: insertError } = await supabase.from('byggnad_objekt').insert([
        {
          byggnad_id: byggnadId,
          namn: namn.trim(),
          typ: typ || null,
          plan: plan.trim() || null,
          kvadratmeter: kvadratVal,
          beskrivning: beskrivning.trim() || null,
        },
      ]);

      if (insertError) throw insertError;

      resetForm();
      setOkMessage('Byggnadsobjekt sparat!');
      if (onSaved) onSaved();
    } catch (e: any) {
      setError(e.message || 'Ett fel uppstod vid sparande.');
    } finally {
      setSaving(false);
    }
  };

  const selectedFastighetObj =
    fastigheter.find((f) => f.id === fastighetId) || null;
  const selectedFastighetLabel = labelForFastighet(selectedFastighetObj);

  return (
    <form className="p-6 bg-white rounded-xl shadow-md max-w-lg mx-auto space-y-5">
      <h2 className="text-lg font-semibold text-gray-900">Byggnadsobjekt</h2>

      {error && <div className="text-red-600 font-medium text-center">{error}</div>}
      {okMessage && <div className="text-green-700 font-medium text-center">{okMessage}</div>}

      {/* Fastighet */}
      <div>
        <label className="block text-gray-700 font-medium mb-1">Fastighet</label>
        <select
          value={fastighetId}
          onChange={(e) => setFastighetId(e.target.value)}
          disabled={loadingInit || isFastighetLocked}
          className="p-3 border rounded w-full bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-100"
        >
          {injectedFastighetOption}
          {loadingInit && <option>Laddar…</option>}
          {!loadingInit && fastigheter.length === 0 && <option>Inga fastigheter</option>}
          {!loadingInit &&
            fastigheter.map((f) => (
              <option key={f.id} value={f.id}>
                {labelForFastighet(f)}
              </option>
            ))}
        </select>
        {isFastighetLocked && (
          <p className="text-xs text-gray-500 mt-1">
            Förvald fastighet (låst): <span className="font-medium">{selectedFastighetLabel}</span>
          </p>
        )}
      </div>

      {/* Byggnad (filtrerad) */}
      <div>
        <label className="block text-gray-700 font-medium mb-1">Byggnad</label>
        <select
          value={byggnadId}
          onChange={(e) => setByggnadId(e.target.value)}
          disabled={loadingInit || byggnaderForFastighet.length === 0 || isByggnadLocked}
          className="p-3 border rounded w-full bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-100"
        >
          {injectedByggnadOption}
          {byggnaderForFastighet.length === 0 ? (
            <option>Inga byggnader under denna fastighet</option>
          ) : (
            byggnaderForFastighet.map((b) => (
              <option key={b.id} value={b.id}>
                {b.namn}
              </option>
            ))
          )}
        </select>
        {isByggnadLocked && (
          <p className="text-xs text-gray-500 mt-1">Förvald byggnad (låst från URL).</p>
        )}
      </div>

      {/* Namn */}
      <div>
        <label className="block text-gray-700 font-medium mb-1">Namn (obligatoriskt)</label>
        <input
          value={namn}
          onChange={(e) => setNamn(e.target.value)}
          placeholder='T.ex. "Lägenhet 2A"'
          className="p-3 border rounded w-full bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>

      {/* Typ */}
      <div>
        <label className="block text-gray-700 font-medium mb-1">Typ</label>
        <div className="flex flex-wrap gap-2">
          {OBJEKT_TYPER.map((t) => (
            <button
              type="button"
              key={t}
              onClick={() => setTyp(t)}
              className={`px-3 py-1 rounded-md border ${
                typ === t
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-900 border-gray-300 hover:bg-gray-100'
              }`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Plan */}
      <div>
        <label className="block text-gray-700 font-medium mb-1">Plan/våning (valfritt)</label>
        <input
          value={plan}
          onChange={(e) => setPlan(e.target.value)}
          placeholder='T.ex. "1", "2", "BV"'
          className="p-3 border rounded w-full bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>

      {/* Kvadratmeter */}
      <div>
        <label className="block text-gray-700 font-medium mb-1">Kvadratmeter (valfritt)</label>
        <input
          inputMode="decimal"
          value={kvadratmeter}
          onChange={(e) => setKvadratmeter(e.target.value)}
          placeholder="T.ex. 45.5"
          className="p-3 border rounded w-full bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>

      {/* Beskrivning */}
      <div>
        <label className="block text-gray-700 font-medium mb-1">Beskrivning (valfritt)</label>
        <textarea
          value={beskrivning}
          onChange={(e) => setBeskrivning(e.target.value)}
          placeholder="Valfri beskrivning…"
          rows={4}
          className="p-3 border rounded w-full bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>

      <button
        type="button"
        onClick={handleSave}
        disabled={saving || !fastighetId || !byggnadId}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 w-full font-semibold disabled:opacity-60"
      >
        {saving ? 'Sparar...' : 'Spara byggnadsobjekt'}
      </button>
    </form>
  );
}
