
import { useEffect, useId, useRef } from 'react';

type TabItem = {
  key: string;
  label: string;
  badgeCount?: number;
};

type TabsProps = {
  tabs: TabItem[];
  value: string;
  onChange: (key: string) => void;
  className?: string;
};

// Enkel ARIA-vänlig tabs, piltangenter stöds (vänster/höger)
export function Tabs({ tabs, value, onChange, className }: TabsProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const activeIndex = Math.max(0, tabs.findIndex(t => t.key === value));
  const indicatorId = useId();

  useEffect(() => {
    const container = listRef.current;
    if (!container) return;
    const buttons = Array.from(container.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
    const activeBtn = buttons[activeIndex];
    const indicator = container.querySelector<HTMLSpanElement>(`#${indicatorId}`);
    if (activeBtn && indicator) {
      const { offsetLeft, offsetWidth } = activeBtn;
      indicator.style.transform = `translateX(${offsetLeft}px)`;
      indicator.style.width = `${offsetWidth}px`;
    }
  }, [activeIndex, tabs, indicatorId, value]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    const max = tabs.length - 1;
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const next = activeIndex === max ? 0 : activeIndex + 1;
      onChange(tabs[next].key);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const prev = activeIndex === 0 ? max : activeIndex - 1;
      onChange(tabs[prev].key);
    }
  };

  return (
    <div className={className}>
      <div
        ref={listRef}
        className="relative flex border-b border-gray-200 overflow-x-auto no-scrollbar"
        role="tablist"
        aria-orientation="horizontal"
        onKeyDown={onKeyDown}
      >
        {tabs.map((t) => {
          const selected = t.key === value;
          return (
            <button
              key={t.key}
              role="tab"
              aria-selected={selected}
              aria-controls={`panel-${t.key}`}
              onClick={() => onChange(t.key)}
              className={[
                'relative px-4 py-3 text-sm whitespace-nowrap',
                selected ? 'text-blue-700 font-semibold' : 'text-gray-600 hover:text-gray-800'
              ].join(' ')}
            >
              <span className="inline-flex items-center gap-2">
                {t.label}
                {typeof t.badgeCount === 'number' && (
                  <span className={[
                    'inline-flex items-center justify-center min-w-5 h-5 px-2 text-xs rounded-full border',
                    selected
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'bg-gray-50 text-gray-700 border-gray-200'
                  ].join(' ')}>
                    {t.badgeCount}
                  </span>
                )}
              </span>
            </button>
          );
        })}
        {/* Understreck/indikator */}
        <span
          id={indicatorId}
          className="pointer-events-none absolute bottom-0 left-0 h-0.5 bg-blue-600 transition-transform duration-200 ease-out"
          style={{ width: 0 }}
          aria-hidden="true"
        />
      </div>
    </div>
  );
}
``
