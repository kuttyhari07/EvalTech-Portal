import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';
import {
  BookOpen,
  Users,
  ClipboardList,
  Sparkles,
  Plus,
  ArrowRight,
  TrendingUp,
  FileQuestion,
  Clock,
  CheckCircle2,
} from 'lucide-react';

export const StaffOverview: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    classCount: 0,
    studentCount: 0,
    examCount: 0,
    publishedExamCount: 0,
    recentExams: [] as any[],
    capacity: null as any,
  });

  useEffect(() => {
    Promise.all([
      api.get('/classes'),
      api.get('/students?limit=1'),
      api.get('/exams'),
      api.get('/subscriptions/my-subscription'),
    ])
      .then(([classesRes, studentsRes, examsRes, subRes]) => {
        const classes = classesRes.data?.data || [];
        const exams = examsRes.data?.data || [];
        const published = exams.filter((e: any) => e.status === 'published');

        setStats({
          classCount: classes.length,
          studentCount: studentsRes.data?.meta?.total || 0,
          examCount: exams.length,
          publishedExamCount: published.length,
          recentExams: exams.slice(0, 5),
          capacity: subRes.data?.data?.capacity || null,
        });
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <LoadingSkeleton count={6} className="h-28" />;
  }

  const capacityPercent = stats.capacity
    ? Math.min(100, Math.round((stats.capacity.currentUsage / (stats.capacity.maxCapacity || 1)) * 100))
    : 0;

  return (
    <div className="space-y-8">
      {/* Top Banner & Quick Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-pearl-200">
        <div>
          <h2 className="text-2xl font-extrabold text-midnight-950 tracking-tight">
            Teacher Workspace Dashboard
          </h2>
          <p className="text-xs text-midnight-600 mt-1">
            Conduct exams, grade student submissions, and manage class rosters.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Link to="/staff/exams/create">
            <Button variant="electric" size="sm" leftIcon={<Plus className="w-4 h-4" />}>
              Create Examination
            </Button>
          </Link>
          <Link to="/staff/questions">
            <Button variant="outline" size="sm" leftIcon={<Sparkles className="w-4 h-4 text-indigo-brand" />}>
              AI Question Bank
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
                Managed Classes
              </p>
              <h3 className="text-2xl font-extrabold text-midnight-950 mt-1">
                {stats.classCount}
              </h3>
            </div>
            <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-brand flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
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
                {stats.studentCount}
              </h3>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-midnight-600 uppercase tracking-wider">
                Total Exams
              </p>
              <h3 className="text-2xl font-extrabold text-midnight-950 mt-1">
                {stats.examCount}
              </h3>
            </div>
            <div className="w-11 h-11 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <ClipboardList className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-midnight-600 uppercase tracking-wider">
                Active / Published
              </p>
              <h3 className="text-2xl font-extrabold text-midnight-950 mt-1">
                {stats.publishedExamCount}
              </h3>
            </div>
            <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Student Capacity Usage Alert Card */}
      {stats.capacity && (
        <Card className="bg-gradient-to-r from-midnight-900 to-indigo-dark text-white border-none shadow-glow">
          <CardContent className="pt-6 pb-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="purple" className="bg-white/10 text-indigo-glow border-none">
                    {stats.capacity.tier} Tier Plan
                  </Badge>
                  <span className="text-xs text-pearl-300">
                    Distinct Student Capacity Engine
                  </span>
                </div>
                <h4 className="text-lg font-bold text-white">
                  Using {stats.capacity.currentUsage} of {stats.capacity.maxCapacity} student slots ({capacityPercent}%)
                </h4>
                <p className="text-xs text-pearl-300 max-w-xl">
                  Students enrolled across multiple of your subjects count as 1 slot. Upgrade anytime for higher student capacity.
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <Link to="/staff/billing">
                  <Button variant="electric" size="sm">
                    Manage / Upgrade Quota
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Examinations Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Examinations</CardTitle>
            <CardDescription>Live status, access codes, and student submission tracking</CardDescription>
          </div>
          <Link to="/staff/exams">
            <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="w-4 h-4" />}>
              View All
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {stats.recentExams.length === 0 ? (
            <div className="text-center py-10 text-xs text-midnight-600">
              No examinations created yet. Click "Create Examination" to publish your first assessment.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-pearl-200 text-midnight-600 uppercase font-semibold text-[11px]">
                    <th className="py-3 px-4">Exam Title</th>
                    <th className="py-3 px-4">Subject</th>
                    <th className="py-3 px-4">Access Code</th>
                    <th className="py-3 px-4">Duration</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-pearl-100 font-medium">
                  {stats.recentExams.map((exam) => (
                    <tr key={exam._id} className="hover:bg-pearl-50/70 transition-colors">
                      <td className="py-3 px-4 font-bold text-midnight-900">{exam.title}</td>
                      <td className="py-3 px-4 text-midnight-700">{exam.subject}</td>
                      <td className="py-3 px-4">
                        <span className="font-mono bg-pearl-100 text-indigo-brand px-2 py-0.5 rounded font-bold">
                          {exam.examCode}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-midnight-600">{exam.durationMinutes} mins</td>
                      <td className="py-3 px-4">
                        <Badge variant={exam.status === 'published' ? 'success' : 'default'}>
                          {exam.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link to={`/staff/results?examId=${exam._id}`}>
                          <Button variant="outline" size="sm">
                            Results
                          </Button>
                        </Link>
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
