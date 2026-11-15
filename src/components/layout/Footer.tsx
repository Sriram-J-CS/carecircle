import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { ShieldCheck } from 'lucide-react';

export const Footer: React.FC = () => {
  const { t } = useLanguage();

  return (
    <footer className="mt-auto border-t-2 border-warm-200 bg-white py-6 px-4">
      <div className="max-w-4xl mx-auto flex flex-col items-center justify-center text-center gap-2">
        <div className="flex items-center gap-2 text-warm-800 font-bold text-sm sm:text-base">
          <ShieldCheck className="w-5 h-5 text-teal-850 flex-shrink-0" />
          <span>{t('disclaimer')}</span>
        </div>
        <p className="text-xs text-warm-700">
          CareCircle AI Elder Companion &copy; {new Date().getFullYear()} &middot; Built for India with love &amp; dignity
        </p>
      </div>
    </footer>
  );
};
