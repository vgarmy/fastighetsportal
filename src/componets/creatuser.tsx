import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase'; // din vanliga frontend klient
import { useUser } from './userContext';

interface CreateUserForm {
    fornamn: string;
    efternamn: string;
    email: string;
    password: string;
    adress?: string;
    roll: 'user' | 'admin' | 'superadmin';
}

export default function CreateUser() {
    const { setUser } = useUser();
    const navigate = useNavigate();

    const [form, setForm] = useState<CreateUserForm>({
        fornamn: '',
        efternamn: '',
        email: '',
        password: '',
        adress: '',
        roll: 'user',
    });
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // Skicka POST till backend-servern
            const res = await fetch('http://localhost:4000/create-user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });

            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Något gick fel');

            // Direkt login med frontend Supabase client
            const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
                email: form.email,
                password: form.password,
            });

            if (loginError) throw new Error(loginError.message);

            setUser({
                id: loginData.user.id,
                fornamn: form.fornamn,
                efternamn: form.efternamn,
                email: form.email,
                adress: form.adress,
                roll: form.roll,
            });

            navigate('/dashboard');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-md mx-auto mt-12 p-8 bg-white rounded-2xl shadow-xl border border-gray-200">
            <h2 className="text-3xl font-bold mb-8 text-gray-800 text-center">Skapa ny användare</h2>
            {error && <p className="text-red-600 mb-6 text-center font-medium">{error}</p>}
            <form onSubmit={handleSubmit} className="space-y-6">
                <input
                    name="fornamn"
                    placeholder="Förnamn"
                    value={form.fornamn}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 bg-gray-50 text-gray-900 placeholder-gray-400"
                    required
                />
                <input
                    name="efternamn"
                    placeholder="Efternamn"
                    value={form.efternamn}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 bg-gray-50 text-gray-900 placeholder-gray-400"
                    required
                />
                <input
                    name="email"
                    type="email"
                    placeholder="E-post"
                    value={form.email}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 bg-gray-50 text-gray-900 placeholder-gray-400"
                    required
                />
                <input
                    name="password"
                    type="password"
                    placeholder="Lösenord"
                    value={form.password}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 bg-gray-50 text-gray-900 placeholder-gray-400"
                    required
                />
                <input
                    name="adress"
                    placeholder="Adress"
                    value={form.adress}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 bg-gray-50 text-gray-900 placeholder-gray-400"
                />
                <select
                    name="roll"
                    value={form.roll}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 bg-gray-50 text-gray-900"
                >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                    <option value="superadmin">Superadmin</option>
                </select>
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? 'Skapar...' : 'Skapa användare'}
                </button>
            </form>
        </div>
    );
}