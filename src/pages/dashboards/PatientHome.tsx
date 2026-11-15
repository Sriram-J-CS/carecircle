import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { patientApi, alertsApi, careApi } from '../../services/api';
import { DoseLog } from '../../types/api';
import { ReminderModal } from '../../components/patient/ReminderModal';
import { PillCameraModal } from '../../components/patient/PillCameraModal';
import { CheckinModal } from '../../components/patient/CheckinModal';
import { DemoToolsDrawer } from '../../components/patient/DemoToolsDrawer';
import { AddMedicineModal } from '../../components/patient/AddMedicineModal';
import { NotificationsModal } from '../../components/patient/NotificationsModal';
import { EmergencyContactsModal } from '../../components/patient/EmergencyContactsModal';
import { VoiceAgentSheet } from '../../components/common/VoiceAgentSheet';
import {
  Pill,
  Clock,
  CheckCircle2,
  AlertCircle,
  Bell,
  Calendar,
  Footprints,
  Phone,
  Heart,
  Smile,
  Plus,
  Play,
  Loader2,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import toast from 'react-hot-toast';

export const PatientHome: React.FC = () => {
  const { user } = useAuth();
  const { speak } = useLanguage();
  const navigate = useNavigate();

  // Data states
  const [doses, setDoses] = useState<DoseLog[]>([]);
  const [loadingDoses, setLoadingDoses] = useState(true);
  const [nextAppointment, setNextAppointment] = useState<any | null>(null);
  const [contacts, setContacts] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [walkedKm, setWalkedKm] = useState<number>(1.2);
  const [walkGoalKm, setWalkGoalKm] = useState<number>(2.0);

  // Active Modals & Flow States
  const [activeReminderDoses, setActiveReminderDoses] = useState<DoseLog[] | null>(null);
  const [cameraDose, setCameraDose] = useState<DoseLog | null>(null);
  const [isCheckinOpen, setIsCheckinOpen] = useState(false);
  const [checkinTrigger, setCheckinTrigger] = useState<'periodic' | 'post_med' | 'manual' | 'voice'>('manual');
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isFamilyCallsOpen, setIsFamilyCallsOpen] = useState(false);
  const [isAddMedicineOpen, setIsAddMedicineOpen] = useState(false);
  const [isDemoDrawerOpen, setIsDemoDrawerOpen] = useState(false);

  // Time greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const currentDateFormatted = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  // Request browser Notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(console.warn);
    }
  }, []);

  // Fetch today's doses, appointments, contacts, and unread notifications
  const loadPatientData = useCallback(async () => {
    if (!user) return;
    try {
      const [dosesData, summaryData, notifs] = await Promise.allSettled([
        patientApi.getDoses(user.id),
        patientApi.getSummary(user.id),
        alertsApi.getNotifications(),
      ]);

      if (dosesData.status === 'fulfilled') {
        setDoses(dosesData.value || []);
      }

      if (summaryData.status === 'fulfilled' && summaryData.value) {
        const s = summaryData.value;
        if (s.emergency_contacts) {
          setContacts(s.emergency_contacts);
        }
        if (s.upcoming_appointments && s.upcoming_appointments.length > 0) {
          setNextAppointment(s.upcoming_appointments[0]);
        }
      }

      if (notifs.status === 'fulfilled' && Array.isArray(notifs.value)) {
        const unread = notifs.value.filter((n: any) => n.read === 0).length;
        setUnreadCount(unread);
      }
    } catch (err) {
      console.warn('Error loading patient data', err);
    } finally {
      setLoadingDoses(false);
    }
  }, [user]);

  // Initial load
  useEffect(() => {
    loadPatientData();
  }, [loadPatientData]);

  // Poll GET /me/reminders every 20 seconds
  useEffect(() => {
    if (!user || user.role !== 'patient') return;

    const pollReminders = async () => {
      try {
        const res = await patientApi.getReminders();
        if (typeof res.unread_notifications === 'number') {
          setUnreadCount(res.unread_notifications);
        }

        // Check if there are due dose slots
        if (res.dose_slots && res.dose_slots.length > 0) {
          const firstSlot = res.dose_slots[0];
          if (firstSlot.doses && firstSlot.doses.length > 0) {
            // Only show modal if pill camera is not already open
            if (!cameraDose) {
              setActiveReminderDoses(firstSlot.doses);
            }
          }
        } else {
          setActiveReminderDoses(null);
        }

        // Check if periodic 6-hourly check-in is due
        if (res.checkin && res.checkin.due && !isCheckinOpen && !cameraDose) {
          setCheckinTrigger('periodic');
          setIsCheckinOpen(true);
        }
      } catch (err) {
        console.warn('Reminders poll error:', err);
      }
    };

    // Run first poll
    pollReminders();

    const interval = setInterval(pollReminders, 20000);
    return () => clearInterval(interval);
  }, [user, cameraDose, isCheckinOpen]);

  // Keyboard shortcut Ctrl+Shift+D for Demo Drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'D' || e.key === 'd')) {
        e.preventDefault();
        setIsDemoDrawerOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Compute Next Tablet
  // Priority:
  // 1. Doses that are due right now (pending with scheduled_for <= now or snoozed)
  // 2. First upcoming pending dose
  // 3. Any missed dose
  const nowIso = new Date().toISOString();
  const dueDoses = doses.filter(
    (d) => d.status === 'pending' || d.status === 'snoozed'
  );
  const nextDose = dueDoses[0] || doses.find((d) => d.status === 'missed');
  const allTaken = doses.length > 0 && doses.every((d) => d.status === 'taken');

  // Trigger snooze on reminder
  const handleSnooze = async (dose: DoseLog) => {
    try {
      await patientApi.snoozeDose(dose.id, 10);
      toast.success('Reminder snoozed for 10 minutes');
      speak('Understood. I will remind you again in 10 minutes.');
      setActiveReminderDoses(null);
      loadPatientData();
    } catch (err: any) {
      toast.error('Could not snooze dose');
    }
  };

  // Open Pill Camera Flow
  const handleOpenPillCamera = (dose: DoseLog) => {
    setActiveReminderDoses(null);
    setCameraDose(dose);
  };

  // Log walking activity
  const handleLogWalk = async () => {
    try {
      const added = 0.5;
      const newTotal = parseFloat((walkedKm + added).toFixed(1));
      setWalkedKm(newTotal);
      await careApi.logActivity({
        kind: 'walking',
        value: added,
        unit: 'km',
      });
      speak(`Great job! You walked ${newTotal} kilometers today.`);
      toast.success(`Logged ${added} km! Total: ${newTotal} km`);
    } catch (err) {
      console.warn(err);
    }
  };

  return (
    <div className="space-y-8 pb-20">
      {/* Top Header: Greeting, Date, Unread Bell */}
      <div className="elder-card p-6 sm:p-8 bg-gradient-to-r from-teal-900 to-teal-850 text-white shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-sm sm:text-base font-bold text-teal-300 uppercase tracking-wider">
            {currentDateFormatted}
          </span>
          <h1 className="text-3xl sm:text-4xl font-black mt-1">
            {getGreeting()}, {user?.name}!
          </h1>
          <p className="text-lg font-bold text-teal-100 mt-1">
            CareCircle is watching over you today.
          </p>
        </div>

        {/* Bell Button with Unread Badge */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsNotificationsOpen(true)}
            aria-label={`View notifications (${unreadCount} unread)`}
            className="relative min-h-[56px] min-w-[56px] p-3 rounded-2xl bg-teal-800 hover:bg-teal-700 text-white flex items-center justify-center transition-colors shadow-md"
          >
            <Bell className="w-7 h-7" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-red-500 text-white font-black text-xs flex items-center justify-center border-2 border-teal-900 animate-bounce">
                {unreadCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* 1. Big "NEXT TABLET" Card */}
      <section aria-labelledby="next-tablet-heading">
        {nextDose ? (
          <div className="elder-card p-6 sm:p-8 border-4 border-teal-600 bg-white shadow-xl">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-100 text-amber-950 font-black text-lg border border-amber-300">
                <Clock className="w-5 h-5 text-amber-700 animate-pulse" />
                <span>NEXT TABLET</span>
              </span>

              {/* Status Chips for Today's List */}
              <div className="flex items-center gap-2 text-sm font-bold">
                <span className="text-warm-700">Today:</span>
                <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">
                  {doses.filter((d) => d.status === 'taken').length} taken
                </span>
                <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                  {doses.filter((d) => d.status === 'pending' || d.status === 'snoozed').length} left
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div>
                <h2 id="next-tablet-heading" className="text-4xl sm:text-5xl font-black text-teal-950">
                  {nextDose.medicine_name}
                </h2>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xl font-bold text-warm-800">
                  <span className="bg-teal-100 text-teal-950 px-3 py-1 rounded-xl">
                    {nextDose.dosage}
                  </span>
                  <span>&middot;</span>
                  <span>
                    Scheduled: {new Date(nextDose.scheduled_for).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span>&middot;</span>
                  <span className="text-teal-850">
                    Take with water
                  </span>
                </div>
              </div>

              {/* Huge Action Button */}
              <button
                type="button"
                onClick={() => handleOpenPillCamera(nextDose)}
                aria-label={`Take ${nextDose.medicine_name} now on camera`}
                className="min-h-[68px] px-8 py-4 rounded-2xl bg-teal-900 hover:bg-teal-850 text-white font-black text-2xl sm:text-3xl shadow-xl flex items-center justify-center gap-3 transition-transform active:scale-98 whitespace-nowrap"
              >
                <span>Take it now</span>
                <ArrowRight className="w-8 h-8" />
              </button>
            </div>
          </div>
        ) : allTaken ? (
          <div className="elder-card p-8 bg-emerald-50 border-4 border-emerald-400 text-center flex flex-col items-center gap-3">
            <div className="w-20 h-20 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg">
              <CheckCircle2 className="w-12 h-12" />
            </div>
            <h2 className="text-3xl font-black text-emerald-950">
              All medicines taken for today!
            </h2>
            <p className="text-xl font-bold text-emerald-800">
              You are staying on track with your health plan. Great job!
            </p>
          </div>
        ) : (
          <div className="elder-card p-6 text-center text-warm-800 font-bold text-xl flex items-center justify-center gap-3">
            <Pill className="w-7 h-7 text-teal-850" />
            <span>No medicine doses scheduled for right now.</span>
          </div>
        )}
      </section>

      {/* 2. "Today's Medicines" Timeline */}
      <section aria-labelledby="timeline-heading" className="elder-card p-6 sm:p-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center text-teal-900">
              <Pill className="w-6 h-6" />
            </div>
            <h2 id="timeline-heading" className="text-2xl sm:text-3xl font-black text-teal-950">
              Today&apos;s Medicines Timeline
            </h2>
          </div>

          <button
            type="button"
            onClick={() => setIsAddMedicineOpen(true)}
            aria-label="Add a new medicine schedule"
            className="min-h-[48px] px-4 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 border-2 border-teal-300 text-teal-950 font-bold text-base flex items-center gap-2"
          >
            <Plus className="w-5 h-5 text-teal-850" />
            <span>Add Medicine</span>
          </button>
        </div>

        {loadingDoses ? (
          <div className="flex items-center justify-center py-10 gap-2 text-teal-900 font-bold text-lg">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span>Loading today&apos;s medicines...</span>
          </div>
        ) : doses.length === 0 ? (
          <div className="text-center py-8 text-warm-700 font-bold text-lg bg-warm-50 rounded-2xl border border-warm-200">
            No medicine schedule set up yet. Tap &ldquo;Add Medicine&rdquo; above to start your daily plan.
          </div>
        ) : (
          <div className="space-y-4">
            {doses.map((d) => {
              const isTaken = d.status === 'taken';
              const isMissed = d.status === 'missed';
              const isDue = d.status === 'pending' || d.status === 'snoozed';
              const timeDisplay = new Date(d.scheduled_for).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={d.id}
                  className={`p-5 rounded-2xl border-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
                    isTaken
                      ? 'bg-emerald-50/60 border-emerald-300 text-emerald-950'
                      : isMissed
                      ? 'bg-red-50 border-red-400 text-red-950'
                      : isDue
                      ? 'bg-white border-teal-500 shadow-md ring-2 ring-teal-200'
                      : 'bg-warm-50 border-warm-200 text-warm-800'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                        isTaken
                          ? 'bg-emerald-600 text-white'
                          : isMissed
                          ? 'bg-red-600 text-white'
                          : 'bg-teal-900 text-white'
                      }`}
                    >
                      {isTaken ? (
                        <CheckCircle2 className="w-7 h-7" />
                      ) : isMissed ? (
                        <AlertCircle className="w-7 h-7" />
                      ) : (
                        <Clock className="w-7 h-7 animate-pulse" />
                      )}
                    </div>

                    <div>
                      <div className="text-2xl font-black text-teal-950">
                        {d.medicine_name}
                      </div>
                      <div className="text-base font-semibold text-warm-800 mt-0.5">
                        {d.dosage} &middot; Scheduled at {timeDisplay}
                      </div>
                    </div>
                  </div>

                  {/* Status & Action */}
                  <div className="flex items-center gap-3">
                    {isTaken && (
                      <span className="font-bold text-emerald-800 text-lg flex items-center gap-1.5 bg-emerald-100 px-4 py-2 rounded-xl">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        <span>Taken</span>
                      </span>
                    )}

                    {isMissed && (
                      <div className="flex items-center gap-3">
                        <span className="font-black text-red-700 bg-red-100 px-3 py-1 rounded-xl text-base">
                          Missed
                        </span>
                        <button
                          type="button"
                          onClick={() => handleOpenPillCamera(d)}
                          className="min-h-[48px] px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-base transition-colors"
                        >
                          Take Late
                        </button>
                      </div>
                    )}

                    {isDue && (
                      <button
                        type="button"
                        onClick={() => handleOpenPillCamera(d)}
                        className="min-h-[50px] px-6 py-2.5 rounded-xl bg-teal-900 hover:bg-teal-850 text-white font-black text-lg shadow-md transition-transform active:scale-95"
                      >
                        Take now
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 3. Four Core Action Cards */}
      <section aria-labelledby="quick-actions-heading" className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <h2 id="quick-actions-heading" className="sr-only">
          Quick Health Actions
        </h2>

        {/* Card A: How do you feel? */}
        <button
          type="button"
          onClick={() => {
            setCheckinTrigger('manual');
            setIsCheckinOpen(true);
          }}
          aria-label="Start health check-in: How do you feel?"
          className="elder-card-interactive p-6 text-left flex items-start gap-4"
        >
          <div className="w-14 h-14 rounded-2xl bg-teal-100 text-teal-900 flex items-center justify-center flex-shrink-0">
            <Heart className="w-8 h-8 text-teal-850 fill-teal-100" />
          </div>
          <div>
            <h3 className="text-2xl font-black text-teal-950 mb-1">
              How do you feel?
            </h3>
            <p className="text-base font-semibold text-warm-800">
              Tell CareCircle if you have pain, fever, or feel unwell.
            </p>
          </div>
        </button>

        {/* Card B: Appointments */}
        <button
          type="button"
          onClick={() => navigate('/appointments')}
          aria-label="View scheduled appointments and book a visit"
          className="elder-card-interactive p-6 text-left flex items-start gap-4"
        >
          <div className="w-14 h-14 rounded-2xl bg-teal-100 text-teal-900 flex items-center justify-center flex-shrink-0">
            <Calendar className="w-8 h-8 text-teal-850" />
          </div>
          <div className="flex-1">
            <h3 className="text-2xl font-black text-teal-950 mb-1">
              Appointments
            </h3>
            {nextAppointment ? (
              <div className="text-base font-semibold text-warm-800">
                <span className="font-bold text-teal-950">{nextAppointment.title}</span>
                <div>
                  {new Date(nextAppointment.scheduled_at).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
                {nextAppointment.doctor_name && <div>With: {nextAppointment.doctor_name}</div>}
              </div>
            ) : (
              <p className="text-base font-semibold text-warm-700">
                Tap to schedule or view appointments.
              </p>
            )}
          </div>
        </button>

        {/* Card C: Today's walk */}
        <div className="elder-card p-6 flex flex-col justify-between gap-4">
          <div
            onClick={() => navigate('/me/lifestyle')}
            className="flex items-start gap-4 cursor-pointer group"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') navigate('/me/lifestyle');
            }}
            aria-label="View daily wellness and walking plan"
          >
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-900 flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-200 transition-colors">
              <Footprints className="w-8 h-8 text-emerald-850" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-teal-950 mb-1 group-hover:text-teal-800 transition-colors">
                Today&apos;s Walk
              </h3>
              <p className="text-base font-semibold text-warm-800">
                Goal: {walkGoalKm} km &middot; Walked: <strong>{walkedKm} km</strong>
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleLogWalk}
              aria-label="Log walking activity (+0.5 km)"
              className="flex-1 min-h-[50px] py-2.5 px-4 rounded-xl bg-teal-900 hover:bg-teal-850 text-white font-bold text-base flex items-center justify-center gap-2 shadow-sm touch-target"
            >
              <span>+ Log 0.5 km</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/me/lifestyle')}
              aria-label="View full lifestyle plan"
              className="px-4 py-2.5 rounded-xl border-2 border-teal-700 bg-white hover:bg-warm-100 text-teal-950 font-bold text-base touch-target"
            >
              Plan
            </button>
          </div>
        </div>

        {/* Card D: Call my family */}
        <button
          type="button"
          onClick={() => setIsFamilyCallsOpen(true)}
          aria-label="Open family contact list to make a call"
          className="elder-card-interactive p-6 text-left flex items-start gap-4"
        >
          <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-900 flex items-center justify-center flex-shrink-0">
            <Phone className="w-8 h-8 text-rose-700 fill-rose-100" />
          </div>
          <div>
            <h3 className="text-2xl font-black text-teal-950 mb-1">
              Call My Family
            </h3>
            <p className="text-base font-semibold text-warm-800">
              One-tap call to son, daughter, or your emergency contacts.
            </p>
          </div>
        </button>
      </section>

      {/* Floating Microphone Voice Assistant */}
      <VoiceAgentSheet
        onOpenPillCamera={(doseId) => {
          const target = doses.find((d) => d.id === doseId) || nextDose;
          if (target) handleOpenPillCamera(target);
        }}
        onOpenCheckin={() => {
          setCheckinTrigger('manual');
          setIsCheckinOpen(true);
        }}
        onOpenEmergency={() => {
          window.dispatchEvent(new CustomEvent('carecircle-open-emergency'));
        }}
      />

      {/* Floating Demo Drawer Toggle Badge */}
      <button
        type="button"
        onClick={() => setIsDemoDrawerOpen(true)}
        aria-label="Open stage demo tools"
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 px-4 py-2 rounded-full bg-teal-950/80 hover:bg-teal-950 text-teal-200 text-xs font-mono font-bold shadow-lg border border-teal-500 backdrop-blur-sm transition-all"
      >
        Demo Tools (Ctrl+Shift+D)
      </button>

      {/* ================= MODALS & FLOWS ================= */}

      {/* 1. Full-screen Reminder Modal */}
      {activeReminderDoses && activeReminderDoses.length > 0 && !cameraDose && (
        <ReminderModal
          doses={activeReminderDoses}
          onTakeNow={(dose) => handleOpenPillCamera(dose)}
          onSnooze={(dose) => handleSnooze(dose)}
        />
      )}

      {/* 2. Pill Camera Confirmation Flow Modal */}
      {cameraDose && (
        <PillCameraModal
          initialDose={cameraDose}
          totalInSlot={doses.filter((d) => d.scheduled_for === cameraDose.scheduled_for).length || 1}
          currentStepIndex={1}
          onComplete={(checkinRequired) => {
            setCameraDose(null);
            loadPatientData();
            if (checkinRequired) {
              setCheckinTrigger('post_med');
              setIsCheckinOpen(true);
            }
          }}
          onClose={() => {
            setCameraDose(null);
            loadPatientData();
          }}
        />
      )}

      {/* 3. Check-in Flow Modal */}
      <CheckinModal
        isOpen={isCheckinOpen}
        onClose={() => setIsCheckinOpen(false)}
        trigger={checkinTrigger}
        onCheckinSubmitted={() => loadPatientData()}
      />

      {/* 4. Notifications Modal */}
      <NotificationsModal
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        onRefreshUnread={() => loadPatientData()}
      />

      {/* 5. Emergency Family Calls Modal */}
      <EmergencyContactsModal
        contacts={contacts}
        isOpen={isFamilyCallsOpen}
        onClose={() => setIsFamilyCallsOpen(false)}
      />

      {/* 6. Add Medicine Schedule Modal */}
      {user && (
        <AddMedicineModal
          patientId={user.id}
          isOpen={isAddMedicineOpen}
          onClose={() => setIsAddMedicineOpen(false)}
          onSuccess={() => loadPatientData()}
        />
      )}

      {/* 7. Demo Tools Drawer */}
      {user && (
        <DemoToolsDrawer
          patientId={user.id}
          isOpen={isDemoDrawerOpen}
          onClose={() => setIsDemoDrawerOpen(false)}
          onOpenAddMedicine={() => setIsAddMedicineOpen(true)}
          onTestDoseTriggered={() => loadPatientData()}
        />
      )}
    </div>
  );
};
