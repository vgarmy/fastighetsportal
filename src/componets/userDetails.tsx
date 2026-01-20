import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export function UserDetail() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [fornamn, setFornamn] = useState('');
    const [efternamn, setEfternamn] = useState('');
    const [email, setEmail] = useState('');
    const [adress, setAdress] = useState('');
    const [roll, setRoll] = useState<'superadmin' | 'admin' | 'user'>('user');

    useEffect(() => {
        const loadUser = async () => {
            setLoading(true);
            const { data: fetchedUser, error } = await supabase
                .from('fastighets_users')
                .select('*')
                .eq('id', id)
                .single();

            if (error) setError(error.message);
            else if (fetchedUser) {
                setFornamn(fetchedUser.fornamn);
                setEfternamn(fetchedUser.efternamn);
                setEmail(fetchedUser.email);
                setAdress(fetchedUser.adress ?? '');
                setRoll(fetchedUser.roll);
            }

            setLoading(false);
        };
        loadUser();
    }, [id]);

    const handleUpdate = async () => {
        setLoading(true);
        const { error } = await supabase
            .from('fastighets_users')
            .update({ fornamn, efternamn, email, adress, roll })
            .eq('id', id);

        setLoading(false);
        if (error) alert(error.message);
        else alert('Uppdaterad!');
    };

    const handleDelete = async () => {
        if (!confirm('Är du säker på att du vill ta bort denna användare?')) return;
        const { error } = await supabase.from('fastighets_users').delete().eq('id', id);
        if (error) alert(error.message);
        else {
            alert('Användare borttagen!');
            navigate('/dashboard/users');
        }
    };

    if (loading) return <div className="p-6">Laddar användare…</div>;
    if (error) return <div className="p-6 text-red-600">{error}</div>;

    return (
<form className="p-6 bg-white rounded-xl shadow-lg border border-gray-300 max-w-lg mx-auto space-y-6">
  <h2 className="text-xl font-bold text-gray-900 mb-4">Detaljer för {fornamn} {efternamn}</h2>

  <div className="grid gap-4">
    <div>
      <label className="block text-gray-700 font-medium mb-1">Förnamn</label>
      <input
        type="text"
        value={fornamn}
        onChange={e => setFornamn(e.target.value)}
        placeholder="Förnamn"
        className="p-3 border border-gray-400 rounded-md w-full bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
      />
    </div>

    <div>
      <label className="block text-gray-700 font-medium mb-1">Efternamn</label>
      <input
        type="text"
        value={efternamn}
        onChange={e => setEfternamn(e.target.value)}
        placeholder="Efternamn"
        className="p-3 border border-gray-400 rounded-md w-full bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
      />
    </div>

    <div>
      <label className="block text-gray-700 font-medium mb-1">E-post</label>
      <input
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="E-post"
        className="p-3 border border-gray-400 rounded-md w-full bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
      />
    </div>

    <div>
      <label className="block text-gray-700 font-medium mb-1">Adress</label>
      <input
        type="text"
        value={adress}
        onChange={e => setAdress(e.target.value)}
        placeholder="Adress"
        className="p-3 border border-gray-400 rounded-md w-full bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
      />
    </div>

    <div>
      <label className="block text-gray-700 font-medium mb-1">Roll</label>
      <select
        value={roll}
        onChange={e => setRoll(e.target.value as 'superadmin' | 'admin' | 'user')}
        className="p-3 border border-gray-400 rounded-md w-full bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400"
      >
        <option value="superadmin">Superadmin</option>
        <option value="admin">Admin</option>
        <option value="user">User</option>
      </select>
    </div>
  </div>

  <div className="flex justify-end gap-4 mt-4">
    <button
      type="button"
      onClick={handleUpdate}
      className="bg-green-600 text-white px-6 py-2 rounded-md shadow hover:bg-green-700 transition font-semibold"
    >
      Uppdatera
    </button>
    <button
      type="button"
      onClick={handleDelete}
      className="bg-red-600 text-white px-6 py-2 rounded-md shadow hover:bg-red-700 transition font-semibold"
    >
      Ta bort
    </button>
  </div>
</form>

    );
}
