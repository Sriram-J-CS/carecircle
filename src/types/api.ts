export type UserRole = 'patient' | 'doctor' | 'relative';

export interface User {
  id: number;
  role: UserRole;
  name: string;
  age?: number | null;
  phone: string;
  email: string;
  language: string;
  doctor_directory_id?: number | null;
  registration_no?: string | null;
  created_at: string;
  has_face_id: boolean;
}

export interface ContactIn {
  name: string;
  phone: string;
  relation: string;
  email?: string | null;
  app_access?: boolean;
}

export interface RegisterIn {
  role: UserRole;
  name: string;
  age?: number | null;
  phone: string;
  email: string;
  password: string;
  language?: string;
  face_descriptor?: number[] | null;
  conditions?: string[];
  allergies?: string[];
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  emergency_contacts?: ContactIn[];
  hospital_id?: number | null;
  doctor_ids?: number[];
  doctor_directory_id?: number | null;
  registration_no?: string | null;
}

export interface LoginIn {
  email: string;
  password: string;
}

export interface FaceLoginIn {
  descriptor: number[];
}

export interface AuthResponse {
  token: string;
  user: User;
  match_distance?: number;
}

export interface Hospital {
  id: number;
  name: string;
  state?: string;
  city?: string;
  pincode?: string;
  address?: string;
  phone?: string;
  emergency_phone?: string;
  kind?: string;
  is_sample?: boolean | number;
}

export interface Doctor {
  id: number;
  name: string;
  specialty?: string;
  hospital_id?: number;
  hospital_name?: string;
  city?: string;
  phone?: string;
  email?: string;
  registration_no?: string;
  is_sample?: boolean | number;
}

export interface Medicine {
  id: number;
  name: string;
  generic?: string;
  category?: string;
  form?: string;
  default_dosage?: string;
  common_use?: string;
  is_sample?: boolean | number;
}

export interface ScheduleIn {
  medicine_name: string;
  dosage: string;
  times: string[];
  with_food?: 'before' | 'after' | 'with' | 'any';
  start_date?: string | null;
  end_date?: string | null;
  notes?: string | null;
}

export interface MedSchedule {
  id: number;
  patient_id: number;
  medicine_name: string;
  dosage: string;
  times: string[];
  with_food?: 'before' | 'after' | 'with' | 'any';
  start_date?: string | null;
  end_date?: string | null;
  notes?: string | null;
  active: number;
  created_at: string;
}

export interface DoseLog {
  id: number;
  schedule_id?: number;
  patient_id?: number;
  medicine_name: string;
  dosage: string;
  scheduled_for: string;
  status: 'pending' | 'taken' | 'snoozed' | 'missed' | string;
  taken_at?: string;
  snoozed_until?: string;
  proof_path?: string;
}

export interface CheckinIn {
  feeling?: number | null; // 1 to 5
  pain?: number | null; // 0 to 10
  symptoms?: string[];
  text?: string;
  vitals?: Record<string, any>;
  language?: string | null;
  trigger?: 'periodic' | 'post_med' | 'manual' | 'voice';
}

export interface OfferResponseIn {
  accept: boolean;
  pharmacy?: string | null;
}

export interface AppointmentIn {
  title: string;
  doctor_name?: string | null;
  hospital?: string | null;
  scheduled_at: string;
  notes?: string | null;
}

export interface ActivityIn {
  kind: 'walking' | 'exercise' | 'travel';
  value: number;
  unit: string;
}

export interface ChatIn {
  message: string;
  language?: string | null;
}

export interface ChatResponse {
  intent: string;
  reply: string;
  action?: {
    type: 'show_emergency' | 'ask_offer' | 'open_pill_camera' | 'none';
    checkin_id?: number;
    offer?: any;
    dose_id?: number;
  };
}

export interface Pharmacy {
  id: string;
  name: string;
  delivery_time: string;
  rating: number;
  phone: string;
}
