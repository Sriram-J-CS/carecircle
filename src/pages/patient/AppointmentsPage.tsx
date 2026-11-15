import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { careApi } from '../../services/api';
import {
  Calendar,
  Clock,
  MapPin,
  User,
  Plus,
  Trash2,
  Bell,
  AlertCircle,
  Loader2,
  CheckCircle2,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';

export const AppointmentsPage: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();

  const [appointments, setAppointments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Form states
  const [title, setTitle] = useState('Routine Health Check-Up');
  const [doctorName, setDoctorName] = useState('');
  const [hospital, setHospital] = useState('');
  const [scheduledAt, setScheduledAt] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    d.setHours(10, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [notes, setNotes] = useState('');

  const loadAppointments = useCallback(async () => {
    if (!user) return;
    try {
      setIsLoading(true);
      const res = await careApi.getAppointments(user.id);
      setAppointments(res);
    } catch (err: any) {
      toast.error('Failed to load appointments: ' + (err.message || 'Error'));
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  const handleAddAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!title.trim() || !scheduledAt) {
      toast.error('Please enter appointment title and scheduled time.');
      return;
    }

    try {
      setIsSubmitting(true);
      await careApi.createAppointment(user.id, {
        title: title.trim(),
        doctor_name: doctorName.trim() || null,
        hospital: hospital.trim() || null,
        scheduled_at: new Date(scheduledAt).toISOString(),
        notes: notes.trim() || null,
      });

      toast.success('Appointment scheduled! Reminders set for 24h & 1h prior.');
      setIsAddOpen(false);
      // Reset form
      setTitle('Routine Health Check-Up');
      setDoctorName('');
      setHospital('');
      setNotes('');
      loadAppointments();
    } catch (err: any) {
      toast.error(err.message || 'Failed to book appointment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelAppointment = async (id: number, apptTitle: string) => {
    if (!user) return;
    try {
      setDeletingId(id);
      await careApi.deleteAppointment(user.id, id);
      toast.success(`Cancelled: ${apptTitle}`);
      loadAppointments();
    } catch (err: any) {
      toast.error(err.message || 'Could not cancel appointment');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-8 pb-20 max-w-5xl mx-auto">
      {/* Header */}
      <div className="elder-card p-6 sm:p-8 bg-gradient-to-r from-teal-900 to-teal-850 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
        <div>
          <span className="text-xs sm:text-sm font-black uppercase tracking-widest text-teal-300">
            CareCircle Health Schedule
          </span>
          <h1 className="text-3xl sm:text-5xl font-black mt-1">
            {t('appointments')}
          </h1>
          <p className="text-lg font-bold text-teal-100 mt-1">
            Doctor visits, hospital consultations, and lab check-ups.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAddOpen(true)}
          className="min-h-[56px] px-6 py-3 rounded-2xl bg-teal-800 hover:bg-teal-700 text-white font-black text-lg flex items-center justify-center gap-2 border-2 border-teal-500 shadow-md touch-target transition-all"
        >
          <Plus className="w-6 h-6 text-teal-200" />
          <span>{t('bookAppointment')}</span>
        </button>
      </div>

      {/* Reminder Notice Banner */}
      <div
        role="status"
        className="p-4 sm:p-5 rounded-2xl bg-teal-50 border-2 border-teal-600 text-teal-950 flex items-center gap-3.5 shadow-sm"
      >
        <div className="w-10 h-10 rounded-xl bg-teal-200/80 flex items-center justify-center shrink-0 text-teal-950">
          <Bell className="w-6 h-6" />
        </div>
        <div>
          <p className="font-black text-lg text-teal-950 leading-tight">
            Automated Voice &amp; Notification Reminders
          </p>
          <p className="text-xs sm:text-sm font-semibold text-teal-850 mt-0.5">
            CareCircle rings a chime and notifies you 24 hours and 1 hour before every scheduled visit.
          </p>
        </div>
      </div>

      {/* Appointments List */}
      <section aria-labelledby="appointments-list-heading">
        <h2 id="appointments-list-heading" className="sr-only">
          Scheduled Appointments
        </h2>

        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-4 text-warm-800">
            <Loader2 className="w-12 h-12 animate-spin text-teal-800" />
            <p className="text-2xl font-black">{t('loading')}</p>
          </div>
        ) : appointments.length === 0 ? (
          <div className="elder-card p-12 text-center text-warm-700">
            <Calendar className="w-16 h-16 mx-auto mb-4 text-warm-400" />
            <h3 className="text-2xl sm:text-3xl font-black text-teal-950">
              No Upcoming Appointments
            </h3>
            <p className="text-base sm:text-lg font-bold text-warm-700 mt-2 max-w-md mx-auto">
              You do not have any scheduled doctor or hospital visits. Tap "{t('bookAppointment')}" to add one.
            </p>
            <button
              type="button"
              onClick={() => setIsAddOpen(true)}
              className="mt-6 px-6 py-3 rounded-2xl bg-teal-850 hover:bg-teal-900 text-white font-black text-lg inline-flex items-center gap-2 shadow-md touch-target"
            >
              <Plus className="w-5 h-5" />
              {t('bookAppointment')}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {appointments.map((appt) => {
              const dt = new Date(appt.scheduled_at);
              const isDeleting = deletingId === appt.id;

              return (
                <div
                  key={appt.id}
                  className="elder-card p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6"
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="px-3 py-1 rounded-full bg-teal-100 text-teal-950 font-black text-xs uppercase tracking-wider">
                        Confirmed Visit
                      </span>
                    </div>

                    <h3 className="text-2xl sm:text-3xl font-black text-teal-950">
                      {appt.title}
                    </h3>

                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-base font-bold text-warm-800 pt-1">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-teal-800" />
                        <span>
                          {dt.toLocaleDateString('en-IN', {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Clock className="w-5 h-5 text-teal-800" />
                        <span>
                          {dt.toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      {appt.doctor_name && (
                        <div className="flex items-center gap-2">
                          <User className="w-5 h-5 text-teal-850" />
                          <span>{appt.doctor_name}</span>
                        </div>
                      )}

                      {appt.hospital && (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-5 h-5 text-teal-850" />
                          <span>{appt.hospital}</span>
                        </div>
                      )}
                    </div>

                    {appt.notes && (
                      <p className="text-sm font-semibold text-warm-700 bg-warm-50 p-3 rounded-xl border border-warm-200 mt-2">
                        <span className="font-bold text-warm-900">Notes: </span>
                        {appt.notes}
                      </p>
                    )}
                  </div>

                  <div className="flex sm:flex-col items-center justify-end gap-2 shrink-0">
                    <button
                      type="button"
                      disabled={isDeleting}
                      onClick={() => handleCancelAppointment(appt.id, appt.title)}
                      aria-label={`Cancel appointment ${appt.title}`}
                      className="w-full sm:w-auto px-4 py-2.5 rounded-xl border-2 border-red-300 bg-red-50 hover:bg-red-100 text-red-700 font-black text-sm flex items-center justify-center gap-2 transition-colors touch-target disabled:opacity-60"
                    >
                      {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      <span>{t('cancel')}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Add Appointment Modal */}
      {isAddOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-appt-modal-title"
          className="fixed inset-0 z-50 bg-teal-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in"
        >
          <div className="bg-white rounded-3xl border-4 border-teal-700 shadow-2xl max-w-lg w-full p-6 sm:p-8 relative my-auto">
            <button
              type="button"
              onClick={() => setIsAddOpen(false)}
              aria-label="Close dialog"
              className="absolute top-5 right-5 p-2 rounded-xl text-warm-700 hover:bg-warm-100 touch-target"
            >
              <X className="w-7 h-7" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-teal-100 flex items-center justify-center text-teal-900">
                <Calendar className="w-7 h-7 text-teal-850" />
              </div>
              <div>
                <h2 id="add-appt-modal-title" className="text-2xl sm:text-3xl font-black text-teal-950">
                  {t('bookAppointment')}
                </h2>
                <p className="text-sm font-bold text-warm-700">
                  Add a hospital visit or clinic consultation
                </p>
              </div>
            </div>

            <form onSubmit={handleAddAppointment} className="space-y-4">
              <div>
                <label htmlFor="appt-title-input" className="block text-lg font-black text-teal-950 mb-1">
                  Appointment Title *
                </label>
                <input
                  id="appt-title-input"
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Cardiologist Follow-up, Eye Check"
                  className="w-full text-lg font-bold px-4 py-3 rounded-xl border-2 border-warm-300 focus:border-teal-700 outline-none"
                />
              </div>

              <div>
                <label htmlFor="appt-doctor-input" className="block text-lg font-black text-teal-950 mb-1">
                  Doctor Name (Optional)
                </label>
                <input
                  id="appt-doctor-input"
                  type="text"
                  value={doctorName}
                  onChange={(e) => setDoctorName(e.target.value)}
                  placeholder="e.g. Dr. Ananya Rao"
                  className="w-full text-lg font-bold px-4 py-3 rounded-xl border-2 border-warm-300 focus:border-teal-700 outline-none"
                />
              </div>

              <div>
                <label htmlFor="appt-hospital-input" className="block text-lg font-black text-teal-950 mb-1">
                  Hospital / Clinic (Optional)
                </label>
                <input
                  id="appt-hospital-input"
                  type="text"
                  value={hospital}
                  onChange={(e) => setHospital(e.target.value)}
                  placeholder="e.g. Apollo Hospital, Primary Health Centre"
                  className="w-full text-lg font-bold px-4 py-3 rounded-xl border-2 border-warm-300 focus:border-teal-700 outline-none"
                />
              </div>

              <div>
                <label htmlFor="appt-date-input" className="block text-lg font-black text-teal-950 mb-1">
                  Date &amp; Time *
                </label>
                <input
                  id="appt-date-input"
                  type="datetime-local"
                  required
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="w-full text-lg font-bold px-4 py-3 rounded-xl border-2 border-warm-300 focus:border-teal-700 outline-none"
                />
              </div>

              <div>
                <label htmlFor="appt-notes-input" className="block text-lg font-black text-teal-950 mb-1">
                  Special Instructions / Notes
                </label>
                <textarea
                  id="appt-notes-input"
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Fast for 8 hours before blood test"
                  className="w-full text-base font-semibold px-4 py-2.5 rounded-xl border-2 border-warm-300 focus:border-teal-700 outline-none"
                />
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  disabled={isSubmitting}
                  className="flex-1 py-3.5 rounded-xl border-2 border-warm-400 font-bold text-warm-800 hover:bg-warm-100 text-lg touch-target"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-3.5 rounded-xl bg-teal-850 hover:bg-teal-900 text-white font-black text-lg flex items-center justify-center gap-2 shadow-lg touch-target disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" /> Saving...
                    </>
                  ) : (
                    'Confirm Visit'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
