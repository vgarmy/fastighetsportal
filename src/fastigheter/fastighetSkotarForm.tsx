import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export function FastighetSkotareForm() {
    const [fastigheter, setFastigheter] = useState<any[]>([]);
    const [skotare, setSkotare] = useState<any[]>([]);
    const [valdFastighet, setValdFastighet] = useState<string>('');
    const [valdaSkotare, setValdaSkotare] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Hämta alla fastigheter
    useEffect(() => {
        const fetchFastigheter = async () => {
            const { data, error } = await supabase
                .from('fastigheter')
                .select('*')
                .order('namn', { ascending: true });

            if (error) setError(error.message);
            else setFastigheter(data ?? []);
        };
        fetchFastigheter();
    }, []);

    // Hämta alla skötare
    useEffect(() => {
        const fetchSkotare = async () => {
            const { data, error } = await supabase
                .from('fastighets_users')
                .select('*')
                .order('efternamn', { ascending: true });

            if (error) setError(error.message);
            else setSkotare(data ?? []);
        };
        fetchSkotare();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!valdFastighet || valdaSkotare.length === 0) {
            setError('Välj både fastighet och minst en skötare');
            return;
        }
        setLoading(true);
        setError(null);

        try {
            // Sätt alla valda skötare på fastigheten
            const inserts = valdaSkotare.map((skotare_id) => ({
                fastighet_id: valdFastighet,
                skotare_id,
                tilldelad_datum: new Date().toISOString(),
            }));

            const { error } = await supabase
                .from('fastighet_skotare')
                .insert(inserts);

            if (error) setError(error.message);
            else {
                alert('Skötare kopplade till fastigheten!');
                setValdaSkotare([]);
                setValdFastighet('');
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form
            onSubmit={handleSubmit}
            className="p-8 bg-white rounded-2xl shadow-lg max-w-lg mx-auto space-y-6"
        >
            <h2 className="text-2xl font-bold text-gray-900 text-center">Koppla skötare till fastighet</h2>

            {error && (
                <div className="text-red-600 font-medium text-center border border-red-200 bg-red-50 rounded-md p-2">
                    {error}
                </div>
            )}

            <div className="space-y-3">
                <label className="block font-semibold text-gray-700">Välj fastighet</label>
                <select
                    value={valdFastighet}
                    onChange={(e) => setValdFastighet(e.target.value)}
                    className="p-3 border border-gray-300 rounded-lg w-full bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                >
                    <option value="">-- Välj fastighet --</option>
                    {fastigheter.map((f) => (
                        <option key={f.id} value={f.id}>
                            {f.namn || f.adress || f.kvarter || 'Unnamed'}
                        </option>
                    ))}
                </select>
            </div>

            <div className="space-y-3">
                <label className="block font-semibold text-gray-700">Välj skötare (flera möjliga)</label>
                <select
                    multiple
                    value={valdaSkotare}
                    onChange={(e) =>
                        setValdaSkotare(Array.from(e.target.selectedOptions, (o) => o.value))
                    }
                    className="p-3 border border-gray-300 rounded-lg w-full h-40 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                    style={{ color: '#111827' }} // säkerställer textfärg i multi-select
                >
                    {skotare.map((s) => (
                        <option key={s.id} value={s.id} className="text-gray-900">
                            {s.fornamn} {s.efternamn} ({s.email})
                        </option>
                    ))}
                </select>
            </div>

            <button
                type="submit"
                disabled={loading}
                className="bg-blue-600 text-white font-semibold px-5 py-3 rounded-xl shadow hover:bg-blue-700 transition w-full"
            >
                {loading ? 'Sparar...' : 'Koppla skötare'}
            </button>
        </form>


    );
}
