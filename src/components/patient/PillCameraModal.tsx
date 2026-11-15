import React, { useEffect, useRef, useState } from 'react';
import { Pill, Camera, CheckCircle2, AlertCircle, Loader2, ArrowRight, X, Clock } from 'lucide-react';
import { patientApi } from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import { DoseLog } from '../../types/api';
import toast from 'react-hot-toast';

interface PillCameraModalProps {
  initialDose: DoseLog;
  totalInSlot?: number;
  currentStepIndex?: number;
  onComplete: (checkinRequired: boolean) => void;
  onClose: () => void;
}

export const PillCameraModal: React.FC<PillCameraModalProps> = ({
  initialDose,
  totalInSlot = 1,
  currentStepIndex = 1,
  onComplete,
  onClose,
}) => {
  const { speak } = useLanguage();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const [currentDose, setCurrentDose] = useState<DoseLog>(initialDose);
  const [stepIndex, setStepIndex] = useState(currentStepIndex);
  const [totalSteps, setTotalSteps] = useState(Math.max(totalInSlot, currentStepIndex));

  // Camera & Recording state
  const [cameraLoading, setCameraLoading] = useState(true);
  const [cameraDenied, setCameraDenied] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(5);
  const [canConfirm, setCanConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [transitionMsg, setTransitionMsg] = useState<string | null>(null);

  // Countdown timer ref
  const timerRef = useRef<number | null>(null);

  // Initialize camera & start recording when currentDose changes
  useEffect(() => {
    let isMounted = true;
    chunksRef.current = [];
    setSecondsRemaining(5);
    setCanConfirm(false);
    setIsSubmitting(false);

    // Prompt instructions aloud
    speak(`Please take ${currentDose.medicine_name}. Show the tablet, put it in your mouth, and drink water.`);

    async function startCamera() {
      try {
        setCameraLoading(true);
        setCameraDenied(false);
        setCameraError(null);

        // If stream already exists, reuse it
        let stream = streamRef.current;
        if (!stream || !stream.active) {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: 'user',
              width: { ideal: 640 },
              height: { ideal: 480 },
            },
            audio: false,
          });
          streamRef.current = stream;
        }

        if (!isMounted) return;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        // Start media recorder
        try {
          const mimeTypes = ['video/webm;codecs=vp8', 'video/webm', 'video/mp4'];
          const supportedMime = mimeTypes.find((m) => MediaRecorder.isTypeSupported(m)) || '';

          const recorder = supportedMime ? new MediaRecorder(stream, { mimeType: supportedMime }) : new MediaRecorder(stream);
          mediaRecorderRef.current = recorder;
          chunksRef.current = [];

          recorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) {
              chunksRef.current.push(e.data);
            }
          };

          recorder.start(300);
          setIsRecording(true);
        } catch (recErr) {
          console.warn('MediaRecorder error, will allow confirmation without clip', recErr);
        }

        setCameraLoading(false);

        // Start 5-second countdown timer
        let count = 5;
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = window.setInterval(() => {
          count -= 1;
          if (isMounted) {
            setSecondsRemaining(count);
          }
          if (count <= 0) {
            if (timerRef.current) clearInterval(timerRef.current);
            if (isMounted) {
              setCanConfirm(true);
            }
          }
        }, 1000);
      } catch (err: any) {
        if (!isMounted) return;
        console.error('Camera denied / error:', err);
        setCameraDenied(true);
        setCameraError('Camera access was denied or is unavailable. You can still confirm your medicine below.');
        setCameraLoading(false);
        setCanConfirm(true); // Allow fallback confirm
      }
    }

    startCamera();

    return () => {
      isMounted = false;
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop();
        } catch (e) {
          // ignore
        }
      }
    };
  }, [currentDose.id]);

  // Stop camera tracks on final modal exit
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Handle Dose Confirmation
  const handleConfirm = async (withProof = true) => {
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);

      let proofBlob: Blob | undefined = undefined;

      if (withProof && mediaRecorderRef.current && chunksRef.current.length > 0) {
        // Stop recording
        if (mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
          await new Promise((r) => setTimeout(r, 200));
        }
        proofBlob = new Blob(chunksRef.current, { type: 'video/webm' });
      }

      const res = await patientApi.confirmDose(currentDose.id, proofBlob);

      // Check if next dose exists in this slot
      if (res.next_dose) {
        const next = res.next_dose;
        const msg = `Great! Now ${next.medicine_name}`;
        setTransitionMsg(msg);
        speak(msg);
        toast.success(`Confirmed! Next: ${next.medicine_name}`);

        setTimeout(() => {
          setTransitionMsg(null);
          setCurrentDose(next);
          setStepIndex((prev) => prev + 1);
          setTotalSteps((prev) => Math.max(prev, stepIndex + 1));
        }, 1500);
      } else {
        // Slot complete!
        speak('All tablets taken! Great job.');
        toast.success('All tablets confirmed for this session!');
        onComplete(Boolean(res.checkin_required || res.slot_complete));
      }
    } catch (err: any) {
      console.error('Confirm error:', err);
      toast.error(err.message || 'Could not confirm dose. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pill-camera-heading"
      className="fixed inset-0 z-50 bg-teal-950/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in"
    >
      <div className="bg-white rounded-3xl border-4 border-teal-500 shadow-2xl max-w-2xl w-full p-5 sm:p-8 relative my-auto">
        {/* Top close button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close pill camera"
          className="absolute top-4 right-4 p-2 text-warm-700 hover:text-warm-900 rounded-full hover:bg-warm-100 transition-colors"
        >
          <X className="w-8 h-8" />
        </button>

        {/* Step Badge */}
        <div className="flex items-center justify-between mb-4 pr-12">
          <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-teal-100 text-teal-950 font-black text-base border border-teal-300">
            <Pill className="w-5 h-5 text-teal-850" />
            <span>Step {stepIndex} of {totalSteps}</span>
          </span>
          <span className="text-sm font-bold text-warm-700 capitalize">
            {currentDose.status}
          </span>
        </div>

        {/* Transition Animation Banner */}
        {transitionMsg && (
          <div className="mb-4 p-4 rounded-2xl bg-emerald-100 border-2 border-emerald-400 text-emerald-950 font-black text-2xl text-center animate-bounce shadow-sm">
            {transitionMsg}
          </div>
        )}

        {/* Medicine Name & Dosage Large Display */}
        <div className="text-center mb-5">
          <h2 id="pill-camera-heading" className="text-3xl sm:text-4xl font-black text-teal-950">
            {currentDose.medicine_name}
          </h2>
          <div className="mt-1 flex items-center justify-center gap-3">
            <span className="text-2xl font-black text-teal-850">
              {currentDose.dosage}
            </span>
          </div>
        </div>

        {/* Camera / Instruction View */}
        <div className="relative rounded-3xl overflow-hidden bg-warm-900 border-4 border-teal-600 shadow-xl aspect-video max-h-[340px] flex items-center justify-center mx-auto mb-5 w-full">
          {!cameraDenied ? (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover transform -scale-x-100"
              />

              {/* Recording indicator dot */}
              {isRecording && (
                <div className="absolute top-4 left-4 z-20 flex items-center gap-2 bg-red-600/90 text-white font-bold text-xs uppercase px-3 py-1 rounded-full shadow animate-pulse">
                  <span className="w-2.5 h-2.5 rounded-full bg-white" />
                  <span>Recording</span>
                </div>
              )}

              {/* 5-second countdown overlay */}
              {!canConfirm && (
                <div className="absolute top-4 right-4 z-20 bg-teal-950/80 text-white font-black text-lg px-3.5 py-1 rounded-full border border-teal-400">
                  {secondsRemaining}s
                </div>
              )}
            </>
          ) : (
            <div className="p-6 text-center text-white flex flex-col items-center gap-3">
              <AlertCircle className="w-14 h-14 text-amber-400" />
              <p className="text-xl font-black text-amber-200">Camera Access Blocked</p>
              <p className="text-base font-bold text-white max-w-md">
                Tap the 🔒 lock icon in your browser address bar and set Camera to &ldquo;Allow&rdquo;, or use the fallback confirmation button below.
              </p>
            </div>
          )}

          {cameraLoading && (
            <div className="absolute inset-0 bg-teal-950/80 flex flex-col items-center justify-center text-white">
              <Loader2 className="w-12 h-12 animate-spin text-teal-300 mb-2" />
              <p className="font-bold text-lg">Opening camera...</p>
            </div>
          )}
        </div>

        {/* Instruction Text Banner */}
        <div className="bg-warm-100 border-2 border-warm-300 rounded-2xl p-4 text-center mb-6">
          <p className="text-xl sm:text-2xl font-black text-teal-950">
            &ldquo;Show the tablet, put it in your mouth, and drink water.&rdquo;
          </p>
        </div>

        {/* Primary Action Button */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => handleConfirm(true)}
            disabled={!canConfirm || isSubmitting}
            aria-label={`Confirm that you have taken ${currentDose.medicine_name}`}
            className={`w-full min-h-[68px] py-4 px-6 rounded-2xl font-black text-2xl shadow-xl flex items-center justify-center gap-3 transition-transform active:scale-98 ${
              canConfirm && !isSubmitting
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
                : 'bg-warm-300 text-warm-700 cursor-not-allowed'
            }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-8 h-8 animate-spin" />
                <span>Verifying...</span>
              </>
            ) : !canConfirm ? (
              <>
                <Clock className="w-8 h-8 animate-spin" />
                <span>Taking tablet ({secondsRemaining}s)...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-8 h-8" />
                <span>I have taken it</span>
              </>
            )}
          </button>

          {/* Fallback button if camera denied */}
          {cameraDenied && (
            <button
              type="button"
              onClick={() => handleConfirm(false)}
              disabled={isSubmitting}
              className="w-full min-h-[56px] py-3 px-6 rounded-2xl bg-teal-900 hover:bg-teal-850 text-white font-bold text-xl shadow-md transition-colors"
            >
              Confirm without camera
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
