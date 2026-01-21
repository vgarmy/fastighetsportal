
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useSearchParams } from 'react-router-dom';

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

type SkotareRow = {
  id: string;
  fornamn: string;
  efternamn: string;
  email?: string | null;
};

type KopplingRow = {
  byggnad_id: string;
  skotare_id: string;
  tilldelad_datum: string | null;
};

export function ByggnadSkotareForm() {
  const [searchParams] = useSearchParams();
  const fastighetFromQuery = searchParams.get('fastighet') || undefined;
  const byggnadFromQuery = searchParams.get('byggnad') || undefined;

  const [fastigheter, setFastigheter] = useState<FastighetRow[]>([]);
  const [byggnader, setByggnader] = useState<ByggnadRow[]>([]);
  const [skotare, setSkotare] = useState<SkotareRow[]>([]);

  // Stabil initialisering från query (låst om given)
  const initialFastighetPreset = fastighetFromQuery ?? '';
  const [valdFastighet, setValdFastighet] = useState<string>(initialFastighetPreset);

  const initialByggnadPreset = byggnadFromQuery ?? '';
  const [valdByggnad, setValdByggnad] = useState<string>(initialByggnadPreset);

  const [valdaSkotare, setValdaSkotare] = useState<string[]>([]);
  const [tilldelade, setTilldelade] = useState<KopplingRow[]>([]);
  const [overwriteMode, setOverwriteMode] = useState(false);

  const [loadingInit, setLoadingInit] = useState(true);
  const [loadingSave, setLoadingSave] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMessage, setOkMessage] = useState<string | null>(null);

  const isFastighetLocked = Boolean(initialFastighetPreset);
  const isByggnadLocked = Boolean(initialByggnadPreset);

  // Hjälpfunktioner för etiketter
  const labelFastighet = (f: FastighetRow) => f.namn || f.adress || 'Namnlös';
  const labelByggnad = (b: ByggnadRow) => b.namn;

  // 1) Ladda grunddata: fastigheter, byggnader, skötare (en gång)
  useEffect(() => {
    const load = async () => {
      setLoadingInit(true);
      setError(null);
      try {
        const [
          { data: fData, error: fErr },
          { data: bData, error: bErr },
          { data: sData, error: sErr },
        ] = await Promise.all([
          supabase.from('fastigheter').select('id, namn, adress').order('namn', { ascending: true }),
          supabase.from('byggnader').select('id, namn, fastighet_id').order('namn', { ascending: true }),
          supabase.from('fastighets_users').select('id, fornamn, efternamn, email').order('efternamn', { ascending: true }),
        ]);

        if (fErr) throw fErr;
        if (bErr) throw bErr;
        if (sErr) throw sErr;

        const fList = fData ?? [];
        const bList = bData ?? [];
        setFastigheter(fList);
        setByggnader(bList);
        setSkotare(sData ?? []);

        // Om ingen fastighet är satt från URL, välj första som default
        if (!initialFastighetPreset) {
          if (fList.length > 0 && !valdFastighet) {
            setValdFastighet(fList[0].id);
          }
        }

        // Om byggnad kom från URL: säkerställ att den tillhör valdFastighet (om låst),
        // annars justera valdByggnad efter valdFastighet.
        // (Detta körs efter att listor är laddade)
        setTimeout(() => {
          const currentFastighet = initialFastighetPreset || valdFastighet;
          const byggnaderUnderFast = bList.filter((b) => b.fastighet_id === currentFastighet);

          if (initialByggnadPreset) {
            const byggnadExists = bList.some((b) => b.id === initialByggnadPreset);
            const byggnadTillhörFast = bList.some(
              (b) => b.id === initialByggnadPreset && b.fastighet_id === currentFastighet
            );

            if (byggnadExists && byggnadTillhörFast) {
              setValdByggnad(initialByggnadPreset);
            } else if (byggnaderUnderFast.length > 0) {
              setValdByggnad(byggnaderUnderFast[0].id);
            } else {
              setValdByggnad('');
            }
          } else {
            // Ingen byggnad låst från URL: välj första under fastigheten
            if (byggnaderUnderFast.length > 0) {
              setValdByggnad(byggnaderUnderFast[0].id);
            } else {
              setValdByggnad('');
            }
          }
        }, 0);
      } catch (e: any) {
        setError(e.message || 'Kunde inte hämta data.');
      } finally {
        setLoadingInit(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2) Filtrera byggnader per vald fastighet
  const byggnaderForFastighet = useMemo(
    () => byggnader.filter((b) => b.fastighet_id === valdFastighet),
    [byggnader, valdFastighet]
  );

  // 3) När fastighet ändras manuellt (om ej låst): välj första byggnad under den fastigheten
  useEffect(() => {
    if (!loadingInit) {
      const under = byggnaderForFastighet;
      if (under.length > 0) {
        // Endast skriv över byggnad om den inte är låst från URL
        if (!isByggnadLocked) setValdByggnad(under[0].id);
      } else {
        if (!isByggnadLocked) setValdByggnad('');
      }
      setValdaSkotare([]);
      setTilldelade([]);
      setOkMessage(null);
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valdFastighet]);

  // 4) Ladda redan tilldelade skötare för vald byggnad
  useEffect(() => {
    const loadAssigned = async () => {
      setOkMessage(null);
      setError(null);
      if (!valdByggnad) {
        setTilldelade([]);
        return;
      }
      const { data, error } = await supabase
        .from('byggnad_skotare')
        .select('byggnad_id, skotare_id, tilldelad_datum')
        .eq('byggnad_id', valdByggnad);

      if (error) {
        setError(error.message);
        setTilldelade([]);
      } else {
        setTilldelade(data ?? []);
      }
    };
    loadAssigned();
  }, [valdByggnad]);

  // --- Anti-blink: injicera temporära options innan listor laddats/är synkade ---

  // Injicera vald fastighet om inte finns i listan ännu
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

  // Injicera vald byggnad om inte finns i filtrerade listan ännu
  const injectedByggnadOption = useMemo(() => {
    if (!valdByggnad) return null;
    const inList = byggnaderForFastighet.some((b) => b.id === valdByggnad);
    if (inList) return null;
    // Om byggnaden inte ligger under vald fastighet (t.ex. felaktig URL-kombination),
    // visar vi neutral label tills vi sätter om.
    return (
      <option key={`injected-b-${valdByggnad}`} value={valdByggnad}>
        {loadingInit ? 'Laddar vald byggnad…' : 'Vald byggnad'}
      </option>
    );
  }, [valdByggnad, byggnaderForFastighet, loadingInit]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valdByggnad || valdaSkotare.length === 0) {
      setError('Välj byggnad och minst en skötare.');
      return;
    }
    setLoadingSave(true);
    setError(null);
    setOkMessage(null);

    try {
      if (overwriteMode) {
        // Rensa befintliga
        const { error: delErr } = await supabase
          .from('byggnad_skotare')
          .delete()
          .eq('byggnad_id', valdByggnad);
        if (delErr) throw delErr;
      }

      const rows = valdaSkotare.map((skotare_id) => ({
        byggnad_id: valdByggnad,
        skotare_id,
        tilldelad_datum: new Date().toISOString(),
      }));

      // Upsert för att ignorera dubbletter (kräver PK (byggnad_id, skotare_id))
      const { error: upErr } = await supabase
        .from('byggnad_skotare')
        .upsert(rows, { onConflict: 'byggnad_id,skotare_id', ignoreDuplicates: true });

      if (upErr) throw upErr;

      setOkMessage(overwriteMode ? 'Skötare ersatta för byggnaden.' : 'Skötare kopplade till byggnaden.');
      setValdaSkotare([]);

      // Refresh tilldelade
      const { data: afterData, error: afterErr } = await supabase
        .from('byggnad_skotare')
        .select('byggnad_id, skotare_id, tilldelad_datum')
        .eq('byggnad_id', valdByggnad);
      if (afterErr) throw afterErr;
      setTilldelade(afterData ?? []);
    } catch (err: any) {
      setError(err.message || 'Något gick fel vid kopplingen.');
    } finally {
      setLoadingSave(false);
    }
  };

  const handleRemove = async (skotare_id: string) => {
    if (!valdByggnad) return;
    setLoadingSave(true);
    setError(null);
    setOkMessage(null);
    try {
      const { error: delErr } = await supabase
        .from('byggnad_skotare')
        .delete()
        .match({ byggnad_id: valdByggnad, skotare_id });
      if (delErr) throw delErr;

      setTilldelade((prev) => prev.filter((k) => !(k.skotare_id === skotare_id)));
      setOkMessage('Skötare borttagen från byggnaden.');
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

  return (
    <form
      onSubmit={handleAdd}
      className="p-8 bg-white rounded-2xl shadow-lg max-w-xl mx-auto space-y-6"
    >
      <h2 className="text-2xl font-bold text-gray-900 text-center">
        Tilldela fastighetsskötare till byggnad
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

      {/* Fastighet */}
      <div className="space-y-2">
        <label className="block font-semibold text-gray-700">Välj fastighet</label>
        <select
          value={valdFastighet}
          onChange={(e) => setValdFastighet(e.target.value)}
          disabled={loadingInit || isFastighetLocked}
          className="p-3 border border-gray-300 rounded-lg w-full bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 transition disabled:bg-gray-100"
        >
          {/* Injicerad option för att undvika blink */}
          {injectedFastighetOption}

          {loadingInit && <option>Laddar…</option>}
          {!loadingInit && fastigheter.length === 0 && <option>Inga fastigheter</option>}
          {!loadingInit &&
            fastigheter.map((f) => (
              <option key={f.id} value={f.id}>
                {labelFastighet(f)}
              </option>
            ))}
        </select>
        {isFastighetLocked && (
          <p className="text-xs text-gray-500">
            Förvald fastighet (låst från URL).
          </p>
        )}
      </div>

      {/* Byggnad (filtrerad på fastighet) */}
      <div className="space-y-2">
        <label className="block font-semibold text-gray-700">Välj byggnad</label>
        <select
          value={valdByggnad}
          onChange={(e) => setValdByggnad(e.target.value)}
          disabled={loadingInit || byggnaderForFastighet.length === 0 || isByggnadLocked}
          className="p-3 border border-gray-300 rounded-lg w-full bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 transition disabled:bg-gray-100"
        >
          {/* Injicerad option för att undvika blink */}
          {injectedByggnadOption}

          {byggnaderForFastighet.length === 0 ? (
            <option>Inga byggnader under denna fastighet</option>
          ) : (
            byggnaderForFastighet.map((b) => (
              <option key={b.id} value={b.id}>
                {labelByggnad(b)}
              </option>
            ))
          )}
        </select>
        {isByggnadLocked && (
          <p className="text-xs text-gray-500">
            Förvald byggnad (låst från URL).
          </p>
        )}
      </div>

      {/* Redan tilldelade skötare */}
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

      {/* Välj nya skötare att lägga till */}
      <div className="space-y-2">
        <label className="block font-semibold text-gray-700">Välj skötare (flera möjliga)</label>
        <select
          multiple
          value={valdaSkotare}
          onChange={(e) => setValdaSkotare(Array.from(e.target.selectedOptions, (o) => o.value))}
          disabled={loadingInit || !valdByggnad}
          className="p-3 border border-gray-300 rounded-lg w-full h-40 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
          style={{ color: '#111827' }}
        >
          {skotare.map((s) => (
            <option key={s.id} value={s.id}>
              {s.fornamn} {s.efternamn} {s.email ? `(${s.email})` : ''}
            </option>
          ))}
        </select>
        <p className="text-xs text-gray-500">
          Håll in Ctrl/Cmd för att välja flera.
        </p>
      </div>

      {/* Overwrite-läge */}
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

      <button
        type="submit"
        disabled={loadingInit || !valdByggnad || loadingSave || valdaSkotare.length === 0}
        className="bg-blue-600 text-white font-semibold px-5 py-3 rounded-xl shadow hover:bg-blue-700 transition w-full disabled:opacity-60"
      >
        {loadingSave ? 'Sparar...' : overwriteMode ? 'Ersätt skötare' : 'Lägg till skötare'}
      </button>
    </form>
  );
}
