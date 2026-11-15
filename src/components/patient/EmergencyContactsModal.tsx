import React from 'react';
import { Phone, Users, X, HeartHandshake } from 'lucide-react';

interface Contact {
  id: number;
  name: string;
  phone: string;
  relation: string;
}

interface EmergencyContactsModalProps {
  contacts: Contact[];
  isOpen: boolean;
  onClose: () => void;
}

export const EmergencyContactsModal: React.FC<EmergencyContactsModalProps> = ({
  contacts,
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="family-call-title"
      className="fixed inset-0 z-50 bg-teal-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
    >
      <div className="bg-white rounded-3xl border-4 border-teal-600 shadow-2xl max-w-lg w-full p-6 sm:p-8 relative">
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
            <Users className="w-7 h-7 text-teal-850" />
          </div>
          <div>
            <h2 id="family-call-title" className="text-3xl font-black text-teal-950">
              Call My Family
            </h2>
            <p className="text-sm font-bold text-warm-700">
              Tap any contact below to make a call immediately
            </p>
          </div>
        </div>

        {contacts.length === 0 ? (
          <div className="p-6 text-center text-warm-800 font-bold text-lg bg-warm-50 rounded-2xl border border-warm-200">
            No emergency contacts found.
          </div>
        ) : (
          <div className="space-y-4">
            {contacts.map((c) => (
              <a
                key={c.id || c.phone}
                href={`tel:${c.phone}`}
                aria-label={`Call ${c.name} (${c.relation}) at ${c.phone}`}
                className="p-5 rounded-2xl bg-warm-50 hover:bg-teal-50 border-3 border-teal-200 hover:border-teal-700 flex items-center justify-between gap-4 transition-all shadow-sm group"
              >
                <div>
                  <div className="text-2xl font-black text-teal-950 group-hover:text-teal-900">
                    {c.name}
                  </div>
                  <div className="text-base font-semibold text-warm-700 capitalize">
                    {c.relation || 'Family'} &middot; {c.phone}
                  </div>
                </div>

                <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md group-hover:bg-emerald-700 transition-colors flex-shrink-0">
                  <Phone className="w-7 h-7 fill-white" />
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
