import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldCheck, Camera, BellRing, HeartHandshake, ArrowRight, Activity, Users, Stethoscope } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ElderIllustration } from '../components/illustrations/ElderIllustration';
import { FamilyIllustration } from '../components/illustrations/FamilyIllustration';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export const LandingPage: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleStart = () => {
    if (isAuthenticated && user) {
      if (user.role === 'patient') navigate('/home');
      else if (user.role === 'relative') navigate('/family');
      else if (user.role === 'doctor') navigate('/doctor');
    } else {
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen bg-sand/20 dark:bg-ink text-ink dark:text-paper selection:bg-mint selection:text-teal">
      {/* Editorial Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 sm:pt-20 sm:pb-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Column: Editorial Headline & Copy */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="lg:col-span-7 space-y-6"
            >
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-mint dark:bg-teal-900/60 text-teal dark:text-mint text-sm font-semibold border border-teal/15 dark:border-teal-700">
                <span className="w-2 h-2 rounded-full bg-teal animate-pulse" />
                Designed for Elders across India
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif font-bold text-ink dark:text-paper leading-[1.15] tracking-tight">
                Every single hour, someone who loves them knows they are safe.
              </h1>

              <p className="text-xl sm:text-2xl font-serif text-teal dark:text-mint/90 italic">
                Caring for your parents with dignified independence.
              </p>

              <p className="text-lg text-ink/75 dark:text-sand/80 font-sans leading-relaxed max-w-2xl">
                CareCircle combines gentle pill-camera verification, 6-hourly AI check-ins, and direct family reassurance into one calm, elder-first experience. No complex menus — just high-contrast cards, spoken instructions, and loving supervision.
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-4">
                <Button size="patient" variant="primary" onClick={handleStart} className="px-8 shadow-md">
                  <span>{isAuthenticated ? 'Open My Dashboard' : 'Get Started with Face ID'}</span>
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>

                <Button size="patient" variant="secondary" onClick={() => navigate('/register')} className="px-6">
                  <span>Register a Family Member</span>
                </Button>
              </div>

              <div className="flex items-center gap-6 pt-4 text-sm text-ink/60 dark:text-sand/60">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-teal dark:text-mint" />
                  <span>Face ID Instant Login</span>
                </div>
                <div className="flex items-center gap-2">
                  <HeartHandshake className="w-4 h-4 text-teal dark:text-mint" />
                  <span>Tamil, Hindi & English</span>
                </div>
              </div>
            </motion.div>

            {/* Right Column: Hero Illustration */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="lg:col-span-5 flex justify-center"
            >
              <div className="relative w-full max-w-md bg-paper dark:bg-teal-900/30 border border-sand dark:border-teal-800 rounded-3xl p-6 sm:p-8 shadow-soft">
                <div className="absolute -top-3 -right-3 bg-teal text-paper text-xs font-bold px-3 py-1.5 rounded-full shadow-sm">
                  Elder-Friendly UX
                </div>
                <ElderIllustration className="w-full h-auto drop-shadow-sm" />
                <div className="mt-6 bg-sand/30 dark:bg-ink/40 rounded-2xl p-4 border border-sand/60 dark:border-teal-900/60 flex items-center justify-between">
                  <div>
                    <span className="text-xs uppercase tracking-wider text-ink/50 dark:text-sand/50 font-bold">
                      Next Scheduled Dose
                    </span>
                    <h4 className="text-lg font-serif font-bold text-ink dark:text-paper">
                      Telma 40 mg (Morning)
                    </h4>
                    <p className="text-xs text-ink/60 dark:text-sand/60">After breakfast • 8:00 AM</p>
                  </div>
                  <span className="w-10 h-10 rounded-full bg-mint text-teal flex items-center justify-center font-bold">
                    ✓
                  </span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Trust Strip */}
      <section className="border-y border-sand dark:border-teal-900/60 bg-paper/60 dark:bg-teal-950/40 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <p className="text-xs font-bold tracking-widest text-ink/50 dark:text-sand/50 uppercase">
            Integrated Pharmacy & Healthcare Delivery Networks Across India
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-14 font-serif text-lg font-semibold text-ink/70 dark:text-sand/70">
            <span>Apollo Pharmacy</span>
            <span>MedPlus</span>
            <span>Tata 1mg</span>
            <span>PharmEasy</span>
            <span>Netmeds</span>
            <span>Apollo Hospitals</span>
            <span>Fortis</span>
          </div>
        </div>
      </section>

      {/* 3-Step How It Works */}
      <section className="py-20 sm:py-28 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <h2 className="text-3xl sm:text-4xl font-serif font-bold text-ink dark:text-paper">
            How CareCircle Keeps Families Calm
          </h2>
          <p className="text-lg text-ink/75 dark:text-sand/80">
            A continuous loop of care designed around the natural rhythms of daily life in Indian households.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card className="p-8 space-y-5 border-sand dark:border-teal-800">
            <div className="w-14 h-14 rounded-2xl bg-mint dark:bg-teal-900 text-teal dark:text-mint flex items-center justify-center">
              <Camera className="w-7 h-7" />
            </div>
            <div className="space-y-2">
              <span className="text-xs font-bold tracking-wider text-teal dark:text-mint uppercase">
                Step 1: Medication
              </span>
              <h3 className="text-2xl font-serif font-bold text-ink dark:text-paper">
                Pill Camera Verification
              </h3>
              <p className="text-ink/70 dark:text-sand/70 text-base leading-relaxed">
                When it is time for medicine, a gentle chime sounds. The elder holds the tablet up to the camera, takes it with water, and the system confirms the dose automatically.
              </p>
            </div>
          </Card>

          <Card className="p-8 space-y-5 border-sand dark:border-teal-800">
            <div className="w-14 h-14 rounded-2xl bg-mint dark:bg-teal-900 text-teal dark:text-mint flex items-center justify-center">
              <Activity className="w-7 h-7" />
            </div>
            <div className="space-y-2">
              <span className="text-xs font-bold tracking-wider text-teal dark:text-mint uppercase">
                Step 2: AI Check-In
              </span>
              <h3 className="text-2xl font-serif font-bold text-ink dark:text-paper">
                6-Hourly Voice Health Triage
              </h3>
              <p className="text-ink/70 dark:text-sand/70 text-base leading-relaxed">
                Friendly questions ask how they feel in their native language. Our AI detects early warning signs, computes a risk score, and arranges OTC pharmacy relief if needed.
              </p>
            </div>
          </Card>

          <Card className="p-8 space-y-5 border-sand dark:border-teal-800">
            <div className="w-14 h-14 rounded-2xl bg-mint dark:bg-teal-900 text-teal dark:text-mint flex items-center justify-center">
              <Users className="w-7 h-7" />
            </div>
            <div className="space-y-2">
              <span className="text-xs font-bold tracking-wider text-teal dark:text-mint uppercase">
                Step 3: Family Connection
              </span>
              <h3 className="text-2xl font-serif font-bold text-ink dark:text-paper">
                Total Reassurance for Loved Ones
              </h3>
              <p className="text-ink/70 dark:text-sand/70 text-base leading-relaxed">
                Relatives receive real-time notifications on doses taken, health scores, and critical alerts. A single tap lets them respond: "I am on it."
              </p>
            </div>
          </Card>
        </div>
      </section>

      {/* Safety & Clinical Disclaimer Strip */}
      <section className="bg-sand/40 dark:bg-teal-950/30 border-y border-sand dark:border-teal-900 py-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <div className="inline-flex items-center gap-2 text-teal dark:text-mint font-semibold text-sm">
            <Stethoscope className="w-5 h-5" />
            <span>Clinical Decision Support</span>
          </div>
          <h3 className="text-2xl font-serif font-bold text-ink dark:text-paper">
            CareCircle is a companion, not a replacement for medical diagnosis.
          </h3>
          <p className="text-base text-ink/70 dark:text-sand/70 max-w-3xl mx-auto leading-relaxed">
            All AI health scores and risk indicators are designed to support family caregivers and consulting physicians. In acute medical crises, our instant SOS button directly connects to 112 emergency services and designated family contacts.
          </p>
          <div className="pt-2">
            <Link to="/design" className="text-sm font-semibold text-teal dark:text-mint hover:underline">
              Inspect Design System & Components →
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-paper dark:bg-ink text-center text-sm text-ink/60 dark:text-sand/60">
        <div className="max-w-7xl mx-auto px-4 space-y-4">
          <p className="font-serif text-lg font-bold text-ink dark:text-paper">CareCircle India</p>
          <p>© 2026 CareCircle. Dedicated to the health, dignity, and safety of our elders.</p>
        </div>
      </footer>
    </div>
  );
};
