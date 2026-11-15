import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, CheckCircle2, Droplets, AlertCircle, RefreshCw, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { Dose } from '../../types/api';
import { api } from '../../services/api';
import { playSoftChime } from '../../services/audio';
import { speak } from '../../services/speech';
import { useLanguage } from '../../context/LanguageContext';

interface PillCameraModalProps {
  doses: Dose[];
  onComplete: () => void;
  onClose: () => void;
}

export const PillCameraModal: React.FC<PillCameraModalProps> = ({
  doses,
  onComplete,
  onClose,
}) => {
  const { language, t } = useLanguage();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const countdownIntervalRef = useRef<number | null>(null);

  const currentDose = doses[currentIndex];
  const isLast = currentIndex === doses.length - 1;

  // Camera stream lifecycle
  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, []);

  const startCamera = async () => {
    setErrorMsg(null);
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      }
    } catch (err: any) {
      setErrorMsg('Camera access is not permitted or device is unavailable. You can confirm via simulation.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const startVerification = async () => {
    if (!currentDose) return;
    setErrorMsg(null);
    setIsRecording(true);
    setCountdown(5);
    recordedChunksRef.current = [];

    // Spoken guidance
    const instruction =
      language === 'ta'
        ? `மாத்திரை ${currentDose.medicine_name}-ஐ கேமராவில் காட்டி, விழுங்கி, தண்ணீர் குடிக்கவும்.`
        : language === 'hi'
        ? `गोली ${currentDose.medicine_name} को कैमरे में दिखाएं, लें और पानी पिएं।`
        : `Show ${currentDose.medicine_name} to the camera, take it, and drink water.`;
    speak(instruction, language);

    // Setup MediaRecorder if stream exists
    if (streamRef.current && typeof MediaRecorder !== 'undefined') {
      try {
        const recorder = new MediaRecorder(streamRef.current);
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) recordedChunksRef.current.push(e.data);
        };
        recorder.start();
        mediaRecorderRef.current = recorder;
      } catch {
        // MediaRecorder optional fallback
      }
    }

    // 5-second countdown timer
    let remaining = 5;
    countdownIntervalRef.current = window.setInterval(async () => {
      remaining -= 1;
      setCountdown(remaining);

      if (remaining <= 0) {
        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

        // Stop recorder
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
        }

        await completeDose();
      }
    }, 1000);
  };

  const completeDose = async () => {
    setIsSubmitting(true);
    try {
      let formData: FormData | undefined;
      if (recordedChunksRef.current.length > 0) {
        const videoBlob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        formData = new FormData();
        formData.append('video', videoBlob, 'pill-verification.webm');
        formData.append('method', 'camera_auto');
      }

      await api.confirmDose(currentDose.id, formData);

      // Play soft chime & spoken confirmation
      playSoftChime();
      const confirmedVoice =
        language === 'ta'
          ? `${currentDose.medicine_name} வெற்றிகரமாக பதிவு செய்யப்பட்டது.`
          : language === 'hi'
          ? `${currentDose.medicine_name} सफलतापूर्वक दर्ज कर ली गई है।`
          : `${currentDose.medicine_name} recorded. Well done!`;
      speak(confirmedVoice, language);

      setIsConfirmed(true);

      // Transition to next tablet after 1.8 seconds or complete slot
      setTimeout(() => {
        setIsConfirmed(false);
        setIsRecording(false);
        if (isLast) {
          stopCamera();
          onComplete(); // opens checkin
        } else {
          setCurrentIndex((prev) => prev + 1);
        }
      }, 1800);
    } catch (err: any) {
      setErrorMsg(err.message || 'Verification could not be uploaded. Please try again.');
      setIsRecording(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!currentDose) return null;

  return (
    <div className="fixed inset-0 z-50 bg-ink/85 backdrop-blur-md flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-paper dark:bg-teal-950 border-4 border-teal rounded-3xl max-w-xl w-full p-6 sm:p-8 flex flex-col items-center text-center relative shadow-2xl overflow-hidden"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-ink/60 dark:text-sand/60 hover:bg-sand/60"
          aria-label="Close medicine verification"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Step Counter */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-mint dark:bg-teal-900 text-teal dark:text-mint text-xs font-bold uppercase tracking-wider mb-4">
          Tablet {currentIndex + 1} of {doses.length}
        </div>

        {/* Current Tablet Big Headline */}
        <h2 className="text-3xl sm:text-4xl font-serif font-bold text-ink dark:text-paper mb-1">
          {currentDose.medicine_name}
        </h2>
        <p className="text-base text-ink/70 dark:text-sand/70 mb-5">
          {currentDose.dosage} • {currentDose.with_food ? `${currentDose.with_food} food` : 'any time'}
        </p>

        {/* Camera Preview Box with Animated Overlay */}
        <div className="relative w-full max-w-sm aspect-4/3 rounded-3xl overflow-hidden border-4 border-teal bg-ink shadow-inner mb-5">
          <video
            ref={videoRef}
            playsInline
            muted
            className="w-full h-full object-cover transform -scale-x-100"
          />

          {/* Active Recording Overlay */}
          {isRecording && !isConfirmed && (
            <div className="absolute inset-0 bg-ink/30 flex flex-col justify-between p-4 pointer-events-none">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 bg-clay text-white text-xs font-bold px-3 py-1 rounded-full animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-white" />
                  RECORDING
                </span>
                <span className="text-3xl font-serif font-bold text-white tabular-nums drop-shadow-md">
                  {countdown}s
                </span>
              </div>

              <div className="bg-ink/70 backdrop-blur-xs rounded-2xl p-2.5 text-white text-sm font-medium">
                Hold tablet in view, take it, and drink water
              </div>
            </div>
          )}

          {/* Success Checkmark Overlay */}
          {isConfirmed && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="absolute inset-0 bg-teal/80 backdrop-blur-xs flex flex-col items-center justify-center text-paper"
            >
              <CheckCircle2 className="w-20 h-20 text-mint mb-2 animate-bounce" />
              <h3 className="text-2xl font-serif font-bold">Confirmed!</h3>
              <p className="text-sm text-mint">
                {isLast ? 'All medicines completed!' : 'Moving to next tablet...'}
              </p>
            </motion.div>
          )}
        </div>

        {/* Spoken Instruction Banner */}
        <div className="w-full bg-sand/30 dark:bg-ink/40 border border-sand dark:border-teal-800 rounded-2xl p-4 mb-5 flex items-center gap-3 text-left">
          <div className="w-10 h-10 rounded-xl bg-teal/10 dark:bg-mint/10 text-teal dark:text-mint flex items-center justify-center shrink-0">
            <Droplets className="w-6 h-6" />
          </div>
          <p className="text-sm sm:text-base font-medium text-ink/80 dark:text-sand/80">
            {t('pill_camera_instruction')}
          </p>
        </div>

        {errorMsg && (
          <p className="text-xs text-clay mb-4 font-semibold">{errorMsg}</p>
        )}

        {/* Action Button */}
        {!isRecording && !isConfirmed && (
          <Button
            size="patient"
            variant="primary"
            onClick={startVerification}
            isLoading={isSubmitting}
            className="w-full text-xl shadow-lg flex items-center justify-center gap-3"
          >
            <Camera className="w-7 h-7" />
            <span>Start 5-Second Verification</span>
          </Button>
        )}
      </motion.div>
    </div>
  );
};
