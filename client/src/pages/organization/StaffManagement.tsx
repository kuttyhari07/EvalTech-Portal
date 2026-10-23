import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';
import { UserCheck, Plus, Mail, Trash2, Shield, AlertCircle, CheckCircle2 } from 'lucide-react';

export const OrgStaffManagement: React.FC = () => {
  const [memberships, setMemberships] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [roleInOrg, setRoleInOrg] = useState<'staff' | 'org_admin'>('staff');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchStaff = async () => {
    try {
      const res = await api.get('/organizations/staff');
      setMemberships(res.data?.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await api.post('/organizations/invite-staff', {
        email: inviteEmail,
        roleInOrg,
      });

      setSuccess(`Invitation email sent to ${inviteEmail}`);
      setIsInviteModalOpen(false);
      setInviteEmail('');
      fetchStaff();
      setTimeout(() => setSuccess(null), 4000);
    } catch (err: any) {
      setError(err.message || 'Failed to send invitation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemove = async (membershipId: string) => {
    if (confirm('Remove this staff member from your organization?')) {
      await api.delete(`/organizations/staff/${membershipId}`);
      fetchStaff();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-pearl-200">
        <div>
          <h2 className="text-2xl font-extrabold text-midnight-950 tracking-tight">Staff & Faculty Management</h2>
          <p className="text-xs text-midnight-600 mt-1">
            Invite teachers, assign permissions, and oversee assigned departmental classes.
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => setIsInviteModalOpen(true)}
        >
          Invite Staff Member
        </Button>
      </div>

      {success && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{success}</span>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Organization Staff Roster ({memberships.length} Members)</CardTitle>
          <CardDescription>Teachers authorized to author exams and manage classes</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <LoadingSkeleton count={4} className="h-14" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-pearl-200 text-midnight-600 uppercase font-semibold text-[11px]">
                    <th className="py-3 px-4">Staff Member</th>
                    <th className="py-3 px-4">Institutional Role</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Joined / Invited</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-pearl-100 font-medium">
                  {memberships.map((m) => (
                    <tr key={m._id} className="hover:bg-pearl-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <p className="font-bold text-midnight-900">{m.userId?.name || 'Pending Acceptance'}</p>
                        <p className="text-[11px] text-midnight-600">{m.userId?.email}</p>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={m.roleInOrg === 'org_admin' ? 'purple' : 'default'}>
                          {m.roleInOrg === 'org_admin' ? 'Organization Admin' : 'Staff Instructor'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={m.status === 'active' ? 'success' : 'warning'}>
                          {m.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-midnight-600">
                        {new Date(m.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleRemove(m._id)}
                          className="text-pearl-300 hover:text-rose-500 p-1 transition-colors"
                          title="Remove Member"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invite Modal */}
      <Modal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        title="Invite New Staff Instructor"
        description="We'll send an automated email invitation with an activation link."
      >
        <form onSubmit={handleInvite} className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-center gap-2 text-xs font-medium text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Input
            label="Staff Email Address"
            type="email"
            required
            placeholder="instructor@school.edu"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            leftIcon={<Mail className="w-4 h-4" />}
          />

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-midnight-700">
              Role in Organization
            </label>
            <select
              value={roleInOrg}
              onChange={(e) => setRoleInOrg(e.target.value as any)}
              className="w-full rounded-lg border border-pearl-300 bg-white px-3 py-2.5 text-xs text-midnight-900 focus:border-indigo-brand focus:outline-none"
            >
              <option value="staff">Staff / Teacher (Own classes & exams)</option>
              <option value="org_admin">Organization Co-Admin (Full access to all classes)</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <Button type="button" variant="outline" onClick={() => setIsInviteModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              Send Invitation
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
