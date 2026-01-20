import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

type DbUser = {
    id: string;
    fornamn: string;
    efternamn: string;
    email: string;
    adress: string | null;
    roll: 'superadmin' | 'admin' | 'user';
};

export function AllUsers() {
    const [users, setUsers] = useState<DbUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadUsers = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from('fastighets_users')
                .select('*')
                .order('efternamn', { ascending: true });

            if (error) {
                setError(error.message);
            } else {
                setUsers(data ?? []);
            }
            setLoading(false);
        };

        loadUsers();
    }, []);

    if (loading) return <div className="p-6">Laddar användare…</div>;
    if (error) return <div className="p-6 text-red-600">{error}</div>;

    return (
        <div>
            <h1 className="text-2xl font-bold mb-4">Alla användare</h1>

            <div className="overflow-x-auto bg-white rounded shadow">
                <table className="min-w-full text-sm border border-gray-300">
                    <thead className="bg-gray-200 border-b border-gray-300">
                        <tr>
                            <th className="text-left px-4 py-3 text-gray-700">Förnamn</th>
                            <th className="text-left px-4 py-3 text-gray-700">Efternamn</th>
                            <th className="text-left px-4 py-3 text-gray-700">E-post</th>
                            <th className="text-left px-4 py-3 text-gray-700">Adress</th>
                            <th className="text-left px-4 py-3 text-gray-700">Roll</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map((u, index) => (
                            <tr
                                key={u.id}
                                className={`border-b last:border-b-0 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                                    }`}
                            >
                                <td className="px-4 py-2 text-gray-800">{u.fornamn}</td>
                                <td className="px-4 py-2 text-gray-800">{u.efternamn}</td>
                                <td className="px-4 py-2 text-gray-800">{u.email}</td>
                                <td className="px-4 py-2 text-gray-800">{u.adress ?? '-'}</td>
                                <td className="px-4 py-2 text-gray-800 capitalize">{u.roll}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

            </div>
        </div>
    );
}
