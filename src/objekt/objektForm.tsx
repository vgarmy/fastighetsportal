import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate, useSearchParams } from 'react-router-dom';

interface ByggnadsObjektFormProps {
  onSaved?: () => void;
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

const OBJEKT_TYPER = ['lägenhet', 'förråd', 'soprum', 'källare', 'lokal', 'kontor', 'gård', 'annan'] as const;
type ObjektTyp = (typeof OBJEKT_TYPER)[number];

export function ByggnadsObjektForm({
  onSaved,
  presetFastighetId,
  presetByggnadId,
}: ByggnadsObjektFormProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const objektIdFromQuery = searchParams.get('id') || undefined;
  const fastighetFromQuery = searchParams.get('fastighet') || undefined;
  const byggnadFromQuery = searchParams.get('byggnad') || undefined;

  const isEditMode = Boolean(objektIdFromQuery);

  const initialFastighetPreset = presetFastighetId ?? fastighetFromQuery ?? '';
  const initialByggnadPreset = presetByggnadId ?? byggnadFromQuery ?? '';

  const [fastigheter, setFastigheter] = useState<FastighetOption[]>([]);
  const [byggnader, setByggnader] = useState<ByggnadOption[]>([]);
  const [loadingInit, setLoadingInit] = useState(true);

  const [fastighetId, setFastighetId] = useState<string>(initialFastighetPreset);
  const [byggnadId, setByggnadId] = useState<string>(initialByggnadPreset);

  const [namn, setNamn] = useState('');
  const [typ, setTyp] = useState<ObjektTyp>('lägenhet');
  const [plan, setPlan] = useState('');
  const [kvadratmeter, setKvadratmeter] = useState('');
  const [beskrivning, setBeskrivning] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMessage, setOkMessage] = useState<string | null>(null);

  const isFastighetLocked = Boolean(initialFastighetPreset);
  const isByggnadLocked = Boolean(initialByggnadPreset);

  const showCancelButton = isEditMode || isFastighetLocked || isByggnadLocked;

  const skipNextAutoSelectRef = useRef(false);

  const labelForFastighet = (f?: FastighetOption | null) => {
    if (!f) return 'Namnlös';
    const base = f.namn || 'Namnlös';
    return f.adress ? `${base} — ${f.adress}` : base;
  };

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

        const allFastigheter = fData ?? [];
        const allByggnader = bData ?? [];

        const fastighetIdsMedByggnad = new Set(
          allByggnader
            .map((b) => b.fastighet_id)
            .filter(Boolean)
        );

        const filteredFastigheter = allFastigheter.filter((f) =>
          fastighetIdsMedByggnad.has(f.id)
        );

        setFastigheter(filteredFastigheter);
        setByggnader(allByggnader);

        if (isEditMode && objektIdFromQuery) {
          const { data: objektData, error: objektErr } = await supabase
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
                fastighet_id
              )
            `)
            .eq('id', objektIdFromQuery)
            .single();

          if (objektErr) throw objektErr;

          const byggRelRaw = objektData?.byggnader ?? null;
          const byggRel = Array.isArray(byggRelRaw) ? (byggRelRaw[0] ?? null) : byggRelRaw;

          const loadedFastighetId = byggRel?.fastighet_id ?? '';
          const loadedByggnadId = objektData?.byggnad_id ?? '';

          skipNextAutoSelectRef.current = true;

          setFastighetId(loadedFastighetId);
          setByggnadId(loadedByggnadId);
          setNamn(objektData?.namn ?? '');
          setTyp(
            OBJEKT_TYPER.includes(objektData?.typ as ObjektTyp)
              ? (objektData.typ as ObjektTyp)
              : 'annan'
          );
          setPlan(objektData?.plan ?? '');
          setKvadratmeter(
            objektData?.kvadratmeter !== null && objektData?.kvadratmeter !== undefined
              ? String(objektData.kvadratmeter)
              : ''
          );
          setBeskrivning(objektData?.beskrivning ?? '');
        } else {
          const validInitialFastighet =
            initialFastighetPreset && fastighetIdsMedByggnad.has(initialFastighetPreset)
              ? initialFastighetPreset
              : '';

          const chosenFastighetId =
            validInitialFastighet ||
            filteredFastigheter[0]?.id ||
            '';

          setFastighetId(chosenFastighetId);

          const byggnaderUnderValdFastighet = allByggnader.filter(
            (b) => b.fastighet_id === chosenFastighetId
          );

          const validInitialByggnad =
            initialByggnadPreset &&
              byggnaderUnderValdFastighet.some((b) => b.id === initialByggnadPreset)
              ? initialByggnadPreset
              : '';

          setByggnadId(validInitialByggnad || byggnaderUnderValdFastighet[0]?.id || '');
        }
      } catch (e: any) {
        setError(e.message || 'Kunde inte hämta fastigheter/byggnader/objekt.');
      } finally {
        setLoadingInit(false);
      }
    };

    load();
  }, [initialFastighetPreset, initialByggnadPreset, isEditMode, objektIdFromQuery]);

  const byggnaderForFastighet = useMemo(
    () => byggnader.filter((b) => b.fastighet_id === fastighetId),
    [byggnader, fastighetId]
  );

  useEffect(() => {
    if (loadingInit) return;

    if (skipNextAutoSelectRef.current) {
      skipNextAutoSelectRef.current = false;
      return;
    }

    if (!isByggnadLocked) {
      setByggnadId((current) => {
        const existsInCurrentFastighet = byggnaderForFastighet.some((b) => b.id === current);
        if (existsInCurrentFastighet) return current;
        return byggnaderForFastighet[0]?.id ?? '';
      });
    }

    setOkMessage(null);
    setError(null);
  }, [fastighetId, byggnaderForFastighet, isByggnadLocked, loadingInit]);

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
    if (!isFastighetLocked) {
      const firstFastighetId = fastigheter[0]?.id ?? '';
      setFastighetId(firstFastighetId);

      const under = byggnader.filter((b) => b.fastighet_id === firstFastighetId);
      if (!isByggnadLocked) {
        setByggnadId(under[0]?.id ?? '');
      }
    } else if (!isByggnadLocked) {
      const under = byggnader.filter((b) => b.fastighet_id === fastighetId);
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

    const kvadratVal = kvadratmeter.trim()
      ? parseFloat(kvadratmeter.trim().replace(',', '.'))
      : null;

    if (kvadratmeter.trim() && Number.isNaN(kvadratVal)) {
      setError('Kvadratmeter måste vara ett tal (använd punkt eller komma).');
      setSaving(false);
      return;
    }

    try {
      if (isEditMode && objektIdFromQuery) {
        const { error: updateError } = await supabase
          .from('byggnad_objekt')
          .update({
            byggnad_id: byggnadId,
            namn: namn.trim(),
            typ: typ || null,
            plan: plan.trim() || null,
            kvadratmeter: kvadratVal,
            beskrivning: beskrivning.trim() || null,
          })
          .eq('id', objektIdFromQuery);

        if (updateError) throw updateError;

        setOkMessage('Byggnadsobjekt uppdaterat!');
      } else {
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
      }

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
      <h2 className="text-lg font-semibold text-gray-900">
        {isEditMode ? 'Redigera byggnadsobjekt' : 'Byggnadsobjekt'}
      </h2>

      {error && <div className="text-red-600 font-medium text-center">{error}</div>}
      {okMessage && <div className="text-green-700 font-medium text-center">{okMessage}</div>}

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
          {!loadingInit && fastigheter.length === 0 && (
            <option>Inga fastigheter med byggnader</option>
          )}
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

      <div>
        <label className="block text-gray-700 font-medium mb-1">Namn (obligatoriskt)</label>
        <input
          value={namn}
          onChange={(e) => setNamn(e.target.value)}
          placeholder='T.ex. "Lägenhet 2A"'
          className="p-3 border rounded w-full bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>

      <div>
        <label className="block text-gray-700 font-medium mb-1">Typ</label>
        <div className="flex flex-wrap gap-2">
          {OBJEKT_TYPER.map((t) => (
            <button
              type="button"
              key={t}
              onClick={() => setTyp(t)}
              className={`px-3 py-1 rounded-md border ${typ === t
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-900 border-gray-300 hover:bg-gray-100'
                }`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-gray-700 font-medium mb-1">Plan/våning (valfritt)</label>
        <input
          value={plan}
          onChange={(e) => setPlan(e.target.value)}
          placeholder='T.ex. "1", "2", "BV"'
          className="p-3 border rounded w-full bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>

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

      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !fastighetId || !byggnadId}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 w-full font-semibold disabled:opacity-60 cursor-pointer"
        >
          {saving
            ? (isEditMode ? 'Uppdaterar...' : 'Sparar...')
            : (isEditMode ? 'Uppdatera byggnadsobjekt' : 'Spara byggnadsobjekt')}
        </button>
        {showCancelButton && (
          <button
            type="button"
            onClick={() => navigate(-1)}
            disabled={saving}
            className="bg-gray-200 text-gray-900 px-4 py-2 rounded hover:bg-gray-300 font-semibold cursor-pointer"
          >
            Avbryt
          </button>
        )}
      </div>
    </form>
  );
}