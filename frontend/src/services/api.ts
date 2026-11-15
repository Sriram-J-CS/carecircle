import {
  AuthResponse,
  LoginIn,
  RegisterIn,
  FaceLoginIn,
  User,
  ReminderResponse,
  Dose,
  CheckinQuestions,
  CheckinIn,
  CheckinResult,
  OfferResponseIn,
  OfferResult,
  Alert,
  NotificationItem,
  Appointment,
  AppointmentIn,
  Schedule,
  ScheduleIn,
  PatientSummary,
  DoctorDirectoryItem,
  HospitalDirectoryItem,
  MedicineDirectoryItem,
  PharmacyDirectoryItem,
  AccessGrant,
  OutboxMessage,
  AgentChatResponse,
  Activity,
  LifestylePlan,
  OrderItem,
} from '../types/api';

function getApiBase(): string {
  const envUrl = import.meta.env.VITE_API_URL;
  if (typeof window !== 'undefined' && window.location.hostname === '127.0.0.1') {
    return (envUrl || 'http://localhost:8000').replace('localhost', '127.0.0.1');
  }
  return envUrl || 'http://localhost:8000';
}

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(status: number, message: string, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export function getToken(): string | null {
  try {
    return sessionStorage.getItem('carecircle_token');
  } catch {
    return null;
  }
}

export function setToken(token: string | null) {
  try {
    if (token) {
      sessionStorage.setItem('carecircle_token', token);
    } else {
      sessionStorage.removeItem('carecircle_token');
    }
  } catch (e) {
    // ignore
  }
}

export function getStoredUser(): User | null {
  try {
    const raw = sessionStorage.getItem('carecircle_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredUser(user: User | null) {
  try {
    if (user) {
      sessionStorage.setItem('carecircle_user', JSON.stringify(user));
    } else {
      sessionStorage.removeItem('carecircle_user');
    }
  } catch (e) {
    // ignore
  }
}

export async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers = new Headers(options.headers || {});

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const isFormData = options.body instanceof FormData;
  if (!isFormData && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const url = `${getApiBase()}${path}`;
  let response: Response;

  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch (err: any) {
    throw new ApiError(0, 'Unable to connect to the server. Please check your internet connection.');
  }

  if (response.status === 401) {
    setToken(null);
    setStoredUser(null);
    if (!window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/register')) {
      window.location.href = '/login';
    }
    throw new ApiError(401, 'Session expired. Please sign in again.');
  }

  if (response.status === 429) {
    if (window.location.pathname !== '/rate-limit') {
      window.location.href = '/rate-limit';
    }
    throw new ApiError(429, 'Too many requests. Please wait a moment and try again.');
  }

  if (!response.ok) {
    let errorDetail = 'Request failed';
    let data: any = null;
    try {
      data = await response.json();
      if (typeof data.detail === 'string') {
        errorDetail = data.detail;
      } else if (Array.isArray(data.detail)) {
        errorDetail = data.detail.map((d: any) => d.msg || JSON.stringify(d)).join(', ');
      }
    } catch {
      errorDetail = response.statusText || `HTTP ${response.status}`;
    }
    throw new ApiError(response.status, errorDetail, data);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

export const api = {
  // Auth
  register: (body: RegisterIn) => request<AuthResponse>('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body: LoginIn) => request<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  faceLogin: (body: FaceLoginIn) => request<AuthResponse>('/auth/face-login', { method: 'POST', body: JSON.stringify(body) }),
  getMe: () => request<User>('/auth/me'),

  // Directory
  getDoctors: () => request<DoctorDirectoryItem[]>('/directory/doctors'),
  getHospitals: () => request<HospitalDirectoryItem[]>('/directory/hospitals'),
  getMedicines: () => request<MedicineDirectoryItem[]>('/directory/medicines'),
  getPharmacies: () => request<PharmacyDirectoryItem[]>('/directory/pharmacies'),
  getStates: () => request<string[]>('/directory/states'),

  // Patients
  getPatients: () => request<User[]>('/patients'),
  getPatientSummary: (pid: number | string) => request<PatientSummary>(`/patients/${pid}/summary`),
  getPatientDoses: (pid: number | string) => request<Dose[]>(`/patients/${pid}/doses`),
  getPatientCheckins: (pid: number | string) => request<any[]>(`/patients/${pid}/checkins`),
  getPatientSchedules: (pid: number | string) => request<Schedule[]>(`/patients/${pid}/schedules`),
  addPatientSchedule: (pid: number | string, body: ScheduleIn) =>
    request<Schedule>(`/patients/${pid}/schedules`, { method: 'POST', body: JSON.stringify(body) }),
  deletePatientSchedule: (pid: number | string, sid: number) =>
    request<void>(`/patients/${pid}/schedules/${sid}`, { method: 'DELETE' }),
  triggerTestDose: (pid: number | string, sid: number) =>
    request<{ ok: boolean; dose: Dose }>(`/patients/${pid}/schedules/${sid}/test-dose`, { method: 'POST' }),

  getPatientAppointments: (pid: number | string) => request<Appointment[]>(`/patients/${pid}/appointments`),
  addPatientAppointment: (pid: number | string, body: AppointmentIn) =>
    request<Appointment>(`/patients/${pid}/appointments`, { method: 'POST', body: JSON.stringify(body) }),
  deletePatientAppointment: (pid: number | string, aid: number) =>
    request<void>(`/patients/${pid}/appointments/${aid}`, { method: 'DELETE' }),

  getPatientLifestyle: (pid: number | string) => request<LifestylePlan>(`/patients/${pid}/lifestyle-plan`),
  getPatientOrders: (pid: number | string) => request<OrderItem[]>(`/patients/${pid}/orders`),
  getPatientActivity: (pid: number | string) => request<Activity[]>(`/patients/${pid}/activity`),
  logPatientActivity: (pid: number | string, body: { kind: string; value: number; unit?: string }) =>
    request<Activity>(`/patients/${pid}/activity`, { method: 'POST', body: JSON.stringify(body) }),

  // Patient access & care team
  getAccessGrants: () => request<AccessGrant[]>('/patients/me/access'),
  addAccessGrant: (body: { name: string; phone?: string; email?: string; relation: string; role: string }) =>
    request<AccessGrant>('/patients/me/access', { method: 'POST', body: JSON.stringify(body) }),
  deleteAccessGrant: (grantId: number) => request<void>(`/patients/me/access/${grantId}`, { method: 'DELETE' }),
  updateCareTeam: (body: { doctor_ids: number[]; hospital_id?: number }) =>
    request<{ ok: boolean }>('/patients/me/care-team', { method: 'POST', body: JSON.stringify(body) }),
  updateEmergencyContacts: (body: { contacts: any[] }) =>
    request<{ ok: boolean }>('/patients/me/contacts', { method: 'POST', body: JSON.stringify(body) }),

  // Reminders & Doses
  getReminders: () => request<ReminderResponse>('/me/reminders'),
  confirmDose: (doseId: number, formData?: FormData) => {
    return request<{ ok: boolean; dose: Dose }>(`/doses/${doseId}/confirm`, {
      method: 'POST',
      body: formData || JSON.stringify({ method: 'camera_auto' }),
    });
  },
  snoozeDose: (doseId: number, minutes = 10) =>
    request<{ ok: boolean; dose: Dose }>(`/doses/${doseId}/snooze?minutes=${minutes}`, { method: 'POST' }),

  // Check-ins
  getCheckinQuestions: () => request<CheckinQuestions>('/checkins/questions'),
  submitCheckin: (body: CheckinIn) => request<CheckinResult>('/checkins', { method: 'POST', body: JSON.stringify(body) }),
  respondToOffer: (checkinId: number, body: OfferResponseIn) =>
    request<OfferResult>(`/checkins/${checkinId}/offer`, { method: 'POST', body: JSON.stringify(body) }),

  // Alerts
  getAlerts: () => request<Alert[]>('/alerts'),
  acknowledgeAlert: (alertId: number) => request<Alert>(`/alerts/${alertId}/acknowledge`, { method: 'POST' }),
  resolveAlert: (alertId: number) => request<Alert>(`/alerts/${alertId}/resolve`, { method: 'POST' }),

  // Notifications
  getNotifications: () => request<NotificationItem[]>('/notifications'),
  markNotificationsRead: () => request<{ ok: boolean }>('/notifications/read-all', { method: 'POST' }),

  // SOS & Agent
  triggerSOS: () => request<{ ok: boolean; alert: Alert }>('/sos', { method: 'POST' }),
  chatAgent: (message: string, language?: string) =>
    request<AgentChatResponse>('/agent/chat', { method: 'POST', body: JSON.stringify({ message, language }) }),

  // Admin / Family Outbox
  getOutbox: () => request<OutboxMessage[]>('/admin/outbox'),
};
