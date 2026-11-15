import React, { useEffect, useState } from 'react';
import { MedSchedule } from '../../types/api';
import { patientApi } from '../../services/api';
import { Wrench, Play, Plus, X, RefreshCw, Loader2, Pill } from 'lucide-react';
import toast from 'react-hot-toast';

interface DemoToolsDrawerProps {
  patientId: number;
  isOpen: boolean;
  onClose: () => void;
  onOpenAddMedicine: () => void;
  onTestDoseTriggered: () => void;
}

export const DemoToolsDrawer: React.FC<DemoToolsDrawerProps> = ({
  patientId,
  isOpen,
  onClose,
  onOpenAddMedicine,
  onTestDoseTriggered,
}) => {
  const [schedules, setSchedules] = useState<MedSchedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [triggeringId, setTriggeringId] = useState<number | null>(null);

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      const res = await patientApi.getSchedules(patientId);
      setSchedules(res);
    } catch (err) {
      console.warn('Failed to load schedules in demo drawer', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && patientId) {
      fetchSchedules();
    }
  }, [isOpen, patientId]);

  const handleTestDose = async (scheduleId: number, medName: string) => {
    try {
      setTriggeringId(scheduleId);
      await patientApi.testDose(patientId, scheduleId);
      toast.success(`Demo: Made ${medName} due immediately!`);
      onTestDoseTriggered();
    } catch (err: any) {
      toast.error(err.message || 'Failed to trigger test dose');
    } finally {
      setTriggeringId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="demo-drawer-title"
      className="fixed inset-y-0 right-0 z-50 w-full sm:w-96 bg-white border-l-4 border-teal-700 shadow-2xl p-6 flex flex-col justify-between animate-in slide-in-from-right duration-300"
    >
      <div>
        <div className="flex items-center justify-between border-b-2 border-warm-200 pb-4 mb-4">
          <div className="flex items-center gap-2 text-teal-950 font-black text-2xl">
            <Wrench className="w-7 h-7 text-teal-850" />
            <h2 id="demo-drawer-title">Demo Tools</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close demo tools"
            className="p-2 rounded-xl text-warm-700 hover:bg-warm-100"
          >
            <X className="w-7 h-7" />
          </button>
        </div>

        <p className="text-sm font-semibold text-warm-800 mb-4">
          Click any button below to make a tablet <strong>due immediately</strong> on stage. (Shortcut: <kbd className="bg-warm-200 px-1.5 py-0.5 rounded text-xs font-mono font-bold">Ctrl+Shift+D</kbd>)
        </p>

        {loading ? (
          <div className="flex items-center justify-center py-8 gap-2 text-teal-900 font-bold">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span>Loading schedules...</span>
          </div>
        ) : schedules.length === 0 ? (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 text-center font-bold text-base my-4">
            No medicine schedules found for this patient. Add a medicine first!
          </div>
        ) : (
          <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
            {schedules.map((s) => (
              <div
                key={s.id}
                className="p-4 rounded-2xl border-2 border-warm-200 bg-warm-50 flex flex-col gap-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-black text-lg text-teal-950">{s.medicine_name}</span>
                  <span className="text-sm font-bold text-warm-700 bg-warm-200 px-2 py-0.5 rounded">
                    {s.dosage}
                  </span>
                </div>
                <div className="text-xs font-semibold text-warm-600">
                  Scheduled for: {s.times?.join(', ')} ({s.with_food || 'any'} food)
                </div>

                <button
                  type="button"
                  onClick={() => handleTestDose(s.id, s.medicine_name)}
                  disabled={triggeringId === s.id}
                  aria-label={`Make ${s.medicine_name} due right now`}
                  className="mt-1 w-full min-h-[46px] py-2 px-3 rounded-xl bg-teal-900 hover:bg-teal-850 text-white font-black text-sm flex items-center justify-center gap-2 shadow-sm transition-transform active:scale-95 disabled:opacity-50"
                >
                  {triggeringId === s.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4 fill-white" />
                  )}
                  <span>Make Due Now</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="pt-4 border-t-2 border-warm-200 flex flex-col gap-3">
        <button
          type="button"
          onClick={() => {
            onClose();
            onOpenAddMedicine();
          }}
          className="w-full min-h-[52px] py-3 px-4 rounded-xl bg-white hover:bg-warm-100 text-teal-950 font-black text-lg border-2 border-teal-850 flex items-center justify-center gap-2 shadow-sm"
        >
          <Plus className="w-5 h-5" />
          <span>Add Medicine Schedule</span>
        </button>

        <button
          type="button"
          onClick={fetchSchedules}
          className="w-full min-h-[44px] py-2 px-3 text-warm-700 hover:text-warm-900 font-bold text-sm flex items-center justify-center gap-1.5"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Refresh List</span>
        </button>
      </div>
    </div>
  );
};
