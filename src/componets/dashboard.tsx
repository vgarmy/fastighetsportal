import { useUser } from './userContext';
import { useNavigate, Outlet } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { User, Users, Building2, Home, PlusCircle, Wrench, LogOut, Settings } from 'lucide-react'
import { BigActionCard } from './superadmin/bigActionCard';
import { WeeklyUnderhall } from "./superadmin/weeklyUnderhallTable";

export function Dashboard() {
  const { user, setUser } = useUser();
  const navigate = useNavigate();

  if (!user) return <div className="p-6 text-gray-700">Laddar…</div>;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    navigate('/login');
  };

  const isSuperAdmin = user.roll === 'superadmin'; // behåller ditt fält "rol

  return (
    <div className="min-h-screen flex bg-slate-100">

      {/* Left navigation */}
      <aside className="w-68 bg-gradient-to-b from-slate-900 to-slate-800 text-slate-100 p-4 flex flex-col shadow-2xl">
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
                onClick={() => navigate('/dashboard')}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-slate-200 hover:bg-slate-700 hover:text-white transition cursor-pointer"
              >
                <Users size={18} />
                Dashboard
              </button>
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
                onClick={() => navigate('/dashboard/byggnader/skotarform')}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-slate-200 hover:bg-slate-700 hover:text-white transition cursor-pointer"
              >
                <Wrench size={18} />Tilldela Byggnadsskötare
              </button>

              <button
                onClick={() => navigate('/dashboard/byggnader')}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-slate-200 hover:bg-slate-700 hover:text-white transition cursor-pointer"
              >
                <Building2 size={18} />
                Visa byggnader
              </button>
              <button
                onClick={() => navigate('/dashboard/objekt/create')}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-slate-200 hover:bg-slate-700 hover:text-white transition cursor-pointer"
              >
                <PlusCircle size={18} />
                Skapa Objekt
              </button>
              <button
                onClick={() => navigate('/dashboard/objekt/skotarform')}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-slate-200 hover:bg-slate-700 hover:text-white transition cursor-pointer"
              >
                <Wrench size={18} />Tilldela Skötare
              </button>
              <button
                onClick={() => navigate('/dashboard/objekt')}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-slate-200 hover:bg-slate-700 hover:text-white transition cursor-pointer"
              >
                <Building2 size={18} />
                Visa objekt
              </button>
              <button
                onClick={() => navigate('/dashboard/underhall/create')}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-slate-200 hover:bg-slate-700 hover:text-white transition cursor-pointer"
              >
                <Building2 size={18} />
                Skapa Underhåll
              </button>
              <button
                onClick={() => navigate('/dashboard/underhall')}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-slate-200 hover:bg-slate-700 hover:text-white transition cursor-pointer"
              >
                <Building2 size={18} />
                Visa Underhåll
              </button>

            </>
          )}

          {user.roll === 'admin' && (
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
              <button
                onClick={() => navigate('/dashboard/objekt/create')}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-slate-200 hover:bg-slate-700 hover:text-white transition cursor-pointer"
              >
                <PlusCircle size={18} />
                Skapa Objekt
              </button>
            </>
          )}
          {user.roll === 'user' && (
            <>
              <button
                onClick={() => navigate('/dashboard/me')}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-slate-200 hover:bg-slate-700 hover:text-white transition cursor-pointer"
              >
                <User size={18} />
                Mina uppgifter
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
              <button
                onClick={() => navigate('/dashboard/objekt')}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-slate-200 hover:bg-slate-700 hover:text-white transition cursor-pointer"
              >
                <Building2 size={18} />
                Visa objekt
              </button>
              <button
                onClick={() => navigate('/dashboard/underhall')}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-slate-200 hover:bg-slate-700 hover:text-white transition cursor-pointer"
              >
                <Building2 size={18} />
                Visa Underhåll
              </button>

            </>
          )}
        </nav>


        <button
          onClick={() => navigate('/dashboard/settings')}
          className="w-full flex items-center gap-3 px-3 py-2 mt-4 rounded-md text-slate-200 hover:bg-slate-700 hover:text-white transition cursor-pointer"
        >
          <Settings size={18} />
          Inställningar
        </button>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 mt-4 rounded-md bg-red-600 text-slate-200 hover:bg-slate-700 hover:text-white transition cursor-pointer"
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


        {/* === NY: Hero-grid för superadmin === */}
        {isSuperAdmin && location.pathname === '/dashboard' && (
          <section className="relative">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              <BigActionCard
                title="Fastigheter"
                description="Lägg till, tilldela och hantera fastigheter."
                theme="indigo"
                icon={<Home className="w-8 h-8 text-indigo-600" />}
                onClick={() => navigate('/dashboard/fastighet/create')}
              />

              <BigActionCard
                title="Byggnader"
                description="Skapa och tilldela byggnadsskötare."
                theme="emerald"
                icon={<Building2 className="w-8 h-8 text-emerald-600" />}
                onClick={() => navigate('/dashboard/byggnader/create')}
              />

              <BigActionCard
                title="Objekt"
                description="Lägg till objekt och tilldela skötare."
                theme="amber"
                icon={<PlusCircle className="w-8 h-8 text-amber-600" />}
                onClick={() => navigate('/dashboard/objekt/create')}
              />

              <BigActionCard
                title="Användare"
                description="Skapa och administrera användare och roller."
                theme="sky"
                icon={<Users className="w-8 h-8 text-sky-600" />}
                onClick={() => navigate('/dashboard/createuser')}
              />

              <BigActionCard
                title="Underhåll"
                description="Planera och följ upp underhåll."
                theme="rose"
                icon={<Wrench className="w-8 h-8 text-rose-600" />}
                onClick={() => navigate('/dashboard/underhall/create')}
              />
            </div>
          </section>
        )}


        {isSuperAdmin && location.pathname === "/dashboard" && (
          <section className="relative">
          <div className="mt-12">
            <WeeklyUnderhall />
          </div>
          </section>
        )}


        {/* Outlet för under-routes, tex CreateUser eller AllUsers */}
        <div className='relative mt-10'>
          <Outlet />
        </div>

      </main>
    </div>
  );
}