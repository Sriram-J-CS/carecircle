import React, { useEffect, useRef } from 'react';
import { Pill, Clock, Bell, AlertCircle, ArrowRight } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { playChime } from '../../utils/audio';
import { DoseLog } from '../../types/api';

interface ReminderModalProps {
  doses: DoseLog[];
  onTakeNow: (dose: DoseLog) => void;
  onSnooze: (dose: DoseLog) => void;
}

export const ReminderModal: React.FC<ReminderModalProps> = ({ doses, onTakeNow, onSnooze }) => {
  const { speak } = useLanguage();
  const firstDose = doses[0];
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!firstDose) return;

    // 1. Play soft chime
    playChime();

    // 2. Announce aloud
    const promptText = `Time for your medicine: ${firstDose.medicine_name}, ${firstDose.dosage}`;
    speak(promptText);

    // 3. Fire browser Notification if granted
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification('CareCircle Medicine Reminder', {
          body: `Time for ${firstDose.medicine_name} (${firstDose.dosage})`,
          icon: '/carecircle-logo.svg',
          tag: `dose-${firstDose.id}`,
        });
      } catch (e) {
        console.warn('Browser notification error', e);
      }
    }

    // 4. Repeat voice prompt every 2 minutes until handled
    timerRef.current = window.setInterval(() => {
      speak(promptText);
    }, 120000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [firstDose?.id]);

  if (!firstDose) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="reminder-title"
      className="fixed inset-0 z-50 bg-teal-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300"
    >
      <div className="bg-white rounded-3xl border-4 border-teal-500 shadow-2xl max-w-xl w-full p-6 sm:p-10 text-center flex flex-col items-center gap-6">
        {/* Pulsing Pill Icon */}
        <div className="w-24 h-24 rounded-full bg-teal-100 border-4 border-teal-700 text-teal-900 flex items-center justify-center shadow-lg animate-pulse">
          <Pill className="w-14 h-14 text-teal-850" />
        </div>

        <div>
          <span className="inline-block px-4 py-1.5 rounded-full bg-amber-100 text-amber-950 font-black text-sm uppercase tracking-wider mb-2 border border-amber-300">
            Due Now
          </span>
          <h2 id="reminder-title" className="text-3xl sm:text-4xl font-black text-teal-950">
            Time for your medicine
          </h2>
          <p className="text-lg font-bold text-warm-700 mt-1">
            Please take this now with a glass of water
          </p>
        </div>

        {/* Current Tablet Box */}
        <div className="w-full bg-warm-50 rounded-2xl border-3 border-teal-200 p-6 text-left">
          <div className="flex items-center justify-between">
            <span className="text-3xl font-black text-teal-950">
              {firstDose.medicine_name}
            </span>
            <span className="text-xl font-bold bg-teal-100 text-teal-900 px-3 py-1 rounded-xl">
              {firstDose.dosage}
            </span>
          </div>

          {doses.length > 1 && (
            <div className="mt-4 pt-3 border-t-2 border-warm-200 text-base font-bold text-warm-800">
              +{doses.length - 1} more medicine{doses.length > 2 ? 's' : ''} in this session
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-4 w-full">
          <button
            type="button"
            onClick={() => onTakeNow(firstDose)}
            aria-label={`Take ${firstDose.medicine_name} now with camera confirmation`}
            className="w-full min-h-[68px] py-4 px-6 rounded-2xl bg-teal-900 hover:bg-teal-850 text-white font-black text-2xl shadow-xl flex items-center justify-center gap-3 transition-transform active:scale-98"
          >
            <span>Take it now</span>
            <ArrowRight className="w-7 h-7" />
          </button>

          <button
            type="button"
            onClick={() => onSnooze(firstDose)}
            aria-label="Remind me again in 10 minutes"
            className="w-full min-h-[58px] py-3.5 px-6 rounded-2xl bg-warm-100 hover:bg-warm-200 text-warm-900 font-bold text-xl border-2 border-warm-300 flex items-center justify-center gap-2 transition-colors"
          >
            <Clock className="w-6 h-6 text-warm-700" />
            <span>Remind me in 10 minutes</span>
          </button>
        </div>
      </div>
    </div>
  );
};
