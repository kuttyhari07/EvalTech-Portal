import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';
import {
  Building2,
  Users,
  BookOpen,
  UserCheck,
  ClipboardList,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

export const OrgOverview: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/organizations/analytics')
      .then((res) => setData(res.data?.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSkeleton count={4} className="h-28" />;

  const capacity = data?.capacity;
  const capacityPercent = capacity
    ? Math.min(100, Math.round((capacity.currentUsage / (capacity.maxCapacity || 1)) * 100))
    : 0;

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-pearl-200">
        <div>
          <h2 className="text-2xl font-extrabold text-midnight-950 tracking-tight">
            Institutional Administration Hub
          </h2>
          <p className="text-xs text-midnight-600 mt-1">
            Oversee staff instructors, classes, and shared institution student capacity.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Link to="/org/staff">
            <Button variant="electric" size="sm" leftIcon={<UserCheck className="w-4 h-4" />}>
              Invite Staff Member
            </Button>
          </Link>
          <Link to="/org/billing">
            <Button variant="outline" size="sm">
              Manage Quota
            </Button>
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Card>
          <CardContent className="pt-6 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-midnight-600 uppercase tracking-wider">
                Staff Members
              </p>
              <h3 className="text-2xl font-extrabold text-midnight-950 mt-1">
                {data?.staffCount || 0}
              </h3>
            </div>
            <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-brand flex items-center justify-center">
              <UserCheck className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-midnight-600 uppercase tracking-wider">
                Total Classes
              </p>
              <h3 className="text-2xl font-extrabold text-midnight-950 mt-1">
                {data?.classCount || 0}
              </h3>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-midnight-600 uppercase tracking-wider">
                Distinct Students
              </p>
              <h3 className="text-2xl font-extrabold text-midnight-950 mt-1">
                {data?.studentCount || 0}
              </h3>
            </div>
            <div className="w-11 h-11 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-midnight-600 uppercase tracking-wider">
                Examinations
              </p>
              <h3 className="text-2xl font-extrabold text-midnight-950 mt-1">
                {data?.examCount || 0}
              </h3>
            </div>
            <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <ClipboardList className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Organization-wide Student Capacity Banner */}
      {capacity && (
        <Card className="bg-gradient-to-r from-midnight-950 to-indigo-dark text-white border-none shadow-glow">
          <CardContent className="pt-6 pb-6 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-mono uppercase text-indigo-glow font-bold">
                  Organization-Wide Shared Quota
                </span>
                <h3 className="text-xl font-bold text-white mt-1">
                  {capacity.currentUsage} of {capacity.maxCapacity} Active Students ({capacityPercent}%)
                </h3>
                <p className="text-xs text-pearl-300 max-w-xl mt-1">
                  All staff teachers in your institution draw from this shared student capacity pool. Students enrolled across multiple teachers only consume 1 slot.
                </p>
              </div>
              <Link to="/org/billing">
                <Button variant="electric" size="sm">
                  Upgrade Institution Plan
                </Button>
              </Link>
            </div>

            <div className="w-full bg-midnight-800 rounded-full h-3 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  capacityPercent >= 90 ? 'bg-rose-500' : 'bg-indigo-light'
                }`}
                style={{ width: `${capacityPercent}%` }}
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
