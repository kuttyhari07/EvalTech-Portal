import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { User, UserRole } from '../../types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';
import { Search, ShieldAlert, CheckCircle2, UserX, UserCheck } from 'lucide-react';

export const AdminUsers: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState('');

  const fetchUsers = async () => {
    try {
      const res = await api.get(`/admin/users?search=${search}&role=${selectedRole}`);
      setUsers(res.data?.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [search, selectedRole]);

  const toggleStatus = async (user: User) => {
    const nextStatus = user.status === 'active' ? 'suspended' : 'active';
    if (confirm(`Change status of ${user.email} to ${nextStatus}?`)) {
      await api.put(`/admin/users/${user._id}/status`, { status: nextStatus });
      fetchUsers();
    }
  };

  return (
    <div className="space-y-6">
      <div className="pb-2 border-b border-pearl-200">
        <h2 className="text-2xl font-extrabold text-midnight-950 tracking-tight">Platform Users Directory</h2>
        <p className="text-xs text-midnight-600 mt-1">
          Super Admin user governance, roles, authentication states, and account suspensions.
        </p>
      </div>

      {/* Filter Row */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="w-full sm:w-80">
          <Input
            placeholder="Search by name, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>
        <div className="w-full sm:w-56">
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="w-full rounded-lg border border-pearl-300 bg-white px-3 py-2.5 text-xs text-midnight-900 focus:border-indigo-brand focus:outline-none"
          >
            <option value="">All Roles</option>
            <option value="super_admin">Super Admin</option>
            <option value="org_admin">Organization Admin</option>
            <option value="staff">Staff / Teacher</option>
            <option value="student">Student</option>
          </select>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <LoadingSkeleton count={5} className="h-12" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-pearl-200 text-midnight-600 uppercase font-semibold text-[11px]">
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Email Verified</th>
                    <th className="py-3 px-4">Account Status</th>
                    <th className="py-3 px-4">Registered</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-pearl-100 font-medium">
                  {users.map((u) => (
                    <tr key={u._id} className="hover:bg-pearl-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <p className="font-bold text-midnight-900">{u.name}</p>
                        <p className="text-[11px] text-midnight-600">{u.email}</p>
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant={
                            u.role === 'super_admin' ? 'danger' : u.role === 'org_admin' ? 'purple' : 'info'
                          }
                          className="capitalize text-[10px]"
                        >
                          {u.role.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        {u.emailVerified ? (
                          <span className="text-emerald-600 font-bold flex items-center gap-1 text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                          </span>
                        ) : (
                          <span className="text-midnight-600 italic text-[11px]">Unverified</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={u.status === 'active' ? 'success' : 'danger'}>
                          {u.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-midnight-600">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {u.role !== 'super_admin' && (
                          <Button
                            variant={u.status === 'active' ? 'outline' : 'primary'}
                            size="sm"
                            onClick={() => toggleStatus(u)}
                          >
                            {u.status === 'active' ? 'Suspend' : 'Activate'}
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
