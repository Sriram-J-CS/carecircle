import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Navbar } from './components/layout/Navbar';
import { OfflineBanner } from './components/common/OfflineBanner';
import { AuthGuard } from './components/common/AuthGuard';

// Direct / Critical imports
import { LandingPage } from './pages/LandingPage';
import { PatientHome } from './pages/dashboards/PatientHome';
import { RateLimitPage } from './pages/RateLimitPage';

// Lazy-loaded routes for optimal bundle splitting
const LoginPage = lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import('./pages/RegisterPage').then(m => ({ default: m.RegisterPage })));
const DesignShowcasePage = lazy(() => import('./pages/DesignShowcasePage').then(m => ({ default: m.DesignShowcasePage })));
const FamilyDashboard = lazy(() => import('./pages/dashboards/FamilyDashboard').then(m => ({ default: m.FamilyDashboard })));
const DoctorDashboard = lazy(() => import('./pages/dashboards/DoctorDashboard').then(m => ({ default: m.DoctorDashboard })));
const LifestylePage = lazy(() => import('./pages/patient/LifestylePage').then(m => ({ default: m.LifestylePage })));
const AppointmentsPage = lazy(() => import('./pages/patient/AppointmentsPage').then(m => ({ default: m.AppointmentsPage })));
const PeoplePage = lazy(() => import('./pages/patient/PeoplePage').then(m => ({ default: m.PeoplePage })));
const NotificationsPage = lazy(() => import('./pages/patient/NotificationsPage').then(m => ({ default: m.NotificationsPage })));
const CheckinPage = lazy(() => import('./pages/patient/CheckinPage').then(m => ({ default: m.CheckinPage })));

const PageLoader = () => (
  <div className="min-h-[50vh] flex items-center justify-center p-6">
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 rounded-full border-3 border-teal border-t-transparent animate-spin" />
      <span className="text-xs font-medium text-ink/60 dark:text-sand/60">Loading...</span>
    </div>
  </div>
);

export const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-sand/20 dark:bg-ink flex flex-col font-sans transition-colors">
      <OfflineBanner />
      <Navbar />

      <div className="flex-1">
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/design" element={<DesignShowcasePage />} />
            <Route path="/rate-limit" element={<RateLimitPage />} />

            {/* Patient Area */}
            <Route
              path="/home"
              element={
                <AuthGuard allowedRoles={['patient']}>
                  <PatientHome />
                </AuthGuard>
              }
            />
            <Route
              path="/checkin"
              element={
                <AuthGuard allowedRoles={['patient']}>
                  <CheckinPage />
                </AuthGuard>
              }
            />
            <Route
              path="/me/lifestyle"
              element={
                <AuthGuard allowedRoles={['patient']}>
                  <LifestylePage />
                </AuthGuard>
              }
            />
            <Route
              path="/me/appointments"
              element={
                <AuthGuard allowedRoles={['patient']}>
                  <AppointmentsPage />
                </AuthGuard>
              }
            />
            <Route
              path="/me/people"
              element={
                <AuthGuard allowedRoles={['patient']}>
                  <PeoplePage />
                </AuthGuard>
              }
            />

            {/* Family Area */}
            <Route
              path="/family"
              element={
                <AuthGuard allowedRoles={['relative']}>
                  <FamilyDashboard />
                </AuthGuard>
              }
            />

            {/* Doctor Area */}
            <Route
              path="/doctor"
              element={
                <AuthGuard allowedRoles={['doctor']}>
                  <DoctorDashboard />
                </AuthGuard>
              }
            />

            {/* Notifications (All authenticated roles) */}
            <Route
              path="/me/notifications"
              element={
                <AuthGuard>
                  <NotificationsPage />
                </AuthGuard>
              }
            />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </div>

      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#FBF8F3',
            color: '#12302F',
            borderRadius: '16px',
            border: '1px solid #F1EBDF',
            fontFamily: 'Inter, sans-serif',
            fontSize: '14px',
            boxShadow: '0 8px 30px rgba(18, 48, 47, 0.08)',
          },
        }}
      />
    </div>
  );
};
