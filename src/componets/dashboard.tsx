import { useUser } from './userContext';
import { useNavigate, Outlet } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { User, Users, Building2, Home, PlusCircle, Wrench, LogOut, Mail, MapPin, Shield, Settings, Star } from 'lucide-react'


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
      <aside className="w-64 bg-gradient-to-b from-slate-900 to-slate-800 text-slate-100 p-4 flex flex-col shadow-2xl">
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
                onClick={() => navigate('/dashboard/createuser')}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-slate-200 hover:bg-slate-700 hover:text-white transition cursor-pointer"
              >
                <Users size={18} />
                Skapa användare
              </button>

              <button
                onClick={() => navigate('/dashboard/users')}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-slate-200 hover:bg-slate-700 hover:text-white transition cursor-pointer"
              >
                <User size={18} />
                Alla användare
              </button>

              <button
                onClick={() => navigate('/dashboard/fastighet/create')}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-slate-200 hover:bg-slate-700 hover:text-white transition cursor-pointer"
              >
                <PlusCircle size={18} />
                Skapa Fastighet
              </button>

              <button
                onClick={() => navigate('/dashboard/fastighet/skotarform')}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-slate-200 hover:bg-slate-700 hover:text-white transition cursor-pointer"
              >
                <Wrench size={18} />
                Tilldela Fastighetskötare
              </button>

              <button
                onClick={() => navigate('/dashboard/fastigheter')}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-slate-200 hover:bg-slate-700 hover:text-white transition cursor-pointer"
              >
                <Home size={18} />
                Visa fastigheter
              </button>

              <button
                onClick={() => navigate('/dashboard/byggnader/create')}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-slate-200 hover:bg-slate-700 hover:text-white transition cursor-pointer"
              >
                <PlusCircle size={18} />
                Skapa byggnader
              </button>

              <button
                onClick={() => navigate('/dashboard/byggnader')}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-slate-200 hover:bg-slate-700 hover:text-white transition cursor-pointer"
              >
                <Building2 size={18} />
                Visa byggnader
              </button>
            </>
          )}

          {(user.roll === 'admin' || user.roll === 'user') && (
            <>
              <button
                onClick={() => navigate('/dashboard/me')}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-slate-200 hover:bg-slate-700 hover:text-white transition cursor-pointer"
              >
                <User size={18} />
                Mina uppgifter
              </button>

              <button
                onClick={() => navigate('/dashboard/fastighet/create')}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-slate-200 hover:bg-slate-700 hover:text-white transition cursor-pointer"
              >
                <PlusCircle size={18} />
                Skapa Fastighet
              </button>

              <button
                onClick={() => navigate('/dashboard/fastigheter')}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-slate-200 hover:bg-slate-700 hover:text-white transition cursor-pointer"
              >
                <Home size={18} />
                Visa fastigheter
              </button>

              <button
                onClick={() => navigate('/dashboard/byggnader')}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-slate-200 hover:bg-slate-700 hover:text-white transition cursor-pointer"
              >
                <Building2 size={18} />
                Visa byggnader
              </button>
            </>
          )}
        </nav>

        <button
          onClick={handleLogout}
          className="mt-4 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md bg-red-600 text-white hover:bg-red-700 transition cursor-pointer"
        >
          <LogOut size={18} />
          Logga ut
        </button>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-8 relative">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-25 pointer-events-none"
          style={{
            backgroundImage:
              "url('https://images.pexels.com/photos/30291484/pexels-photo-30291484.jpeg?auto=compress&cs=tinysrgb&w=1200')",
          }}
        ></div>
        <h1 className="text-3xl font-bold text-slate-900 mb-6">
          Välkommen, {user.fornamn}!
        </h1>

        {/* User info */}
        <div className="p-6 bg-white rounded-2xl shadow-md border border-slate-200 space-y-6 relative">
          <h2 className="font-semibold text-slate-800 text-xl flex items-center gap-2">
            <User size={20} /> Din information
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-slate-700">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-slate-400" />
              <span className="font-medium text-slate-900">Förnamn:</span> {user.fornamn}
            </div>
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-slate-400" />
              <span className="font-medium text-slate-900">Efternamn:</span> {user.efternamn}
            </div>
            <div className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-slate-400" />
              <span className="font-medium text-slate-900">E-post:</span> {user.email}
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-slate-400" />
              <span className="font-medium text-slate-900">Adress:</span> {user.adress ?? '-'}
            </div>
          </div>

          {/* Panels beroende på roll */}
          {user.roll === 'superadmin' && (
            <div className="p-5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
              <Shield className="w-6 h-6 text-red-400 mt-1" />
              <div>
                <h3 className="font-semibold text-red-800">Superadmin-panel</h3>
                <p className="text-red-700 text-sm">Här kan du se allt och hantera användare.</p>
              </div>
            </div>
          )}

          {user.roll === 'admin' && (
            <div className="p-5 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-3">
              <Settings className="w-6 h-6 text-blue-400 mt-1" />
              <div>
                <h3 className="font-semibold text-blue-800">Admin-panel</h3>
                <p className="text-blue-700 text-sm">Här kan du hantera vissa delar av systemet.</p>
              </div>
            </div>
          )}

          {user.roll === 'user' && (
            <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3">
              <Star className="w-6 h-6 text-emerald-400 mt-1" />
              <div>
                <h3 className="font-semibold text-emerald-800">Vanlig användare</h3>
                <p className="text-emerald-700 text-sm">Du har begränsad åtkomst.</p>
              </div>
            </div>
          )}
        </div>


        {/* Outlet för under-routes, tex CreateUser eller AllUsers */}
        <div className='relative mt-10'>
          <Outlet />
        </div>
       
      </main>
    </div>
  );
}