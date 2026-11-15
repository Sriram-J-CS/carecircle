export type UserRole = 'patient' | 'doctor' | 'relative';

export interface User {
  id: number;
  name: str;
  email: string;
  phone: string;
  role: UserRole;
  language?: string;
  age?: number;
  conditions?: string[];
  allergies?: string[];
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  doctor_directory_id?: number;
  registration_no?: string;
  hospital_id?: number;
}

export type str = string;

export interface AuthResponse {
  token: string;
  user: User;
}

export interface ContactIn {
  name: string;
  phone: string;
  relation: string;
  email?: string;
  app_access: boolean;
}

export interface RegisterIn {
  role: UserRole;
  name: string;
  phone: string;
  email: string;
  password: str;
  age?: number;
  language?: string;
  face_descriptor?: number[];
  conditions?: string[];
  allergies?: string[];
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  emergency_contacts?: ContactIn[];
  hospital_id?: number;
  doctor_ids?: number[];
  doctor_directory_id?: number;
  registration_no?: string;
}

export interface LoginIn {
  email: string;
  password: str;
}

export interface FaceLoginIn {
  descriptor: number[];
}

export interface Dose {
  id: number;
  schedule_id: number;
  patient_id: number;
  medicine_name: string;
  dosage: string;
  scheduled_time: string; // "HH:MM"
  status: 'pending' | 'taken' | 'missed' | 'snoozed';
  with_food?: 'before' | 'after' | 'with' | 'any';
  taken_at?: string;
  video_url?: string;
  notes?: string;
  is_due_now?: boolean;
}

export interface ReminderResponse {
  dose_slots: {
    time: string;
    doses: Dose[];
  }[];
  checkin: {
    due: boolean;
    hours_since_last: number | null;
  };
}

export interface SymptomOption {
  key: string;
  label: string;
  category?: string;
}

export interface CheckinQuestions {
  symptoms: {
    options: SymptomOption[];
  };
  feeling: {
    min: number;
    max: number;
    labels: string[];
  };
  pain: {
    min: number;
    max: number;
  };
}

export interface CheckinIn {
  feeling?: number;
  pain?: number;
  symptoms?: string[];
  text?: string;
  vitals?: {
    spo2?: number;
    temp_c?: number;
    heart_rate?: number;
    systolic?: number;
    diastolic?: number;
    sugar?: number;
  };
  language?: string;
  trigger?: 'periodic' | 'post_med' | 'manual' | 'voice';
}

export interface PharmacyOffer {
  reference: string;
  pharmacy: string;
  items: string[];
  eta: string;
  delivery_fee: number;
  symptom_labels: string[];
}

export interface CheckinResult {
  checkin_id: number;
  id?: number; // fallback
  level: 'normal' | 'attention' | 'emergency';
  score: number;
  message: string;
  tips: string[];
  analysis?: {
    reasons?: string[];
    symptom_labels?: string[];
  };
  offer?: PharmacyOffer;
}

export interface OfferResponseIn {
  accept: boolean;
  pharmacy?: string;
}

export interface OfferResult {
  status: 'accepted' | 'declined';
  order?: {
    reference: string;
    pharmacy: string;
    eta: string;
    items: string[];
  };
}

export interface Alert {
  id: number;
  patient_id: number;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  created_at: string;
  acknowledged_at?: string;
  acknowledged_by?: string;
  resolved_at?: string;
  resolved_by?: string;
  patient_name?: string;
  patient_phone?: string;
  emergency_contacts?: ContactIn[];
}

export interface NotificationItem {
  id: number;
  title: string;
  message: string;
  type: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  created_at: string;
  is_read: boolean;
}

export interface Appointment {
  id: number;
  patient_id: number;
  title: string;
  doctor_name?: string;
  hospital?: string;
  scheduled_at: string;
  notes?: string;
}

export interface AppointmentIn {
  title: string;
  doctor_name?: string;
  hospital?: string;
  scheduled_at: string;
  notes?: string;
}

export interface Schedule {
  id: number;
  patient_id: number;
  medicine_name: string;
  dosage: string;
  times: string[];
  with_food?: 'before' | 'after' | 'with' | 'any';
  start_date?: string;
  end_date?: string;
  notes?: string;
}

export interface ScheduleIn {
  medicine_name: string;
  dosage: string;
  times: string[];
  with_food?: 'before' | 'after' | 'with' | 'any';
  start_date?: string;
  end_date?: string;
  notes?: string;
}

export interface OrderItem {
  id: number;
  patient_id: number;
  reference: string;
  pharmacy: string;
  items: string[];
  status: 'pending' | 'confirmed' | 'dispatched' | 'delivered';
  created_at: string;
  eta: string;
}

export interface Activity {
  id: number;
  patient_id: number;
  kind: 'walking' | 'exercise' | 'travel';
  value: number;
  unit: string;
  logged_at: string;
}

export interface LifestylePlan {
  mode: 'rest' | 'light' | 'normal';
  mode_banner: string;
  walking: {
    daily_goal_steps: number;
    daily_goal_km: number;
    walked_today_km: number;
  };
  exercise: {
    list: string[];
    minutes_recommended: number;
  };
  food: {
    eat: string[];
    avoid: string[];
  };
  travel: {
    max_oneway_km: number;
    tips: string[];
  };
}

export interface PatientSummary {
  patient: User;
  risk_score: number;
  latest_checkin?: {
    id: number;
    level: 'normal' | 'attention' | 'emergency';
    score: number;
    created_at: string;
    message: string;
    analysis?: {
      reasons?: string[];
      symptom_labels?: string[];
    };
  };
  open_alerts: Alert[];
  today_doses: Dose[];
  adherence_30d_pct: number;
  risk_trend: {
    date: string;
    score: number;
    level: 'normal' | 'attention' | 'emergency';
  }[];
  upcoming_appointments: Appointment[];
  recent_orders: OrderItem[];
  recent_activity: Activity[];
}

export interface DoctorDirectoryItem {
  id: number;
  name: string;
  specialty: string;
  hospital_id?: number;
  hospital_name?: string;
  phone?: string;
  email?: string;
}

export interface HospitalDirectoryItem {
  id: number;
  name: string;
  city: string;
  state: string;
  phone?: string;
}

export interface MedicineDirectoryItem {
  id: number;
  name: string;
  dosage: string;
  category?: string;
  description?: string;
}

export interface PharmacyDirectoryItem {
  id: number;
  name: string;
  eta_mins: number;
  delivery_fee: number;
}

export interface AccessGrant {
  id: number;
  grantee_name: string;
  grantee_phone?: string;
  grantee_email?: string;
  relation: string;
  role: 'relative' | 'doctor';
  created_at: string;
}

export interface OutboxMessage {
  id: number;
  channel: 'sms' | 'call' | 'push';
  recipient: string;
  body: string;
  sent_at: string;
  status: string;
}

export interface AgentChatResponse {
  reply: string;
  action?: {
    kind: 'sos' | 'checkin' | 'navigate' | 'call' | 'remind';
    target?: string;
    payload?: Record<string, any>;
  };
}
