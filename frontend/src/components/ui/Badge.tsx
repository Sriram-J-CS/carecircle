import React from 'react';

export interface BadgeProps {
  variant?: 'sage' | 'amber' | 'clay' | 'teal' | 'neutral';
  children: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'teal',
  children,
  className = '',
}) => {
  const styles = {
    sage: 'bg-sage-light text-sage border-sage/30',
    amber: 'bg-amber-light text-amber border-amber/30',
    clay: 'bg-clay-light text-clay border-clay/30',
    teal: 'bg-teal-mint text-teal-deep border-teal-deep/20 dark:bg-teal-deep/20 dark:text-teal-600',
    neutral: 'bg-sand text-ink-muted border-sand-border dark:bg-sand-dark dark:text-ink-dark',
  }[variant];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-pill text-xs sm:text-sm font-bold uppercase tracking-wider border ${styles} ${className}`}
    >
      {children}
    </span>
  );
};
