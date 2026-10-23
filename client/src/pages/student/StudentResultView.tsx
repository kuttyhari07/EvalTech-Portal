import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../../api/client';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';
import {
  GraduationCap,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Search,
  ArrowLeft,
  Calendar,
  AlertTriangle,
} from 'lucide-react';

export const StudentResultView: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialEmail = searchParams.get('email') || '';
  const initialExamCode = searchParams.get('examCode') || '';

  const [email, setEmail] = useState(initialEmail);
  const [examCode, setExamCode] = useState(initialExamCode);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(Boolean(initialEmail && initialExamCode));
  const [error, setError] = useState<string | null>(null);

  const fetchResult = async (userEmail: string, code: string) => {
    if (!userEmail || !code) return;
    setLoading(true);
    setError(null);

    try {
      const res = await api.get(
        `/results/student-view?email=${encodeURIComponent(userEmail.trim())}&examCode=${encodeURIComponent(
          code.trim()
        )}`
      );
      setResult(res.data?.data);
    } catch (err: any) {
      setError(err.message || 'No released results found for these details.');
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialEmail && initialExamCode) {
      fetchResult(initialEmail, initialExamCode);
    }
  }, [initialEmail, initialExamCode]);

  const handleLookup = (e: React.FormEvent) => {
    e.preventDefault();
    fetchResult(email, examCode);
  };

  return (
    <div className="min-h-screen bg-pearl-50 text-midnight-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Top Brand Link */}
        <div className="flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-midnight-900 flex items-center justify-center text-white">
              <GraduationCap className="w-5 h-5 text-indigo-glow" />
            </div>
            <span className="text-xl font-extrabold text-midnight-950">
              Eval<span className="text-indigo-brand">Tech</span>
            </span>
          </Link>
          <Link to="/" className="text-xs font-bold text-midnight-600 hover:text-indigo-brand flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Return Home
          </Link>
        </div>

        {/* Lookup Card if not loaded */}
        <Card className="shadow-lg border-pearl-200">
          <CardHeader>
            <CardTitle>Student Performance Portal</CardTitle>
            <CardDescription>
              Enter your student email and examination code to inspect your official released score card.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLookup} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                label="Student Email"
                required
                type="email"
                placeholder="your.email@edu.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Input
                label="Exam Access Code"
                required
                placeholder="e.g. EVT-842"
                value={examCode}
                onChange={(e) => setExamCode(e.target.value.toUpperCase())}
              />
              <div className="flex items-end">
                <Button type="submit" variant="primary" className="w-full" isLoading={loading}>
                  Find Result
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {error && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading && <LoadingSkeleton count={3} className="h-32" />}

        {/* Result Report Display */}
        {result && !loading && (
          <div className="space-y-6">
            <Card className="shadow-xl border-pearl-200">
              <CardContent className="pt-6 space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-pearl-100">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-indigo-brand font-mono">
                      Official Performance Report
                    </span>
                    <h3 className="text-xl font-extrabold text-midnight-950 mt-0.5">
                      {result.examTitle}
                    </h3>
                    <p className="text-xs text-midnight-600">
                      Subject: {result.examSubject} • Candidate: {result.student?.name}
                    </p>
                  </div>
                  <Badge variant={result.isPassed ? 'success' : 'danger'} className="text-xs px-3 py-1">
                    {result.isPassed ? 'PASSED' : 'NOT PASSED'}
                  </Badge>
                </div>

                {/* Score Big Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="p-4 rounded-xl bg-pearl-50 border border-pearl-200 text-center">
                    <span className="text-[10px] font-bold uppercase text-midnight-600">Total Marks</span>
                    <div className="text-2xl font-extrabold text-midnight-950 mt-1">
                      {result.totalScore} / {result.maxScore}
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-pearl-50 border border-pearl-200 text-center">
                    <span className="text-[10px] font-bold uppercase text-midnight-600">Percentage</span>
                    <div className="text-2xl font-extrabold text-indigo-brand mt-1">
                      {result.percentage}%
                    </div>
                  </div>

                  {result.programmingMaxScore && result.programmingMaxScore > 0 ? (
                    <div className="p-4 rounded-xl bg-purple-50/70 border border-purple-200 text-center">
                      <span className="text-[10px] font-bold uppercase text-purple-700">Programming Score</span>
                      <div className="text-2xl font-extrabold text-purple-900 mt-1">
                        {result.programmingScore || 0} / {result.programmingMaxScore}
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-pearl-50 border border-pearl-200 text-center">
                      <span className="text-[10px] font-bold uppercase text-midnight-600">Status</span>
                      <div className="text-xl font-extrabold text-emerald-600 mt-1">
                        {result.isPassed ? 'Passed' : 'Failed'}
                      </div>
                    </div>
                  )}

                  <div className="p-4 rounded-xl bg-pearl-50 border border-pearl-200 text-center">
                    <span className="text-[10px] font-bold uppercase text-midnight-600">Evaluated On</span>
                    <div className="text-xs font-semibold text-midnight-800 mt-2">
                      {new Date(result.evaluatedAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                {/* Question-wise Breakdown with Explanations */}
                {result.questionBreakdown && result.questionBreakdown.length > 0 && (
                  <div className="space-y-4 pt-4 border-t border-pearl-100">
                    <h4 className="text-sm font-bold text-midnight-950">
                      Question Evaluation & Explanations
                    </h4>
                    <div className="space-y-3">
                      {result.questionBreakdown.map((q: any, i: number) => (
                        <div key={i} className="p-4 rounded-xl border border-pearl-200 bg-white space-y-2 text-xs">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-midnight-900">Q{i + 1}: {q.questionText}</span>
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
                                <span>Language: {q.programmingLanguage?.toUpperCase() || 'CODE'}</span>
                                <span>
                                  Verdict: {q.programmingVerdict || (q.isCorrect ? 'Accepted' : 'Wrong Answer')} • Tests: {q.passedTestCasesCount || 0}/{q.totalTestCasesCount || 0}
                                </span>
                              </div>
                              <pre className="p-3 rounded-b-lg bg-midnight-950 text-emerald-300 font-mono text-xs overflow-x-auto border border-midnight-800 max-h-48">
                                <code>{String(q.studentAnswer || '// No code submitted')}</code>
                              </pre>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1">
                              <div className="p-2.5 rounded-lg bg-pearl-50 border border-pearl-200">
                                <span className="font-bold text-midnight-700 block">Your Response:</span>
                                <span className="font-mono text-midnight-900">
                                  {Array.isArray(q.studentAnswer) ? q.studentAnswer.join(', ') : String(q.studentAnswer || 'Unanswered')}
                                </span>
                              </div>
                              <div className="p-2.5 rounded-lg bg-emerald-50/70 border border-emerald-200">
                                <span className="font-bold text-emerald-800 block">Correct Answer:</span>
                                <span className="font-mono text-emerald-950 font-semibold">
                                  {Array.isArray(q.correctAnswer) ? q.correctAnswer.join(', ') : String(q.correctAnswer)}
                                </span>
                              </div>
                            </div>
                          )}

                          {q.explanation && (
                            <p className="text-[11px] text-midnight-600 bg-pearl-50 p-2 rounded-lg border border-pearl-200 mt-1">
                              <strong>Explanation:</strong> {q.explanation}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};
