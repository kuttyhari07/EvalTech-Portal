import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';
import {
  Shield,
  Building2,
  Users,
  CreditCard,
  ClipboardList,
  TrendingUp,
  Activity,
  Server,
} from 'lucide-react';

export const AdminOverview: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/overview')
      .then((res) => setData(res.data?.data?.metrics))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSkeleton count={6} className="h-32" />;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="pb-2 border-b border-pearl-200">
        <div className="flex items-center gap-2">
          <Badge variant="danger" className="text-[10px]">
            Super Admin Platform View
          </Badge>
          <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Global System Normal
          </span>
        </div>
        <h2 className="text-2xl font-extrabold text-midnight-950 tracking-tight mt-1">
          Central Multi-Tenant Platform Operations
        </h2>
        <p className="text-xs text-midnight-600">
          Global metrics across all educational institutions, staff accounts, exams, and revenues.
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Card>
          <CardContent className="pt-6 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-midnight-600 uppercase tracking-wider">
                Total Revenue
              </p>
              <h3 className="text-2xl font-extrabold text-emerald-600 mt-1">
                ₹{data?.totalRevenue?.toLocaleString() || 0}
              </h3>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CreditCard className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-midnight-600 uppercase tracking-wider">
                Organizations
              </p>
              <h3 className="text-2xl font-extrabold text-midnight-950 mt-1">
                {data?.totalOrgs || 0}
              </h3>
            </div>
            <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-midnight-600 uppercase tracking-wider">
                Staff / Teachers
              </p>
              <h3 className="text-2xl font-extrabold text-midnight-950 mt-1">
                {data?.totalStaff || 0}
              </h3>
            </div>
            <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-brand flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-midnight-600 uppercase tracking-wider">
                Active Students
              </p>
              <h3 className="text-2xl font-extrabold text-midnight-950 mt-1">
                {data?.totalStudents || 0}
              </h3>
            </div>
            <div className="w-11 h-11 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-midnight-600 uppercase tracking-wider">
                Exams Conducted
              </p>
              <h3 className="text-2xl font-extrabold text-midnight-950 mt-1">
                {data?.totalExams || 0}
              </h3>
            </div>
            <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <ClipboardList className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-midnight-600 uppercase tracking-wider">
                Exam Attempts
              </p>
              <h3 className="text-2xl font-extrabold text-midnight-950 mt-1">
                {data?.totalAttempts || 0}
              </h3>
            </div>
            <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <Activity className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-midnight-600 uppercase tracking-wider">
                Active Subscriptions
              </p>
              <h3 className="text-2xl font-extrabold text-indigo-brand mt-1">
                {data?.activeSubscriptions || 0}
              </h3>
            </div>
            <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-brand flex items-center justify-center">
              <CreditCard className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-midnight-600 uppercase tracking-wider">
                Total Users
              </p>
              <h3 className="text-2xl font-extrabold text-midnight-950 mt-1">
                {data?.totalUsers || 0}
              </h3>
            </div>
            <div className="w-11 h-11 rounded-xl bg-pearl-200 text-midnight-800 flex items-center justify-center">
              <Server className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
