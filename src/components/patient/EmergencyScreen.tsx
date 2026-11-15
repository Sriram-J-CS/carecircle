import React, { useEffect, useState } from 'react';
import { Phone, PhoneCall, ShieldAlert, CheckCircle2, X, AlertTriangle, Users } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { patientApi } from '../../services/api';

interface Contact {
  id?: number;
  name: string;
  phone: string;
  relation?: string;
}

interface EmergencyScreenProps {
  isOpen: boolean;
  onClose: () => void;
  message?: string;
  contacts?: Contact[];
}

export const EmergencyScreen: React.FC<EmergencyScreenProps> = ({
  isOpen,
  onClose,
  message = 'Emergency alert triggered. Immediate assistance requested.',
  contacts = [],
}) => {
  const { user } = useAuth();
  const { speak } = useLanguage();
  const [patientContacts, setPatientContacts] = useState<Contact[]>(contacts);

  useEffect(() => {
    if (!isOpen) return;

    // Speak aloud the emergency guidance
    speak('This may be serious. Call 112 now or press SOS. I am alerting your family.');

    // If contacts weren't passed in, load them from patient summary
    if (user && patientContacts.length === 0) {
      patientApi.getSummary(user.id).then((s) => {
        if (s?.emergency_contacts) {
          setPatientContacts(s.emergency_contacts);
        }
      }).catch(console.warn);
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="emergency-dialog-title"
      className="fixed inset-0 z-50 bg-red-950/95 flex flex-col items-center justify-between p-4 sm:p-8 text-white overflow-y-auto animate-pulse-subtle"
    >
      <div className="max-w-2xl w-full mx-auto flex flex-col items-center text-center my-auto py-6">
        {/* Pulsing Emergency Icon */}
        <div className="w-28 h-28 rounded-full bg-red-600 border-4 border-white shadow-[0_0_50px_rgba(239,68,68,0.8)] flex items-center justify-center mb-6 animate-bounce">
          <ShieldAlert className="w-16 h-16 text-white" />
        </div>

        <h1 id="emergency-dialog-title" className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-2">
          EMERGENCY ALERT
        </h1>
        <p className="text-2xl sm:text-3xl font-extrabold text-red-200 mb-6">
          Help is being alerted right now.
        </p>

        {/* Status Callout */}
        <div className="w-full bg-red-900/90 border-3 border-red-400 rounded-3xl p-5 mb-8 text-left shadow-2xl">
          <div className="flex items-center gap-3 mb-2">
            <AlertTriangle className="w-8 h-8 text-amber-300 flex-shrink-0" />
            <h2 className="text-2xl font-black text-white">Your family has been alerted</h2>
          </div>
          <p className="text-xl font-bold text-red-100">
            Automated urgent SMS and phone calls have been sent to your emergency contacts.
          </p>
        </div>

        {/* Giant One-Tap Emergency Numbers (112 & 108) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full mb-8">
          <a
            href="tel:112"
            aria-label="Call National Emergency 112 now"
            className="w-full min-h-[76px] py-4 px-6 rounded-2xl bg-white text-red-700 hover:bg-red-50 font-black text-3xl shadow-2xl flex items-center justify-center gap-4 transition-transform active:scale-95 border-4 border-red-500"
          >
            <PhoneCall className="w-9 h-9 fill-red-700" />
            <span>Call 112 (SOS)</span>
          </a>

          <a
            href="tel:108"
            aria-label="Call Ambulance 108 now"
            className="w-full min-h-[76px] py-4 px-6 rounded-2xl bg-red-600 text-white hover:bg-red-700 font-black text-3xl shadow-2xl flex items-center justify-center gap-4 transition-transform active:scale-95 border-4 border-white"
          >
            <Phone className="w-9 h-9 fill-white" />
            <span>Call 108 (Ambulance)</span>
          </a>
        </div>

        {/* Tap-to-call Emergency Contacts */}
        {patientContacts.length > 0 && (
          <div className="w-full bg-red-900/60 border-2 border-red-400 rounded-3xl p-5 mb-8 text-left">
            <h3 className="text-xl font-black text-white mb-3 flex items-center gap-2">
              <Users className="w-6 h-6 text-red-300" />
              <span>Tap to call your emergency contacts directly:</span>
            </h3>

            <div className="grid grid-cols-1 gap-3">
              {patientContacts.map((c, i) => (
                <a
                  key={c.id || i}
                  href={`tel:${c.phone}`}
                  aria-label={`Call ${c.name} (${c.relation}) at ${c.phone}`}
                  className="p-4 rounded-2xl bg-white/10 hover:bg-white/20 border-2 border-red-300 flex items-center justify-between gap-3 text-white transition-colors"
                >
                  <div>
                    <div className="text-2xl font-black">{c.name}</div>
                    <div className="text-base text-red-200 capitalize">
                      {c.relation || 'Family'} &middot; {c.phone}
                    </div>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-emerald-500 text-white flex items-center justify-center flex-shrink-0 shadow">
                    <Phone className="w-6 h-6 fill-white" />
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* "I am okay now" button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Dismiss emergency screen: I am okay now"
          className="w-full max-w-md min-h-[64px] py-3.5 px-6 rounded-2xl bg-white/20 hover:bg-white/30 text-white font-bold text-2xl border-2 border-white transition-colors flex items-center justify-center gap-3 shadow-lg"
        >
          <CheckCircle2 className="w-7 h-7 text-emerald-300" />
          <span>I am okay now</span>
        </button>
      </div>
    </div>
  );
};
