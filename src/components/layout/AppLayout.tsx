import React, { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { SOSButton } from '../common/SOSButton';
import { EmergencyScreen } from '../patient/EmergencyScreen';
import { OfflineBanner } from '../common/OfflineBanner';
import { InstallPwaPrompt } from '../common/InstallPwaPrompt';
import { useAuth } from '../../context/AuthContext';

export const AppLayout: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [isEmergencyOpen, setIsEmergencyOpen] = useState(false);

  // Red SOS button is always visible on patient screens
  const isPatientArea =
    user?.role === 'patient' ||
    location.pathname.startsWith('/home') ||
    location.pathname.startsWith('/checkin') ||
    location.pathname.startsWith('/me') ||
    location.pathname.startsWith('/appointments') ||
    location.pathname.startsWith('/people');

  useEffect(() => {
    const handleOpenEmergency = () => {
      setIsEmergencyOpen(true);
    };

    window.addEventListener('carecircle-open-emergency', handleOpenEmergency);
    return () => window.removeEventListener('carecircle-open-emergency', handleOpenEmergency);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-warm-50 text-warm-900">
      <OfflineBanner />
      <Navbar />
      <main className="flex-1 flex flex-col max-w-6xl w-full mx-auto px-4 py-6 sm:py-8">
        <Outlet />
      </main>
      <Footer />
      {isPatientArea && (
        <SOSButton onEmergencyTriggered={() => setIsEmergencyOpen(true)} />
      )}
      <EmergencyScreen
        isOpen={isEmergencyOpen}
        onClose={() => setIsEmergencyOpen(false)}
      />
      <InstallPwaPrompt />
    </div>
  );
};
