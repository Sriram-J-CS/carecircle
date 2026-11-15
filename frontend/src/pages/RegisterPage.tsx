import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  User as UserIcon,
  Camera,
  Heart,
  Phone,
  Pill,
  Hospital,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { Stepper } from '../components/ui/Stepper';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { extractFaceDescriptor, generateSyntheticDescriptor, loadFaceApiModels } from '../services/faceApi';
import {
  UserRole,
  DoctorDirectoryItem,
  HospitalDirectoryItem,
  MedicineDirectoryItem,
  ContactIn,
} from '../types/api';

const DRAFT_KEY = 'carecircle_register_draft';

export const RegisterPage: React.FC = () => {
  const [role, setRole] = useState<UserRole>('patient');
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Directories
  const [hospitals, setHospitals] = useState<HospitalDirectoryItem[]>([]);
  const [doctors, setDoctors] = useState<DoctorDirectoryItem[]>([]);
  const [medicines, setMedicines] = useState<MedicineDirectoryItem[]>([]);
  const [states, setStates] = useState<string[]>([]);

  // Form Fields
  const [name, setName] = useState('');
  const [age, setAge] = useState<number | ''>(72);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [language, setLanguage] = useState('en');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Chennai');
  const [state, setState] = useState('Tamil Nadu');
  const [pincode, setPincode] = useState('600001');

  // Relative/Doctor specific
  const [registrationNo, setRegistrationNo] = useState('');
  const [selectedDoctorDirId, setSelectedDoctorDirId] = useState<number | undefined>(undefined);

  // Face Enrollment
  const [faceDescriptor, setFaceDescriptor] = useState<number[] | null>(null);
  const [capturedFrames, setCapturedFrames] = useState<number[][]>([]);
  const [isEnrollingFace, setIsEnrollingFace] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Contacts
  const [contacts, setContacts] = useState<ContactIn[]>([
    { name: 'Ravi Raman', phone: '9840012345', relation: 'son', email: 'ravi@example.com', app_access: true },
  ]);

  // Medical
  const [conditions, setConditions] = useState<string[]>(['hypertension']);
  const [allergies, setAllergies] = useState<string[]>(['Penicillin']);
  const [hospitalId, setHospitalId] = useState<number | undefined>(undefined);
  const [doctorIds, setDoctorIds] = useState<number[]>([]);

  // Initial Medicines to schedule
  const [initMedicines, setInitMedicines] = useState<
    Array<{ medicine_name: string; dosage: string; times: string[]; with_food: 'before' | 'after' | 'with' | 'any' }>
  >([
    { medicine_name: 'Telma 40', dosage: '1 tablet (40mg)', times: ['08:00'], with_food: 'after' },
    { medicine_name: 'Metformin 500', dosage: '1 tablet (500mg)', times: ['08:00'], with_food: 'after' },
  ]);

  const { login } = useAuth();
  const navigate = useNavigate();

  // Load directories
  useEffect(() => {
    async function loadData() {
      try {
        const [hList, dList, mList, sList] = await Promise.all([
          api.getHospitals().catch(() => []),
          api.getDoctors().catch(() => []),
          api.getMedicines().catch(() => []),
          api.getStates().catch(() => ['Tamil Nadu', 'Karnataka', 'Maharashtra', 'Delhi']),
        ]);
        setHospitals(hList);
        setDoctors(dList);
        setMedicines(mList);
        setStates(sList);
        if (hList.length > 0 && !hospitalId) setHospitalId(hList[0].id);
        if (dList.length > 0 && doctorIds.length === 0) setDoctorIds([dList[0].id]);
      } catch {
        // ignore
      }
    }
    loadData();
  }, []);

  // Face camera lifecycle
  useEffect(() => {
    if (role === 'patient' && step === 2) {
      loadFaceApiModels();
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [role, step]);

  const startCamera = async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 480 }, height: { ideal: 480 } },
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      }
    } catch {
      // Camera permission or device missing
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const captureFrame = async () => {
    if (!videoRef.current) return;
    setIsEnrollingFace(true);
    setErrorMsg(null);
    try {
      const descriptor = await extractFaceDescriptor(videoRef.current);
      if (!descriptor) {
        throw new Error('Could not clearly detect face. Please look straight into the camera.');
      }
      const updated = [...capturedFrames, descriptor];
      setCapturedFrames(updated);

      if (updated.length >= 3) {
        // Average 3 frames
        const averaged = new Array(128).fill(0);
        for (let i = 0; i < 128; i++) {
          averaged[i] = (updated[0][i] + updated[1][i] + updated[2][i]) / 3;
        }
        setFaceDescriptor(averaged);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Face detection error');
    } finally {
      setIsEnrollingFace(false);
    }
  };

  const useDemoFace = () => {
    const demoDesc = generateSyntheticDescriptor(name || 'lakshmi');
    setFaceDescriptor(demoDesc);
    setCapturedFrames([demoDesc, demoDesc, demoDesc]);
  };

  const handleSubmit = async () => {
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      // Validate password policy
      if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
        throw new Error('Password must be at least 8 characters and contain at least one letter and one number.');
      }

      const payload: any = {
        role,
        name: name.trim(),
        phone: phone.trim() || '9876543210',
        email: email.trim().toLowerCase(),
        password,
        language,
      };

      if (role === 'patient') {
        payload.age = age ? Number(age) : 72;
        payload.address = address;
        payload.city = city;
        payload.state = state;
        payload.pincode = pincode;
        payload.conditions = conditions;
        payload.allergies = allergies;
        payload.emergency_contacts = contacts;
        payload.hospital_id = hospitalId;
        payload.doctor_ids = doctorIds;
        payload.face_descriptor = faceDescriptor || generateSyntheticDescriptor(name || 'patient');
      } else if (role === 'doctor') {
        payload.registration_no = registrationNo || 'MCI-12345';
        payload.doctor_directory_id = selectedDoctorDirId;
      }

      const res = await api.register(payload);
      login(res.token, res.user);

      // If patient, also schedule the initial medicines
      if (role === 'patient' && initMedicines.length > 0) {
        for (const med of initMedicines) {
          try {
            await api.addPatientSchedule('me', {
              medicine_name: med.medicine_name,
              dosage: med.dosage,
              times: med.times,
              with_food: med.with_food,
            });
          } catch {
            // non-fatal
          }
        }
      }

      if (role === 'patient') navigate('/home');
      else if (role === 'relative') navigate('/family');
      else if (role === 'doctor') navigate('/doctor');
    } catch (err: any) {
      setErrorMsg(err.message || 'Registration failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const patientStepLabels = ['Profile', 'Face ID', 'Contacts', 'Medical', 'Schedule', 'Review'];

  return (
    <div className="min-h-[calc(100vh-4.5rem)] bg-sand/20 dark:bg-ink py-10 px-4 sm:px-6 lg:px-8 flex justify-center">
      <div className="max-w-3xl w-full bg-paper dark:bg-teal-950/40 rounded-3xl shadow-soft border border-sand dark:border-teal-800 p-6 sm:p-10">
        {/* Header */}
        <div className="text-center mb-8 space-y-2">
          <h2 className="text-3xl font-serif font-bold text-ink dark:text-paper">
            Create Your CareCircle Account
          </h2>
          <p className="text-ink/70 dark:text-sand/70 text-sm">
            Setting up compassionate, reliable care takes just a few moments.
          </p>

          {/* Role selector */}
          <div className="flex justify-center pt-2">
            <div className="inline-grid grid-cols-3 gap-1 p-1 bg-sand/50 dark:bg-ink/50 rounded-2xl border border-sand dark:border-teal-800">
              {(['patient', 'relative', 'doctor'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => {
                    setRole(r);
                    setStep(1);
                  }}
                  className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl capitalize transition-all ${
                    role === r
                      ? 'bg-teal text-white shadow-sm'
                      : 'text-ink/70 dark:text-sand/70 hover:text-ink'
                  }`}
                >
                  {r === 'patient' ? 'Elder (Patient)' : r === 'relative' ? 'Family Member' : 'Doctor'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Stepper for Patient */}
        {role === 'patient' && (
          <div className="mb-8">
            <Stepper currentStep={step} totalSteps={6} labels={patientStepLabels} />
          </div>
        )}

        {/* Error message */}
        {errorMsg && (
          <div className="mb-6 p-4 rounded-2xl bg-clay/10 border border-clay/30 text-clay flex items-start gap-3 text-sm font-medium">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form Content */}
        <div className="space-y-6">
          {/* Patient Step 1: Basic Profile */}
          {((role === 'patient' && step === 1) || role !== 'patient') && (
            <div className="space-y-4">
              <h3 className="text-xl font-serif font-bold text-ink dark:text-paper">
                Personal Information
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Full Name"
                  required
                  placeholder={role === 'patient' ? 'Lakshmi Raman' : 'Ravi Raman'}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                {role === 'patient' && (
                  <Input
                    label="Age"
                    type="number"
                    required
                    placeholder="72"
                    value={age}
                    onChange={(e) => setAge(e.target.value ? Number(e.target.value) : '')}
                  />
                )}
                <Input
                  label="Mobile Number"
                  required
                  placeholder="9840012345"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
                <Input
                  label="Email Address"
                  type="email"
                  required
                  placeholder="lakshmi@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <div className="sm:col-span-2">
                  <Input
                    label="Password (min 8 chars, 1 letter, 1 number)"
                    type="password"
                    required
                    placeholder="CareCircle2026"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              {role === 'patient' && (
                <div className="space-y-4 pt-2">
                  <h4 className="text-base font-serif font-semibold text-ink dark:text-paper">
                    Address & Language
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-3">
                      <Input
                        label="Street Address"
                        placeholder="Flat 3A, Heritage Apts, T. Nagar"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                      />
                    </div>
                    <Input
                      label="City"
                      placeholder="Chennai"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                    />
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-ink/70 dark:text-sand/70 mb-1">
                        State
                      </label>
                      <select
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                        className="w-full px-4 py-3 rounded-2xl bg-paper dark:bg-teal-900 border border-sand dark:border-teal-700 text-ink dark:text-paper text-sm focus:outline-none focus:ring-2 focus:ring-teal"
                      >
                        {states.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    </div>
                    <Input
                      label="Pincode"
                      placeholder="600017"
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {role === 'doctor' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <Input
                    label="Medical Council Registration No."
                    placeholder="MCI-48921"
                    value={registrationNo}
                    onChange={(e) => setRegistrationNo(e.target.value)}
                  />
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-ink/70 dark:text-sand/70 mb-1">
                      Associate with Directory Profile
                    </label>
                    <select
                      value={selectedDoctorDirId || ''}
                      onChange={(e) => setSelectedDoctorDirId(e.target.value ? Number(e.target.value) : undefined)}
                      className="w-full px-4 py-3 rounded-2xl bg-paper dark:bg-teal-900 border border-sand dark:border-teal-700 text-ink dark:text-paper text-sm focus:outline-none focus:ring-2 focus:ring-teal"
                    >
                      <option value="">Select doctor...</option>
                      {doctors.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({d.specialty})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Patient Step 2: Face ID Enrollment */}
          {role === 'patient' && step === 2 && (
            <div className="space-y-6 text-center">
              <div>
                <h3 className="text-xl font-serif font-bold text-ink dark:text-paper">
                  Face ID Enrollment
                </h3>
                <p className="text-sm text-ink/70 dark:text-sand/70 mt-1">
                  We capture 3 quick scans to ensure smooth, secure sign-in without passwords.
                </p>
              </div>

              <div className="relative w-56 h-56 mx-auto">
                <div className="w-full h-full rounded-full overflow-hidden border-4 border-teal shadow-soft bg-ink/10 relative">
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    className="w-full h-full object-cover transform -scale-x-100"
                  />
                  {faceDescriptor && (
                    <div className="absolute inset-0 bg-teal/30 backdrop-blur-xs flex items-center justify-center">
                      <CheckCircle2 className="w-16 h-16 text-mint drop-shadow-md" />
                    </div>
                  )}
                </div>
              </div>

              {/* Progress counter */}
              <div className="flex justify-center items-center gap-3">
                {[1, 2, 3].map((idx) => (
                  <div
                    key={idx}
                    className={`w-4 h-4 rounded-full border-2 transition-all ${
                      capturedFrames.length >= idx
                        ? 'bg-teal border-teal scale-110'
                        : 'border-sand dark:border-teal-800'
                    }`}
                  />
                ))}
                <span className="text-xs font-semibold text-ink/70 dark:text-sand/70 ml-2">
                  {capturedFrames.length} of 3 scans captured
                </span>
              </div>

              <div className="flex flex-wrap justify-center gap-3 pt-2">
                <Button
                  variant="primary"
                  onClick={captureFrame}
                  isLoading={isEnrollingFace}
                  disabled={capturedFrames.length >= 3}
                >
                  <Camera className="w-5 h-5 mr-2" />
                  <span>{capturedFrames.length >= 3 ? 'Face Enrolled' : 'Capture Face Scan'}</span>
                </Button>

                <Button variant="secondary" onClick={useDemoFace}>
                  <span>Auto-Enroll Demo Face</span>
                </Button>
              </div>
            </div>
          )}

          {/* Patient Step 3: Emergency Contacts */}
          {role === 'patient' && step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-serif font-bold text-ink dark:text-paper">
                    Emergency Contacts
                  </h3>
                  <p className="text-xs text-ink/70 dark:text-sand/70">
                    Contacts with "Dashboard Access" can monitor your daily medicine and check-ins.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    setContacts([
                      ...contacts,
                      { name: '', phone: '', relation: 'family', email: '', app_access: true },
                    ])
                  }
                >
                  <Plus className="w-4 h-4 mr-1" />
                  <span>Add Contact</span>
                </Button>
              </div>

              <div className="space-y-4">
                {contacts.map((contact, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-sand/30 dark:bg-ink/40 border border-sand dark:border-teal-800 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-teal dark:text-mint uppercase">
                        Contact #{idx + 1}
                      </span>
                      {contacts.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setContacts(contacts.filter((_, i) => i !== idx))}
                          className="text-clay hover:opacity-80 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Input
                        label="Full Name"
                        placeholder="Ravi Raman"
                        value={contact.name}
                        onChange={(e) => {
                          const updated = [...contacts];
                          updated[idx].name = e.target.value;
                          setContacts(updated);
                        }}
                      />
                      <Input
                        label="Phone Number"
                        placeholder="9840012345"
                        value={contact.phone}
                        onChange={(e) => {
                          const updated = [...contacts];
                          updated[idx].phone = e.target.value;
                          setContacts(updated);
                        }}
                      />
                      <Input
                        label="Relationship"
                        placeholder="Son / Daughter / Spouse"
                        value={contact.relation}
                        onChange={(e) => {
                          const updated = [...contacts];
                          updated[idx].relation = e.target.value;
                          setContacts(updated);
                        }}
                      />
                      <Input
                        label="Email Address (for relative app login)"
                        placeholder="ravi@example.com"
                        value={contact.email || ''}
                        onChange={(e) => {
                          const updated = [...contacts];
                          updated[idx].email = e.target.value;
                          setContacts(updated);
                        }}
                      />
                    </div>
                    <label className="flex items-center gap-2 pt-1 text-sm font-medium text-ink/80 dark:text-sand/80 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={contact.app_access}
                        onChange={(e) => {
                          const updated = [...contacts];
                          updated[idx].app_access = e.target.checked;
                          setContacts(updated);
                        }}
                        className="w-4 h-4 text-teal rounded border-sand focus:ring-teal"
                      />
                      <span>Grant Family Dashboard Access to this person</span>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Patient Step 4: Medical Details & Doctors */}
          {role === 'patient' && step === 4 && (
            <div className="space-y-6">
              <h3 className="text-xl font-serif font-bold text-ink dark:text-paper">
                Medical Background & Hospital
              </h3>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-ink/70 dark:text-sand/70 mb-2">
                  Health Conditions
                </label>
                <div className="flex flex-wrap gap-2">
                  {['hypertension', 'type_2_diabetes', 'cardiac', 'arthritis', 'asthma', 'thyroid'].map((cond) => {
                    const selected = conditions.includes(cond);
                    return (
                      <button
                        key={cond}
                        type="button"
                        onClick={() => {
                          if (selected) setConditions(conditions.filter((c) => c !== cond));
                          else setConditions([...conditions, cond]);
                        }}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                          selected
                            ? 'bg-teal text-white border-teal'
                            : 'bg-paper dark:bg-teal-900/60 border-sand dark:border-teal-800 text-ink/70 dark:text-sand/70'
                        }`}
                      >
                        {cond.replace('_', ' ')}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-ink/70 dark:text-sand/70 mb-1">
                    Primary Hospital
                  </label>
                  <select
                    value={hospitalId || ''}
                    onChange={(e) => setHospitalId(e.target.value ? Number(e.target.value) : undefined)}
                    className="w-full px-4 py-3 rounded-2xl bg-paper dark:bg-teal-900 border border-sand dark:border-teal-700 text-ink dark:text-paper text-sm focus:outline-none focus:ring-2 focus:ring-teal"
                  >
                    {hospitals.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name} ({h.city})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-ink/70 dark:text-sand/70 mb-1">
                    Attending Doctor
                  </label>
                  <select
                    value={doctorIds[0] || ''}
                    onChange={(e) => setDoctorIds([Number(e.target.value)])}
                    className="w-full px-4 py-3 rounded-2xl bg-paper dark:bg-teal-900 border border-sand dark:border-teal-700 text-ink dark:text-paper text-sm focus:outline-none focus:ring-2 focus:ring-teal"
                  >
                    {doctors.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} - {d.specialty}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Patient Step 5: Medicine Schedule */}
          {role === 'patient' && step === 5 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-serif font-bold text-ink dark:text-paper">
                    Prescribed Medicines
                  </h3>
                  <p className="text-xs text-ink/70 dark:text-sand/70">
                    CareCircle sets up pill reminders with front camera verification for these medicines.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    setInitMedicines([
                      ...initMedicines,
                      { medicine_name: '', dosage: '1 tablet', times: ['08:00'], with_food: 'after' },
                    ])
                  }
                >
                  <Plus className="w-4 h-4 mr-1" />
                  <span>Add Medicine</span>
                </Button>
              </div>

              <div className="space-y-4">
                {initMedicines.map((med, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-sand/30 dark:bg-ink/40 border border-sand dark:border-teal-800 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-teal dark:text-mint uppercase">
                        Medicine #{idx + 1}
                      </span>
                      {initMedicines.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setInitMedicines(initMedicines.filter((_, i) => i !== idx))}
                          className="text-clay hover:opacity-80 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Input
                        label="Medicine Name"
                        placeholder="Telma 40"
                        value={med.medicine_name}
                        onChange={(e) => {
                          const updated = [...initMedicines];
                          updated[idx].medicine_name = e.target.value;
                          setInitMedicines(updated);
                        }}
                      />
                      <Input
                        label="Dosage"
                        placeholder="1 tablet (40mg)"
                        value={med.dosage}
                        onChange={(e) => {
                          const updated = [...initMedicines];
                          updated[idx].dosage = e.target.value;
                          setInitMedicines(updated);
                        }}
                      />
                      <Input
                        label="Scheduled Time (24h HH:MM)"
                        placeholder="08:00"
                        value={med.times[0] || '08:00'}
                        onChange={(e) => {
                          const updated = [...initMedicines];
                          updated[idx].times = [e.target.value];
                          setInitMedicines(updated);
                        }}
                      />
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-ink/70 dark:text-sand/70 mb-1">
                          Food Instruction
                        </label>
                        <select
                          value={med.with_food}
                          onChange={(e: any) => {
                            const updated = [...initMedicines];
                            updated[idx].with_food = e.target.value;
                            setInitMedicines(updated);
                          }}
                          className="w-full px-4 py-3 rounded-2xl bg-paper dark:bg-teal-900 border border-sand dark:border-teal-700 text-ink dark:text-paper text-sm focus:outline-none focus:ring-2 focus:ring-teal"
                        >
                          <option value="after">After Food</option>
                          <option value="before">Before Food</option>
                          <option value="with">With Food</option>
                          <option value="any">Any Time</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Patient Step 6: Review & Confirmation */}
          {role === 'patient' && step === 6 && (
            <div className="space-y-6">
              <h3 className="text-xl font-serif font-bold text-ink dark:text-paper">
                Review & Confirm Enrollment
              </h3>

              <div className="bg-sand/30 dark:bg-ink/40 rounded-2xl p-5 border border-sand dark:border-teal-800 space-y-4">
                <div className="flex justify-between border-b border-sand dark:border-teal-900 pb-3">
                  <span className="text-sm text-ink/70 dark:text-sand/70">Patient Name</span>
                  <span className="font-semibold text-ink dark:text-paper">
                    {name} ({age} yrs)
                  </span>
                </div>
                <div className="flex justify-between border-b border-sand dark:border-teal-900 pb-3">
                  <span className="text-sm text-ink/70 dark:text-sand/70">Phone & Email</span>
                  <span className="font-semibold text-ink dark:text-paper">
                    {phone} • {email}
                  </span>
                </div>
                <div className="flex justify-between border-b border-sand dark:border-teal-900 pb-3">
                  <span className="text-sm text-ink/70 dark:text-sand/70">Face ID Status</span>
                  <span className="font-semibold text-teal dark:text-mint flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Ready
                  </span>
                </div>
                <div className="flex justify-between border-b border-sand dark:border-teal-900 pb-3">
                  <span className="text-sm text-ink/70 dark:text-sand/70">Emergency Contact</span>
                  <span className="font-semibold text-ink dark:text-paper">
                    {contacts[0]?.name} ({contacts[0]?.relation})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-ink/70 dark:text-sand/70">Scheduled Doses</span>
                  <span className="font-semibold text-ink dark:text-paper">
                    {initMedicines.map((m) => m.medicine_name).join(', ')}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between pt-6 border-t border-sand dark:border-teal-900">
            {role === 'patient' && step > 1 ? (
              <Button variant="secondary" onClick={() => setStep(step - 1)}>
                <ArrowLeft className="w-4 h-4 mr-1.5" />
                <span>Back</span>
              </Button>
            ) : (
              <div />
            )}

            {role === 'patient' && step < 6 ? (
              <Button
                variant="primary"
                onClick={() => {
                  setErrorMsg(null);
                  if (step === 1 && (!name || !email || !password)) {
                    setErrorMsg('Please fill in required fields (Name, Email, Password).');
                    return;
                  }
                  setStep(step + 1);
                }}
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            ) : (
              <Button
                variant="primary"
                isLoading={isSubmitting}
                onClick={handleSubmit}
                className="px-8"
              >
                <span>Complete Registration</span>
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            )}
          </div>
        </div>

        {/* Existing account link */}
        <div className="mt-8 text-center text-sm text-ink/70 dark:text-sand/70">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-teal dark:text-mint hover:underline">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
};
