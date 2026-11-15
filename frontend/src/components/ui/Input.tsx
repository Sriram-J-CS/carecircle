import React, { useId, useState } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  hint,
  icon,
  id: propId,
  value,
  placeholder = ' ',
  className = '',
  required,
  ...props
}) => {
  const autoId = useId();
  const id = propId || autoId;
  const [isFocused, setIsFocused] = useState(false);
  const hasValue = value !== undefined && value !== null && String(value).length > 0;

  return (
    <div className="w-full relative flex flex-col pt-1">
      <div className="relative">
        {icon && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-ink-muted">
            {icon}
          </div>
        )}
        <input
          id={id}
          value={value}
          placeholder={placeholder}
          onFocus={(e) => {
            setIsFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            props.onBlur?.(e);
          }}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          className={`peer w-full ${icon ? 'pr-11 pl-4' : 'px-4'} pt-6 pb-2 min-h-[56px] text-lg font-semibold bg-white dark:bg-sand-dark text-ink dark:text-ink-dark border-2 rounded-input outline-none transition-colors ${
            error
              ? 'border-clay focus:border-clay focus:ring-2 focus:ring-clay/20'
              : 'border-sand-border dark:border-sand-dark-border focus:border-teal-deep focus:ring-3 focus:ring-teal-deep/20'
          } ${className}`}
          {...props}
        />
        <label
          htmlFor={id}
          className={`absolute left-4 top-2 text-xs uppercase tracking-wider font-bold transition-all pointer-events-none ${
            error
              ? 'text-clay'
              : isFocused
              ? 'text-teal-deep dark:text-teal-600'
              : 'text-ink-muted'
          }`}
        >
          {label} {required && <span className="text-clay" aria-hidden="true">*</span>}
        </label>
      </div>

      {error ? (
        <p id={`${id}-error`} role="alert" className="text-sm font-bold text-clay mt-1.5 flex items-center gap-1">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs font-medium text-ink-muted mt-1">
          {hint}
        </p>
      ) : null}
    </div>
  );
};
