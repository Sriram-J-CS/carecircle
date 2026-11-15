import React, { useState, useEffect, useCallback } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ReferenceLine,
  CartesianGrid,
} from 'recharts';
import {
  ShieldAlert,
  CheckCircle,
  AlertTriangle,
  Clock,
  PhoneCall,
  Calendar,
  Package,
  Heart,
  Plus,
  RefreshCw,
  Bell,
  MessageSquare,
  Activity,
  Users,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ProgressRing } from '../../components/ui/ProgressRing';
import { Badge } from '../../components/ui/Badge';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { api } from '../../services/api';
import { playAlertTone } from '../../services/audio';
import {
  User,
  PatientSummary,
  Alert,
  AppointmentIn,
  OutboxMessage,
} from '../../types/api';

export const FamilyDashboard: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();

  const [patients, setPatients] = useState<User[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [summary, setSummary] = useState<PatientSummary | null>(null);
  const [outbox, setOutbox] = useState<OutboxMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Appointment Modal
  const [isBookingAppt, setIsBookingAppt] = useState(false);
  const [apptTitle, setApptTitle] = useState('');
  const [apptDoctor, setApptDoctor] = useState('');
  const [apptHospital, setApptHospital] = useState('');
  const [apptDateTime, setApptDateTime] = useState('');
  const [isSubmittingAppt, setIsSubmittingAppt] = useState(false);

  // Load patients accessible by this relative
  useEffect(() => {
    async function loadPatients() {
      try {
        const list = await api.getPatients();
        setPatients(list);
        if (list.length > 0 && !selectedPatientId) {
          setSelectedPatientId(list[0].id);
        }
      } catch {
        // ignore
      } finally {
        setIsLoading(false);
      }
    }
    loadPatients();
  }, [selectedPatientId]);

  // Load patient summary and outbox
  const loadSummary = useCallback(async () => {
    if (!selectedPatientId) return;
    try {
      const [sum, out] = await Promise.all([
        api.getPatientSummary(selectedPatientId),
        api.getOutbox().catch(() => []),
      ]);
      setSummary(sum);
      setOutbox(out);

      // Check for critical alerts and play alert tone
      const hasCritical = sum.open_alerts.some((a) => a.severity === 'critical');
      if (hasCritical) {
        playAlertTone();
      }
    } catch {
      // non-fatal
    }
  }, [selectedPatientId]);

  useEffect(() => {
    loadSummary();
    const timer = setInterval(loadSummary, 20000); // 20s refresh
    return () => clearInterval(timer);
  }, [loadSummary]);

  // Alert Actions
  const handleAcknowledge = async (alertId: number) => {
    try {
      await api.acknowledgeAlert(alertId);
      loadSummary();
    } catch {
      // ignore
    }
  };

  const handleResolve = async (alertId: number) => {
    try {
      await api.resolveAlert(alertId);
      loadSummary();
    } catch {
      // ignore
    }
  };

  // Appointment submission
  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId || !apptTitle || !apptDateTime) return;
    setIsSubmittingAppt(true);
    try {
      await api.addPatientAppointment(selectedPatientId, {
        title: apptTitle,
        doctor_name: apptDoctor || undefined,
        hospital: apptHospital || undefined,
        scheduled_at: new Date(apptDateTime).toISOString(),
      });
      setIsBookingAppt(false);
      setApptTitle('');
      setApptDoctor('');
      setApptHospital('');
      setApptDateTime('');
      loadSummary();
    } catch {
      // ignore
    } finally {
      setIsSubmittingAppt(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-sand/20 dark:bg-ink p-8 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-teal border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-medium text-ink/70 dark:text-sand/70">Loading Family Circle...</p>
        </div>
      </div>
    );
  }

  const selectedPatient = summary?.patient || patients.find((p) => p.id === selectedPatientId);
  const openAlerts = summary?.open_alerts || [];
  const hasCriticalAlert = openAlerts.some((a) => a.severity === 'critical');
  const level = hasCriticalAlert
    ? 'emergency'
    : (summary?.latest_checkin?.level || 'normal');

  return (
    <div className="min-h-screen bg-sand/20 dark:bg-ink pb-20 text-ink dark:text-paper">
      {/* Header & Patient Switcher */}
      <div className="bg-paper dark:bg-teal-950/60 border-b border-sand dark:border-teal-900 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-teal dark:text-mint">
              Family Care Dashboard
            </span>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-ink dark:text-paper">
              Monitoring {selectedPatient ? selectedPatient.name : 'Patient'}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Patient Switcher */}
            {patients.length > 1 && (
              <select
                value={selectedPatientId || ''}
                onChange={(e) => setSelectedPatientId(Number(e.target.value))}
                className="px-4 py-2 rounded-2xl bg-sand/40 dark:bg-teal-900 border border-sand dark:border-teal-700 text-sm font-semibold"
              >
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.role})
                  </option>
                ))}
              </select>
            )}

            <button
              onClick={loadSummary}
              className="p-2.5 rounded-full bg-sand/50 dark:bg-teal-900/50 hover:bg-sand text-ink/70 dark:text-sand/70 transition-colors"
              title="Refresh status"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* 1. STATUS BANNER */}
        <section
          className={`p-6 sm:p-8 rounded-3xl border-2 transition-all shadow-soft flex flex-wrap items-center justify-between gap-6 ${
            level === 'emergency'
              ? 'bg-clay/15 border-clay text-clay animate-pulse'
              : level === 'attention'
              ? 'bg-amber-500/10 border-amber-500/40 text-amber-900 dark:text-amber-200'
              : 'bg-sage/10 border-sage/30 text-sage-900 dark:text-sage-200'
          }`}
        >
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-white/60 dark:bg-ink/40">
              {level === 'emergency' ? (
                <>
                  <span className="w-2.5 h-2.5 rounded-full bg-clay animate-ping" />
                  <span>EMERGENCY ALERT</span>
                </>
              ) : level === 'attention' ? (
                <>
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span>Attention Needed</span>
                </>
              ) : (
                <>
                  <span className="w-2.5 h-2.5 rounded-full bg-sage" />
                  <span>All Good</span>
                </>
              )}
            </div>

            <h2 className="text-3xl font-serif font-bold">
              {level === 'emergency'
                ? 'Urgent Medical Attention Required'
                : level === 'attention'
                ? 'Elder reported discomfort or symptoms'
                : 'All medications and check-ins are normal'}
            </h2>

            <p className="text-sm opacity-90 leading-relaxed">
              {summary?.latest_checkin?.message ||
                'No abnormal health changes reported in the last 6 hours.'}
            </p>

            {summary?.latest_checkin?.analysis?.reasons && (
              <div className="pt-2 text-xs font-semibold opacity-90">
                Key factors: {summary.latest_checkin.analysis.reasons.join(' • ')}
              </div>
            )}
          </div>

          <div className="flex items-center gap-6">
            <div className="text-center">
              <ProgressRing
                value={summary?.risk_score ?? 85}
                size={110}
                strokeWidth={9}
                color={level === 'emergency' ? '#C8553D' : level === 'attention' ? '#D9922B' : '#3F8F5B'}
              />
              <span className="text-xs font-bold uppercase tracking-wider block mt-2 opacity-80">
                Health Score
              </span>
            </div>
          </div>
        </section>

        {/* 2. OPEN ALERTS */}
        {openAlerts.length > 0 && (
          <section className="space-y-4">
            <h3 className="text-2xl font-serif font-bold text-ink dark:text-paper flex items-center gap-2">
              <ShieldAlert className="w-6 h-6 text-clay" />
              <span>Active Alerts ({openAlerts.length})</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {openAlerts.map((alert) => (
                <Card
                  key={alert.id}
                  className={`p-6 border-2 space-y-4 ${
                    alert.severity === 'critical'
                      ? 'border-clay bg-clay/5'
                      : 'border-amber-300 dark:border-amber-900 bg-amber-500/5'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <Badge variant={alert.severity === 'critical' ? 'clay' : 'amber'}>
                      {alert.severity.toUpperCase()}
                    </Badge>
                    <span className="text-xs text-ink/60 dark:text-sand/60">
                      {new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <p className="text-base font-semibold text-ink dark:text-paper">
                    {alert.message}
                  </p>

                  {alert.acknowledged_by ? (
                    <div className="text-xs font-medium text-teal dark:text-mint bg-mint/40 dark:bg-teal-900/40 p-2.5 rounded-xl">
                      ✓ Responded by {alert.acknowledged_by} at{' '}
                      {alert.acknowledged_at ? new Date(alert.acknowledged_at).toLocaleTimeString() : ''}
                    </div>
                  ) : (
                    <div className="text-xs text-amber-700 dark:text-amber-400">
                      Awaiting family acknowledgment
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 pt-2 border-t border-sand dark:border-teal-900">
                    {!alert.acknowledged_at ? (
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => handleAcknowledge(alert.id)}
                      >
                        {t('im_on_it')}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleResolve(alert.id)}
                      >
                        {t('resolved')}
                      </Button>
                    )}

                    {selectedPatient?.phone && (
                      <a
                        href={`tel:${selectedPatient.phone}`}
                        className="px-3.5 py-2 rounded-xl bg-sand/60 hover:bg-sand text-xs font-bold text-ink flex items-center gap-1.5 transition-colors"
                      >
                        <PhoneCall className="w-3.5 h-3.5 text-teal" />
                        <span>Call {selectedPatient.name}</span>
                      </a>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* 3. TODAY'S MEDICINES & ADHERENCE */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-4">
            <h3 className="text-2xl font-serif font-bold text-ink dark:text-paper">
              Today's Medication Doses
            </h3>

            <div className="space-y-3">
              {(summary?.today_doses || []).length === 0 ? (
                <Card className="p-6 text-center text-ink/60">No medicines scheduled today.</Card>
              ) : (
                summary?.today_doses.map((dose) => (
                  <Card
                    key={dose.id}
                    className="p-4 flex items-center justify-between border-sand dark:border-teal-800"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold bg-sand/60 dark:bg-ink/50 px-2 py-0.5 rounded-full">
                          {dose.scheduled_time}
                        </span>
                        <h4 className="font-serif font-bold text-lg text-ink dark:text-paper">
                          {dose.medicine_name}
                        </h4>
                      </div>
                      <p className="text-xs text-ink/60 dark:text-sand/60 mt-0.5">
                        {dose.dosage} {dose.with_food ? `• ${dose.with_food} food` : ''}
                      </p>
                    </div>

                    <div>
                      {dose.status === 'taken' ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-sage bg-sage/10 px-3 py-1.5 rounded-full">
                          <CheckCircle className="w-4 h-4" /> Taken{' '}
                          {dose.taken_at ? new Date(dose.taken_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      ) : dose.status === 'missed' ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-clay bg-clay/10 px-3 py-1.5 rounded-full">
                          <AlertTriangle className="w-4 h-4" /> Missed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-ink/70 bg-sand/60 px-3 py-1.5 rounded-full">
                          <Clock className="w-4 h-4" /> Pending
                        </span>
                      )}
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>

          <div className="lg:col-span-4">
            <Card className="p-6 text-center space-y-4 h-full flex flex-col justify-center items-center">
              <h4 className="font-serif font-bold text-xl text-ink dark:text-paper">
                30-Day Adherence
              </h4>
              <ProgressRing
                value={summary?.adherence_30d_pct ?? 92}
                size={140}
                strokeWidth={12}
                color="#0F5C5A"
              />
              <p className="text-xs text-ink/70 dark:text-sand/70 max-w-xs">
                Consistent medication adherence lowers emergency hospitalization risk by up to 64%.
              </p>
            </Card>
          </div>
        </section>

        {/* 4. RISK TREND CHART */}
        <section className="space-y-4">
          <h3 className="text-2xl font-serif font-bold text-ink dark:text-paper">
            Health Risk Trend
          </h3>
          <Card className="p-6">
            <div className="h-64 sm:h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={summary?.risk_trend || []} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <RechartsTooltip />
                  <ReferenceLine y={70} stroke="#3F8F5B" strokeDasharray="3 3" label="Normal Zone (70)" />
                  <ReferenceLine y={40} stroke="#C8553D" strokeDasharray="3 3" label="Emergency Zone (40)" />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="#0F5C5A"
                    strokeWidth={3}
                    dot={{ r: 4, fill: '#0F5C5A' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </section>

        {/* 5. APPOINTMENTS & ORDERS */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Appointments */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-serif font-bold text-ink dark:text-paper flex items-center gap-2">
                <Calendar className="w-6 h-6 text-teal" />
                <span>Appointments</span>
              </h3>
              <Button size="sm" variant="secondary" onClick={() => setIsBookingAppt(true)}>
                <Plus className="w-4 h-4 mr-1" />
                <span>Book New</span>
              </Button>
            </div>

            <div className="space-y-3">
              {(summary?.upcoming_appointments || []).length === 0 ? (
                <Card className="p-6 text-center text-ink/60">No upcoming appointments.</Card>
              ) : (
                summary?.upcoming_appointments.map((appt) => (
                  <Card key={appt.id} className="p-4 space-y-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-serif font-bold text-base text-ink dark:text-paper">
                        {appt.title}
                      </h4>
                      <span className="text-xs font-semibold text-teal dark:text-mint">
                        {new Date(appt.scheduled_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs text-ink/70 dark:text-sand/70">
                      {appt.doctor_name || 'Attending Doctor'} • {appt.hospital || 'Hospital'}
                    </p>
                  </Card>
                ))
              )}
            </div>

            {/* Book Appointment Inline Form Modal */}
            {isBookingAppt && (
              <form
                onSubmit={handleCreateAppointment}
                className="p-5 bg-sand/40 dark:bg-teal-950/40 rounded-2xl border border-sand dark:border-teal-800 space-y-3"
              >
                <h4 className="font-serif font-bold text-sm">Schedule Doctor Appointment</h4>
                <input
                  type="text"
                  required
                  placeholder="Reason / Title (e.g. Cardiologist Checkup)"
                  value={apptTitle}
                  onChange={(e) => setApptTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-paper border border-sand text-sm"
                />
                <input
                  type="text"
                  placeholder="Doctor Name (e.g. Dr. S. K. Raman)"
                  value={apptDoctor}
                  onChange={(e) => setApptDoctor(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-paper border border-sand text-sm"
                />
                <input
                  type="text"
                  placeholder="Hospital / Clinic"
                  value={apptHospital}
                  onChange={(e) => setApptHospital(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-paper border border-sand text-sm"
                />
                <input
                  type="datetime-local"
                  required
                  value={apptDateTime}
                  onChange={(e) => setApptDateTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-paper border border-sand text-sm"
                />
                <div className="flex gap-2 justify-end">
                  <Button size="sm" variant="ghost" onClick={() => setIsBookingAppt(false)}>
                    Cancel
                  </Button>
                  <Button size="sm" variant="primary" type="submit" isLoading={isSubmittingAppt}>
                    Confirm Appointment
                  </Button>
                </div>
              </form>
            )}
          </div>

          {/* Pharmacy Orders */}
          <div className="space-y-4">
            <h3 className="text-2xl font-serif font-bold text-ink dark:text-paper flex items-center gap-2">
              <Package className="w-6 h-6 text-teal" />
              <span>Medicine Deliveries</span>
            </h3>

            <div className="space-y-3">
              {(summary?.recent_orders || []).length === 0 ? (
                <Card className="p-6 text-center text-ink/60">No recent pharmacy orders.</Card>
              ) : (
                summary?.recent_orders.map((order) => (
                  <Card key={order.id} className="p-4 space-y-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-serif font-bold text-base text-ink dark:text-paper">
                        {order.pharmacy}
                      </h4>
                      <Badge variant="teal">{order.status.toUpperCase()}</Badge>
                    </div>
                    <p className="text-xs font-mono text-ink/60 dark:text-sand/60">
                      Ref: {order.reference} • ETA: {order.eta}
                    </p>
                    <p className="text-xs text-ink/80 dark:text-sand/80 font-medium">
                      Items: {order.items.join(', ')}
                    </p>
                  </Card>
                ))
              )}
            </div>
          </div>
        </section>

        {/* 6. MESSAGES SENT (Family / Outbox Logs) */}
        <section className="space-y-4">
          <h3 className="text-2xl font-serif font-bold text-ink dark:text-paper flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-teal" />
            <span>Automated SMS & Call Dispatch Log</span>
          </h3>

          <Card className="p-4 divide-y divide-sand dark:divide-teal-900/60 max-h-60 overflow-y-auto">
            {outbox.length === 0 ? (
              <div className="p-4 text-center text-xs text-ink/60">
                No dispatch logs recorded yet.
              </div>
            ) : (
              outbox.map((msg) => (
                <div key={msg.id} className="py-2.5 flex items-start justify-between gap-4 text-xs">
                  <div>
                    <span className="font-bold text-teal uppercase mr-2">{msg.channel}</span>
                    <span className="text-ink/80 dark:text-sand/80">{msg.body}</span>
                  </div>
                  <span className="shrink-0 text-ink/50 dark:text-sand/50">
                    {new Date(msg.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))
            )}
          </Card>
        </section>
      </div>
    </div>
  );
};
