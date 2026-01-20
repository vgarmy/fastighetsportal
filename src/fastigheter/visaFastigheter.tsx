import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

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
    skotare: Skotare[];
    bild_url: string | null;
};

export function VisaFastigheter() {
    const [fastigheter, setFastigheter] = useState<Fastighet[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        const loadFastigheter = async () => {
            setLoading(true);
            try {
                // Hämta alla fastigheter
                const { data: fastData, error: fastError } = await supabase
                    .from('fastigheter')
                    .select('*')
                    .order('kvarter', { ascending: true });

                if (fastError) throw fastError;
                if (!fastData) {
                    setFastigheter([]);
                    setLoading(false);
                    return;
                }

                // Hämta skötare som är kopplade direkt till fastighet
                const fastighetIds = fastData.map((f) => f.id);
                const { data: skotData, error: skotError } = await supabase
                    .from('fastighet_skotare')
                    .select('fastighet_id, skotare_id(id, fornamn, efternamn)')
                    .in('fastighet_id', fastighetIds);

                if (skotError) throw skotError;

                // Koppla skötare till rätt fastighet
                const fastigheterWithSkotare: Fastighet[] = fastData.map((f) => {
                    const skotare: Skotare[] =
                        skotData
                            ?.filter((s) => s.fastighet_id === f.id)
                            .map((s) => {
                                // Supabase returnerar ibland skotare_id som en array med ett objekt
                                if (Array.isArray(s.skotare_id)) return s.skotare_id[0];
                                return s.skotare_id;
                            })
                            .filter(Boolean) ?? [];
                    return { ...f, skotare };
                });

                setFastigheter(fastigheterWithSkotare);
            } catch (err: any) {
                setError(err.message || 'Ett fel uppstod');
            } finally {
                setLoading(false);
            }
        };

        loadFastigheter();
    }, []);

    if (loading) return <div className="p-6 text-gray-700">Laddar fastigheter…</div>;
    if (error) return <div className="p-6 text-red-600">{error}</div>;

    return (
        <div className="space-y-6 p-6">
            <h1 className="text-2xl font-bold text-gray-900">Alla fastigheter</h1>
            {fastigheter.map((f) => (
                <div
                    key={f.id}
                    className="bg-white rounded-xl shadow-md p-6 flex flex-col gap-3 border border-gray-200"
                >
                    <div className="text-gray-800 space-y-1">
                        <p><span className="font-medium">Namn:</span> {f.namn ?? '-'}</p>
                        <p><span className="font-medium">Adress:</span> {f.adress ?? '-'}</p>
                        <p><span className="font-medium">Kvarter:</span> {f.kvarter ?? '-'}</p>
                        <p><span className="font-medium">Typ:</span> {f.typ?.join(', ') ?? '-'}</p>
                        <p><span className="font-medium">Byggår:</span> {f.byggår ?? '-'}</p>

                        <p><span className="font-medium">Skötare:</span></p>
                        {f.skotare.length === 0 ? (
                            <p className="text-gray-700 ml-4">Ingen skötare kopplad</p>
                        ) : (
                            <div className="flex flex-wrap gap-2 ml-4">
                                {f.skotare.map((s) => (
                                    <button
                                        key={s.id}
                                        onClick={() => navigate(`/dashboard/users/${s.id}`)}
                                        className="bg-blue-100 text-blue-900 px-3 py-1 rounded hover:bg-blue-200 transition text-sm"
                                    >
                                        {s.fornamn} {s.efternamn}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    {f.bild_url && (
                        <img
                            src={f.bild_url}
                            alt={f.namn ?? 'Fastighet'}
                            className="w-full h-40 object-cover rounded-lg mb-3"
                        />
                    )}

                    <button
                        onClick={() => navigate(`/dashboard/fastigheter/${f.id}`)}
                        className="mt-3 self-start bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
                    >
                        Visa detaljer
                    </button>
                </div>
            ))}
        </div>
    );
}
