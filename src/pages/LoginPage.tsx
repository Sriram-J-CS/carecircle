import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { UserRole } from '../types/api';
import { FaceCamera } from '../components/auth/FaceCamera';
import { UserCheck, Stethoscope, Users, KeyRound, Camera, AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

export const LoginPage: React.FC = () => {
  const { login, faceLogin, getDashboardPath } = useAuth();
  const { t, speak } = useLanguage();
  const navigate = useNavigate();

  // Selected role
  const [selectedRole, setSelectedRole] = useState<UserRole>('patient');
  // Login method tab: 'face' | 'password'
  const [authMethod, setAuthMethod] = useState<'face' | 'password'>('face');

  // Email/Password state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    setErrorMessage(null);
  };

  const handleFaceSuccess = async (descriptor: number[]) => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const user = await faceLogin(descriptor);
      speak(`Welcome back, ${user.name}`);
      toast.success(`Welcome back, ${user.name}!`);
      navigate(getDashboardPath(user.role));
    } catch (err: any) {
      console.error('Face login error:', err);
      const friendlyMsg =
        err.status === 401
          ? t('orUseEmail')
          : err.message || 'We could not recognise you — use email and password';
      setErrorMessage(friendlyMsg);
      speak('We could not recognise you. Please use email and password.');
      toast.error(friendlyMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast.error(t('requiredField'));
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const user = await login({ email: email.trim(), password });
      speak(`Welcome back, ${user.name}`);
      toast.success(`Welcome back, ${user.name}!`);
      navigate(getDashboardPath(user.role));
    } catch (err: any) {
      const msg = err.message || 'Invalid email or password. Please try again.';
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto w-full py-4 sm:py-8">
      {/* Page Title */}
      <div className="text-center mb-8">
        <h1 className="text-3xl sm:text-4xl font-black text-teal-950 mb-2">
          {t('signIn')}
        </h1>
        <p className="text-xl font-bold text-warm-800">
          Welcome back to your CareCircle
        </p>
      </div>

      {/* 1. Who are you? Selection */}
      <section aria-labelledby="role-selection-heading" className="mb-10">
        <h2 id="role-selection-heading" className="text-2xl font-black text-teal-950 mb-4 text-center sm:text-left">
          {t('whoAreYou')}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Patient Card */}
          <button
            type="button"
            onClick={() => handleRoleSelect('patient')}
            aria-pressed={selectedRole === 'patient'}
            aria-label="Select Patient role"
            className={`p-5 rounded-2xl text-left flex flex-col justify-between transition-all min-h-[110px] ${
              selectedRole === 'patient'
                ? 'bg-teal-900 text-white border-4 border-teal-700 shadow-xl scale-[1.02]'
                : 'bg-white text-warm-900 border-2 border-warm-200 hover:border-teal-600 shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between w-full mb-2">
              <span className="text-2xl font-black">{t('patient')}</span>
              <UserCheck
                className={`w-8 h-8 ${selectedRole === 'patient' ? 'text-teal-300' : 'text-teal-850'}`}
              />
            </div>
            <p className={`text-sm font-semibold ${selectedRole === 'patient' ? 'text-warm-100' : 'text-warm-800'}`}>
              {t('patientDesc')}
            </p>
          </button>

          {/* Doctor Card */}
          <button
            type="button"
            onClick={() => handleRoleSelect('doctor')}
            aria-pressed={selectedRole === 'doctor'}
            aria-label="Select Doctor role"
            className={`p-5 rounded-2xl text-left flex flex-col justify-between transition-all min-h-[110px] ${
              selectedRole === 'doctor'
                ? 'bg-teal-900 text-white border-4 border-teal-700 shadow-xl scale-[1.02]'
                : 'bg-white text-warm-900 border-2 border-warm-200 hover:border-teal-600 shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between w-full mb-2">
              <span className="text-2xl font-black">{t('doctor')}</span>
              <Stethoscope
                className={`w-8 h-8 ${selectedRole === 'doctor' ? 'text-teal-300' : 'text-teal-850'}`}
              />
            </div>
            <p className={`text-sm font-semibold ${selectedRole === 'doctor' ? 'text-warm-100' : 'text-warm-800'}`}>
              {t('doctorDesc')}
            </p>
          </button>

          {/* Relative Card */}
          <button
            type="button"
            onClick={() => handleRoleSelect('relative')}
            aria-pressed={selectedRole === 'relative'}
            aria-label="Select Family Member role"
            className={`p-5 rounded-2xl text-left flex flex-col justify-between transition-all min-h-[110px] ${
              selectedRole === 'relative'
                ? 'bg-teal-900 text-white border-4 border-teal-700 shadow-xl scale-[1.02]'
                : 'bg-white text-warm-900 border-2 border-warm-200 hover:border-teal-600 shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between w-full mb-2">
              <span className="text-2xl font-black">{t('relative')}</span>
              <Users
                className={`w-8 h-8 ${selectedRole === 'relative' ? 'text-teal-300' : 'text-teal-850'}`}
              />
            </div>
            <p className={`text-sm font-semibold ${selectedRole === 'relative' ? 'text-warm-100' : 'text-warm-800'}`}>
              {t('relativeDesc')}
            </p>
          </button>
        </div>
      </section>

      {/* 2. Login Methods Tabs: Face ID vs Email/Password */}
      <div className="elder-card p-6 sm:p-8">
        <div className="flex rounded-2xl bg-warm-100 p-1.5 border-2 border-warm-200 mb-8" role="tablist" aria-label="Sign in method">
          <button
            type="button"
            role="tab"
            aria-selected={authMethod === 'face'}
            onClick={() => {
              setAuthMethod('face');
              setErrorMessage(null);
            }}
            className={`flex-1 min-h-[56px] py-3 px-4 rounded-xl font-black text-xl flex items-center justify-center gap-2 transition-all ${
              authMethod === 'face'
                ? 'bg-teal-900 text-white shadow-md'
                : 'text-warm-800 hover:text-teal-950 font-bold'
            }`}
          >
            <Camera className="w-6 h-6" />
            <span>{t('faceId')}</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={authMethod === 'password'}
            onClick={() => {
              setAuthMethod('password');
              setErrorMessage(null);
            }}
            className={`flex-1 min-h-[56px] py-3 px-4 rounded-xl font-black text-xl flex items-center justify-center gap-2 transition-all ${
              authMethod === 'password'
                ? 'bg-teal-900 text-white shadow-md'
                : 'text-warm-800 hover:text-teal-950 font-bold'
            }`}
          >
            <KeyRound className="w-6 h-6" />
            <span>{t('emailPass')}</span>
          </button>
        </div>

        {/* Error / Fallback Banner */}
        {errorMessage && (
          <div
            role="alert"
            className="mb-6 p-4 rounded-2xl bg-rose-50 border-2 border-rose-300 text-rose-950 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <AlertCircle className="w-7 h-7 text-rose-600 flex-shrink-0" />
              <span className="font-bold text-lg">{errorMessage}</span>
            </div>
            {authMethod === 'face' && (
              <button
                type="button"
                onClick={() => setAuthMethod('password')}
                className="min-h-[48px] px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-base whitespace-nowrap transition-colors"
              >
                Use Password Instead
              </button>
            )}
          </div>
        )}

        {/* Tab 1: Face ID */}
        {authMethod === 'face' && (
          <div className="flex flex-col items-center">
            <FaceCamera
              onCapture={handleFaceSuccess}
              isScanning={isSubmitting}
              requireAveraging={false}
            />
          </div>
        )}

        {/* Tab 2: Email & Password */}
        {authMethod === 'password' && (
          <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-6 max-w-lg mx-auto">
            <div>
              <label htmlFor="email-input" className="block text-xl font-black text-teal-950 mb-2">
                {t('email')}
              </label>
              <input
                id="email-input"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. lakshmi@example.com"
                className="w-full min-h-[56px] px-4 py-3 rounded-2xl border-2 border-warm-300 focus:border-teal-700 bg-white text-xl font-semibold text-warm-900 shadow-sm"
              />
            </div>

            <div>
              <label htmlFor="password-input" className="block text-xl font-black text-teal-950 mb-2">
                {t('password')}
              </label>
              <input
                id="password-input"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full min-h-[56px] px-4 py-3 rounded-2xl border-2 border-warm-300 focus:border-teal-700 bg-white text-xl font-semibold text-warm-900 shadow-sm"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              aria-label="Sign in with email and password"
              className="w-full min-h-[60px] py-3.5 px-6 rounded-2xl bg-teal-900 hover:bg-teal-850 text-white font-black text-2xl shadow-xl flex items-center justify-center gap-3 transition-transform active:scale-98 disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-7 h-7 animate-spin" />
                  <span>{t('loading')}</span>
                </>
              ) : (
                <>
                  <span>{t('signIn')}</span>
                  <ArrowRight className="w-7 h-7" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Register Link */}
        <div className="mt-8 pt-6 border-t-2 border-warm-200 text-center">
          <p className="text-lg font-bold text-warm-800">
            {t('register')}?{' '}
            <Link
              to="/register"
              className="text-teal-850 hover:text-teal-950 font-black underline underline-offset-4 decoration-2"
            >
              Register here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
