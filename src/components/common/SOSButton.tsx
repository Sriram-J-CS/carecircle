import React, { useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { patientApi } from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import toast from 'react-hot-toast';

export const SOSButton: React.FC<{ onEmergencyTriggered?: () => void }> = ({ onEmergencyTriggered }) => {
  const { t, speak } = useLanguage();
  const [loading, setLoading] = useState(false);

  const handleSos = async () => {
    try {
      setLoading(true);
      speak('Emergency alert activated. Help is on the way.');

      // Call POST /sos immediately without prompting confirmation
      await patientApi.sos();

      toast.error('EMERGENCY SOS SENT! Family and doctors have been notified.', {
        duration: 8000,
      });

      // Dispatch global emergency event so EmergencyScreen opens
      window.dispatchEvent(new CustomEvent('carecircle-open-emergency'));

      if (onEmergencyTriggered) {
        onEmergencyTriggered();
      }
    } catch (err: any) {
      console.error('SOS failed:', err);
      // Even if API fails, still open emergency screen so elder can tap 112
      window.dispatchEvent(new CustomEvent('carecircle-open-emergency'));
      toast.error('Emergency triggered. Call 112 immediately!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleSos}
      disabled={loading}
      aria-label="Trigger Emergency SOS alert immediately"
      className="fixed bottom-6 right-6 z-40 flex items-center justify-center gap-3 bg-sos hover:bg-sos-dark text-white font-black text-xl px-6 py-4 rounded-full shadow-2xl border-4 border-white transition-transform active:scale-95 animate-pulse min-h-[64px] min-w-[160px]"
    >
      {loading ? (
        <Loader2 className="w-8 h-8 animate-spin" />
      ) : (
        <AlertCircle className="w-8 h-8" />
      )}
      <span>{t('sos')}</span>
    </button>
  );
};
