import React from 'react';

export interface StepperProps {
  currentStep: number;
  totalSteps: number;
  stepTitle?: string;
  labels?: string[];
  className?: string;
}

export const Stepper: React.FC<StepperProps> = ({
  currentStep,
  totalSteps,
  stepTitle,
  labels,
  className = '',
}) => {
  const activeTitle = stepTitle || (labels && labels[currentStep - 1]);
  const progressPercent = Math.min(100, Math.round((currentStep / totalSteps) * 100));

  return (
    <div
      role="progressbar"
      aria-valuenow={currentStep}
      aria-valuemin={1}
      aria-valuemax={totalSteps}
      aria-label={`Step ${currentStep} of ${totalSteps}${stepTitle ? `: ${stepTitle}` : ''}`}
      className={`w-full space-y-2 ${className}`}
    >
      <div className="flex items-center justify-between text-xs sm:text-sm font-bold text-ink-muted">
        <span className="uppercase tracking-wider">
          Step <span className="text-teal-deep font-black dark:text-teal-600">{currentStep}</span> of {totalSteps}
        </span>
        {activeTitle && <span className="font-semibold text-ink dark:text-ink-dark truncate">{activeTitle}</span>}
      </div>
      <div className="w-full h-2 bg-sand dark:bg-sand-dark rounded-full overflow-hidden">
        <div
          className="h-full bg-teal-deep rounded-full transition-all duration-300 ease-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </div>
  );
};
