import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate, useSearchParams } from 'react-router-dom';

type FastighetRow = {
  id: string;
  namn: string | null;
  adress: string | null;
};

type ByggnadRow = {
  id: string;
  namn: string;
  fastighet_id: string;
};

type ObjektRow = {
  id: string;
  namn: string | null;
  byggnad_id: string;
};

type SkotareRow = {
  id: string;
  fornamn: string;
  efternamn: string;
  email?: string | null;
};

type KopplingRow = {
  objekt_id: string;
  skotare_id: string;
  tilldelad_datum: string | null;
};

export function ObjektSkotareForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const fastighetFromQuery = searchParams.get('fastighet') || undefined;
  const byggnadFromQuery = searchParams.get('byggnad') || undefined;
  const objektFromQuery = searchParams.get('objekt') || undefined;

  const [fastigheter, setFastigheter] = useState<FastighetRow[]>([]);
  const [byggnader, setByggnader] = useState<ByggnadRow[]>([]);
  const [objekt, setObjekt] = useState<ObjektRow[]>([]);
  const [skotare, setSkotare] = useState<SkotareRow[]>([]);

  const initialFastighetPreset = fastighetFromQuery ?? '';
  const initialByggnadPreset = byggnadFromQuery ?? '';
  const initialObjektPreset = objektFromQuery ?? '';

  const [valdFastighet, setValdFastighet] = useState<string>(initialFastighetPreset);
  const [valdByggnad, setValdByggnad] = useState<string>(initialByggnadPreset);
  const [valtObjekt, setValtObjekt] = useState<string>(initialObjektPreset);

  const [valdaSkotare, setValdaSkotare] = useState<string[]>([]);
  const [tilldelade, setTilldelade] = useState<KopplingRow[]>([]);
  const [overwriteMode, setOverwriteMode] = useState(false);

  const [loadingInit, setLoadingInit] = useState(true);
  const [loadingSave, setLoadingSave] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMessage, setOkMessage] = useState<string | null>(null);

  const isFastighetLocked = Boolean(initialFastighetPreset);
  const isByggnadLocked = Boolean(initialByggnadPreset);
  const isObjektLocked = Boolean(initialObjektPreset);

  const showCancelButton = isFastighetLocked || isByggnadLocked || isObjektLocked;

  const labelFastighet = (f: FastighetRow) => f.namn || f.adress || 'Namnlös fastighet';
  const labelByggnad = (b: ByggnadRow) => b.namn;
  const labelObjekt = (o: ObjektRow) => o.namn || o.id;

  useEffect(() => {
    const load = async () => {
      setLoadingInit(true);
      setError(null);

      try {
        const [
          { data: fData, error: fErr },
          { data: bData, error: bErr },
          { data: oData, error: oErr },
          { data: sData, error: sErr },
        ] = await Promise.all([
          supabase.from('fastigheter').select('id, namn, adress').order('namn', { ascending: true }),
          supabase.from('byggnader').select('id, namn, fastighet_id').order('namn', { ascending: true }),
          supabase.from('byggnad_objekt').select('id, namn, byggnad_id').order('namn', { ascending: true }),
          supabase.from('fastighets_users').select('id, fornamn, efternamn, email').order('efternamn', { ascending: true }),
        ]);

        if (fErr) throw fErr;
        if (bErr) throw bErr;
        if (oErr) throw oErr;
        if (sErr) throw sErr;

        const allFastigheter = fData ?? [];
        const allByggnader = bData ?? [];
        const allObjekt = oData ?? [];

        // Endast byggnader som har minst ett objekt
        const byggnadIdsMedObjekt = new Set(
          allObjekt
            .map((o) => o.byggnad_id)
            .filter(Boolean)
        );

        const filteredByggnader = allByggnader.filter((b) =>
          byggnadIdsMedObjekt.has(b.id)
        );

        // Endast fastigheter som har minst en byggnad som har objekt
        const fastighetIdsMedGiltigByggnad = new Set(
          filteredByggnader
            .map((b) => b.fastighet_id)
            .filter(Boolean)
        );

        const filteredFastigheter = allFastigheter.filter((f) =>
          fastighetIdsMedGiltigByggnad.has(f.id)
        );

        setFastigheter(filteredFastigheter);
        setByggnader(filteredByggnader);
        setObjekt(allObjekt);
        setSkotare(sData ?? []);

        const validFastighetFromPreset =
          initialFastighetPreset && fastighetIdsMedGiltigByggnad.has(initialFastighetPreset)
            ? initialFastighetPreset
            : '';

        const chosenFastighet =
          validFastighetFromPreset ||
          filteredFastigheter[0]?.id ||
          '';

        setValdFastighet(chosenFastighet);

        const byggnaderUnderFastighet = filteredByggnader.filter(
          (b) => b.fastighet_id === chosenFastighet
        );

        const validByggnadFromPreset =
          initialByggnadPreset &&
            byggnaderUnderFastighet.some((b) => b.id === initialByggnadPreset)
            ? initialByggnadPreset
            : '';

        const chosenByggnad =
          validByggnadFromPreset ||
          byggnaderUnderFastighet[0]?.id ||
          '';

        setValdByggnad(chosenByggnad);

        const objektUnderByggnad = allObjekt.filter((o) => o.byggnad_id === chosenByggnad);

        const validObjektFromPreset =
          initialObjektPreset &&
            objektUnderByggnad.some((o) => o.id === initialObjektPreset)
            ? initialObjektPreset
            : '';

        setValtObjekt(validObjektFromPreset || objektUnderByggnad[0]?.id || '');
      } catch (e: any) {
        setError(e.message || 'Kunde inte hämta data.');
      } finally {
        setLoadingInit(false);
      }
    };

    load();
  }, [initialFastighetPreset, initialByggnadPreset, initialObjektPreset]);

  const byggnaderForFastighet = useMemo(
    () => byggnader.filter((b) => b.fastighet_id === valdFastighet),
    [byggnader, valdFastighet]
  );

  const objektForByggnad = useMemo(
    () => objekt.filter((o) => o.byggnad_id === valdByggnad),
    [objekt, valdByggnad]
  );

  useEffect(() => {
    if (loadingInit) return;

    if (!isByggnadLocked) {
      const nyBygg = byggnaderForFastighet[0]?.id || '';
      setValdByggnad(nyBygg);

      if (!isObjektLocked) {
        const objUnder = objekt.filter((o) => o.byggnad_id === nyBygg);
        setValtObjekt(objUnder[0]?.id || '');
      }
    }

    setValdaSkotare([]);
    setTilldelade([]);
    setOkMessage(null);
    setError(null);
  }, [valdFastighet, byggnaderForFastighet, isByggnadLocked, isObjektLocked, loadingInit, objekt]);

  useEffect(() => {
    if (loadingInit) return;

    if (!isObjektLocked) {
      setValtObjekt(objektForByggnad[0]?.id || '');
    }

    setValdaSkotare([]);
    setTilldelade([]);
    setOkMessage(null);
    setError(null);
  }, [valdByggnad, objektForByggnad, isObjektLocked, loadingInit]);

  useEffect(() => {
    const loadAssigned = async () => {
      setOkMessage(null);
      setError(null);

      if (!valtObjekt) {
        setTilldelade([]);
        return;
      }

      const { data, error } = await supabase
        .from('byggnad_objekt_skotare')
        .select('objekt_id, skotare_id, tilldelad_datum')
        .eq('objekt_id', valtObjekt);

      if (error) {
        setError(error.message);
        setTilldelade([]);
      } else {
        setTilldelade(data ?? []);
      }
    };

    loadAssigned();
  }, [valtObjekt]);

  const injectedFastighetOption = useMemo(() => {
    if (!valdFastighet) return null;
    const inList = fastigheter.some((f) => f.id === valdFastighet);
    if (inList) return null;

    return (
      <option key={`injected-f-${valdFastighet}`} value={valdFastighet}>
        {loadingInit ? 'Laddar vald fastighet…' : 'Vald fastighet'}
      </option>
    );
  }, [valdFastighet, fastigheter, loadingInit]);

  const injectedByggnadOption = useMemo(() => {
    if (!valdByggnad) return null;
    const inList = byggnaderForFastighet.some((b) => b.id === valdByggnad);
    if (inList) return null;

    return (
      <option key={`injected-b-${valdByggnad}`} value={valdByggnad}>
        {loadingInit ? 'Laddar vald byggnad…' : 'Vald byggnad'}
      </option>
    );
  }, [valdByggnad, byggnaderForFastighet, loadingInit]);

  const injectedObjektOption = useMemo(() => {
    if (!valtObjekt) return null;
    const inList = objektForByggnad.some((o) => o.id === valtObjekt);
    if (inList) return null;

    return (
      <option key={`injected-o-${valtObjekt}`} value={valtObjekt}>
        {loadingInit ? 'Laddar valt objekt…' : 'Valt objekt'}
      </option>
    );
  }, [valtObjekt, objektForByggnad, loadingInit]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!valtObjekt || valdaSkotare.length === 0) {
      setError('Välj objekt och minst en skötare.');
      return;
    }

    setLoadingSave(true);
    setError(null);
    setOkMessage(null);

    try {
      if (overwriteMode) {
        const { error: delErr } = await supabase
          .from('byggnad_objekt_skotare')
          .delete()
          .eq('objekt_id', valtObjekt);

        if (delErr) throw delErr;
      }

      const rows = valdaSkotare.map((skotare_id) => ({
        objekt_id: valtObjekt,
        skotare_id,
        tilldelad_datum: new Date().toISOString(),
      }));

      const { error: upErr } = await supabase
        .from('byggnad_objekt_skotare')
        .upsert(rows, { onConflict: 'objekt_id,skotare_id', ignoreDuplicates: true });

      if (upErr) throw upErr;

      setOkMessage(overwriteMode ? 'Skötare ersatta för objektet.' : 'Skötare kopplade till objektet.');
      setValdaSkotare([]);

      const { data: afterData, error: afterErr } = await supabase
        .from('byggnad_objekt_skotare')
        .select('objekt_id, skotare_id, tilldelad_datum')
        .eq('objekt_id', valtObjekt);

      if (afterErr) throw afterErr;
      setTilldelade(afterData ?? []);
    } catch (e: any) {
      setError(e.message || 'Något gick fel vid kopplingen.');
    } finally {
      setLoadingSave(false);
    }
  };

  const handleRemove = async (skotare_id: string) => {
    if (!valtObjekt) return;

    setLoadingSave(true);
    setError(null);
    setOkMessage(null);

    try {
      const { error: delErr } = await supabase
        .from('byggnad_objekt_skotare')
        .delete()
        .match({ objekt_id: valtObjekt, skotare_id });

      if (delErr) throw delErr;

      setTilldelade((prev) => prev.filter((k) => k.skotare_id !== skotare_id));
      setOkMessage('Skötare borttagen från objektet.');
    } catch (e: any) {
      setError(e.message || 'Kunde inte ta bort skötare.');
    } finally {
      setLoadingSave(false);
    }
  };

  const nameForSkotare = (id: string) => {
    const s = skotare.find((x) => x.id === id);
    if (!s) return id;
    return `${s.fornamn} ${s.efternamn}${s.email ? ` (${s.email})` : ''}`;
  };

  const hasAnyValidFastigheter = fastigheter.length > 0;

  if (!loadingInit && !hasAnyValidFastigheter) {
    return (
      <div className="p-8 bg-white rounded-2xl shadow-lg max-w-xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-4">
          Tilldela fastighetsskötare till byggnadsobjekt
        </h2>
        <div className="text-center text-gray-600 border border-gray-200 bg-gray-50 rounded-lg p-4">
          Det finns inga fastigheter med byggnader som innehåller objekt ännu.
        </div>

        {showCancelButton && (
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="mt-4 w-full bg-gray-100 text-gray-900 px-4 py-2 rounded-lg hover:bg-gray-200 transition border font-medium"
          >
            Avbryt
          </button>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleAdd} className="p-8 bg-white rounded-2xl shadow-lg max-w-xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 text-center">
        Tilldela fastighetsskötare till byggnadsobjekt
      </h2>

      {error && (
        <div className="text-red-600 font-medium text-center border border-red-200 bg-red-50 rounded-md p-2">
          {error}
        </div>
      )}

      {okMessage && (
        <div className="text-green-700 font-medium text-center border border-green-200 bg-green-50 rounded-md p-2">
          {okMessage}
        </div>
      )}

      <div className="space-y-2">
        <label className="block font-semibold text-gray-700">Välj fastighet</label>
        <select
          value={valdFastighet}
          onChange={(e) => setValdFastighet(e.target.value)}
          disabled={loadingInit || isFastighetLocked}
          className="p-3 border border-gray-300 rounded-lg w-full bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 transition disabled:bg-gray-100"
        >
          {injectedFastighetOption}
          {loadingInit && <option>Laddar…</option>}
          {!loadingInit && fastigheter.length === 0 && <option>Inga fastigheter med objekt</option>}
          {!loadingInit &&
            fastigheter.map((f) => (
              <option key={f.id} value={f.id}>
                {labelFastighet(f)}
              </option>
            ))}
        </select>
        {isFastighetLocked && (
          <p className="text-xs text-gray-500">Förvald fastighet (låst från URL).</p>
        )}
      </div>

      <div className="space-y-2">
        <label className="block font-semibold text-gray-700">Välj byggnad</label>
        <select
          value={valdByggnad}
          onChange={(e) => setValdByggnad(e.target.value)}
          disabled={loadingInit || byggnaderForFastighet.length === 0 || isByggnadLocked}
          className="p-3 border border-gray-300 rounded-lg w-full bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 transition disabled:bg-gray-100"
        >
          {injectedByggnadOption}
          {byggnaderForFastighet.length === 0 ? (
            <option>Inga byggnader med objekt under denna fastighet</option>
          ) : (
            byggnaderForFastighet.map((b) => (
              <option key={b.id} value={b.id}>
                {labelByggnad(b)}
              </option>
            ))
          )}
        </select>
        {isByggnadLocked && (
          <p className="text-xs text-gray-500">Förvald byggnad (låst från URL).</p>
        )}
      </div>

      <div className="space-y-2">
        <label className="block font-semibold text-gray-700">Välj objekt</label>
        <select
          value={valtObjekt}
          onChange={(e) => setValtObjekt(e.target.value)}
          disabled={loadingInit || objektForByggnad.length === 0 || isObjektLocked}
          className="p-3 border border-gray-300 rounded-lg w-full bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 transition disabled:bg-gray-100"
        >
          {injectedObjektOption}
          {objektForByggnad.length === 0 ? (
            <option>Inga objekt under denna byggnad</option>
          ) : (
            objektForByggnad.map((o) => (
              <option key={o.id} value={o.id}>
                {labelObjekt(o)}
              </option>
            ))
          )}
        </select>
        {isObjektLocked && (
          <p className="text-xs text-gray-500">Förvalt objekt (låst från URL).</p>
        )}
      </div>

      <div className="space-y-2">
        <label className="block font-semibold text-gray-700">Tilldelade skötare</label>
        {tilldelade.length === 0 ? (
          <p className="text-gray-600">Inga skötare tilldelade ännu.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {tilldelade.map((k) => (
              <span
                key={k.skotare_id}
                className="inline-flex items-center gap-2 bg-blue-50 text-blue-900 px-3 py-1 rounded-md border border-blue-200 text-sm"
              >
                {nameForSkotare(k.skotare_id)}
                <button
                  type="button"
                  onClick={() => handleRemove(k.skotare_id)}
                  className="text-blue-900/70 hover:text-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
                  title="Ta bort"
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <label className="block font-semibold text-gray-700">Välj skötare (flera möjliga)</label>
        <select
          multiple
          value={valdaSkotare}
          onChange={(e) => setValdaSkotare(Array.from(e.target.selectedOptions, (o) => o.value))}
          disabled={loadingInit || !valtObjekt}
          className="p-3 border border-gray-300 rounded-lg w-full h-40 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
          style={{ color: '#111827' }}
        >
          {skotare.map((s) => (
            <option key={s.id} value={s.id}>
              {s.fornamn} {s.efternamn} {s.email ? `(${s.email})` : ''}
            </option>
          ))}
        </select>
        <p className="text-xs text-gray-500">Håll in Ctrl/Cmd för att välja flera.</p>
      </div>

      <div className="flex items-center gap-2">
        <input
          id="overwrite"
          type="checkbox"
          checked={overwriteMode}
          onChange={(e) => setOverwriteMode(e.target.checked)}
          className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
        />
        <label htmlFor="overwrite" className="text-gray-800">
          Ersätt existerande tilldelningar (rensa och lägg till endast dessa)
        </label>
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loadingInit || !valtObjekt || loadingSave || valdaSkotare.length === 0}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex-1 font-semibold cursor-pointer"
        >
          {loadingSave ? 'Sparar...' : overwriteMode ? 'Ersätt skötare' : 'Lägg till skötare'}
        </button>
        {showCancelButton && (
          <button
            type="button"
            onClick={() => navigate(-1)}
            disabled={loadingSave}
            className="bg-gray-200 text-gray-900 px-4 py-2 rounded hover:bg-gray-300 font-semibold cursor-pointer"
          >
            Avbryt
          </button>
        )}
      </div>
    </form>
  );
}