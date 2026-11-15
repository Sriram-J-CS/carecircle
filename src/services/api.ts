import {
  AuthResponse,
  Doctor,
  Hospital,
  LoginIn,
  Medicine,
  MedSchedule,
  Pharmacy,
  RegisterIn,
  ScheduleIn,
  ContactIn,
  User,
  CheckinIn,
  OfferResponseIn,
  AppointmentIn,
  ActivityIn,
  ChatResponse,
} from '../types/api';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

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
  return localStorage.getItem('carecircle_token');
}

export function setToken(token: string | null): void {
  if (token) {
    localStorage.setItem('carecircle_token', token);
  } else {
    localStorage.removeItem('carecircle_token');
  }
}

export function getStoredUser(): User | null {
  const data = localStorage.getItem('carecircle_user');
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export function setStoredUser(user: User | null): void {
  if (user) {
    localStorage.setItem('carecircle_user', JSON.stringify(user));
  } else {
    localStorage.removeItem('carecircle_user');
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(options.headers || {});

  // Do not set Content-Type if sending FormData (browser sets boundary automatically)
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const url = `${API_BASE_URL}${path}`;

  let res: Response;
  try {
    res = await fetch(url, {
      ...options,
      headers,
    });
  } catch (err: any) {
    throw new ApiError(0, 'Unable to connect to the server. Please check your connection.');
  }

  if (res.status === 401) {
    setToken(null);
    setStoredUser(null);
    // Dispatch auth-expired event for clean UI handling, fallback to window.location if needed
    window.dispatchEvent(new CustomEvent('carecircle-auth-expired'));
    throw new ApiError(401, 'Session expired or not authorized. Please sign in again.');
  }

  let data: any = null;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      data = await res.json();
    } catch {
      data = null;
    }
  } else {
    data = await res.text();
  }

  if (!res.ok) {
    let msg = 'An error occurred';
    if (data && data.detail) {
      if (typeof data.detail === 'string') {
        msg = data.detail;
      } else if (Array.isArray(data.detail)) {
        msg = data.detail.map((d: any) => d.msg || JSON.stringify(d)).join(', ');
      }
    }
    throw new ApiError(res.status, msg, data);
  }

  return data as T;
}

// ----------------- Auth API -----------------
export const authApi = {
  async register(body: RegisterIn): Promise<AuthResponse> {
    return request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  async login(body: LoginIn): Promise<AuthResponse> {
    return request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  async faceLogin(descriptor: number[]): Promise<AuthResponse> {
    return request<AuthResponse>('/auth/face-login', {
      method: 'POST',
      body: JSON.stringify({ descriptor }),
    });
  },

  async me(): Promise<User> {
    return request<User>('/auth/me');
  },
};

// ----------------- Directory API -----------------
export const directoryApi = {
  async getHospitals(params?: { q?: string; state?: string; city?: string; limit?: number }): Promise<Hospital[]> {
    const qp = new URLSearchParams();
    if (params?.q) qp.set('q', params.q);
    if (params?.state) qp.set('state', params.state);
    if (params?.city) qp.set('city', params.city);
    if (params?.limit) qp.set('limit', String(params.limit));
    const qs = qp.toString();
    return request<Hospital[]>(`/directory/hospitals${qs ? `?${qs}` : ''}`);
  },

  async getDoctors(params?: { q?: string; specialty?: string; hospital_id?: number; city?: string; limit?: number }): Promise<Doctor[]> {
    const qp = new URLSearchParams();
    if (params?.q) qp.set('q', params.q);
    if (params?.specialty) qp.set('specialty', params.specialty);
    if (params?.hospital_id) qp.set('hospital_id', String(params.hospital_id));
    if (params?.city) qp.set('city', params.city);
    if (params?.limit) qp.set('limit', String(params.limit));
    const qs = qp.toString();
    return request<Doctor[]>(`/directory/doctors${qs ? `?${qs}` : ''}`);
  },

  async getMedicines(params?: { q?: string; category?: string; limit?: number }): Promise<Medicine[]> {
    const qp = new URLSearchParams();
    if (params?.q) qp.set('q', params.q);
    if (params?.category) qp.set('category', params.category);
    if (params?.limit) qp.set('limit', String(params.limit));
    const qs = qp.toString();
    return request<Medicine[]>(`/directory/medicines${qs ? `?${qs}` : ''}`);
  },

  async getStates(): Promise<string[]> {
    return request<string[]>('/directory/states');
  },

  async getPharmacies(): Promise<Pharmacy[]> {
    return request<Pharmacy[]>('/directory/pharmacies');
  },
};

// ----------------- Patient & Medication API -----------------
export const patientApi = {
  async getPatients(): Promise<any[]> {
    return request<any[]>('/patients');
  },

  async getSummary(patientId: number): Promise<any> {
    return request<any>(`/patients/${patientId}/summary`);
  },

  async createSchedule(patientId: number, body: ScheduleIn): Promise<MedSchedule> {
    return request<MedSchedule>(`/patients/${patientId}/schedules`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  async getSchedules(patientId: number): Promise<MedSchedule[]> {
    return request<MedSchedule[]>(`/patients/${patientId}/schedules`);
  },

  async deleteSchedule(patientId: number, scheduleId: number): Promise<{ ok: boolean }> {
    return request<{ ok: boolean }>(`/patients/${patientId}/schedules/${scheduleId}`, {
      method: 'DELETE',
    });
  },

  async testDose(patientId: number, scheduleId: number): Promise<any> {
    return request<any>(`/patients/${patientId}/schedules/${scheduleId}/test-dose`, {
      method: 'POST',
    });
  },

  async getDoses(patientId: number): Promise<any[]> {
    return request<any[]>(`/patients/${patientId}/doses`);
  },

  async getReminders(): Promise<any> {
    return request<any>('/me/reminders');
  },

  async confirmDose(doseId: number, proofBlob?: Blob): Promise<any> {
    if (proofBlob) {
      const formData = new FormData();
      formData.append('proof', proofBlob, 'proof.webm');
      return request<any>(`/doses/${doseId}/confirm`, {
        method: 'POST',
        body: formData,
      });
    }
    return request<any>(`/doses/${doseId}/confirm`, {
      method: 'POST',
    });
  },

  async snoozeDose(doseId: number, minutes = 10): Promise<any> {
    return request<any>(`/doses/${doseId}/snooze?minutes=${minutes}`, {
      method: 'POST',
    });
  },

  async getCheckinQuestions(): Promise<any> {
    return request<any>('/checkins/questions');
  },

  async getCheckinStatus(): Promise<any> {
    return request<any>('/checkins/status');
  },

  async submitCheckin(body: CheckinIn): Promise<any> {
    return request<any>('/checkins', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  async respondOffer(checkinId: number, body: OfferResponseIn): Promise<any> {
    return request<any>(`/checkins/${checkinId}/offer`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  async getCheckins(patientId: number): Promise<any[]> {
    return request<any[]>(`/patients/${patientId}/checkins`);
  },

  async getOrders(patientId: number): Promise<any[]> {
    return request<any[]>(`/patients/${patientId}/orders`);
  },

  async sos(): Promise<any> {
    return request<any>('/sos', {
      method: 'POST',
    });
  },

  async getAccess(): Promise<any[]> {
    return request<any[]>('/patients/me/access');
  },

  async grantAccess(body: {
    role: 'relative' | 'doctor';
    name: string;
    phone?: string | null;
    email?: string | null;
    relation?: string | null;
  }): Promise<any> {
    return request<any>('/patients/me/access', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  async revokeAccess(grantId: number): Promise<{ ok: boolean }> {
    return request<{ ok: boolean }>(`/patients/me/access/${grantId}`, {
      method: 'DELETE',
    });
  },

  async addContact(body: ContactIn): Promise<{ id: number }> {
    return request<{ id: number }>('/patients/me/contacts', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  async setCareTeam(body: { hospital_id?: number | null; doctor_ids: number[] }): Promise<{ ok: boolean }> {
    return request<{ ok: boolean }>('/patients/me/care-team', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },
};

// ----------------- Agent API -----------------
export const agentApi = {
  async chat(message: string, language?: string): Promise<ChatResponse> {
    return request<ChatResponse>('/agent/chat', {
      method: 'POST',
      body: JSON.stringify({ message, language }),
    });
  },
};

// ----------------- Alerts & Notifications API -----------------
export const alertsApi = {
  async getAlerts(status = 'open'): Promise<any[]> {
    return request<any[]>(`/alerts?status=${status}`);
  },

  async acknowledgeAlert(alertId: number): Promise<any> {
    return request<any>(`/alerts/${alertId}/acknowledge`, {
      method: 'POST',
    });
  },

  async resolveAlert(alertId: number): Promise<any> {
    return request<any>(`/alerts/${alertId}/resolve`, {
      method: 'POST',
    });
  },

  async getNotifications(): Promise<any[]> {
    return request<any[]>('/notifications');
  },

  async markAllNotificationsRead(): Promise<any> {
    return request<any>('/notifications/read-all', {
      method: 'POST',
    });
  },

  async getOutbox(): Promise<any[]> {
    return request<any[]>('/admin/outbox');
  },
};

// ----------------- Care / Appointments / Lifestyle API -----------------
export const careApi = {
  async getAppointments(patientId: number): Promise<any[]> {
    return request<any[]>(`/patients/${patientId}/appointments`);
  },

  async createAppointment(patientId: number, body: AppointmentIn): Promise<any> {
    return request<any>(`/patients/${patientId}/appointments`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  async deleteAppointment(patientId: number, appointmentId: number): Promise<any> {
    return request<any>(`/patients/${patientId}/appointments/${appointmentId}`, {
      method: 'DELETE',
    });
  },

  async logActivity(body: ActivityIn): Promise<any> {
    return request<any>('/activity', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  async getActivity(patientId: number): Promise<any[]> {
    return request<any[]>(`/patients/${patientId}/activity`);
  },

  async getLifestylePlan(patientId: number): Promise<any> {
    return request<any>(`/patients/${patientId}/lifestyle-plan`);
  },
};
