import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { patientApi, directoryApi } from '../../services/api';
import { Hospital, Doctor } from '../../types/api';
import {
  Users,
  Shield,
  Phone,
  Mail,
  UserPlus,
  Trash2,
  Stethoscope,
  Building2,
  CheckCircle2,
  Loader2,
  X,
  AlertTriangle,
  Plus,
} from 'lucide-react';
import toast from 'react-hot-toast';

export const PeoplePage: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();

  const [accessGrants, setAccessGrants] = useState<any[]>([]);
  const [emergencyContacts, setEmergencyContacts] = useState<any[]>([]);
  const [careTeam, setCareTeam] = useState<any[]>([]);
  const [currentHospital, setCurrentHospital] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Modals & form state
  const [isAddRelativeOpen, setIsAddRelativeOpen] = useState(false);
  const [isAddContactOpen, setIsAddContactOpen] = useState(false);
  const [isChangeCareTeamOpen, setIsChangeCareTeamOpen] = useState(false);

  // Add Relative state
  const [relName, setRelName] = useState('');
  const [relPhone, setRelPhone] = useState('');
  const [relEmail, setRelEmail] = useState('');
  const [relRelation, setRelRelation] = useState('Daughter');
  const [isSubmittingRelative, setIsSubmittingRelative] = useState(false);

  // Add Contact state
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactRelation, setContactRelation] = useState('Son');
  const [contactAppAccess, setContactAppAccess] = useState(true);
  const [isSubmittingContact, setIsSubmittingContact] = useState(false);

  // Change Care Team state
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [selectedHospitalId, setSelectedHospitalId] = useState<number | null>(null);
  const [availableDoctors, setAvailableDoctors] = useState<Doctor[]>([]);
  const [selectedDoctorIds, setSelectedDoctorIds] = useState<number[]>([]);
  const [isSubmittingCareTeam, setIsSubmittingCareTeam] = useState(false);

  // Revoking state
  const [revokingId, setRevokingId] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      setIsLoading(true);
      const [grants, summary, hospList] = await Promise.all([
        patientApi.getAccess(),
        patientApi.getSummary(user.id),
        directoryApi.getHospitals({ limit: 50 }),
      ]);

      setAccessGrants(grants);
      setEmergencyContacts(summary.emergency_contacts || []);
      setCareTeam(summary.care_team || []);
      setHospitals(hospList);

      const hid = summary.profile?.hospital_id;
      if (hid) {
        setSelectedHospitalId(hid);
        const match = hospList.find((h) => h.id === hid);
        setCurrentHospital(match || null);
      }
    } catch (err: any) {
      toast.error('Failed to load access details: ' + (err.message || 'Error'));
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load doctors when hospital is selected in Care Team modal
  useEffect(() => {
    if (selectedHospitalId) {
      directoryApi.getDoctors({ hospital_id: selectedHospitalId }).then((docs) => {
        setAvailableDoctors(docs);
      }).catch(() => {});
    } else {
      setAvailableDoctors([]);
    }
  }, [selectedHospitalId]);

  // Handle Add Relative
  const handleAddRelative = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!relName.trim() || (!relPhone.trim() && !relEmail.trim())) {
      toast.error('Please enter relative name and at least a phone number or email.');
      return;
    }

    try {
      setIsSubmittingRelative(true);
      await patientApi.grantAccess({
        role: 'relative',
        name: relName.trim(),
        phone: relPhone.trim() || null,
        email: relEmail.trim() || null,
        relation: relRelation.trim() || null,
      });

      toast.success(`Access permission created for ${relName}!`);
      setIsAddRelativeOpen(false);
      setRelName('');
      setRelPhone('');
      setRelEmail('');
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to grant access');
    } finally {
      setIsSubmittingRelative(false);
    }
  };

  // Handle Revoke Access
  const handleRevoke = async (id: number, name: string) => {
    try {
      setRevokingId(id);
      await patientApi.revokeAccess(id);
      toast.success(`Revoked access for ${name}`);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to revoke access');
    } finally {
      setRevokingId(null);
    }
  };

  // Handle Add Emergency Contact
  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName.trim() || !contactPhone.trim()) {
      toast.error('Please enter contact name and phone number.');
      return;
    }

    try {
      setIsSubmittingContact(true);
      await patientApi.addContact({
        name: contactName.trim(),
        phone: contactPhone.trim(),
        relation: contactRelation.trim(),
        app_access: contactAppAccess,
      });

      toast.success(`Added emergency contact: ${contactName}!`);
      setIsAddContactOpen(false);
      setContactName('');
      setContactPhone('');
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to add contact');
    } finally {
      setIsSubmittingContact(false);
    }
  };

  // Handle Save Care Team
  const handleSaveCareTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmittingCareTeam(true);
      await patientApi.setCareTeam({
        hospital_id: selectedHospitalId,
        doctor_ids: selectedDoctorIds,
      });

      toast.success('Hospital & Doctors updated!');
      setIsChangeCareTeamOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update care team');
    } finally {
      setIsSubmittingCareTeam(false);
    }
  };

  const toggleDoctorSelection = (id: number) => {
    if (selectedDoctorIds.includes(id)) {
      setSelectedDoctorIds(selectedDoctorIds.filter((d) => d !== id));
    } else {
      setSelectedDoctorIds([...selectedDoctorIds, id]);
    }
  };

  return (
    <div className="space-y-8 pb-20 max-w-5xl mx-auto">
      {/* Header */}
      <div className="elder-card p-6 sm:p-8 bg-gradient-to-r from-teal-900 to-teal-850 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
        <div>
          <span className="text-xs sm:text-sm font-black uppercase tracking-widest text-teal-300">
            CareCircle Permissions
          </span>
          <h1 className="text-3xl sm:text-5xl font-black mt-1">
            {t('people')} &amp; Access
          </h1>
          <p className="text-lg font-bold text-teal-100 mt-1">
            Control who can see your health dashboard and who gets emergency alerts.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-4 text-warm-800">
          <Loader2 className="w-12 h-12 animate-spin text-teal-800" />
          <p className="text-2xl font-black">{t('loading')}</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* ================= SECTION 1: WHO CAN SEE MY HEALTH (ACCESS GRANTS) ================= */}
          <section aria-labelledby="grants-heading" className="elder-card p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-teal-100 text-teal-900 flex items-center justify-center">
                  <Shield className="w-7 h-7 text-teal-850" />
                </div>
                <div>
                  <h2 id="grants-heading" className="text-2xl sm:text-3xl font-black text-teal-950">
                    {t('familyAccess')}
                  </h2>
                  <p className="text-sm font-bold text-warm-700">
                    Relatives and caregivers authorized to view your daily health records
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsAddRelativeOpen(true)}
                className="px-5 py-3 rounded-2xl bg-teal-850 hover:bg-teal-900 text-white font-black text-base flex items-center justify-center gap-2 shadow-md touch-target self-start sm:self-auto"
              >
                <UserPlus className="w-5 h-5" />
                <span>+ Grant Relative Access</span>
              </button>
            </div>

            {accessGrants.length === 0 ? (
              <div className="p-8 text-center bg-warm-50 rounded-2xl border-2 border-dashed border-warm-300">
                <Users className="w-12 h-12 text-warm-400 mx-auto mb-2" />
                <p className="text-xl font-black text-teal-950">No Family Members Added Yet</p>
                <p className="text-sm font-semibold text-warm-700 mt-1 max-w-md mx-auto">
                  Add your son, daughter, or caregiver so they can receive health updates and check-in summaries.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {accessGrants.map((grant) => {
                  const isRevoking = revokingId === grant.id;
                  const isActive = grant.status === 'active';

                  return (
                    <div
                      key={grant.id}
                      className="p-5 rounded-2xl bg-white border-2 border-warm-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xl font-black text-teal-950">{grant.name}</span>
                          {grant.relation && (
                            <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-900">
                              {grant.relation}
                            </span>
                          )}
                          <span
                            className={`text-xs font-black px-2 py-0.5 rounded-full uppercase ${
                              isActive
                                ? 'bg-emerald-100 text-emerald-900'
                                : 'bg-amber-100 text-amber-900'
                            }`}
                          >
                            {grant.status}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-bold text-warm-700">
                          {grant.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-4 h-4 text-teal-800" />
                              {grant.phone}
                            </span>
                          )}
                          {grant.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="w-4 h-4 text-teal-800" />
                              {grant.email}
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={isRevoking}
                        onClick={() => handleRevoke(grant.id, grant.name)}
                        aria-label={`Revoke access for ${grant.name}`}
                        className="px-4 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 font-black text-sm flex items-center justify-center gap-1.5 border border-red-200 transition-colors touch-target self-end sm:self-auto disabled:opacity-60"
                      >
                        {isRevoking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        <span>{t('revoke')}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* ================= SECTION 2: EMERGENCY CONTACTS ================= */}
          <section aria-labelledby="contacts-heading" className="elder-card p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-900 flex items-center justify-center">
                  <Phone className="w-7 h-7 text-rose-850" />
                </div>
                <div>
                  <h2 id="contacts-heading" className="text-2xl sm:text-3xl font-black text-teal-950">
                    Emergency Call Contacts
                  </h2>
                  <p className="text-sm font-bold text-warm-700">
                    Phoned automatically when you tap the red SOS button
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsAddContactOpen(true)}
                className="px-5 py-3 rounded-2xl bg-teal-850 hover:bg-teal-900 text-white font-black text-base flex items-center justify-center gap-2 shadow-md touch-target self-start sm:self-auto"
              >
                <Plus className="w-5 h-5" />
                <span>+ Add Emergency Contact</span>
              </button>
            </div>

            {emergencyContacts.length === 0 ? (
              <p className="text-center py-6 font-bold text-warm-700">
                No emergency contacts added yet.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {emergencyContacts.map((c) => (
                  <div
                    key={c.id}
                    className="p-4 rounded-2xl bg-white border-2 border-warm-200 shadow-sm flex items-center justify-between"
                  >
                    <div>
                      <p className="text-lg font-black text-teal-950">{c.name}</p>
                      <p className="text-xs font-bold text-warm-700">{c.relation}</p>
                      <a
                        href={`tel:${c.phone}`}
                        className="text-base font-black text-teal-850 underline mt-1 inline-block"
                      >
                        {c.phone}
                      </a>
                    </div>
                    <a
                      href={`tel:${c.phone}`}
                      aria-label={`Call ${c.name}`}
                      className="w-12 h-12 rounded-2xl bg-teal-100 hover:bg-teal-200 text-teal-900 flex items-center justify-center shadow-sm touch-target"
                    >
                      <Phone className="w-6 h-6" />
                    </a>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ================= SECTION 3: HOSPITAL & CARE TEAM ================= */}
          <section aria-labelledby="careteam-heading" className="elder-card p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-teal-100 text-teal-900 flex items-center justify-center">
                  <Stethoscope className="w-7 h-7 text-teal-850" />
                </div>
                <div>
                  <h2 id="careteam-heading" className="text-2xl sm:text-3xl font-black text-teal-950">
                    Primary Hospital &amp; Doctors
                  </h2>
                  <p className="text-sm font-bold text-warm-700">
                    Your assigned medical care team for prescriptions and check-ins
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsChangeCareTeamOpen(true)}
                className="px-5 py-3 rounded-2xl bg-white hover:bg-warm-100 text-teal-950 font-black text-base border-2 border-teal-700 flex items-center justify-center gap-2 shadow-sm touch-target self-start sm:self-auto"
              >
                <span>Change Hospital &amp; Doctors</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Primary Hospital */}
              <div className="p-5 rounded-2xl bg-warm-50 border-2 border-warm-200">
                <div className="flex items-center gap-2 text-teal-900 mb-2">
                  <Building2 className="w-5 h-5 text-teal-850" />
                  <p className="text-xs font-black uppercase tracking-wider">Primary Hospital</p>
                </div>
                <p className="text-xl font-black text-teal-950">
                  {currentHospital ? currentHospital.name : 'No hospital selected'}
                </p>
                {currentHospital && (
                  <p className="text-sm font-semibold text-warm-700 mt-1">
                    {currentHospital.city}, {currentHospital.state}
                  </p>
                )}
              </div>

              {/* Assigned Doctors */}
              <div className="p-5 rounded-2xl bg-warm-50 border-2 border-warm-200">
                <div className="flex items-center gap-2 text-teal-900 mb-2">
                  <Stethoscope className="w-5 h-5 text-teal-850" />
                  <p className="text-xs font-black uppercase tracking-wider">Assigned Doctors</p>
                </div>
                {careTeam.length === 0 ? (
                  <p className="text-base font-semibold text-warm-700">
                    No doctor currently assigned to your profile.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {careTeam.map((d: any) => (
                      <div key={d.id} className="text-base font-black text-teal-950">
                        {d.name} <span className="text-xs font-bold text-warm-600">({d.specialty})</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      )}

      {/* ================= MODAL: ADD RELATIVE ================= */}
      {isAddRelativeOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-relative-title"
          className="fixed inset-0 z-50 bg-teal-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in"
        >
          <div className="bg-white rounded-3xl border-4 border-teal-700 shadow-2xl max-w-lg w-full p-6 sm:p-8 relative my-auto">
            <button
              type="button"
              onClick={() => setIsAddRelativeOpen(false)}
              aria-label="Close dialog"
              className="absolute top-5 right-5 p-2 rounded-xl text-warm-700 hover:bg-warm-100 touch-target"
            >
              <X className="w-7 h-7" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-teal-100 flex items-center justify-center text-teal-900">
                <UserPlus className="w-7 h-7 text-teal-850" />
              </div>
              <div>
                <h3 id="add-relative-title" className="text-2xl sm:text-3xl font-black text-teal-950">
                  Grant Family Access
                </h3>
                <p className="text-sm font-bold text-warm-700">
                  Let a family member or caregiver view your daily health dashboard
                </p>
              </div>
            </div>

            <form onSubmit={handleAddRelative} className="space-y-4">
              <div>
                <label htmlFor="rel-name-input" className="block text-lg font-black text-teal-950 mb-1">
                  Relative's Name *
                </label>
                <input
                  id="rel-name-input"
                  type="text"
                  required
                  value={relName}
                  onChange={(e) => setRelName(e.target.value)}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full text-lg font-bold px-4 py-3 rounded-xl border-2 border-warm-300 focus:border-teal-700 outline-none"
                />
              </div>

              <div>
                <label htmlFor="rel-relation-input" className="block text-lg font-black text-teal-950 mb-1">
                  Relationship *
                </label>
                <input
                  id="rel-relation-input"
                  type="text"
                  required
                  value={relRelation}
                  onChange={(e) => setRelRelation(e.target.value)}
                  placeholder="e.g. Son, Daughter, Caregiver, Grandson"
                  className="w-full text-lg font-bold px-4 py-3 rounded-xl border-2 border-warm-300 focus:border-teal-700 outline-none"
                />
              </div>

              <div>
                <label htmlFor="rel-phone-input" className="block text-lg font-black text-teal-950 mb-1">
                  Mobile Number (Optional)
                </label>
                <input
                  id="rel-phone-input"
                  type="tel"
                  value={relPhone}
                  onChange={(e) => setRelPhone(e.target.value)}
                  placeholder="e.g. +91 98765 43210"
                  className="w-full text-lg font-bold px-4 py-3 rounded-xl border-2 border-warm-300 focus:border-teal-700 outline-none"
                />
              </div>

              <div>
                <label htmlFor="rel-email-input" className="block text-lg font-black text-teal-950 mb-1">
                  Email Address (Optional)
                </label>
                <input
                  id="rel-email-input"
                  type="email"
                  value={relEmail}
                  onChange={(e) => setRelEmail(e.target.value)}
                  placeholder="e.g. ramesh@example.com"
                  className="w-full text-lg font-bold px-4 py-3 rounded-xl border-2 border-warm-300 focus:border-teal-700 outline-none"
                />
                <p className="text-xs font-semibold text-warm-600 mt-1">
                  Provide at least mobile or email so they can sign in and link their account.
                </p>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddRelativeOpen(false)}
                  disabled={isSubmittingRelative}
                  className="flex-1 py-3.5 rounded-xl border-2 border-warm-400 font-bold text-warm-800 hover:bg-warm-100 text-lg touch-target"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingRelative}
                  className="flex-1 py-3.5 rounded-xl bg-teal-850 hover:bg-teal-900 text-white font-black text-lg flex items-center justify-center gap-2 shadow-lg touch-target disabled:opacity-60"
                >
                  {isSubmittingRelative ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Give Access'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: ADD EMERGENCY CONTACT ================= */}
      {isAddContactOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-contact-title"
          className="fixed inset-0 z-50 bg-teal-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in"
        >
          <div className="bg-white rounded-3xl border-4 border-teal-700 shadow-2xl max-w-lg w-full p-6 sm:p-8 relative my-auto">
            <button
              type="button"
              onClick={() => setIsAddContactOpen(false)}
              aria-label="Close dialog"
              className="absolute top-5 right-5 p-2 rounded-xl text-warm-700 hover:bg-warm-100 touch-target"
            >
              <X className="w-7 h-7" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 flex items-center justify-center text-rose-900">
                <Phone className="w-7 h-7 text-rose-850" />
              </div>
              <div>
                <h3 id="add-contact-title" className="text-2xl sm:text-3xl font-black text-teal-950">
                  Add Emergency Contact
                </h3>
                <p className="text-sm font-bold text-warm-700">
                  Contacted first when emergency alert is activated
                </p>
              </div>
            </div>

            <form onSubmit={handleAddContact} className="space-y-4">
              <div>
                <label htmlFor="contact-name-input" className="block text-lg font-black text-teal-950 mb-1">
                  Full Name *
                </label>
                <input
                  id="contact-name-input"
                  type="text"
                  required
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="e.g. Priya Sundaram"
                  className="w-full text-lg font-bold px-4 py-3 rounded-xl border-2 border-warm-300 focus:border-teal-700 outline-none"
                />
              </div>

              <div>
                <label htmlFor="contact-phone-input" className="block text-lg font-black text-teal-950 mb-1">
                  Phone Number *
                </label>
                <input
                  id="contact-phone-input"
                  type="tel"
                  required
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="e.g. +91 98765 43210"
                  className="w-full text-lg font-bold px-4 py-3 rounded-xl border-2 border-warm-300 focus:border-teal-700 outline-none"
                />
              </div>

              <div>
                <label htmlFor="contact-relation-input" className="block text-lg font-black text-teal-950 mb-1">
                  Relationship *
                </label>
                <input
                  id="contact-relation-input"
                  type="text"
                  required
                  value={contactRelation}
                  onChange={(e) => setContactRelation(e.target.value)}
                  placeholder="e.g. Daughter, Neighbor, Doctor"
                  className="w-full text-lg font-bold px-4 py-3 rounded-xl border-2 border-warm-300 focus:border-teal-700 outline-none"
                />
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={contactAppAccess}
                    onChange={(e) => setContactAppAccess(e.target.checked)}
                    className="w-6 h-6 rounded-lg text-teal-850 accent-teal-850"
                  />
                  <span className="text-base font-bold text-teal-950">
                    Also give them access to my health dashboard
                  </span>
                </label>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddContactOpen(false)}
                  disabled={isSubmittingContact}
                  className="flex-1 py-3.5 rounded-xl border-2 border-warm-400 font-bold text-warm-800 hover:bg-warm-100 text-lg touch-target"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingContact}
                  className="flex-1 py-3.5 rounded-xl bg-teal-850 hover:bg-teal-900 text-white font-black text-lg flex items-center justify-center gap-2 shadow-lg touch-target disabled:opacity-60"
                >
                  {isSubmittingContact ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save Contact'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: CHANGE CARE TEAM ================= */}
      {isChangeCareTeamOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="careteam-modal-title"
          className="fixed inset-0 z-50 bg-teal-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in"
        >
          <div className="bg-white rounded-3xl border-4 border-teal-700 shadow-2xl max-w-lg w-full p-6 sm:p-8 relative my-auto">
            <button
              type="button"
              onClick={() => setIsChangeCareTeamOpen(false)}
              aria-label="Close dialog"
              className="absolute top-5 right-5 p-2 rounded-xl text-warm-700 hover:bg-warm-100 touch-target"
            >
              <X className="w-7 h-7" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-teal-100 flex items-center justify-center text-teal-900">
                <Building2 className="w-7 h-7 text-teal-850" />
              </div>
              <div>
                <h3 id="careteam-modal-title" className="text-2xl sm:text-3xl font-black text-teal-950">
                  Change Hospital &amp; Doctors
                </h3>
                <p className="text-sm font-bold text-warm-700">
                  Select your primary medical centre and attending physicians
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveCareTeam} className="space-y-4">
              <div>
                <label htmlFor="hospital-select" className="block text-lg font-black text-teal-950 mb-1">
                  Choose Hospital
                </label>
                <select
                  id="hospital-select"
                  value={selectedHospitalId || ''}
                  onChange={(e) => setSelectedHospitalId(Number(e.target.value) || null)}
                  className="w-full text-base font-bold px-4 py-3 rounded-xl border-2 border-warm-300 focus:border-teal-700 outline-none bg-white"
                >
                  <option value="">-- Select a Hospital --</option>
                  {hospitals.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name} ({h.city}, {h.state})
                    </option>
                  ))}
                </select>
              </div>

              {selectedHospitalId && (
                <div>
                  <label className="block text-lg font-black text-teal-950 mb-1">
                    Select Doctors at this Hospital
                  </label>
                  {availableDoctors.length === 0 ? (
                    <p className="text-sm font-semibold text-warm-600 p-3 bg-warm-50 rounded-xl">
                      No doctors listed for this hospital yet.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto p-1">
                      {availableDoctors.map((doc) => {
                        const isChecked = selectedDoctorIds.includes(doc.id);
                        return (
                          <label
                            key={doc.id}
                            className={`p-3 rounded-xl border-2 flex items-center justify-between cursor-pointer transition-colors ${
                              isChecked
                                ? 'border-teal-700 bg-teal-50'
                                : 'border-warm-200 bg-white hover:bg-warm-50'
                            }`}
                          >
                            <div>
                              <p className="font-black text-teal-950 text-sm">{doc.name}</p>
                              <p className="text-xs font-bold text-warm-700">{doc.specialty}</p>
                            </div>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleDoctorSelection(doc.id)}
                              className="w-5 h-5 rounded text-teal-850 accent-teal-850"
                            />
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsChangeCareTeamOpen(false)}
                  disabled={isSubmittingCareTeam}
                  className="flex-1 py-3.5 rounded-xl border-2 border-warm-400 font-bold text-warm-800 hover:bg-warm-100 text-lg touch-target"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCareTeam}
                  className="flex-1 py-3.5 rounded-xl bg-teal-850 hover:bg-teal-900 text-white font-black text-lg flex items-center justify-center gap-2 shadow-lg touch-target disabled:opacity-60"
                >
                  {isSubmittingCareTeam ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save Care Team'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
