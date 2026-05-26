import type { ReactNode } from 'react';
import { useUser } from './userContext';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
  User,
  Users,
  Building2,
  Home,
  PlusCircle,
  Wrench,
  LogOut,
  Settings,
} from 'lucide-react';
import { BigActionCard } from './superadmin/bigActionCard';
import { WeeklyUnderhall } from './superadmin/weeklyUnderhallTable';

type NavItemProps = {
  to: string;
  icon: ReactNode;
  children: ReactNode;
  active: boolean;
  onClick: () => void;
};

function NavItem({ to, icon, children, active, onClick }: NavItemProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition cursor-pointer text-left border ${active
          ? 'bg-slate-800 text-white border-slate-700 shadow-sm'
          : 'text-slate-300 border-transparent hover:bg-slate-800/70 hover:text-white'
        }`}
    >
      <span className={active ? 'text-cyan-400' : 'text-slate-400'}>{icon}</span>
      <span className="text-sm font-medium">{children}</span>
    </button>
  );
}

function NavSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1">
      <div className="px-3 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
        {title}
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

export function Dashboard() {
  const { user, setUser } = useUser();
  const navigate = useNavigate();
  const location = useLocation();

  if (!user) return <div className="p-6 text-gray-700">Laddar…</div>;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    navigate('/login');
  };

  const isSuperAdmin = user.roll === 'superadmin';

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen flex bg-slate-100">
      {/* Left navigation */}
      <aside className="w-72 bg-slate-950 text-slate-100 p-4 flex flex-col border-r border-slate-800 shadow-2xl">
        {/* User card */}
        <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full overflow-hidden bg-cyan-500/15 flex items-center justify-center font-semibold">
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt="Profilbild"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-cyan-400">
                  {user.fornamn?.[0]}
                  {user.efternamn?.[0]}
                </span>
              )}
            </div>

            <div className="min-w-0">
              <div className="text-sm font-semibold text-white truncate">
                {user.fornamn} {user.efternamn}
              </div>
              <div className="mt-1 inline-flex rounded-full bg-slate-800 px-2 py-0.5 text-[10px] uppercase tracking-wider text-slate-300">
                {user.roll}
              </div>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto pr-1 space-y-3">
          {user.roll === 'superadmin' && (
            <>
              <NavSection title="Översikt">
                <NavItem
                  to="/dashboard"
                  icon={<Users size={18} />}
                  active={isActive('/dashboard')}
                  onClick={() => navigate('/dashboard')}
                >
                  Dashboard
                </NavItem>
              </NavSection>

              <NavSection title="Fastigheter">
                <NavItem
                  to="/dashboard/fastighet/create"
                  icon={<PlusCircle size={18} />}
                  active={isActive('/dashboard/fastighet/create')}
                  onClick={() => navigate('/dashboard/fastighet/create')}
                >
                  Skapa fastighet
                </NavItem>

                <NavItem
                  to="/dashboard/fastighet/skotarform"
                  icon={<Wrench size={18} />}
                  active={isActive('/dashboard/fastighet/skotarform')}
                  onClick={() => navigate('/dashboard/fastighet/skotarform')}
                >
                  Tilldela fastighetskötare
                </NavItem>

                <NavItem
                  to="/dashboard/fastigheter"
                  icon={<Home size={18} />}
                  active={isActive('/dashboard/fastigheter')}
                  onClick={() => navigate('/dashboard/fastigheter')}
                >
                  Visa fastigheter
                </NavItem>
              </NavSection>

              <NavSection title="Byggnader">
                <NavItem
                  to="/dashboard/byggnader/create"
                  icon={<PlusCircle size={18} />}
                  active={isActive('/dashboard/byggnader/create')}
                  onClick={() => navigate('/dashboard/byggnader/create')}
                >
                  Skapa byggnader
                </NavItem>

                <NavItem
                  to="/dashboard/byggnader/skotarform"
                  icon={<Wrench size={18} />}
                  active={isActive('/dashboard/byggnader/skotarform')}
                  onClick={() => navigate('/dashboard/byggnader/skotarform')}
                >
                  Tilldela byggnadsskötare
                </NavItem>

                <NavItem
                  to="/dashboard/byggnader"
                  icon={<Building2 size={18} />}
                  active={isActive('/dashboard/byggnader')}
                  onClick={() => navigate('/dashboard/byggnader')}
                >
                  Visa byggnader
                </NavItem>
              </NavSection>

              <NavSection title="Objekt">
                <NavItem
                  to="/dashboard/objekt/create"
                  icon={<PlusCircle size={18} />}
                  active={isActive('/dashboard/objekt/create')}
                  onClick={() => navigate('/dashboard/objekt/create')}
                >
                  Skapa objekt
                </NavItem>

                <NavItem
                  to="/dashboard/objekt/skotarform"
                  icon={<Wrench size={18} />}
                  active={isActive('/dashboard/objekt/skotarform')}
                  onClick={() => navigate('/dashboard/objekt/skotarform')}
                >
                  Tilldela skötare
                </NavItem>

                <NavItem
                  to="/dashboard/objekt"
                  icon={<Building2 size={18} />}
                  active={isActive('/dashboard/objekt')}
                  onClick={() => navigate('/dashboard/objekt')}
                >
                  Visa objekt
                </NavItem>
              </NavSection>

              <NavSection title="Underhåll">
                <NavItem
                  to="/dashboard/underhall/create"
                  icon={<Wrench size={18} />}
                  active={isActive('/dashboard/underhall/create')}
                  onClick={() => navigate('/dashboard/underhall/create')}
                >
                  Skapa underhåll
                </NavItem>

                <NavItem
                  to="/dashboard/underhall"
                  icon={<Building2 size={18} />}
                  active={isActive('/dashboard/underhall')}
                  onClick={() => navigate('/dashboard/underhall')}
                >
                  Visa underhåll
                </NavItem>
              </NavSection>

              <NavSection title="Administration">
                <NavItem
                  to="/dashboard/createuser"
                  icon={<Users size={18} />}
                  active={isActive('/dashboard/createuser')}
                  onClick={() => navigate('/dashboard/createuser')}
                >
                  Skapa användare
                </NavItem>

                <NavItem
                  to="/dashboard/users"
                  icon={<User size={18} />}
                  active={isActive('/dashboard/users')}
                  onClick={() => navigate('/dashboard/users')}
                >
                  Alla användare
                </NavItem>
              </NavSection>
            </>
          )}

          {user.roll === 'admin' && (
            <>
              <NavSection title="Konto">
                <NavItem
                  to="/dashboard/me"
                  icon={<User size={18} />}
                  active={isActive('/dashboard/me')}
                  onClick={() => navigate('/dashboard/me')}
                >
                  Mina uppgifter
                </NavItem>
              </NavSection>

              <NavSection title="Fastigheter">
                <NavItem
                  to="/dashboard/fastighet/create"
                  icon={<PlusCircle size={18} />}
                  active={isActive('/dashboard/fastighet/create')}
                  onClick={() => navigate('/dashboard/fastighet/create')}
                >
                  Skapa fastighet
                </NavItem>

                <NavItem
                  to="/dashboard/fastigheter"
                  icon={<Home size={18} />}
                  active={isActive('/dashboard/fastigheter')}
                  onClick={() => navigate('/dashboard/fastigheter')}
                >
                  Visa fastigheter
                </NavItem>
              </NavSection>

              <NavSection title="Byggnader & objekt">
                <NavItem
                  to="/dashboard/byggnader"
                  icon={<Building2 size={18} />}
                  active={isActive('/dashboard/byggnader')}
                  onClick={() => navigate('/dashboard/byggnader')}
                >
                  Visa byggnader
                </NavItem>

                <NavItem
                  to="/dashboard/objekt/create"
                  icon={<PlusCircle size={18} />}
                  active={isActive('/dashboard/objekt/create')}
                  onClick={() => navigate('/dashboard/objekt/create')}
                >
                  Skapa objekt
                </NavItem>
              </NavSection>
            </>
          )}

          {user.roll === 'user' && (
            <>
              <NavSection title="Konto">
                <NavItem
                  to="/dashboard/me"
                  icon={<User size={18} />}
                  active={isActive('/dashboard/me')}
                  onClick={() => navigate('/dashboard/me')}
                >
                  Mina uppgifter
                </NavItem>
              </NavSection>

              <NavSection title="Översikt">
                <NavItem
                  to="/dashboard/fastigheter"
                  icon={<Home size={18} />}
                  active={isActive('/dashboard/fastigheter')}
                  onClick={() => navigate('/dashboard/fastigheter')}
                >
                  Visa fastigheter
                </NavItem>

                <NavItem
                  to="/dashboard/byggnader"
                  icon={<Building2 size={18} />}
                  active={isActive('/dashboard/byggnader')}
                  onClick={() => navigate('/dashboard/byggnader')}
                >
                  Visa byggnader
                </NavItem>

                <NavItem
                  to="/dashboard/objekt"
                  icon={<Building2 size={18} />}
                  active={isActive('/dashboard/objekt')}
                  onClick={() => navigate('/dashboard/objekt')}
                >
                  Visa objekt
                </NavItem>

                <NavItem
                  to="/dashboard/underhall"
                  icon={<Building2 size={18} />}
                  active={isActive('/dashboard/underhall')}
                  onClick={() => navigate('/dashboard/underhall')}
                >
                  Visa underhåll
                </NavItem>
              </NavSection>
            </>
          )}
        </nav>

        <div className="pt-4 mt-4 border-t border-slate-800 space-y-2">
          <NavItem
            to="/dashboard/settings"
            icon={<Settings size={18} />}
            active={isActive('/dashboard/settings')}
            onClick={() => navigate('/dashboard/settings')}
          >
            Inställningar
          </NavItem>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-red-300 hover:bg-red-500/10 hover:text-red-200 transition border border-transparent"
          >
            <LogOut size={18} />
            <span className="text-sm font-medium">Logga ut</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-8 relative">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-25 pointer-events-none"
          style={{
            backgroundImage:
              "url('https://images.pexels.com/photos/30291484/pexels-photo-30291484.jpeg?auto=compress&cs=tinysrgb&w=1200')",
          }}
        />
        <h1 className="text-3xl font-bold text-slate-900 mb-6 relative">
          Välkommen, {user.fornamn}!
        </h1>

        {/* Hero-grid för superadmin */}
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

        {isSuperAdmin && location.pathname === '/dashboard' && (
          <section className="relative">
            <div className="mt-12">
              <WeeklyUnderhall />
            </div>
          </section>
        )}

        {/* Outlet för under-routes */}
        <div className="relative mt-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
}