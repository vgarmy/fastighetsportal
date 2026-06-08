import { useEffect, useState, type ReactNode } from 'react';
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
  Menu,
  X,
  ChevronDown,
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

type MobileSectionProps = {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: ReactNode;
};

function NavItem({ icon, children, active, onClick }: NavItemProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition cursor-pointer text-left border ${
        active
          ? 'bg-slate-800 text-white border-slate-700 shadow-sm'
          : 'text-slate-300 border-transparent hover:bg-slate-800/70 hover:text-white'
      }`}
    >
      <span className={active ? 'text-cyan-400' : 'text-slate-400'}>{icon}</span>
      <span className="text-sm md:text-[15px] font-medium">{children}</span>
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

function MobileSection({
  title,
  isOpen,
  onToggle,
  children,
}: MobileSectionProps) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <span className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-200">
          {title}
        </span>
        <ChevronDown
          size={18}
          className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="border-t border-slate-800 px-2 py-2 space-y-1">
          {children}
        </div>
      )}
    </div>
  );
}

export function Dashboard() {
  const { user, setUser } = useUser();
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openSection, setOpenSection] = useState<string | null>(null);

  if (!user) return <div className="p-6 text-gray-700">Laddar…</div>;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    navigate('/login');
  };

  const isSuperAdmin = user.roll === 'superadmin';
  const isActive = (path: string) => location.pathname === path;

  const goTo = (path: string) => {
    setMobileMenuOpen(false);
    navigate(path);
  };

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (user.roll === 'superadmin') {
      if (location.pathname.startsWith('/dashboard/fastighet')) setOpenSection('fastigheter');
      else if (location.pathname.startsWith('/dashboard/byggnader')) setOpenSection('byggnader');
      else if (location.pathname.startsWith('/dashboard/objekt')) setOpenSection('objekt');
      else if (location.pathname.startsWith('/dashboard/underhall')) setOpenSection('underhall');
      else if (
        location.pathname.startsWith('/dashboard/createuser') ||
        location.pathname.startsWith('/dashboard/users')
      )
        setOpenSection('administration');
      else setOpenSection('oversikt');
    } else if (user.roll === 'admin') {
      if (location.pathname.startsWith('/dashboard/me')) setOpenSection('konto');
      else if (location.pathname.startsWith('/dashboard/fastighet') || location.pathname.startsWith('/dashboard/fastigheter')) setOpenSection('fastigheter');
      else setOpenSection('byggnaderobjekt');
    } else {
      if (location.pathname.startsWith('/dashboard/me')) setOpenSection('konto');
      else setOpenSection('oversikt');
    }
  }, [location.pathname, user.roll]);

  const toggleSection = (key: string) => {
    setOpenSection((prev) => (prev === key ? null : key));
  };

  const renderDesktopNav = () => (
    <>
      {user.roll === 'superadmin' && (
        <>
          <NavSection title="Översikt">
            <NavItem
              to="/dashboard"
              icon={<Users size={18} />}
              active={isActive('/dashboard')}
              onClick={() => goTo('/dashboard')}
            >
              Dashboard
            </NavItem>
          </NavSection>

          <NavSection title="Fastigheter">
            <NavItem
              to="/dashboard/fastighet/create"
              icon={<PlusCircle size={18} />}
              active={isActive('/dashboard/fastighet/create')}
              onClick={() => goTo('/dashboard/fastighet/create')}
            >
              Skapa fastighet
            </NavItem>

            <NavItem
              to="/dashboard/fastighet/skotarform"
              icon={<Wrench size={18} />}
              active={isActive('/dashboard/fastighet/skotarform')}
              onClick={() => goTo('/dashboard/fastighet/skotarform')}
            >
              Tilldela fastighetskötare
            </NavItem>

            <NavItem
              to="/dashboard/fastigheter"
              icon={<Home size={18} />}
              active={isActive('/dashboard/fastigheter')}
              onClick={() => goTo('/dashboard/fastigheter')}
            >
              Visa fastigheter
            </NavItem>
          </NavSection>

          <NavSection title="Byggnader">
            <NavItem
              to="/dashboard/byggnader/create"
              icon={<PlusCircle size={18} />}
              active={isActive('/dashboard/byggnader/create')}
              onClick={() => goTo('/dashboard/byggnader/create')}
            >
              Skapa byggnader
            </NavItem>

            <NavItem
              to="/dashboard/byggnader/skotarform"
              icon={<Wrench size={18} />}
              active={isActive('/dashboard/byggnader/skotarform')}
              onClick={() => goTo('/dashboard/byggnader/skotarform')}
            >
              Tilldela byggnadsskötare
            </NavItem>

            <NavItem
              to="/dashboard/byggnader"
              icon={<Building2 size={18} />}
              active={isActive('/dashboard/byggnader')}
              onClick={() => goTo('/dashboard/byggnader')}
            >
              Visa byggnader
            </NavItem>
          </NavSection>

          <NavSection title="Objekt">
            <NavItem
              to="/dashboard/objekt/create"
              icon={<PlusCircle size={18} />}
              active={isActive('/dashboard/objekt/create')}
              onClick={() => goTo('/dashboard/objekt/create')}
            >
              Skapa objekt
            </NavItem>

            <NavItem
              to="/dashboard/objekt/skotarform"
              icon={<Wrench size={18} />}
              active={isActive('/dashboard/objekt/skotarform')}
              onClick={() => goTo('/dashboard/objekt/skotarform')}
            >
              Tilldela skötare
            </NavItem>

            <NavItem
              to="/dashboard/objekt"
              icon={<Building2 size={18} />}
              active={isActive('/dashboard/objekt')}
              onClick={() => goTo('/dashboard/objekt')}
            >
              Visa objekt
            </NavItem>
          </NavSection>

          <NavSection title="Underhåll">
            <NavItem
              to="/dashboard/underhall/create"
              icon={<Wrench size={18} />}
              active={isActive('/dashboard/underhall/create')}
              onClick={() => goTo('/dashboard/underhall/create')}
            >
              Skapa underhåll
            </NavItem>

            <NavItem
              to="/dashboard/underhall"
              icon={<Building2 size={18} />}
              active={isActive('/dashboard/underhall')}
              onClick={() => goTo('/dashboard/underhall')}
            >
              Visa underhåll
            </NavItem>
          </NavSection>

          <NavSection title="Administration">
            <NavItem
              to="/dashboard/createuser"
              icon={<Users size={18} />}
              active={isActive('/dashboard/createuser')}
              onClick={() => goTo('/dashboard/createuser')}
            >
              Skapa användare
            </NavItem>

            <NavItem
              to="/dashboard/users"
              icon={<User size={18} />}
              active={isActive('/dashboard/users')}
              onClick={() => goTo('/dashboard/users')}
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
              onClick={() => goTo('/dashboard/me')}
            >
              Mina uppgifter
            </NavItem>
          </NavSection>

          <NavSection title="Fastigheter">
            <NavItem
              to="/dashboard/fastighet/create"
              icon={<PlusCircle size={18} />}
              active={isActive('/dashboard/fastighet/create')}
              onClick={() => goTo('/dashboard/fastighet/create')}
            >
              Skapa fastighet
            </NavItem>

            <NavItem
              to="/dashboard/fastigheter"
              icon={<Home size={18} />}
              active={isActive('/dashboard/fastigheter')}
              onClick={() => goTo('/dashboard/fastigheter')}
            >
              Visa fastigheter
            </NavItem>
          </NavSection>

          <NavSection title="Byggnader & objekt">
            <NavItem
              to="/dashboard/byggnader"
              icon={<Building2 size={18} />}
              active={isActive('/dashboard/byggnader')}
              onClick={() => goTo('/dashboard/byggnader')}
            >
              Visa byggnader
            </NavItem>

            <NavItem
              to="/dashboard/objekt/create"
              icon={<PlusCircle size={18} />}
              active={isActive('/dashboard/objekt/create')}
              onClick={() => goTo('/dashboard/objekt/create')}
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
              onClick={() => goTo('/dashboard/me')}
            >
              Mina uppgifter
            </NavItem>
          </NavSection>

          <NavSection title="Översikt">
            <NavItem
              to="/dashboard/fastigheter"
              icon={<Home size={18} />}
              active={isActive('/dashboard/fastigheter')}
              onClick={() => goTo('/dashboard/fastigheter')}
            >
              Visa fastigheter
            </NavItem>

            <NavItem
              to="/dashboard/byggnader"
              icon={<Building2 size={18} />}
              active={isActive('/dashboard/byggnader')}
              onClick={() => goTo('/dashboard/byggnader')}
            >
              Visa byggnader
            </NavItem>

            <NavItem
              to="/dashboard/objekt"
              icon={<Building2 size={18} />}
              active={isActive('/dashboard/objekt')}
              onClick={() => goTo('/dashboard/objekt')}
            >
              Visa objekt
            </NavItem>

            <NavItem
              to="/dashboard/underhall"
              icon={<Building2 size={18} />}
              active={isActive('/dashboard/underhall')}
              onClick={() => goTo('/dashboard/underhall')}
            >
              Visa underhåll
            </NavItem>
          </NavSection>
        </>
      )}
    </>
  );

  const renderMobileNav = () => (
    <>
      {user.roll === 'superadmin' && (
        <>
          <MobileSection
            title="Översikt"
            isOpen={openSection === 'oversikt'}
            onToggle={() => toggleSection('oversikt')}
          >
            <NavItem
              to="/dashboard"
              icon={<Users size={18} />}
              active={isActive('/dashboard')}
              onClick={() => goTo('/dashboard')}
            >
              Dashboard
            </NavItem>
          </MobileSection>

          <MobileSection
            title="Fastigheter"
            isOpen={openSection === 'fastigheter'}
            onToggle={() => toggleSection('fastigheter')}
          >
            <NavItem
              to="/dashboard/fastighet/create"
              icon={<PlusCircle size={18} />}
              active={isActive('/dashboard/fastighet/create')}
              onClick={() => goTo('/dashboard/fastighet/create')}
            >
              Skapa fastighet
            </NavItem>
            <NavItem
              to="/dashboard/fastighet/skotarform"
              icon={<Wrench size={18} />}
              active={isActive('/dashboard/fastighet/skotarform')}
              onClick={() => goTo('/dashboard/fastighet/skotarform')}
            >
              Tilldela fastighetskötare
            </NavItem>
            <NavItem
              to="/dashboard/fastigheter"
              icon={<Home size={18} />}
              active={isActive('/dashboard/fastigheter')}
              onClick={() => goTo('/dashboard/fastigheter')}
            >
              Visa fastigheter
            </NavItem>
          </MobileSection>

          <MobileSection
            title="Byggnader"
            isOpen={openSection === 'byggnader'}
            onToggle={() => toggleSection('byggnader')}
          >
            <NavItem
              to="/dashboard/byggnader/create"
              icon={<PlusCircle size={18} />}
              active={isActive('/dashboard/byggnader/create')}
              onClick={() => goTo('/dashboard/byggnader/create')}
            >
              Skapa byggnader
            </NavItem>
            <NavItem
              to="/dashboard/byggnader/skotarform"
              icon={<Wrench size={18} />}
              active={isActive('/dashboard/byggnader/skotarform')}
              onClick={() => goTo('/dashboard/byggnader/skotarform')}
            >
              Tilldela byggnadsskötare
            </NavItem>
            <NavItem
              to="/dashboard/byggnader"
              icon={<Building2 size={18} />}
              active={isActive('/dashboard/byggnader')}
              onClick={() => goTo('/dashboard/byggnader')}
            >
              Visa byggnader
            </NavItem>
          </MobileSection>

          <MobileSection
            title="Objekt"
            isOpen={openSection === 'objekt'}
            onToggle={() => toggleSection('objekt')}
          >
            <NavItem
              to="/dashboard/objekt/create"
              icon={<PlusCircle size={18} />}
              active={isActive('/dashboard/objekt/create')}
              onClick={() => goTo('/dashboard/objekt/create')}
            >
              Skapa objekt
            </NavItem>
            <NavItem
              to="/dashboard/objekt/skotarform"
              icon={<Wrench size={18} />}
              active={isActive('/dashboard/objekt/skotarform')}
              onClick={() => goTo('/dashboard/objekt/skotarform')}
            >
              Tilldela skötare
            </NavItem>
            <NavItem
              to="/dashboard/objekt"
              icon={<Building2 size={18} />}
              active={isActive('/dashboard/objekt')}
              onClick={() => goTo('/dashboard/objekt')}
            >
              Visa objekt
            </NavItem>
          </MobileSection>

          <MobileSection
            title="Underhåll"
            isOpen={openSection === 'underhall'}
            onToggle={() => toggleSection('underhall')}
          >
            <NavItem
              to="/dashboard/underhall/create"
              icon={<Wrench size={18} />}
              active={isActive('/dashboard/underhall/create')}
              onClick={() => goTo('/dashboard/underhall/create')}
            >
              Skapa underhåll
            </NavItem>
            <NavItem
              to="/dashboard/underhall"
              icon={<Building2 size={18} />}
              active={isActive('/dashboard/underhall')}
              onClick={() => goTo('/dashboard/underhall')}
            >
              Visa underhåll
            </NavItem>
          </MobileSection>

          <MobileSection
            title="Administration"
            isOpen={openSection === 'administration'}
            onToggle={() => toggleSection('administration')}
          >
            <NavItem
              to="/dashboard/createuser"
              icon={<Users size={18} />}
              active={isActive('/dashboard/createuser')}
              onClick={() => goTo('/dashboard/createuser')}
            >
              Skapa användare
            </NavItem>
            <NavItem
              to="/dashboard/users"
              icon={<User size={18} />}
              active={isActive('/dashboard/users')}
              onClick={() => goTo('/dashboard/users')}
            >
              Alla användare
            </NavItem>
          </MobileSection>
        </>
      )}

      {user.roll === 'admin' && (
        <>
          <MobileSection
            title="Konto"
            isOpen={openSection === 'konto'}
            onToggle={() => toggleSection('konto')}
          >
            <NavItem
              to="/dashboard/me"
              icon={<User size={18} />}
              active={isActive('/dashboard/me')}
              onClick={() => goTo('/dashboard/me')}
            >
              Mina uppgifter
            </NavItem>
          </MobileSection>

          <MobileSection
            title="Fastigheter"
            isOpen={openSection === 'fastigheter'}
            onToggle={() => toggleSection('fastigheter')}
          >
            <NavItem
              to="/dashboard/fastighet/create"
              icon={<PlusCircle size={18} />}
              active={isActive('/dashboard/fastighet/create')}
              onClick={() => goTo('/dashboard/fastighet/create')}
            >
              Skapa fastighet
            </NavItem>
            <NavItem
              to="/dashboard/fastigheter"
              icon={<Home size={18} />}
              active={isActive('/dashboard/fastigheter')}
              onClick={() => goTo('/dashboard/fastigheter')}
            >
              Visa fastigheter
            </NavItem>
          </MobileSection>

          <MobileSection
            title="Byggnader & objekt"
            isOpen={openSection === 'byggnaderobjekt'}
            onToggle={() => toggleSection('byggnaderobjekt')}
          >
            <NavItem
              to="/dashboard/byggnader"
              icon={<Building2 size={18} />}
              active={isActive('/dashboard/byggnader')}
              onClick={() => goTo('/dashboard/byggnader')}
            >
              Visa byggnader
            </NavItem>
            <NavItem
              to="/dashboard/objekt/create"
              icon={<PlusCircle size={18} />}
              active={isActive('/dashboard/objekt/create')}
              onClick={() => goTo('/dashboard/objekt/create')}
            >
              Skapa objekt
            </NavItem>
          </MobileSection>
        </>
      )}

      {user.roll === 'user' && (
        <>
          <MobileSection
            title="Konto"
            isOpen={openSection === 'konto'}
            onToggle={() => toggleSection('konto')}
          >
            <NavItem
              to="/dashboard/me"
              icon={<User size={18} />}
              active={isActive('/dashboard/me')}
              onClick={() => goTo('/dashboard/me')}
            >
              Mina uppgifter
            </NavItem>
          </MobileSection>

          <MobileSection
            title="Översikt"
            isOpen={openSection === 'oversikt'}
            onToggle={() => toggleSection('oversikt')}
          >
            <NavItem
              to="/dashboard/fastigheter"
              icon={<Home size={18} />}
              active={isActive('/dashboard/fastigheter')}
              onClick={() => goTo('/dashboard/fastigheter')}
            >
              Visa fastigheter
            </NavItem>
            <NavItem
              to="/dashboard/byggnader"
              icon={<Building2 size={18} />}
              active={isActive('/dashboard/byggnader')}
              onClick={() => goTo('/dashboard/byggnader')}
            >
              Visa byggnader
            </NavItem>
            <NavItem
              to="/dashboard/objekt"
              icon={<Building2 size={18} />}
              active={isActive('/dashboard/objekt')}
              onClick={() => goTo('/dashboard/objekt')}
            >
              Visa objekt
            </NavItem>
            <NavItem
              to="/dashboard/underhall"
              icon={<Building2 size={18} />}
              active={isActive('/dashboard/underhall')}
              onClick={() => goTo('/dashboard/underhall')}
            >
              Visa underhåll
            </NavItem>
          </MobileSection>
        </>
      )}
    </>
  );

  return (
    <div className="min-h-screen flex bg-slate-100">
      {/* Mobil/tablet topbar */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="flex items-center justify-between px-4 py-3 sm:px-5 md:px-6">
          <button onClick={() => goTo('/dashboard')} className="text-left">
            <div className="text-base sm:text-lg md:text-xl font-bold tracking-tight text-slate-900">
              Fastighetsportalen
            </div>
          </button>

          <button
            onClick={() => setMobileMenuOpen(true)}
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white p-2.5 text-slate-700 shadow-sm hover:bg-slate-50"
            aria-label="Öppna meny"
          >
            <Menu size={22} />
          </button>
        </div>
      </header>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-72 bg-slate-950 text-slate-100 p-4 flex-col border-r border-slate-800 shadow-2xl">
        <div className="mb-5 px-1">
          <button onClick={() => goTo('/dashboard')} className="text-left">
            <div className="text-xl font-bold tracking-tight text-white">
              Fastighetsportalen
            </div>
            <div className="mt-1 text-xs text-slate-400">Adminpanel</div>
          </button>
        </div>

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

        <nav className="flex-1 overflow-y-auto pr-1 space-y-3">{renderDesktopNav()}</nav>

        <div className="pt-4 mt-4 border-t border-slate-800 space-y-2">
          <NavItem
            to="/dashboard/settings"
            icon={<Settings size={18} />}
            active={isActive('/dashboard/settings')}
            onClick={() => goTo('/dashboard/settings')}
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

      {/* Mobil/tablet drawer */}
      <div
        className={`lg:hidden fixed inset-0 z-50 ${mobileMenuOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}
      >
        <div
          onClick={() => setMobileMenuOpen(false)}
          className={`absolute inset-0 bg-slate-950/50 transition-opacity duration-300 ${
            mobileMenuOpen ? 'opacity-100' : 'opacity-0'
          }`}
        />

        <aside
          className={`absolute right-0 top-0 h-full w-[86vw] max-w-[420px] bg-slate-950 text-slate-100 border-l border-slate-800 shadow-2xl transition-transform duration-300 ${
            mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 px-4 py-4">
              <div>
                <div className="text-lg font-bold text-white">Fastighetsportalen</div>
                <div className="text-xs text-slate-400">Meny</div>
              </div>

              <button
                onClick={() => setMobileMenuOpen(false)}
                className="inline-flex items-center justify-center rounded-xl border border-slate-800 bg-slate-900 p-2 text-slate-300 hover:bg-slate-800 hover:text-white"
                aria-label="Stäng meny"
              >
                <X size={20} />
              </button>
            </div>

            <div className="border-b border-slate-800 px-4 py-4">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
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
            </div>

            <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
              {renderMobileNav()}
            </nav>

            <div className="border-t border-slate-800 px-3 py-3 space-y-2">
              <NavItem
                to="/dashboard/settings"
                icon={<Settings size={18} />}
                active={isActive('/dashboard/settings')}
                onClick={() => goTo('/dashboard/settings')}
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
          </div>
        </aside>
      </div>

      {/* Main content */}
      <main className="flex-1 p-4 pt-20 md:p-6 md:pt-24 lg:p-8 relative">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-25 pointer-events-none"
          style={{
            backgroundImage:
              "url('https://images.pexels.com/photos/30291484/pexels-photo-30291484.jpeg?auto=compress&cs=tinysrgb&w=1200')",
          }}
        />

        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-6 relative">
          Välkommen, {user.fornamn}!
        </h1>

        {isSuperAdmin && location.pathname === '/dashboard' && (
          <section className="relative">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
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
          <section className="relative mt-12">
            <WeeklyUnderhall />
          </section>
        )}

        <div className="relative mt-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
}