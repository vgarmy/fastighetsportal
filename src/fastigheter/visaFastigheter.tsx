import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../componets/userContext'; // <- antar att denna ger { user: { id, roll, ... } }

type Skotare = {
  id: string;
  fornamn: string;
  efternamn: string;
};

type Fastighet = {
  id: string;
  namn: string | null;
  adress: string | null;
  kvarter: string | null;
  typ: string[] | null;
  byggår: number | null;
  bild_url: string | null;
  skotare: Skotare[];
};

export function VisaFastigheter() {
  const { user } = useUser();
  const [fastigheter, setFastigheter] = useState<Fastighet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const isSuperAdmin = user.roll === 'superadmin';

        if (isSuperAdmin) {
          // SUPERADMIN: hämta ALLA fastigheter + ALLA kopplade skötare
          // Vi aliasar relationen till "skotare" så det blir enkelt att mappa
          const { data, error } = await supabase
            .from('fastigheter')
            .select(`
              id, namn, adress, kvarter, typ, byggår, bild_url,
              skotare:fastighet_skotare (
                skotare:skotare_id ( id, fornamn, efternamn )
              )
            `)
            .order('kvarter', { ascending: true });

          if (error) throw error;

          const normalized: Fastighet[] = (data ?? []).map((f: any) => ({
            id: f.id,
            namn: f.namn,
            adress: f.adress,
            kvarter: f.kvarter,
            typ: f.typ,
            byggår: f.byggår,
            bild_url: f.bild_url,
            skotare: (f.skotare ?? [])
              .map((row: any) => row?.skotare)
              .filter(Boolean),
          }));

          setFastigheter(normalized);
          return;
        }

        // ADMIN/USER:
        // 1) Hämta vilka fastigheter denna användare (skötare) är kopplad till
        //    OBS: här antar vi att user.id === fastighets_users.id
        const { data: mapRows, error: mapErr } = await supabase
          .from('fastighet_skotare')
          .select('fastighet_id')
          .eq('skotare_id', user.id);

        if (mapErr) throw mapErr;

        const fastIds = (mapRows ?? []).map((r) => r.fastighet_id);
        if (fastIds.length === 0) {
          setFastigheter([]);
          return;
        }

        // 2) Hämta dessa fastigheter + ALLA deras skötare (samma info som superadmin)
        const { data, error } = await supabase
          .from('fastigheter')
          .select(`
            id, namn, adress, kvarter, typ, byggår, bild_url,
            skotare:fastighet_skotare (
              skotare:skotare_id ( id, fornamn, efternamn )
            )
          `)
          .in('id', fastIds)
          .order('kvarter', { ascending: true });

        if (error) throw error;

        const normalized: Fastighet[] = (data ?? []).map((f: any) => ({
          id: f.id,
          namn: f.namn,
          adress: f.adress,
          kvarter: f.kvarter,
          typ: f.typ,
          byggår: f.byggår,
          bild_url: f.bild_url,
          skotare: (f.skotare ?? [])
            .map((row: any) => row?.skotare)
            .filter(Boolean),
        }));

        setFastigheter(normalized);
      } catch (e: any) {
        setError(e.message ?? 'Ett fel uppstod');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [user]);

  if (!user) return <div className="p-6">Laddar…</div>;
  if (loading) return <div className="p-6 text-gray-700">Laddar fastigheter…</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  const fallbackImg =
    'https://images.unsplash.com/photo-1494526585095-c41746248156?q=80&w=1200&auto=format&fit=crop';

  const isSuperAdmin = user.roll === 'superadmin';

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">
        {isSuperAdmin ? 'Alla fastigheter' : 'Mina fastigheter'}
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {fastigheter.map((f) => (
          <div
            key={f.id}
            className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-200 overflow-hidden flex flex-col"
          >
            <div className="w-full h-[300px] bg-gray-100">
              <img
                src={f.bild_url || fallbackImg}
                alt={f.namn ?? 'Fastighet'}
                loading="lazy"
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.currentTarget as HTMLImageElement;
                  if (target.src !== fallbackImg) target.src = fallbackImg;
                }}
              />
            </div>

            <div className="p-6 flex flex-col gap-4">
              <div className="text-gray-800 space-y-1">
                <p><span className="font-medium">Namn:</span> {f.namn ?? '-'}</p>
                <p><span className="font-medium">Adress:</span> {f.adress ?? '-'}</p>
                <p><span className="font-medium">Kvarter:</span> {f.kvarter ?? '-'}</p>
                <p>
                  <span className="font-medium">Typ:</span>{' '}
                  {Array.isArray(f.typ) ? (f.typ.length ? f.typ.join(', ') : '-') : f.typ ?? '-'}
                </p>
                <p><span className="font-medium">Byggår:</span> {f.byggår ?? '-'}</p>

                <p className="font-medium pt-2">Skötare:</p>
                {(f.skotare?.length ?? 0) === 0 ? (
                  <p className="text-gray-700 ml-4">Ingen skötare kopplad</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {f.skotare.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => navigate(`/dashboard/users/${s.id}`)}
                        className="bg-blue-50 text-blue-900 px-3 py-1 rounded hover:bg-blue-100 transition text-sm border border-blue-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                      >
                        {s.fornamn} {s.efternamn}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-2">
                <button
                  onClick={() => navigate(`/dashboard/fastigheter/${f.id}`)}
                  className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  Visa detaljer
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 opacity-90" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M10.293 3.293a1 1 0 011.414 0l5 5a.997.997 0 010 1.414l-5 5a1 1 0 11-1.414-1.414L13.586 11H4a1 1 0 110-2h9.586l-3.293-3.293a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {!isSuperAdmin && fastigheter.length === 0 && (
        <p className="text-gray-600">Du är ännu inte tilldelad skötare på någon fastighet.</p>
      )}
    </div>
  );
}