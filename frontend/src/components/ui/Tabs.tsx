import React from 'react';

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

export interface TabsProps {
  items: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  items,
  activeId,
  onChange,
  className = '',
}) => {
  return (
    <div
      role="tablist"
      className={`flex items-center gap-2 p-1.5 bg-sand dark:bg-sand-dark rounded-pill border border-sand-border dark:border-sand-dark-border max-w-full overflow-x-auto ${className}`}
    >
      {items.map((tab) => {
        const isActive = tab.id === activeId;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`px-5 py-2.5 rounded-pill font-bold text-sm sm:text-base flex items-center gap-2 transition-all select-none touch-target ${
              isActive
                ? 'bg-teal-deep text-white shadow-soft'
                : 'text-ink-muted hover:text-ink dark:hover:text-ink-dark'
            }`}
          >
            {tab.icon && <span aria-hidden="true">{tab.icon}</span>}
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
};
