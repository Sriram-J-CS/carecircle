import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  patientApi,
  alertsApi,
  careApi,
} from '../../services/api';
import { MedSchedule } from '../../types/api';
import { PrescribeMedicineModal } from '../../components/doctor/PrescribeMedicineModal';
import { BookAppointmentModal } from '../../components/family/BookAppointmentModal';
import {
  Stethoscope,
  Users,
  Search,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Pill,
  Calendar,
  Activity,
  ShoppingBag,
  Phone,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  TrendingUp,
  HeartPulse,
  UserCheck,
  ShieldAlert,
  Loader2,
  RefreshCw,
  Bell,
  Check,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
  CartesianGrid,
} from 'recharts';
import toast from 'react-hot-toast';

export const DoctorDashboard: React.FC = () => {
  const { user } = useAuth();

  // State: Patient Roster
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSeverity, setFilterSeverity] = useState<'all' | 'emergency' | 'attention' | 'normal' | 'alerts'>('all');
  const [isLoadingRoster, setIsLoadingRoster] = useState(true);

  // Summaries & alerts cache for roster dots & alert count
  const [rosterMeta, setRosterMeta] = useState<Record<number, { riskScore: number | null; level: string; alertCount: number }>>({});
  const [allOpenAlerts, setAllOpenAlerts] = useState<any[]>([]);

  // State: Selected Patient Clinical Data
  const [summary, setSummary] = useState<any | null>(null);
  const [schedules, setSchedules] = useState<MedSchedule[]>([]);
  const [checkins, setCheckins] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [isLoadingPatient, setIsLoadingPatient] = useState(false);
  const [expandedCheckinId, setExpandedCheckinId] = useState<number | null>(null);

  // Modals & Action States
  const [isPrescribeOpen, setIsPrescribeOpen] = useState(false);
  const [isAppointmentOpen, setIsAppointmentOpen] = useState(false);
  const [scheduleToStop, setScheduleToStop] = useState<MedSchedule | null>(null);
  const [isStoppingSchedule, setIsStoppingSchedule] = useState(false);
  const [actionInProgressAlertId, setActionInProgressAlertId] = useState<number | null>(null);

  // ----------------- LOAD PATIENT ROSTER -----------------
  const loadRoster = useCallback(async () => {
    try {
      setIsLoadingRoster(true);
      const [pts, alerts] = await Promise.all([
        patientApi.getPatients(),
        alertsApi.getAlerts('open').catch(() => []),
      ]);
      setPatients(pts);
      setAllOpenAlerts(alerts);

      // Default select first patient if none selected
      if (!selectedPatientId && pts.length > 0) {
        setSelectedPatientId(pts[0].id);
      }

      // Populate initial meta for risk dots & alert counts
      const metaMap: Record<number, { riskScore: number | null; level: string; alertCount: number }> = {};
      pts.forEach((p) => {
        const patientAlerts = alerts.filter((a: any) => a.patient_id === p.id);
        metaMap[p.id] = {
          riskScore: null,
          level: 'normal',
          alertCount: patientAlerts.length,
        };
      });
      setRosterMeta(metaMap);

      // Fetch summaries in background to populate latest risk scores
      pts.forEach(async (p) => {
        try {
          const s = await patientApi.getSummary(p.id);
          const latestScore = s.latest_checkin?.risk_score ?? null;
          const level = s.latest_checkin?.level ?? 'normal';
          const patientAlerts = s.open_alerts || [];
          setRosterMeta((prev) => ({
            ...prev,
            [p.id]: {
              riskScore: latestScore,
              level,
              alertCount: patientAlerts.length,
            },
          }));
        } catch {
          // ignore individual fetch errors
        }
      });
    } catch (err: any) {
      toast.error('Failed to load patient roster: ' + (err.message || 'Error'));
    } finally {
      setIsLoadingRoster(false);
    }
  }, [selectedPatientId]);

  useEffect(() => {
    loadRoster();
  }, [loadRoster]);

  // ----------------- LOAD SELECTED PATIENT DETAILS -----------------
  const loadPatientData = useCallback(async (patientId: number) => {
    try {
      setIsLoadingPatient(true);
      const [sum, scheds, chks, acts] = await Promise.all([
        patientApi.getSummary(patientId),
        patientApi.getSchedules(patientId).catch(() => []),
        patientApi.getCheckins(patientId).catch(() => []),
        careApi.getActivity(patientId).catch(() => []),
      ]);

      setSummary(sum);
      setSchedules(scheds);
      setCheckins(chks.slice(0, 10)); // Last 10 checkins
      setActivities(acts);

      // Update meta for this patient
      const latestScore = sum.latest_checkin?.risk_score ?? null;
      const level = sum.latest_checkin?.level ?? 'normal';
      const patientAlerts = sum.open_alerts || [];
      setRosterMeta((prev) => ({
        ...prev,
        [patientId]: {
          riskScore: latestScore,
          level,
          alertCount: patientAlerts.length,
        },
      }));
    } catch (err: any) {
      toast.error('Failed to load patient clinical summary: ' + (err.message || 'Error'));
    } finally {
      setIsLoadingPatient(false);
    }
  }, []);

  useEffect(() => {
    if (selectedPatientId) {
      loadPatientData(selectedPatientId);
    }
  }, [selectedPatientId, loadPatientData]);

  // Polling every 20 seconds for selected patient updates and open alerts
  useEffect(() => {
    const timer = setInterval(() => {
      if (selectedPatientId) {
        loadPatientData(selectedPatientId);
      }
      alertsApi.getAlerts('open').then((alerts) => {
        setAllOpenAlerts(alerts);
      }).catch(() => {});
    }, 20000);

    return () => clearInterval(timer);
  }, [selectedPatientId, loadPatientData]);

  // ----------------- DOCTOR ACTIONS -----------------
  // Stop Medicine Schedule
  const handleStopSchedule = async () => {
    if (!selectedPatientId || !scheduleToStop) return;
    try {
      setIsStoppingSchedule(true);
      await patientApi.deleteSchedule(selectedPatientId, scheduleToStop.id);
      toast.success(`Discontinued ${scheduleToStop.medicine_name}`);
      setScheduleToStop(null);
      loadPatientData(selectedPatientId);
    } catch (err: any) {
      toast.error(err.message || 'Failed to stop medicine');
    } finally {
      setIsStoppingSchedule(false);
    }
  };

  // Acknowledge Alert
  const handleAcknowledgeAlert = async (alertId: number) => {
    try {
      setActionInProgressAlertId(alertId);
      await alertsApi.acknowledgeAlert(alertId);
      toast.success('Alert acknowledged. Patient and family notified.');
      if (selectedPatientId) loadPatientData(selectedPatientId);
    } catch (err: any) {
      toast.error(err.message || 'Failed to acknowledge alert');
    } finally {
      setActionInProgressAlertId(null);
    }
  };

  // Resolve Alert
  const handleResolveAlert = async (alertId: number) => {
    try {
      setActionInProgressAlertId(alertId);
      await alertsApi.resolveAlert(alertId);
      toast.success('Alert resolved.');
      if (selectedPatientId) loadPatientData(selectedPatientId);
    } catch (err: any) {
      toast.error(err.message || 'Failed to resolve alert');
    } finally {
      setActionInProgressAlertId(null);
    }
  };

  // ----------------- FILTER ROSTER -----------------
  const filteredPatients = useMemo(() => {
    return patients.filter((p) => {
      // Search query filter (name, phone, conditions)
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        p.name?.toLowerCase().includes(q) ||
        p.phone?.includes(q) ||
        p.conditions?.some((c: string) => c.toLowerCase().includes(q));

      if (!matchQuery) return false;

      // Severity / Alert filter
      const meta = rosterMeta[p.id];
      if (filterSeverity === 'emergency') {
        return meta && (meta.level === 'emergency' || (meta.riskScore !== null && meta.riskScore < 40));
      }
      if (filterSeverity === 'attention') {
        return meta && (meta.level === 'attention' || (meta.riskScore !== null && meta.riskScore >= 40 && meta.riskScore < 70));
      }
      if (filterSeverity === 'normal') {
        return meta && (meta.level === 'normal' || (meta.riskScore !== null && meta.riskScore >= 70));
      }
      if (filterSeverity === 'alerts') {
        return meta && meta.alertCount > 0;
      }
      return true;
    });
  }, [patients, searchQuery, filterSeverity, rosterMeta]);

  // Selected Patient Object
  const selectedPatient = useMemo(() => {
    return patients.find((p) => p.id === selectedPatientId) || summary?.patient || null;
  }, [patients, selectedPatientId, summary]);

  // Chart trend data
  const trendData = useMemo(() => {
    if (!summary?.risk_trend || summary.risk_trend.length === 0) return [];
    return summary.risk_trend.map((pt: any) => ({
      date: new Date(pt.created_at).toLocaleDateString('en-IN', {
        month: 'short',
        day: 'numeric',
      }),
      time: new Date(pt.created_at).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      score: pt.risk_score,
      level: pt.level,
    }));
  }, [summary]);

  // Adherence styling
  const adherence = summary?.adherence_30d_pct ?? null;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* ================= HEADER ================= */}
      <div className="elder-card p-6 sm:p-8 bg-gradient-to-r from-teal-900 to-teal-850 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Stethoscope className="w-8 h-8 text-teal-300" />
            <h1 className="text-3xl sm:text-4xl font-black">
              Doctor Dashboard &mdash; {user?.name}
            </h1>
          </div>
          <p className="text-lg font-bold text-teal-200">
            {user?.registration_no ? `Reg No: ${user.registration_no} · ` : ''}
            Clinical oversight & management for your assigned patients
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              loadRoster();
              if (selectedPatientId) loadPatientData(selectedPatientId);
            }}
            aria-label="Refresh clinical dashboard"
            className="px-4 py-3 rounded-2xl bg-teal-800/80 hover:bg-teal-700 text-white font-bold text-sm flex items-center gap-2 border border-teal-600 transition-all touch-target"
          >
            <RefreshCw className="w-5 h-5" />
            Refresh
          </button>
        </div>
      </div>

      {/* ================= MAIN SPLIT VIEW ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ================= LEFT COLUMN: PATIENT ROSTER (4 COLS) ================= */}
        <aside
          aria-label="Patient Roster"
          className="lg:col-span-4 elder-card p-4 sm:p-6 space-y-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-teal-950">
              <Users className="w-6 h-6 text-teal-850" />
              <h2 className="text-2xl font-black">Patient Roster</h2>
            </div>
            <span className="px-3 py-1 bg-teal-100 text-teal-900 rounded-full font-black text-sm">
              {filteredPatients.length} / {patients.length}
            </span>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-5 h-5 text-warm-600 absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, phone..."
              className="w-full text-base font-bold pl-11 pr-4 py-2.5 rounded-xl border-2 border-warm-300 focus:border-teal-700 outline-none"
              aria-label="Search patient roster"
            />
          </div>

          {/* Filter Chips */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {[
              { id: 'all', label: 'All' },
              { id: 'emergency', label: 'Emergency (<40)' },
              { id: 'attention', label: 'Attention (40-69)' },
              { id: 'normal', label: 'Normal (≥70)' },
              { id: 'alerts', label: '🚨 Alerts' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilterSeverity(f.id as any)}
                className={`px-3 py-1 rounded-xl text-xs font-black transition-all ${
                  filterSeverity === f.id
                    ? 'bg-teal-850 text-white shadow-sm'
                    : 'bg-warm-100 text-warm-800 hover:bg-warm-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Roster List */}
          {isLoadingRoster ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-warm-700">
              <Loader2 className="w-8 h-8 animate-spin text-teal-800" />
              <p className="font-bold text-sm">Loading assigned patients...</p>
            </div>
          ) : filteredPatients.length === 0 ? (
            <div className="py-10 text-center text-warm-700 font-bold px-4">
              <p>No patients match the selected filter.</p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[720px] overflow-y-auto pr-1">
              {filteredPatients.map((patient) => {
                const isSelected = patient.id === selectedPatientId;
                const meta = rosterMeta[patient.id] || { riskScore: null, level: 'normal', alertCount: 0 };
                
                // Color risk dot
                let dotColor = 'bg-warm-400';
                if (meta.riskScore !== null) {
                  if (meta.riskScore < 40) dotColor = 'bg-red-600 animate-pulse';
                  else if (meta.riskScore < 70) dotColor = 'bg-amber-500';
                  else dotColor = 'bg-emerald-600';
                }

                return (
                  <button
                    key={patient.id}
                    type="button"
                    onClick={() => setSelectedPatientId(patient.id)}
                    aria-label={`Select patient ${patient.name}`}
                    className={`w-full text-left p-3.5 rounded-2xl border-2 transition-all flex items-start gap-3 touch-target ${
                      isSelected
                        ? 'border-teal-700 bg-teal-50/80 shadow-md ring-2 ring-teal-700/20'
                        : 'border-warm-200 hover:border-teal-400 bg-white hover:bg-warm-50'
                    }`}
                  >
                    {/* Coloured Risk Dot */}
                    <div className="relative mt-1">
                      <div className={`w-4 h-4 rounded-full ${dotColor} ring-4 ring-white shadow-sm`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p className="font-black text-teal-950 text-lg truncate">
                          {patient.name}
                        </p>
                        {meta.alertCount > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-red-600 text-white font-black text-xs flex items-center gap-1 shadow-sm shrink-0">
                            <Bell className="w-3 h-3" />
                            {meta.alertCount} Alert{meta.alertCount > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>

                      <p className="text-xs font-bold text-warm-700 truncate">
                        {patient.age ? `${patient.age} yrs` : 'Age N/A'} &middot; {patient.phone}
                      </p>

                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-xs font-extrabold px-2 py-0.5 rounded-md bg-warm-100 text-warm-900">
                          {meta.riskScore !== null ? `Score: ${meta.riskScore}` : 'No check-in'}
                        </span>
                        {meta.level && meta.riskScore !== null && (
                          <span
                            className={`text-xs font-black uppercase tracking-wider ${
                              meta.level === 'emergency'
                                ? 'text-red-700'
                                : meta.level === 'attention'
                                ? 'text-amber-700'
                                : 'text-emerald-700'
                            }`}
                          >
                            {meta.level}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </aside>

        {/* ================= RIGHT COLUMN: SELECTED PATIENT CLINICAL DETAIL (8 COLS) ================= */}
        <main
          aria-label="Clinical Summary"
          className="lg:col-span-8 space-y-6"
        >
          {/* Clinical Decision Support Banner */}
          <div
            role="status"
            className="p-4 sm:p-5 rounded-2xl bg-teal-50 border-2 border-teal-600 text-teal-950 flex items-center gap-3.5 shadow-sm"
          >
            <div className="w-10 h-10 rounded-xl bg-teal-200/80 flex items-center justify-center shrink-0 text-teal-950">
              <Stethoscope className="w-6 h-6" />
            </div>
            <div>
              <p className="font-black text-lg text-teal-950 leading-tight">
                AI risk scores are decision support, not a diagnosis.
              </p>
              <p className="text-xs sm:text-sm font-semibold text-teal-850 mt-0.5">
                CareCircle assists continuous observation; clinical evaluation and prescription remain solely your prerogative.
              </p>
            </div>
          </div>

          {!selectedPatient ? (
            <div className="elder-card p-12 text-center text-warm-700 font-bold">
              <Users className="w-16 h-16 mx-auto mb-4 text-warm-400" />
              <p className="text-2xl font-black text-teal-950">No Patient Selected</p>
              <p className="text-base text-warm-700 mt-1">
                Please select a patient from the roster on the left to inspect their clinical summary.
              </p>
            </div>
          ) : isLoadingPatient && !summary ? (
            <div className="elder-card p-16 flex flex-col items-center justify-center gap-4 text-warm-800">
              <Loader2 className="w-10 h-10 animate-spin text-teal-850" />
              <p className="text-xl font-black">Loading patient clinical chart...</p>
            </div>
          ) : (
            <>
              {/* ================= 1. PATIENT PROFILE CARD ================= */}
              <section aria-labelledby="patient-profile-heading" className="elder-card p-6 sm:p-8">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b-2 border-warm-200">
                  <div>
                    <span className="text-xs font-black uppercase tracking-widest text-teal-850 bg-teal-100 px-3 py-1 rounded-full">
                      Patient Clinical Record
                    </span>
                    <h2 id="patient-profile-heading" className="text-3xl sm:text-4xl font-black text-teal-950 mt-2">
                      {selectedPatient.name}
                    </h2>
                    <p className="text-base font-bold text-warm-700 mt-1 flex flex-wrap gap-x-4 gap-y-1">
                      <span>Age: {selectedPatient.age ? `${selectedPatient.age} years` : 'N/A'}</span>
                      <span>&bull;</span>
                      <span>Phone: <a href={`tel:${selectedPatient.phone}`} className="text-teal-850 underline">{selectedPatient.phone}</a></span>
                      {summary?.profile?.city && (
                        <>
                          <span>&bull;</span>
                          <span>{summary.profile.city}, {summary.profile.state}</span>
                        </>
                      )}
                    </p>
                  </div>

                  {/* Doctor Primary Action Buttons */}
                  <div className="flex flex-wrap gap-2.5 sm:self-center">
                    <button
                      type="button"
                      onClick={() => setIsPrescribeOpen(true)}
                      className="px-4 py-3 rounded-2xl bg-teal-850 hover:bg-teal-900 text-white font-black text-sm flex items-center gap-2 shadow-md touch-target"
                    >
                      <Plus className="w-5 h-5" />
                      Add / Change Medicine
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsAppointmentOpen(true)}
                      className="px-4 py-3 rounded-2xl bg-white hover:bg-warm-100 text-teal-950 font-black text-sm border-2 border-teal-700 flex items-center gap-2 shadow-sm touch-target"
                    >
                      <Calendar className="w-5 h-5 text-teal-850" />
                      Add Appointment
                    </button>
                  </div>
                </div>

                {/* Conditions & Allergies */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                  {/* Conditions */}
                  <div className="p-4 rounded-2xl bg-warm-50 border-2 border-warm-200">
                    <p className="text-xs font-black uppercase tracking-wide text-warm-700 mb-2">
                      Medical Conditions
                    </p>
                    {summary?.profile?.conditions && summary.profile.conditions.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {summary.profile.conditions.map((c: string, idx: number) => (
                          <span
                            key={idx}
                            className="px-3 py-1 rounded-xl bg-teal-100 text-teal-950 font-black text-xs"
                          >
                            {c}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm font-semibold text-warm-600">No medical conditions recorded.</p>
                    )}
                  </div>

                  {/* Allergies - High Contrast Warning */}
                  <div className="p-4 rounded-2xl bg-amber-50/70 border-2 border-amber-300">
                    <div className="flex items-center gap-1.5 mb-2">
                      <AlertTriangle className="w-4 h-4 text-amber-800" />
                      <p className="text-xs font-black uppercase tracking-wide text-amber-950">
                        Known Drug & Food Allergies
                      </p>
                    </div>
                    {summary?.profile?.allergies && summary.profile.allergies.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {summary.profile.allergies.map((a: string, idx: number) => (
                          <span
                            key={idx}
                            className="px-3 py-1 rounded-xl bg-red-100 border border-red-300 text-red-950 font-black text-xs"
                          >
                            ⚠️ {a}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm font-semibold text-warm-700">No known allergies reported.</p>
                    )}
                  </div>
                </div>

                {/* Emergency Contacts */}
                {summary?.emergency_contacts && summary.emergency_contacts.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-warm-200 flex flex-wrap items-center gap-4 text-sm font-bold text-warm-800">
                    <span className="text-xs font-black uppercase tracking-wide text-warm-600">
                      Family Contacts:
                    </span>
                    {summary.emergency_contacts.map((contact: any) => (
                      <a
                        key={contact.id}
                        href={`tel:${contact.phone}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-warm-100 hover:bg-teal-100 text-teal-950 transition-colors"
                      >
                        <Phone className="w-3.5 h-3.5 text-teal-800" />
                        <span>{contact.name} ({contact.relation})</span>
                      </a>
                    ))}
                  </div>
                )}
              </section>

              {/* ================= 2. OPEN ALERTS FOR THIS PATIENT ================= */}
              {summary?.open_alerts && summary.open_alerts.length > 0 && (
                <section aria-labelledby="alerts-heading" className="elder-card p-6 border-4 border-red-400 bg-red-50/50">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 text-red-950">
                      <ShieldAlert className="w-7 h-7 text-red-700 animate-bounce" />
                      <h2 id="alerts-heading" className="text-2xl font-black">
                        Active Patient Alerts ({summary.open_alerts.length})
                      </h2>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {summary.open_alerts.map((alert: any) => {
                      const isAcked = alert.status === 'acknowledged';
                      const isLoading = actionInProgressAlertId === alert.id;

                      return (
                        <div
                          key={alert.id}
                          className="p-4 rounded-2xl bg-white border-2 border-red-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                        >
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider ${
                                  alert.severity === 'emergency'
                                    ? 'bg-red-600 text-white'
                                    : 'bg-amber-500 text-white'
                                }`}
                              >
                                {alert.severity}
                              </span>
                              <span className="text-xs font-bold text-warm-600">
                                {new Date(alert.created_at).toLocaleString('en-IN', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  day: 'numeric',
                                  month: 'short',
                                })}
                              </span>
                            </div>
                            <p className="text-lg font-black text-teal-950">{alert.message}</p>
                            {isAcked && (
                              <p className="text-xs font-extrabold text-teal-850 mt-1">
                                ✓ Acknowledged by care team member
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {!isAcked && (
                              <button
                                type="button"
                                disabled={isLoading}
                                onClick={() => handleAcknowledgeAlert(alert.id)}
                                className="px-4 py-2 rounded-xl bg-teal-850 hover:bg-teal-900 text-white font-black text-sm flex items-center gap-1.5 touch-target"
                              >
                                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
                                I'm On It
                              </button>
                            )}
                            <button
                              type="button"
                              disabled={isLoading}
                              onClick={() => handleResolveAlert(alert.id)}
                              className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-black text-sm flex items-center gap-1.5 touch-target"
                            >
                              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                              Resolved
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* ================= 3. RISK OVERVIEW & ADHERENCE ================= */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Latest Risk Score Card */}
                <div className="elder-card p-6 flex flex-col justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wider text-warm-600 mb-1">
                      Latest Check-In Score
                    </p>
                    <div className="flex items-baseline gap-3">
                      <span
                        className={`text-5xl font-black ${
                          summary?.latest_checkin?.risk_score < 40
                            ? 'text-red-600'
                            : summary?.latest_checkin?.risk_score < 70
                            ? 'text-amber-600'
                            : 'text-emerald-700'
                        }`}
                      >
                        {summary?.latest_checkin?.risk_score ?? 'N/A'}
                      </span>
                      <span className="text-lg font-bold text-warm-600">/ 100</span>
                      {summary?.latest_checkin?.level && (
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wide ml-auto ${
                            summary.latest_checkin.level === 'emergency'
                              ? 'bg-red-100 text-red-900'
                              : summary.latest_checkin.level === 'attention'
                              ? 'bg-amber-100 text-amber-900'
                              : 'bg-emerald-100 text-emerald-900'
                          }`}
                        >
                          {summary.latest_checkin.level}
                        </span>
                      )}
                    </div>
                  </div>

                  {summary?.latest_checkin?.analysis?.reasons && summary.latest_checkin.analysis.reasons.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-warm-200">
                      <p className="text-xs font-black text-teal-950 uppercase tracking-wide mb-1">
                        AI Reason Indicators:
                      </p>
                      <ul className="list-disc list-inside text-sm font-bold text-warm-800 space-y-0.5">
                        {summary.latest_checkin.analysis.reasons.map((r: string, idx: number) => (
                          <li key={idx}>{r}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* 30-Day Medication Adherence Card */}
                <div className="elder-card p-6 flex flex-col justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wider text-warm-600 mb-1">
                      30-Day Medication Adherence
                    </p>
                    <div className="flex items-baseline gap-2">
                      <span
                        className={`text-5xl font-black ${
                          adherence === null
                            ? 'text-warm-700'
                            : adherence >= 80
                            ? 'text-emerald-700'
                            : adherence >= 60
                            ? 'text-amber-600'
                            : 'text-red-600'
                        }`}
                      >
                        {adherence !== null ? `${adherence}%` : 'N/A'}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-warm-200">
                    {adherence !== null ? (
                      <div className="space-y-2">
                        <div className="w-full bg-warm-200 rounded-full h-4 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              adherence >= 80 ? 'bg-emerald-600' : adherence >= 60 ? 'bg-amber-500' : 'bg-red-600'
                            }`}
                            style={{ width: `${Math.min(100, Math.max(0, adherence))}%` }}
                          />
                        </div>
                        <p className="text-xs font-bold text-warm-700">
                          {adherence >= 80
                            ? 'Excellent compliance. Patient taking tablets regularly.'
                            : adherence >= 60
                            ? 'Fair compliance. Frequent delays or skipped doses detected.'
                            : 'Poor compliance. Requires doctor/caregiver follow-up.'}
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm font-semibold text-warm-600">
                        Insufficient 30-day dose history to calculate percentage.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* ================= 4. RISK TREND CHART ================= */}
              <section aria-labelledby="chart-heading" className="elder-card p-6 sm:p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center text-teal-900">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 id="chart-heading" className="text-2xl font-black text-teal-950">
                      Health Risk Trend (Last 14 Records)
                    </h3>
                    <p className="text-xs sm:text-sm font-bold text-warm-700">
                      Safe (&ge; 70) &middot; Needs Attention (40&ndash;69) &middot; Emergency (&lt; 40)
                    </p>
                  </div>
                </div>

                {trendData.length === 0 ? (
                  <p className="text-center py-8 font-bold text-warm-700">
                    No risk score history recorded yet for this patient.
                  </p>
                ) : (
                  <div className="w-full h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={trendData} margin={{ top: 10, right: 20, left: -20, bottom: 25 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#EAE3D6" />

                        {/* Zone reference bands */}
                        <ReferenceArea y1={0} y2={40} fill="#FEE2E2" fillOpacity={0.4} />
                        <ReferenceArea y1={40} y2={70} fill="#FEF3C7" fillOpacity={0.4} />
                        <ReferenceArea y1={70} y2={100} fill="#D1FAE5" fillOpacity={0.4} />

                        <XAxis
                          dataKey="date"
                          stroke="#786F62"
                          tick={{ fill: '#4E4637', fontSize: 12, fontWeight: 700 }}
                          dy={10}
                        />
                        <YAxis
                          domain={[0, 100]}
                          stroke="#786F62"
                          tick={{ fill: '#4E4637', fontSize: 12, fontWeight: 700 }}
                        />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const d = payload[0].payload;
                              return (
                                <div className="bg-teal-950 text-white p-3 rounded-xl shadow-xl border border-teal-700 text-sm font-bold">
                                  <p className="text-teal-300">{d.date} at {d.time}</p>
                                  <p className="text-xl font-black mt-1">Score: {d.score}/100</p>
                                  <p className="text-xs uppercase tracking-wider text-warm-300">Level: {d.level}</p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="score"
                          stroke="#0a3d42"
                          strokeWidth={4}
                          dot={{ r: 6, fill: '#0a3d42', stroke: '#ffffff', strokeWidth: 2 }}
                          activeDot={{ r: 8, fill: '#2dd4bf', stroke: '#0a3d42', strokeWidth: 3 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </section>

              {/* ================= 5. MEDICATION REGIMEN & SCHEDULES ================= */}
              <section aria-labelledby="med-schedules-heading" className="elder-card p-6 sm:p-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center text-teal-900">
                      <Pill className="w-6 h-6 text-teal-850" />
                    </div>
                    <div>
                      <h3 id="med-schedules-heading" className="text-2xl font-black text-teal-950">
                        Active Prescriptions & Regimens
                      </h3>
                      <p className="text-xs sm:text-sm font-bold text-warm-700">
                        Prescribed schedules monitored via pill-camera confirmation
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsPrescribeOpen(true)}
                    className="px-4 py-2.5 rounded-xl bg-teal-850 hover:bg-teal-900 text-white font-black text-sm flex items-center gap-2 self-start sm:self-auto touch-target"
                  >
                    <Plus className="w-4 h-4" />
                    Prescribe New Medicine
                  </button>
                </div>

                {schedules.length === 0 ? (
                  <p className="text-center py-8 font-bold text-warm-700">
                    No active prescriptions recorded. Click "Prescribe New Medicine" to add one.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {schedules.map((sched) => (
                      <div
                        key={sched.id}
                        className="p-5 rounded-2xl bg-white border-2 border-warm-200 shadow-sm flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h4 className="text-xl font-black text-teal-950">
                                {sched.medicine_name}
                              </h4>
                              <p className="text-sm font-extrabold text-teal-850">
                                {sched.dosage}
                              </p>
                            </div>
                            <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-900 text-xs font-black">
                              Active
                            </span>
                          </div>

                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <span className="text-xs font-bold text-warm-700">Times:</span>
                            {sched.times.map((t) => (
                              <span
                                key={t}
                                className="px-2.5 py-0.5 rounded-lg bg-teal-100 text-teal-950 font-black text-xs flex items-center gap-1"
                              >
                                <Clock className="w-3 h-3" />
                                {t}
                              </span>
                            ))}
                            {sched.with_food && (
                              <span className="text-xs font-semibold px-2 py-0.5 rounded-lg bg-warm-100 text-warm-800">
                                {sched.with_food} food
                              </span>
                            )}
                          </div>

                          {sched.notes && (
                            <p className="mt-3 text-xs font-medium text-warm-700 bg-warm-50 p-2.5 rounded-xl border border-warm-200">
                              <span className="font-bold text-warm-900">Note: </span>
                              {sched.notes}
                            </p>
                          )}
                        </div>

                        <div className="mt-4 pt-3 border-t border-warm-100 flex justify-end">
                          <button
                            type="button"
                            onClick={() => setScheduleToStop(sched)}
                            aria-label={`Stop prescription for ${sched.medicine_name}`}
                            className="px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 font-black text-xs flex items-center gap-1.5 border border-red-200 transition-colors touch-target"
                          >
                            <Trash2 className="w-4 h-4" />
                            Stop Medicine
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Today's Doses Strip */}
                {summary?.today_doses && summary.today_doses.length > 0 && (
                  <div className="mt-6 pt-6 border-t-2 border-warm-200">
                    <p className="text-sm font-black uppercase tracking-wider text-warm-700 mb-3">
                      Today's Dose Compliance Status
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {summary.today_doses.map((dose: any) => {
                        const isTaken = dose.status === 'taken';
                        const isMissed = dose.status === 'missed';
                        const isPending = dose.status === 'pending';

                        return (
                          <div
                            key={dose.id}
                            className={`p-3.5 rounded-xl border-2 flex items-center justify-between ${
                              isTaken
                                ? 'border-emerald-300 bg-emerald-50/60'
                                : isMissed
                                ? 'border-red-300 bg-red-50/60'
                                : 'border-amber-300 bg-amber-50/60'
                            }`}
                          >
                            <div>
                              <p className="font-black text-teal-950 text-sm">{dose.medicine_name}</p>
                              <p className="text-xs font-bold text-warm-700">{dose.dosage}</p>
                            </div>
                            <div className="text-right">
                              <span
                                className={`px-2 py-0.5 rounded-md text-xs font-black uppercase tracking-wider ${
                                  isTaken
                                    ? 'bg-emerald-600 text-white'
                                    : isMissed
                                    ? 'bg-red-600 text-white'
                                    : 'bg-amber-500 text-white'
                                }`}
                              >
                                {dose.status}
                              </span>
                              <p className="text-[11px] font-bold text-warm-600 mt-0.5">
                                {new Date(dose.scheduled_for).toLocaleTimeString('en-IN', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </section>

              {/* ================= 6. LAST 10 CHECK-INS WITH EXPANDABLE ANALYSIS ================= */}
              <section aria-labelledby="checkins-history-heading" className="elder-card p-6 sm:p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center text-teal-900">
                    <HeartPulse className="w-6 h-6 text-teal-850" />
                  </div>
                  <div>
                    <h3 id="checkins-history-heading" className="text-2xl font-black text-teal-950">
                      Recent Check-In History & AI Analysis
                    </h3>
                    <p className="text-xs sm:text-sm font-bold text-warm-700">
                      Expand any record to inspect reported symptoms, vitals, and AI clinical triggers
                    </p>
                  </div>
                </div>

                {checkins.length === 0 ? (
                  <p className="text-center py-8 font-bold text-warm-700">
                    No check-in entries recorded for this patient.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {checkins.map((chk) => {
                      const isExpanded = expandedCheckinId === chk.id;
                      const level = chk.level || 'normal';
                      const input = chk.input || {};
                      const analysis = chk.analysis || {};

                      return (
                        <div
                          key={chk.id}
                          className="rounded-2xl border-2 border-warm-200 bg-white overflow-hidden shadow-sm"
                        >
                          {/* Row Header */}
                          <button
                            type="button"
                            onClick={() => setExpandedCheckinId(isExpanded ? null : chk.id)}
                            aria-expanded={isExpanded}
                            className="w-full text-left p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-warm-50 transition-colors touch-target"
                          >
                            <div className="flex items-center gap-3.5">
                              {/* Score Pill */}
                              <div
                                className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg text-white shadow-sm shrink-0 ${
                                  chk.risk_score < 40
                                    ? 'bg-red-600'
                                    : chk.risk_score < 70
                                    ? 'bg-amber-500'
                                    : 'bg-emerald-600'
                                }`}
                              >
                                {chk.risk_score}
                              </div>

                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-black text-teal-950">
                                    {new Date(chk.created_at).toLocaleString('en-IN', {
                                      month: 'short',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </span>
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-xs font-black uppercase tracking-wider ${
                                      level === 'emergency'
                                        ? 'bg-red-100 text-red-900'
                                        : level === 'attention'
                                        ? 'bg-amber-100 text-amber-900'
                                        : 'bg-emerald-100 text-emerald-900'
                                    }`}
                                  >
                                    {level}
                                  </span>
                                </div>

                                <p className="text-xs font-bold text-warm-700 mt-0.5">
                                  Feeling: {input.feeling ? `${input.feeling}/5` : 'N/A'} &middot; Pain: {input.pain !== undefined && input.pain !== null ? `${input.pain}/10` : 'None'}
                                  {input.symptoms && input.symptoms.length > 0 && ` · Symptoms: ${input.symptoms.join(', ')}`}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 text-warm-600 shrink-0">
                              <span className="text-xs font-extrabold hidden sm:inline">
                                {isExpanded ? 'Hide Details' : 'View Analysis'}
                              </span>
                              {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                            </div>
                          </button>

                          {/* Expanded Analysis Drawer */}
                          {isExpanded && (
                            <div className="p-5 bg-warm-50/70 border-t-2 border-warm-200 space-y-4 animate-in slide-in-from-top-2">
                              {/* AI Reasoning */}
                              {analysis.reasons && analysis.reasons.length > 0 && (
                                <div>
                                  <p className="text-xs font-black uppercase tracking-wide text-teal-950 mb-1">
                                    AI Decision Support Reasoning:
                                  </p>
                                  <ul className="list-disc list-inside text-sm font-semibold text-warm-900 space-y-1">
                                    {analysis.reasons.map((r: string, idx: number) => (
                                      <li key={idx}>{r}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {/* Patient Spoken / Text Transcript */}
                              {input.text && (
                                <div className="p-3.5 bg-white rounded-xl border border-warm-200">
                                  <p className="text-xs font-black uppercase tracking-wide text-warm-600 mb-1">
                                    Patient Notes / Speech Transcript:
                                  </p>
                                  <p className="text-sm font-medium italic text-teal-950">
                                    "{input.text}"
                                  </p>
                                </div>
                              )}

                              {/* Vitals Recorded */}
                              {input.vitals && Object.keys(input.vitals).length > 0 && (
                                <div>
                                  <p className="text-xs font-black uppercase tracking-wide text-warm-600 mb-2">
                                    Recorded Vitals:
                                  </p>
                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    {Object.entries(input.vitals).map(([k, v]) => (
                                      <div key={k} className="p-2.5 rounded-xl bg-white border border-warm-200 text-center">
                                        <p className="text-xs text-warm-600 uppercase font-bold">{k}</p>
                                        <p className="text-base font-black text-teal-950">{String(v)}</p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* AI Patient Guidance */}
                              {analysis.message && (
                                <p className="text-xs font-semibold text-warm-700">
                                  <span className="font-bold">Advice Given: </span>
                                  {analysis.message}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* ================= 7. APPOINTMENTS, ORDERS & ACTIVITY ================= */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Upcoming Appointments */}
                <div className="elder-card p-6 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2 text-teal-950">
                        <Calendar className="w-6 h-6 text-teal-850" />
                        <h4 className="text-xl font-black">Appointments</h4>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsAppointmentOpen(true)}
                        className="text-xs font-black px-3 py-1.5 rounded-xl bg-teal-100 hover:bg-teal-200 text-teal-900 flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" /> Book
                      </button>
                    </div>

                    {summary?.upcoming_appointments && summary.upcoming_appointments.length > 0 ? (
                      <div className="space-y-2.5">
                        {summary.upcoming_appointments.map((appt: any) => (
                          <div key={appt.id} className="p-3 rounded-xl bg-warm-50 border border-warm-200">
                            <p className="font-black text-teal-950 text-sm">{appt.title}</p>
                            <p className="text-xs font-bold text-warm-700">
                              {new Date(appt.scheduled_at).toLocaleString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                            {(appt.doctor_name || appt.hospital) && (
                              <p className="text-xs text-teal-850 font-semibold mt-0.5">
                                {appt.doctor_name} &bull; {appt.hospital}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm font-semibold text-warm-600 py-4 text-center">
                        No upcoming consultations scheduled.
                      </p>
                    )}
                  </div>
                </div>

                {/* Recent Medicine Orders */}
                <div className="elder-card p-6 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-teal-950 mb-4">
                      <ShoppingBag className="w-6 h-6 text-teal-850" />
                      <h4 className="text-xl font-black">Recent Orders</h4>
                    </div>

                    {summary?.recent_orders && summary.recent_orders.length > 0 ? (
                      <div className="space-y-2.5">
                        {summary.recent_orders.map((ord: any) => (
                          <div key={ord.id} className="p-3 rounded-xl bg-warm-50 border border-warm-200">
                            <div className="flex items-center justify-between">
                              <p className="font-black text-teal-950 text-sm">{ord.pharmacy || 'Partner Pharmacy'}</p>
                              <span className="px-2 py-0.5 rounded-md bg-teal-100 text-teal-900 text-xs font-bold">
                                {ord.status}
                              </span>
                            </div>
                            <p className="text-xs font-bold text-warm-700 mt-1">
                              Ref: {ord.reference || `ORD-${ord.id}`} &middot; ETA: {ord.eta_minutes || 45} mins
                            </p>
                            {ord.items && Array.isArray(ord.items) && (
                              <p className="text-xs text-warm-800 font-semibold mt-0.5">
                                Items: {ord.items.join(', ')}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm font-semibold text-warm-600 py-4 text-center">
                        No recent OTC pharmacy orders.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Patient Activity Log */}
              {activities && activities.length > 0 && (
                <section aria-labelledby="activity-heading" className="elder-card p-6">
                  <div className="flex items-center gap-2 text-teal-950 mb-4">
                    <Activity className="w-6 h-6 text-teal-850" />
                    <h4 id="activity-heading" className="text-xl font-black">
                      Activity Tracking (Past 7 Days)
                    </h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {activities.slice(0, 6).map((act: any) => (
                      <div key={act.id} className="p-3 rounded-xl bg-warm-50 border border-warm-200">
                        <p className="text-xs font-bold text-warm-600 uppercase tracking-wider">{act.kind}</p>
                        <p className="text-xl font-black text-teal-950">{act.value} {act.unit}</p>
                        <p className="text-[11px] font-semibold text-warm-500">
                          {new Date(act.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </main>
      </div>

      {/* ================= MODALS ================= */}
      {/* Prescribe Medicine Modal */}
      {selectedPatient && (
        <PrescribeMedicineModal
          isOpen={isPrescribeOpen}
          patientId={selectedPatient.id}
          patientName={selectedPatient.name}
          patientAllergies={summary?.profile?.allergies || []}
          onClose={() => setIsPrescribeOpen(false)}
          onSuccess={() => {
            if (selectedPatientId) loadPatientData(selectedPatientId);
          }}
        />
      )}

      {/* Add Appointment Modal */}
      {selectedPatient && (
        <BookAppointmentModal
          isOpen={isAppointmentOpen}
          patientId={selectedPatient.id}
          defaultDoctor={user?.name}
          onClose={() => setIsAppointmentOpen(false)}
          onSuccess={() => {
            if (selectedPatientId) loadPatientData(selectedPatientId);
          }}
        />
      )}

      {/* Confirm Stop Medicine Dialog */}
      {scheduleToStop && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-stop-title"
          className="fixed inset-0 z-50 bg-teal-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
        >
          <div className="bg-white rounded-3xl border-4 border-red-500 shadow-2xl max-w-md w-full p-6 sm:p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-8 h-8" />
            </div>

            <h3 id="confirm-stop-title" className="text-2xl font-black text-teal-950 mb-2">
              Discontinue Medication?
            </h3>
            <p className="text-base font-semibold text-warm-700 mb-6">
              Are you sure you want to discontinue{' '}
              <span className="font-black text-teal-950">{scheduleToStop.medicine_name}</span> ({scheduleToStop.dosage})
              for {selectedPatient?.name}? Scheduled dose reminders will be deactivated.
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                disabled={isStoppingSchedule}
                onClick={() => setScheduleToStop(null)}
                className="flex-1 py-3 rounded-xl border-2 border-warm-400 font-bold text-warm-800 hover:bg-warm-100 touch-target"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isStoppingSchedule}
                onClick={handleStopSchedule}
                className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black flex items-center justify-center gap-2 touch-target disabled:opacity-60"
              >
                {isStoppingSchedule ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Discontinue'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
