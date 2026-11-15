import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Clock, Pill, CheckCircle2, ChevronRight } from 'lucide-react';
import { Button } from '../ui/Button';
import { Dose } from '../../types/api';
import { playSoftChime } from '../../services/audio';
import { speak } from '../../services/speech';
import { useLanguage } from '../../context/LanguageContext';
import { api } from '../../services/api';

interface ReminderModalProps {
  doses: Dose[];
  onTakeNow: (doses: Dose[]) => void;
  onDismiss: () => void;
}

export const ReminderModal: React.FC<ReminderModalProps> = ({
  doses,
  onTakeNow,
  onDismiss,
}) => {
  const { language, t } = useLanguage();
  const voiceIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (doses.length === 0) return;

    // 1. Play soft audio chime
    playSoftChime();

    // 2. Speak reminder aloud
    const medNames = doses.map((d) => d.medicine_name).join(', ');
    const promptText =
      language === 'ta'
        ? `உங்கள் மருந்து உட்கொள்ள வேண்டிய நேரம்: ${medNames}`
        : language === 'hi'
        ? `आपकी दवाई लेने का समय हो गया है: ${medNames}`
        : `Time for your medicine: ${medNames}. Please take it now.`;

    speak(promptText, language);

    // 3. Browser notification
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification('CareCircle Medicine Reminder', {
          body: `Time for: ${medNames}`,
          icon: '/carecircle-logo.svg',
        });
      } catch {
        // ignore
      }
    }

    // 4. Repeat prompt every 2 minutes
    voiceIntervalRef.current = window.setInterval(() => {
      playSoftChime();
      speak(promptText, language);
    }, 2 * 60 * 1000);

    return () => {
      if (voiceIntervalRef.current) {
        clearInterval(voiceIntervalRef.current);
        voiceIntervalRef.current = null;
      }
    };
  }, [doses, language]);

  const handleSnooze = async () => {
    try {
      for (const d of doses) {
        await api.snoozeDose(d.id, 10);
      }
    } catch {
      // non-fatal
    }
    onDismiss();
  };

  if (doses.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 bg-ink/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-paper dark:bg-teal-950 border-4 border-teal rounded-3xl max-w-xl w-full p-6 sm:p-10 text-center space-y-6 shadow-2xl"
      >
        {/* Animated Bell Icon */}
        <div className="relative w-24 h-24 mx-auto">
          <div className="w-full h-full rounded-full bg-mint dark:bg-teal-900 flex items-center justify-center text-teal dark:text-mint">
            <Bell className="w-12 h-12 animate-bounce" />
          </div>
          <span className="absolute top-0 right-0 w-6 h-6 rounded-full bg-amber-500 border-2 border-paper animate-ping" />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-widest text-teal dark:text-mint">
            Medicine Reminder
          </span>
          <h2 className="text-3xl sm:text-4xl font-serif font-bold text-ink dark:text-paper leading-tight">
            {t('time_for_medicine')}
          </h2>
          <p className="text-lg text-ink/75 dark:text-sand/80">
            Please prepare a glass of water and your medicine.
          </p>
        </div>

        {/* Medicines list cards */}
        <div className="space-y-3 max-h-56 overflow-y-auto">
          {doses.map((dose) => (
            <div
              key={dose.id}
              className="bg-sand/40 dark:bg-ink/50 border border-sand dark:border-teal-800 rounded-2xl p-4 flex items-center justify-between text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal/10 dark:bg-mint/10 text-teal dark:text-mint flex items-center justify-center">
                  <Pill className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-lg font-serif font-bold text-ink dark:text-paper">
                    {dose.medicine_name}
                  </h4>
                  <p className="text-xs text-ink/60 dark:text-sand/60">
                    {dose.dosage} • {dose.with_food ? `${dose.with_food} food` : 'any time'}
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-mint dark:bg-teal-900 text-teal dark:text-mint">
                Due Now
              </span>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="space-y-3 pt-2">
          <Button
            size="patient"
            variant="primary"
            onClick={() => onTakeNow(doses)}
            className="w-full text-xl shadow-lg flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-7 h-7" />
            <span>{t('take_it_now')}</span>
            <ChevronRight className="w-6 h-6" />
          </Button>

          <Button
            size="patient"
            variant="secondary"
            onClick={handleSnooze}
            className="w-full text-lg border-2 border-sand"
          >
            <Clock className="w-6 h-6 mr-2" />
            <span>{t('remind_in_10')}</span>
          </Button>
        </div>
      </motion.div>
    </div>
  );
};
