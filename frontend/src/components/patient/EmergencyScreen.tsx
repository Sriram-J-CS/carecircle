import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, PhoneCall, ShieldAlert, HeartPulse, CheckCircle2 } from 'lucide-react';
import { playAlertTone } from '../../services/audio';
import { speak } from '../../services/speech';
import { useLanguage } from '../../context/LanguageContext';
import { ContactIn } from '../../types/api';

interface EmergencyScreenProps {
  contacts?: ContactIn[];
  onDismiss?: () => void;
  reasons?: string[];
}

export const EmergencyScreen: React.FC<EmergencyScreenProps> = ({
  contacts = [],
  onDismiss,
  reasons = [],
}) => {
  const { language } = useLanguage();

  useEffect(() => {
    playAlertTone();
    const prompt =
      language === 'ta'
        ? 'கவனம்: அவசர மருத்துவ உதவி தேவைப்படலாம். உங்கள் குடும்பத்தினருக்கு தகவல் அனுப்பப்பட்டுள்ளது.'
        : language === 'hi'
        ? 'चेतावनी: आपातकालीन चिकित्सा सहायता की आवश्यकता हो सकती है। आपके परिवार को सूचित कर दिया गया है।'
        : 'Emergency alert triggered. Immediate help is being coordinated and your family has been notified.';
    speak(prompt, language);
  }, [language]);

  return (
    <div className="fixed inset-0 z-50 bg-clay-950/95 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="max-w-xl w-full bg-paper dark:bg-ink border-4 border-clay rounded-3xl p-6 sm:p-10 text-center space-y-6 shadow-2xl my-8"
      >
        {/* Pulsing Clay Siren */}
        <div className="relative w-24 h-24 mx-auto">
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 1.2 }}
            className="w-full h-full rounded-full bg-clay/20 text-clay flex items-center justify-center"
          >
            <ShieldAlert className="w-14 h-14" />
          </motion.div>
        </div>

        <div className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-widest text-clay">
            Critical Health Alert
          </span>
          <h2 className="text-3xl sm:text-4xl font-serif font-bold text-clay leading-tight">
            Help is Being Coordinated
          </h2>
          <p className="text-lg text-ink/80 dark:text-sand/80 leading-relaxed">
            Your family, emergency contacts, and attending physician have received an instant high-priority alert.
          </p>
        </div>

        {reasons.length > 0 && (
          <div className="bg-clay/10 border border-clay/30 rounded-2xl p-4 text-left text-sm text-clay font-medium space-y-1">
            <span className="font-bold uppercase tracking-wider text-xs">Reported Indicators:</span>
            <ul className="list-disc pl-5 space-y-0.5">
              {reasons.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Immediate Tap-to-Call Buttons */}
        <div className="space-y-3 pt-2">
          <a
            href="tel:112"
            className="w-full bg-clay hover:bg-clay-600 text-white font-serif font-bold text-2xl py-5 px-6 rounded-2xl shadow-xl flex items-center justify-center gap-3 transition-transform active:scale-98"
          >
            <PhoneCall className="w-8 h-8" />
            <span>Call 112 (National Emergency)</span>
          </a>

          <a
            href="tel:108"
            className="w-full bg-teal hover:bg-teal-700 text-white font-serif font-bold text-xl py-4 px-6 rounded-2xl shadow-md flex items-center justify-center gap-3 transition-transform active:scale-98"
          >
            <HeartPulse className="w-6 h-6" />
            <span>Call 108 (Ambulance Service)</span>
          </a>

          {contacts.map((contact, idx) => (
            <a
              key={idx}
              href={`tel:${contact.phone}`}
              className="w-full bg-sand/60 dark:bg-teal-900/40 text-ink dark:text-paper font-semibold text-lg py-3.5 px-6 rounded-2xl border border-sand dark:border-teal-700 flex items-center justify-center gap-2 hover:bg-sand transition-colors"
            >
              <PhoneCall className="w-5 h-5 text-teal dark:text-mint" />
              <span>
                Call {contact.name} ({contact.relation})
              </span>
            </a>
          ))}
        </div>

        {onDismiss && (
          <div className="pt-4 border-t border-sand dark:border-teal-900">
            <button
              onClick={onDismiss}
              className="text-sm font-semibold text-ink/60 dark:text-sand/60 hover:underline"
            >
              I am safe now / Close alert view
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};
