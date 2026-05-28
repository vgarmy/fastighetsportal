import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useSearchParams, useNavigate } from 'react-router-dom';

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
  const navigate = useNavigate();

  const fastighetFromQuery = searchParams.get('fastighet') || undefined;
  const byggnadFromQuery = searchParams.get('byggnad') || undefined;

  const initialFastighetPreset = fastighetFromQuery ?? '';
  const initialByggnadPreset = byggnadFromQuery ?? '';
  const isEditMode = Boolean(initialByggnadPreset);

  const [fastigheter, setFastigheter] = useState<FastighetRow[]>([]);
  const [byggnader, setByggnader] = useState<ByggnadRow[]>([]);
  const [skotare, setSkotare] = useState<SkotareRow[]>([]);

  const [valdFastighet, setValdFastighet] = useState<string>(initialFastighetPreset);
  const [valdByggnad, setValdByggnad] = useState<string>(initialByggnadPreset);

  const [isFastighetLocked, setIsFastighetLocked] = useState(Boolean(initialFastighetPreset));
  const [isByggnadLocked, setIsByggnadLocked] = useState(Boolean(initialByggnadPreset));

  const [valdaSkotare, setValdaSkotare] = useState<string[]>([]);
  const [tilldelade, setTilldelade] = useState<KopplingRow[]>([]);
  const [overwriteMode, setOverwriteMode] = useState(false);

  const [loadingInit, setLoadingInit] = useState(true);
  const [loadingSave, setLoadingSave] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMessage, setOkMessage] = useState<string | null>(null);

  const labelFastighet = (f: FastighetRow) => f.namn || f.adress || 'Namnlös';
  const labelByggnad = (b: ByggnadRow) => b.namn;

  const nameForSkotare = (id: string) => {
    const s = skotare.find((x) => x.id === id);
    if (!s) return id;
    return `${s.fornamn} ${s.efternamn}${s.email ? ` (${s.email})` : ''}`;
  };

  const logHistorik = async (
    byggnadId: string,
    rows: Array<{
      typ: 'skotare_tillagd' | 'skotare_borttagen';
      rubrik: string;
      beskrivning: string;
      metadata?: Record<string, any>;
    }>
  ) => {
    if (!rows.length) return;

    const payload = rows.map((row) => ({
      byggnad_id: byggnadId,
      typ: row.typ,
      rubrik: row.rubrik,
      beskrivning: row.beskrivning,
      metadata: row.metadata ?? null,
    }));

    const { error: historikError } = await supabase
      .from('byggnad_historik')
      .insert(payload);

    if (historikError) {
      console.error('Kunde inte skriva byggnadshistorik:', historikError);
    }
  };

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
          supabase
            .from('fastigheter')
            .select('id, namn, adress')
            .order('namn', { ascending: true }),

          supabase
            .from('byggnader')
            .select('id, namn, fastighet_id')
            .order('namn', { ascending: true }),

          supabase
            .from('fastighets_users')
            .select('id, fornamn, efternamn, email')
            .order('efternamn', { ascending: true }),
        ]);

        if (fErr) throw fErr;
        if (bErr) throw bErr;
        if (sErr) throw sErr;

        const fList = fData ?? [];
        const bList = bData ?? [];

        const fastighetIdsMedByggnad = new Set(
          bList.map((b) => b.fastighet_id).filter(Boolean)
        );

        const filtreradeFastigheter = fList.filter((f) =>
          fastighetIdsMedByggnad.has(f.id)
        );

        setFastigheter(filtreradeFastigheter);
        setByggnader(bList);
        setSkotare(sData ?? []);

        let nextFastighet = '';
        let nextByggnad = '';

        const queryByggnad = initialByggnadPreset
          ? bList.find((b) => b.id === initialByggnadPreset)
          : null;

        if (queryByggnad) {
          nextFastighet = queryByggnad.fastighet_id;
          nextByggnad = queryByggnad.id;
          setIsFastighetLocked(true);
          setIsByggnadLocked(true);
        } else if (
          initialFastighetPreset &&
          filtreradeFastigheter.some((f) => f.id === initialFastighetPreset)
        ) {
          nextFastighet = initialFastighetPreset;

          const byggnaderUnderFast = bList.filter(
            (b) => b.fastighet_id === nextFastighet
          );

          nextByggnad = byggnaderUnderFast.length > 0 ? byggnaderUnderFast[0].id : '';
          setIsFastighetLocked(true);
          setIsByggnadLocked(false);
        } else {
          nextFastighet = filtreradeFastigheter[0]?.id ?? '';

          const byggnaderUnderFast = bList.filter(
            (b) => b.fastighet_id === nextFastighet
          );

          nextByggnad = byggnaderUnderFast.length > 0 ? byggnaderUnderFast[0].id : '';
          setIsFastighetLocked(false);
          setIsByggnadLocked(false);
        }

        setValdFastighet(nextFastighet);
        setValdByggnad(nextByggnad);
      } catch (e: any) {
        setError(e.message || 'Kunde inte hämta data.');
      } finally {
        setLoadingInit(false);
      }
    };

    load();
  }, [initialFastighetPreset, initialByggnadPreset]);

  const byggnaderForFastighet = useMemo(
    () => byggnader.filter((b) => b.fastighet_id === valdFastighet),
    [byggnader, valdFastighet]
  );

  useEffect(() => {
    if (loadingInit) return;

    if (!isFastighetLocked) {
      if (valdFastighet && !fastigheter.some((f) => f.id === valdFastighet)) {
        setValdFastighet(fastigheter[0]?.id ?? '');
      }
    }
  }, [fastigheter, valdFastighet, loadingInit, isFastighetLocked]);

  useEffect(() => {
    if (loadingInit) return;

    if (!isByggnadLocked) {
      const under = byggnaderForFastighet;

      if (under.length > 0) {
        const currentExists = under.some((b) => b.id === valdByggnad);
        if (!currentExists) {
          setValdByggnad(under[0].id);
        }
      } else {
        setValdByggnad('');
      }
    }

    setValdaSkotare([]);
    setOkMessage(null);
    setError(null);
  }, [valdFastighet, byggnaderForFastighet, loadingInit, isByggnadLocked]);

  useEffect(() => {
    setValdaSkotare([]);
    setOkMessage(null);
    setError(null);
  }, [valdByggnad]);

  useEffect(() => {
    const loadAssigned = async () => {
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

  const injectedFastighetOption = useMemo(() => {
    if (!loadingInit) return null;
    if (!valdFastighet) return null;

    const inList = fastigheter.some((f) => f.id === valdFastighet);
    if (inList) return null;

    return (
      <option key={`injected-f-${valdFastighet}`} value={valdFastighet}>
        Laddar vald fastighet…
      </option>
    );
  }, [valdFastighet, fastigheter, loadingInit]);

  const injectedByggnadOption = useMemo(() => {
    if (!loadingInit) return null;
    if (!valdByggnad) return null;

    const inList = byggnaderForFastighet.some((b) => b.id === valdByggnad);
    if (inList) return null;

    return (
      <option key={`injected-b-${valdByggnad}`} value={valdByggnad}>
        Laddar vald byggnad…
      </option>
    );
  }, [valdByggnad, byggnaderForFastighet, loadingInit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!valdByggnad) {
      setError('Välj byggnad.');
      return;
    }

    if (valdaSkotare.length === 0) {
      setError('Välj minst en skötare.');
      return;
    }

    setLoadingSave(true);
    setError(null);
    setOkMessage(null);

    try {
      const tidigareTilldeladeIds = tilldelade.map((t) => t.skotare_id);

      const tillagdaIds = valdaSkotare.filter(
        (skotareId) => !tidigareTilldeladeIds.includes(skotareId)
      );

      const borttagnaIds =
        !isEditMode && overwriteMode
          ? tidigareTilldeladeIds.filter((skotareId) => !valdaSkotare.includes(skotareId))
          : [];

      if (!isEditMode && overwriteMode) {
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

      const { error: upErr } = await supabase
        .from('byggnad_skotare')
        .upsert(rows, {
          onConflict: 'byggnad_id,skotare_id',
          ignoreDuplicates: true,
        });

      if (upErr) throw upErr;

      const { data: afterData, error: afterErr } = await supabase
        .from('byggnad_skotare')
        .select('byggnad_id, skotare_id, tilldelad_datum')
        .eq('byggnad_id', valdByggnad);

      if (afterErr) throw afterErr;

      setTilldelade(afterData ?? []);
      setValdaSkotare([]);

      const historikRows: Array<{
        typ: 'skotare_tillagd' | 'skotare_borttagen';
        rubrik: string;
        beskrivning: string;
        metadata?: Record<string, any>;
      }> = [];

      tillagdaIds.forEach((skotareId) => {
        const skotareNamn = nameForSkotare(skotareId);
        historikRows.push({
          typ: 'skotare_tillagd',
          rubrik: 'Skötare tillagd',
          beskrivning: `${skotareNamn} kopplades till byggnaden.`,
          metadata: {
            skotare_id: skotareId,
            skotare_namn: skotareNamn,
          },
        });
      });

      borttagnaIds.forEach((skotareId) => {
        const skotareNamn = nameForSkotare(skotareId);
        historikRows.push({
          typ: 'skotare_borttagen',
          rubrik: 'Skötare borttagen',
          beskrivning: `${skotareNamn} togs bort från byggnaden.`,
          metadata: {
            skotare_id: skotareId,
            skotare_namn: skotareNamn,
          },
        });
      });

      await logHistorik(valdByggnad, historikRows);

      setOkMessage(
        isEditMode
          ? 'Skötare tillagda för byggnaden.'
          : overwriteMode
            ? 'Skötare ersatta för byggnaden.'
            : 'Skötare kopplade till byggnaden.'
      );
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
      const skotareNamn = nameForSkotare(skotare_id);

      const { error: delErr } = await supabase
        .from('byggnad_skotare')
        .delete()
        .match({ byggnad_id: valdByggnad, skotare_id });

      if (delErr) throw delErr;

      setTilldelade((prev) => prev.filter((k) => k.skotare_id !== skotare_id));
      setValdaSkotare((prev) => prev.filter((id) => id !== skotare_id));

      await logHistorik(valdByggnad, [
        {
          typ: 'skotare_borttagen',
          rubrik: 'Skötare borttagen',
          beskrivning: `${skotareNamn} togs bort från byggnaden.`,
          metadata: {
            skotare_id,
            skotare_namn: skotareNamn,
          },
        },
      ]);

      setOkMessage('Skötare borttagen från byggnaden.');
    } catch (e: any) {
      setError(e.message || 'Kunde inte ta bort skötare.');
    } finally {
      setLoadingSave(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="p-8 bg-white rounded-2xl shadow-lg max-w-xl mx-auto space-y-6"
    >
      <h2 className="text-2xl font-bold text-gray-900 text-center">
        {isEditMode ? 'Redigera skötare för byggnad' : 'Tilldela fastighetsskötare till byggnad'}
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

          {!loadingInit && fastigheter.length === 0 && (
            <option>Inga fastigheter med byggnader</option>
          )}

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
          <p className="text-xs text-gray-500">
            Förvald byggnad (låst från URL).
          </p>
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
        <label className="block font-semibold text-gray-700">Välj skötare att lägga till</label>
        <select
          multiple
          value={valdaSkotare}
          onChange={(e) =>
            setValdaSkotare(Array.from(e.target.selectedOptions, (o) => o.value))
          }
          disabled={loadingInit || !valdByggnad}
          className="p-3 border border-gray-300 rounded-lg w-full h-40 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
          style={{ color: '#111827' }}
        >
          {skotare
            .filter((s) => !tilldelade.some((t) => t.skotare_id === s.id))
            .map((s) => (
              <option key={s.id} value={s.id}>
                {s.fornamn} {s.efternamn} {s.email ? `(${s.email})` : ''}
              </option>
            ))}
        </select>

        <p className="text-xs text-gray-500">
          Håll in Ctrl/Cmd för att välja flera.
        </p>
      </div>

      {!isEditMode && (
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
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loadingInit || !valdByggnad || loadingSave || valdaSkotare.length === 0}
          className="bg-blue-600 text-white font-semibold px-5 py-3 rounded-xl shadow hover:bg-blue-700 transition w-full disabled:opacity-60 cursor-pointer"
        >
          {loadingSave
            ? 'Sparar...'
            : isEditMode
              ? 'Lägg till skötare'
              : overwriteMode
                ? 'Ersätt skötare'
                : 'Lägg till skötare'}
        </button>

        {isEditMode && (
          <button
            type="button"
            onClick={() => navigate(-1)}
            disabled={loadingSave}
            className="bg-gray-500 text-white px-6 py-2 rounded-md shadow hover:bg-gray-600 transition font-semibold disabled:opacity-60 cursor-pointer"
          >
            Avbryt
          </button>
        )}
      </div>
    </form>
  );
}
