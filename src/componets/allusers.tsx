import { useEffect, useMemo, useRef, useState } from 'react';
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

type SortField = 'fornamn' | 'efternamn' | 'email' | 'adress' | 'roll';

export function AllUsers({ users: propUsers, setUsers: propSetUsers }: AllUsersProps) {
  const [users, setUsers] = useState<DbUser[]>(propUsers ?? []);
  const [loading, setLoading] = useState(!propUsers);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // --- Filter ---
  const [rollFilter, setRollFilter] = useState('');
  const [rawQ, setRawQ] = useState('');
  const [q, setQ] = useState('');
  const searchRef = useRef<HTMLInputElement | null>(null);

  // --- Sortering ---
  const [sortField, setSortField] = useState<SortField>('efternamn');
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  const changeSort = (field: SortField) => {
    if (field === sortField) {
      setSortAsc((s) => !s);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => setQ(rawQ), 250);
    return () => clearTimeout(t);
  }, [rawQ]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      if (e.key === '/') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (propUsers) return;

    const loadUsers = async () => {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('fastighets_users')
        .select('*')
        .order('efternamn', { ascending: true });

      if (error) {
        setError(error.message);
      } else {
        setUsers(data ?? []);
        propSetUsers?.(data ?? []);
      }

      setLoading(false);
    };

    loadUsers();
  }, [propUsers, propSetUsers]);

  const displayedUsers = propUsers ?? users;

  const filtered = useMemo(() => {
    let out = [...displayedUsers];

    if (q.trim()) {
      const qs = q.trim().toLowerCase();
      out = out.filter(
        (u) =>
          u.fornamn.toLowerCase().includes(qs) ||
          u.efternamn.toLowerCase().includes(qs) ||
          u.email.toLowerCase().includes(qs) ||
          (u.adress || '').toLowerCase().includes(qs) ||
          u.roll.toLowerCase().includes(qs)
      );
    }

    if (rollFilter) {
      out = out.filter((u) => u.roll === rollFilter);
    }

    out.sort((a, b) => {
      const dir = sortAsc ? 1 : -1;

      switch (sortField) {
        case 'fornamn':
          return a.fornamn.localeCompare(b.fornamn, 'sv') * dir;

        case 'efternamn':
          return a.efternamn.localeCompare(b.efternamn, 'sv') * dir;

        case 'email':
          return a.email.localeCompare(b.email, 'sv') * dir;

        case 'adress':
          return (a.adress || '').localeCompare(b.adress || '', 'sv') * dir;

        case 'roll':
          return a.roll.localeCompare(b.roll, 'sv') * dir;

        default:
          return 0;
      }
    });

    return out;
  }, [displayedUsers, q, rollFilter, sortField, sortAsc]);

  const SortHeader = ({
    field,
    children,
    className = '',
  }: {
    field: SortField;
    children: React.ReactNode;
    className?: string;
  }) => {
    const active = sortField === field;

    return (
      <button
        type="button"
        onClick={() => changeSort(field)}
        className={`inline-flex items-center gap-1 font-semibold text-white hover:text-gray-100 transition ${className} cursor-pointer`}
      >
        <span>{children}</span>
        <span className="text-xs text-white">
          {active ? (sortAsc ? '↑' : '↓') : '↕'}
        </span>
      </button>
    );
  };

  const rollBadge = (roll: DbUser['roll']) => {
    const base =
      'inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border whitespace-nowrap';

    switch (roll) {
      case 'superadmin':
        return <span className={`${base} bg-rose-50 text-rose-800 border-rose-200`}>Superadmin</span>;
      case 'admin':
        return <span className={`${base} bg-sky-50 text-sky-800 border-sky-200`}>Admin</span>;
      case 'user':
        return <span className={`${base} bg-emerald-50 text-emerald-800 border-emerald-200`}>User</span>;
      default:
        return <span className={`${base} bg-gray-50 text-gray-800 border-gray-200`}>{roll}</span>;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-64 bg-gray-200 rounded animate-pulse" />
        <div className="h-24 w-full bg-gray-100 rounded-xl animate-pulse" />
        <div className="h-[420px] w-full bg-gray-100 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <div className="rounded-xl border border-red-300 bg-red-100 text-red-900 p-4">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Alla användare</h1>
          <p className="text-sm text-gray-600 mt-1">
            Visar <span className="font-semibold text-gray-900">{filtered.length}</span> av{' '}
            <span className="font-semibold text-gray-900">{displayedUsers.length}</span> användare
          </p>
        </div>
      </div>

      {/* Filterpanel */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-3 items-center">
          {/* Sök */}
          <div className="relative xl:col-span-9">
            <svg
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M12.9 14.32a8 8 0 111.414-1.414l4.387 4.387a1 1 0 01-1.414 1.414l-4.387-4.387zM14 8a6 6 0 11-12 0 6 6 0 0112 0z"
                clipRule="evenodd"
              />
            </svg>

            <input
              ref={searchRef}
              value={rawQ}
              onChange={(e) => setRawQ(e.target.value)}
              placeholder="Sök förnamn / efternamn / e-post / adress / roll… (tryck /)"
              className="w-full pl-9 pr-9 border border-gray-300 bg-white text-gray-900 rounded-lg px-3 py-2.5 text-sm shadow-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-400 placeholder:text-gray-400"
            />

            {rawQ && (
              <button
                type="button"
                onClick={() => setRawQ('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 inline-flex items-center justify-center rounded hover:bg-gray-100 text-gray-500"
                aria-label="Rensa sökning"
                title="Rensa"
              >
                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            )}
          </div>

          {/* Roll */}
          <div className="xl:col-span-3">
            <select
              value={rollFilter}
              onChange={(e) => setRollFilter(e.target.value)}
              className="w-full border border-gray-300 bg-white text-gray-900 rounded-lg px-3 py-2.5 text-sm shadow-sm focus:ring-2 focus:ring-blue-400"
            >
              <option value="">Alla roller</option>
              <option value="superadmin">Superadmin</option>
              <option value="admin">Admin</option>
              <option value="user">User</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabell */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 text-gray-900 shadow-sm">
          Inga användare matchar dina filter.
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-[1100px] w-full text-sm">
              <thead className="bg-slate-800 border-b border-gray-200 sticky top-0 z-10">
                <tr>
                  <th className="text-left px-4 py-5 align-middle">
                    <SortHeader field="fornamn">Förnamn</SortHeader>
                  </th>
                  <th className="text-left px-4 py-5 align-middle">
                    <SortHeader field="efternamn">Efternamn</SortHeader>
                  </th>
                  <th className="text-left px-4 py-5 align-middle">
                    <SortHeader field="email">E-post</SortHeader>
                  </th>
                  <th className="text-left px-4 py-5 align-middle">
                    <SortHeader field="adress">Adress</SortHeader>
                  </th>
                  <th className="text-left px-4 py-5 align-middle">
                    <SortHeader field="roll">Roll</SortHeader>
                  </th>
                  <th className="text-left px-4 py-5 align-middle font-semibold text-white">Åtgärder</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200">
                {filtered.map((u, index) => (
                  <tr
                    key={u.id}
                    className={`transition hover:bg-slate-200/70 ${
                      index % 2 === 0 ? 'bg-white' : 'bg-slate-100'
                    }`}
                  >
                    <td className="px-4 py-4 align-middle text-gray-900 font-medium">
                      {u.fornamn}
                    </td>

                    <td className="px-4 py-4 align-middle text-gray-800">
                      {u.efternamn}
                    </td>

                    <td className="px-4 py-4 align-middle text-gray-800">
                      <div className="max-w-[260px] truncate" title={u.email}>
                        {u.email}
                      </div>
                    </td>

                    <td className="px-4 py-4 align-middle text-gray-800">
                      <div className="max-w-[260px] truncate" title={u.adress ?? '-'}>
                        {u.adress ?? '-'}
                      </div>
                    </td>

                    <td className="px-4 py-4 align-middle">
                      {rollBadge(u.roll)}
                    </td>

                    <td className="px-4 py-4 align-middle">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => navigate(`/dashboard/users/${u.id}`)}
                          className="px-3 py-1.5 text-sm border border-blue-300 text-blue-700 rounded bg-white hover:bg-blue-50 cursor-pointer"
                        >
                          Visa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}