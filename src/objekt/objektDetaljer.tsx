
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useParams, useNavigate, createSearchParams } from 'react-router-dom';

type Skotare = {
  id: string;
  fornamn: string;
  efternamn: string;
  email?: string | null;
};

type FastighetLite = {
  id: string;
  namn: string | null;
  adress: string | null;
};

type ByggnadLite = {
  id: string;
  namn: string;
  fastighet_id: string;
  fastigheter: FastighetLite | null;
};

type Objekt = {
  id: string;
  namn: string | null;
  typ: string | null;
  plan: string | null;
  kvadratmeter: number | null;
  beskrivning: string | null;
  byggnad_id: string;
  byggnader: ByggnadLite | null; // normaliserad singulär relation
  skotare: Skotare[];
};

export function ObjektDetaljer() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [objekt, setObjekt] = useState<Objekt | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: qErr } = await supabase
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
              fastighet_id,
              fastigheter ( id, namn, adress )
            ),
            byggnad_objekt_skotare (
              skotare_id ( id, fornamn, efternamn, email )
            )
          `)
          .eq('id', id)
          .single();

        if (qErr) throw qErr;

        // 🔧 Normalisera relationerna (kan vara objekt ELLER array)
        const byggRelRaw = data?.byggnader ?? null;
        const byggRel = Array.isArray(byggRelRaw) ? (byggRelRaw[0] ?? null) : byggRelRaw;

        const fastRelRaw = byggRel?.fastigheter ?? null;
        const fastRel = Array.isArray(fastRelRaw) ? (fastRelRaw[0] ?? null) : fastRelRaw;

        const mapped: Objekt = {
          id: data.id,
          namn: data.namn ?? null,
          typ: data.typ ?? null,
          plan: data.plan ?? null,
          kvadratmeter: data.kvadratmeter ?? null,
          beskrivning: data.beskrivning ?? null,
          byggnad_id: data.byggnad_id,
          byggnader: byggRel
            ? {
                id: byggRel.id,
                namn: byggRel.namn,
                fastighet_id: byggRel.fastighet_id,
                fastigheter: fastRel
                  ? {
                      id: fastRel.id,
                      namn: fastRel.namn,
                      adress: fastRel.adress,
                    }
                  : null,
              }
            : null,
          skotare:
            (data.byggnad_objekt_skotare ?? [])
              .map((k: any) => k.skotare_id)
              .filter(Boolean) ?? [],
        };

        setObjekt(mapped);
      } catch (e: any) {
        setError(e.message || 'Kunde inte hämta objektet.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

  const title = useMemo(() => {
    if (!objekt) return 'Objekt';
    return objekt.namn || 'Objekt';
  }, [objekt]);

  const handleRemoveSkotare = async (skotare_id: string) => {
    if (!objekt) return;
    setSaving(true);
    setError(null);
    try {
      const { error: delErr } = await supabase
        .from('byggnad_objekt_skotare')
        .delete()
        .match({ objekt_id: objekt.id, skotare_id });
      if (delErr) throw delErr;

      // Optimistic update
      setObjekt((prev) =>
        prev
          ? { ...prev, skotare: prev.skotare.filter((s) => s.id !== skotare_id) }
          : prev
      );
    } catch (e: any) {
      setError(e.message || 'Kunde inte ta bort skötare.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteObjekt = async () => {
    if (!objekt) return;
    const ok = window.confirm(
      `Är du säker på att du vill ta bort objektet "${objekt.namn ?? objekt.id}"? Detta går inte att ångra.`
    );
    if (!ok) return;

    setSaving(true);
    setError(null);
    try {
      const { error: delErr } = await supabase
        .from('byggnad_objekt')
        .delete()
        .eq('id', objekt.id);

      if (delErr) throw delErr;

      // Tillbaka till listan
      navigate('/dashboard/byggnadsobjekt');
    } catch (e: any) {
      setError(e.message || 'Kunde inte ta bort objektet.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="w-full h-24 rounded-xl bg-gray-200 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-40 bg-gray-100 rounded-xl animate-pulse" />
          <div className="h-40 bg-gray-100 rounded-xl animate-pulse" />
        </div>
        <div className="h-64 bg-gray-100 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-red-600 font-medium">{error}</div>
      </div>
    );
  }

  if (!objekt) {
    return (
      <div className="p-6">
        <div className="text-gray-700">Objektet kunde inte hittas.</div>
      </div>
    );
  }

  const fastId = objekt.byggnader?.fastigheter?.id;
  const byggId = objekt.byggnader?.id;
  const fastLabel =
    objekt.byggnader?.fastigheter?.namn ||
    objekt.byggnader?.fastigheter?.adress ||
    'Namnlös fastighet';
  const byggLabel = objekt.byggnader?.namn || 'Namnlös byggnad';

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="rounded-2xl border border-gray-200 shadow-sm bg-white px-5 py-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{title}</h1>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() =>
                navigate({
                  pathname: '/dashboard/tilldela/objekt-skotare',
                  search: `?${createSearchParams({
                    fastighet: fastId || '',
                    byggnad: byggId || '',
                    objekt: objekt.id,
                  })}`,
                })
              }
              className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700 transition"
            >
              Tilldela skötare
            </button>

            {/* Anpassa route om du har en edit-sida */}
            <button
              onClick={() => navigate(`/dashboard/objekt/edit/${objekt.id}`)}
              className="text-sm bg-indigo-600 text-white px-3 py-1.5 rounded-md hover:bg-indigo-700 transition"
            >
              Redigera
            </button>

            <button
              onClick={handleDeleteObjekt}
              disabled={saving}
              className="text-sm bg-red-600 text-white px-3 py-1.5 rounded-md hover:bg-red-700 transition disabled:opacity-60"
            >
              Ta bort
            </button>

            <button
              onClick={() => navigate('/dashboard/byggnadsobjekt')}
              className="text-sm bg-gray-100 text-gray-900 px-3 py-1.5 rounded-md hover:bg-gray-200 transition border"
            >
              Till listan
            </button>
          </div>
        </div>
      </div>

      {/* Info + Tillhör */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Info-kort */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Information om objektet</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-gray-800">
            <div>
              <div className="text-gray-500 text-sm">Namn</div>
              <div className="font-medium">{objekt.namn ?? '-'}</div>
            </div>
            <div>
              <div className="text-gray-500 text-sm">Typ</div>
              <div className="font-medium">{objekt.typ ?? '-'}</div>
            </div>
            <div>
              <div className="text-gray-500 text-sm">Plan/våning</div>
              <div className="font-medium">{objekt.plan ?? '-'}</div>
            </div>
            <div>
              <div className="text-gray-500 text-sm">Area (m²)</div>
              <div className="font-medium">{objekt.kvadratmeter ?? '-'}</div>
            </div>
            <div className="sm:col-span-2">
              <div className="text-gray-500 text-sm">Beskrivning</div>
              <div className="font-medium text-gray-800 whitespace-pre-wrap">
                {objekt.beskrivning ?? '-'}
              </div>
            </div>
          </div>
        </div>

        {/* Tillhör-sektion */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Tillhör</h2>

          <div className="space-y-4">
            <div>
              <div className="text-gray-500 text-sm">Byggnad</div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900">{byggLabel}</span>
                {byggId && (
                  <button
                    onClick={() => navigate(`/dashboard/byggnader/${byggId}`)}
                    className="text-blue-700 hover:text-blue-800 text-xs font-medium"
                  >
                    Visa byggnad
                  </button>
                )}
              </div>
            </div>

            <div>
              <div className="text-gray-500 text-sm">Fastighet</div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900">{fastLabel}</span>
                {fastId && (
                  <button
                    onClick={() => navigate(`/dashboard/fastigheter/${fastId}`)}
                    className="text-blue-700 hover:text-blue-800 text-xs font-medium"
                  >
                    Visa fastighet
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Skötare */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Tilldelade skötare</h2>
          <button
            onClick={() =>
              navigate({
                pathname: '/dashboard/tilldela/objekt-skotare',
                search: `?${createSearchParams({
                  fastighet: fastId || '',
                  byggnad: byggId || '',
                  objekt: objekt.id,
                })}`,
              })
            }
            className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700 transition"
          >
            Hantera
          </button>
        </div>

        {objekt.skotare.length === 0 ? (
          <p className="text-gray-700">Ingen skötare kopplad ännu.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {objekt.skotare.map((s) => (
              <span
                key={s.id}
                className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-900 px-3 py-1 rounded-md border border-indigo-200 text-sm"
              >
                <button
                  onClick={() => navigate(`/dashboard/users/${s.id}`)}
                  className="font-medium hover:underline"
                  title={`${s.fornamn} ${s.efternamn}${s.email ? ` (${s.email})` : ''}`}
                >
                  {s.fornamn} {s.efternamn}
                </button>
                <button
                  type="button"
                  onClick={() => handleRemoveSkotare(s.id)}
                  disabled={saving}
                  className="text-indigo-900/70 hover:text-indigo-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded disabled:opacity-50"
                  title="Ta bort"
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
``
