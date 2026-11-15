import React, { useState } from 'react';
import { Pill, Plus, X, Loader2, Clock } from 'lucide-react';
import { directoryApi, patientApi } from '../../services/api';
import { Medicine } from '../../types/api';
import toast from 'react-hot-toast';

interface AddMedicineModalProps {
  patientId: number;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AddMedicineModal: React.FC<AddMedicineModalProps> = ({
  patientId,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [medicineName, setMedicineName] = useState('');
  const [dosage, setDosage] = useState('1 tablet');
  const [times, setTimes] = useState<string[]>(['08:00']);
  const [customTime, setCustomTime] = useState('');
  const [withFood, setWithFood] = useState<'before' | 'after' | 'with' | 'any'>('after');
  const [suggestions, setSuggestions] = useState<Medicine[]>([]);
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

  const toggleTime = (timeStr: string) => {
    if (times.includes(timeStr)) {
      if (times.length === 1) return; // Keep at least one
      setTimes(times.filter((t) => t !== timeStr));
    } else {
      setTimes([...times, timeStr].sort());
    }
  };

  const addCustomTime = () => {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(customTime)) {
      toast.error('Time must be in HH:MM format (24h), e.g. 15:30');
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
      toast.error('Please select at least one time');
      return;
    }

    try {
      setIsSubmitting(true);
      await patientApi.createSchedule(patientId, {
        medicine_name: medicineName.trim(),
        dosage: dosage.trim() || '1 tablet',
        times,
        with_food: withFood,
      });

      toast.success(`Scheduled ${medicineName}!`);
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to add medicine schedule');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-med-title"
      className="fixed inset-0 z-50 bg-teal-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in"
    >
      <div className="bg-white rounded-3xl border-4 border-teal-600 shadow-2xl max-w-xl w-full p-6 sm:p-8 relative my-auto">
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
            <Pill className="w-7 h-7 text-teal-850" />
          </div>
          <h2 id="add-med-title" className="text-3xl font-black text-teal-950">
            Add Medicine
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Autocomplete Input */}
          <div className="relative">
            <label htmlFor="modal-med-name" className="block text-xl font-black text-teal-950 mb-1">
              Medicine Name *
            </label>
            <input
              id="modal-med-name"
              type="text"
              required
              value={medicineName}
              onChange={(e) => handleSearchMedicine(e.target.value)}
              placeholder="Search (e.g. Telma 40, Glycomet 500...)"
              className="w-full min-h-[56px] px-4 py-3 rounded-2xl border-2 border-warm-300 focus:border-teal-700 bg-white text-xl font-semibold text-warm-900 shadow-sm"
            />
            {suggestions.length > 0 && (
              <div className="absolute z-20 left-0 right-0 mt-1 bg-white border-2 border-teal-600 rounded-2xl shadow-xl max-h-48 overflow-y-auto">
                {suggestions.map((sug) => (
                  <button
                    key={sug.id}
                    type="button"
                    onClick={() => {
                      setMedicineName(sug.name);
                      if (sug.default_dosage) setDosage(sug.default_dosage);
                      setSuggestions([]);
                    }}
                    className="w-full p-3 text-left hover:bg-teal-50 border-b border-warm-100 last:border-0 flex items-center justify-between"
                  >
                    <div>
                      <span className="font-black text-lg text-teal-950">{sug.name}</span>
                      <span className="text-xs text-warm-600 ml-2">({sug.generic})</span>
                    </div>
                    <span className="text-xs font-bold bg-teal-100 text-teal-800 px-2 py-0.5 rounded">
                      {sug.category}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Dosage */}
          <div>
            <label htmlFor="modal-dosage" className="block text-xl font-black text-teal-950 mb-1">
              Dosage
            </label>
            <input
              id="modal-dosage"
              type="text"
              value={dosage}
              onChange={(e) => setDosage(e.target.value)}
              placeholder="e.g. 1 tablet, 5 ml"
              className="w-full min-h-[56px] px-4 py-3 rounded-2xl border-2 border-warm-300 focus:border-teal-700 bg-white text-xl font-semibold text-warm-900 shadow-sm"
            />
          </div>

          {/* Time chips */}
          <div>
            <label className="block text-xl font-black text-teal-950 mb-2">
              When to take (Times of Day):
            </label>
            <div className="grid grid-cols-2 gap-2.5 mb-3">
              {[
                { time: '08:00', label: 'Morning 08:00' },
                { time: '14:00', label: 'Afternoon 14:00' },
                { time: '18:00', label: 'Evening 18:00' },
                { time: '21:00', label: 'Night 21:00' },
              ].map((slot) => {
                const isSelected = times.includes(slot.time);
                return (
                  <button
                    key={slot.time}
                    type="button"
                    onClick={() => toggleTime(slot.time)}
                    aria-pressed={isSelected}
                    className={`min-h-[54px] p-2.5 rounded-xl font-black text-base border-2 transition-all ${
                      isSelected
                        ? 'bg-teal-900 text-white border-teal-950 shadow-md'
                        : 'bg-white text-warm-900 border-warm-300 hover:border-teal-600'
                    }`}
                  >
                    {slot.label}
                  </button>
                );
              })}
            </div>

            {/* Custom time input */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={customTime}
                onChange={(e) => setCustomTime(e.target.value)}
                placeholder="Custom HH:MM (e.g. 16:30)"
                className="flex-1 min-h-[48px] px-3 py-2 rounded-xl border-2 border-warm-300 text-base"
              />
              <button
                type="button"
                onClick={addCustomTime}
                className="min-h-[48px] px-4 py-2 bg-warm-200 hover:bg-warm-300 text-warm-900 font-bold rounded-xl text-base"
              >
                + Add Time
              </button>
            </div>
          </div>

          {/* Food timing */}
          <div>
            <label className="block text-xl font-black text-teal-950 mb-2">
              Food Timing:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { val: 'before', label: 'Before food' },
                { val: 'after', label: 'After food' },
                { val: 'with', label: 'With meal' },
                { val: 'any', label: 'Any time' },
              ].map((f) => {
                const isSelected = withFood === f.val;
                return (
                  <button
                    key={f.val}
                    type="button"
                    onClick={() => setWithFood(f.val as any)}
                    aria-pressed={isSelected}
                    className={`min-h-[48px] p-2 rounded-xl font-bold text-base border-2 transition-all ${
                      isSelected
                        ? 'bg-teal-900 text-white border-teal-950'
                        : 'bg-white text-warm-900 border-warm-300 hover:border-teal-600'
                    }`}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t-2 border-warm-200">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full min-h-[60px] py-3.5 px-6 rounded-2xl bg-teal-900 hover:bg-teal-850 text-white font-black text-2xl shadow-xl flex items-center justify-center gap-3 transition-transform active:scale-98 disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-7 h-7 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Medicine Schedule</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
