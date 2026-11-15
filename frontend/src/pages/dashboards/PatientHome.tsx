import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Pill,
  Heart,
  Calendar,
  Footprints,
  PhoneCall,
  CheckCircle2,
  Clock,
  AlertCircle,
  Sparkles,
  Mic,
  ChevronRight,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ReminderModal } from '../../components/patient/ReminderModal';
import { PillCameraModal } from '../../components/patient/PillCameraModal';
import { CheckinModal } from '../../components/patient/CheckinModal';
import { DemoToolsDrawer } from '../../components/patient/DemoToolsDrawer';
import { SOSButton } from '../../components/common/SOSButton';
import { VoiceAgentSheet } from '../../components/common/VoiceAgentSheet';
import { EmergencyScreen } from '../../components/patient/EmergencyScreen';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { api } from '../../services/api';
import { Dose, ReminderResponse, LifestylePlan, Appointment } from '../../types/api';

export const PatientHome: React.FC = () => {
  const { user } = useAuth();
  const { language, t } = useLanguage();
  const navigate = useNavigate();

  // Data states
  const [doses, setDoses] = useState<Dose[]>([]);
  const [reminders, setReminders] = useState<ReminderResponse | null>(null);
  const [lifestyle, setLifestyle] = useState<LifestylePlan | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals & Overlays
  const [activeReminderDoses, setActiveReminderDoses] = useState<Dose[]>([]);
  const [pillCameraDoses, setPillCameraDoses] = useState<Dose[] | null>(null);
  const [checkinOpen, setCheckinOpen] = useState(false);
  const [checkinTrigger, setCheckinTrigger] = useState<'periodic' | 'post_med' | 'manual' | 'voice'>('manual');
  const [voiceSheetOpen, setVoiceSheetOpen] = useState(false);
  const [emergencyOpen, setEmergencyOpen] = useState(false);

  // Refresh home data
  const fetchData = useCallback(async () => {
    try {
      const [dosesRes, remRes, lifeRes, apptRes] = await Promise.all([
        api.getPatientDoses('me').catch(() => []),
        api.getReminders().catch(() => null),
        api.getPatientLifestyle('me').catch(() => null),
        api.getPatientAppointments('me').catch(() => []),
      ]);

      setDoses(dosesRes);
      setReminders(remRes);
      setLifestyle(lifeRes);
      setAppointments(apptRes);

      // Check if reminders has due dose slots
      if (remRes?.dose_slots && remRes.dose_slots.length > 0) {
        // Collect all due doses
        const allDue = remRes.dose_slots.flatMap((s) => s.doses);
        // Only trigger modal if not already open
        if (!pillCameraDoses && activeReminderDoses.length === 0) {
          setActiveReminderDoses(allDue);
        }
      }

      // Check if periodic checkin is due
      if (remRes?.checkin?.due && !pillCameraDoses && activeReminderDoses.length === 0) {
        setCheckinTrigger('periodic');
        setCheckinOpen(true);
      }
    } catch {
      // non-fatal
    } finally {
      setIsLoading(false);
    }
  }, [activeReminderDoses.length, pillCameraDoses]);

  useEffect(() => {
    fetchData();
    // Poll every 20 seconds for reminders
    const interval = setInterval(fetchData, 20000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Request notification permission once
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  // Compute greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('good_morning');
    if (hour < 17) return t('good_afternoon');
    return t('good_evening');
  };

  const currentDateFormatted = new Intl.DateTimeFormat(language === 'ta' ? 'ta-IN' : language === 'hi' ? 'hi-IN' : 'en-IN', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(new Date());

  // Next upcoming or due dose
  const nextDose = doses.find((d) => d.status === 'pending' || d.is_due_now) || doses[0];

  const handleLaunchPillCamera = (dosesToTake: Dose[]) => {
    setActiveReminderDoses([]);
    setPillCameraDoses(dosesToTake);
  };

  const handlePillCameraComplete = () => {
    setPillCameraDoses(null);
    fetchData();
    // Prompt 2 & 3: Once last tablet in slot is confirmed, open check-in with trigger 'post_med'
    setCheckinTrigger('post_med');
    setCheckinOpen(true);
  };

  return (
    <div className="min-h-screen bg-sand/20 dark:bg-ink pb-24 text-ink dark:text-paper">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-8">
        {/* Elder Greeting Banner */}
        <section className="space-y-1">
          <p className="text-base sm:text-lg font-medium text-teal dark:text-mint">
            {currentDateFormatted}
          </p>
          <h1 className="text-3xl sm:text-5xl font-serif font-bold text-ink dark:text-paper tracking-tight">
            {getGreeting()}, {user?.name?.split(' ')[0] || 'Friend'}
          </h1>
          <p className="text-lg text-ink/70 dark:text-sand/70">
            Everything is calm and your family is watching over you today.
          </p>
        </section>

        {/* 1. BIG "NEXT TABLET" CARD */}
        {nextDose && (
          <section>
            <div className="bg-paper dark:bg-teal-950 border-4 border-teal rounded-3xl p-6 sm:p-8 shadow-soft relative overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-mint dark:bg-teal-900 text-teal dark:text-mint text-sm font-bold uppercase tracking-wider">
                  <Pill className="w-4 h-4" />
                  {t('next_tablet')}
                </span>

                <span className="text-lg font-serif font-bold text-teal dark:text-mint tabular-nums">
                  Scheduled for {nextDose.scheduled_time}
                </span>
              </div>

              <div className="space-y-2 mb-6">
                <h2 className="text-3xl sm:text-4xl font-serif font-bold text-ink dark:text-paper">
                  {nextDose.medicine_name}
                </h2>
                <p className="text-xl text-ink/80 dark:text-sand/80 font-medium">
                  {nextDose.dosage} •{' '}
                  <span className="text-teal dark:text-mint">
                    {nextDose.with_food ? `${nextDose.with_food} food` : 'any time'}
                  </span>
                </p>
              </div>

              <Button
                size="patient"
                variant="primary"
                onClick={() => handleLaunchPillCamera([nextDose])}
                className="w-full text-2xl py-6 shadow-md flex items-center justify-center gap-3"
              >
                <CheckCircle2 className="w-8 h-8" />
                <span>{t('take_it_now')}</span>
                <ChevronRight className="w-7 h-7" />
              </Button>
            </div>
          </section>
        )}

        {/* 2. TODAY'S MEDICINES TIMELINE */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-ink dark:text-paper">
              {t('todays_medicines')}
            </h2>
            <button
              onClick={fetchData}
              className="p-2 rounded-full text-ink/60 hover:bg-sand/60 transition-colors"
              aria-label="Refresh medicine schedule"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {doses.length === 0 ? (
              <div className="col-span-2 p-8 bg-paper dark:bg-teal-950/40 rounded-3xl border border-sand dark:border-teal-800 text-center text-ink/60">
                No medicines scheduled for today.
              </div>
            ) : (
              doses.map((dose) => {
                const isTaken = dose.status === 'taken';
                const isMissed = dose.status === 'missed';
                const isDue = dose.status === 'pending' || dose.is_due_now;

                return (
                  <div
                    key={dose.id}
                    className={`p-5 rounded-3xl border-2 transition-all flex items-center justify-between ${
                      isTaken
                        ? 'bg-sage/10 dark:bg-sage/20 border-sage/40'
                        : isMissed
                        ? 'bg-clay/10 border-clay/40'
                        : isDue
                        ? 'bg-paper dark:bg-teal-950 border-teal shadow-sm'
                        : 'bg-sand/30 dark:bg-ink/40 border-sand dark:border-teal-800'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold font-mono px-2 py-0.5 rounded-full bg-sand/60 dark:bg-ink/60">
                          {dose.scheduled_time}
                        </span>
                        {dose.with_food && (
                          <span className="text-xs font-medium text-ink/60 dark:text-sand/60">
                            ({dose.with_food} food)
                          </span>
                        )}
                      </div>
                      <h4 className="text-xl font-serif font-bold text-ink dark:text-paper">
                        {dose.medicine_name}
                      </h4>
                      <p className="text-sm text-ink/70 dark:text-sand/70">{dose.dosage}</p>
                    </div>

                    <div>
                      {isTaken ? (
                        <div className="flex flex-col items-center text-sage">
                          <CheckCircle2 className="w-8 h-8" />
                          <span className="text-xs font-bold mt-1">Taken</span>
                        </div>
                      ) : isMissed ? (
                        <div className="flex flex-col items-center text-clay">
                          <AlertCircle className="w-8 h-8" />
                          <span className="text-xs font-bold mt-1">Missed</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleLaunchPillCamera([dose])}
                          className="px-4 py-2.5 rounded-2xl bg-teal hover:bg-teal-700 text-white text-sm font-bold shadow-sm"
                        >
                          Take Now
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* 3. FOUR LARGE TOUCH CARDS */}
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* How do you feel? */}
          <button
            onClick={() => {
              setCheckinTrigger('manual');
              setCheckinOpen(true);
            }}
            className="p-6 rounded-3xl bg-paper dark:bg-teal-950 border-2 border-sand dark:border-teal-800 hover:border-teal text-left shadow-soft transition-all hover:scale-[1.02] flex items-center justify-between group"
          >
            <div className="space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-mint dark:bg-teal-900 text-teal dark:text-mint flex items-center justify-center">
                <Heart className="w-7 h-7" />
              </div>
              <h3 className="text-2xl font-serif font-bold text-ink dark:text-paper">
                {t('how_do_you_feel')}
              </h3>
              <p className="text-sm text-ink/70 dark:text-sand/70">
                Quick 1-minute health check-in
              </p>
            </div>
            <ChevronRight className="w-7 h-7 text-ink/40 group-hover:text-teal transition-colors" />
          </button>

          {/* Appointments */}
          <button
            onClick={() => navigate('/me/appointments')}
            className="p-6 rounded-3xl bg-paper dark:bg-teal-950 border-2 border-sand dark:border-teal-800 hover:border-teal text-left shadow-soft transition-all hover:scale-[1.02] flex items-center justify-between group"
          >
            <div className="space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-mint dark:bg-teal-900 text-teal dark:text-mint flex items-center justify-center">
                <Calendar className="w-7 h-7" />
              </div>
              <h3 className="text-2xl font-serif font-bold text-ink dark:text-paper">
                {t('appointments')}
              </h3>
              <p className="text-sm text-ink/70 dark:text-sand/70">
                {appointments[0] ? `Next: ${appointments[0].title}` : 'View your doctor schedule'}
              </p>
            </div>
            <ChevronRight className="w-7 h-7 text-ink/40 group-hover:text-teal transition-colors" />
          </button>

          {/* Today's Walk */}
          <button
            onClick={() => navigate('/me/lifestyle')}
            className="p-6 rounded-3xl bg-paper dark:bg-teal-950 border-2 border-sand dark:border-teal-800 hover:border-teal text-left shadow-soft transition-all hover:scale-[1.02] flex items-center justify-between group"
          >
            <div className="space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-mint dark:bg-teal-900 text-teal dark:text-mint flex items-center justify-center">
                <Footprints className="w-7 h-7" />
              </div>
              <h3 className="text-2xl font-serif font-bold text-ink dark:text-paper">
                {t('todays_walk')}
              </h3>
              <p className="text-sm text-ink/70 dark:text-sand/70">
                {lifestyle
                  ? `${lifestyle.walking.walked_today_km} km of ${lifestyle.walking.daily_goal_km} km goal`
                  : 'Track your daily stroll'}
              </p>
            </div>
            <ChevronRight className="w-7 h-7 text-ink/40 group-hover:text-teal transition-colors" />
          </button>

          {/* Call My Family */}
          <button
            onClick={() => navigate('/me/people')}
            className="p-6 rounded-3xl bg-paper dark:bg-teal-950 border-2 border-sand dark:border-teal-800 hover:border-teal text-left shadow-soft transition-all hover:scale-[1.02] flex items-center justify-between group"
          >
            <div className="space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-mint dark:bg-teal-900 text-teal dark:text-mint flex items-center justify-center">
                <PhoneCall className="w-7 h-7" />
              </div>
              <h3 className="text-2xl font-serif font-bold text-ink dark:text-paper">
                {t('call_family')}
              </h3>
              <p className="text-sm text-ink/70 dark:text-sand/70">
                Direct phone link to your loved ones
              </p>
            </div>
            <ChevronRight className="w-7 h-7 text-ink/40 group-hover:text-teal transition-colors" />
          </button>
        </section>
      </main>

      {/* FLOATING MICROPHONE BUTTON (Prompt 3 Voice Agent) */}
      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setVoiceSheetOpen(true)}
        className="fixed bottom-6 left-6 z-40 bg-teal hover:bg-teal-700 text-white p-4 sm:px-6 sm:py-4 rounded-full shadow-2xl flex items-center gap-3 border-2 border-white/20 focus:outline-none focus:ring-4 focus:ring-teal/50"
        aria-label="Open Voice Health Companion"
      >
        <Mic className="w-7 h-7" />
        <span className="hidden sm:inline font-serif font-bold text-lg">Talk to CareCircle</span>
      </motion.button>

      {/* PINNED RED SOS BUTTON */}
      <SOSButton onEmergencyTriggered={() => setEmergencyOpen(true)} />

      {/* DEV DEMO TOOLS DRAWER (Ctrl+Shift+D) */}
      <DemoToolsDrawer onDoseTriggered={fetchData} />

      {/* MEDICINE REMINDER MODAL */}
      {activeReminderDoses.length > 0 && (
        <ReminderModal
          doses={activeReminderDoses}
          onTakeNow={(d) => handleLaunchPillCamera(d)}
          onDismiss={() => setActiveReminderDoses([])}
        />
      )}

      {/* PILL CAMERA MODAL (One tablet at a time) */}
      {pillCameraDoses && (
        <PillCameraModal
          doses={pillCameraDoses}
          onComplete={handlePillCameraComplete}
          onClose={() => setPillCameraDoses(null)}
        />
      )}

      {/* HEALTH CHECK-IN MODAL */}
      <CheckinModal
        isOpen={checkinOpen}
        onClose={() => setCheckinOpen(false)}
        trigger={checkinTrigger}
      />

      {/* VOICE COMPANION SHEET */}
      <VoiceAgentSheet
        isOpen={voiceSheetOpen}
        onClose={() => setVoiceSheetOpen(false)}
        onOpenCheckin={() => {
          setCheckinTrigger('voice');
          setCheckinOpen(true);
        }}
        onTriggerSOS={() => setEmergencyOpen(true)}
      />

      {/* FULL-SCREEN EMERGENCY OVERLAY */}
      {emergencyOpen && (
        <EmergencyScreen onDismiss={() => setEmergencyOpen(false)} />
      )}
    </div>
  );
};
