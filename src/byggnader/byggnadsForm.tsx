
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useSearchParams } from 'react-router-dom';

interface ByggnadFormProps {
  onSaved?: () => void;
  // Valfritt: om du redan vet fastighet_id (t.ex. när du står inne på en viss fastighetssida)
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
  const fastighetFromQuery = searchParams.get('fastighet') || undefined;

  // === 1) Stabil initialisering av fastighetId (utan att skriva över senare) ===
  const initialPreset = presetFastighetId ?? fastighetFromQuery ?? '';
  const [fastighetId, setFastighetId] = useState<string>(initialPreset);

  const [fastigheter, setFastigheter] = useState<FastighetOption[]>([]);
  const [loadingFastigheter, setLoadingFastigheter] = useState(true);

  const [namn, setNamn] = useState('');
  const [typ, setTyp] = useState<ByggnadTyp>('bostad');
  const [vaningar, setVaningar] = useState<string>(''); // input som string -> parsa till int
  const [area, setArea] = useState<string>(''); // input som string -> parsa till numeric
  const [byggar, setByggar] = useState<string>(''); // input som string -> parsa till int

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMessage, setOkMessage] = useState<string | null>(null);

  // Hjälpfunktion för att bygga etikett
  const labelForFastighet = (f?: FastighetOption | null) => {
    if (!f) return 'Namnlös';
    const base = f.namn || 'Namnlös';
    return f.adress ? `${base} — ${f.adress}` : base;
  };

  // === 2) Ladda fastigheter för dropdown ===
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

        // Viktigt: skriv inte över fastighetId om vi redan har en preset/URL
        if (!initialPreset) {
          // Endast om ingen preset eller query finns, välj första som default
          if ((list?.length ?? 0) > 0 && !fastighetId) {
            setFastighetId(list[0].id);
          }
        }
      } catch (e: any) {
        setError(e.message || 'Kunde inte hämta fastigheter.');
      } finally {
        setLoadingFastigheter(false);
      }
    };

    loadFastigheter();
    // OBS: vi vill att initialPreset används bara vid mount,
    // därför har vi den INTE i dependency-arrayen
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // === 3) Om vi har preset/URL: lås dropdownen visuellt och logiskt ===
  const isLocked = Boolean(initialPreset);

  // === 4) Förhindra blink: injicera temporär option med valt värde innan listan är klar ===
  const injectedSelectedOption = useMemo(() => {
    if (!fastighetId) return null;
    const inList = fastigheter.some((f) => f.id === fastighetId);
    if (inList) return null; // när listan väl innehåller den behövs inte injektion
    // Skapa en “placeholder”-option med bara ID (etiketten uppdateras när listan laddats)
    return (
      <option key={`injected-${fastighetId}`} value={fastighetId}>
        {loadingFastigheter ? 'Laddar vald fastighet…' : 'Vald fastighet'}
      </option>
    );
  }, [fastighetId, fastigheter, loadingFastigheter]);

  const resetForm = () => {
    // Vid reset: behåll låsningen om preset/URL finns, annars gå tillbaka till första i listan
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

    // Grundvalidering
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

    // Konverteringar
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
      const { error: insertError } = await supabase.from('byggnader').insert([
        {
          fastighet_id: fastighetId,
          namn: namn.trim(),
          typ,
          våningar: våningarVal, // kolumn med å
          area: areaVal,
          byggår: byggarVal, // kolumn med å
        },
      ]);

      if (insertError) throw insertError;

      resetForm();
      setOkMessage('Byggnad sparad!');
      if (onSaved) onSaved();
    } catch (e: any) {
      setError(e.message || 'Ett fel uppstod vid sparande.');
    } finally {
      setSaving(false);
    }
  };

  // Hitta label för vald fastighet (för hinttexten)
  const selectedFastighetObj = fastigheter.find((f) => f.id === fastighetId) || null;
  const selectedLabel = labelForFastighet(selectedFastighetObj);

  return (
    <form className="p-6 bg-white rounded-xl shadow-md max-w-md mx-auto space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">Byggnad</h2>

      {error && <div className="text-red-600 font-medium text-center">{error}</div>}
      {okMessage && <div className="text-green-700 font-medium text-center">{okMessage}</div>}

      {/* Fastighet dropdown */}
      <div>
        <label className="block text-gray-700 font-medium mb-1">Fastighet</label>
        <div className="relative">
          <select
            value={fastighetId}
            onChange={(e) => setFastighetId(e.target.value)}
            disabled={loadingFastigheter || isLocked}
            className="p-3 border rounded w-full bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-100"
          >
            {/* Injekterad option för att undvika “blink” */}
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

        {/* Hint när låst */}
        {isLocked && (
          <p className="text-xs text-gray-500 mt-1">
            Förvald fastighet (låst): <span className="font-medium">{selectedLabel}</span>
          </p>
        )}
      </div>

      {/* Namn */}
      <div>
        <label className="block text-gray-700 font-medium mb-1">Namn (obligatoriskt)</label>
        <input
          value={namn}
          onChange={(e) => setNamn(e.target.value)}
          placeholder="T.ex. Hus A"
          className="p-3 border rounded w-full bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>

      {/* Typ */}
      <div>
        <label className="block text-gray-700 font-medium mb-1">Typ</label>
        <div className="flex flex-wrap gap-2">
          {BYGGNAD_TYPER.map((t) => (
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

      {/* Våningar */}
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

      {/* Area */}
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

      {/* Byggår */}
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

      <button
        type="button"
        onClick={handleSave}
        disabled={saving || loadingFastigheter || !fastighetId}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 w-full font-semibold disabled:opacity-60"
      >
        {saving ? 'Sparar...' : 'Spara byggnad'}
      </button>
    </form>
  );
}
