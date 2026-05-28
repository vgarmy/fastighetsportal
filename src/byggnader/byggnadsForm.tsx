import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useSearchParams, useNavigate } from 'react-router-dom';

interface ByggnadFormProps {
  onSaved?: () => void;
  presetFastighetId?: string;
}

type FastighetOption = {
  id: string;
  namn: string | null;
  adress: string | null;
};

const BYGGNAD_TYPER = ['bostad', 'kontor', 'lager', 'garage', 'annan'] as const;
type ByggnadTyp = (typeof BYGGNAD_TYPER)[number];

export function ByggnadForm({ onSaved, presetFastighetId }: ByggnadFormProps) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const fastighetFromQuery = searchParams.get('fastighet') || undefined;
  const byggnadIdFromQuery = searchParams.get('id') || '';
  const isEditMode = Boolean(byggnadIdFromQuery);

  const initialPreset = presetFastighetId ?? fastighetFromQuery ?? '';
  const [fastighetId, setFastighetId] = useState<string>(initialPreset);

  const [fastigheter, setFastigheter] = useState<FastighetOption[]>([]);
  const [loadingFastigheter, setLoadingFastigheter] = useState(true);
  const [loadingByggnad, setLoadingByggnad] = useState(false);

  const [namn, setNamn] = useState('');
  const [typ, setTyp] = useState<ByggnadTyp>('bostad');
  const [vaningar, setVaningar] = useState<string>('');
  const [area, setArea] = useState<string>('');
  const [byggar, setByggar] = useState<string>('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMessage, setOkMessage] = useState<string | null>(null);

  const labelForFastighet = (f?: FastighetOption | null) => {
    if (!f) return 'Namnlös';
    const base = f.namn || 'Namnlös';
    return f.adress ? `${base} — ${f.adress}` : base;
  };

  useEffect(() => {
    const loadFastigheter = async () => {
      setLoadingFastigheter(true);
      setError(null);

      try {
        const { data, error: qError } = await supabase
          .from('fastigheter')
          .select('id, namn, adress')
          .order('kvarter', { ascending: true });

        if (qError) throw qError;

        const list = data ?? [];
        setFastigheter(list);

        if (!isEditMode && !initialPreset && list.length > 0 && !fastighetId) {
          setFastighetId(list[0].id);
        }
      } catch (e: any) {
        setError(e.message || 'Kunde inte hämta fastigheter.');
      } finally {
        setLoadingFastigheter(false);
      }
    };

    loadFastigheter();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!byggnadIdFromQuery) return;

    const loadByggnad = async () => {
      setLoadingByggnad(true);
      setError(null);
      setOkMessage(null);

      try {
        const { data, error: byggnadError } = await supabase
          .from('byggnader')
          .select(`
            id,
            namn,
            typ,
            vaningar:våningar,
            area,
            byggar:byggår,
            fastighet_id
          `)
          .eq('id', byggnadIdFromQuery)
          .single();

        if (byggnadError) throw byggnadError;
        if (!data) throw new Error('Byggnaden kunde inte hittas.');

        const byggnad: any = data;

        setFastighetId(byggnad.fastighet_id ?? '');
        setNamn(byggnad.namn ?? '');
        setTyp((byggnad.typ as ByggnadTyp) || 'bostad');
        setVaningar(byggnad.vaningar != null ? String(byggnad.vaningar) : '');
        setArea(byggnad.area != null ? String(byggnad.area) : '');
        setByggar(byggnad.byggar != null ? String(byggnad.byggar) : '');
      } catch (e: any) {
        setError(e.message || 'Kunde inte hämta byggnaden.');
      } finally {
        setLoadingByggnad(false);
      }
    };

    loadByggnad();
  }, [byggnadIdFromQuery]);

  const isLocked = !isEditMode && Boolean(initialPreset);

  const injectedSelectedOption = useMemo(() => {
    if (!fastighetId) return null;
    const inList = fastigheter.some((f) => f.id === fastighetId);
    if (inList) return null;

    return (
      <option key={`injected-${fastighetId}`} value={fastighetId}>
        {loadingFastigheter ? 'Laddar vald fastighet…' : 'Vald fastighet'}
      </option>
    );
  }, [fastighetId, fastigheter, loadingFastigheter]);

  const resetForm = () => {
    if (!initialPreset) {
      setFastighetId(fastigheter[0]?.id ?? '');
    }
    setNamn('');
    setTyp('bostad');
    setVaningar('');
    setArea('');
    setByggar('');
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

    if (!namn.trim()) {
      setError('Namn är obligatoriskt.');
      setSaving(false);
      return;
    }

    if (!BYGGNAD_TYPER.includes(typ)) {
      setError('Ogiltig byggnadstyp.');
      setSaving(false);
      return;
    }

    const våningarVal = vaningar.trim() ? parseInt(vaningar.trim(), 10) : null;
    const areaVal = area.trim() ? parseFloat(area.trim().replace(',', '.')) : null;
    const byggarVal = byggar.trim() ? parseInt(byggar.trim(), 10) : null;

    if (vaningar.trim() && Number.isNaN(våningarVal)) {
      setError('Våningar måste vara ett heltal.');
      setSaving(false);
      return;
    }

    if (area.trim() && Number.isNaN(areaVal)) {
      setError('Area måste vara ett tal (använd punkt eller komma).');
      setSaving(false);
      return;
    }

    if (byggar.trim() && Number.isNaN(byggarVal)) {
      setError('Byggår måste vara ett heltal.');
      setSaving(false);
      return;
    }

    try {
      const payload = {
        fastighet_id: fastighetId,
        namn: namn.trim(),
        typ,
        våningar: våningarVal,
        area: areaVal,
        byggår: byggarVal,
      };

      if (isEditMode) {
        const { error: updateError } = await supabase
          .from('byggnader')
          .update(payload)
          .eq('id', byggnadIdFromQuery);

        if (updateError) throw updateError;

        const { error: historikError } = await supabase
          .from('byggnad_historik')
          .insert([
            {
              byggnad_id: byggnadIdFromQuery,
              typ: 'byggnad_uppdaterad',
              rubrik: 'Byggnad uppdaterad',
              beskrivning: `${namn.trim()} uppdaterades.`,
              metadata: {
                namn: namn.trim(),
                typ,
                våningar: våningarVal,
                area: areaVal,
                byggår: byggarVal,
                fastighet_id: fastighetId,
              },
            },
          ]);

        if (historikError) {
          console.error('Kunde inte skriva byggnadshistorik (uppdatering):', historikError);
        }

        setOkMessage('Byggnad uppdaterad!');
        if (onSaved) onSaved();
        navigate(`/dashboard/byggnader/${byggnadIdFromQuery}`);
      } else {
        const { data: insertedData, error: insertError } = await supabase
          .from('byggnader')
          .insert([payload])
          .select('id')
          .single();

        if (insertError) throw insertError;

        if (insertedData?.id) {
          const { error: historikError } = await supabase
            .from('byggnad_historik')
            .insert([
              {
                byggnad_id: insertedData.id,
                typ: 'byggnad_skapad',
                rubrik: 'Byggnad skapad',
                beskrivning: `${namn.trim()} skapades.`,
                metadata: {
                  namn: namn.trim(),
                  typ,
                  våningar: våningarVal,
                  area: areaVal,
                  byggår: byggarVal,
                  fastighet_id: fastighetId,
                },
              },
            ]);

          if (historikError) {
            console.error('Kunde inte skriva byggnadshistorik (skapad):', historikError);
          }
        }

        setOkMessage('Byggnad sparad!');
        if (onSaved) onSaved();

        if (insertedData?.id) {
          navigate(`/dashboard/byggnader/${insertedData.id}`);
        } else {
          resetForm();
        }
      }
    } catch (e: any) {
      setError(e.message || 'Ett fel uppstod vid sparande.');
    } finally {
      setSaving(false);
    }
  };

  const selectedFastighetObj = fastigheter.find((f) => f.id === fastighetId) || null;
  const selectedLabel = labelForFastighet(selectedFastighetObj);

  if (loadingByggnad) {
    return (
      <div className="p-6 bg-white rounded-xl shadow-md max-w-md mx-auto space-y-4">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/2" />
          <div className="h-12 bg-gray-100 rounded" />
          <div className="h-12 bg-gray-100 rounded" />
          <div className="h-12 bg-gray-100 rounded" />
          <div className="h-12 bg-gray-100 rounded" />
          <div className="h-12 bg-gray-100 rounded" />
        </div>
      </div>
    );
  }

  return (
    <form className="p-6 bg-white rounded-xl shadow-md max-w-md mx-auto space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">
        {isEditMode ? 'Redigera byggnad' : 'Byggnad'}
      </h2>

      {error && <div className="text-red-600 font-medium text-center">{error}</div>}
      {okMessage && <div className="text-green-700 font-medium text-center">{okMessage}</div>}

      <div>
        <label className="block text-gray-700 font-medium mb-1">Fastighet</label>
        <div className="relative">
          <select
            value={fastighetId}
            onChange={(e) => setFastighetId(e.target.value)}
            disabled={loadingFastigheter || isLocked}
            className="p-3 border rounded w-full bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-100"
          >
            {injectedSelectedOption}

            {loadingFastigheter && <option>Laddar fastigheter…</option>}

            {!loadingFastigheter && fastigheter.length === 0 && (
              <option>Inga fastigheter hittade</option>
            )}

            {!loadingFastigheter &&
              fastigheter.map((f) => (
                <option key={f.id} value={f.id}>
                  {labelForFastighet(f)}
                </option>
              ))}
          </select>
        </div>

        {isLocked && (
          <p className="text-xs text-gray-500 mt-1">
            Förvald fastighet (låst): <span className="font-medium">{selectedLabel}</span>
          </p>
        )}
      </div>

      <div>
        <label className="block text-gray-700 font-medium mb-1">Namn (obligatoriskt)</label>
        <input
          value={namn}
          onChange={(e) => setNamn(e.target.value)}
          placeholder="T.ex. Hus A"
          className="p-3 border rounded w-full bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>

      <div>
        <label className="block text-gray-700 font-medium mb-1">Typ</label>
        <div className="flex flex-wrap gap-2">
          {BYGGNAD_TYPER.map((t) => (
            <button
              type="button"
              key={t}
              onClick={() => setTyp(t)}
              className={`cursor-pointer px-3 py-1 rounded-md border ${
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

      <div>
        <label className="block text-gray-700 font-medium mb-1">Våningar (valfritt)</label>
        <input
          inputMode="numeric"
          pattern="[0-9]*"
          value={vaningar}
          onChange={(e) => setVaningar(e.target.value)}
          placeholder="T.ex. 3"
          className="p-3 border rounded w-full bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>

      <div>
        <label className="block text-gray-700 font-medium mb-1">Area m² (valfritt)</label>
        <input
          inputMode="decimal"
          value={area}
          onChange={(e) => setArea(e.target.value)}
          placeholder="T.ex. 125.5"
          className="p-3 border rounded w-full bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>

      <div>
        <label className="block text-gray-700 font-medium mb-1">Byggår (valfritt)</label>
        <input
          inputMode="numeric"
          pattern="[0-9]*"
          value={byggar}
          onChange={(e) => setByggar(e.target.value)}
          placeholder="T.ex. 1985"
          className="p-3 border rounded w-full bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || loadingFastigheter || loadingByggnad || !fastighetId}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 w-full font-semibold disabled:opacity-60 cursor-pointer"
        >
          {saving
            ? isEditMode
              ? 'Uppdaterar...'
              : 'Sparar...'
            : isEditMode
              ? 'Uppdatera byggnad'
              : 'Spara byggnad'}
        </button>

        {isEditMode && (
          <button
            type="button"
            onClick={() => navigate(-1)}
            disabled={saving}
            className="bg-gray-500 text-white px-6 py-2 rounded-md shadow hover:bg-gray-600 transition font-semibold disabled:opacity-60 cursor-pointer"
          >
            Avbryt
          </button>
        )}
      </div>
    </form>
  );
}