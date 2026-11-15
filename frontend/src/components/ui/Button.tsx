import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'patient' | 'default' | 'sm';
  isLoading?: boolean;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'default',
  isLoading = false,
  children,
  className = '',
  disabled,
  ...props
}) => {
  const variantStyles = {
    primary: 'bg-teal-deep hover:bg-teal-600 text-white shadow-soft border border-teal-deep/20',
    secondary: 'bg-sand hover:bg-sand-border text-ink border border-sand-border dark:bg-sand-dark dark:text-ink-dark dark:border-sand-dark-border',
    ghost: 'bg-transparent hover:bg-teal-mint text-teal-deep dark:hover:bg-teal-deep/20 dark:text-teal-600',
    danger: 'bg-clay hover:bg-clay-hover text-white shadow-soft border border-clay/20',
  }[variant];

  const sizeStyles = {
    patient: 'min-h-[56px] px-6 text-xl font-bold rounded-pill touch-target',
    default: 'min-h-[48px] px-5 text-base font-semibold rounded-input',
    sm: 'min-h-[38px] px-3.5 text-sm font-medium rounded-lg',
  }[size];

  return (
    <motion.button
      whileTap={{ scale: disabled || isLoading ? 1 : 0.98 }}
      transition={{ duration: 0.15 }}
      disabled={disabled || isLoading}
      className={`inline-flex items-center justify-center gap-2.5 transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-teal-deep disabled:opacity-50 disabled:cursor-not-allowed select-none ${variantStyles} ${sizeStyles} ${className}`}
      {...props}
    >
      {isLoading && <Loader2 className="w-5 h-5 animate-spin shrink-0" aria-hidden="true" />}
      <span>{children}</span>
    </motion.button>
  );
};
