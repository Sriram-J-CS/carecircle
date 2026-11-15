import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { careApi } from '../../services/api';
import {
  Activity,
  Footprints,
  Utensils,
  Navigation,
  Volume2,
  VolumeX,
  Plus,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import toast from 'react-hot-toast';

export const LifestylePage: React.FC = () => {
  const { user } = useAuth();
  const { t, speak, stopSpeaking } = useLanguage();

  const [plan, setPlan] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingWalk, setIsLoggingWalk] = useState(false);
  const [walkAddKm, setWalkAddKm] = useState('0.5');
  const [isSpeakingPlan, setIsSpeakingPlan] = useState(false);

  const loadPlan = useCallback(async () => {
    if (!user) return;
    try {
      setIsLoading(true);
      const res = await careApi.getLifestylePlan(user.id);
      setPlan(res);
    } catch (err: any) {
      toast.error('Failed to load lifestyle plan: ' + (err.message || 'Error'));
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadPlan();
  }, [loadPlan]);

  const handleLogWalk = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(walkAddKm);
    if (isNaN(val) || val <= 0) {
      toast.error('Please enter a valid distance in kilometers.');
      return;
    }

    try {
      setIsLoggingWalk(true);
      await careApi.logActivity({
        kind: 'walking',
        value: val,
        unit: 'km',
      });
      toast.success(`Logged ${val} km! Well done!`);
      speak(`Excellent! You logged ${val} kilometers of walking.`);
      loadPlan();
    } catch (err: any) {
      toast.error(err.message || 'Could not log walking');
    } finally {
      setIsLoggingWalk(false);
    }
  };

  const handleReadAloud = () => {
    if (isSpeakingPlan) {
      stopSpeaking();
      setIsSpeakingPlan(false);
      return;
    }

    if (!plan) return;
    const modeText =
      plan.mode === 'rest'
        ? t('restMode')
        : plan.mode === 'light'
        ? t('lightMode')
        : t('normalMode');

    const exerciseText = plan.exercise?.plan?.join('. ') || '';
    const walkText = `Your step goal today is ${plan.walking?.step_goal || 0} steps. You have walked ${plan.walking?.walked_today_km || 0} kilometers so far.`;
    const foodText = `Recommended foods: ${plan.food?.eat?.slice(0, 3).join(', ')}. Please avoid ${plan.food?.avoid?.slice(0, 2).join(', ')}.`;

    const fullSpeech = `${modeText}. ${walkText} ${exerciseText} ${foodText}`;
    setIsSpeakingPlan(true);
    speak(fullSpeech);
  };

  if (isLoading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center gap-4 text-warm-800">
        <Loader2 className="w-12 h-12 animate-spin text-teal-800" />
        <p className="text-2xl font-black">{t('loading')}</p>
      </div>
    );
  }

  const mode = plan?.mode || 'normal';
  const modeBadge =
    mode === 'rest'
      ? {
          title: t('restMode'),
          desc: 'Listen to your body today. Sit or lie comfortably and avoid overexertion.',
          bg: 'bg-indigo-50 border-indigo-400 text-indigo-950',
          icon: '🛌',
        }
      : mode === 'light'
      ? {
          title: t('lightMode'),
          desc: 'Keep movements gentle. Short strolls inside the home and seated stretches are ideal.',
          bg: 'bg-amber-50 border-amber-400 text-amber-950',
          icon: '🌤️',
        }
      : {
          title: t('normalMode'),
          desc: 'Great energy today! Complete your daily walk, stay hydrated, and follow your routine.',
          bg: 'bg-emerald-50 border-emerald-400 text-emerald-950',
          icon: '🌟',
        };

  return (
    <div className="space-y-8 pb-20 max-w-5xl mx-auto">
      {/* Header & Voice Readout */}
      <div className="elder-card p-6 sm:p-8 bg-gradient-to-r from-teal-900 to-teal-850 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
        <div>
          <span className="text-xs sm:text-sm font-black uppercase tracking-widest text-teal-300">
            CareCircle Daily Wellness
          </span>
          <h1 className="text-3xl sm:text-5xl font-black mt-1">
            {t('lifestyle')} &amp; Wellness Plan
          </h1>
          <p className="text-lg font-bold text-teal-100 mt-1">
            Personalized guidance based on your age and health check-ins.
          </p>
        </div>

        <button
          type="button"
          onClick={handleReadAloud}
          aria-label={isSpeakingPlan ? 'Stop reading wellness plan' : 'Read wellness plan aloud'}
          className="min-h-[56px] px-6 py-3 rounded-2xl bg-teal-800 hover:bg-teal-700 text-white font-black text-lg flex items-center justify-center gap-3 border-2 border-teal-500 shadow-md touch-target transition-all"
        >
          {isSpeakingPlan ? (
            <>
              <VolumeX className="w-6 h-6 text-rose-300" />
              <span>Stop Speaking</span>
            </>
          ) : (
            <>
              <Volume2 className="w-6 h-6 text-teal-200" />
              <span>Listen to Plan</span>
            </>
          )}
        </button>
      </div>

      {/* Mode Banner */}
      <section
        role="region"
        aria-label="Today's Activity Mode"
        className={`p-6 sm:p-8 rounded-3xl border-4 ${modeBadge.bg} shadow-md flex items-start gap-4 sm:gap-6 animate-in fade-in`}
      >
        <span className="text-5xl select-none" role="img" aria-hidden="true">
          {modeBadge.icon}
        </span>
        <div className="flex-1">
          <span className="text-xs font-black uppercase tracking-widest opacity-80">
            Daily Activity Mode
          </span>
          <h2 className="text-2xl sm:text-3xl font-black mt-0.5 mb-1">
            {modeBadge.title}
          </h2>
          <p className="text-lg sm:text-xl font-bold opacity-90 leading-relaxed">
            {modeBadge.desc}
          </p>
        </div>
      </section>

      {/* 4 Core Lifestyle Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
        {/* ================= 1. WALKING CARD ================= */}
        <section aria-labelledby="walking-heading" className="elder-card p-6 sm:p-8 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-900 flex items-center justify-center">
                <Footprints className="w-7 h-7 text-emerald-800" />
              </div>
              <div>
                <h3 id="walking-heading" className="text-2xl sm:text-3xl font-black text-teal-950">
                  {t('walking')}
                </h3>
                <p className="text-sm font-bold text-warm-700">Daily Steps &amp; Distance</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="p-4 rounded-2xl bg-warm-50 border-2 border-warm-200 text-center">
                <p className="text-xs font-black uppercase text-warm-700">Target Goal</p>
                <p className="text-3xl font-black text-teal-950 mt-1">
                  {plan?.walking?.step_goal ?? 0}
                </p>
                <p className="text-xs font-bold text-warm-600">steps ({plan?.walking?.distance_km ?? 0} km)</p>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50 border-2 border-emerald-200 text-center">
                <p className="text-xs font-black uppercase text-emerald-800">Walked Today</p>
                <p className="text-3xl font-black text-emerald-950 mt-1">
                  {plan?.walking?.walked_today_km ?? 0}
                </p>
                <p className="text-xs font-bold text-emerald-700">km completed</p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1.5 mb-6">
              <div className="flex justify-between text-xs font-black text-warm-800">
                <span>Progress</span>
                <span>
                  {plan?.walking?.remaining_km > 0
                    ? `${plan.walking.remaining_km} km remaining`
                    : 'Goal reached! 🎉'}
                </span>
              </div>
              <div className="w-full h-4 bg-warm-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(
                      100,
                      ((plan?.walking?.walked_today_km || 0) / (plan?.walking?.distance_km || 1)) * 100
                    )}%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Quick Walk Log Form */}
          <form
            onSubmit={handleLogWalk}
            className="pt-4 border-t-2 border-warm-200 flex flex-col sm:flex-row items-center gap-3"
          >
            <div className="w-full sm:flex-1">
              <label htmlFor="log-walk-km" className="sr-only">
                Kilometers walked
              </label>
              <div className="flex rounded-xl border-2 border-warm-300 overflow-hidden focus-within:border-teal-700">
                <input
                  id="log-walk-km"
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="10"
                  value={walkAddKm}
                  onChange={(e) => setWalkAddKm(e.target.value)}
                  className="w-full px-3 py-2.5 text-lg font-black text-teal-950 outline-none"
                  aria-label="Kilometers walked"
                />
                <span className="px-3 py-2.5 bg-warm-100 font-black text-warm-700 text-sm flex items-center">
                  km
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoggingWalk}
              className="w-full sm:w-auto min-h-[48px] px-6 py-2.5 rounded-xl bg-teal-850 hover:bg-teal-900 text-white font-black text-base flex items-center justify-center gap-2 touch-target shadow-md disabled:opacity-60"
            >
              {isLoggingWalk ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
              {t('logWalk')}
            </button>
          </form>
        </section>

        {/* ================= 2. EXERCISE CARD ================= */}
        <section aria-labelledby="exercise-heading" className="elder-card p-6 sm:p-8 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-teal-100 text-teal-900 flex items-center justify-center">
                <Activity className="w-7 h-7 text-teal-850" />
              </div>
              <div>
                <h3 id="exercise-heading" className="text-2xl sm:text-3xl font-black text-teal-950">
                  {t('exercise')}
                </h3>
                <p className="text-sm font-bold text-warm-700">
                  {plan?.exercise?.daily_minutes_walking
                    ? `${plan.exercise.daily_minutes_walking} mins walking + stretches`
                    : 'Gentle mobility routine'}
                </p>
              </div>
            </div>

            <ul className="space-y-3 mt-4">
              {plan?.exercise?.plan?.map((item: string, idx: number) => (
                <li
                  key={idx}
                  className="p-3.5 rounded-2xl bg-warm-50 border-2 border-warm-200 flex items-start gap-3"
                >
                  <span className="w-7 h-7 rounded-full bg-teal-200 text-teal-950 font-black text-sm flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <span className="text-base sm:text-lg font-bold text-teal-950 leading-snug">
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-6 pt-4 border-t-2 border-warm-200 text-xs font-bold text-warm-700 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-teal-700 shrink-0" />
            <span>Move at your own pace. Stop immediately if you experience dizziness or shortness of breath.</span>
          </div>
        </section>

        {/* ================= 3. FOOD & NUTRITION CARD ================= */}
        <section aria-labelledby="food-heading" className="elder-card p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center">
              <Utensils className="w-7 h-7 text-amber-800" />
            </div>
            <div>
              <h3 id="food-heading" className="text-2xl sm:text-3xl font-black text-teal-950">
                {t('food')}
              </h3>
              <p className="text-sm font-bold text-warm-700">Eat &amp; Avoid Guidelines</p>
            </div>
          </div>

          <div className="space-y-4 mt-4">
            {/* Eat List */}
            <div className="p-4 rounded-2xl bg-emerald-50/70 border-2 border-emerald-300">
              <div className="flex items-center gap-2 text-emerald-950 font-black text-lg mb-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-700" />
                <span>{t('eat')}</span>
              </div>
              <ul className="space-y-1.5 pl-2">
                {plan?.food?.eat?.map((item: string, idx: number) => (
                  <li key={idx} className="text-base font-bold text-warm-900 flex items-start gap-2">
                    <span className="text-emerald-700 font-black">&bull;</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Avoid List */}
            <div className="p-4 rounded-2xl bg-rose-50/70 border-2 border-rose-300">
              <div className="flex items-center gap-2 text-rose-950 font-black text-lg mb-2">
                <XCircle className="w-5 h-5 text-rose-700" />
                <span>{t('avoid')}</span>
              </div>
              <ul className="space-y-1.5 pl-2">
                {plan?.food?.avoid?.map((item: string, idx: number) => (
                  <li key={idx} className="text-base font-bold text-warm-900 flex items-start gap-2">
                    <span className="text-rose-700 font-black">&bull;</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ================= 4. TRAVEL CARD ================= */}
        <section aria-labelledby="travel-heading" className="elder-card p-6 sm:p-8 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-sky-100 text-sky-900 flex items-center justify-center">
                <Navigation className="w-7 h-7 text-sky-800" />
              </div>
              <div>
                <h3 id="travel-heading" className="text-2xl sm:text-3xl font-black text-teal-950">
                  {t('travel')}
                </h3>
                <p className="text-sm font-bold text-warm-700">Limits &amp; Safety Precautions</p>
              </div>
            </div>

            {/* Max Trip Limit */}
            <div className="p-4 rounded-2xl bg-sky-50 border-2 border-sky-200 mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-black uppercase text-sky-900">Recommended Max One-Way Trip</p>
                <p className="text-3xl font-black text-sky-950 mt-0.5">
                  {plan?.travel?.max_one_way_km ?? 0} km
                </p>
              </div>
              <span className="text-3xl select-none" role="img" aria-hidden="true">
                🚗
              </span>
            </div>

            {/* Tips List */}
            <div className="space-y-2.5">
              <p className="text-sm font-black uppercase tracking-wide text-warm-700">
                Safe Journey Rules:
              </p>
              <ul className="space-y-2">
                {plan?.travel?.tips?.map((tip: string, idx: number) => (
                  <li
                    key={idx}
                    className="p-3 rounded-xl bg-warm-50 border border-warm-200 text-sm sm:text-base font-bold text-warm-900 flex items-start gap-2.5"
                  >
                    <span className="text-sky-700 font-black mt-0.5">&bull;</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t-2 border-warm-200 text-xs font-bold text-warm-700">
            {plan?.disclaimer || t('disclaimer')}
          </div>
        </section>
      </div>
    </div>
  );
};
