import React, { useEffect, useState } from 'react';
import {
  Heart,
  Smile,
  Frown,
  Meh,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Phone,
  PhoneCall,
  X,
  Mic,
  Loader2,
  ShoppingBag,
  ShieldAlert,
  Volume2,
  ChevronDown,
  ChevronUp,
  PackageCheck,
  Check,
} from 'lucide-react';
import { patientApi, directoryApi } from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import { EmergencyScreen } from './EmergencyScreen';
import { Pharmacy } from '../../types/api';
import toast from 'react-hot-toast';

const PHARMACY_OPTIONS = [
  'Apollo Pharmacy',
  'MedPlus',
  'Tata 1mg',
  'PharmEasy',
  'Netmeds',
];

interface CheckinModalProps {
  isOpen: boolean;
  onClose: () => void;
  trigger?: 'periodic' | 'post_med' | 'manual' | 'voice';
  onCheckinSubmitted?: () => void;
}

export const CheckinModal: React.FC<CheckinModalProps> = ({
  isOpen,
  onClose,
  trigger = 'manual',
  onCheckinSubmitted,
}) => {
  const { language, t, speak } = useLanguage();

  // 1. Feeling (1 to 5)
  const [feeling, setFeeling] = useState<number>(4);

  // 2. Pain (0 to 10)
  const [pain, setPain] = useState<number>(0);

  // 3. Symptoms (multi-select + "none")
  const [symptomOptions, setSymptomOptions] = useState<Array<{ key: string; label: string }>>([
    { key: 'chest_pain', label: 'Chest pain or pressure' },
    { key: 'breathlessness', label: 'Difficulty breathing / Shortness of breath' },
    { key: 'headache', label: 'Severe headache' },
    { key: 'fever', label: 'Fever or chills' },
    { key: 'dizziness', label: 'Dizziness or feeling faint' },
    { key: 'cough', label: 'Persistent cough' },
    { key: 'nausea', label: 'Nausea or upset stomach' },
    { key: 'fatigue', label: 'Extreme weakness or fatigue' },
  ]);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [isNoneOfThese, setIsNoneOfThese] = useState<boolean>(true);

  // 4. Free text + voice transcript
  const [freeText, setFreeText] = useState('');
  const [isListening, setIsListening] = useState(false);

  // 5. Optional Vitals (collapsed)
  const [showVitals, setShowVitals] = useState(false);
  const [spo2, setSpo2] = useState('');
  const [tempC, setTempC] = useState('');
  const [heartRate, setHeartRate] = useState('');
  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [sugar, setSugar] = useState('');

  // Submission & Results
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [isEmergencyActive, setIsEmergencyActive] = useState(false);

  // Pharmacy Offer State
  const [selectedPharmacy, setSelectedPharmacy] = useState(PHARMACY_OPTIONS[0]);
  const [offerLoading, setOfferLoading] = useState(false);
  const [offerOrderResult, setOfferOrderResult] = useState<any | null>(null);
  const [offerDeclined, setOfferDeclined] = useState(false);

  // Fetch symptom options and reset state on open
  useEffect(() => {
    if (isOpen) {
      setResult(null);
      setOfferOrderResult(null);
      setOfferDeclined(false);
      setIsEmergencyActive(false);

      patientApi.getCheckinQuestions().then((res) => {
        if (res?.symptoms?.options && res.symptoms.options.length > 0) {
          setSymptomOptions(res.symptoms.options);
        }
      }).catch(console.warn);

      // Spoken prompt when opened
      if (trigger === 'post_med') {
        speak('Tablets confirmed. How are you feeling right now?');
      } else if (trigger === 'periodic') {
        speak('Time for your health check-in. How are you feeling?');
      } else {
        speak('Health check-in. How are you feeling right now?');
      }
    }
  }, [isOpen, trigger]);

  // Read individual question aloud helper
  const handleReadQuestion = (text: string) => {
    speak(text);
  };

  // Toggle Symptom Option
  const handleToggleSymptom = (key: string) => {
    setIsNoneOfThese(false);
    if (selectedSymptoms.includes(key)) {
      const updated = selectedSymptoms.filter((s) => s !== key);
      setSelectedSymptoms(updated);
      if (updated.length === 0) {
        setIsNoneOfThese(true);
      }
    } else {
      setSelectedSymptoms([...selectedSymptoms, key]);
    }
  };

  // Select "None of these"
  const handleSelectNoneOfThese = () => {
    setIsNoneOfThese(true);
    setSelectedSymptoms([]);
    speak('No symptoms selected.');
  };

  // Voice Input Speech Recognition
  const toggleSpeechRecognition = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast.error('Voice input is not supported in this browser. Chrome or Edge is recommended.');
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = language === 'ta' ? 'ta-IN' : language === 'hi' ? 'hi-IN' : 'en-IN';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = () => setIsListening(false);

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setFreeText((prev) => (prev ? `${prev} ${transcript}` : transcript));
        }
      };

      recognition.start();
    } catch (e) {
      console.warn('Speech recognition error:', e);
      setIsListening(false);
    }
  };

  // Submit Check-in
  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const vitals: any = {};
      if (spo2) vitals.spo2 = parseFloat(spo2);
      if (tempC) vitals.temp_c = parseFloat(tempC);
      if (heartRate) vitals.heart_rate = parseFloat(heartRate);
      if (systolic) vitals.systolic = parseFloat(systolic);
      if (diastolic) vitals.diastolic = parseFloat(diastolic);
      if (sugar) vitals.sugar = parseFloat(sugar);

      const payload = {
        feeling,
        pain,
        symptoms: isNoneOfThese ? [] : selectedSymptoms,
        text: freeText.trim(),
        vitals,
        language,
        trigger,
      };

      const res = await patientApi.submitCheckin(payload);
      setResult(res);

      if (res.level === 'emergency') {
        setIsEmergencyActive(true);
      } else if (res.message) {
        speak(res.message);
      }

      if (onCheckinSubmitted) {
        onCheckinSubmitted();
      }
    } catch (err: any) {
      toast.error(err.message || 'Check-in submission failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Answer Pharmacy OTC Offer
  const handleOfferAnswer = async (accept: boolean) => {
    if (!result?.checkin_id) return;

    try {
      setOfferLoading(true);
      const res = await patientApi.respondOffer(result.checkin_id, {
        accept,
        pharmacy: accept ? selectedPharmacy : undefined,
      });

      if (accept) {
        setOfferOrderResult(res.order || { reference: `ORD-${Date.now().toString().slice(-6)}`, eta: '45 mins', pharmacy: selectedPharmacy });
        const spoken = `Order confirmed with ${selectedPharmacy}. Your family has been told.`;
        speak(spoken);
        toast.success(spoken);
      } else {
        setOfferDeclined(true);
        const spoken = 'I have informed your family.';
        speak(spoken);
        toast.success(spoken);
      }
    } catch (err: any) {
      toast.error(err.message || 'Could not process offer response');
    } finally {
      setOfferLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="checkin-modal-heading"
        className="fixed inset-0 z-50 bg-teal-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in"
      >
        <div className="bg-white rounded-3xl border-4 border-teal-600 shadow-2xl max-w-2xl w-full p-5 sm:p-8 relative my-auto">
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close check-in"
            className="absolute top-4 right-4 p-2 text-warm-700 hover:text-warm-900 rounded-full hover:bg-warm-100 transition-colors"
          >
            <X className="w-8 h-8" />
          </button>

          {!result ? (
            /* ================= QUESTIONNAIRE ================= */
            <div className="space-y-6">
              <div className="text-center sm:text-left border-b-2 border-warm-200 pb-3">
                <span className="text-sm font-bold text-teal-850 uppercase tracking-wider">
                  {trigger === 'post_med' ? 'Session Follow-up' : trigger === 'periodic' ? '6-Hourly Check' : 'Manual Health Check'}
                </span>
                <h2 id="checkin-modal-heading" className="text-3xl sm:text-4xl font-black text-teal-950">
                  How are you feeling?
                </h2>
              </div>

              {/* 1. "How are you feeling?" (5 big emoji buttons) */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-xl font-black text-teal-950">
                    1. How are you feeling right now?
                  </label>
                  <button
                    type="button"
                    onClick={() => handleReadQuestion('How are you feeling right now?')}
                    aria-label="Read question 1 aloud"
                    className="p-1.5 text-teal-850 hover:bg-teal-50 rounded-lg"
                  >
                    <Volume2 className="w-5 h-5" />
                  </button>
                </div>

                <div className="grid grid-cols-5 gap-2 sm:gap-3">
                  {[
                    { score: 1, label: 'Very bad', emoji: '😣' },
                    { score: 2, label: 'Bad', emoji: '🙁' },
                    { score: 3, label: 'Okay', emoji: '😐' },
                    { score: 4, label: 'Good', emoji: '🙂' },
                    { score: 5, label: 'Great', emoji: '😄' },
                  ].map((f) => {
                    const isSelected = feeling === f.score;
                    return (
                      <button
                        key={f.score}
                        type="button"
                        onClick={() => {
                          setFeeling(f.score);
                          speak(f.label);
                        }}
                        aria-pressed={isSelected}
                        className={`min-h-[82px] p-2 rounded-2xl flex flex-col items-center justify-center transition-all border-3 ${
                          isSelected
                            ? 'bg-teal-900 text-white border-teal-950 shadow-lg scale-105'
                            : 'bg-warm-50 text-warm-900 border-warm-200 hover:border-teal-500'
                        }`}
                      >
                        <span className="text-3xl sm:text-4xl mb-1">{f.emoji}</span>
                        <span className="text-xs sm:text-sm font-black">{f.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. "Any pain?" (large slider / buttons 0-10) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <label className="text-xl font-black text-teal-950">
                      2. Any pain?
                    </label>
                    <button
                      type="button"
                      onClick={() => handleReadQuestion('Any pain? Zero is no pain, ten is worst.')}
                      aria-label="Read question 2 aloud"
                      className="p-1.5 text-teal-850 hover:bg-teal-50 rounded-lg"
                    >
                      <Volume2 className="w-5 h-5" />
                    </button>
                  </div>

                  <span className="text-xl font-black px-3.5 py-1 rounded-xl bg-teal-100 text-teal-950">
                    {pain === 0 ? 'No Pain (0)' : pain >= 8 ? `Severe (${pain}/10)` : `Pain level ${pain}/10`}
                  </span>
                </div>

                <input
                  type="range"
                  min="0"
                  max="10"
                  value={pain}
                  onChange={(e) => setPain(parseInt(e.target.value, 10))}
                  aria-label="Pain level from 0 to 10"
                  className="w-full h-4 bg-warm-200 rounded-lg appearance-none cursor-pointer accent-teal-800"
                />

                <div className="grid grid-cols-11 gap-1 mt-2">
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setPain(num)}
                      className={`min-h-[44px] rounded-lg font-bold text-sm transition-all border ${
                        pain === num
                          ? 'bg-teal-900 text-white border-teal-950 font-black'
                          : 'bg-white text-warm-800 border-warm-200 hover:bg-warm-100'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. "Do you have any of these?" (toggle cards + "None of these") */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <label className="text-xl font-black text-teal-950">
                      3. Do you have any of these symptoms?
                    </label>
                    <button
                      type="button"
                      onClick={() => handleReadQuestion('Do you have any of these symptoms?')}
                      aria-label="Read question 3 aloud"
                      className="p-1.5 text-teal-850 hover:bg-teal-50 rounded-lg"
                    >
                      <Volume2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-52 overflow-y-auto pr-1 mb-2">
                  {/* None of these Option */}
                  <button
                    type="button"
                    onClick={handleSelectNoneOfThese}
                    aria-pressed={isNoneOfThese}
                    className={`sm:col-span-2 min-h-[52px] p-3 rounded-xl text-left border-3 font-black text-lg transition-all flex items-center justify-between ${
                      isNoneOfThese
                        ? 'bg-emerald-700 text-white border-emerald-900 shadow-md'
                        : 'bg-warm-100 text-warm-900 border-warm-300 hover:border-emerald-600'
                    }`}
                  >
                    <span>✓ None of these (I feel fine)</span>
                    {isNoneOfThese && <Check className="w-6 h-6 text-white" />}
                  </button>

                  {/* Symptom Cards */}
                  {symptomOptions.map((sym) => {
                    const isSelected = selectedSymptoms.includes(sym.key);
                    return (
                      <button
                        key={sym.key}
                        type="button"
                        onClick={() => handleToggleSymptom(sym.key)}
                        aria-pressed={isSelected}
                        className={`min-h-[52px] p-3 rounded-xl text-left border-2 font-bold text-base transition-all flex items-center justify-between ${
                          isSelected
                            ? 'bg-teal-900 text-white border-teal-950 shadow-sm'
                            : 'bg-warm-50 text-warm-900 border-warm-200 hover:border-teal-500'
                        }`}
                      >
                        <span>{sym.label}</span>
                        {isSelected && <Check className="w-5 h-5 text-teal-300 ml-2 flex-shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 4. "Anything else? Tell me" (text + mic) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <label htmlFor="checkin-notes-input" className="text-xl font-black text-teal-950">
                      4. Anything else? Tell me:
                    </label>
                    <button
                      type="button"
                      onClick={() => handleReadQuestion('Anything else? Tell me in your own words.')}
                      aria-label="Read question 4 aloud"
                      className="p-1.5 text-teal-850 hover:bg-teal-50 rounded-lg"
                    >
                      <Volume2 className="w-5 h-5" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={toggleSpeechRecognition}
                    aria-label="Speak your notes with voice input"
                    className={`min-h-[44px] px-3.5 py-1.5 rounded-xl font-black text-sm flex items-center gap-2 transition-all ${
                      isListening
                        ? 'bg-red-600 text-white animate-pulse shadow-md'
                        : 'bg-teal-100 text-teal-950 hover:bg-teal-200'
                    }`}
                  >
                    <Mic className="w-5 h-5" />
                    <span>{isListening ? 'Listening...' : 'Voice Input'}</span>
                  </button>
                </div>

                <textarea
                  id="checkin-notes-input"
                  rows={2}
                  value={freeText}
                  onChange={(e) => setFreeText(e.target.value)}
                  placeholder="Tell me in your own words (or tap 'Voice Input' to speak)..."
                  className="w-full p-3.5 rounded-2xl border-2 border-warm-300 focus:border-teal-700 bg-white text-lg font-semibold text-warm-900 shadow-sm"
                />
              </div>

              {/* 5. Optional Vitals (collapsed) */}
              <div className="border-2 border-warm-200 rounded-2xl overflow-hidden bg-warm-50">
                <button
                  type="button"
                  onClick={() => setShowVitals((prev) => !prev)}
                  className="w-full min-h-[52px] p-3.5 flex items-center justify-between text-left font-black text-lg text-teal-950 hover:bg-warm-100 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-teal-850" />
                    <span>5. Optional Vitals (Blood Pressure, Sugar, Pulse...)</span>
                  </div>
                  {showVitals ? <ChevronUp className="w-6 h-6" /> : <ChevronDown className="w-6 h-6" />}
                </button>

                {showVitals && (
                  <div className="p-4 pt-0 grid grid-cols-2 sm:grid-cols-3 gap-3 border-t border-warm-200 mt-2">
                    <div>
                      <label htmlFor="vit-spo2" className="block text-sm font-bold text-warm-800 mb-1">
                        Oxygen (SpO2 %)
                      </label>
                      <input
                        id="vit-spo2"
                        type="number"
                        value={spo2}
                        onChange={(e) => setSpo2(e.target.value)}
                        placeholder="e.g. 98"
                        className="w-full min-h-[48px] px-3 py-2 rounded-xl border border-warm-300 bg-white font-semibold text-base"
                      />
                    </div>

                    <div>
                      <label htmlFor="vit-temp" className="block text-sm font-bold text-warm-800 mb-1">
                        Temperature (°C)
                      </label>
                      <input
                        id="vit-temp"
                        type="number"
                        step="0.1"
                        value={tempC}
                        onChange={(e) => setTempC(e.target.value)}
                        placeholder="e.g. 37.0"
                        className="w-full min-h-[48px] px-3 py-2 rounded-xl border border-warm-300 bg-white font-semibold text-base"
                      />
                    </div>

                    <div>
                      <label htmlFor="vit-hr" className="block text-sm font-bold text-warm-800 mb-1">
                        Pulse / Heart Rate
                      </label>
                      <input
                        id="vit-hr"
                        type="number"
                        value={heartRate}
                        onChange={(e) => setHeartRate(e.target.value)}
                        placeholder="e.g. 74"
                        className="w-full min-h-[48px] px-3 py-2 rounded-xl border border-warm-300 bg-white font-semibold text-base"
                      />
                    </div>

                    <div>
                      <label htmlFor="vit-sys" className="block text-sm font-bold text-warm-800 mb-1">
                        BP Systolic
                      </label>
                      <input
                        id="vit-sys"
                        type="number"
                        value={systolic}
                        onChange={(e) => setSystolic(e.target.value)}
                        placeholder="e.g. 120"
                        className="w-full min-h-[48px] px-3 py-2 rounded-xl border border-warm-300 bg-white font-semibold text-base"
                      />
                    </div>

                    <div>
                      <label htmlFor="vit-dia" className="block text-sm font-bold text-warm-800 mb-1">
                        BP Diastolic
                      </label>
                      <input
                        id="vit-dia"
                        type="number"
                        value={diastolic}
                        onChange={(e) => setDiastolic(e.target.value)}
                        placeholder="e.g. 80"
                        className="w-full min-h-[48px] px-3 py-2 rounded-xl border border-warm-300 bg-white font-semibold text-base"
                      />
                    </div>

                    <div>
                      <label htmlFor="vit-sugar" className="block text-sm font-bold text-warm-800 mb-1">
                        Sugar (mg/dL)
                      </label>
                      <input
                        id="vit-sugar"
                        type="number"
                        value={sugar}
                        onChange={(e) => setSugar(e.target.value)}
                        placeholder="e.g. 110"
                        className="w-full min-h-[48px] px-3 py-2 rounded-xl border border-warm-300 bg-white font-semibold text-base"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full min-h-[64px] py-4 px-6 rounded-2xl bg-teal-900 hover:bg-teal-850 text-white font-black text-2xl shadow-xl flex items-center justify-center gap-3 transition-transform active:scale-98 disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-8 h-8 animate-spin" />
                    <span>Scoring with CareCircle AI...</span>
                  </>
                ) : (
                  <span>Submit Health Check</span>
                )}
              </button>
            </div>
          ) : (
            /* ================= RESULT SCREEN ================= */
            <div className="space-y-6 text-center py-2">
              {/* NORMAL LEVEL (score >= 70) */}
              {result.level === 'normal' && (
                <div className="space-y-4">
                  {/* Big Green Score Ring */}
                  <div className="w-28 h-28 rounded-full bg-emerald-100 border-8 border-emerald-500 text-emerald-800 flex items-center justify-center mx-auto shadow-xl">
                    <span className="text-4xl font-black">{result.risk_score}</span>
                  </div>

                  <h3 className="text-3xl font-black text-emerald-950">
                    Normal &middot; All Good ({result.risk_score}/100)
                  </h3>

                  <p className="text-xl font-bold text-warm-900 bg-emerald-50 p-5 rounded-2xl border-2 border-emerald-200 text-left leading-relaxed">
                    {result.message}
                  </p>

                  <div className="p-5 rounded-2xl bg-warm-100 text-left space-y-2 border border-warm-200">
                    <h4 className="font-black text-teal-950 text-lg">Healthy Guidance:</h4>
                    <ul className="list-disc list-inside space-y-1.5 text-base font-semibold text-warm-900">
                      <li>Keep taking your prescribed medicines on schedule.</li>
                      <li>Drink enough water and take restful breaks.</li>
                      <li>A light walk in the morning or evening supports healthy circulation.</li>
                    </ul>
                  </div>

                  <p className="text-xs text-warm-700 italic">
                    CareCircle does not diagnose. Not medical advice.
                  </p>
                </div>
              )}

              {/* ATTENTION LEVEL (40 - 69) */}
              {result.level === 'attention' && (
                <div className="space-y-5">
                  {/* Big Amber Score Ring */}
                  <div className="w-28 h-28 rounded-full bg-amber-100 border-8 border-amber-500 text-amber-900 flex items-center justify-center mx-auto shadow-xl">
                    <span className="text-4xl font-black">{result.risk_score}</span>
                  </div>

                  <h3 className="text-3xl font-black text-amber-950">
                    Needs Attention ({result.risk_score}/100)
                  </h3>

                  <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 text-left">
                    <span className="font-black text-lg text-amber-950 block mb-1">
                      What I noticed: {result.symptom_labels || 'Reported discomfort'}
                    </span>
                    <p className="text-base font-bold text-warm-900">
                      {result.message}
                    </p>
                  </div>

                  {/* OTC Medicine Offer Card */}
                  {result.offer && (
                    <div className="elder-card p-5 border-3 border-teal-500 text-left space-y-4 shadow-lg bg-teal-50/50">
                      <div className="flex items-center gap-2 text-teal-950 font-black text-xl">
                        <ShoppingBag className="w-7 h-7 text-teal-850" />
                        <span>Suggested Over-the-Counter Relief:</span>
                      </div>

                      {/* Items & ETA */}
                      <div className="bg-white p-4 rounded-2xl border-2 border-teal-200">
                        <div className="font-black text-xl text-teal-950">
                          {Array.isArray(result.offer.items)
                            ? result.offer.items.map((i: any) => typeof i === 'string' ? i : `${i.name} (${i.dosage || ''})`).join(', ')
                            : result.offer.items}
                        </div>
                        <p className="text-base font-semibold text-warm-700 mt-1">
                          Estimated Delivery: <strong>{result.offer.eta || '45 mins'}</strong>
                        </p>
                      </div>

                      {/* Pharmacy Switcher */}
                      <div>
                        <label htmlFor="pharmacy-select" className="block text-base font-black text-warm-900 mb-1">
                          Choose Pharmacy:
                        </label>
                        <select
                          id="pharmacy-select"
                          value={selectedPharmacy}
                          onChange={(e) => setSelectedPharmacy(e.target.value)}
                          className="w-full min-h-[52px] px-3 py-2 rounded-xl border-2 border-warm-300 font-bold text-lg bg-white"
                        >
                          {PHARMACY_OPTIONS.map((name) => (
                            <option key={name} value={name}>
                              {name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Offer Buttons: Yes, order it / No, thanks */}
                      {!offerOrderResult && !offerDeclined ? (
                        <div className="flex flex-col sm:flex-row gap-3 pt-2">
                          <button
                            type="button"
                            onClick={() => handleOfferAnswer(true)}
                            disabled={offerLoading}
                            aria-label="Accept medicine order offer"
                            className="flex-1 min-h-[60px] py-3.5 px-6 rounded-2xl bg-teal-900 hover:bg-teal-850 text-white font-black text-2xl shadow-md transition-transform active:scale-95"
                          >
                            {offerLoading ? (
                              <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                            ) : (
                              <span>Yes, order it</span>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOfferAnswer(false)}
                            disabled={offerLoading}
                            aria-label="Decline medicine order offer"
                            className="flex-1 min-h-[60px] py-3.5 px-6 rounded-2xl bg-white hover:bg-warm-100 text-warm-900 font-black text-2xl border-3 border-warm-300 transition-colors"
                          >
                            <span>No, thanks</span>
                          </button>
                        </div>
                      ) : offerOrderResult ? (
                        /* Order Confirmation Card */
                        <div className="p-4 rounded-2xl bg-emerald-100 border-2 border-emerald-400 text-emerald-950 space-y-2">
                          <div className="flex items-center gap-2 font-black text-xl">
                            <PackageCheck className="w-6 h-6 text-emerald-700" />
                            <span>Order Confirmed!</span>
                          </div>
                          <p className="text-base font-semibold">
                            Reference: <strong>{offerOrderResult.reference || offerOrderResult.id}</strong> &middot; Pharmacy: {offerOrderResult.pharmacy || selectedPharmacy} &middot; ETA: {offerOrderResult.eta || '45 mins'}
                          </p>
                          <p className="text-sm font-bold text-emerald-800">
                            Your family has been told.
                          </p>
                        </div>
                      ) : (
                        <div className="p-4 rounded-2xl bg-warm-200 text-warm-900 font-bold text-center">
                          I have informed your family.
                        </div>
                      )}

                      <p className="text-xs text-warm-700 italic">
                        Over-the-counter only. Ask a pharmacist if you take other medicines.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* EMERGENCY LEVEL (< 40) is handled by opening EmergencyScreen */}
              <button
                type="button"
                onClick={onClose}
                className="w-full min-h-[56px] py-3.5 px-6 rounded-2xl bg-warm-200 hover:bg-warm-300 text-warm-900 font-black text-xl mt-4"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Full-Screen Emergency Modal when level === 'emergency' */}
      <EmergencyScreen
        isOpen={isEmergencyActive}
        onClose={() => {
          setIsEmergencyActive(false);
          onClose();
        }}
        message={result?.message}
      />
    </>
  );
};
