import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wrench, Sparkles, X, Check, Play, RefreshCw } from 'lucide-react';
import { Schedule } from '../../types/api';
import { api } from '../../services/api';

interface DemoToolsDrawerProps {
  onDoseTriggered?: () => void;
}

export const DemoToolsDrawer: React.FC<DemoToolsDrawerProps> = ({ onDoseTriggered }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [triggeringId, setTriggeringId] = useState<number | null>(null);

  // Keyboard shortcut Ctrl+Shift+D
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadSchedules();
    }
  }, [isOpen]);

  const loadSchedules = async () => {
    setIsLoading(true);
    try {
      const data = await api.getPatientSchedules('me');
      setSchedules(data);
    } catch {
      // non-fatal
    } finally {
      setIsLoading(false);
    }
  };

  const handleTriggerTestDose = async (sid: number) => {
    setTriggeringId(sid);
    try {
      await api.triggerTestDose('me', sid);
      if (onDoseTriggered) {
        onDoseTriggered();
      }
    } catch {
      // ignore
    } finally {
      setTriggeringId(null);
    }
  };

  return (
    <>
      {/* Floating Demo Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 left-6 z-40 bg-sand/80 dark:bg-teal-900/80 backdrop-blur-md hover:bg-sand text-ink dark:text-paper text-xs font-bold px-3.5 py-2 rounded-full border border-sand dark:border-teal-700 shadow-md flex items-center gap-2 transition-transform hover:scale-105"
        title="Demo Tools (Ctrl+Shift+D)"
      >
        <Wrench className="w-4 h-4 text-teal dark:text-mint" />
        <span className="hidden sm:inline">Demo Tools (Ctrl+Shift+D)</span>
      </button>

      {/* Drawer */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 bg-ink/60 backdrop-blur-xs flex justify-end">
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-full max-w-md bg-paper dark:bg-teal-950 border-l border-sand dark:border-teal-800 p-6 flex flex-col justify-between shadow-2xl h-full overflow-y-auto"
            >
              <div className="space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-sand dark:border-teal-800">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-teal dark:text-mint" />
                    <h3 className="text-xl font-serif font-bold text-ink dark:text-paper">
                      Demo & Simulation Tools
                    </h3>
                  </div>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1 rounded-full text-ink/60 hover:bg-sand/60"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <p className="text-xs text-ink/70 dark:text-sand/70 leading-relaxed">
                  Trigger an immediate test dose for any scheduled medicine to test the Pill Camera flow and health check-in instantly without waiting for scheduled times.
                </p>

                <div className="space-y-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-teal dark:text-mint">
                    Your Scheduled Medicines
                  </span>

                  {isLoading ? (
                    <div className="py-6 text-center text-xs text-ink/50">Loading schedules...</div>
                  ) : schedules.length === 0 ? (
                    <div className="p-4 bg-sand/30 rounded-2xl text-xs text-ink/60 text-center">
                      No medicine schedules found. Add one in registration or doctor portal.
                    </div>
                  ) : (
                    schedules.map((s) => (
                      <div
                        key={s.id}
                        className="p-3.5 bg-sand/30 dark:bg-ink/40 border border-sand dark:border-teal-800 rounded-2xl flex items-center justify-between"
                      >
                        <div>
                          <h5 className="text-sm font-bold text-ink dark:text-paper">
                            {s.medicine_name}
                          </h5>
                          <p className="text-xs text-ink/60 dark:text-sand/60">
                            {s.dosage} • Times: {s.times.join(', ')}
                          </p>
                        </div>
                        <button
                          onClick={() => handleTriggerTestDose(s.id)}
                          disabled={triggeringId === s.id}
                          className="bg-teal hover:bg-teal-700 text-white text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 transition-colors disabled:opacity-50"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>{triggeringId === s.id ? 'Making Due...' : 'Make Due Now'}</span>
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="pt-6 border-t border-sand dark:border-teal-900 text-center">
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-full bg-sand/50 text-ink/70 py-2.5 rounded-xl text-xs font-semibold"
                >
                  Close Demo Drawer
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
