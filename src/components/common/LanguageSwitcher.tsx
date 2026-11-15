import React from 'react';
import { useLanguage, LANGUAGES, LanguageCode } from '../../context/LanguageContext';
import { Globe } from 'lucide-react';

export const LanguageSwitcher: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { language, setLanguage } = useLanguage();

  return (
    <div
      role="group"
      aria-label="Language selection"
      className="inline-flex items-center gap-1.5 p-1.5 bg-warm-100 rounded-2xl border-2 border-warm-200"
    >
      <div className="flex items-center gap-1 px-2 text-teal-900 font-semibold text-base" aria-hidden="true">
        <Globe className="w-5 h-5 text-teal-850" />
        {!compact && <span className="hidden sm:inline">Language:</span>}
      </div>
      {LANGUAGES.map((item) => {
        const isSelected = language === item.code;
        return (
          <button
            key={item.code}
            type="button"
            onClick={() => setLanguage(item.code as LanguageCode)}
            aria-pressed={isSelected}
            aria-label={`Change language to ${item.label}`}
            className={`min-h-[48px] px-3.5 sm:px-4 py-2 rounded-xl font-bold transition-all text-base sm:text-lg focus:outline-none ${
              isSelected
                ? 'bg-teal-900 text-white shadow-md'
                : 'bg-white text-warm-800 hover:bg-warm-200 border border-warm-200'
            }`}
          >
            {item.nativeLabel}
          </button>
        );
      })}
    </div>
  );
};
