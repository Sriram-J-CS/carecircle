import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { LanguageProvider } from './context/LanguageContext';
import { AuthProvider } from './context/AuthContext';
import { AppLayout } from './components/layout/AppLayout';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { Loader2 } from 'lucide-react';

// Code-split pages for performance optimization (>85 Lighthouse)
const LandingPage = React.lazy(() =>
  import('./pages/LandingPage').then((m) => ({ default: m.LandingPage }))
);
const LoginPage = React.lazy(() =>
  import('./pages/LoginPage').then((m) => ({ default: m.LoginPage }))
);
const RegisterPage = React.lazy(() =>
  import('./pages/RegisterPage').then((m) => ({ default: m.RegisterPage }))
);
const PatientHome = React.lazy(() =>
  import('./pages/dashboards/PatientHome').then((m) => ({ default: m.PatientHome }))
);
const CheckinPage = React.lazy(() =>
  import('./pages/CheckinPage').then((m) => ({ default: m.CheckinPage }))
);
const FamilyDashboard = React.lazy(() =>
  import('./pages/dashboards/FamilyDashboard').then((m) => ({ default: m.FamilyDashboard }))
);
const DoctorDashboard = React.lazy(() =>
  import('./pages/dashboards/DoctorDashboard').then((m) => ({ default: m.DoctorDashboard }))
);
const LifestylePage = React.lazy(() =>
  import('./pages/patient/LifestylePage').then((m) => ({ default: m.LifestylePage }))
);
const AppointmentsPage = React.lazy(() =>
  import('./pages/patient/AppointmentsPage').then((m) => ({ default: m.AppointmentsPage }))
);
const PeoplePage = React.lazy(() =>
  import('./pages/patient/PeoplePage').then((m) => ({ default: m.PeoplePage }))
);
const NotificationsPage = React.lazy(() =>
  import('./pages/NotificationsPage').then((m) => ({ default: m.NotificationsPage }))
);

const PageLoader: React.FC = () => (
  <div
    role="status"
    aria-label="Loading page content"
    className="min-h-[50vh] flex flex-col items-center justify-center gap-4 text-warm-800"
  >
    <Loader2 className="w-12 h-12 animate-spin text-teal-850" />
    <span className="text-xl font-black text-teal-950">CareCircle Loading...</span>
  </div>
);

export const App: React.FC = () => {
  return (
    <LanguageProvider>
      <AuthProvider>
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#0a3d42',
              color: '#ffffff',
              fontSize: '1.15rem',
              fontWeight: 700,
              borderRadius: '1rem',
              padding: '16px 24px',
              border: '2px solid #2dd4bf',
            },
            success: {
              iconTheme: {
                primary: '#10b981',
                secondary: '#ffffff',
              },
            },
            error: {
              style: {
                background: '#7f1d1d',
                color: '#ffffff',
                border: '2px solid #f87171',
              },
              iconTheme: {
                primary: '#ef4444',
                secondary: '#ffffff',
              },
            },
          }}
        />
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              {/* Patient Protected Routes */}
              <Route
                path="/home"
                element={
                  <ProtectedRoute allowedRoles={['patient']}>
                    <PatientHome />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/checkin"
                element={
                  <ProtectedRoute allowedRoles={['patient']}>
                    <CheckinPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/me/lifestyle"
                element={
                  <ProtectedRoute allowedRoles={['patient']}>
                    <LifestylePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/appointments"
                element={
                  <ProtectedRoute allowedRoles={['patient']}>
                    <AppointmentsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/people"
                element={
                  <ProtectedRoute allowedRoles={['patient']}>
                    <PeoplePage />
                  </ProtectedRoute>
                }
              />

              {/* Relative Protected Routes */}
              <Route
                path="/family"
                element={
                  <ProtectedRoute allowedRoles={['relative']}>
                    <FamilyDashboard />
                  </ProtectedRoute>
                }
              />

              {/* Doctor Protected Routes */}
              <Route
                path="/doctor"
                element={
                  <ProtectedRoute allowedRoles={['doctor']}>
                    <DoctorDashboard />
                  </ProtectedRoute>
                }
              />

              {/* Shared Notifications Route (All roles) */}
              <Route
                path="/notifications"
                element={
                  <ProtectedRoute allowedRoles={['patient', 'relative', 'doctor']}>
                    <NotificationsPage />
                  </ProtectedRoute>
                }
              />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </Suspense>
      </AuthProvider>
    </LanguageProvider>
  );
};

export default App;
