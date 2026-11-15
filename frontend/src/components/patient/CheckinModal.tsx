import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart,
  Smile,
  Frown,
  Meh,
  SmilePlus,
  AlertCircle,
  Mic,
  MicOff,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  PackageCheck,
  ShoppingBag,
  ArrowRight,
  X,
  Volume2,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { ProgressRing } from '../ui/ProgressRing';
import { EmergencyScreen } from './EmergencyScreen';
import {
  CheckinQuestions,
  CheckinResult,
  PharmacyOffer,
  OfferResult,
  PharmacyDirectoryItem,
  ContactIn,
} from '../../types/api';
import { api } from '../../services/api';
import { speak, startListening } from '../../services/speech';
import { useLanguage } from '../../context/LanguageContext';

interface CheckinModalProps {
  isOpen: boolean;
  onClose: () => void;
  trigger?: 'periodic' | 'post_med' | 'manual' | 'voice';
  emergencyContacts?: ContactIn[];
}

export const CheckinModal: React.FC<CheckinModalProps> = ({
  isOpen,
  onClose,
  trigger = 'manual',
  emergencyContacts = [],
}) => {
  const { language, t } = useLanguage();

  // Step 1 to 5, or 'result'
  const [step, setStep] = useState<number | 'result'>(1);
  const [questions, setQuestions] = useState<CheckinQuestions | null>(null);
  const [pharmacies, setPharmacies] = useState<PharmacyDirectoryItem[]>([]);

  // Answers
  const [feeling, setFeeling] = useState<number>(4);
  const [pain, setPain] = useState<number>(0);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [narrativeText, setNarrativeText] = useState<string>('');
  const [showVitals, setShowVitals] = useState(false);
  const [vitals, setVitals] = useState({
    spo2: '',
    temp_c: '',
    heart_rate: '',
    systolic: '',
    diastolic: '',
    sugar: '',
  });

  // State
  const [isListening, setIsListening] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<CheckinResult | null>(null);
  const [selectedPharmacy, setSelectedPharmacy] = useState<string>('Apollo Pharmacy');
  const [offerResult, setOfferResult] = useState<OfferResult | null>(null);
  const [isRespondingOffer, setIsRespondingOffer] = useState(false);

  const recognitionRef = useRef<{ stop: () => void } | null>(null);

  // Load questions and pharmacies on mount
  useEffect(() => {
    if (isOpen) {
      api.getCheckinQuestions().then(setQuestions).catch(() => {});
      api.getPharmacies().then((list) => {
        setPharmacies(list);
        if (list.length > 0) setSelectedPharmacy(list[0].name);
      }).catch(() => {});
      setStep(1);
      setResult(null);
      setOfferResult(null);
    }
  }, [isOpen]);

  // Read question aloud when step changes
  useEffect(() => {
    if (!isOpen || step === 'result') return;

    let textToSpeak = '';
    if (step === 1) {
      textToSpeak = language === 'ta' ? 'இப்போது உங்கள் உடல்நிலை எப்படி இருக்கிறது?' : language === 'hi' ? 'अभी आप कैसा महसूस कर रहे हैं?' : 'How are you feeling right now?';
    } else if (step === 2) {
      textToSpeak = language === 'ta' ? 'உங்களுக்கு ஏதேனும் வலி உள்ளதா?' : language === 'hi' ? 'क्या आपको कोई दर्द है?' : 'Are you feeling any pain from zero to ten?';
    } else if (step === 3) {
      textToSpeak = language === 'ta' ? 'இந்த அறிகுறிகளில் ஏதேனும் உங்களுக்கு உள்ளதா?' : language === 'hi' ? 'क्या आपको इनमें से कोई लक्षण हैं?' : 'Do you have any of these symptoms?';
    } else if (step === 4) {
      textToSpeak = language === 'ta' ? 'வேறு ஏதேனும் உள்ளதா? உங்கள் குரலில் சொல்லுங்கள்.' : language === 'hi' ? 'कुछ और? बोलकर बताएं।' : 'Anything else you would like to tell me?';
    }
    if (textToSpeak) {
      speak(textToSpeak, language);
    }
  }, [step, isOpen, language]);

  const toggleVoiceInput = () => {
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
      setIsListening(false);
    } else {
      setIsListening(true);
      recognitionRef.current = startListening(language, {
        onResult: (text) => {
          setNarrativeText((prev) => (prev ? `${prev} ${text}` : text));
        },
        onError: () => setIsListening(false),
        onEnd: () => setIsListening(false),
      });
    }
  };

  const handleSymptomToggle = (key: string) => {
    if (key === 'none') {
      setSelectedSymptoms([]);
      return;
    }
    if (selectedSymptoms.includes(key)) {
      setSelectedSymptoms(selectedSymptoms.filter((s) => s !== key));
    } else {
      setSelectedSymptoms([...selectedSymptoms, key]);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const cleanVitals: any = {};
      if (vitals.spo2) cleanVitals.spo2 = Number(vitals.spo2);
      if (vitals.temp_c) cleanVitals.temp_c = Number(vitals.temp_c);
      if (vitals.heart_rate) cleanVitals.heart_rate = Number(vitals.heart_rate);
      if (vitals.systolic) cleanVitals.systolic = Number(vitals.systolic);
      if (vitals.diastolic) cleanVitals.diastolic = Number(vitals.diastolic);
      if (vitals.sugar) cleanVitals.sugar = Number(vitals.sugar);

      const res = await api.submitCheckin({
        feeling,
        pain,
        symptoms: selectedSymptoms,
        text: narrativeText,
        vitals: cleanVitals,
        language,
        trigger,
      });

      setResult(res);
      setStep('result');

      // Speak result message aloud
      if (res.message) {
        speak(res.message, language);
      }
    } catch {
      // fallback
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOfferResponse = async (accept: boolean) => {
    const chkId = result?.checkin_id || result?.id;
    if (!chkId) return;

    setIsRespondingOffer(true);
    try {
      const res = await api.respondToOffer(chkId, {
        accept,
        pharmacy: selectedPharmacy,
      });
      setOfferResult(res);
      if (accept) {
        speak('Your medicine order has been placed. Your family has been notified.', language);
      }
    } catch {
      // ignore
    } finally {
      setIsRespondingOffer(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-ink/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-paper dark:bg-teal-950 border-4 border-teal rounded-3xl max-w-2xl w-full p-6 sm:p-10 relative shadow-2xl my-6"
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-ink/60 dark:text-sand/60 hover:bg-sand/60"
          aria-label="Close check-in"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-mint dark:bg-teal-900 text-teal dark:text-mint text-xs font-bold uppercase tracking-wider mb-2">
            CareCircle Health Check-in
          </div>
          <h2 className="text-3xl font-serif font-bold text-ink dark:text-paper">
            {step === 'result' ? 'Check-in Results' : `Question ${step} of 4`}
          </h2>
        </div>

        {/* STEP 1: Feeling */}
        {step === 1 && (
          <div className="space-y-6 text-center">
            <h3 className="text-2xl font-serif font-semibold text-ink dark:text-paper">
              {t('feeling_question')}
            </h3>

            <div className="grid grid-cols-5 gap-3 py-4">
              {[
                { score: 1, label: 'Very Bad', icon: Frown, color: 'text-clay border-clay/30' },
                { score: 2, label: 'Unwell', icon: Frown, color: 'text-clay/80 border-clay/20' },
                { score: 3, label: 'Okay', icon: Meh, color: 'text-amber-600 border-amber-300' },
                { score: 4, label: 'Good', icon: Smile, color: 'text-teal border-teal/40' },
                { score: 5, label: 'Great', icon: SmilePlus, color: 'text-sage border-sage/40' },
              ].map((item) => {
                const Icon = item.icon;
                const isSelected = feeling === item.score;
                return (
                  <button
                    key={item.score}
                    type="button"
                    onClick={() => setFeeling(item.score)}
                    className={`flex flex-col items-center p-3 sm:p-4 rounded-2xl border-2 transition-all ${
                      isSelected
                        ? 'bg-teal text-white border-teal scale-105 shadow-md'
                        : 'bg-sand/30 dark:bg-ink/40 border-sand dark:border-teal-800 text-ink dark:text-paper hover:bg-sand/50'
                    }`}
                  >
                    <Icon className={`w-8 h-8 sm:w-10 sm:h-10 mb-2 ${isSelected ? 'text-white' : item.color}`} />
                    <span className="text-xs sm:text-sm font-bold">{item.score}</span>
                    <span className="text-[11px] font-medium opacity-80">{item.label}</span>
                  </button>
                );
              })}
            </div>

            <Button size="patient" variant="primary" onClick={() => setStep(2)} className="w-full">
              <span>Next: Check for Pain</span>
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        )}

        {/* STEP 2: Pain */}
        {step === 2 && (
          <div className="space-y-6 text-center">
            <h3 className="text-2xl font-serif font-semibold text-ink dark:text-paper">
              {t('pain_question')}
            </h3>

            <div className="py-4 space-y-4">
              <div className="text-5xl font-serif font-bold text-teal dark:text-mint tabular-nums">
                {pain} <span className="text-lg font-sans font-normal text-ink/60">/ 10</span>
              </div>
              <p className="text-sm text-ink/70 dark:text-sand/70">
                {pain === 0 ? 'No pain at all' : pain <= 3 ? 'Mild discomfort' : pain <= 7 ? 'Moderate pain' : 'Severe pain'}
              </p>

              <input
                type="range"
                min="0"
                max="10"
                value={pain}
                onChange={(e) => setPain(Number(e.target.value))}
                className="w-full h-3 bg-sand rounded-lg appearance-none cursor-pointer accent-teal"
              />

              <div className="flex justify-between text-xs font-bold text-ink/50 dark:text-sand/50">
                <span>0 (No pain)</span>
                <span>5 (Moderate)</span>
                <span>10 (Severe)</span>
              </div>
            </div>

            <div className="flex gap-3">
              <Button size="patient" variant="secondary" onClick={() => setStep(1)} className="w-1/3">
                Back
              </Button>
              <Button size="patient" variant="primary" onClick={() => setStep(3)} className="w-2/3">
                <span>Next: Symptoms</span>
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: Symptoms */}
        {step === 3 && (
          <div className="space-y-6 text-center">
            <h3 className="text-2xl font-serif font-semibold text-ink dark:text-paper">
              {t('symptoms_question')}
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 py-2 text-left max-h-60 overflow-y-auto">
              {(
                questions?.symptoms.options || [
                  { key: 'headache', label: 'Headache' },
                  { key: 'mild_fever', label: 'Mild Fever' },
                  { key: 'chest_pain', label: 'Chest Pain / Pressure' },
                  { key: 'breathlessness', label: 'Shortness of Breath' },
                  { key: 'dizziness', label: 'Dizziness' },
                  { key: 'nausea', label: 'Nausea / Vomiting' },
                  { key: 'fatigue', label: 'Extreme Fatigue' },
                  { key: 'cough', label: 'Persistent Cough' },
                ]
              ).map((sym) => {
                const isSelected = selectedSymptoms.includes(sym.key);
                return (
                  <button
                    key={sym.key}
                    type="button"
                    onClick={() => handleSymptomToggle(sym.key)}
                    className={`p-3.5 rounded-2xl border text-sm font-semibold transition-all ${
                      isSelected
                        ? 'bg-teal text-white border-teal shadow-sm'
                        : 'bg-sand/30 dark:bg-ink/40 border-sand dark:border-teal-800 text-ink dark:text-paper hover:bg-sand/50'
                    }`}
                  >
                    {sym.label}
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => handleSymptomToggle('none')}
                className={`col-span-2 sm:col-span-3 p-3.5 rounded-2xl border text-sm font-bold transition-all ${
                  selectedSymptoms.length === 0
                    ? 'bg-sage text-white border-sage'
                    : 'bg-sand/30 dark:bg-ink/40 border-sand dark:border-teal-800 text-ink/70 dark:text-sand/70'
                }`}
              >
                ✓ {t('none_of_these')}
              </button>
            </div>

            <div className="flex gap-3">
              <Button size="patient" variant="secondary" onClick={() => setStep(2)} className="w-1/3">
                Back
              </Button>
              <Button size="patient" variant="primary" onClick={() => setStep(4)} className="w-2/3">
                <span>Next: Describe</span>
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 4: Voice Transcript & Optional Vitals */}
        {step === 4 && (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-2xl font-serif font-semibold text-ink dark:text-paper mb-1">
                {t('tell_me_more')}
              </h3>
              <p className="text-xs text-ink/60 dark:text-sand/60">
                You can speak in English, Tamil, or Hindi using the microphone.
              </p>
            </div>

            <div className="relative">
              <textarea
                value={narrativeText}
                onChange={(e) => setNarrativeText(e.target.value)}
                rows={3}
                placeholder="e.g. I have a headache and mild fever since yesterday..."
                className="w-full p-4 rounded-2xl bg-sand/30 dark:bg-ink/50 border border-sand dark:border-teal-800 text-base text-ink dark:text-paper placeholder:text-ink/40 focus:outline-none focus:ring-2 focus:ring-teal"
              />
              <button
                type="button"
                onClick={toggleVoiceInput}
                className={`absolute bottom-3 right-3 p-3 rounded-full transition-transform ${
                  isListening
                    ? 'bg-clay text-white shadow-lg animate-pulse scale-105'
                    : 'bg-mint dark:bg-teal-900 text-teal dark:text-mint'
                }`}
                aria-label="Toggle voice input"
              >
                {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>
            </div>

            {/* Collapsible Vitals */}
            <div className="border border-sand dark:border-teal-800 rounded-2xl overflow-hidden">
              <button
                type="button"
                onClick={() => setShowVitals(!showVitals)}
                className="w-full p-3.5 bg-sand/20 dark:bg-ink/30 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-ink/70 dark:text-sand/70"
              >
                <span>Optional Health Vitals (BP, Oxygen, Sugar)</span>
                {showVitals ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showVitals && (
                <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-3 bg-paper dark:bg-teal-950/40">
                  <div>
                    <label className="text-[11px] font-bold text-ink/60 dark:text-sand/60">SpO2 (%)</label>
                    <input
                      type="number"
                      placeholder="98"
                      value={vitals.spo2}
                      onChange={(e) => setVitals({ ...vitals, spo2: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-sand/30 border border-sand text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-ink/60 dark:text-sand/60">Temp (°C)</label>
                    <input
                      type="number"
                      placeholder="37.0"
                      value={vitals.temp_c}
                      onChange={(e) => setVitals({ ...vitals, temp_c: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-sand/30 border border-sand text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-ink/60 dark:text-sand/60">Heart Rate (bpm)</label>
                    <input
                      type="number"
                      placeholder="76"
                      value={vitals.heart_rate}
                      onChange={(e) => setVitals({ ...vitals, heart_rate: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-sand/30 border border-sand text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-ink/60 dark:text-sand/60">BP Systolic</label>
                    <input
                      type="number"
                      placeholder="120"
                      value={vitals.systolic}
                      onChange={(e) => setVitals({ ...vitals, systolic: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-sand/30 border border-sand text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-ink/60 dark:text-sand/60">BP Diastolic</label>
                    <input
                      type="number"
                      placeholder="80"
                      value={vitals.diastolic}
                      onChange={(e) => setVitals({ ...vitals, diastolic: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-sand/30 border border-sand text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-ink/60 dark:text-sand/60">Blood Sugar (mg/dL)</label>
                    <input
                      type="number"
                      placeholder="110"
                      value={vitals.sugar}
                      onChange={(e) => setVitals({ ...vitals, sugar: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-sand/30 border border-sand text-sm"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <Button size="patient" variant="secondary" onClick={() => setStep(3)} className="w-1/3">
                Back
              </Button>
              <Button
                size="patient"
                variant="primary"
                onClick={handleSubmit}
                isLoading={isSubmitting}
                className="w-2/3"
              >
                <span>{t('submit_checkin')}</span>
                <CheckCircle2 className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP: RESULT */}
        {step === 'result' && result && (
          <div className="space-y-6">
            {/* EMERGENCY LEVEL */}
            {result.level === 'emergency' ? (
              <EmergencyScreen
                contacts={emergencyContacts}
                reasons={result.analysis?.reasons}
                onDismiss={onClose}
              />
            ) : (
              /* NORMAL or ATTENTION LEVEL */
              <div className="space-y-6 text-center">
                <div className="flex flex-col items-center justify-center gap-3">
                  <ProgressRing
                    value={result.score}
                    size={130}
                    strokeWidth={10}
                    color={result.level === 'normal' ? '#3F8F5B' : '#D9922B'}
                  />
                  <div>
                    <h3
                      className={`text-2xl font-serif font-bold ${
                        result.level === 'normal' ? 'text-sage' : 'text-amber-700 dark:text-amber-400'
                      }`}
                    >
                      {result.level === 'normal' ? t('checkin_good') : t('checkin_attention')}
                    </h3>
                    <p className="text-base text-ink/80 dark:text-sand/80 max-w-md mx-auto mt-2">
                      {result.message}
                    </p>
                  </div>
                </div>

                {/* Tips */}
                {result.tips && result.tips.length > 0 && (
                  <div className="bg-sand/30 dark:bg-ink/40 border border-sand dark:border-teal-800 rounded-2xl p-4 text-left space-y-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-teal dark:text-mint">
                      Recommendations:
                    </span>
                    <ul className="list-disc pl-5 space-y-1 text-sm text-ink/80 dark:text-sand/80">
                      {result.tips.map((tip, idx) => (
                        <li key={idx}>{tip}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* PHARMACY OFFER FOR ATTENTION */}
                {result.level === 'attention' && result.offer && (
                  <div className="bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-800 rounded-3xl p-5 text-left space-y-4">
                    <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-serif font-bold text-lg">
                      <ShoppingBag className="w-5 h-5" />
                      <span>Suggested Comfort Medication</span>
                    </div>

                    <p className="text-sm text-ink/80 dark:text-sand/80">
                      Our clinical assistant suggests the following over-the-counter relief items:
                    </p>

                    <div className="bg-paper dark:bg-ink/60 rounded-xl p-3 border border-amber-200 dark:border-amber-900/60 font-semibold text-sm text-ink dark:text-paper">
                      {result.offer.items.join(', ')}
                    </div>

                    {/* Pharmacy Switcher */}
                    <div>
                      <label className="block text-xs font-bold text-ink/70 dark:text-sand/70 mb-1">
                        Select Preferred Pharmacy Partner:
                      </label>
                      <select
                        value={selectedPharmacy}
                        onChange={(e) => setSelectedPharmacy(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-paper dark:bg-teal-900 border border-amber-300 dark:border-amber-700 text-sm font-semibold"
                      >
                        {pharmacies.map((p) => (
                          <option key={p.name} value={p.name}>
                            {p.name} (ETA ~{p.eta_mins} mins)
                          </option>
                        ))}
                      </select>
                    </div>

                    {offerResult ? (
                      <div className="bg-sage/15 border border-sage/40 rounded-2xl p-4 text-center space-y-2">
                        <PackageCheck className="w-8 h-8 text-sage mx-auto" />
                        <h4 className="font-serif font-bold text-lg text-sage">
                          Order Confirmed!
                        </h4>
                        <p className="text-xs text-ink/80 dark:text-sand/80">
                          Ref: <span className="font-mono font-bold">{offerResult.order?.reference}</span> • ETA: {offerResult.order?.eta}
                        </p>
                        <p className="text-xs text-sage font-medium">
                          Your family has been informed of this order.
                        </p>
                      </div>
                    ) : (
                      <div className="flex gap-3 pt-2">
                        <Button
                          size="patient"
                          variant="primary"
                          onClick={() => handleOfferResponse(true)}
                          isLoading={isRespondingOffer}
                          className="w-2/3 text-lg"
                        >
                          {t('yes_order')}
                        </Button>
                        <Button
                          size="patient"
                          variant="secondary"
                          onClick={() => handleOfferResponse(false)}
                          disabled={isRespondingOffer}
                          className="w-1/3 text-base"
                        >
                          {t('no_thanks')}
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                <Button size="patient" variant="primary" onClick={onClose} className="w-full">
                  Complete & Return Home
                </Button>
              </div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
};
