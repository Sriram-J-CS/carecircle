import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { directoryApi, patientApi } from '../services/api';
import { FaceCamera } from '../components/auth/FaceCamera';
import {
  UserRole,
  ContactIn,
  Hospital,
  Doctor,
  Medicine,
  ScheduleIn,
} from '../types/api';
import {
  UserCheck,
  Stethoscope,
  Users,
  Camera,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Search,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Clock,
  HeartHandshake,
  Building2,
  Pill,
} from 'lucide-react';
import toast from 'react-hot-toast';

const COMMON_CONDITIONS = [
  'Diabetes',
  'Hypertension',
  'Heart disease',
  'Asthma / COPD',
  'Kidney disease',
  'Arthritis',
  'Thyroid',
  'Other',
];

const RELATIONS = [
  { value: 'son', label: 'Son' },
  { value: 'daughter', label: 'Daughter' },
  { value: 'spouse', label: 'Spouse (Husband / Wife)' },
  { value: 'brother', label: 'Brother' },
  { value: 'sister', label: 'Sister' },
  { value: 'neighbour', label: 'Neighbour' },
  { value: 'friend', label: 'Friend' },
  { value: 'other', label: 'Other' },
];

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

interface MedicineDraft {
  name: string;
  dosage: string;
  times: string[];
  with_food: 'before' | 'after' | 'with' | 'any';
}

export const RegisterPage: React.FC = () => {
  const { register, getDashboardPath } = useAuth();
  const { t, speak, language: currentLang } = useLanguage();
  const navigate = useNavigate();

  // Wizard Step
  // 0: Role Selection
  // 1+: Role-specific steps
  const [step, setStep] = useState(0);
  const [role, setRole] = useState<UserRole>('patient');

  // Common User fields
  const [name, setName] = useState('');
  const [age, setAge] = useState<string>('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState(currentLang);
  const [faceDescriptor, setFaceDescriptor] = useState<number[] | null>(null);

  // Patient Step 2: Emergency Contacts
  const [contacts, setContacts] = useState<ContactIn[]>([
    { name: '', phone: '', relation: 'son', email: '', app_access: true },
  ]);

  // Patient Step 3: Health & Address
  const [selectedConditions, setSelectedConditions] = useState<string[]>([]);
  const [otherCondition, setOtherCondition] = useState('');
  const [allergies, setAllergies] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [statesList, setStatesList] = useState<string[]>([]);

  // Patient Step 4: Hospital & Doctors
  const [hospitalSearch, setHospitalSearch] = useState('');
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);
  const [doctorsList, setDoctorsList] = useState<Doctor[]>([]);
  const [selectedDoctorIds, setSelectedDoctorIds] = useState<number[]>([]);
  const [loadingHospitals, setLoadingHospitals] = useState(false);
  const [loadingDoctors, setLoadingDoctors] = useState(false);

  // Patient Step 5: Medicines
  const [medicines, setMedicines] = useState<MedicineDraft[]>([
    { name: '', dosage: '1 tablet', times: ['08:00'], with_food: 'after' },
  ]);
  const [activeMedicineIndex, setActiveMedicineIndex] = useState(0);
  const [medicineQuery, setMedicineQuery] = useState('');
  const [medicineSuggestions, setMedicineSuggestions] = useState<Medicine[]>([]);

  // Doctor-specific fields
  const [registrationNo, setRegistrationNo] = useState('');
  const [doctorDirectoryId, setDoctorDirectoryId] = useState<number | null>(null);
  const [doctorDirectorySearch, setDoctorDirectorySearch] = useState('');
  const [doctorDirectoryResults, setDoctorDirectoryResults] = useState<Doctor[]>([]);

  // Submission & Completion
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error409, setError409] = useState<{ message: string; type: 'email' | 'face' } | null>(null);
  const [registeredUser, setRegisteredUser] = useState<any | null>(null);

  // Fetch states on mount
  useEffect(() => {
    directoryApi.getStates().then((res) => {
      if (Array.isArray(res)) setStatesList(res);
    }).catch(console.warn);
  }, []);

  // Search hospitals when letter or query changes
  const searchHospitals = async (letterOrQuery: string) => {
    setLoadingHospitals(true);
    try {
      const res = await directoryApi.getHospitals({
        q: letterOrQuery,
        state: state || undefined,
        limit: 25,
      });
      setHospitals(res);
    } catch (err) {
      console.warn('Failed to fetch hospitals', err);
    } finally {
      setLoadingHospitals(false);
    }
  };

  // Fetch doctors when hospital selected
  const handleSelectHospital = async (h: Hospital) => {
    setSelectedHospital(h);
    setLoadingDoctors(true);
    setSelectedDoctorIds([]);
    try {
      const res = await directoryApi.getDoctors({ hospital_id: h.id, limit: 50 });
      setDoctorsList(res);
    } catch (err) {
      console.warn('Failed to fetch doctors', err);
    } finally {
      setLoadingDoctors(false);
    }
  };

  // Search medicines for autocomplete
  const handleSearchMedicine = async (q: string) => {
    setMedicineQuery(q);
    if (!q.trim()) {
      setMedicineSuggestions([]);
      return;
    }
    try {
      const res = await directoryApi.getMedicines({ q, limit: 10 });
      setMedicineSuggestions(res);
    } catch (err) {
      console.warn(err);
    }
  };

  // Search doctors for doctor directory registration
  const handleSearchDoctorDirectory = async (q: string) => {
    setDoctorDirectorySearch(q);
    if (!q.trim()) {
      setDoctorDirectoryResults([]);
      return;
    }
    try {
      const res = await directoryApi.getDoctors({ q, limit: 15 });
      setDoctorDirectoryResults(res);
    } catch (err) {
      console.warn(err);
    }
  };

  // Handle contact list operations
  const addContact = () => {
    setContacts([
      ...contacts,
      { name: '', phone: '', relation: 'relative', email: '', app_access: true },
    ]);
  };

  const removeContact = (index: number) => {
    if (contacts.length <= 1) return;
    setContacts(contacts.filter((_, i) => i !== index));
  };

  const updateContact = (index: number, field: keyof ContactIn, value: any) => {
    const updated = [...contacts];
    updated[index] = { ...updated[index], [field]: value };
    setContacts(updated);
  };

  // Handle conditions chips
  const toggleCondition = (cond: string) => {
    if (selectedConditions.includes(cond)) {
      setSelectedConditions(selectedConditions.filter((c) => c !== cond));
    } else {
      setSelectedConditions([...selectedConditions, cond]);
    }
  };

  // Handle medicines list operations
  const addMedicineDraft = () => {
    setMedicines([
      ...medicines,
      { name: '', dosage: '1 tablet', times: ['08:00'], with_food: 'after' },
    ]);
    setActiveMedicineIndex(medicines.length);
    setMedicineQuery('');
    setMedicineSuggestions([]);
  };

  const removeMedicineDraft = (index: number) => {
    setMedicines(medicines.filter((_, i) => i !== index));
    if (activeMedicineIndex >= medicines.length - 1) {
      setActiveMedicineIndex(Math.max(0, medicines.length - 2));
    }
  };

  const updateMedicine = (index: number, field: keyof MedicineDraft, value: any) => {
    const updated = [...medicines];
    updated[index] = { ...updated[index], [field]: value };
    setMedicines(updated);
  };

  const toggleMedicineTime = (index: number, timeStr: string) => {
    const currentTimes = medicines[index].times;
    let newTimes: string[];
    if (currentTimes.includes(timeStr)) {
      if (currentTimes.length === 1) return; // Keep at least one
      newTimes = currentTimes.filter((t) => t !== timeStr);
    } else {
      newTimes = [...currentTimes, timeStr].sort();
    }
    updateMedicine(index, 'times', newTimes);
  };

  // Validation before step advance
  const handleNext = () => {
    setError409(null);

    if (role === 'patient') {
      if (step === 1) {
        if (!name.trim()) return toast.error('Please enter your full name.');
        if (!phone.trim() || phone.replace(/\D/g, '').length < 10)
          return toast.error('Please enter a valid 10-digit mobile number.');
        if (!email.trim() || !email.includes('@'))
          return toast.error('Please enter a valid email address.');
        if (password.length < 6)
          return toast.error('Password must be at least 6 characters.');
        if (!faceDescriptor) {
          speak('Face scan is required for elderly patient sign in.');
          return toast.error('Face scan is required for patients. Please look at the camera and scan your face.');
        }
      }

      if (step === 2) {
        // Validate contacts
        for (const c of contacts) {
          if (!c.name.trim()) return toast.error('Please enter contact name.');
          if (!c.phone.trim() || c.phone.replace(/\D/g, '').length < 10)
            return toast.error('Please enter a valid 10-digit mobile for emergency contact.');
        }
      }
    } else if (role === 'doctor') {
      if (step === 1) {
        if (!name.trim()) return toast.error('Please enter your full name.');
        if (!phone.trim() || phone.replace(/\D/g, '').length < 10)
          return toast.error('Please enter a valid 10-digit mobile number.');
        if (!email.trim() || !email.includes('@'))
          return toast.error('Please enter a valid email address.');
        if (password.length < 6)
          return toast.error('Password must be at least 6 characters.');
      }
    } else if (role === 'relative') {
      if (step === 1) {
        if (!name.trim()) return toast.error('Please enter your full name.');
        if (!phone.trim() || phone.replace(/\D/g, '').length < 10)
          return toast.error('Please enter a valid 10-digit mobile number.');
        if (!email.trim() || !email.includes('@'))
          return toast.error('Please enter a valid email address.');
        if (password.length < 6)
          return toast.error('Password must be at least 6 characters.');
      }
    }

    setStep((prev) => prev + 1);
  };

  // Submit Registration
  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError409(null);

    const conditionsList = [...selectedConditions];
    if (otherCondition.trim()) {
      conditionsList.push(otherCondition.trim());
    }

    const payload: any = {
      role,
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim().toLowerCase(),
      password,
      language: preferredLanguage,
      face_descriptor: faceDescriptor,
    };

    if (age) {
      payload.age = parseInt(age, 10);
    }

    if (role === 'patient') {
      payload.conditions = conditionsList;
      payload.allergies = allergies.trim() ? [allergies.trim()] : [];
      payload.address = address.trim() || null;
      payload.city = city.trim() || null;
      payload.state = state.trim() || null;
      payload.pincode = pincode.trim() || null;
      payload.emergency_contacts = contacts.map((c) => ({
        name: c.name.trim(),
        phone: c.phone.trim(),
        relation: c.relation,
        email: c.email ? c.email.trim().toLowerCase() : null,
        app_access: Boolean(c.app_access),
      }));
      payload.hospital_id = selectedHospital ? selectedHospital.id : null;
      payload.doctor_ids = selectedDoctorIds;
    } else if (role === 'doctor') {
      payload.registration_no = registrationNo.trim() || null;
      payload.doctor_directory_id = doctorDirectoryId;
    }

    try {
      const user = await register(payload);

      // If patient added medicines, create schedules for each
      if (role === 'patient') {
        const validMedicines = medicines.filter((m) => m.name.trim());
        for (const m of validMedicines) {
          try {
            await patientApi.createSchedule(user.id, {
              medicine_name: m.name.trim(),
              dosage: m.dosage || '1 tablet',
              times: m.times,
              with_food: m.with_food,
            });
          } catch (mErr) {
            console.warn('Error saving schedule for:', m.name, mErr);
          }
        }
      }

      speak(`Welcome to CareCircle, ${user.name}!`);
      toast.success('Registration completed successfully!');
      setRegisteredUser(user);
    } catch (err: any) {
      console.error('Registration failed:', err);
      if (err.status === 409) {
        const isFace = err.message.toLowerCase().includes('face');
        setError409({
          message: err.message,
          type: isFace ? 'face' : 'email',
        });
        toast.error(err.message);
      } else {
        toast.error(err.message || 'Registration failed. Please check the details.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Success Screen
  if (registeredUser) {
    return (
      <div className="max-w-2xl mx-auto w-full py-12 px-4 text-center">
        <div className="w-24 h-24 rounded-full bg-emerald-100 border-4 border-emerald-500 text-emerald-700 flex items-center justify-center mx-auto mb-6 shadow-xl animate-bounce">
          <CheckCircle2 className="w-14 h-14" />
        </div>
        <h1 className="text-4xl font-black text-teal-950 mb-3">
          {t('welcomeTitle')}
        </h1>
        <p className="text-2xl font-bold text-warm-800 mb-8">
          {t('welcomeSub')}
        </p>

        <div className="elder-card p-6 sm:p-8 text-left mb-8 space-y-4">
          <h2 className="text-xl font-black text-teal-950 border-b-2 border-warm-200 pb-2">
            Your Next Steps:
          </h2>
          <ul className="space-y-3 text-lg font-semibold text-warm-900">
            {role === 'patient' && (
              <>
                <li className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-teal-850 text-white flex items-center justify-center font-bold text-sm">1</span>
                  <span>Your medicine reminders are scheduled and will alert you.</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-teal-850 text-white flex items-center justify-center font-bold text-sm">2</span>
                  <span>Emergency contacts will receive SMS alerts if you need help.</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-teal-850 text-white flex items-center justify-center font-bold text-sm">3</span>
                  <span>Tap the microphone at any time to talk to your CareCircle companion.</span>
                </li>
              </>
            )}
            {role === 'relative' && (
              <>
                <li className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-teal-850 text-white flex items-center justify-center font-bold text-sm">1</span>
                  <span>You are linked to your family member&apos;s care dashboard.</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-teal-850 text-white flex items-center justify-center font-bold text-sm">2</span>
                  <span>View live medicine adherence, 6-hourly AI check-ins, and appointments.</span>
                </li>
              </>
            )}
            {role === 'doctor' && (
              <>
                <li className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-teal-850 text-white flex items-center justify-center font-bold text-sm">1</span>
                  <span>Access clinical risk trends, symptom reports, and medicine schedules.</span>
                </li>
              </>
            )}
          </ul>
        </div>

        <button
          type="button"
          onClick={() => navigate(getDashboardPath(registeredUser.role))}
          className="w-full min-h-[64px] py-4 px-8 rounded-2xl bg-teal-900 hover:bg-teal-850 text-white font-black text-2xl shadow-xl flex items-center justify-center gap-3 transition-transform active:scale-98"
        >
          <span>{t('goToHome')}</span>
          <ArrowRight className="w-7 h-7" />
        </button>
      </div>
    );
  }

  // Calculate Total Steps based on Role
  const totalSteps = role === 'patient' ? 5 : role === 'doctor' ? 2 : 2;

  return (
    <div className="max-w-3xl mx-auto w-full py-4 sm:py-8">
      {/* Header & Step progress */}
      <div className="text-center mb-8">
        <h1 className="text-3xl sm:text-4xl font-black text-teal-950 mb-2">
          {t('register')}
        </h1>
        {step > 0 && (
          <div className="flex flex-col items-center gap-2 mt-4 max-w-md mx-auto">
            <div className="flex items-center justify-between w-full text-base font-black text-teal-900">
              <span>{t('step')} {step} {t('of')} {totalSteps}</span>
              <span className="capitalize font-bold text-warm-800">{role}</span>
            </div>
            <div className="w-full h-3 bg-warm-200 rounded-full overflow-hidden border border-warm-300">
              <div
                className="h-full bg-teal-850 transition-all duration-300 rounded-full"
                style={{ width: `${(step / totalSteps) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* 409 Conflict Friendly Banner */}
      {error409 && (
        <div
          role="alert"
          className="mb-8 p-5 rounded-2xl bg-amber-50 border-3 border-amber-400 text-amber-950 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md"
        >
          <div className="flex items-center gap-3">
            <AlertCircle className="w-8 h-8 text-amber-600 flex-shrink-0" />
            <div className="text-left">
              <p className="font-black text-xl">{error409.message}</p>
              <p className="text-base font-semibold text-amber-900">
                You already have a CareCircle account. Please sign in to continue.
              </p>
            </div>
          </div>
          <Link
            to="/login"
            className="min-h-[50px] px-5 py-2.5 bg-teal-900 hover:bg-teal-850 text-white font-black rounded-xl text-lg whitespace-nowrap shadow-sm transition-colors flex items-center gap-2"
          >
            <span>{t('signIn')}</span>
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      )}

      {/* ================= STEP 0: Choose Role ================= */}
      {step === 0 && (
        <div className="elder-card p-6 sm:p-8">
          <h2 className="text-2xl sm:text-3xl font-black text-teal-950 mb-6 text-center">
            {t('whoAreYou')}
          </h2>

          <div className="grid grid-cols-1 gap-5 mb-8">
            <button
              type="button"
              onClick={() => setRole('patient')}
              aria-pressed={role === 'patient'}
              className={`p-6 rounded-2xl text-left flex items-center justify-between transition-all min-h-[90px] ${
                role === 'patient'
                  ? 'bg-teal-900 text-white border-4 border-teal-700 shadow-xl'
                  : 'bg-white text-warm-900 border-3 border-warm-200 hover:border-teal-600'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-2xl ${role === 'patient' ? 'bg-teal-800' : 'bg-teal-100'}`}>
                  <UserCheck className={`w-8 h-8 ${role === 'patient' ? 'text-teal-200' : 'text-teal-900'}`} />
                </div>
                <div>
                  <h3 className="text-2xl font-black">{t('patient')}</h3>
                  <p className={`text-base font-semibold ${role === 'patient' ? 'text-warm-100' : 'text-warm-800'}`}>
                    {t('patientDesc')}
                  </p>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setRole('doctor')}
              aria-pressed={role === 'doctor'}
              className={`p-6 rounded-2xl text-left flex items-center justify-between transition-all min-h-[90px] ${
                role === 'doctor'
                  ? 'bg-teal-900 text-white border-4 border-teal-700 shadow-xl'
                  : 'bg-white text-warm-900 border-3 border-warm-200 hover:border-teal-600'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-2xl ${role === 'doctor' ? 'bg-teal-800' : 'bg-teal-100'}`}>
                  <Stethoscope className={`w-8 h-8 ${role === 'doctor' ? 'text-teal-200' : 'text-teal-900'}`} />
                </div>
                <div>
                  <h3 className="text-2xl font-black">{t('doctor')}</h3>
                  <p className={`text-base font-semibold ${role === 'doctor' ? 'text-warm-100' : 'text-warm-800'}`}>
                    {t('doctorDesc')}
                  </p>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setRole('relative')}
              aria-pressed={role === 'relative'}
              className={`p-6 rounded-2xl text-left flex items-center justify-between transition-all min-h-[90px] ${
                role === 'relative'
                  ? 'bg-teal-900 text-white border-4 border-teal-700 shadow-xl'
                  : 'bg-white text-warm-900 border-3 border-warm-200 hover:border-teal-600'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-2xl ${role === 'relative' ? 'bg-teal-800' : 'bg-teal-100'}`}>
                  <Users className={`w-8 h-8 ${role === 'relative' ? 'text-teal-200' : 'text-teal-900'}`} />
                </div>
                <div>
                  <h3 className="text-2xl font-black">{t('relative')}</h3>
                  <p className={`text-base font-semibold ${role === 'relative' ? 'text-warm-100' : 'text-warm-800'}`}>
                    {t('relativeDesc')}
                  </p>
                </div>
              </div>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setStep(1)}
            className="w-full min-h-[60px] py-4 px-6 rounded-2xl bg-teal-900 hover:bg-teal-850 text-white font-black text-2xl shadow-xl flex items-center justify-center gap-3 transition-transform active:scale-98"
          >
            <span>{t('next')}</span>
            <ArrowRight className="w-7 h-7" />
          </button>
        </div>
      )}

      {/* ================= PATIENT STEP 1: Face Scan + Basics ================= */}
      {role === 'patient' && step === 1 && (
        <div className="elder-card p-6 sm:p-8 space-y-6">
          <div className="text-center">
            <h2 className="text-2xl sm:text-3xl font-black text-teal-950 mb-1">
              Step 1: Scan your face &amp; Personal Info
            </h2>
            <p className="text-lg font-bold text-warm-800">
              Face ID lets you sign in easily without remembering passwords.
            </p>
          </div>

          {/* Camera Frame */}
          <div className="border-4 border-dashed border-teal-200 rounded-3xl p-4 bg-warm-50 flex flex-col items-center">
            <FaceCamera
              onCapture={(descriptor) => {
                setFaceDescriptor(descriptor);
                speak('Face captured successfully! All 3 frames verified.');
                toast.success('Face scanned and verified! (3 frames averaged)');
              }}
              requireAveraging={true}
            />

            {faceDescriptor ? (
              <div className="mt-4 flex items-center gap-2 text-emerald-800 font-black text-xl bg-emerald-100 px-5 py-2.5 rounded-2xl border-2 border-emerald-400">
                <CheckCircle2 className="w-7 h-7 text-emerald-600" />
                <span>Face registered successfully!</span>
              </div>
            ) : (
              <p className="mt-2 text-base font-black text-rose-700">
                * Face scan is required for elderly patient accounts
              </p>
            )}
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
            <div>
              <label htmlFor="reg-name" className="block text-xl font-black text-teal-950 mb-2">
                {t('name')} *
              </label>
              <input
                id="reg-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Lakshmi Sundaram"
                className="w-full min-h-[56px] px-4 py-3 rounded-2xl border-2 border-warm-300 focus:border-teal-700 bg-white text-xl font-semibold text-warm-900 shadow-sm"
              />
            </div>

            <div>
              <label htmlFor="reg-age" className="block text-xl font-black text-teal-950 mb-2">
                {t('age')}
              </label>
              <input
                id="reg-age"
                type="number"
                min="1"
                max="120"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="e.g. 72"
                className="w-full min-h-[56px] px-4 py-3 rounded-2xl border-2 border-warm-300 focus:border-teal-700 bg-white text-xl font-semibold text-warm-900 shadow-sm"
              />
            </div>

            <div>
              <label htmlFor="reg-phone" className="block text-xl font-black text-teal-950 mb-2">
                {t('phone')} *
              </label>
              <input
                id="reg-phone"
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 9876543210"
                className="w-full min-h-[56px] px-4 py-3 rounded-2xl border-2 border-warm-300 focus:border-teal-700 bg-white text-xl font-semibold text-warm-900 shadow-sm"
              />
            </div>

            <div>
              <label htmlFor="reg-email" className="block text-xl font-black text-teal-950 mb-2">
                {t('email')} *
              </label>
              <input
                id="reg-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. lakshmi@example.com"
                className="w-full min-h-[56px] px-4 py-3 rounded-2xl border-2 border-warm-300 focus:border-teal-700 bg-white text-xl font-semibold text-warm-900 shadow-sm"
              />
            </div>

            <div>
              <label htmlFor="reg-password" className="block text-xl font-black text-teal-950 mb-2">
                {t('password')} *
              </label>
              <input
                id="reg-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full min-h-[56px] px-4 py-3 rounded-2xl border-2 border-warm-300 focus:border-teal-700 bg-white text-xl font-semibold text-warm-900 shadow-sm"
              />
            </div>

            <div>
              <label htmlFor="reg-lang" className="block text-xl font-black text-teal-950 mb-2">
                {t('prefLang')}
              </label>
              <select
                id="reg-lang"
                value={preferredLanguage}
                onChange={(e) => setPreferredLanguage(e.target.value as 'en' | 'ta' | 'hi')}
                className="w-full min-h-[56px] px-4 py-3 rounded-2xl border-2 border-warm-300 focus:border-teal-700 bg-white text-xl font-semibold text-warm-900 shadow-sm"
              >
                <option value="en">English (India)</option>
                <option value="ta">தமிழ் (Tamil)</option>
                <option value="hi">हिन्दी (Hindi)</option>
              </select>
            </div>
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between gap-4 pt-4 border-t-2 border-warm-200">
            <button
              type="button"
              onClick={() => setStep(0)}
              className="min-h-[56px] px-6 py-3 rounded-2xl border-3 border-warm-300 font-bold text-xl text-warm-800 hover:bg-warm-100 flex items-center gap-2"
            >
              <ArrowLeft className="w-6 h-6" />
              <span>{t('back')}</span>
            </button>

            <button
              type="button"
              onClick={handleNext}
              className="min-h-[56px] px-8 py-3 rounded-2xl bg-teal-900 hover:bg-teal-850 text-white font-black text-xl shadow-lg flex items-center gap-3 transition-transform active:scale-98"
            >
              <span>{t('next')}</span>
              <ArrowRight className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}

      {/* ================= PATIENT STEP 2: Emergency Contacts ================= */}
      {role === 'patient' && step === 2 && (
        <div className="elder-card p-6 sm:p-8 space-y-6">
          <div className="text-center sm:text-left">
            <h2 className="text-2xl sm:text-3xl font-black text-teal-950 mb-1">
              Step 2: {t('whoToCall')}
            </h2>
            <p className="text-lg font-bold text-warm-800">
              In an emergency, CareCircle automatically dials and sends SMS to these numbers.
            </p>
          </div>

          <div className="space-y-6">
            {contacts.map((contact, idx) => (
              <div
                key={idx}
                className="p-5 sm:p-6 rounded-2xl border-3 border-teal-200 bg-warm-50 shadow-sm relative space-y-4"
              >
                <div className="flex items-center justify-between border-b-2 border-warm-200 pb-2">
                  <span className="font-black text-xl text-teal-950">
                    Contact #{idx + 1}
                  </span>
                  {contacts.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeContact(idx)}
                      aria-label={`Remove contact ${idx + 1}`}
                      className="p-2 text-rose-600 hover:bg-rose-100 rounded-xl transition-colors"
                    >
                      <Trash2 className="w-6 h-6" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor={`cname-${idx}`} className="block text-lg font-black text-teal-950 mb-1">
                      {t('contactName')} *
                    </label>
                    <input
                      id={`cname-${idx}`}
                      type="text"
                      required
                      value={contact.name}
                      onChange={(e) => updateContact(idx, 'name', e.target.value)}
                      placeholder="e.g. Ravi Sundaram"
                      className="w-full min-h-[56px] px-4 py-3 rounded-2xl border-2 border-warm-300 focus:border-teal-700 bg-white text-lg font-semibold text-warm-900"
                    />
                  </div>

                  <div>
                    <label htmlFor={`cphone-${idx}`} className="block text-lg font-black text-teal-950 mb-1">
                      {t('contactPhone')} *
                    </label>
                    <input
                      id={`cphone-${idx}`}
                      type="tel"
                      required
                      value={contact.phone}
                      onChange={(e) => updateContact(idx, 'phone', e.target.value)}
                      placeholder="e.g. 9876543211"
                      className="w-full min-h-[56px] px-4 py-3 rounded-2xl border-2 border-warm-300 focus:border-teal-700 bg-white text-lg font-semibold text-warm-900"
                    />
                  </div>

                  <div>
                    <label htmlFor={`crelation-${idx}`} className="block text-lg font-black text-teal-950 mb-1">
                      {t('relation')}
                    </label>
                    <select
                      id={`crelation-${idx}`}
                      value={contact.relation}
                      onChange={(e) => updateContact(idx, 'relation', e.target.value)}
                      className="w-full min-h-[56px] px-4 py-3 rounded-2xl border-2 border-warm-300 focus:border-teal-700 bg-white text-lg font-semibold text-warm-900"
                    >
                      {RELATIONS.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor={`cemail-${idx}`} className="block text-lg font-black text-teal-950 mb-1">
                      Email (optional)
                    </label>
                    <input
                      id={`cemail-${idx}`}
                      type="email"
                      value={contact.email || ''}
                      onChange={(e) => updateContact(idx, 'email', e.target.value)}
                      placeholder="e.g. ravi@example.com"
                      className="w-full min-h-[56px] px-4 py-3 rounded-2xl border-2 border-warm-300 focus:border-teal-700 bg-white text-lg font-semibold text-warm-900"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(contact.app_access)}
                      onChange={(e) => updateContact(idx, 'app_access', e.target.checked)}
                      className="w-7 h-7 rounded-lg text-teal-900 border-2 border-warm-400 focus:ring-teal-750"
                    />
                    <span className="text-lg font-bold text-warm-900">
                      {t('allowAppAccess')}
                    </span>
                  </label>
                  <p className="text-sm text-warm-700 ml-10">
                    When they register as a Relative with this phone/email, they will automatically see your updates.
                  </p>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={addContact}
              className="w-full min-h-[56px] py-3 px-6 rounded-2xl border-3 border-dashed border-teal-850 text-teal-950 hover:bg-teal-50 font-black text-xl flex items-center justify-center gap-2 transition-colors"
            >
              <Plus className="w-6 h-6" />
              <span>{t('addContact')}</span>
            </button>
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between gap-4 pt-4 border-t-2 border-warm-200">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="min-h-[56px] px-6 py-3 rounded-2xl border-3 border-warm-300 font-bold text-xl text-warm-800 hover:bg-warm-100 flex items-center gap-2"
            >
              <ArrowLeft className="w-6 h-6" />
              <span>{t('back')}</span>
            </button>

            <button
              type="button"
              onClick={handleNext}
              className="min-h-[56px] px-8 py-3 rounded-2xl bg-teal-900 hover:bg-teal-850 text-white font-black text-xl shadow-lg flex items-center gap-3 transition-transform active:scale-98"
            >
              <span>{t('next')}</span>
              <ArrowRight className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}

      {/* ================= PATIENT STEP 3: Health & Address ================= */}
      {role === 'patient' && step === 3 && (
        <div className="elder-card p-6 sm:p-8 space-y-6">
          <div className="text-center sm:text-left">
            <h2 className="text-2xl sm:text-3xl font-black text-teal-950 mb-1">
              Step 3: {t('healthConditions')}
            </h2>
            <p className="text-lg font-bold text-warm-800">
              Helps our AI assistant give you safe guidance and adjust OTC suggestions.
            </p>
          </div>

          {/* Conditions Chips */}
          <div>
            <label className="block text-xl font-black text-teal-950 mb-3">
              Common Conditions (tap to select all that apply):
            </label>
            <div className="flex flex-wrap gap-3">
              {COMMON_CONDITIONS.map((cond) => {
                const isSelected = selectedConditions.includes(cond);
                return (
                  <button
                    key={cond}
                    type="button"
                    onClick={() => toggleCondition(cond)}
                    aria-pressed={isSelected}
                    className={`min-h-[54px] px-5 py-3 rounded-2xl font-bold text-lg sm:text-xl transition-all border-2 ${
                      isSelected
                        ? 'bg-teal-900 text-white border-teal-950 shadow-md scale-105'
                        : 'bg-white text-warm-900 border-warm-300 hover:border-teal-700'
                    }`}
                  >
                    {cond}
                  </button>
                );
              })}
            </div>
            {selectedConditions.includes('Other') && (
              <div className="mt-4">
                <label htmlFor="other-cond" className="block text-base font-bold text-teal-950 mb-1">
                  Specify other conditions:
                </label>
                <input
                  id="other-cond"
                  type="text"
                  value={otherCondition}
                  onChange={(e) => setOtherCondition(e.target.value)}
                  placeholder="e.g. Glaucoma, Osteoporosis"
                  className="w-full min-h-[56px] px-4 py-3 rounded-2xl border-2 border-warm-300 bg-white text-lg font-semibold text-warm-900"
                />
              </div>
            )}
          </div>

          {/* Allergies */}
          <div>
            <label htmlFor="allergies-input" className="block text-xl font-black text-teal-950 mb-2">
              {t('allergies')}
            </label>
            <input
              id="allergies-input"
              type="text"
              value={allergies}
              onChange={(e) => setAllergies(e.target.value)}
              placeholder="e.g. Penicillin, Sulfa drugs, Peanuts, None"
              className="w-full min-h-[56px] px-4 py-3 rounded-2xl border-2 border-warm-300 focus:border-teal-700 bg-white text-xl font-semibold text-warm-900 shadow-sm"
            />
          </div>

          {/* Address Information */}
          <div className="pt-2 border-t-2 border-warm-200 space-y-4">
            <h3 className="text-xl font-black text-teal-950">
              Home Address (for urgent ambulance dispatch &amp; medicine deliveries)
            </h3>

            <div>
              <label htmlFor="addr-input" className="block text-lg font-black text-teal-950 mb-1">
                {t('homeAddress')}
              </label>
              <textarea
                id="addr-input"
                rows={2}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="House / Flat no, Street, Landmark"
                className="w-full p-4 rounded-2xl border-2 border-warm-300 focus:border-teal-700 bg-white text-lg font-semibold text-warm-900 shadow-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label htmlFor="city-input" className="block text-lg font-black text-teal-950 mb-1">
                  {t('city')}
                </label>
                <input
                  id="city-input"
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Chennai"
                  className="w-full min-h-[56px] px-4 py-3 rounded-2xl border-2 border-warm-300 focus:border-teal-700 bg-white text-lg font-semibold text-warm-900 shadow-sm"
                />
              </div>

              <div>
                <label htmlFor="state-select" className="block text-lg font-black text-teal-950 mb-1">
                  {t('state')}
                </label>
                <select
                  id="state-select"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full min-h-[56px] px-4 py-3 rounded-2xl border-2 border-warm-300 focus:border-teal-700 bg-white text-lg font-semibold text-warm-900 shadow-sm"
                >
                  <option value="">Select State</option>
                  {statesList.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="pincode-input" className="block text-lg font-black text-teal-950 mb-1">
                  {t('pincode')}
                </label>
                <input
                  id="pincode-input"
                  type="text"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  placeholder="e.g. 600028"
                  className="w-full min-h-[56px] px-4 py-3 rounded-2xl border-2 border-warm-300 focus:border-teal-700 bg-white text-lg font-semibold text-warm-900 shadow-sm"
                />
              </div>
            </div>
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between gap-4 pt-4 border-t-2 border-warm-200">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="min-h-[56px] px-6 py-3 rounded-2xl border-3 border-warm-300 font-bold text-xl text-warm-800 hover:bg-warm-100 flex items-center gap-2"
            >
              <ArrowLeft className="w-6 h-6" />
              <span>{t('back')}</span>
            </button>

            <button
              type="button"
              onClick={handleNext}
              className="min-h-[56px] px-8 py-3 rounded-2xl bg-teal-900 hover:bg-teal-850 text-white font-black text-xl shadow-lg flex items-center gap-3 transition-transform active:scale-98"
            >
              <span>{t('next')}</span>
              <ArrowRight className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}

      {/* ================= PATIENT STEP 4: Hospital & Doctors ================= */}
      {role === 'patient' && step === 4 && (
        <div className="elder-card p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-teal-950 mb-1">
                Step 4: {t('hospitalAndDoctors')}
              </h2>
              <p className="text-lg font-bold text-warm-800">
                Choose your regular hospital and doctors (optional).
              </p>
            </div>
            <button
              type="button"
              onClick={() => setStep(5)}
              className="text-lg font-black text-teal-850 hover:text-teal-950 underline underline-offset-4"
            >
              {t('skip')}
            </button>
          </div>

          {/* A-Z Letter Bar */}
          <div>
            <label className="block text-lg font-black text-teal-950 mb-2">
              Tap a letter to browse hospitals by starting letter:
            </label>
            <div className="flex flex-wrap gap-1.5 justify-center bg-warm-100 p-3 rounded-2xl border-2 border-warm-200">
              {ALPHABET.map((ltr) => (
                <button
                  key={ltr}
                  type="button"
                  onClick={() => {
                    setHospitalSearch(ltr);
                    searchHospitals(ltr);
                  }}
                  className={`min-h-[46px] min-w-[46px] rounded-xl font-black text-lg transition-all ${
                    hospitalSearch === ltr
                      ? 'bg-teal-900 text-white shadow-md'
                      : 'bg-white text-warm-900 hover:bg-warm-200 border border-warm-300'
                  }`}
                >
                  {ltr}
                </button>
              ))}
            </div>
          </div>

          {/* Search Box */}
          <div className="relative">
            <label htmlFor="hosp-search" className="block text-lg font-black text-teal-950 mb-1">
              Or search hospital name:
            </label>
            <div className="relative">
              <Search className="w-6 h-6 text-warm-600 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                id="hosp-search"
                type="text"
                value={hospitalSearch}
                onChange={(e) => {
                  setHospitalSearch(e.target.value);
                  searchHospitals(e.target.value);
                }}
                placeholder="e.g. Apollo, Fortis, Government Hospital..."
                className="w-full min-h-[56px] pl-14 pr-4 py-3 rounded-2xl border-2 border-warm-300 focus:border-teal-700 bg-white text-xl font-semibold text-warm-900"
              />
            </div>
          </div>

          {/* Hospitals List */}
          {loadingHospitals && (
            <div className="flex items-center justify-center py-6 gap-2 text-teal-900 font-bold">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span>Loading hospitals...</span>
            </div>
          )}

          {hospitals.length > 0 && (
            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              <span className="text-base font-black text-warm-800">
                Select your hospital:
              </span>
              <div className="grid grid-cols-1 gap-3">
                {hospitals.map((h) => {
                  const isSelected = selectedHospital?.id === h.id;
                  return (
                    <button
                      key={h.id}
                      type="button"
                      onClick={() => handleSelectHospital(h)}
                      aria-pressed={isSelected}
                      className={`p-4 rounded-2xl text-left border-3 transition-all flex items-start justify-between ${
                        isSelected
                          ? 'bg-teal-900 text-white border-teal-950 shadow-md'
                          : 'bg-white text-warm-900 border-warm-200 hover:border-teal-600'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Building2 className={`w-7 h-7 flex-shrink-0 mt-0.5 ${isSelected ? 'text-teal-300' : 'text-teal-850'}`} />
                        <div>
                          <div className="text-xl font-black">{h.name}</div>
                          <div className={`text-sm font-semibold ${isSelected ? 'text-warm-100' : 'text-warm-700'}`}>
                            {h.city}, {h.state} {h.phone && `· ${h.phone}`}
                          </div>
                        </div>
                      </div>
                      {Boolean(h.is_sample) && (
                        <span className="text-xs font-bold uppercase tracking-wider bg-amber-200 text-amber-950 px-2 py-0.5 rounded-md">
                          Sample
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Doctors at Selected Hospital */}
          {selectedHospital && (
            <div className="p-5 rounded-2xl border-3 border-teal-300 bg-teal-50/50 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-black text-teal-950">
                  Doctors at {selectedHospital.name}:
                </h3>
                <span className="text-sm font-bold text-teal-850">
                  {selectedDoctorIds.length} selected
                </span>
              </div>

              {loadingDoctors ? (
                <div className="flex items-center gap-2 text-teal-900 font-bold">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Loading doctors...</span>
                </div>
              ) : doctorsList.length === 0 ? (
                <p className="text-base text-warm-700 font-semibold italic">
                  No doctors currently listed for this hospital. You can add them later.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-56 overflow-y-auto">
                  {doctorsList.map((doc) => {
                    const isSelected = selectedDoctorIds.includes(doc.id);
                    return (
                      <label
                        key={doc.id}
                        className={`p-3.5 rounded-xl border-2 flex items-start gap-3 cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-teal-900 text-white border-teal-950'
                            : 'bg-white text-warm-900 border-warm-200 hover:border-teal-500'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedDoctorIds([...selectedDoctorIds, doc.id]);
                            } else {
                              setSelectedDoctorIds(selectedDoctorIds.filter((id) => id !== doc.id));
                            }
                          }}
                          className="w-6 h-6 mt-0.5 rounded text-teal-800 border-2 border-warm-400"
                        />
                        <div className="flex-1">
                          <div className="font-black text-lg flex items-center justify-between">
                            <span>{doc.name}</span>
                            {Boolean(doc.is_sample) && (
                              <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-200 text-amber-950 px-1.5 py-0.5 rounded">
                                Sample
                              </span>
                            )}
                          </div>
                          <div className={`text-sm ${isSelected ? 'text-warm-100' : 'text-warm-700'}`}>
                            {doc.specialty || 'General Physician'}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between gap-4 pt-4 border-t-2 border-warm-200">
            <button
              type="button"
              onClick={() => setStep(3)}
              className="min-h-[56px] px-6 py-3 rounded-2xl border-3 border-warm-300 font-bold text-xl text-warm-800 hover:bg-warm-100 flex items-center gap-2"
            >
              <ArrowLeft className="w-6 h-6" />
              <span>{t('back')}</span>
            </button>

            <button
              type="button"
              onClick={handleNext}
              className="min-h-[56px] px-8 py-3 rounded-2xl bg-teal-900 hover:bg-teal-850 text-white font-black text-xl shadow-lg flex items-center gap-3 transition-transform active:scale-98"
            >
              <span>{t('next')}</span>
              <ArrowRight className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}

      {/* ================= PATIENT STEP 5: Medicines ================= */}
      {role === 'patient' && step === 5 && (
        <div className="elder-card p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-teal-950 mb-1">
                Step 5: {t('medicines')}
              </h2>
              <p className="text-lg font-bold text-warm-800">
                Add the tablets you take every day (optional &mdash; can be added later).
              </p>
            </div>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="text-lg font-black text-teal-850 hover:text-teal-950 underline underline-offset-4"
            >
              {t('skip')}
            </button>
          </div>

          <div className="space-y-6">
            {medicines.map((med, mIdx) => (
              <div
                key={mIdx}
                className="p-5 sm:p-6 rounded-2xl border-3 border-teal-200 bg-warm-50 shadow-sm relative space-y-4"
              >
                <div className="flex items-center justify-between border-b-2 border-warm-200 pb-2">
                  <span className="font-black text-xl text-teal-950 flex items-center gap-2">
                    <Pill className="w-6 h-6 text-teal-850" />
                    <span>Medicine #{mIdx + 1}</span>
                  </span>
                  {medicines.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeMedicineDraft(mIdx)}
                      aria-label={`Remove medicine ${mIdx + 1}`}
                      className="p-2 text-rose-600 hover:bg-rose-100 rounded-xl transition-colors"
                    >
                      <Trash2 className="w-6 h-6" />
                    </button>
                  )}
                </div>

                {/* Medicine Search Autocomplete */}
                <div className="relative">
                  <label htmlFor={`med-name-${mIdx}`} className="block text-lg font-black text-teal-950 mb-1">
                    Medicine Name *
                  </label>
                  <input
                    id={`med-name-${mIdx}`}
                    type="text"
                    value={med.name}
                    onChange={(e) => {
                      updateMedicine(mIdx, 'name', e.target.value);
                      setActiveMedicineIndex(mIdx);
                      handleSearchMedicine(e.target.value);
                    }}
                    placeholder="Type name (e.g. Telma 40, Glycomet 500, Ecosprin...)"
                    className="w-full min-h-[56px] px-4 py-3 rounded-2xl border-2 border-warm-300 focus:border-teal-700 bg-white text-xl font-semibold text-warm-900"
                  />

                  {/* Autocomplete Dropdown */}
                  {activeMedicineIndex === mIdx && medicineSuggestions.length > 0 && (
                    <div className="absolute z-20 left-0 right-0 mt-1 bg-white border-3 border-teal-600 rounded-2xl shadow-xl max-h-48 overflow-y-auto">
                      {medicineSuggestions.map((sug) => (
                        <button
                          key={sug.id}
                          type="button"
                          onClick={() => {
                            updateMedicine(mIdx, 'name', sug.name);
                            if (sug.default_dosage) {
                              updateMedicine(mIdx, 'dosage', sug.default_dosage);
                            }
                            setMedicineSuggestions([]);
                          }}
                          className="w-full p-3.5 text-left hover:bg-teal-50 border-b border-warm-100 last:border-0 flex items-center justify-between"
                        >
                          <div>
                            <span className="font-black text-lg text-teal-950">{sug.name}</span>
                            <span className="text-sm font-semibold text-warm-700 ml-2">
                              {sug.generic && `(${sug.generic})`}
                            </span>
                          </div>
                          <span className="text-xs font-bold text-teal-800 bg-teal-100 px-2 py-0.5 rounded">
                            {sug.category || 'Medicine'}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Dosage */}
                <div>
                  <label htmlFor={`med-dosage-${mIdx}`} className="block text-lg font-black text-teal-950 mb-1">
                    {t('dosage')}
                  </label>
                  <input
                    id={`med-dosage-${mIdx}`}
                    type="text"
                    value={med.dosage}
                    onChange={(e) => updateMedicine(mIdx, 'dosage', e.target.value)}
                    placeholder="e.g. 1 tablet, 5 ml"
                    className="w-full min-h-[56px] px-4 py-3 rounded-2xl border-2 border-warm-300 focus:border-teal-700 bg-white text-lg font-semibold text-warm-900"
                  />
                </div>

                {/* Times of day */}
                <div>
                  <label className="block text-lg font-black text-teal-950 mb-2">
                    {t('whenToTake')} (tap to toggle):
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {[
                      { time: '08:00', label: t('morning') },
                      { time: '14:00', label: t('afternoon') },
                      { time: '18:00', label: t('evening') },
                      { time: '21:00', label: t('night') },
                    ].map((slot) => {
                      const isSelected = med.times.includes(slot.time);
                      return (
                        <button
                          key={slot.time}
                          type="button"
                          onClick={() => toggleMedicineTime(mIdx, slot.time)}
                          aria-pressed={isSelected}
                          className={`min-h-[54px] p-2.5 rounded-xl font-black text-base flex flex-col items-center justify-center border-2 transition-all ${
                            isSelected
                              ? 'bg-teal-900 text-white border-teal-950 shadow-md'
                              : 'bg-white text-warm-900 border-warm-300 hover:border-teal-600'
                          }`}
                        >
                          <span>{slot.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Food timing */}
                <div>
                  <label className="block text-lg font-black text-teal-950 mb-2">
                    {t('withFood')}:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {[
                      { val: 'before', label: t('beforeFood') },
                      { val: 'after', label: t('afterFood') },
                      { val: 'with', label: t('withMeal') },
                      { val: 'any', label: t('anyTime') },
                    ].map((f) => {
                      const isSelected = med.with_food === f.val;
                      return (
                        <button
                          key={f.val}
                          type="button"
                          onClick={() => updateMedicine(mIdx, 'with_food', f.val)}
                          aria-pressed={isSelected}
                          className={`min-h-[50px] p-2 rounded-xl font-bold text-base transition-all border-2 ${
                            isSelected
                              ? 'bg-teal-900 text-white border-teal-950 shadow-sm'
                              : 'bg-white text-warm-900 border-warm-300 hover:border-teal-600'
                          }`}
                        >
                          {f.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={addMedicineDraft}
              className="w-full min-h-[56px] py-3 px-6 rounded-2xl border-3 border-dashed border-teal-850 text-teal-950 hover:bg-teal-50 font-black text-xl flex items-center justify-center gap-2 transition-colors"
            >
              <Plus className="w-6 h-6" />
              <span>{t('addMedicine')}</span>
            </button>
          </div>

          {/* Navigation & Submit Buttons */}
          <div className="flex items-center justify-between gap-4 pt-6 border-t-2 border-warm-200">
            <button
              type="button"
              onClick={() => setStep(4)}
              className="min-h-[56px] px-6 py-3 rounded-2xl border-3 border-warm-300 font-bold text-xl text-warm-800 hover:bg-warm-100 flex items-center gap-2"
            >
              <ArrowLeft className="w-6 h-6" />
              <span>{t('back')}</span>
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="min-h-[60px] px-8 py-3.5 rounded-2xl bg-teal-900 hover:bg-teal-850 text-white font-black text-2xl shadow-xl flex items-center gap-3 transition-transform active:scale-98 disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-7 h-7 animate-spin" />
                  <span>{t('loading')}</span>
                </>
              ) : (
                <>
                  <span>{t('finish')}</span>
                  <CheckCircle2 className="w-7 h-7" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ================= DOCTOR REGISTRATION ================= */}
      {role === 'doctor' && step === 1 && (
        <div className="elder-card p-6 sm:p-8 space-y-6">
          <div className="text-center sm:text-left">
            <h2 className="text-2xl sm:text-3xl font-black text-teal-950 mb-1">
              Doctor Account Details
            </h2>
            <p className="text-lg font-bold text-warm-800">
              Register to monitor your patients, verify risk scores, and manage schedules.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label htmlFor="doc-name" className="block text-xl font-black text-teal-950 mb-2">
                {t('name')} *
              </label>
              <input
                id="doc-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Dr. K. Ramanathan"
                className="w-full min-h-[56px] px-4 py-3 rounded-2xl border-2 border-warm-300 focus:border-teal-700 bg-white text-xl font-semibold text-warm-900 shadow-sm"
              />
            </div>

            <div>
              <label htmlFor="doc-phone" className="block text-xl font-black text-teal-950 mb-2">
                {t('phone')} *
              </label>
              <input
                id="doc-phone"
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 9876543220"
                className="w-full min-h-[56px] px-4 py-3 rounded-2xl border-2 border-warm-300 focus:border-teal-700 bg-white text-xl font-semibold text-warm-900 shadow-sm"
              />
            </div>

            <div>
              <label htmlFor="doc-email" className="block text-xl font-black text-teal-950 mb-2">
                {t('email')} *
              </label>
              <input
                id="doc-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. dr.ramanathan@apollo.com"
                className="w-full min-h-[56px] px-4 py-3 rounded-2xl border-2 border-warm-300 focus:border-teal-700 bg-white text-xl font-semibold text-warm-900 shadow-sm"
              />
            </div>

            <div>
              <label htmlFor="doc-password" className="block text-xl font-black text-teal-950 mb-2">
                {t('password')} *
              </label>
              <input
                id="doc-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full min-h-[56px] px-4 py-3 rounded-2xl border-2 border-warm-300 focus:border-teal-700 bg-white text-xl font-semibold text-warm-900 shadow-sm"
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="doc-nmc" className="block text-xl font-black text-teal-950 mb-2">
                NMC Registration Number
              </label>
              <input
                id="doc-nmc"
                type="text"
                value={registrationNo}
                onChange={(e) => setRegistrationNo(e.target.value)}
                placeholder="e.g. NMC-TN-2008-8421"
                className="w-full min-h-[56px] px-4 py-3 rounded-2xl border-2 border-warm-300 focus:border-teal-700 bg-white text-xl font-semibold text-warm-900 shadow-sm"
              />
            </div>

            {/* Doctor directory link */}
            <div className="sm:col-span-2 relative">
              <label htmlFor="doc-dir-search" className="block text-xl font-black text-teal-950 mb-2">
                Which doctor are you? (Search doctor directory)
              </label>
              <input
                id="doc-dir-search"
                type="text"
                value={doctorDirectorySearch}
                onChange={(e) => handleSearchDoctorDirectory(e.target.value)}
                placeholder="Type your name to link with hospital listing..."
                className="w-full min-h-[56px] px-4 py-3 rounded-2xl border-2 border-warm-300 focus:border-teal-700 bg-white text-xl font-semibold text-warm-900 shadow-sm"
              />
              {doctorDirectoryResults.length > 0 && (
                <div className="absolute z-20 left-0 right-0 mt-1 bg-white border-3 border-teal-600 rounded-2xl shadow-xl max-h-48 overflow-y-auto">
                  {doctorDirectoryResults.map((doc) => (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => {
                        setDoctorDirectoryId(doc.id);
                        setName(doc.name);
                        setDoctorDirectorySearch(`${doc.name} (${doc.hospital_name || doc.specialty || 'Doctor'})`);
                        setDoctorDirectoryResults([]);
                      }}
                      className="w-full p-3.5 text-left hover:bg-teal-50 border-b border-warm-100 last:border-0 flex items-center justify-between"
                    >
                      <div>
                        <div className="font-black text-lg text-teal-950">{doc.name}</div>
                        <div className="text-sm font-semibold text-warm-700">
                          {doc.specialty} &middot; {doc.hospital_name}
                        </div>
                      </div>
                      <span className="text-xs font-bold text-teal-800 bg-teal-100 px-2 py-1 rounded">
                        Link Profile
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Optional Face Scan */}
          <div className="pt-4 border-t-2 border-warm-200">
            <h3 className="text-xl font-black text-teal-950 mb-2">
              Face ID Scan (Optional)
            </h3>
            <p className="text-base text-warm-800 mb-4">
              Allows quick camera login without typing your password.
            </p>
            <div className="border-4 border-dashed border-teal-200 rounded-3xl p-4 bg-warm-50 flex flex-col items-center">
              <FaceCamera
                onCapture={(descriptor) => {
                  setFaceDescriptor(descriptor);
                  toast.success('Face scanned and enrolled!');
                }}
                requireAveraging={false}
              />
              {faceDescriptor && (
                <div className="mt-3 flex items-center gap-2 text-emerald-800 font-black text-lg bg-emerald-100 px-4 py-2 rounded-xl">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                  <span>Face enrolled successfully!</span>
                </div>
              )}
            </div>
          </div>

          {/* Submit */}
          <div className="flex items-center justify-between gap-4 pt-4 border-t-2 border-warm-200">
            <button
              type="button"
              onClick={() => setStep(0)}
              className="min-h-[56px] px-6 py-3 rounded-2xl border-3 border-warm-300 font-bold text-xl text-warm-800 hover:bg-warm-100 flex items-center gap-2"
            >
              <ArrowLeft className="w-6 h-6" />
              <span>{t('back')}</span>
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="min-h-[60px] px-8 py-3.5 rounded-2xl bg-teal-900 hover:bg-teal-850 text-white font-black text-2xl shadow-xl flex items-center gap-3 transition-transform active:scale-98 disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-7 h-7 animate-spin" />
                  <span>{t('loading')}</span>
                </>
              ) : (
                <>
                  <span>{t('finish')}</span>
                  <CheckCircle2 className="w-7 h-7" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ================= RELATIVE REGISTRATION ================= */}
      {role === 'relative' && step === 1 && (
        <div className="elder-card p-6 sm:p-8 space-y-6">
          <div className="text-center sm:text-left">
            <h2 className="text-2xl sm:text-3xl font-black text-teal-950 mb-1">
              Family Member Account
            </h2>
            <div className="p-4 rounded-2xl bg-teal-50 border-2 border-teal-300 text-teal-950 font-bold text-lg mt-3 flex items-start gap-3">
              <HeartHandshake className="w-7 h-7 text-teal-800 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Tip:</strong> Use the same mobile number or email your family member gave in their emergency contacts &mdash; you will be linked to their health dashboard automatically!
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label htmlFor="rel-name" className="block text-xl font-black text-teal-950 mb-2">
                {t('name')} *
              </label>
              <input
                id="rel-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Ravi Sundaram"
                className="w-full min-h-[56px] px-4 py-3 rounded-2xl border-2 border-warm-300 focus:border-teal-700 bg-white text-xl font-semibold text-warm-900 shadow-sm"
              />
            </div>

            <div>
              <label htmlFor="rel-phone" className="block text-xl font-black text-teal-950 mb-2">
                {t('phone')} *
              </label>
              <input
                id="rel-phone"
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 9876543211"
                className="w-full min-h-[56px] px-4 py-3 rounded-2xl border-2 border-warm-300 focus:border-teal-700 bg-white text-xl font-semibold text-warm-900 shadow-sm"
              />
            </div>

            <div>
              <label htmlFor="rel-email" className="block text-xl font-black text-teal-950 mb-2">
                {t('email')} *
              </label>
              <input
                id="rel-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. ravi@example.com"
                className="w-full min-h-[56px] px-4 py-3 rounded-2xl border-2 border-warm-300 focus:border-teal-700 bg-white text-xl font-semibold text-warm-900 shadow-sm"
              />
            </div>

            <div>
              <label htmlFor="rel-password" className="block text-xl font-black text-teal-950 mb-2">
                {t('password')} *
              </label>
              <input
                id="rel-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full min-h-[56px] px-4 py-3 rounded-2xl border-2 border-warm-300 focus:border-teal-700 bg-white text-xl font-semibold text-warm-900 shadow-sm"
              />
            </div>
          </div>

          {/* Optional Face Scan */}
          <div className="pt-4 border-t-2 border-warm-200">
            <h3 className="text-xl font-black text-teal-950 mb-2">
              Face ID Scan (Optional)
            </h3>
            <p className="text-base text-warm-800 mb-4">
              Enables fast Face ID login from your phone or laptop.
            </p>
            <div className="border-4 border-dashed border-teal-200 rounded-3xl p-4 bg-warm-50 flex flex-col items-center">
              <FaceCamera
                onCapture={(descriptor) => {
                  setFaceDescriptor(descriptor);
                  toast.success('Face scanned and enrolled!');
                }}
                requireAveraging={false}
              />
              {faceDescriptor && (
                <div className="mt-3 flex items-center gap-2 text-emerald-800 font-black text-lg bg-emerald-100 px-4 py-2 rounded-xl">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                  <span>Face enrolled successfully!</span>
                </div>
              )}
            </div>
          </div>

          {/* Submit */}
          <div className="flex items-center justify-between gap-4 pt-4 border-t-2 border-warm-200">
            <button
              type="button"
              onClick={() => setStep(0)}
              className="min-h-[56px] px-6 py-3 rounded-2xl border-3 border-warm-300 font-bold text-xl text-warm-800 hover:bg-warm-100 flex items-center gap-2"
            >
              <ArrowLeft className="w-6 h-6" />
              <span>{t('back')}</span>
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="min-h-[60px] px-8 py-3.5 rounded-2xl bg-teal-900 hover:bg-teal-850 text-white font-black text-2xl shadow-xl flex items-center gap-3 transition-transform active:scale-98 disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-7 h-7 animate-spin" />
                  <span>{t('loading')}</span>
                </>
              ) : (
                <>
                  <span>{t('finish')}</span>
                  <CheckCircle2 className="w-7 h-7" />
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
