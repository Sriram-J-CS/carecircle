import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Mail, Lock, Shield, ArrowRight, UserCheck, RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { ElderIllustration } from '../components/illustrations/ElderIllustration';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { api, ApiError } from '../services/api';
import { extractFaceDescriptor, generateSyntheticDescriptor, loadFaceApiModels } from '../services/faceApi';
import { UserRole } from '../types/api';

export const LoginPage: React.FC = () => {
  const [role, setRole] = useState<UserRole>('patient');
  const [usePasswordForPatient, setUsePasswordForPatient] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Face ID state
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const { login } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect destination after login
  const from = (location.state as any)?.from?.pathname;

  // Start webcam when patient Face ID is active
  useEffect(() => {
    if (role === 'patient' && !usePasswordForPatient) {
      loadFaceApiModels();
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [role, usePasswordForPatient]);

  const startCamera = async () => {
    setCameraError(null);
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 480 }, height: { ideal: 480 } },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
        setCameraActive(true);
      } else {
        setCameraError('Webcam access not supported in this environment.');
      }
    } catch (err: any) {
      setCameraError('Camera permission denied or camera unavailable. You can use Demo Face Scan or sign in with password.');
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const handleFaceLogin = async (descriptorToUse?: number[]) => {
    setErrorMsg(null);
    setIsScanning(true);
    try {
      let descriptor = descriptorToUse;

      if (!descriptor) {
        if (!videoRef.current) {
          throw new Error('Camera feed not ready');
        }
        const extracted = await extractFaceDescriptor(videoRef.current);
        if (!extracted) {
          throw new Error('No face detected clearly. Please center your face in the circle or use the Demo Face Scan button.');
        }
        descriptor = extracted;
      }

      const res = await api.faceLogin({ descriptor });
      login(res.token, res.user);

      stopCamera();
      if (from) {
        navigate(from, { replace: true });
      } else {
        navigate('/home', { replace: true });
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Face sign in failed. Please try again or use password.');
    } finally {
      setIsScanning(false);
    }
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const res = await api.login({ email: email.trim(), password });
      login(res.token, res.user);

      if (from) {
        navigate(from, { replace: true });
      } else if (res.user.role === 'patient') {
        navigate('/home', { replace: true });
      } else if (res.user.role === 'relative') {
        navigate('/family', { replace: true });
      } else if (res.user.role === 'doctor') {
        navigate('/doctor', { replace: true });
      }
    } catch (err: any) {
      if (err.status === 401) {
        setErrorMsg('Incorrect email or password. Please try again.');
      } else if (err.status === 429) {
        setErrorMsg('Too many attempts. Please pause a moment before trying again.');
      } else {
        setErrorMsg(err.message || 'Unable to sign in. Please check your network.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoFaceScan = () => {
    // Generate synthetic descriptor for seeded patient Lakshmi
    const demoDescriptor = generateSyntheticDescriptor('lakshmi');
    handleFaceLogin(demoDescriptor);
  };

  return (
    <div className="min-h-[calc(100vh-4.5rem)] bg-sand/20 dark:bg-ink flex items-center justify-center py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-12 bg-paper dark:bg-teal-950/40 rounded-3xl shadow-soft border border-sand dark:border-teal-800 overflow-hidden">
        {/* Left Editorial Panel */}
        <div className="hidden lg:flex lg:col-span-5 bg-teal dark:bg-teal-900 text-paper p-10 flex-col justify-between relative overflow-hidden">
          <div className="relative z-10 space-y-4">
            <span className="text-xs uppercase tracking-widest text-mint font-semibold">
              Welcome Back
            </span>
            <h2 className="text-3xl font-serif font-bold text-paper leading-snug">
              "To care for those who once cared for us is one of the highest honors."
            </h2>
            <p className="text-mint/80 text-sm leading-relaxed">
              CareCircle keeps families gently informed and elders safely connected to doctors and pharmacies across India.
            </p>
          </div>

          <div className="relative z-10 py-4 flex justify-center">
            <ElderIllustration className="w-52 h-52 text-paper opacity-90 drop-shadow-sm" />
          </div>

          <div className="relative z-10 text-xs text-mint/70 border-t border-teal-700/60 pt-4">
            Secured with local face verification and 256-bit encrypted sessions.
          </div>
        </div>

        {/* Right Form Panel */}
        <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-center">
          {/* Role Selection Tabs */}
          <div className="mb-8">
            <label className="block text-xs font-bold uppercase tracking-wider text-ink/60 dark:text-sand/60 mb-2">
              Select Your Role
            </label>
            <div className="grid grid-cols-3 gap-2 p-1.5 bg-sand/50 dark:bg-ink/50 rounded-2xl border border-sand dark:border-teal-800">
              {(
                [
                  { id: 'patient', label: 'Elder (Patient)' },
                  { id: 'relative', label: 'Family Member' },
                  { id: 'doctor', label: 'Doctor' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setRole(tab.id);
                    setErrorMsg(null);
                  }}
                  className={`py-2.5 px-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                    role === tab.id
                      ? 'bg-teal text-white shadow-sm'
                      : 'text-ink/70 dark:text-sand/70 hover:text-ink'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Error Banner */}
          {errorMsg && (
            <div
              role="alert"
              className="mb-6 p-4 rounded-2xl bg-clay/10 border border-clay/30 text-clay flex items-start gap-3 text-sm font-medium"
            >
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Patient Face ID View */}
          {role === 'patient' && !usePasswordForPatient ? (
            <div className="space-y-6 text-center">
              <div>
                <h3 className="text-2xl font-serif font-bold text-ink dark:text-paper">
                  Look at the Screen to Sign In
                </h3>
                <p className="text-sm text-ink/70 dark:text-sand/70 mt-1">
                  Position your face inside the circle. CareCircle verifies your identity automatically.
                </p>
              </div>

              {/* Circular Camera Preview */}
              <div className="relative w-64 h-64 mx-auto">
                <div className="w-full h-full rounded-full overflow-hidden border-4 border-teal shadow-soft bg-ink/10 relative">
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    className="w-full h-full object-cover transform -scale-x-100"
                  />
                  {/* Scanning ring animation */}
                  {isScanning && (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                      className="absolute inset-0 rounded-full border-4 border-transparent border-t-mint border-r-mint pointer-events-none"
                    />
                  )}
                </div>
              </div>

              {cameraError && (
                <p className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 p-2.5 rounded-xl border border-amber-200 dark:border-amber-900">
                  {cameraError}
                </p>
              )}

              <div className="space-y-3">
                <Button
                  size="patient"
                  variant="primary"
                  onClick={() => handleFaceLogin()}
                  isLoading={isScanning}
                  disabled={!cameraActive && !cameraError}
                  className="w-full text-lg shadow-md"
                >
                  <Camera className="w-6 h-6 mr-2" />
                  <span>Scan My Face</span>
                </Button>

                {/* Demo fallback button */}
                <Button
                  variant="secondary"
                  size="default"
                  onClick={handleDemoFaceScan}
                  className="w-full text-xs font-semibold"
                >
                  <UserCheck className="w-4 h-4 mr-2" />
                  <span>Demo Face Scan (Simulated for Lakshmi)</span>
                </Button>

                <button
                  type="button"
                  onClick={() => setUsePasswordForPatient(true)}
                  className="text-xs text-teal dark:text-mint font-semibold hover:underline block mx-auto pt-2"
                >
                  Or sign in with email and password
                </button>
              </div>
            </div>
          ) : (
            /* Email & Password Form (for Relative, Doctor, or Patient fallback) */
            <form onSubmit={handlePasswordLogin} className="space-y-5">
              <div>
                <h3 className="text-2xl font-serif font-bold text-ink dark:text-paper">
                  Sign in as {role === 'doctor' ? 'Doctor' : role === 'relative' ? 'Family Member' : 'Patient'}
                </h3>
                <p className="text-sm text-ink/70 dark:text-sand/70 mt-1">
                  Enter your registered email address and password.
                </p>
              </div>

              <Input
                label="Email Address"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                icon={<Mail className="w-5 h-5 text-ink/40 dark:text-sand/40" />}
              />

              <Input
                label="Password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                icon={<Lock className="w-5 h-5 text-ink/40 dark:text-sand/40" />}
              />

              <Button
                type="submit"
                size={role === 'patient' ? 'patient' : 'default'}
                variant="primary"
                isLoading={isSubmitting}
                className="w-full mt-2"
              >
                <span>Sign In</span>
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>

              {role === 'patient' && (
                <button
                  type="button"
                  onClick={() => setUsePasswordForPatient(false)}
                  className="text-xs text-teal dark:text-mint font-semibold hover:underline block mx-auto pt-2"
                >
                  ← Return to Face ID Sign In
                </button>
              )}
            </form>
          )}

          {/* Registration Link */}
          <div className="mt-8 pt-6 border-t border-sand dark:border-teal-900/60 text-center text-sm text-ink/70 dark:text-sand/70">
            <span>Do not have an account yet? </span>
            <Link to="/register" className="font-semibold text-teal dark:text-mint hover:underline">
              Create an account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
