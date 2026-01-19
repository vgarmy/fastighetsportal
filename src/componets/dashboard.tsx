import { useUser } from './userContext';
import { useNavigate, Outlet } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export function Dashboard() {
  const { user, setUser } = useUser();
  const navigate = useNavigate();

  if (!user) return <div className="p-6 text-gray-700">Laddar…</div>;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex bg-slate-100">
      {/* Left navigation */}
      <aside className="w-64 bg-slate-900 text-slate-100 p-4 flex flex-col shadow-xl">
        <div className="mb-8">
          <div className="text-lg font-semibold tracking-tight">
            {user.fornamn} {user.efternamn}
          </div>
          <div className="text-xs uppercase text-slate-400 mt-1">
            {user.roll}
          </div>
        </div>

        <nav className="flex-1 space-y-1">
          {user.roll === 'superadmin' && (
            <>
              <button
                onClick={() => navigate('/dashboard/create-user')}
                className="w-full text-left px-3 py-2 rounded-md text-slate-200 hover:bg-slate-800 hover:text-white transition"
              >
                Create user
              </button>
              <button
                onClick={() => navigate('/dashboard/users')}
                className="w-full text-left px-3 py-2 rounded-md text-slate-200 hover:bg-slate-800 hover:text-white transition"
              >
                All users
              </button>
            </>
          )}

          {(user.roll === 'admin' || user.roll === 'user') && (
            <button
              onClick={() => navigate('/dashboard/me')}
              className="w-full text-left px-3 py-2 rounded-md text-slate-200 hover:bg-slate-800 hover:text-white transition"
            >
              My details
            </button>
          )}
        </nav>

        <button
          onClick={handleLogout}
          className="mt-4 w-full px-3 py-2 rounded-md bg-red-600 text-white hover:bg-red-700 transition"
        >
          Logga ut
        </button>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-6">
          Välkommen, {user.fornamn}!
        </h1>

        {/* User info */}
        <div className="p-6 bg-white rounded-xl shadow-sm mb-8 border border-slate-200">
          <h2 className="font-semibold text-slate-800 mb-3">Din information</h2>
          <div className="space-y-1 text-slate-700">
            <p><span className="font-medium text-slate-900">Förnamn:</span> {user.fornamn}</p>
            <p><span className="font-medium text-slate-900">Efternamn:</span> {user.efternamn}</p>
            <p><span className="font-medium text-slate-900">E-post:</span> {user.email}</p>
            <p><span className="font-medium text-slate-900">Adress:</span> {user.adress ?? '-'}</p>
          </div>
        </div>

        {user.roll === 'superadmin' && (
          <div className="p-5 bg-red-50 border border-red-200 rounded-xl mb-4">
            <h2 className="font-semibold text-red-800">Superadmin-panel</h2>
            <p className="text-red-700">Här kan du se allt och hantera användare.</p>
          </div>
        )}

        {user.roll === 'admin' && (
          <div className="p-5 bg-blue-50 border border-blue-200 rounded-xl mb-4">
            <h2 className="font-semibold text-blue-800">Admin-panel</h2>
            <p className="text-blue-700">Här kan du hantera vissa delar av systemet.</p>
          </div>
        )}

        {user.roll === 'user' && (
          <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-xl mb-4">
            <h2 className="font-semibold text-emerald-800">Vanlig användare</h2>
            <p className="text-emerald-700">Du har begränsad åtkomst.</p>
          </div>
        )}

        <Outlet />
      </main>
    </div>
  );
}
