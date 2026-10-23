import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { AuditLogItem } from '../../types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';
import { Shield, Clock, Terminal } from 'lucide-react';

export const AdminAuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/audit-logs')
      .then((res) => setLogs(res.data?.data || []))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="pb-2 border-b border-pearl-200">
        <h2 className="text-2xl font-extrabold text-midnight-950 tracking-tight">Security & Audit Logs</h2>
        <p className="text-xs text-midnight-600 mt-1">
          Immutable event trail for privileged administrative actions, logins, payments, and role elevations.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <LoadingSkeleton count={6} className="h-10" />
          ) : logs.length === 0 ? (
            <p className="text-xs text-midnight-600 py-6 text-center">No audit logs recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-pearl-200 text-midnight-600 uppercase font-semibold text-[11px]">
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Entity</th>
                    <th className="py-3 px-4">Actor</th>
                    <th className="py-3 px-4">IP Address</th>
                    <th className="py-3 px-4">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-pearl-100">
                  {logs.map((log) => (
                    <tr key={log._id} className="hover:bg-pearl-50/70">
                      <td className="py-3 px-4 font-bold text-indigo-brand">{log.action}</td>
                      <td className="py-3 px-4 text-midnight-900">{log.entity}</td>
                      <td className="py-3 px-4 text-midnight-700">{log.actorEmail || 'System'}</td>
                      <td className="py-3 px-4 text-midnight-600">{log.ipAddress || '127.0.0.1'}</td>
                      <td className="py-3 px-4 text-midnight-600">
                        {new Date(log.createdAt).toLocaleString()}
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
