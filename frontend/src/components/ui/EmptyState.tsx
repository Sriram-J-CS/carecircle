import React from 'react';

export interface EmptyStateProps {
  title: string;
  description: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  action,
  icon,
  className = '',
}) => {
  return (
    <div className={`p-10 text-center flex flex-col items-center justify-center ${className}`}>
      {icon ? (
        <div className="mb-4 text-teal-deep dark:text-teal-600">{icon}</div>
      ) : (
        /* Friendly line illustration in SVG (Heart in shield with ring) */
        <svg
          width="80"
          height="80"
          viewBox="0 0 80 80"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="mb-4 text-teal-deep/40 dark:text-teal-600/40"
          aria-hidden="true"
        >
          <circle cx="40" cy="40" r="36" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" />
          <path
            d="M40 24C34 18 24 22 24 30C24 42 40 54 40 54C40 54 56 42 56 30C56 22 46 18 40 24Z"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}

      <h3 className="font-heading text-2xl font-bold text-ink dark:text-ink-dark mb-1">
        {title}
      </h3>
      <p className="text-base text-ink-muted max-w-sm mb-6 leading-relaxed">
        {description}
      </p>

      {action && <div>{action}</div>}
    </div>
  );
};
