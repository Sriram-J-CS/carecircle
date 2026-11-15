import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Trash2, ArrowLeft, Clock, MapPin, Stethoscope } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Appointment } from '../../types/api';
import { api } from '../../services/api';

export const AppointmentsPage: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [hospital, setHospital] = useState('');
  const [dateTime, setDateTime] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    try {
      const data = await api.getPatientAppointments('me');
      setAppointments(data);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !dateTime) return;
    setIsSubmitting(true);
    try {
      await api.addPatientAppointment('me', {
        title,
        doctor_name: doctorName || undefined,
        hospital: hospital || undefined,
        scheduled_at: new Date(dateTime).toISOString(),
      });
      setIsAdding(false);
      setTitle('');
      setDoctorName('');
      setHospital('');
      setDateTime('');
      loadData();
    } catch {
      // ignore
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (aid: number) => {
    try {
      await api.deletePatientAppointment('me', aid);
      loadData();
    } catch {
      // ignore
    }
  };

  return (
    <div className="min-h-screen bg-sand/20 dark:bg-ink py-8 px-4 sm:px-6 lg:px-8 text-ink dark:text-paper pb-20">
      <div className="max-w-3xl mx-auto space-y-6">
        <Link
          to="/home"
          className="inline-flex items-center gap-2 text-sm font-semibold text-teal dark:text-mint hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-serif font-bold">Doctor Appointments</h1>
            <p className="text-sm text-ink/70 dark:text-sand/70">
              Manage clinical consultations and hospital visits.
            </p>
          </div>
          <Button variant="primary" onClick={() => setIsAdding(!isAdding)}>
            <Plus className="w-4 h-4 mr-1" />
            <span>Add Appointment</span>
          </Button>
        </div>

        {isAdding && (
          <form
            onSubmit={handleAdd}
            className="p-6 bg-paper dark:bg-teal-950 border border-sand dark:border-teal-800 rounded-3xl shadow-soft space-y-4"
          >
            <h3 className="font-serif font-bold text-lg">Schedule New Visit</h3>
            <div className="space-y-3">
              <input
                type="text"
                required
                placeholder="Visit Purpose / Title (e.g. Blood Pressure Review)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-sand/30 border border-sand text-sm font-medium"
              />
              <input
                type="text"
                placeholder="Doctor Name (e.g. Dr. K. Venkat)"
                value={doctorName}
                onChange={(e) => setDoctorName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-sand/30 border border-sand text-sm font-medium"
              />
              <input
                type="text"
                placeholder="Hospital / Clinic (e.g. Apollo Speciality Clinic)"
                value={hospital}
                onChange={(e) => setHospital(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-sand/30 border border-sand text-sm font-medium"
              />
              <input
                type="datetime-local"
                required
                value={dateTime}
                onChange={(e) => setDateTime(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-sand/30 border border-sand text-sm font-medium"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="ghost" onClick={() => setIsAdding(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" isLoading={isSubmitting}>
                Save Appointment
              </Button>
            </div>
          </form>
        )}

        <div className="space-y-4">
          {appointments.length === 0 ? (
            <Card className="p-8 text-center text-ink/60">
              No upcoming appointments. Use the button above to add one.
            </Card>
          ) : (
            appointments.map((appt) => (
              <Card key={appt.id} className="p-5 flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-teal dark:text-mint flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {new Date(appt.scheduled_at).toLocaleString()}
                  </span>
                  <h4 className="font-serif font-bold text-xl">{appt.title}</h4>
                  <p className="text-xs text-ink/70 dark:text-sand/70 flex items-center gap-2">
                    {appt.doctor_name && (
                      <span className="flex items-center gap-1">
                        <Stethoscope className="w-3 h-3 text-teal" /> {appt.doctor_name}
                      </span>
                    )}
                    {appt.hospital && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-teal" /> {appt.hospital}
                      </span>
                    )}
                  </p>
                </div>

                <button
                  onClick={() => handleDelete(appt.id)}
                  className="p-2 text-clay hover:bg-clay/10 rounded-xl"
                  title="Remove appointment"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
