import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';
import { Building2, CheckCircle2, XCircle } from 'lucide-react';

export const AdminTenants: React.FC = () => {
  const [orgs, setOrgs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/organizations')
      .then((res) => setOrgs(res.data?.data || []))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="pb-2 border-b border-pearl-200">
        <h2 className="text-2xl font-extrabold text-midnight-950 tracking-tight">
          Educational Organizations Directory
        </h2>
        <p className="text-xs text-midnight-600 mt-1">
          Monitor all institutional tenants, active subscription tiers, and capacity limits.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registered Organizations ({orgs.length})</CardTitle>
          <CardDescription>Schools, colleges, academies, and enterprise learning centers</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <LoadingSkeleton count={4} className="h-14" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-pearl-200 text-midnight-600 uppercase font-semibold text-[11px]">
                    <th className="py-3 px-4">Organization</th>
                    <th className="py-3 px-4">Primary Contact</th>
                    <th className="py-3 px-4">Subscription Plan</th>
                    <th className="py-3 px-4">Capacity</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Registered</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-pearl-100 font-medium">
                  {orgs.map((o) => (
                    <tr key={o._id} className="hover:bg-pearl-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <p className="font-bold text-midnight-900">{o.name}</p>
                        <span className="font-mono text-[10px] text-midnight-600">{o.slug}</span>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-midnight-900">{o.contactEmail}</p>
                        <p className="text-[11px] text-midnight-600">{o.contactPhone || '—'}</p>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="purple" className="capitalize text-[10px]">
                          {o.subscription?.tier || 'Free'} Tier
                        </Badge>
                      </td>
                      <td className="py-3 px-4 font-bold text-indigo-brand">
                        {o.subscription?.studentCapacity || 10} Students Max
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={o.status === 'active' ? 'success' : 'danger'}>
                          {o.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-midnight-600">
                        {new Date(o.createdAt).toLocaleDateString()}
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
