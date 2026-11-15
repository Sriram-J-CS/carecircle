import React, { useEffect, useRef, useState } from 'react';
import { Camera, CheckCircle2, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { loadFaceModels, detectFace, captureAveragedDescriptor } from '../../services/faceApi';
import { useLanguage } from '../../context/LanguageContext';

interface FaceCameraProps {
  onCapture: (descriptor: number[]) => void;
  isScanning?: boolean;
  autoCaptureOnFace?: boolean;
  requireAveraging?: boolean;
}

export const FaceCamera: React.FC<FaceCameraProps> = ({
  onCapture,
  isScanning = false,
  autoCaptureOnFace = false,
  requireAveraging = true,
}) => {
  const { t, speak } = useLanguage();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<number | null>(null);

  const [modelLoading, setModelLoading] = useState(true);
  const [modelError, setModelError] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [faceDetected, setFaceDetected] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [capturedFrames, setCapturedFrames] = useState(0);

  // Initialize models and camera
  useEffect(() => {
    let isMounted = true;

    async function init() {
      try {
        setModelLoading(true);
        await loadFaceModels();
        if (!isMounted) return;
        setModelLoading(false);
      } catch (err: any) {
        if (!isMounted) return;
        setModelError(err.message || 'Failed to load face detection models.');
        setModelLoading(false);
        return;
      }

      // Start camera
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 640 },
            height: { ideal: 480 },
          },
          audio: false,
        });

        if (!isMounted) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err: any) {
        if (!isMounted) return;
        console.error('Camera access error:', err);
        setCameraError(
          'Camera access was denied or is unavailable. Please allow camera access in your browser settings or use email & password.'
        );
      }
    }

    init();

    return () => {
      isMounted = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Detection loop
  useEffect(() => {
    if (modelLoading || modelError || cameraError || capturing) return;

    intervalRef.current = window.setInterval(async () => {
      if (!videoRef.current || videoRef.current.readyState < 2) return;
      const res = await detectFace(videoRef.current);
      setFaceDetected(Boolean(res));
    }, 400);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [modelLoading, modelError, cameraError, capturing]);

  const handleCapture = async () => {
    if (!videoRef.current || capturing) return;

    try {
      setCapturing(true);
      setCapturedFrames(0);

      if (requireAveraging) {
        // Capture 3 frames with visual feedback
        const descriptors: number[][] = [];
        for (let i = 1; i <= 3; i++) {
          setCapturedFrames(i);
          const res = await detectFace(videoRef.current);
          if (res && res.descriptor.length === 128) {
            descriptors.push(res.descriptor);
          }
          await new Promise((r) => setTimeout(r, 200));
        }

        if (descriptors.length === 0) {
          speak('Please position your face inside the circle.');
          throw new Error('No face detected clearly. Please hold still and look directly at the camera.');
        }

        // Average 3 frames
        const averaged = new Array(128).fill(0);
        for (let d = 0; d < descriptors.length; d++) {
          for (let j = 0; j < 128; j++) {
            averaged[j] += descriptors[d][j];
          }
        }
        for (let j = 0; j < 128; j++) {
          averaged[j] = averaged[j] / descriptors.length;
        }

        onCapture(averaged);
      } else {
        const res = await detectFace(videoRef.current);
        if (!res) {
          throw new Error('No face detected. Please hold still and look at the camera.');
        }
        onCapture(res.descriptor);
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Face scan failed. Please try again.');
    } finally {
      setCapturing(false);
      setCapturedFrames(0);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-4">
      {/* Circular camera container */}
      <div className="relative w-64 h-64 sm:w-80 sm:h-80 rounded-full overflow-hidden border-8 shadow-2xl transition-all duration-300 bg-warm-900 flex items-center justify-center border-warm-300">
        {/* Glow border depending on face presence */}
        <div
          className={`absolute inset-0 rounded-full border-4 pointer-events-none z-10 transition-colors duration-300 ${
            faceDetected ? 'border-emerald-500 shadow-[0_0_25px_rgba(16,185,129,0.7)]' : 'border-amber-400'
          }`}
        />

        {/* Video feed */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover transform -scale-x-100"
          onLoadedMetadata={() => videoRef.current?.play()}
        />

        {/* Loading overlay */}
        {modelLoading && (
          <div className="absolute inset-0 bg-warm-900/90 flex flex-col items-center justify-center text-white text-center p-4 z-20">
            <Loader2 className="w-12 h-12 animate-spin text-teal-400 mb-2" />
            <p className="font-bold text-lg">Setting up Face ID...</p>
            <p className="text-sm text-warm-300">Loading AI models (one-time)</p>
          </div>
        )}

        {/* Camera error */}
        {cameraError && (
          <div className="absolute inset-0 bg-red-950/90 flex flex-col items-center justify-center text-white text-center p-4 z-20">
            <AlertCircle className="w-12 h-12 text-red-400 mb-2" />
            <p className="font-bold text-base">{cameraError}</p>
          </div>
        )}

        {/* Capturing feedback overlay */}
        {capturing && (
          <div className="absolute inset-0 bg-teal-950/80 flex flex-col items-center justify-center text-white text-center p-4 z-20">
            <Loader2 className="w-14 h-14 animate-spin text-teal-300 mb-3" />
            <p className="font-black text-2xl text-teal-200">Scanning...</p>
            <p className="font-semibold text-lg text-warm-100">Hold still ({capturedFrames}/3)</p>
          </div>
        )}
      </div>

      {/* Status indicator bar */}
      <div className="mt-6 flex flex-col items-center gap-2">
        <div
          className={`flex items-center gap-2.5 px-5 py-2.5 rounded-full text-lg font-bold transition-all shadow-sm ${
            faceDetected
              ? 'bg-emerald-100 text-emerald-950 border-2 border-emerald-400'
              : 'bg-amber-100 text-amber-950 border-2 border-amber-300'
          }`}
        >
          {faceDetected ? (
            <>
              <CheckCircle2 className="w-6 h-6 text-emerald-600 animate-pulse" />
              <span>{t('faceFound')}</span>
            </>
          ) : (
            <>
              <Camera className="w-6 h-6 text-amber-600 animate-bounce" />
              <span>{t('lookAtCamera')}</span>
            </>
          )}
        </div>
      </div>

      {/* Giant Action button */}
      <div className="mt-6 w-full max-w-sm">
        <button
          type="button"
          onClick={handleCapture}
          disabled={!faceDetected || capturing || isScanning || Boolean(cameraError) || modelLoading}
          aria-label={t('captureFace')}
          className={`w-full min-h-[58px] py-3.5 px-6 rounded-2xl font-black text-xl flex items-center justify-center gap-3 shadow-lg transition-all ${
            faceDetected && !capturing && !isScanning
              ? 'bg-teal-900 hover:bg-teal-850 text-white cursor-pointer active:scale-98'
              : 'bg-warm-300 text-warm-700 cursor-not-allowed opacity-75'
          }`}
        >
          {capturing || isScanning ? (
            <>
              <Loader2 className="w-7 h-7 animate-spin" />
              <span>Scanning Face...</span>
            </>
          ) : (
            <>
              <Camera className="w-7 h-7" />
              <span>{t('captureFace')}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
