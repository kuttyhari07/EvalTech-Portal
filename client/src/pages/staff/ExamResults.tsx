import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../../api/client';
import { ExamResultItem, ExamItem } from '../../types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import {
  BarChart3,
  Mail,
  Send,
  Eye,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Edit3,
} from 'lucide-react';

export const StaffExamResults: React.FC = () => {
  const [searchParams] = useSearchParams();
  const examId = searchParams.get('examId');

  const [exams, setExams] = useState<ExamItem[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>(examId || '');
  const [examMeta, setExamMeta] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [results, setResults] = useState<ExamResultItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Release & Email state
  const [isReleasing, setIsReleasing] = useState(false);
  const [isEmailing, setIsEmailing] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Subjective Grading Modal
  const [activeGradingResult, setActiveGradingResult] = useState<ExamResultItem | null>(null);
  const [gradingQuestionId, setGradingQuestionId] = useState<string>('');
  const [gradingMarks, setGradingMarks] = useState<number>(0);
  const [gradingFeedback, setGradingFeedback] = useState<string>('');
  const [savingGrade, setSavingGrade] = useState(false);

  useEffect(() => {
    api.get('/exams').then((res) => {
      const list = res.data?.data || [];
      setExams(list);
      if (!selectedExamId && list.length > 0) {
        setSelectedExamId(list[0]._id);
      }
    });
  }, []);

  const fetchResults = async (id: string) => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await api.get(`/results/exam/${id}`);
      setExamMeta(res.data?.data?.exam);
      setAnalytics(res.data?.data?.analytics);
      setResults(res.data?.data?.results || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedExamId) {
      fetchResults(selectedExamId);
    }
  }, [selectedExamId]);

  const handleToggleRelease = async () => {
    if (!selectedExamId) return;
    setIsReleasing(true);
    try {
      const isCurrentlyReleased = results[0]?.isReleased ?? false;
      const res = await api.post(`/results/release/${selectedExamId}`, {
        release: !isCurrentlyReleased,
      });
      setActionSuccess(res.data?.message || 'Results updated.');
      fetchResults(selectedExamId);
      setTimeout(() => setActionSuccess(null), 3000);
    } finally {
      setIsReleasing(false);
    }
  };

  const handleEmailResults = async () => {
    if (!selectedExamId) return;
    setIsEmailing(true);
    try {
      const res = await api.post(`/results/email/${selectedExamId}`);
      setActionSuccess(res.data?.message || 'Email notifications dispatched.');
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsEmailing(false);
    }
  };

  const handleSaveGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeGradingResult || !gradingQuestionId) return;

    setSavingGrade(true);
    try {
      await api.post(`/results/grade/${activeGradingResult.attemptId}/${gradingQuestionId}`, {
        marksAwarded: gradingMarks,
        feedback: gradingFeedback,
      });

      setActiveGradingResult(null);
      fetchResults(selectedExamId);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingGrade(false);
    }
  };

  // Prepare chart distribution data
  const chartData = [
    { range: '0-20%', count: 0 },
    { range: '21-40%', count: 0 },
    { range: '41-60%', count: 0 },
    { range: '61-80%', count: 0 },
    { range: '81-100%', count: 0 },
  ];

  for (const r of results) {
    const p = r.percentage || 0;
    if (p <= 20) chartData[0].count++;
    else if (p <= 40) chartData[1].count++;
    else if (p <= 60) chartData[2].count++;
    else if (p <= 80) chartData[3].count++;
    else chartData[4].count++;
  }

  const areResultsReleased = results.length > 0 && results[0].isReleased;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-pearl-200">
        <div>
          <h2 className="text-2xl font-extrabold text-midnight-950 tracking-tight">
            Examination Results & Cohort Analytics
          </h2>
          <p className="text-xs text-midnight-600 mt-1">
            Real-time score calculations, subjective grading, and email dispatch.
          </p>
        </div>

        {/* Exam Selector Dropdown */}
        <div className="w-full sm:w-72">
          <select
            value={selectedExamId}
            onChange={(e) => setSelectedExamId(e.target.value)}
            className="w-full rounded-lg border border-pearl-300 bg-white px-3 py-2 text-xs font-bold text-midnight-900 focus:border-indigo-brand focus:outline-none"
          >
            {exams.map((ex) => (
              <option key={ex._id} value={ex._id}>
                {ex.title} ({ex.examCode})
              </option>
            ))}
          </select>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {loading ? (
        <LoadingSkeleton count={4} className="h-28" />
      ) : results.length === 0 ? (
        <EmptyState
          title="No Student Submissions Yet"
          description="Share your exam code with students. Submissions will evaluate automatically as students finish."
        />
      ) : (
        <div className="space-y-6">
          {/* Action Ribbon: Release & Email */}
          <Card className="bg-pearl-100 border-pearl-200">
            <CardContent className="pt-4 pb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Badge variant={areResultsReleased ? 'success' : 'warning'}>
                  {areResultsReleased ? 'Results Released to Students' : 'Results Hidden from Students'}
                </Badge>
                <span className="text-xs text-midnight-600">
                  {results.length} total student submissions evaluated
                </span>
              </div>

              <div className="flex items-center gap-2.5">
                <Button
                  variant={areResultsReleased ? 'outline' : 'primary'}
                  size="sm"
                  onClick={handleToggleRelease}
                  isLoading={isReleasing}
                >
                  {areResultsReleased ? 'Hide / Unrelease Results' : 'Release Results to Students'}
                </Button>
                {areResultsReleased && (
                  <Button
                    variant="electric"
                    size="sm"
                    leftIcon={<Mail className="w-4 h-4" />}
                    onClick={handleEmailResults}
                    isLoading={isEmailing}
                  >
                    Email Results to All Students
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Metric KPI Cards */}
          {analytics && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-5 text-center">
                  <span className="text-[11px] font-semibold text-midnight-600 uppercase">
                    Class Average
                  </span>
                  <p className="text-2xl font-extrabold text-indigo-brand mt-1">
                    {analytics.averageScore} / {examMeta?.totalMarks}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-5 text-center">
                  <span className="text-[11px] font-semibold text-midnight-600 uppercase">
                    Pass Percentage
                  </span>
                  <p className="text-2xl font-extrabold text-emerald-600 mt-1">
                    {analytics.passPercentage}%
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-5 text-center">
                  <span className="text-[11px] font-semibold text-midnight-600 uppercase">
                    Highest Mark
                  </span>
                  <p className="text-2xl font-extrabold text-emerald-600 mt-1">
                    {analytics.highestScore}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-5 text-center">
                  <span className="text-[11px] font-semibold text-midnight-600 uppercase">
                    Lowest Mark
                  </span>
                  <p className="text-2xl font-extrabold text-midnight-800 mt-1">
                    {analytics.lowestScore}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Recharts Score Distribution Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Cohort Score Distribution</CardTitle>
              <CardDescription>Number of students across percentage bands</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="range" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#4F46E5" radius={[6, 6, 0, 0]} name="Students" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Submissions Roster Table */}
          <Card>
            <CardHeader>
              <CardTitle>Student Score Roster</CardTitle>
              <CardDescription>Automated grades, pass/fail status, and manual evaluation links</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-pearl-200 text-midnight-600 uppercase font-semibold text-[11px]">
                      <th className="py-3 px-4">Student</th>
                      <th className="py-3 px-4">Roll No</th>
                      <th className="py-3 px-4">Total Score</th>
                      <th className="py-3 px-4">Programming</th>
                      <th className="py-3 px-4">Percentage</th>
                      <th className="py-3 px-4">Result</th>
                      <th className="py-3 px-4">Submitted At</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-pearl-100 font-medium">
                    {results.map((res) => (
                      <tr key={res._id} className="hover:bg-pearl-50/70 transition-colors">
                        <td className="py-3 px-4">
                          <p className="font-bold text-midnight-900">{res.studentInfo.name}</p>
                          <p className="text-[11px] text-midnight-600">{res.studentInfo.email}</p>
                        </td>
                        <td className="py-3 px-4 font-mono font-semibold text-midnight-700">
                          {res.studentInfo.rollNo || '—'}
                        </td>
                        <td className="py-3 px-4 font-bold text-indigo-brand">
                          {res.totalScore} / {res.maxScore}
                        </td>
                        <td className="py-3 px-4 font-mono">
                          {res.programmingMaxScore && res.programmingMaxScore > 0 ? (
                            <span className="font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                              {res.programmingScore || 0} / {res.programmingMaxScore}
                            </span>
                          ) : (
                            <span className="text-midnight-400">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-bold text-midnight-900">{res.percentage}%</td>
                        <td className="py-3 px-4">
                          <Badge variant={res.isPassed ? 'success' : 'danger'}>
                            {res.isPassed ? 'Passed' : 'Failed'}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-midnight-600">
                          {new Date(res.evaluatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            leftIcon={<Edit3 className="w-3.5 h-3.5" />}
                            onClick={() => {
                              setActiveGradingResult(res);
                              if (res.questionBreakdown && res.questionBreakdown.length > 0) {
                                setGradingQuestionId(res.questionBreakdown[0].questionId);
                                setGradingMarks(res.questionBreakdown[0].marksObtained);
                                setGradingFeedback(res.questionBreakdown[0].feedback || '');
                              }
                            }}
                          >
                            Inspect Code
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Manual Grading / Inspection Modal */}
      {activeGradingResult && (
        <Modal
          isOpen={Boolean(activeGradingResult)}
          onClose={() => setActiveGradingResult(null)}
          title={`Student Inspection: ${activeGradingResult.studentInfo.name}`}
          size="lg"
        >
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-pearl-100 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-3">
                <span>
                  <strong>Total:</strong> {activeGradingResult.totalScore} / {activeGradingResult.maxScore} ({activeGradingResult.percentage}%)
                </span>
                {activeGradingResult.programmingMaxScore && activeGradingResult.programmingMaxScore > 0 ? (
                  <span className="font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                    Prog: {activeGradingResult.programmingScore || 0} / {activeGradingResult.programmingMaxScore}
                  </span>
                ) : null}
              </div>
              <Badge variant={activeGradingResult.isPassed ? 'success' : 'danger'}>
                {activeGradingResult.isPassed ? 'PASSED' : 'NOT PASSED'}
              </Badge>
            </div>

            <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-2">
              {activeGradingResult.questionBreakdown.map((q, idx) => (
                <div key={idx} className="p-3.5 rounded-xl border border-pearl-200 bg-white space-y-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-midnight-900">Q{idx + 1}: {q.questionText}</span>
                      <span className="text-[10px] font-mono uppercase bg-pearl-100 text-midnight-600 px-1.5 py-0.5 rounded">
                        {q.questionType}
                      </span>
                    </div>
                    <Badge variant={q.isCorrect ? 'success' : q.isPartial ? 'warning' : 'danger'}>
                      {q.marksObtained} / {q.maxMarks} Marks
                    </Badge>
                  </div>

                  {q.questionType === 'programming' ? (
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center justify-between text-[11px] bg-midnight-900 text-pearl-200 px-3 py-1.5 rounded-t-lg font-mono">
                        <span>Language: {q.programmingLanguage?.toUpperCase() || 'SOURCE CODE'}</span>
                        <span>
                          Verdict: {q.programmingVerdict || (q.isCorrect ? 'Accepted' : 'Wrong Answer')} • Tests: {q.passedTestCasesCount || 0}/{q.totalTestCasesCount || 0}
                        </span>
                      </div>
                      <pre className="p-3 rounded-b-lg bg-midnight-950 text-emerald-300 font-mono text-xs overflow-x-auto border border-midnight-800 max-h-48">
                        <code>{String(q.studentAnswer || '// No code submitted')}</code>
                      </pre>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                      <div className="p-2 rounded bg-pearl-50 border border-pearl-200">
                        <strong className="block text-midnight-700">Student Response:</strong>
                        <span className="font-mono text-midnight-900">
                          {Array.isArray(q.studentAnswer) ? q.studentAnswer.join(', ') : String(q.studentAnswer ?? 'None')}
                        </span>
                      </div>
                      <div className="p-2 rounded bg-emerald-50/60 border border-emerald-200">
                        <strong className="block text-emerald-800">Correct Answer:</strong>
                        <span className="font-mono text-emerald-900">
                          {Array.isArray(q.correctAnswer) ? q.correctAnswer.join(', ') : String(q.correctAnswer)}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Manual Mark Override Form for this question */}
                  <div className="flex items-center gap-3 pt-2 border-t border-pearl-100">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-midnight-700">Override Marks:</span>
                      <input
                        type="number"
                        min={0}
                        max={q.maxMarks}
                        className="w-16 rounded border border-pearl-300 px-2 py-1 text-center font-bold"
                        defaultValue={q.marksObtained}
                        onBlur={(e) => {
                          setGradingQuestionId(q.questionId);
                          setGradingMarks(Number(e.target.value));
                        }}
                      />
                    </div>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleSaveGrade}
                      isLoading={savingGrade && gradingQuestionId === q.questionId}
                    >
                      Update Grade
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2 border-t border-pearl-200">
              <Button variant="outline" onClick={() => setActiveGradingResult(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
