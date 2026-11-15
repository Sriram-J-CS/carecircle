import React, { useState, useEffect } from 'react';
import { Users, Phone, Mail, Shield, Plus, Trash2, ArrowLeft, HeartHandshake } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { AccessGrant, ContactIn } from '../../types/api';
import { api } from '../../services/api';

export const PeoplePage: React.FC = () => {
  const [accessGrants, setAccessGrants] = useState<AccessGrant[]>([]);
  const [isAddingGrant, setIsAddingGrant] = useState(false);
  const [grantName, setGrantName] = useState('');
  const [grantPhone, setGrantPhone] = useState('');
  const [grantEmail, setGrantEmail] = useState('');
  const [grantRelation, setGrantRelation] = useState('family');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    try {
      const grants = await api.getAccessGrants();
      setAccessGrants(grants);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddGrant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!grantName) return;
    setIsSubmitting(true);
    try {
      await api.addAccessGrant({
        name: grantName,
        phone: grantPhone || undefined,
        email: grantEmail || undefined,
        relation: grantRelation,
        role: 'relative',
      });
      setIsAddingGrant(false);
      setGrantName('');
      setGrantPhone('');
      setGrantEmail('');
      loadData();
    } catch {
      // ignore
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevokeGrant = async (id: number) => {
    try {
      await api.deleteAccessGrant(id);
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
            <h1 className="text-3xl font-serif font-bold">My Care Circle</h1>
            <p className="text-sm text-ink/70 dark:text-sand/70">
              Family members and caregivers who have access to your health dashboard.
            </p>
          </div>
          <Button variant="primary" onClick={() => setIsAddingGrant(!isAddingGrant)}>
            <Plus className="w-4 h-4 mr-1" />
            <span>Add Family Member</span>
          </Button>
        </div>

        {isAddingGrant && (
          <form
            onSubmit={handleAddGrant}
            className="p-6 bg-paper dark:bg-teal-950 border border-sand dark:border-teal-800 rounded-3xl shadow-soft space-y-4"
          >
            <h3 className="font-serif font-bold text-lg">Grant Dashboard Access</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                required
                placeholder="Full Name"
                value={grantName}
                onChange={(e) => setGrantName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-sand/30 border border-sand text-sm font-medium"
              />
              <input
                type="text"
                placeholder="Relationship (e.g. Son, Daughter)"
                value={grantRelation}
                onChange={(e) => setGrantRelation(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-sand/30 border border-sand text-sm font-medium"
              />
              <input
                type="tel"
                placeholder="Phone Number"
                value={grantPhone}
                onChange={(e) => setGrantPhone(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-sand/30 border border-sand text-sm font-medium"
              />
              <input
                type="email"
                placeholder="Email Address"
                value={grantEmail}
                onChange={(e) => setGrantEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-sand/30 border border-sand text-sm font-medium"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="ghost" onClick={() => setIsAddingGrant(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" isLoading={isSubmitting}>
                Save Access Grant
              </Button>
            </div>
          </form>
        )}

        <div className="space-y-4">
          {accessGrants.length === 0 ? (
            <Card className="p-8 text-center text-ink/60">
              No family members granted access yet.
            </Card>
          ) : (
            accessGrants.map((grant) => (
              <Card key={grant.id} className="p-5 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-teal dark:text-mint bg-mint/50 dark:bg-teal-900 px-2.5 py-0.5 rounded-full">
                      {grant.relation}
                    </span>
                    <h4 className="font-serif font-bold text-xl">{grant.grantee_name}</h4>
                  </div>
                  <p className="text-xs text-ink/70 dark:text-sand/70 flex items-center gap-4">
                    {grant.grantee_phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-teal" /> {grant.grantee_phone}
                      </span>
                    )}
                    {grant.grantee_email && (
                      <span className="flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5 text-teal" /> {grant.grantee_email}
                      </span>
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {grant.grantee_phone && (
                    <a
                      href={`tel:${grant.grantee_phone}`}
                      className="p-2.5 rounded-xl bg-teal text-white hover:bg-teal-700 transition-colors"
                      title="Direct phone call"
                    >
                      <Phone className="w-4 h-4" />
                    </a>
                  )}
                  <button
                    onClick={() => handleRevokeGrant(grant.id)}
                    className="p-2.5 text-clay hover:bg-clay/10 rounded-xl transition-colors"
                    title="Revoke access"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
