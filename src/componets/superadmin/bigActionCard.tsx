import type { ReactNode } from 'react';

type BigActionCardProps = {
  title: string;
  description?: string;
  icon: ReactNode;
  onClick: () => void;
  theme?: 'slate' | 'indigo' | 'emerald' | 'amber' | 'rose' | 'sky';
};

const themeStyles: Record<string, { ring: string; hover: string; bg: string; iconWrap: string; gradient: string }> = {
  slate:   { ring: 'ring-slate-200',   hover: 'hover:-translate-y-1', bg: 'bg-white', iconWrap: 'bg-slate-100',   gradient: 'from-slate-50 to-white' },
  indigo:  { ring: 'ring-indigo-200',  hover: 'hover:-translate-y-1', bg: 'bg-white', iconWrap: 'bg-indigo-50',  gradient: 'from-indigo-50 to-white' },
  emerald: { ring: 'ring-emerald-200', hover: 'hover:-translate-y-1', bg: 'bg-white', iconWrap: 'bg-emerald-50', gradient: 'from-emerald-50 to-white' },
  amber:   { ring: 'ring-amber-200',   hover: 'hover:-translate-y-1', bg: 'bg-white', iconWrap: 'bg-amber-50',   gradient: 'from-amber-50 to-white' },
  rose:    { ring: 'ring-rose-200',    hover: 'hover:-translate-y-1', bg: 'bg-white', iconWrap: 'bg-rose-50',    gradient: 'from-rose-50 to-white' },
  sky:     { ring: 'ring-sky-200',     hover: 'hover:-translate-y-1', bg: 'bg-white', iconWrap: 'bg-sky-50',     gradient: 'from-sky-50 to-white' },
};

export function BigActionCard({
  title,
  description,
  icon,
  onClick,
  theme = 'slate',
}: BigActionCardProps) {
  const t = themeStyles[theme];

  return (
    <button
      onClick={onClick}
      className={`
        group relative w-full text-left overflow-hidden
        rounded-2xl ${t.bg} shadow-xl ring-1 ${t.ring}
        transition-all duration-200 ease-out ${t.hover} hover:shadow-2xl
        focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-400
      `}
    >
      {/* Subtil gradient bakgrund */}
      <div className={`absolute inset-0 bg-gradient-to-b ${t.gradient}`} />

      <div className="relative p-6 flex items-start gap-4">
        <div className={`shrink-0 ${t.iconWrap} rounded-xl p-3 text-slate-700 shadow-inner`}>
          {/* Stor ikon */}
          <div className="w-8 h-8">{icon}</div>
        </div>

        <div className="flex-1">
          <div className="text-lg font-semibold text-slate-900">{title}</div>
          {description && (
            <p className="mt-1 text-sm text-slate-600">{description}</p>
          )}
        </div>

        {/* Liten pil som visar hover */}
        <div className="ml-auto self-center text-slate-400 transition-transform duration-200 group-hover:translate-x-0.5">
          →
        </div>
      </div>
    </button>
  );
}
``