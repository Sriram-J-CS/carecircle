import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Footprints, Dumbbell, Apple, Plane, Plus, CheckCircle2, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { LifestylePlan } from '../../types/api';
import { api } from '../../services/api';

export const LifestylePage: React.FC = () => {
  const [plan, setPlan] = useState<LifestylePlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [walkKm, setWalkKm] = useState('1.5');
  const [isLogging, setIsLogging] = useState(false);
  const [logSuccess, setLogSuccess] = useState(false);

  const loadData = async () => {
    try {
      const data = await api.getPatientLifestyle('me');
      setPlan(data);
    } catch {
      // non-fatal
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleLogWalk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walkKm || isNaN(Number(walkKm))) return;
    setIsLogging(true);
    try {
      await api.logPatientActivity('me', {
        kind: 'walking',
        value: Number(walkKm),
        unit: 'km',
      });
      setLogSuccess(true);
      setTimeout(() => setLogSuccess(false), 3000);
      loadData();
    } catch {
      // ignore
    } finally {
      setIsLogging(false);
    }
  };

  return (
    <div className="min-h-screen bg-sand/20 dark:bg-ink py-8 px-4 sm:px-6 lg:px-8 text-ink dark:text-paper pb-20">
      <div className="max-w-4xl mx-auto space-y-6">
        <Link
          to="/home"
          className="inline-flex items-center gap-2 text-sm font-semibold text-teal dark:text-mint hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>

        {/* Mode Banner */}
        <div
          className={`p-6 rounded-3xl border-2 text-center shadow-soft ${
            plan?.mode === 'rest'
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200'
              : plan?.mode === 'light'
              ? 'bg-mint/40 border-teal/20 text-teal-900 dark:text-mint'
              : 'bg-sage/15 border-sage/40 text-sage-900 dark:text-sage-200'
          }`}
        >
          <span className="text-xs font-bold uppercase tracking-widest block mb-1">
            Daily Activity Mode
          </span>
          <h2 className="text-3xl font-serif font-bold">
            {plan?.mode_banner || 'Today is a balanced, active day'}
          </h2>
        </div>

        {/* 4 Big Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Walking Card */}
          <Card className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-mint dark:bg-teal-900 text-teal dark:text-mint flex items-center justify-center">
                <Footprints className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-2xl font-serif font-bold">Daily Walking</h3>
                <p className="text-xs text-ink/60 dark:text-sand/60">
                  Target: {plan?.walking.daily_goal_km || 2.5} km (~{plan?.walking.daily_goal_steps || 3500} steps)
                </p>
              </div>
            </div>

            <div className="bg-sand/30 dark:bg-ink/40 rounded-2xl p-4 flex items-center justify-between">
              <span className="text-sm font-medium">Walked Today:</span>
              <span className="text-3xl font-serif font-bold text-teal dark:text-mint tabular-nums">
                {plan?.walking.walked_today_km || 0} km
              </span>
            </div>

            <form onSubmit={handleLogWalk} className="flex gap-2">
              <input
                type="number"
                step="0.1"
                placeholder="km walked"
                value={walkKm}
                onChange={(e) => setWalkKm(e.target.value)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-paper dark:bg-teal-950 border border-sand dark:border-teal-800 text-sm font-semibold"
              />
              <Button type="submit" variant="primary" isLoading={isLogging}>
                <Plus className="w-4 h-4 mr-1" />
                <span>Log Walk</span>
              </Button>
            </form>

            {logSuccess && (
              <p className="text-xs text-sage font-bold flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Walk recorded successfully!
              </p>
            )}
          </Card>

          {/* Exercise Card */}
          <Card className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-mint dark:bg-teal-900 text-teal dark:text-mint flex items-center justify-center">
                <Dumbbell className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-2xl font-serif font-bold">Gentle Exercise</h3>
                <p className="text-xs text-ink/60 dark:text-sand/60">
                  Recommended: {plan?.exercise.minutes_recommended || 20} mins daily
                </p>
              </div>
            </div>

            <ul className="space-y-2 text-sm text-ink/80 dark:text-sand/80">
              {(plan?.exercise.list || [
                'Joint rotations and arm stretches (seated)',
                'Pranayama / Deep rhythmic breathing',
                'Ankle circles and gentle calf raises',
              ]).map((ex, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-teal shrink-0" />
                  <span>{ex}</span>
                </li>
              ))}
            </ul>
          </Card>

          {/* Food Nutrition Card */}
          <Card className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-mint dark:bg-teal-900 text-teal dark:text-mint flex items-center justify-center">
                <Apple className="w-7 h-7" />
              </div>
              <h3 className="text-2xl font-serif font-bold">Diet Guidance</h3>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-sage block mb-1">
                  Recommended to Eat:
                </span>
                <p className="text-ink/80 dark:text-sand/80 text-xs">
                  {(plan?.food.eat || ['Steamed idlis with coconut chutney', 'Fresh papaya & pomegranate', 'Warm cumin water', 'Vegetable khichdi']).join(', ')}
                </p>
              </div>

              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-clay block mb-1">
                  Foods to Limit / Avoid:
                </span>
                <p className="text-ink/80 dark:text-sand/80 text-xs">
                  {(plan?.food.avoid || ['Deep-fried snacks (vada, bajji)', 'Excess salt & pickles', 'Heavy late-night meals']).join(', ')}
                </p>
              </div>
            </div>
          </Card>

          {/* Travel & Mobility Card */}
          <Card className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-mint dark:bg-teal-900 text-teal dark:text-mint flex items-center justify-center">
                <Plane className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-2xl font-serif font-bold">Travel & Mobility</h3>
                <p className="text-xs text-ink/60 dark:text-sand/60">
                  Max one-way trip: {plan?.travel.max_oneway_km || 40} km
                </p>
              </div>
            </div>

            <ul className="space-y-2 text-xs text-ink/80 dark:text-sand/80">
              {(plan?.travel.tips || [
                'Always carry hydration and immediate medication kit',
                'Avoid travel during peak afternoon heat (12 PM - 3 PM)',
                'Ensure family is notified before any out-of-town trip',
              ]).map((tip, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-teal shrink-0" />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
};
