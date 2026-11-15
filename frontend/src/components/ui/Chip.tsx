import React from 'react';

export interface ChipProps {
  label?: string;
  children?: React.ReactNode;
  selected?: boolean;
  onClick?: () => void;
  count?: number;
  className?: string;
}

export const Chip: React.FC<ChipProps> = ({
  label,
  children,
  selected = false,
  onClick,
  count,
  className = '',
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      role="checkbox"
      aria-checked={selected}
      className={`min-h-[44px] px-4 py-2 rounded-pill font-bold text-sm sm:text-base border-2 transition-all flex items-center gap-2 select-none touch-target ${
        selected
          ? 'bg-teal-deep text-white border-teal-deep shadow-sm'
          : 'bg-white dark:bg-sand-dark text-ink dark:text-ink-dark border-sand-border dark:border-sand-dark-border hover:bg-sand/60'
      } ${className}`}
    >
      <span>{children || label}</span>
      {count !== undefined && (
        <span
          className={`px-2 py-0.5 rounded-full text-xs font-black ${
            selected ? 'bg-white/20 text-white' : 'bg-sand text-ink-muted'
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
};
