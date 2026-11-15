import React, { useState, useEffect } from 'react';
import { WifiOff, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export const OfflineBanner: React.FC = () => {
  const { t } = useLanguage();
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      setShowReconnected(true);
      const timer = setTimeout(() => setShowReconnected(false), 4000);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOffline(true);
      setShowReconnected(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline && !showReconnected) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`fixed top-0 left-0 right-0 z-50 px-4 py-3 text-center text-sm sm:text-base font-black transition-transform duration-300 shadow-lg flex items-center justify-center gap-3 ${
        isOffline
          ? 'bg-amber-500 text-amber-950 border-b-2 border-amber-600'
          : 'bg-emerald-600 text-white border-b-2 border-emerald-700'
      }`}
    >
      {isOffline ? (
        <>
          <WifiOff className="w-5 h-5 shrink-0" />
          <span>{t('offline')}</span>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="ml-2 px-3 py-1 rounded-lg bg-amber-950 text-amber-100 hover:bg-amber-900 text-xs font-black inline-flex items-center gap-1"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry
          </button>
        </>
      ) : (
        <>
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{t('online')}</span>
        </>
      )}
    </div>
  );
};
