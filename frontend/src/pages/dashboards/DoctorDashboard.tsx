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
  Stethoscope,
  Search,
  AlertTriangle,
  CheckCircle,
  Plus,
  Trash2,
  Calendar,
  Pill,
  Clock,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Activity,
  FileText,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ProgressRing } from '../../components/ui/ProgressRing';
import { Badge } from '../../components/ui/Badge';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import {
  User,
  PatientSummary,
  Schedule,
  MedicineDirectoryItem,
  AppointmentIn,
  ScheduleIn,
} from '../../types/api';

export const DoctorDashboard: React.FC = () => {
  const { user } = useAuth();

  const [patients, setPatients] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [summary, setSummary] = useState<PatientSummary | null>(null);
  const [checkins, setCheckins] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [medicinesDir, setMedicinesDir] = useState<MedicineDirectoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Expanded checkins
  const [expandedCheckinId, setExpandedCheckinId] = useState<number | null>(null);

  // Prescribe Medicine Modal
  const [isPrescribing, setIsPrescribing] = useState(false);
  const [medName, setMedName] = useState('');
  const [medDosage, setMedDosage] = useState('1 tablet');
  const [medTime, setMedTime] = useState('08:00');
  const [medFood, setMedFood] = useState<'before' | 'after' | 'with' | 'any'>('after');
  const [isSubmittingMed, setIsSubmittingMed] = useState(false);

  // Book Appointment Modal
  const [isBookingAppt, setIsBookingAppt] = useState(false);
  const [apptTitle, setApptTitle] = useState('Clinical Follow-up');
  const [apptDateTime, setApptDateTime] = useState('');
  const [isSubmittingAppt, setIsSubmittingAppt] = useState(false);

  // Load patients and directory
  useEffect(() => {
    async function loadInitial() {
      try {
        const [pList, mList] = await Promise.all([
          api.getPatients(),
          api.getMedicines().catch(() => []),
        ]);
        setPatients(pList);
        setMedicinesDir(mList);
        if (pList.length > 0 && !selectedPatientId) {
          setSelectedPatientId(pList[0].id);
        }
      } catch {
        // ignore
      } finally {
        setIsLoading(false);
      }
    }
    loadInitial();
  }, [selectedPatientId]);

  // Load selected patient details
  const loadPatientData = useCallback(async () => {
    if (!selectedPatientId) return;
    try {
      const [sum, chks, scheds] = await Promise.all([
        api.getPatientSummary(selectedPatientId),
        api.getPatientCheckins(selectedPatientId).catch(() => []),
        api.getPatientSchedules(selectedPatientId).catch(() => []),
      ]);
      setSummary(sum);
      setCheckins(chks);
      setSchedules(scheds);
    } catch {
      // non-fatal
    }
  }, [selectedPatientId]);

  useEffect(() => {
    loadPatientData();
    const timer = setInterval(loadPatientData, 20000);
    return () => clearInterval(timer);
  }, [loadPatientData]);

  // Filter patients
  const filteredPatients = patients.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Prescribe medicine
  const handlePrescribeMedicine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId || !medName || !medTime) return;
    setIsSubmittingMed(true);
    try {
      await api.addPatientSchedule(selectedPatientId, {
        medicine_name: medName.trim(),
        dosage: medDosage.trim(),
        times: [medTime.trim()],
        with_food: medFood,
      });
      setIsPrescribing(false);
      setMedName('');
      loadPatientData();
    } catch {
      // non-fatal
    } finally {
      setIsSubmittingMed(false);
    }
  };

  // Stop medicine
  const handleStopMedicine = async (sid: number) => {
    if (!selectedPatientId) return;
    try {
      await api.deletePatientSchedule(selectedPatientId, sid);
      loadPatientData();
    } catch {
      // ignore
    }
  };

  // Create appointment
  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId || !apptTitle || !apptDateTime) return;
    setIsSubmittingAppt(true);
    try {
      await api.addPatientAppointment(selectedPatientId, {
        title: apptTitle,
        doctor_name: user?.name,
        scheduled_at: new Date(apptDateTime).toISOString(),
      });
      setIsBookingAppt(false);
      loadPatientData();
    } catch {
      // ignore
    } finally {
      setIsSubmittingAppt(false);
    }
  };

  // Resolve Alert
  const handleResolveAlert = async (alertId: number) => {
    try {
      await api.resolveAlert(alertId);
      loadPatientData();
    } catch {
      // ignore
    }
  };

  const selectedPatient = summary?.patient || patients.find((p) => p.id === selectedPatientId);

  return (
    <div className="min-h-screen bg-sand/20 dark:bg-ink pb-20 text-ink dark:text-paper">
      {/* Disclaimer Banner */}
      <div className="bg-mint/80 dark:bg-teal-950 border-b border-teal/20 px-4 py-2.5 text-center text-xs font-semibold text-teal-900 dark:text-mint flex items-center justify-center gap-2">
        <Stethoscope className="w-4 h-4" />
        <span>Clinical Notice: AI risk scores are decision support, not an automated diagnosis.</span>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* LEFT COLUMN: PATIENT ROSTER */}
          <div className="lg:col-span-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-serif font-bold text-ink dark:text-paper">
                Patient Roster ({patients.length})
              </h2>
            </div>

            {/* Search Box */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-ink/40 dark:text-sand/40" />
              <input
                type="text"
                placeholder="Search patient by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-paper dark:bg-teal-950/60 border border-sand dark:border-teal-800 text-sm focus:outline-none focus:ring-2 focus:ring-teal"
              />
            </div>

            {/* List */}
            <div className="space-y-2 max-h-[calc(100vh-250px)] overflow-y-auto">
              {filteredPatients.map((p) => {
                const isSelected = p.id === selectedPatientId;
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPatientId(p.id)}
                    className={`w-full p-4 rounded-2xl border text-left transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-teal text-white border-teal shadow-md'
                        : 'bg-paper dark:bg-teal-950/40 border-sand dark:border-teal-800 text-ink dark:text-paper hover:bg-sand/30'
                    }`}
                  >
                    <div>
                      <h4 className="font-serif font-bold text-base">{p.name}</h4>
                      <p className={`text-xs ${isSelected ? 'text-mint' : 'text-ink/60 dark:text-sand/60'}`}>
                        {p.age ? `${p.age} yrs` : 'Senior'} • {p.city || 'India'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`w-3 h-3 rounded-full ${
                          isSelected ? 'bg-mint' : 'bg-teal'
                        }`}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* RIGHT COLUMN: SELECTED PATIENT DETAILS */}
          <div className="lg:col-span-8 space-y-6">
            {selectedPatient ? (
              <>
                {/* Profile Header */}
                <Card className="p-6 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-widest text-teal dark:text-mint">
                        Clinical Overview
                      </span>
                      <h2 className="text-3xl font-serif font-bold text-ink dark:text-paper">
                        {selectedPatient.name}
                      </h2>
                      <p className="text-sm text-ink/70 dark:text-sand/70">
                        Age: {selectedPatient.age || 72} • Phone: {selectedPatient.phone} • Language: {selectedPatient.language || 'en'}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <Button size="sm" variant="primary" onClick={() => setIsPrescribing(true)}>
                        <Plus className="w-4 h-4 mr-1" />
                        <span>Prescribe Medicine</span>
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => setIsBookingAppt(true)}>
                        <Calendar className="w-4 h-4 mr-1" />
                        <span>Schedule Visit</span>
                      </Button>
                    </div>
                  </div>

                  {/* Conditions & Allergies Tags */}
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-sand dark:border-teal-900">
                    <span className="text-xs font-bold uppercase text-ink/50 dark:text-sand/50 mr-2 self-center">
                      Conditions:
                    </span>
                    {(selectedPatient.conditions || ['hypertension']).map((c, i) => (
                      <Badge key={i} variant="teal">
                        {c.replace('_', ' ')}
                      </Badge>
                    ))}

                    <span className="text-xs font-bold uppercase text-ink/50 dark:text-sand/50 ml-4 mr-2 self-center">
                      Allergies:
                    </span>
                    {(selectedPatient.allergies || ['None reported']).map((a, i) => (
                      <Badge key={i} variant="amber">
                        {a}
                      </Badge>
                    ))}
                  </div>
                </Card>

                {/* Prescribe Medicine Inline Form */}
                {isPrescribing && (
                  <form
                    onSubmit={handlePrescribeMedicine}
                    className="p-5 bg-sand/40 dark:bg-teal-950/60 rounded-3xl border border-sand dark:border-teal-800 space-y-3"
                  >
                    <h4 className="font-serif font-bold text-base">Add New Medication Schedule</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-bold uppercase text-ink/70 dark:text-sand/70 block mb-1">
                          Medicine Name
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Amlodipine 5mg"
                          value={medName}
                          onChange={(e) => setMedName(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-paper border border-sand text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold uppercase text-ink/70 dark:text-sand/70 block mb-1">
                          Dosage
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="1 tablet"
                          value={medDosage}
                          onChange={(e) => setMedDosage(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-paper border border-sand text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold uppercase text-ink/70 dark:text-sand/70 block mb-1">
                          Scheduled Time (24h HH:MM)
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="08:00"
                          value={medTime}
                          onChange={(e) => setMedTime(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-paper border border-sand text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold uppercase text-ink/70 dark:text-sand/70 block mb-1">
                          Food Instruction
                        </label>
                        <select
                          value={medFood}
                          onChange={(e: any) => setMedFood(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-paper border border-sand text-sm"
                        >
                          <option value="after">After Food</option>
                          <option value="before">Before Food</option>
                          <option value="with">With Food</option>
                          <option value="any">Any Time</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex gap-2 justify-end pt-2">
                      <Button size="sm" variant="ghost" onClick={() => setIsPrescribing(false)}>
                        Cancel
                      </Button>
                      <Button size="sm" variant="primary" type="submit" isLoading={isSubmittingMed}>
                        Save Prescription
                      </Button>
                    </div>
                  </form>
                )}

                {/* Risk Trend Chart */}
                <Card className="p-6 space-y-4">
                  <h3 className="font-serif font-bold text-xl text-ink dark:text-paper">
                    30-Day Clinical Risk Progression
                  </h3>
                  <div className="h-60 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={summary?.risk_trend || []} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                        <RechartsTooltip />
                        <ReferenceLine y={70} stroke="#3F8F5B" strokeDasharray="3 3" label="Normal" />
                        <ReferenceLine y={40} stroke="#C8553D" strokeDasharray="3 3" label="Critical" />
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

                {/* Active Prescriptions */}
                <Card className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-serif font-bold text-xl text-ink dark:text-paper">
                      Active Medication Regimen
                    </h3>
                  </div>

                  <div className="space-y-3">
                    {schedules.length === 0 ? (
                      <p className="text-sm text-ink/60">No active medication schedules.</p>
                    ) : (
                      schedules.map((s) => (
                        <div
                          key={s.id}
                          className="p-3.5 rounded-2xl bg-sand/30 dark:bg-ink/40 border border-sand dark:border-teal-800 flex items-center justify-between"
                        >
                          <div>
                            <h5 className="font-bold text-base text-ink dark:text-paper">
                              {s.medicine_name}
                            </h5>
                            <p className="text-xs text-ink/60 dark:text-sand/60">
                              {s.dosage} • Times: {s.times.join(', ')} • {s.with_food ? `${s.with_food} food` : 'any time'}
                            </p>
                          </div>
                          <button
                            onClick={() => handleStopMedicine(s.id)}
                            className="p-2 text-clay hover:bg-clay/10 rounded-xl text-xs font-semibold flex items-center gap-1"
                            title="Discontinue medication"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span>Stop</span>
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </Card>

                {/* Last 10 Check-ins with Expandable AI Analysis */}
                <Card className="p-6 space-y-4">
                  <h3 className="font-serif font-bold text-xl text-ink dark:text-paper">
                    Recent Health Check-in Logs
                  </h3>

                  <div className="space-y-3">
                    {checkins.length === 0 ? (
                      <p className="text-sm text-ink/60">No check-in history logged yet.</p>
                    ) : (
                      checkins.slice(0, 10).map((chk) => {
                        const isExpanded = expandedCheckinId === chk.id;
                        return (
                          <div
                            key={chk.id}
                            className="border border-sand dark:border-teal-800 rounded-2xl p-4 bg-sand/20 dark:bg-ink/30 space-y-2"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Badge
                                  variant={
                                    chk.level === 'emergency'
                                      ? 'clay'
                                      : chk.level === 'attention'
                                      ? 'amber'
                                      : 'sage'
                                  }
                                >
                                  Score {chk.score} • {chk.level.toUpperCase()}
                                </Badge>
                                <span className="text-xs text-ink/60 dark:text-sand/60">
                                  {new Date(chk.created_at).toLocaleString()}
                                </span>
                              </div>

                              <button
                                onClick={() => setExpandedCheckinId(isExpanded ? null : chk.id)}
                                className="text-xs font-bold text-teal dark:text-mint flex items-center gap-1"
                              >
                                <span>{isExpanded ? 'Hide' : 'Analysis'}</span>
                                {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                              </button>
                            </div>

                            <p className="text-sm text-ink/80 dark:text-sand/80 font-medium">
                              "{chk.message}"
                            </p>

                            {isExpanded && (
                              <div className="pt-3 border-t border-sand dark:border-teal-900/60 text-xs space-y-2">
                                {chk.analysis?.reasons && (
                                  <div>
                                    <span className="font-bold text-teal dark:text-mint">Clinical Reasoning: </span>
                                    <span>{chk.analysis.reasons.join(' • ')}</span>
                                  </div>
                                )}
                                {chk.text && (
                                  <div>
                                    <span className="font-bold text-teal dark:text-mint">Patient Transcript: </span>
                                    <span>{chk.text}</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </Card>
              </>
            ) : (
              <Card className="p-12 text-center text-ink/60">Select a patient from the roster.</Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
