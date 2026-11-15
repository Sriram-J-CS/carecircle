import React, { useState, useEffect } from 'react';
import { Download, X, Heart } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export const InstallPwaPrompt: React.FC = () => {
  const { t } = useLanguage();
  const [deferredPrompt, setDeferredPrompt] = useState<any | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  if (!deferredPrompt || isDismissed) return null;

  return (
    <div
      role="banner"
      aria-label="Install CareCircle App"
      className="fixed bottom-24 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-md z-40 p-4 sm:p-5 rounded-3xl bg-teal-950 text-white border-2 border-teal-500 shadow-2xl animate-in slide-in-from-bottom-4"
    >
      <button
        type="button"
        onClick={() => setIsDismissed(true)}
        aria-label="Dismiss installation prompt"
        className="absolute top-3 right-3 p-1 rounded-xl text-teal-300 hover:text-white"
      >
        <X className="w-5 h-5" />
      </button>

      <div className="flex items-start gap-3.5 pr-6">
        <div className="w-12 h-12 rounded-2xl bg-teal-800 flex items-center justify-center shrink-0 text-rose-400">
          <Heart className="w-6 h-6 fill-rose-500 text-rose-500" />
        </div>
        <div>
          <h3 className="text-lg font-black text-white leading-tight">
            Install CareCircle
          </h3>
          <p className="text-xs sm:text-sm font-semibold text-teal-200 mt-1">
            Add to your home screen for instant access, offline emergency contacts, and loud pill chimes.
          </p>
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={handleInstall}
          className="flex-1 py-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-black text-sm flex items-center justify-center gap-2 shadow-md touch-target"
        >
          <Download className="w-4 h-4" />
          <span>{t('installApp')}</span>
        </button>
        <button
          type="button"
          onClick={() => setIsDismissed(true)}
          className="px-4 py-3 rounded-xl bg-teal-900 hover:bg-teal-850 text-teal-300 font-bold text-sm touch-target"
        >
          Not now
        </button>
      </div>
    </div>
  );
};
