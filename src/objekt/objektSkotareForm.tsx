import { useEffect, useMemo, useState, type FormEvent } from 'react';
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

type FastighetSkotareRow = {
  fastighet_id: string;
  skotare_id: string;
};

type ByggnadSkotareRow = {
  byggnad_id: string;
  skotare_id: string;
};

export function ObjektSkotareForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const fastighetFromQuery = searchParams.get('fastighet') || '';
  const byggnadFromQuery = searchParams.get('byggnad') || '';
  const objektFromQuery = searchParams.get('objekt') || '';

  const [fastigheter, setFastigheter] = useState<FastighetRow[]>([]);
  const [byggnader, setByggnader] = useState<ByggnadRow[]>([]);
  const [objekt, setObjekt] = useState<ObjektRow[]>([]);
  const [skotare, setSkotare] = useState<SkotareRow[]>([]);
  const [fastighetSkotareKopplingar, setFastighetSkotareKopplingar] = useState<FastighetSkotareRow[]>([]);
  const [byggnadSkotareKopplingar, setByggnadSkotareKopplingar] = useState<ByggnadSkotareRow[]>([]);

  const [valdFastighet, setValdFastighet] = useState<string>('');
  const [valdByggnad, setValdByggnad] = useState<string>('');
  const [valtObjekt, setValtObjekt] = useState<string>('');

  const [valdaSkotare, setValdaSkotare] = useState<string[]>([]);
  const [tilldelade, setTilldelade] = useState<KopplingRow[]>([]);
  const [overwriteMode, setOverwriteMode] = useState(false);

  const [loadingInit, setLoadingInit] = useState(true);
  const [loadingSave, setLoadingSave] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMessage, setOkMessage] = useState<string | null>(null);

  // Låsning:
  // - objekt från URL => alla tre låsta
  // - byggnad från URL => byggnad + fastighet låsta
  // - fastighet från URL => fastighet låst
  const isFastighetLocked = Boolean(fastighetFromQuery || byggnadFromQuery || objektFromQuery);
  const isByggnadLocked = Boolean(byggnadFromQuery || objektFromQuery);
  const isObjektLocked = Boolean(objektFromQuery);

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
          { data: fsData, error: fsErr },
          { data: bsData, error: bsErr },
        ] = await Promise.all([
          supabase
            .from('fastigheter')
            .select('id, namn, adress')
            .order('namn', { ascending: true }),

          supabase
            .from('byggnader')
            .select('id, namn, fastighet_id')
            .order('namn', { ascending: true }),

          supabase
            .from('byggnad_objekt')
            .select('id, namn, byggnad_id')
            .order('namn', { ascending: true }),

          supabase
            .from('fastighets_users')
            .select('id, fornamn, efternamn, email')
            .order('efternamn', { ascending: true }),

          supabase
            .from('fastighet_skotare')
            .select('fastighet_id, skotare_id'),

          supabase
            .from('byggnad_skotare')
            .select('byggnad_id, skotare_id'),
        ]);

        if (fErr) throw fErr;
        if (bErr) throw bErr;
        if (oErr) throw oErr;
        if (sErr) throw sErr;
        if (fsErr) throw fsErr;
        if (bsErr) throw bsErr;

        const allFastigheter = fData ?? [];
        const allByggnader = bData ?? [];
        const allObjekt = oData ?? [];
        const allSkotare = sData ?? [];
        const allFastighetSkotareKopplingar = fsData ?? [];
        const allByggnadSkotareKopplingar = bsData ?? [];

        setFastigheter(allFastigheter);
        setByggnader(allByggnader);
        setObjekt(allObjekt);
        setSkotare(allSkotare);
        setFastighetSkotareKopplingar(allFastighetSkotareKopplingar);
        setByggnadSkotareKopplingar(allByggnadSkotareKopplingar);

        let nextFastighet = '';
        let nextByggnad = '';
        let nextObjekt = '';

        // 1. Om objekt finns i URL: härled byggnad + fastighet från objektet
        if (objektFromQuery) {
          const foundObjekt = allObjekt.find((o) => o.id === objektFromQuery);

          if (foundObjekt) {
            const foundByggnad = allByggnader.find((b) => b.id === foundObjekt.byggnad_id);

            nextObjekt = foundObjekt.id;
            nextByggnad = foundObjekt.byggnad_id;
            nextFastighet = foundByggnad?.fastighet_id || '';
          }
        }

        // 2. Om byggnad finns i URL men objekt inte kunde lösas
        if (!nextByggnad && byggnadFromQuery) {
          const foundByggnad = allByggnader.find((b) => b.id === byggnadFromQuery);

          if (foundByggnad) {
            nextByggnad = foundByggnad.id;
            nextFastighet = foundByggnad.fastighet_id;

            const objektUnderByggnad = allObjekt.filter((o) => o.byggnad_id === foundByggnad.id);

            nextObjekt =
              (objektFromQuery &&
                objektUnderByggnad.find((o) => o.id === objektFromQuery)?.id) ||
              objektUnderByggnad[0]?.id ||
              '';
          }
        }

        // 3. Om bara fastighet finns i URL
        if (!nextFastighet && fastighetFromQuery) {
          const foundFastighet = allFastigheter.find((f) => f.id === fastighetFromQuery);

          if (foundFastighet) {
            nextFastighet = foundFastighet.id;

            const byggnaderUnderFastighet = allByggnader.filter(
              (b) => b.fastighet_id === foundFastighet.id
            );

            nextByggnad =
              (byggnadFromQuery &&
                byggnaderUnderFastighet.find((b) => b.id === byggnadFromQuery)?.id) ||
              byggnaderUnderFastighet[0]?.id ||
              '';

            const objektUnderByggnad = allObjekt.filter((o) => o.byggnad_id === nextByggnad);

            nextObjekt =
              (objektFromQuery &&
                objektUnderByggnad.find((o) => o.id === objektFromQuery)?.id) ||
              objektUnderByggnad[0]?.id ||
              '';
          }
        }

        // 4. Fallback om inget från URL
        if (!nextFastighet) {
          nextFastighet = allFastigheter[0]?.id || '';
        }

        if (!nextByggnad) {
          nextByggnad =
            allByggnader.find((b) => b.fastighet_id === nextFastighet)?.id || '';
        }

        if (!nextObjekt) {
          nextObjekt =
            allObjekt.find((o) => o.byggnad_id === nextByggnad)?.id || '';
        }

        setValdFastighet(nextFastighet);
        setValdByggnad(nextByggnad);
        setValtObjekt(nextObjekt);
      } catch (e: any) {
        setError(e.message || 'Kunde inte hämta data.');
      } finally {
        setLoadingInit(false);
      }
    };

    load();
  }, [fastighetFromQuery, byggnadFromQuery, objektFromQuery]);

  const byggnaderForFastighet = useMemo(
    () => byggnader.filter((b) => b.fastighet_id === valdFastighet),
    [byggnader, valdFastighet]
  );

  const objektForByggnad = useMemo(
    () => objekt.filter((o) => o.byggnad_id === valdByggnad),
    [objekt, valdByggnad]
  );

  const tillgangligaSkotare = useMemo(() => {
    const tillatnaIds = new Set<string>();

    for (const row of fastighetSkotareKopplingar) {
      if (row.fastighet_id === valdFastighet) {
        tillatnaIds.add(row.skotare_id);
      }
    }

    for (const row of byggnadSkotareKopplingar) {
      if (row.byggnad_id === valdByggnad) {
        tillatnaIds.add(row.skotare_id);
      }
    }

    return skotare
      .filter((s) => tillatnaIds.has(s.id))
      .sort((a, b) => {
        const aName = `${a.fornamn} ${a.efternamn}`.toLowerCase();
        const bName = `${b.fornamn} ${b.efternamn}`.toLowerCase();
        return aName.localeCompare(bName, 'sv');
      });
  }, [skotare, fastighetSkotareKopplingar, byggnadSkotareKopplingar, valdFastighet, valdByggnad]);

  useEffect(() => {
    if (loadingInit) return;
    if (isFastighetLocked) return;

    const byggnaderUnderFastighet = byggnader.filter((b) => b.fastighet_id === valdFastighet);
    const nyByggnad = byggnaderUnderFastighet[0]?.id || '';

    setValdByggnad(nyByggnad);

    if (!isObjektLocked) {
      const objektUnderNyByggnad = objekt.filter((o) => o.byggnad_id === nyByggnad);
      setValtObjekt(objektUnderNyByggnad[0]?.id || '');
    }

    setValdaSkotare([]);
    setTilldelade([]);
    setOkMessage(null);
    setError(null);
  }, [valdFastighet, byggnader, objekt, loadingInit, isFastighetLocked, isObjektLocked]);

  useEffect(() => {
    if (loadingInit) return;
    if (isByggnadLocked) return;

    const objektUnderByggnad = objekt.filter((o) => o.byggnad_id === valdByggnad);
    setValtObjekt(objektUnderByggnad[0]?.id || '');

    setValdaSkotare([]);
    setTilldelade([]);
    setOkMessage(null);
    setError(null);
  }, [valdByggnad, objekt, loadingInit, isByggnadLocked]);

  useEffect(() => {
    const loadAssigned = async () => {
      setOkMessage(null);
      setError(null);

      if (!valtObjekt) {
        setTilldelade([]);
        setValdaSkotare([]);
        return;
      }

      const { data, error } = await supabase
        .from('byggnad_objekt_skotare')
        .select('objekt_id, skotare_id, tilldelad_datum')
        .eq('objekt_id', valtObjekt);

      if (error) {
        setError(error.message);
        setTilldelade([]);
        setValdaSkotare([]);
      } else {
        const rows = data ?? [];
        setTilldelade(rows);

        // Förmarkera redan tilldelade skötare i multiselect
        setValdaSkotare(rows.map((k) => k.skotare_id));
      }
    };

    loadAssigned();
  }, [valtObjekt]);

  useEffect(() => {
    const allowedIds = new Set(tillgangligaSkotare.map((s) => s.id));
    setValdaSkotare((prev) => prev.filter((id) => allowedIds.has(id)));
  }, [tillgangligaSkotare]);

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

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();

    if (!valtObjekt || valdaSkotare.length === 0) {
      setError('Välj objekt och minst en skötare.');
      return;
    }

    setLoadingSave(true);
    setError(null);
    setOkMessage(null);

    try {
      const tillatnaIds = new Set(tillgangligaSkotare.map((s) => s.id));
      const filtreradeSkotare = valdaSkotare.filter((id) => tillatnaIds.has(id));

      if (filtreradeSkotare.length === 0) {
        setError('Inga giltiga skötare valda för denna fastighet/byggnad.');
        setLoadingSave(false);
        return;
      }

      if (overwriteMode) {
        const { error: delErr } = await supabase
          .from('byggnad_objekt_skotare')
          .delete()
          .eq('objekt_id', valtObjekt);

        if (delErr) throw delErr;
      }

      const rows = filtreradeSkotare.map((skotare_id) => ({
        objekt_id: valtObjekt,
        skotare_id,
        tilldelad_datum: new Date().toISOString(),
      }));

      const { error: upErr } = await supabase
        .from('byggnad_objekt_skotare')
        .upsert(rows, { onConflict: 'objekt_id,skotare_id', ignoreDuplicates: true });

      if (upErr) throw upErr;

      setOkMessage(overwriteMode ? 'Skötare ersatta för objektet.' : 'Skötare kopplade till objektet.');

      const { data: afterData, error: afterErr } = await supabase
        .from('byggnad_objekt_skotare')
        .select('objekt_id, skotare_id, tilldelad_datum')
        .eq('objekt_id', valtObjekt);

      if (afterErr) throw afterErr;

      const rowsAfter = afterData ?? [];
      setTilldelade(rowsAfter);
      setValdaSkotare(rowsAfter.map((k) => k.skotare_id));
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
      setValdaSkotare((prev) => prev.filter((id) => id !== skotare_id));
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
          {!loadingInit && fastigheter.length === 0 && <option>Inga fastigheter</option>}
          {!loadingInit &&
            fastigheter.map((f) => (
              <option key={f.id} value={f.id}>
                {labelFastighet(f)}
              </option>
            ))}
        </select>
        {isFastighetLocked && (
          <p className="text-xs text-gray-500">Förvald fastighet från detaljsidan.</p>
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
          <p className="text-xs text-gray-500">Förvald byggnad från detaljsidan.</p>
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
          <p className="text-xs text-gray-500">Förvalt objekt från detaljsidan.</p>
        )}
      </div>

      <div className="space-y-2">
        <label className="block font-semibold text-gray-700">Tilldelade skötare</label>
        {tilldelade.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-600">
            Inga skötare tilldelade ännu.
          </div>
        ) : (
          <div className="space-y-2">
            {tilldelade.map((k) => (
              <div
                key={k.skotare_id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-3"
              >
                <span className="text-sm text-blue-900 break-all">
                  {nameForSkotare(k.skotare_id)}
                </span>

                <button
                  type="button"
                  onClick={() => handleRemove(k.skotare_id)}
                  disabled={loadingSave}
                  className="w-full sm:w-auto shrink-0 rounded-md bg-white border border-blue-200 px-3 py-2 text-sm font-medium text-blue-900 hover:bg-blue-100 transition cursor-pointer disabled:opacity-60"
                  title="Ta bort"
                >
                  Ta bort
                </button>
              </div>
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
          className="p-3 border border-gray-300 rounded-lg w-full h-48 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
          style={{ color: '#111827' }}
        >
          {tillgangligaSkotare.length === 0 ? (
            <option disabled>Det finns inga skötare på vald fastighet/byggnad</option>
          ) : (
            tillgangligaSkotare.map((s) => (
              <option key={s.id} value={s.id}>
                {s.fornamn} {s.efternamn} {s.email ? `(${s.email})` : ''}
              </option>
            ))
          )}
        </select>
        <p className="text-xs text-gray-500">
          Endast skötare som hör till vald fastighet eller byggnad visas här.
        </p>
      </div>

      <div className="flex items-start gap-2">
        <input
          id="overwrite"
          type="checkbox"
          checked={overwriteMode}
          onChange={(e) => setOverwriteMode(e.target.checked)}
          className="h-4 w-4 mt-1 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
        />
        <label htmlFor="overwrite" className="text-gray-800 text-sm sm:text-base">
          Ersätt existerande tilldelningar (rensa och lägg till endast dessa)
        </label>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          type="submit"
          disabled={loadingInit || !valtObjekt || loadingSave || valdaSkotare.length === 0}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex-1 font-semibold cursor-pointer disabled:opacity-60"
        >
          {loadingSave ? 'Sparar...' : overwriteMode ? 'Ersätt skötare' : 'Lägg till skötare'}
        </button>

        {showCancelButton && (
          <button
            type="button"
            onClick={() => navigate(-1)}
            disabled={loadingSave}
            className="bg-gray-200 text-gray-900 px-4 py-2 rounded hover:bg-gray-300 font-semibold cursor-pointer disabled:opacity-60"
          >
            Avbryt
          </button>
        )}
      </div>
    </form>
  );
}