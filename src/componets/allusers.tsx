import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

type DbUser = {
  id: string;
  fornamn: string;
  efternamn: string;
  email: string;
  adress: string | null;
  roll: 'superadmin' | 'admin' | 'user';
};

interface AllUsersProps {
  users?: DbUser[];
  setUsers?: React.Dispatch<React.SetStateAction<DbUser[]>>;
}

export function AllUsers({ users: propUsers, setUsers: propSetUsers }: AllUsersProps) {
  const [users, setUsers] = useState<DbUser[]>(propUsers ?? []);
  const [loading, setLoading] = useState(!propUsers);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Om props skickas, behöver vi inte ladda från Supabase
    if (propUsers) return;

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
        // Om setUsers-prop finns, uppdatera den också
        propSetUsers?.(data ?? []);
      }
      setLoading(false);
    };

    loadUsers();
  }, [propUsers, propSetUsers]);

  if (loading) return <div className="p-6">Laddar användare…</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  const displayedUsers = propUsers ?? users;

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
              <th className="text-left px-4 py-3 text-gray-700">Åtgärder</th>
            </tr>
          </thead>
          <tbody>
            {displayedUsers.map((u, index) => (
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
                <td className="px-4 py-2">
                  <button
                    onClick={() => navigate(`/dashboard/users/${u.id}`)}
                    className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                  >
                    Detaljer
                  </button>
                </td>

              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
