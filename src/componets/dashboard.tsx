import { useUser } from './userContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export function Dashboard() {
  const { user, setUser } = useUser();
  const navigate = useNavigate();

  if (!user) return <div>Laddar…</div>;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    navigate('/login');
  };

  return (
    <div className="p-6">
      {/* Header med logga ut-knapp */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Välkommen, {user.fornamn}!</h1>
        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-gray-900 text-white rounded hover:bg-black"
        >
          Logga ut
        </button>
      </div>

      {/* Visa användarinformation */}
      <div className="p-4 bg-gray-100 rounded mb-6">
        <h2 className="font-semibold mb-2">Din information</h2>
        <p><span className="font-medium">Förnamn:</span> {user.fornamn}</p>
        <p><span className="font-medium">Efternamn:</span> {user.efternamn}</p>
        <p><span className="font-medium">E-post:</span> {user.email}</p>
        <p><span className="font-medium">Adress:</span> {user.adress ?? '-'}</p>
      </div>

      {/* Rollbaserad vy */}
      {user.roll === 'superadmin' && (
        <div className="p-4 bg-red-100 rounded mb-4">
          <h2 className="font-semibold">Superadmin-panel</h2>
          <p>Här kan du se allt och hantera användare.</p>
        </div>
      )}

      {user.roll === 'admin' && (
        <div className="p-4 bg-blue-100 rounded mb-4">
          <h2 className="font-semibold">Admin-panel</h2>
          <p>Här kan du hantera vissa delar av systemet.</p>
        </div>
      )}

      {user.roll === 'user' && (
        <div className="p-4 bg-green-100 rounded mb-4">
          <h2 className="font-semibold">Vanlig användare</h2>
          <p>Du har begränsad åtkomst.</p>
        </div>
      )}
    </div>
  );
}