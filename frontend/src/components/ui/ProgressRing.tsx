import React from 'react';

export interface ProgressRingProps {
  value: number; // 0 to 100
  size?: number; // diameter in px
  strokeWidth?: number;
  label?: string;
  variant?: 'auto' | 'teal' | 'sage' | 'amber' | 'clay';
  color?: string;
  showPercent?: boolean;
}

export const ProgressRing: React.FC<ProgressRingProps> = ({
  value,
  size = 120,
  strokeWidth = 10,
  label,
  variant = 'auto',
  color,
  showPercent = true,
}) => {
  const clamped = Math.min(100, Math.max(0, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  let strokeColor = color || '#0F5C5A';
  if (!color) {
    if (variant === 'auto') {
      if (clamped < 40) strokeColor = '#C8553D';
      else if (clamped < 70) strokeColor = '#D9922B';
      else strokeColor = '#3F8F5B';
    } else if (variant === 'sage') strokeColor = '#3F8F5B';
    else if (variant === 'amber') strokeColor = '#D9922B';
    else if (variant === 'clay') strokeColor = '#C8553D';
  }

  return (
    <div className="inline-flex flex-col items-center justify-center relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#E4DCCB"
          strokeWidth={strokeWidth}
          fill="transparent"
          className="dark:stroke-sand-dark-border"
        />
        {/* Animated fill */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          fill="transparent"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {showPercent && (
          <span className="font-heading text-3xl font-bold tabular-nums text-ink dark:text-ink-dark">
            {Math.round(clamped)}
            <span className="text-sm font-sans font-semibold text-ink-muted">%</span>
          </span>
        )}
        {label && <span className="text-xs uppercase font-bold text-ink-muted tracking-wider mt-0.5">{label}</span>}
      </div>
    </div>
  );
};
