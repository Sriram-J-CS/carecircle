import React, { useState } from 'react';
import { Calendar, X, Loader2 } from 'lucide-react';
import { careApi } from '../../services/api';
import toast from 'react-hot-toast';

interface BookAppointmentModalProps {
  patientId: number;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultHospital?: string;
  defaultDoctor?: string;
}

export const BookAppointmentModal: React.FC<BookAppointmentModalProps> = ({
  patientId,
  isOpen,
  onClose,
  onSuccess,
  defaultHospital = '',
  defaultDoctor = '',
}) => {
  const [title, setTitle] = useState('Routine Check-up');
  const [doctorName, setDoctorName] = useState(defaultDoctor);
  const [hospital, setHospital] = useState(defaultHospital);
  // Default to tomorrow 10:00 AM in local time
  const [scheduledAt, setScheduledAt] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(10, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !scheduledAt) {
      toast.error('Please enter appointment title and date/time.');
      return;
    }

    try {
      setIsSubmitting(true);
      await careApi.createAppointment(patientId, {
        title: title.trim(),
        doctor_name: doctorName.trim() || null,
        hospital: hospital.trim() || null,
        scheduled_at: new Date(scheduledAt).toISOString(),
        notes: notes.trim() || null,
      });

      toast.success('Appointment booked! Patient has been notified.');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to book appointment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="book-appt-title"
      className="fixed inset-0 z-50 bg-teal-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in"
    >
      <div className="bg-white rounded-3xl border-4 border-teal-600 shadow-2xl max-w-lg w-full p-6 sm:p-8 relative my-auto">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close dialog"
          className="absolute top-5 right-5 p-2 rounded-xl text-warm-700 hover:bg-warm-100"
        >
          <X className="w-7 h-7" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-teal-100 flex items-center justify-center text-teal-900">
            <Calendar className="w-7 h-7 text-teal-850" />
          </div>
          <div>
            <h2 id="book-appt-title" className="text-3xl font-black text-teal-950">
              Book Appointment
            </h2>
            <p className="text-sm font-bold text-warm-700">
              Schedule a hospital visit or consultation for your loved one
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="appt-title" className="block text-lg font-black text-teal-950 mb-1">
              Appointment Title *
            </label>
            <input
              id="appt-title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Cardiology Follow-up, Routine BP check"
              className="w-full min-h-[52px] px-4 py-2.5 rounded-xl border-2 border-warm-300 focus:border-teal-700 bg-white font-semibold text-lg text-warm-900 shadow-sm"
            />
          </div>

          <div>
            <label htmlFor="appt-datetime" className="block text-lg font-black text-teal-950 mb-1">
              Date &amp; Time *
            </label>
            <input
              id="appt-datetime"
              type="datetime-local"
              required
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="w-full min-h-[52px] px-4 py-2.5 rounded-xl border-2 border-warm-300 focus:border-teal-700 bg-white font-semibold text-lg text-warm-900 shadow-sm"
            />
          </div>

          <div>
            <label htmlFor="appt-doctor" className="block text-lg font-black text-teal-950 mb-1">
              Doctor Name (Optional)
            </label>
            <input
              id="appt-doctor"
              type="text"
              value={doctorName}
              onChange={(e) => setDoctorName(e.target.value)}
              placeholder="e.g. Dr. K. Ramanathan"
              className="w-full min-h-[52px] px-4 py-2.5 rounded-xl border-2 border-warm-300 focus:border-teal-700 bg-white font-semibold text-lg text-warm-900 shadow-sm"
            />
          </div>

          <div>
            <label htmlFor="appt-hospital" className="block text-lg font-black text-teal-950 mb-1">
              Hospital / Clinic (Optional)
            </label>
            <input
              id="appt-hospital"
              type="text"
              value={hospital}
              onChange={(e) => setHospital(e.target.value)}
              placeholder="e.g. Apollo Speciality Hospital"
              className="w-full min-h-[52px] px-4 py-2.5 rounded-xl border-2 border-warm-300 focus:border-teal-700 bg-white font-semibold text-lg text-warm-900 shadow-sm"
            />
          </div>

          <div>
            <label htmlFor="appt-notes" className="block text-lg font-black text-teal-950 mb-1">
              Notes for Patient (Optional)
            </label>
            <textarea
              id="appt-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Remember to carry previous blood test reports and fasting for 8 hours"
              className="w-full p-3 rounded-xl border-2 border-warm-300 focus:border-teal-700 bg-white font-semibold text-base text-warm-900 shadow-sm"
            />
          </div>

          <div className="pt-3 border-t-2 border-warm-200">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full min-h-[58px] py-3.5 px-6 rounded-2xl bg-teal-900 hover:bg-teal-850 text-white font-black text-xl shadow-xl flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span>Booking...</span>
                </>
              ) : (
                <span>Confirm Appointment</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
