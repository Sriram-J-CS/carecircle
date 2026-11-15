import React, { useState, useEffect } from 'react';
import { ShieldAlert, Clock, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/Button';

export const RateLimitPage: React.FC = () => {
  const [secondsLeft, setSecondsLeft] = useState(60);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleRetry = () => {
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen bg-sand/30 dark:bg-ink flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-paper dark:bg-teal-900/40 border border-sand dark:border-teal-800 rounded-3xl p-8 text-center shadow-soft">
        <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 flex items-center justify-center mx-auto mb-6">
          <Clock className="w-8 h-8" />
        </div>

        <h1 className="text-2xl font-serif font-bold text-ink dark:text-paper mb-3">
          Taking a Short Pause
        </h1>

        <p className="text-ink/70 dark:text-sand/80 text-base leading-relaxed mb-6">
          For your security and system protection, too many requests were received in a short time. Please take a gentle breath and try again shortly.
        </p>

        <div className="bg-sand/40 dark:bg-ink/50 rounded-2xl p-4 mb-6">
          <p className="text-sm text-ink/60 dark:text-sand/60 mb-1">Time remaining</p>
          <p className="text-3xl font-serif font-bold text-teal dark:text-mint tabular-nums">
            {secondsLeft}s
          </p>
        </div>

        <Button
          variant="primary"
          onClick={handleRetry}
          disabled={secondsLeft > 0}
          className="w-full flex items-center justify-center gap-2"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>{secondsLeft > 0 ? 'Please wait...' : 'Return to Sign In'}</span>
        </Button>
      </div>
    </div>
  );
};
