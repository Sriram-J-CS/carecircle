import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { Heart, UserCheck, Shield, PhoneCall, Pill, Activity } from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { t } = useLanguage();

  return (
    <div className="flex flex-col items-center justify-center py-6 sm:py-12 px-2 max-w-4xl mx-auto text-center">
      {/* Brand Icon & Heading */}
      <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-teal-900 flex items-center justify-center text-rose-400 shadow-xl mb-6 border-4 border-teal-700">
        <Heart className="w-14 h-14 fill-rose-500 text-rose-500" />
      </div>

      <h1 className="text-4xl sm:text-5xl font-black text-teal-950 tracking-tight mb-4">
        CareCircle
      </h1>

      <p className="text-2xl sm:text-3xl font-extrabold text-teal-850 mb-10 max-w-2xl leading-relaxed">
        &ldquo;{t('tagline')}&rdquo;
      </p>

      {/* Two Giant Buttons */}
      <div className="w-full max-w-md flex flex-col gap-5 mb-14">
        <Link
          to="/login"
          aria-label="Sign in to your CareCircle account"
          className="w-full min-h-[68px] py-4 px-8 rounded-2xl bg-teal-900 hover:bg-teal-850 text-white font-black text-2xl sm:text-3xl shadow-xl flex items-center justify-center gap-3 transition-transform active:scale-98 border-2 border-teal-950"
        >
          <UserCheck className="w-8 h-8 text-teal-300" />
          <span>{t('signIn')}</span>
        </Link>

        <Link
          to="/register"
          aria-label="Register a new CareCircle account"
          className="w-full min-h-[68px] py-4 px-8 rounded-2xl bg-white hover:bg-warm-100 text-teal-950 font-black text-2xl sm:text-3xl shadow-lg flex items-center justify-center gap-3 transition-transform active:scale-98 border-4 border-teal-850"
        >
          <span>{t('register')}</span>
        </Link>
      </div>

      {/* Reassurance cards for elderly and family */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full text-left">
        <div className="elder-card p-6 flex flex-col gap-3">
          <div className="w-12 h-12 rounded-xl bg-teal-100 flex items-center justify-center text-teal-900">
            <UserCheck className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-black text-teal-950">Face ID Sign In</h2>
          <p className="text-base font-semibold text-warm-800">
            No complicated passwords to remember. Just look at the camera to enter safely.
          </p>
        </div>

        <div className="elder-card p-6 flex flex-col gap-3">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-900">
            <Pill className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-black text-teal-950">Pill Reminders</h2>
          <p className="text-base font-semibold text-warm-800">
            Spoken reminders in your language. Shows each tablet one by one with camera verification.
          </p>
        </div>

        <div className="elder-card p-6 flex flex-col gap-3">
          <div className="w-12 h-12 rounded-xl bg-rose-100 flex items-center justify-center text-rose-900">
            <PhoneCall className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-black text-teal-950">Closed-Loop Alerts</h2>
          <p className="text-base font-semibold text-warm-800">
            Instant SMS and voice calls to your family and doctors if you need urgent attention.
          </p>
        </div>
      </div>
    </div>
  );
};
