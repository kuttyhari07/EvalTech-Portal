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
  Sparkles,
  Brain,
  Copy,
  Check,
  BarChart2,
  TrendingUp,
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

  // AI Code Reviews
  const [aiReviews, setAiReviews] = useState<
    Record<number, { loading: boolean; data?: any; error?: string }>
  >({});
  const [copiedReviewCode, setCopiedReviewCode] = useState<number | null>(null);

  // Skill Gap & Mastery Analytics
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);

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

  const handleRequestAiReview = async (questionIndex: number, q: any) => {
    setAiReviews((prev) => ({
      ...prev,
      [questionIndex]: { loading: true },
    }));

    try {
      const res = await api.post('/ai/review-code', {
        code: q.studentAnswer || '',
        language: q.programmingLanguage || 'python',
        problemStatement: q.questionText || '',
      });

      setAiReviews((prev) => ({
        ...prev,
        [questionIndex]: { loading: false, data: res.data?.data },
      }));
    } catch (err: any) {
      setAiReviews((prev) => ({
        ...prev,
        [questionIndex]: { loading: false, error: err.message || 'AI Review generation failed.' },
      }));
    }
  };

  const handleCopySnippet = (index: number, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedReviewCode(index);
    setTimeout(() => setCopiedReviewCode(null), 2000);
  };

  const handleToggleAnalytics = async () => {
    if (showAnalytics) {
      setShowAnalytics(false);
      return;
    }

    if (analyticsData) {
      setShowAnalytics(true);
      return;
    }

    if (!email) return;
    setLoadingAnalytics(true);
    setAnalyticsError(null);
    try {
      const res = await api.get(`/results/student/analytics?email=${encodeURIComponent(email.trim())}`);
      setAnalyticsData(res.data?.data);
      setShowAnalytics(true);
    } catch (err: any) {
      setAnalyticsError(err.message || 'Failed to calculate topic mastery analytics.');
    } finally {
      setLoadingAnalytics(false);
    }
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

                {/* Skill Gap & Topic Mastery Analytics Toggle */}
                <div className="pt-2">
                  <div className="flex items-center justify-between">
                    <Button
                      type="button"
                      variant={showAnalytics ? 'primary' : 'outline'}
                      size="sm"
                      leftIcon={<BarChart2 className="w-4 h-4 text-indigo-brand" />}
                      onClick={handleToggleAnalytics}
                      isLoading={loadingAnalytics}
                    >
                      {showAnalytics ? 'Hide Mastery Analytics' : '📊 View My Skill Gap & Mastery Heatmap'}
                    </Button>
                  </div>

                  {analyticsError && (
                    <div className="p-3 mt-3 rounded-lg bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>{analyticsError}</span>
                    </div>
                  )}

                  {showAnalytics && analyticsData && (
                    <div className="mt-4 p-5 rounded-2xl bg-white border border-indigo-100 shadow-md space-y-5 animate-fadeIn">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-pearl-100">
                        <div>
                          <h4 className="text-sm font-extrabold text-midnight-950 flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-indigo-brand" />
                            Comprehensive Skill Gap & Topic Mastery Breakdown
                          </h4>
                          <p className="text-xs text-midnight-500">
                            Evaluated across {analyticsData.overallStats.totalQuestions} questions with {analyticsData.overallStats.overallAccuracy}% aggregate accuracy
                          </p>
                        </div>
                        <Badge variant="purple">
                          Grade: {analyticsData.overallStats.overallAccuracy >= 75 ? 'Mastery Tier' : analyticsData.overallStats.overallAccuracy >= 50 ? 'Intermediate' : 'Foundational'}
                        </Badge>
                      </div>

                      {/* Mastery Category Counts */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200">
                          <span className="text-[10px] font-bold uppercase text-emerald-800 block">Strong Topics (≥75%)</span>
                          <span className="text-xl font-extrabold text-emerald-950">{analyticsData.masteryCategories.strong.length}</span>
                          <span className="text-[11px] text-emerald-700 block truncate mt-0.5">
                            {analyticsData.masteryCategories.strong.join(', ') || 'Keep practicing!'}
                          </span>
                        </div>

                        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200">
                          <span className="text-[10px] font-bold uppercase text-amber-800 block">Moderate Topics (50-74%)</span>
                          <span className="text-xl font-extrabold text-amber-950">{analyticsData.masteryCategories.moderate.length}</span>
                          <span className="text-[11px] text-amber-700 block truncate mt-0.5">
                            {analyticsData.masteryCategories.moderate.join(', ') || 'None in this tier'}
                          </span>
                        </div>

                        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200">
                          <span className="text-[10px] font-bold uppercase text-rose-800 block">Needs Focus (&lt;50%)</span>
                          <span className="text-xl font-extrabold text-rose-950">{analyticsData.masteryCategories.weak.length}</span>
                          <span className="text-[11px] text-rose-700 block truncate mt-0.5">
                            {analyticsData.masteryCategories.weak.join(', ') || 'No weak areas identified! 🌟'}
                          </span>
                        </div>
                      </div>

                      {/* Topic-wise Progress Bars */}
                      <div className="space-y-3">
                        <h5 className="text-xs font-bold text-midnight-900 uppercase tracking-wider">Topic Accuracy Bars</h5>
                        <div className="space-y-2">
                          {analyticsData.topicBreakdown.map((t: any, idx: number) => (
                            <div key={idx} className="p-3 rounded-xl bg-pearl-50 border border-pearl-200 space-y-1.5">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-bold text-midnight-900">{t.topic}</span>
                                <span className="font-mono font-bold text-indigo-brand">
                                  {t.correctQuestions}/{t.totalQuestions} ({t.accuracy}%)
                                </span>
                              </div>
                              <div className="w-full bg-pearl-200 rounded-full h-2 overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    t.accuracy >= 75
                                      ? 'bg-emerald-500'
                                      : t.accuracy >= 50
                                      ? 'bg-amber-500'
                                      : 'bg-rose-500'
                                  }`}
                                  style={{ width: `${t.accuracy}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* AI Study Coach Recommendation */}
                      {analyticsData.studyCoachRecommendations && (
                        <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 space-y-2">
                          <div className="flex items-center gap-2 text-indigo-900 font-bold text-xs">
                            <Sparkles className="w-4 h-4 text-indigo-600" />
                            <span>AI Study Coach Recommendation</span>
                          </div>
                          <p className="text-xs text-indigo-950 leading-relaxed font-medium">
                            {analyticsData.studyCoachRecommendations}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Question-wise Breakdown with Explanations */}
                {result.questionBreakdown && result.questionBreakdown.length > 0 && (
                  <div className="space-y-4 pt-4 border-t border-pearl-100">
                    <h4 className="text-sm font-bold text-midnight-950">
                      Question Evaluation & Explanations
                    </h4>
                    <div className="space-y-3">
                      {result.questionBreakdown.map((q: any, i: number) => {
                        const reviewState = aiReviews[i];

                        return (
                          <div key={i} className="p-4 rounded-xl border border-pearl-200 bg-white space-y-3 text-xs">
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

                                {/* AI Code Review Trigger Button */}
                                <div className="pt-1">
                                  <Button
                                    type="button"
                                    variant="electric"
                                    size="sm"
                                    leftIcon={<Brain className="w-3.5 h-3.5" />}
                                    onClick={() => handleRequestAiReview(i, q)}
                                    isLoading={reviewState?.loading}
                                  >
                                    {reviewState?.data ? 'Re-analyze with AI' : '🧠 AI Code Review & Feedback'}
                                  </Button>
                                </div>

                                {/* AI Review Feedback Panel */}
                                {reviewState?.error && (
                                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
                                    {reviewState.error}
                                  </div>
                                )}

                                {reviewState?.data && (
                                  <div className="p-4 rounded-xl bg-pearl-50 border border-indigo-200 space-y-3 mt-2 animate-fadeIn">
                                    <div className="flex items-center justify-between border-b border-pearl-200 pb-2">
                                      <div className="flex items-center gap-2">
                                        <Sparkles className="w-4 h-4 text-indigo-600" />
                                        <span className="font-extrabold text-midnight-950 text-xs">
                                          Gemini Code Intelligence Analysis
                                        </span>
                                      </div>
                                      <Badge variant="purple" className="text-[11px] font-mono">
                                        Score: {reviewState.data.cleanlinessScore}/100
                                      </Badge>
                                    </div>

                                    {/* Complexity Grid */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                                      <div className="p-2.5 rounded-lg bg-white border border-pearl-200">
                                        <span className="font-bold text-midnight-800 block">Time Complexity</span>
                                        <div className="font-mono text-indigo-brand mt-0.5">
                                          Current: {reviewState.data.timeComplexity?.current || 'N/A'} • Optimal: {reviewState.data.timeComplexity?.optimal || 'N/A'}
                                        </div>
                                      </div>
                                      <div className="p-2.5 rounded-lg bg-white border border-pearl-200">
                                        <span className="font-bold text-midnight-800 block">Space Complexity</span>
                                        <div className="font-mono text-indigo-brand mt-0.5">
                                          Current: {reviewState.data.spaceComplexity?.current || 'N/A'} • Optimal: {reviewState.data.spaceComplexity?.optimal || 'N/A'}
                                        </div>
                                      </div>
                                    </div>

                                    {/* Strengths & Risks */}
                                    {reviewState.data.strengths?.length > 0 && (
                                      <div className="space-y-1">
                                        <span className="font-bold text-emerald-800 block text-[11px]">Key Strengths:</span>
                                        <ul className="list-disc list-inside text-[11px] text-midnight-700 space-y-0.5">
                                          {reviewState.data.strengths.map((str: string, sIdx: number) => (
                                            <li key={sIdx}>{str}</li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}

                                    {reviewState.data.potentialRisks?.length > 0 && (
                                      <div className="space-y-1">
                                        <span className="font-bold text-amber-800 block text-[11px]">Edge Cases & Risks:</span>
                                        <ul className="list-disc list-inside text-[11px] text-midnight-700 space-y-0.5">
                                          {reviewState.data.potentialRisks.map((risk: string, rIdx: number) => (
                                            <li key={rIdx}>{risk}</li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}

                                    {/* Recommendations */}
                                    {reviewState.data.recommendations?.length > 0 && (
                                      <div className="space-y-1">
                                        <span className="font-bold text-indigo-800 block text-[11px]">Actionable Suggestions:</span>
                                        <ul className="list-disc list-inside text-[11px] text-midnight-700 space-y-0.5">
                                          {reviewState.data.recommendations.map((rec: string, recIdx: number) => (
                                            <li key={recIdx}>{rec}</li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}

                                    {/* Refactored Snippet */}
                                    {reviewState.data.refactoredCode && (
                                      <div className="space-y-1.5 pt-1">
                                        <div className="flex items-center justify-between">
                                          <span className="font-bold text-midnight-900 text-[11px]">
                                            Optimized / Clean Implementation:
                                          </span>
                                          <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleCopySnippet(i, reviewState.data.refactoredCode)}
                                            leftIcon={copiedReviewCode === i ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                                            className="text-[10px] h-7 px-2"
                                          >
                                            {copiedReviewCode === i ? 'Copied' : 'Copy'}
                                          </Button>
                                        </div>
                                        <pre className="p-3 rounded-lg bg-midnight-950 text-indigo-200 font-mono text-[11px] overflow-x-auto border border-midnight-800 max-h-56">
                                          <code>{reviewState.data.refactoredCode}</code>
                                        </pre>
                                      </div>
                                    )}
                                  </div>
                                )}
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
                        );
                      })}
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
