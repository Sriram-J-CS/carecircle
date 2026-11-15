import React, { useState } from 'react';
import { Pill, Plus, X, Loader2, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { directoryApi, patientApi } from '../../services/api';
import { Medicine } from '../../types/api';
import toast from 'react-hot-toast';

interface PrescribeMedicineModalProps {
  patientId: number;
  patientName: string;
  patientAllergies?: string[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const PrescribeMedicineModal: React.FC<PrescribeMedicineModalProps> = ({
  patientId,
  patientName,
  patientAllergies = [],
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [medicineName, setMedicineName] = useState('');
  const [dosage, setDosage] = useState('1 tablet (500mg)');
  const [times, setTimes] = useState<string[]>(['08:00', '20:00']);
  const [customTime, setCustomTime] = useState('');
  const [withFood, setWithFood] = useState<'before' | 'after' | 'with' | 'any'>('after');
  const [notes, setNotes] = useState('');
  const [suggestions, setSuggestions] = useState<Medicine[]>([]);
  const [selectedMedInfo, setSelectedMedInfo] = useState<Medicine | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSearchMedicine = async (query: string) => {
    setMedicineName(query);
    if (!query.trim()) {
      setSuggestions([]);
      return;
    }
    try {
      const res = await directoryApi.getMedicines({ q: query, limit: 10 });
      setSuggestions(res);
    } catch (err) {
      console.warn(err);
    }
  };

  const handleSelectMedicine = (med: Medicine) => {
    setMedicineName(med.name);
    setSelectedMedInfo(med);
    if (med.default_dosage) {
      setDosage(med.default_dosage);
    }
    setSuggestions([]);
  };

  const toggleTime = (timeStr: string) => {
    if (times.includes(timeStr)) {
      if (times.length === 1) {
        toast.error('At least one dose time is required');
        return;
      }
      setTimes(times.filter((t) => t !== timeStr));
    } else {
      setTimes([...times, timeStr].sort());
    }
  };

  const addCustomTime = () => {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(customTime)) {
      toast.error('Time must be in 24h format (HH:MM), e.g. 14:30');
      return;
    }
    if (!times.includes(customTime)) {
      setTimes([...times, customTime].sort());
    }
    setCustomTime('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!medicineName.trim()) {
      toast.error('Please enter a medicine name');
      return;
    }
    if (times.length === 0) {
      toast.error('Please select at least one administration time');
      return;
    }

    try {
      setIsSubmitting(true);
      await patientApi.createSchedule(patientId, {
        medicine_name: medicineName.trim(),
        dosage: dosage.trim() || '1 tablet',
        times,
        with_food: withFood,
        notes: notes.trim() || null,
      });

      toast.success(`Prescription added for ${patientName}: ${medicineName}!`);
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to add prescription');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="prescribe-med-title"
      className="fixed inset-0 z-50 bg-teal-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in"
    >
      <div className="bg-white rounded-3xl border-4 border-teal-700 shadow-2xl max-w-xl w-full p-6 sm:p-8 relative my-auto">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close dialog"
          className="absolute top-5 right-5 p-2 rounded-xl text-warm-700 hover:bg-warm-100 touch-target"
        >
          <X className="w-7 h-7" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-teal-100 flex items-center justify-center text-teal-900">
            <Pill className="w-7 h-7 text-teal-850" />
          </div>
          <div>
            <h2 id="prescribe-med-title" className="text-2xl sm:text-3xl font-black text-teal-950">
              Prescribe Medication
            </h2>
            <p className="text-sm font-bold text-warm-700">
              Patient: <span className="text-teal-900 font-black">{patientName}</span>
            </p>
          </div>
        </div>

        {/* Known Allergies Warning */}
        {patientAllergies && patientAllergies.length > 0 && (
          <div className="mb-5 p-4 rounded-2xl bg-amber-50 border-2 border-amber-300 flex items-start gap-3 text-amber-950">
            <AlertTriangle className="w-6 h-6 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-black text-sm uppercase tracking-wide text-amber-900">
                Known Patient Allergies
              </p>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {patientAllergies.map((allergy, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-0.5 rounded-full bg-amber-200/80 text-amber-950 font-bold text-xs"
                  >
                    {allergy}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Medicine Search */}
          <div className="relative">
            <label htmlFor="med-name-input" className="block text-lg font-black text-teal-950 mb-1">
              Medicine Name *
            </label>
            <input
              id="med-name-input"
              type="text"
              value={medicineName}
              onChange={(e) => handleSearchMedicine(e.target.value)}
              placeholder="e.g. Telma 40, Metformin 500, Paracetamol"
              required
              className="w-full text-lg font-bold px-4 py-3 rounded-xl border-2 border-warm-300 focus:border-teal-700 focus:ring-2 focus:ring-teal-700/20 outline-none"
            />

            {/* Suggestions dropdown */}
            {suggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white border-2 border-teal-600 rounded-xl shadow-xl z-20 max-h-56 overflow-y-auto divide-y divide-warm-100">
                {suggestions.map((med) => (
                  <button
                    key={med.id}
                    type="button"
                    onClick={() => handleSelectMedicine(med)}
                    className="w-full text-left p-3 hover:bg-teal-50 flex items-center justify-between"
                  >
                    <div>
                      <p className="font-black text-teal-950 text-base">{med.name}</p>
                      <p className="text-xs text-warm-700 font-semibold">
                        {med.generic ? `Generic: ${med.generic}` : med.category || ''}
                      </p>
                    </div>
                    {med.default_dosage && (
                      <span className="text-xs font-bold px-2 py-1 bg-teal-100 text-teal-900 rounded-lg">
                        {med.default_dosage}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {selectedMedInfo && (
              <div className="mt-2 text-xs font-semibold text-teal-850 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>
                  {selectedMedInfo.generic && `Generic: ${selectedMedInfo.generic} `}
                  {selectedMedInfo.category && `(${selectedMedInfo.category})`}
                </span>
              </div>
            )}
          </div>

          {/* Dosage */}
          <div>
            <label htmlFor="dosage-input" className="block text-lg font-black text-teal-950 mb-1">
              Dosage & Form *
            </label>
            <input
              id="dosage-input"
              type="text"
              value={dosage}
              onChange={(e) => setDosage(e.target.value)}
              placeholder="e.g. 1 tablet (40mg), 5ml syrup"
              required
              className="w-full text-lg font-bold px-4 py-3 rounded-xl border-2 border-warm-300 focus:border-teal-700 focus:ring-2 focus:ring-teal-700/20 outline-none"
            />
          </div>

          {/* Daily Schedule Times */}
          <div>
            <label className="block text-lg font-black text-teal-950 mb-1">
              Administration Times *
            </label>
            <p className="text-xs font-bold text-warm-700 mb-2">
              Select standard times or enter a custom 24-hour time:
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
              {[
                { label: 'Morning', time: '08:00' },
                { label: 'Afternoon', time: '13:00' },
                { label: 'Evening', time: '18:00' },
                { label: 'Night', time: '20:00' },
              ].map(({ label, time }) => {
                const active = times.includes(time);
                return (
                  <button
                    key={time}
                    type="button"
                    onClick={() => toggleTime(time)}
                    className={`p-2.5 rounded-xl border-2 text-center transition-all ${
                      active
                        ? 'border-teal-700 bg-teal-850 text-white font-black shadow-md'
                        : 'border-warm-300 bg-warm-50 text-warm-900 font-bold hover:bg-teal-50'
                    }`}
                  >
                    <div className="text-xs opacity-90">{label}</div>
                    <div className="text-base">{time}</div>
                  </button>
                );
              })}
            </div>

            {/* Custom time entry */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Custom HH:MM (e.g. 15:30)"
                value={customTime}
                onChange={(e) => setCustomTime(e.target.value)}
                className="flex-1 text-sm font-bold px-3 py-2 rounded-xl border-2 border-warm-300 focus:border-teal-700 outline-none"
              />
              <button
                type="button"
                onClick={addCustomTime}
                className="px-4 py-2 bg-teal-100 hover:bg-teal-200 text-teal-950 font-bold rounded-xl text-sm flex items-center gap-1"
              >
                <Plus className="w-4 h-4" /> Add
              </button>
            </div>

            {/* Selected times display */}
            <div className="flex flex-wrap gap-2 mt-2">
              {times.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-700 text-white text-xs font-black"
                >
                  <Clock className="w-3.5 h-3.5" />
                  {t}
                  <button
                    type="button"
                    onClick={() => toggleTime(t)}
                    aria-label={`Remove time ${t}`}
                    className="hover:text-red-200 ml-0.5"
                  >
                    &times;
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* With Food */}
          <div>
            <label className="block text-lg font-black text-teal-950 mb-1">Food Relation</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'before', label: 'Before Food' },
                { id: 'after', label: 'After Food' },
                { id: 'with', label: 'With Food' },
                { id: 'any', label: 'Anytime' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setWithFood(opt.id as any)}
                  className={`p-2.5 rounded-xl border-2 text-center text-sm font-bold transition-all ${
                    withFood === opt.id
                      ? 'border-teal-700 bg-teal-850 text-white'
                      : 'border-warm-300 bg-warm-50 text-warm-900 hover:bg-warm-100'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Clinical Notes */}
          <div>
            <label htmlFor="notes-input" className="block text-lg font-black text-teal-950 mb-1">
              Doctor Instructions / Notes
            </label>
            <textarea
              id="notes-input"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Take with a glass of warm water. Review blood pressure in 2 weeks."
              className="w-full text-base font-semibold px-4 py-2.5 rounded-xl border-2 border-warm-300 focus:border-teal-700 outline-none"
            />
          </div>

          <div className="flex gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 py-3.5 rounded-xl border-2 border-warm-400 font-bold text-warm-800 hover:bg-warm-100 text-lg touch-target"
            >
              Cancel
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
                'Save Prescription'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
