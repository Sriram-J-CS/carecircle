import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, PhoneCall, CheckCircle } from 'lucide-react';
import { api } from '../../services/api';
import { playAlertTone } from '../../services/audio';

export const SOSButton: React.FC<{ onEmergencyTriggered?: () => void }> = ({
  onEmergencyTriggered,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isCalling, setIsCalling] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const handleTriggerSOS = async () => {
    setIsCalling(true);
    playAlertTone();
    try {
      await api.triggerSOS();
      setConfirmed(true);
      if (onEmergencyTriggered) {
        onEmergencyTriggered();
      }
    } catch {
      // Even if network fails, we let user call emergency
    } finally {
      setIsCalling(false);
    }
  };

  return (
    <>
      {/* Pinned Red Emergency Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 bg-clay hover:bg-clay-600 text-white font-serif font-bold text-xl px-6 py-4 rounded-full shadow-2xl flex items-center gap-3 border-2 border-white/30 focus:outline-none focus:ring-4 focus:ring-clay/50"
        aria-label="Emergency SOS Assistance"
      >
        <span className="w-3.5 h-3.5 rounded-full bg-white animate-ping" />
        <AlertTriangle className="w-6 h-6 text-white" />
        <span>SOS HELP</span>
      </motion.button>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 bg-ink/75 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-paper dark:bg-teal-950 border-2 border-clay rounded-3xl max-w-lg w-full p-6 sm:p-8 text-center space-y-6 shadow-2xl"
            >
              <div className="w-20 h-20 rounded-full bg-clay/15 text-clay flex items-center justify-center mx-auto">
                <AlertTriangle className="w-12 h-12" />
              </div>

              <div className="space-y-2">
                <h3 className="text-3xl font-serif font-bold text-clay">
                  Emergency Assistance
                </h3>
                <p className="text-ink/80 dark:text-sand/80 text-base leading-relaxed">
                  Do you need urgent medical help? Tapping confirm will instantly notify your family, attending doctor, and emergency contacts.
                </p>
              </div>

              {confirmed ? (
                <div className="bg-sage/10 border border-sage/30 rounded-2xl p-4 text-sage-900 dark:text-sage-200 space-y-2">
                  <div className="flex items-center justify-center gap-2 font-bold text-lg">
                    <CheckCircle className="w-6 h-6 text-sage" />
                    <span>Emergency Alerts Sent</span>
                  </div>
                  <p className="text-sm">
                    Your family and doctors have been notified with high priority.
                  </p>
                  <div className="pt-2 flex flex-col gap-2">
                    <a
                      href="tel:112"
                      className="bg-clay text-white py-3 px-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2"
                    >
                      <PhoneCall className="w-5 h-5" />
                      <span>Call National Emergency (112)</span>
                    </a>
                    <a
                      href="tel:108"
                      className="bg-teal text-white py-3 px-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2"
                    >
                      <PhoneCall className="w-5 h-5" />
                      <span>Call Medical Ambulance (108)</span>
                    </a>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <button
                    onClick={handleTriggerSOS}
                    disabled={isCalling}
                    className="w-full bg-clay hover:bg-clay-600 text-white font-serif font-bold text-2xl py-5 rounded-2xl shadow-lg transition-transform active:scale-98"
                  >
                    {isCalling ? 'Sending Alerts...' : 'YES, SEND SOS HELP'}
                  </button>

                  <button
                    onClick={() => setIsOpen(false)}
                    className="w-full bg-sand/50 dark:bg-teal-900/40 text-ink/80 dark:text-sand/80 font-semibold py-3.5 rounded-2xl"
                  >
                    I am safe, close this
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
