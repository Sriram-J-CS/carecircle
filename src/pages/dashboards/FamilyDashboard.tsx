import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { patientApi, alertsApi, careApi } from '../../services/api';
import { NotificationsModal } from '../../components/patient/NotificationsModal';
import { BookAppointmentModal } from '../../components/family/BookAppointmentModal';
import { playAlertSound } from '../../utils/audio';
import {
  Users,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  Bell,
  Clock,
  Calendar,
  Pill,
  TrendingUp,
  ShoppingBag,
  Stethoscope,
  Phone,
  Activity,
  Heart,
  Car,
  Utensils,
  Footprints,
  MessageSquare,
  PhoneCall,
  Loader2,
  Plus,
  RefreshCw,
  ChevronRight,
  Info,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceArea,
  ReferenceLine,
} from 'recharts';
import toast from 'react-hot-toast';

export const FamilyDashboard: React.FC = () => {
  const { user } = useAuth();
  const { speak } = useLanguage();

  // Patient switching
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);

  // Summary and data states
  const [summary, setSummary] = useState<any | null>(null);
  const [lifestyle, setLifestyle] = useState<any | null>(null);
  const [outbox, setOutbox] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Notifications & Modals
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isBookApptOpen, setIsBookApptOpen] = useState(false);
  const [lifestyleTab, setLifestyleTab] = useState<'exercise' | 'walking' | 'food' | 'travel'>('exercise');

  // Tracking alert acknowledging / resolving actions
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  // Ref to track seen notification IDs for new alerts
  const seenNotifIdsRef = useRef<Set<number>>(new Set());
  const initialNotifsLoadedRef = useRef<boolean>(false);

  // 1. Fetch patients accessible by this relative
  useEffect(() => {
    async function loadPatients() {
      try {
        setLoading(true);
        const pts = await patientApi.getPatients();
        setPatients(pts);
        if (pts.length > 0) {
          setSelectedPatientId(pts[0].id);
        }
      } catch (err) {
        console.warn('Failed to load patients for relative:', err);
      } finally {
        setLoading(false);
      }
    }
    loadPatients();
  }, []);

  // 2. Fetch summary, lifestyle, and outbox for selected patient
  const loadPatientSummary = useCallback(async (isBackground = false) => {
    if (!selectedPatientId) return;

    try {
      if (!isBackground) setIsRefreshing(true);

      const [sumRes, lifeRes, outboxRes] = await Promise.allSettled([
        patientApi.getSummary(selectedPatientId),
        careApi.getLifestylePlan(selectedPatientId),
        alertsApi.getOutbox(),
      ]);

      if (sumRes.status === 'fulfilled' && sumRes.value) {
        setSummary(sumRes.value);
      }

      if (lifeRes.status === 'fulfilled' && lifeRes.value) {
        setLifestyle(lifeRes.value);
      }

      if (outboxRes.status === 'fulfilled' && Array.isArray(outboxRes.value)) {
        setOutbox(outboxRes.value);
      }
    } catch (err) {
      console.warn('Error loading patient summary:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [selectedPatientId]);

  // Load summary whenever selected patient changes
  useEffect(() => {
    if (selectedPatientId) {
      loadPatientSummary(false);
    }
  }, [selectedPatientId, loadPatientSummary]);

  // 3. Polling: Poll summary and notifications every 20 seconds
  useEffect(() => {
    if (!selectedPatientId) return;

    const interval = setInterval(async () => {
      // Refresh summary
      loadPatientSummary(true);

      // Poll notifications and detect new ones
      try {
        const notifs = await alertsApi.getNotifications();
        if (Array.isArray(notifs)) {
          const unread = notifs.filter((n: any) => n.read === 0).length;
          setUnreadCount(unread);

          if (initialNotifsLoadedRef.current) {
            // Check for new notifications
            for (const n of notifs) {
              if (!seenNotifIdsRef.current.has(n.id)) {
                seenNotifIdsRef.current.add(n.id);
                // Trigger toast
                if (n.title.toLowerCase().includes('emergency') || n.title.toLowerCase().includes('sos')) {
                  playAlertSound();
                  toast.error(`CRITICAL ALERT: ${n.body}`, { duration: 9000 });
                } else {
                  toast(`Notification: ${n.title}`, { icon: '🔔' });
                }
              }
            }
          } else {
            // Seed seen set
            notifs.forEach((n: any) => seenNotifIdsRef.current.add(n.id));
            initialNotifsLoadedRef.current = true;
          }
        }
      } catch (e) {
        console.warn('Notifications poll error', e);
      }
    }, 20000);

    return () => clearInterval(interval);
  }, [selectedPatientId, loadPatientSummary]);

  // Alert Action: Acknowledge ("I'm on it")
  const handleAcknowledgeAlert = async (alertId: number) => {
    try {
      setActionLoadingId(alertId);
      await alertsApi.acknowledgeAlert(alertId);
      toast.success("Acknowledged! Patient has been notified that you are on it.");
      loadPatientSummary(false);
    } catch (err: any) {
      toast.error(err.message || 'Could not acknowledge alert');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Alert Action: Resolve
  const handleResolveAlert = async (alertId: number) => {
    try {
      setActionLoadingId(alertId);
      await alertsApi.resolveAlert(alertId);
      toast.success('Alert resolved!');
      loadPatientSummary(false);
    } catch (err: any) {
      toast.error(err.message || 'Could not resolve alert');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Status calculation
  const openAlerts = summary?.open_alerts || [];
  const latestCheckin = summary?.latest_checkin;
  const patientProfile = summary?.patient;

  const hasCriticalAlert =
    openAlerts.some((a: any) => a.severity === 'critical' || a.type === 'sos' || a.type === 'emergency') ||
    latestCheckin?.level === 'emergency';

  const hasAttentionAlert =
    openAlerts.some((a: any) => a.severity === 'warning' || a.type === 'needs_attention') ||
    latestCheckin?.level === 'attention';

  const overallStatus = hasCriticalAlert ? 'emergency' : hasAttentionAlert ? 'attention' : 'normal';

  // Format Risk Trend for Recharts
  const trendData = (summary?.risk_trend || []).map((t: any, idx: number) => {
    const d = new Date(t.created_at);
    return {
      name: `${d.getDate()} ${d.toLocaleDateString([], { month: 'short' })} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`,
      score: t.risk_score,
      level: t.level,
      id: t.id,
    };
  });

  return (
    <div className="space-y-8 pb-16">
      {/* ================= HEADER ================= */}
      <div className="elder-card p-6 sm:p-8 bg-gradient-to-r from-teal-900 to-teal-850 text-white shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-black uppercase tracking-wider bg-teal-800 text-teal-200 px-3 py-0.5 rounded-full border border-teal-600">
              Family Care Dashboard
            </span>
            {isRefreshing && (
              <span className="text-xs text-teal-300 flex items-center gap-1 font-bold animate-pulse">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Refreshing...</span>
              </span>
            )}
          </div>
          <h1 className="text-3xl sm:text-4xl font-black">
            Welcome, {user?.name}!
          </h1>
          <p className="text-lg font-bold text-teal-100 mt-1">
            Monitoring health, medicine adherence, and safety in real time.
          </p>
        </div>

        {/* Controls: Patient Switcher & Bell */}
        <div className="flex items-center gap-3">
          {/* Patient Switcher if multiple patients */}
          {patients.length > 1 ? (
            <div className="flex items-center gap-2 bg-teal-950/80 p-2 rounded-2xl border border-teal-600">
              <label htmlFor="patient-select" className="text-sm font-bold text-teal-200 pl-2">
                Patient:
              </label>
              <select
                id="patient-select"
                value={selectedPatientId || ''}
                onChange={(e) => setSelectedPatientId(parseInt(e.target.value, 10))}
                className="bg-teal-900 text-white font-bold text-base px-3 py-1.5 rounded-xl border border-teal-500 focus:outline-none"
              >
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.age ? `${p.age}y` : 'Patient'})
                  </option>
                ))}
              </select>
            </div>
          ) : patients.length === 1 ? (
            <div className="bg-teal-950/70 px-4 py-2 rounded-2xl border border-teal-600 font-bold text-lg text-teal-200">
              Watching: <strong>{patients[0].name}</strong>
            </div>
          ) : null}

          {/* Bell Icon with Unread Count */}
          <button
            type="button"
            onClick={() => setIsNotificationsOpen(true)}
            aria-label={`View notifications (${unreadCount} unread)`}
            className="relative min-h-[56px] min-w-[56px] p-3 rounded-2xl bg-teal-800 hover:bg-teal-700 text-white flex items-center justify-center transition-colors shadow-md"
          >
            <Bell className="w-7 h-7" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-red-500 text-white font-black text-xs flex items-center justify-center border-2 border-teal-900 animate-bounce">
                {unreadCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="elder-card p-12 text-center text-teal-900 font-bold text-xl flex items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-teal-850" />
          <span>Loading patient care record...</span>
        </div>
      ) : !summary ? (
        <div className="elder-card p-8 text-center text-warm-800 font-bold text-xl">
          No patient record linked yet. When your family member adds your mobile number or email in emergency contacts, you will see their health data here.
        </div>
      ) : (
        <>
          {/* ================= 1. STATUS BANNER ================= */}
          <section aria-labelledby="status-banner-heading">
            <div
              className={`elder-card p-6 sm:p-8 border-4 transition-all shadow-xl ${
                overallStatus === 'emergency'
                  ? 'bg-red-50 border-red-600 text-red-950 ring-4 ring-red-300 animate-pulse'
                  : overallStatus === 'attention'
                  ? 'bg-amber-50/70 border-amber-500 text-amber-950'
                  : 'bg-emerald-50/70 border-emerald-500 text-emerald-950'
              }`}
            >
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="space-y-3 flex-1">
                  <div className="flex items-center gap-3">
                    <span
                      className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full font-black text-lg uppercase tracking-wider ${
                        overallStatus === 'emergency'
                          ? 'bg-red-600 text-white shadow-md'
                          : overallStatus === 'attention'
                          ? 'bg-amber-500 text-white shadow-sm'
                          : 'bg-emerald-600 text-white shadow-sm'
                      }`}
                    >
                      {overallStatus === 'emergency' ? (
                        <>
                          <ShieldAlert className="w-6 h-6 animate-bounce" />
                          <span>EMERGENCY</span>
                        </>
                      ) : overallStatus === 'attention' ? (
                        <>
                          <AlertTriangle className="w-6 h-6" />
                          <span>NEEDS ATTENTION</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-6 h-6" />
                          <span>ALL GOOD</span>
                        </>
                      )}
                    </span>

                    <span className="text-sm font-bold text-warm-700">
                      {patientProfile?.name} ({patientProfile?.age ? `${patientProfile.age} yrs` : 'Patient'})
                    </span>
                  </div>

                  <h2 id="status-banner-heading" className="text-3xl sm:text-4xl font-black">
                    {overallStatus === 'emergency'
                      ? 'Urgent Medical Attention Required'
                      : overallStatus === 'attention'
                      ? 'Mild Symptoms or Pending Attention'
                      : 'Vital signs and medicines are steady'}
                  </h2>

                  {/* Reasons list */}
                  {latestCheckin?.analysis?.reasons && latestCheckin.analysis.reasons.length > 0 && (
                    <div className="text-base font-bold space-y-1">
                      <span className="text-warm-800">Latest analysis reasons:</span>
                      <ul className="list-disc list-inside space-y-0.5 text-warm-900 font-semibold">
                        {latestCheckin.analysis.reasons.map((r: string, idx: number) => (
                          <li key={idx}>{r}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {latestCheckin && (
                    <div className="text-xs font-bold text-warm-600 flex items-center gap-1.5">
                      <Clock className="w-4 h-4" />
                      <span>
                        Last check-in:{' '}
                        {new Date(latestCheckin.created_at).toLocaleDateString([], {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  )}
                </div>

                {/* Big Risk Score Ring */}
                <div className="flex flex-col items-center justify-center p-4 rounded-3xl bg-white shadow-lg border-2 border-warm-200 min-w-[160px]">
                  <span className="text-xs font-black uppercase tracking-wider text-warm-600 mb-1">
                    Risk Score
                  </span>
                  <div
                    className={`w-24 h-24 rounded-full border-8 flex items-center justify-center font-black text-3xl shadow-inner ${
                      (latestCheckin?.risk_score ?? 100) < 40
                        ? 'border-red-600 text-red-600 bg-red-50'
                        : (latestCheckin?.risk_score ?? 100) < 70
                        ? 'border-amber-500 text-amber-600 bg-amber-50'
                        : 'border-emerald-500 text-emerald-700 bg-emerald-50'
                    }`}
                  >
                    {latestCheckin?.risk_score ?? 100}
                  </div>
                  <span className="text-xs font-bold text-warm-700 mt-2">
                    0 = Critical &middot; 100 = Safe
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* ================= 2. OPEN ALERTS ================= */}
          <section aria-labelledby="alerts-heading" className="elder-card p-6 sm:p-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center text-red-800">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <h2 id="alerts-heading" className="text-2xl sm:text-3xl font-black text-teal-950">
                  Open Alerts ({openAlerts.length})
                </h2>
              </div>
            </div>

            {openAlerts.length === 0 ? (
              <div className="p-6 text-center text-warm-700 font-bold text-lg bg-warm-50 rounded-2xl border border-warm-200">
                No active alerts. All medications and check-ins are acknowledged.
              </div>
            ) : (
              <div className="space-y-4">
                {openAlerts.map((alert: any) => {
                  const isCritical = alert.severity === 'critical' || alert.type === 'sos' || alert.type === 'emergency';
                  const isAcknowledged = Boolean(alert.acknowledged_by || alert.status === 'acknowledged');

                  return (
                    <div
                      key={alert.id}
                      className={`p-5 rounded-2xl border-3 flex flex-col gap-4 shadow-sm transition-all ${
                        isCritical
                          ? 'bg-red-50/80 border-red-500 text-red-950'
                          : 'bg-amber-50/80 border-amber-400 text-amber-950'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-3 py-1 rounded-full font-black text-xs uppercase tracking-wider ${
                              isCritical ? 'bg-red-600 text-white' : 'bg-amber-500 text-white'
                            }`}
                          >
                            {alert.type.replace('_', ' ')}
                          </span>
                          <span className="text-xs font-bold text-warm-600">
                            {new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        {/* Acknowledged info badge */}
                        {isAcknowledged && (
                          <span className="text-sm font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-3 py-1 rounded-xl flex items-center gap-1.5 self-start sm:self-auto">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span>Acknowledged</span>
                          </span>
                        )}
                      </div>

                      <p className="text-xl font-bold leading-snug">
                        {alert.message}
                      </p>

                      {/* Emergency Tap-to-Call Buttons */}
                      {isCritical && (
                        <div className="pt-2 border-t border-red-200 flex flex-wrap items-center gap-3">
                          <span className="text-sm font-bold text-red-900">Direct Call:</span>
                          {patientProfile?.phone && (
                            <a
                              href={`tel:${patientProfile.phone}`}
                              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-sm flex items-center gap-1.5 shadow transition-colors"
                            >
                              <Phone className="w-4 h-4 fill-white" />
                              <span>Call Patient ({patientProfile.phone})</span>
                            </a>
                          )}
                          {summary?.emergency_contacts?.map((c: any) => (
                            <a
                              key={c.id || c.phone}
                              href={`tel:${c.phone}`}
                              className="px-4 py-2 rounded-xl bg-white hover:bg-warm-100 text-red-900 border border-red-300 font-bold text-sm flex items-center gap-1.5 transition-colors"
                            >
                              <Phone className="w-4 h-4" />
                              <span>Call {c.name} ({c.relation})</span>
                            </a>
                          ))}
                        </div>
                      )}

                      {/* Action Buttons: "I'm on it" / "Resolved" */}
                      <div className="flex items-center gap-3 pt-2">
                        {!isAcknowledged ? (
                          <button
                            type="button"
                            onClick={() => handleAcknowledgeAlert(alert.id)}
                            disabled={actionLoadingId === alert.id}
                            className="min-h-[48px] px-6 py-2.5 rounded-xl bg-teal-900 hover:bg-teal-850 text-white font-black text-base shadow transition-transform active:scale-95 disabled:opacity-50 flex items-center gap-2"
                          >
                            {actionLoadingId === alert.id ? (
                              <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                              <span>I&apos;m on it</span>
                            )}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleResolveAlert(alert.id)}
                            disabled={actionLoadingId === alert.id}
                            className="min-h-[48px] px-6 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-black text-base shadow transition-transform active:scale-95 disabled:opacity-50 flex items-center gap-2"
                          >
                            {actionLoadingId === alert.id ? (
                              <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                              <>
                                <CheckCircle2 className="w-5 h-5" />
                                <span>Mark Resolved</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* ================= 3. TODAY'S MEDICINES & ADHERENCE ================= */}
          <section aria-labelledby="meds-heading" className="elder-card p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center text-teal-900">
                  <Pill className="w-6 h-6" />
                </div>
                <div>
                  <h2 id="meds-heading" className="text-2xl sm:text-3xl font-black text-teal-950">
                    Today&apos;s Medicines
                  </h2>
                  <p className="text-xs font-semibold text-warm-700">
                    Read-only view &middot; Regimen managed by patient and doctors
                  </p>
                </div>
              </div>

              {/* 30-Day Adherence Progress Ring */}
              <div className="flex items-center gap-3 bg-warm-100 p-3 rounded-2xl border border-warm-200">
                <div className="w-14 h-14 rounded-full border-4 border-emerald-500 bg-white flex items-center justify-center font-black text-base text-emerald-800 shadow-sm">
                  {summary?.adherence_30d_pct !== null && summary?.adherence_30d_pct !== undefined
                    ? `${summary.adherence_30d_pct}%`
                    : 'N/A'}
                </div>
                <div className="text-left">
                  <div className="text-sm font-black text-teal-950">30-Day Adherence</div>
                  <div className="text-xs font-bold text-warm-700">Based on confirmed doses</div>
                </div>
              </div>
            </div>

            {/* Doses Timeline */}
            {!summary?.today_doses || summary.today_doses.length === 0 ? (
              <p className="text-warm-700 font-bold text-center py-6">
                No doses scheduled for today.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {summary.today_doses.map((d: any) => {
                  const isTaken = d.status === 'taken';
                  const isMissed = d.status === 'missed';

                  return (
                    <div
                      key={d.id}
                      className={`p-4 rounded-2xl border-2 flex items-center justify-between gap-3 ${
                        isTaken
                          ? 'bg-emerald-50/60 border-emerald-300'
                          : isMissed
                          ? 'bg-red-50 border-red-400'
                          : 'bg-warm-50 border-warm-200'
                      }`}
                    >
                      <div>
                        <div className="text-lg font-black text-teal-950">{d.medicine_name}</div>
                        <div className="text-sm font-semibold text-warm-700">
                          {d.dosage} &middot; Scheduled:{' '}
                          {new Date(d.scheduled_for).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>

                      <span
                        className={`px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider ${
                          isTaken
                            ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                            : isMissed
                            ? 'bg-red-100 text-red-900 border border-red-300'
                            : 'bg-amber-100 text-amber-900 border border-amber-300'
                        }`}
                      >
                        {d.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* ================= 4. RISK TREND (RECHARTS) ================= */}
          <section aria-labelledby="trend-heading" className="elder-card p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center text-teal-900">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <h2 id="trend-heading" className="text-2xl sm:text-3xl font-black text-teal-950">
                  Health Risk Trend
                </h2>
                <p className="text-sm font-bold text-warm-700">
                  Green: Safe (&ge; 70) &middot; Amber: Needs Attention (40&ndash;69) &middot; Red: Emergency (&lt; 40)
                </p>
              </div>
            </div>

            {trendData.length === 0 ? (
              <p className="text-center py-10 font-bold text-warm-700">
                No check-in history available yet to plot risk trend.
              </p>
            ) : (
              <div className="w-full h-72 sm:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData} margin={{ top: 10, right: 20, left: -20, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#EAE3D6" />

                    {/* Zone reference bands */}
                    <ReferenceArea y1={0} y2={40} fill="#FEE2E2" fillOpacity={0.4} />
                    <ReferenceArea y1={40} y2={70} fill="#FEF3C7" fillOpacity={0.4} />
                    <ReferenceArea y1={70} y2={100} fill="#D1FAE5" fillOpacity={0.4} />

                    <ReferenceLine y={40} stroke="#EF4444" strokeDasharray="3 3" />
                    <ReferenceLine y={70} stroke="#10B981" strokeDasharray="3 3" />

                    <XAxis
                      dataKey="name"
                      tick={{ fill: '#78716C', fontSize: 11, fontWeight: 600 }}
                      angle={-20}
                      textAnchor="end"
                    />
                    <YAxis
                      domain={[0, 100]}
                      ticks={[0, 25, 40, 70, 100]}
                      tick={{ fill: '#78716C', fontSize: 12, fontWeight: 700 }}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-white p-3 rounded-xl border-2 border-teal-700 shadow-xl text-left">
                              <p className="text-xs font-bold text-warm-600">{data.name}</p>
                              <p className="text-lg font-black text-teal-950">
                                Score: {data.score}/100
                              </p>
                              <p className="text-xs font-black uppercase text-teal-800">
                                Level: {data.level}
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke="#0f766e"
                      strokeWidth={4}
                      dot={{ r: 5, fill: '#0a3d42', strokeWidth: 2, stroke: '#fff' }}
                      activeDot={{ r: 8, fill: '#0f766e' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>

          {/* ================= 5. APPOINTMENTS ================= */}
          <section aria-labelledby="appts-heading" className="elder-card p-6 sm:p-8">
            <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center text-teal-900">
                  <Calendar className="w-6 h-6" />
                </div>
                <h2 id="appts-heading" className="text-2xl sm:text-3xl font-black text-teal-950">
                  Appointments ({summary?.upcoming_appointments?.length || 0})
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setIsBookApptOpen(true)}
                className="min-h-[48px] px-4 py-2 bg-teal-900 hover:bg-teal-850 text-white font-bold rounded-xl text-base flex items-center gap-2 shadow-sm transition-colors"
              >
                <Plus className="w-5 h-5" />
                <span>Book Appointment</span>
              </button>
            </div>

            {!summary?.upcoming_appointments || summary.upcoming_appointments.length === 0 ? (
              <p className="text-center py-6 text-warm-700 font-bold text-lg bg-warm-50 rounded-2xl border border-warm-200">
                No upcoming appointments. Click &ldquo;Book Appointment&rdquo; to schedule one for your loved one.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {summary.upcoming_appointments.map((a: any) => (
                  <div
                    key={a.id}
                    className="p-5 rounded-2xl border-2 border-teal-200 bg-warm-50 shadow-sm flex flex-col justify-between gap-3"
                  >
                    <div>
                      <div className="text-xl font-black text-teal-950">{a.title}</div>
                      <div className="text-sm font-bold text-teal-850 mt-0.5">
                        {new Date(a.scheduled_at).toLocaleDateString([], {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                      {(a.doctor_name || a.hospital) && (
                        <div className="text-sm font-semibold text-warm-800 mt-1">
                          {a.doctor_name && <span>{a.doctor_name}</span>}
                          {a.doctor_name && a.hospital && <span> &middot; </span>}
                          {a.hospital && <span>{a.hospital}</span>}
                        </div>
                      )}
                    </div>
                    {a.notes && (
                      <p className="text-xs text-warm-700 italic border-t border-warm-200 pt-2">
                        {a.notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ================= 6. ORDERS ================= */}
          <section aria-labelledby="orders-heading" className="elder-card p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center text-teal-900">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <h2 id="orders-heading" className="text-2xl sm:text-3xl font-black text-teal-950">
                Recent Medicine Orders
              </h2>
            </div>

            {!summary?.recent_orders || summary.recent_orders.length === 0 ? (
              <p className="text-center py-6 text-warm-700 font-bold text-lg bg-warm-50 rounded-2xl border border-warm-200">
                No pharmacy orders placed yet.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {summary.recent_orders.map((o: any) => (
                  <div
                    key={o.id}
                    className="p-5 rounded-2xl border-2 border-warm-200 bg-warm-50 flex flex-col justify-between gap-3 shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-black text-lg text-teal-950">{o.pharmacy}</span>
                      <span className="text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-900 px-2.5 py-0.5 rounded-full border border-emerald-300">
                        {o.status}
                      </span>
                    </div>

                    <div className="text-base font-semibold text-warm-800">
                      Items:{' '}
                      <strong>
                        {Array.isArray(o.items)
                          ? o.items.map((i: any) => typeof i === 'string' ? i : i.name).join(', ')
                          : o.items}
                      </strong>
                    </div>

                    <div className="text-xs font-bold text-warm-600 flex items-center justify-between border-t border-warm-200 pt-2">
                      <span>Ref: {o.reference || `ORD-${o.id}`}</span>
                      <span>
                        {new Date(o.created_at).toLocaleDateString([], { day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ================= 7. CARE TEAM & CONTACTS ================= */}
          <section aria-labelledby="team-heading" className="elder-card p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center text-teal-900">
                <Stethoscope className="w-6 h-6" />
              </div>
              <h2 id="team-heading" className="text-2xl sm:text-3xl font-black text-teal-950">
                Care Team &amp; Contacts
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Doctors */}
              <div>
                <h3 className="text-lg font-black text-teal-900 mb-3">Doctors</h3>
                {!summary?.care_team || summary.care_team.length === 0 ? (
                  <p className="text-sm font-semibold text-warm-700 italic">No doctors assigned yet.</p>
                ) : (
                  <div className="space-y-3">
                    {summary.care_team.map((doc: any) => (
                      <div
                        key={doc.id}
                        className="p-3.5 rounded-xl border border-warm-200 bg-warm-50 flex items-center justify-between"
                      >
                        <div>
                          <div className="font-black text-base text-teal-950">{doc.name}</div>
                          <div className="text-xs font-semibold text-warm-700">
                            {doc.specialty} &middot; {doc.hospital || 'Hospital'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Emergency Contacts */}
              <div>
                <h3 className="text-lg font-black text-teal-900 mb-3">Emergency Contacts</h3>
                {!summary?.emergency_contacts || summary.emergency_contacts.length === 0 ? (
                  <p className="text-sm font-semibold text-warm-700 italic">No emergency contacts listed.</p>
                ) : (
                  <div className="space-y-3">
                    {summary.emergency_contacts.map((c: any) => (
                      <div
                        key={c.id || c.phone}
                        className="p-3.5 rounded-xl border border-warm-200 bg-warm-50 flex items-center justify-between"
                      >
                        <div>
                          <div className="font-black text-base text-teal-950">{c.name}</div>
                          <div className="text-xs font-semibold text-warm-700 capitalize">
                            {c.relation || 'Family'} &middot; {c.phone}
                          </div>
                        </div>
                        <a
                          href={`tel:${c.phone}`}
                          aria-label={`Call ${c.name}`}
                          className="p-2 rounded-xl bg-teal-100 hover:bg-teal-200 text-teal-950 transition-colors"
                        >
                          <Phone className="w-5 h-5" />
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* ================= 8. LIFESTYLE PLAN ================= */}
          <section aria-labelledby="lifestyle-heading" className="elder-card p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center text-teal-900">
                  <Activity className="w-6 h-6" />
                </div>
                <div>
                  <h2 id="lifestyle-heading" className="text-2xl sm:text-3xl font-black text-teal-950">
                    Daily Lifestyle Plan
                  </h2>
                  <p className="text-sm font-semibold text-warm-700">
                    Adapted to latest risk score ({latestCheckin?.risk_score ?? 100}/100)
                  </p>
                </div>
              </div>

              {lifestyle?.mode && (
                <span className="self-start sm:self-auto px-4 py-1.5 rounded-full bg-teal-100 text-teal-950 font-black text-sm uppercase tracking-wider border border-teal-300">
                  Mode: {lifestyle.mode}
                </span>
              )}
            </div>

            {/* 4 Small Tabs */}
            <div className="flex rounded-2xl bg-warm-100 p-1.5 border-2 border-warm-200 mb-6 overflow-x-auto">
              {[
                { id: 'exercise', label: 'Exercise', icon: Activity },
                { id: 'walking', label: 'Walking', icon: Footprints },
                { id: 'food', label: 'Food', icon: Utensils },
                { id: 'travel', label: 'Travel', icon: Car },
              ].map((tab) => {
                const Icon = tab.icon;
                const isSelected = lifestyleTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setLifestyleTab(tab.id as any)}
                    aria-pressed={isSelected}
                    className={`flex-1 min-h-[48px] py-2.5 px-3 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all whitespace-nowrap ${
                      isSelected
                        ? 'bg-teal-900 text-white shadow-sm'
                        : 'text-warm-800 hover:text-teal-950'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Tab Contents */}
            <div className="p-5 rounded-2xl bg-warm-50 border-2 border-warm-200 min-h-[160px]">
              {lifestyleTab === 'exercise' && (
                <div className="space-y-3">
                  <h3 className="font-black text-xl text-teal-950 flex items-center gap-2">
                    <span>Exercise Routine</span>
                    {lifestyle?.exercise?.daily_minutes_walking > 0 && (
                      <span className="text-sm font-semibold text-warm-700">
                        ({lifestyle.exercise.daily_minutes_walking} mins walking)
                      </span>
                    )}
                  </h3>
                  <ul className="list-disc list-inside space-y-1.5 text-base font-semibold text-warm-900">
                    {lifestyle?.exercise?.plan?.map((item: string, i: number) => (
                      <li key={i}>{item}</li>
                    )) || <li>Gentle movement and breathing exercises.</li>}
                  </ul>
                </div>
              )}

              {lifestyleTab === 'walking' && (
                <div className="space-y-3">
                  <h3 className="font-black text-xl text-teal-950">Walking Goals</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="bg-white p-4 rounded-xl border border-warm-200">
                      <div className="text-xs font-bold text-warm-600">Daily Step Target</div>
                      <div className="text-2xl font-black text-teal-950">
                        {lifestyle?.walking?.step_goal || 4000} steps
                      </div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-warm-200">
                      <div className="text-xs font-bold text-warm-600">Target Distance</div>
                      <div className="text-2xl font-black text-teal-950">
                        {lifestyle?.walking?.distance_km || 2.0} km
                      </div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-warm-200">
                      <div className="text-xs font-bold text-warm-600">Remaining Today</div>
                      <div className="text-2xl font-black text-teal-850">
                        {lifestyle?.walking?.remaining_km || 0} km
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {lifestyleTab === 'food' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white p-4 rounded-xl border border-emerald-200">
                    <h4 className="font-black text-emerald-900 text-lg mb-2">Eat / Recommended:</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm font-semibold text-warm-900">
                      {lifestyle?.food?.eat?.map((f: string, i: number) => (
                        <li key={i}>{f}</li>
                      )) || <li>Fresh fruits, warm vegetables, plenty of water.</li>}
                    </ul>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-rose-200">
                    <h4 className="font-black text-rose-900 text-lg mb-2">Avoid / Limit:</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm font-semibold text-warm-900">
                      {lifestyle?.food?.avoid?.map((f: string, i: number) => (
                        <li key={i}>{f}</li>
                      )) || <li>Heavy oil, excessive salt, raw street food.</li>}
                    </ul>
                  </div>
                </div>
              )}

              {lifestyleTab === 'travel' && (
                <div className="space-y-3">
                  <h3 className="font-black text-xl text-teal-950">
                    Travel Guidance &middot; Max One-Way:{' '}
                    <strong>{lifestyle?.travel?.max_one_way_km || 8} km</strong>
                  </h3>
                  <ul className="list-disc list-inside space-y-1.5 text-base font-semibold text-warm-900">
                    {lifestyle?.travel?.tips?.map((t: string, i: number) => (
                      <li key={i}>{t}</li>
                    )) || <li>Carry emergency medicine card and travel during daylight hours.</li>}
                  </ul>
                </div>
              )}
            </div>
          </section>

          {/* ================= 9. ACTIVITY LOG / MESSAGES SENT (DEMO HELPER) ================= */}
          <section aria-labelledby="outbox-heading" className="elder-card p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center text-teal-900">
                <MessageSquare className="w-6 h-6" />
              </div>
              <div>
                <h2 id="outbox-heading" className="text-2xl sm:text-3xl font-black text-teal-950">
                  Messages Sent (SMS &amp; Calls Outbox)
                </h2>
                <p className="text-sm font-bold text-warm-700">
                  Live log of automated emergency calls and SMS dispatched by CareCircle
                </p>
              </div>
            </div>

            {outbox.length === 0 ? (
              <p className="text-center py-6 text-warm-700 font-bold text-lg bg-warm-50 rounded-2xl border border-warm-200">
                No outbound notifications recorded yet.
              </p>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {outbox.map((msg: any) => (
                  <div
                    key={msg.id}
                    className="p-4 rounded-2xl border-2 border-warm-200 bg-warm-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`p-2.5 rounded-xl text-white mt-0.5 ${
                          msg.channel === 'call' ? 'bg-rose-600' : 'bg-teal-850'
                        }`}
                      >
                        {msg.channel === 'call' ? (
                          <PhoneCall className="w-5 h-5" />
                        ) : (
                          <MessageSquare className="w-5 h-5" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-lg text-teal-950">{msg.title}</span>
                          <span className="text-xs font-black uppercase tracking-wider bg-warm-200 text-warm-800 px-2 py-0.5 rounded">
                            {msg.channel}
                          </span>
                        </div>
                        <p className="text-base font-semibold text-warm-800 mt-0.5">
                          {msg.body}
                        </p>
                        <div className="text-xs font-bold text-warm-600 mt-1">
                          To: <strong>{msg.to_addr || 'Contacts'}</strong> &middot;{' '}
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {/* ================= MODALS ================= */}

      {/* 1. Notifications Modal */}
      <NotificationsModal
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        onRefreshUnread={() => {
          if (selectedPatientId) loadPatientSummary(true);
        }}
      />

      {/* 2. Book Appointment Modal */}
      {selectedPatientId && (
        <BookAppointmentModal
          patientId={selectedPatientId}
          isOpen={isBookApptOpen}
          onClose={() => setIsBookApptOpen(false)}
          onSuccess={() => loadPatientSummary(false)}
          defaultHospital={summary?.patient?.hospital_name || ''}
        />
      )}
    </div>
  );
};
