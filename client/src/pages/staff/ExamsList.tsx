import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { ExamItem } from '../../types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import {
  ClipboardList,
  Plus,
  Copy,
  Check,
  Clock,
  ExternalLink,
  BarChart3,
  BookOpen,
  Calendar,
  Edit3,
  Trash2,
  Radio,
} from 'lucide-react';
import { LiveExamMonitorModal } from '../../components/proctor/LiveExamMonitorModal';

export const StaffExamsList: React.FC = () => {
  const [exams, setExams] = useState<ExamItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'published' | 'draft'>('all');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [activeMonitoringExam, setActiveMonitoringExam] = useState<{ id: string; title: string } | null>(null);

  const fetchExams = async () => {
    try {
      const res = await api.get('/exams');
      setExams(res.data?.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExams();
  }, []);

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleTogglePublish = async (exam: ExamItem) => {
    try {
      if (exam.status === 'published') {
        await api.post(`/exams/${exam._id}/unpublish`);
      } else {
        await api.post(`/exams/${exam._id}/publish`, { notifyStudents: true });
      }
      fetchExams();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteExam = async (id: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"? This action cannot be undone.`)) {
      return;
    }
    try {
      await api.delete(`/exams/${id}`);
      fetchExams();
    } catch (err: any) {
      alert(err.message || 'Failed to delete exam.');
    }
  };

  const filtered = exams.filter((e) => {
    if (activeTab === 'published') return e.status === 'published';
    if (activeTab === 'draft') return e.status === 'draft';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-pearl-200">
        <div>
          <h2 className="text-2xl font-extrabold text-midnight-950 tracking-tight">Examinations Management</h2>
          <p className="text-xs text-midnight-600 mt-1">
            Publish tests, monitor active examination windows, and copy unique access links.
          </p>
        </div>
        <Link to="/staff/exams/create">
          <Button variant="electric" size="sm" leftIcon={<Plus className="w-4 h-4" />}>
            Create Examination
          </Button>
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-pearl-200 pb-2">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'all' ? 'bg-midnight-900 text-white' : 'text-midnight-600 hover:text-midnight-900'
          }`}
        >
          All Exams ({exams.length})
        </button>
        <button
          onClick={() => setActiveTab('published')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'published' ? 'bg-midnight-900 text-white' : 'text-midnight-600 hover:text-midnight-900'
          }`}
        >
          Published ({exams.filter((e) => e.status === 'published').length})
        </button>
        <button
          onClick={() => setActiveTab('draft')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'draft' ? 'bg-midnight-900 text-white' : 'text-midnight-600 hover:text-midnight-900'
          }`}
        >
          Drafts ({exams.filter((e) => e.status === 'draft').length})
        </button>
      </div>

      {/* Cards List */}
      {loading ? (
        <LoadingSkeleton count={3} className="h-44" />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No Examinations Found"
          description="Build your first assessment with configured time limits and questions."
          actionText="Create Exam"
          onAction={() => (window.location.href = '/staff/exams/create')}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filtered.map((exam) => {
            const isPublished = exam.status === 'published';
            return (
              <Card key={exam._id} className="flex flex-col justify-between hover:border-indigo-brand/40 transition-colors">
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant={isPublished ? 'success' : 'default'} className="text-[10px]">
                        {exam.status}
                      </Badge>
                      <span className="text-[11px] text-midnight-600 flex items-center gap-1 font-mono">
                        <Clock className="w-3.5 h-3.5" /> {exam.durationMinutes} mins
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Link to={`/staff/exams/${exam._id}/edit`}>
                        <button
                          type="button"
                          title="Edit Exam"
                          className="p-1 rounded text-pearl-400 hover:text-indigo-brand hover:bg-pearl-100 transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </Link>
                      <button
                        type="button"
                        title="Delete Exam"
                        onClick={() => handleDeleteExam(exam._id, exam.title)}
                        className="p-1 rounded text-pearl-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <CardTitle className="text-base">{exam.title}</CardTitle>
                  <CardDescription>
                    {exam.subject} • {exam.questions?.length || 0} Questions • {exam.totalMarks} Total Marks
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Access Code Box */}
                  <div className="p-3 rounded-xl bg-pearl-50 border border-pearl-200/80 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-midnight-600 block">
                        Unique Access Code
                      </span>
                      <span className="font-mono text-sm font-extrabold text-indigo-brand">
                        {exam.examCode}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopy(exam.examCode)}
                      leftIcon={
                        copiedCode === exam.examCode ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )
                      }
                    >
                      {copiedCode === exam.examCode ? 'Copied' : 'Copy Code'}
                    </Button>
                  </div>

                  {/* Scheduled Window */}
                  <div className="flex items-center justify-between text-[11px] text-midnight-600">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" /> Start: {new Date(exam.startsAt).toLocaleDateString()}
                    </span>
                    <span>Deadline: {new Date(exam.endsAt).toLocaleDateString()}</span>
                  </div>
                </CardContent>

                <div className="p-6 pt-0 border-t border-pearl-100 flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-3">
                    <Button
                      variant={isPublished ? 'outline' : 'primary'}
                      size="sm"
                      className="w-1/2"
                      onClick={() => handleTogglePublish(exam)}
                    >
                      {isPublished ? 'Unpublish Exam' : 'Publish Live'}
                    </Button>
                    <Link to={`/staff/results?examId=${exam._id}`} className="w-1/2">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="w-full"
                        leftIcon={<BarChart3 className="w-3.5 h-3.5" />}
                      >
                        View Results
                      </Button>
                    </Link>
                  </div>

                  {isPublished && (
                    <Button
                      variant="electric"
                      size="sm"
                      className="w-full"
                      leftIcon={<Radio className="w-3.5 h-3.5 text-rose-400 animate-pulse" />}
                      onClick={() => setActiveMonitoringExam({ id: exam._id, title: exam.title })}
                    >
                      Live Proctoring & Telemetry
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Live Exam Proctoring Modal */}
      {activeMonitoringExam && (
        <LiveExamMonitorModal
          examId={activeMonitoringExam.id}
          examTitle={activeMonitoringExam.title}
          onClose={() => setActiveMonitoringExam(null)}
        />
      )}
    </div>
  );
};
