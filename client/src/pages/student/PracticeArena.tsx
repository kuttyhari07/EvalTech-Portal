import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';
import {
  Flame,
  Zap,
  Trophy,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  HelpCircle,
  RotateCcw,
  Sparkles,
  Award,
  BookOpen,
  GraduationCap,
  Play,
} from 'lucide-react';

interface PracticeStats {
  xpPoints: number;
  streakCount: number;
  solvedPracticeCount: number;
  level: {
    currentLevel: number;
    nextLevelXp: number;
    progressPercent: number;
    levelTitle: string;
  };
}

interface TopicItem {
  topic: string;
  count: number;
}

interface QuizQuestion {
  questionId: string;
  topic: string;
  type: string;
  questionText: string;
  options?: string[];
  marks: number;
}

export const PracticeArena: React.FC = () => {
  const [stats, setStats] = useState<PracticeStats | null>(null);
  const [topics, setTopics] = useState<TopicItem[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Quiz Execution States
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const [activeQuiz, setActiveQuiz] = useState<QuizQuestion[] | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [quizResult, setQuizResult] = useState<any>(null);

  const fetchInitialData = async () => {
    setLoadingInitial(true);
    try {
      const [statsRes, topicsRes] = await Promise.all([
        api.get('/practice/stats'),
        api.get('/practice/topics'),
      ]);
      setStats(statsRes.data?.data);
      setTopics(topicsRes.data?.data?.topics || []);
    } catch (err: any) {
      console.error('Failed to load practice stats:', err);
    } finally {
      setLoadingInitial(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const handleStartQuiz = async (topic?: string) => {
    setIsGeneratingQuiz(true);
    setSelectedTopic(topic || '');
    setQuizResult(null);
    setUserAnswers({});
    setCurrentIdx(0);

    try {
      const res = await api.post('/practice/quiz', { topic, count: 5 });
      setActiveQuiz(res.data?.data?.questions || []);
    } catch (err: any) {
      alert(err.message || 'Failed to generate quiz. Try again.');
    } finally {
      setIsGeneratingQuiz(false);
    }
  };

  const handleSelectAnswer = (qId: string, answer: string) => {
    setUserAnswers((prev) => ({
      ...prev,
      [qId]: answer,
    }));
  };

  const handleSubmitQuiz = async () => {
    if (!activeQuiz) return;
    setIsSubmitting(true);
    try {
      const answersPayload = activeQuiz.map((q) => ({
        questionId: q.questionId,
        answer: userAnswers[q.questionId] || '',
      }));

      const res = await api.post('/practice/submit', {
        answers: answersPayload,
      });

      setQuizResult(res.data?.data);
      // Refresh stats with new XP and streak
      const statsRes = await api.get('/practice/stats');
      setStats(statsRes.data?.data);
    } catch (err: any) {
      alert(err.message || 'Failed to submit quiz.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-pearl-50 text-midnight-900 selection:bg-indigo-brand selection:text-white pb-16">
      {/* Top Navbar */}
      <header className="bg-midnight-950 text-white border-b border-midnight-800 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/student/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-brand flex items-center justify-center text-white">
              <GraduationCap className="w-5 h-5" />
            </div>
            <span className="text-xl font-extrabold text-white tracking-tight">
              Eval<span className="text-indigo-glow">Tech</span>
            </span>
          </Link>
          <span className="text-xs font-mono font-bold uppercase bg-midnight-900 text-amber-400 px-2.5 py-1 rounded border border-midnight-800 flex items-center gap-1">
            <Flame className="w-3.5 h-3.5 fill-amber-400" /> Practice Arena
          </span>
        </div>

        <Link to="/student/dashboard">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
            className="bg-midnight-900 border-midnight-700 text-pearl-200 hover:text-white text-xs"
          >
            Dashboard
          </Button>
        </Link>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* Gamification Stats Header Ribbon */}
        {loadingInitial ? (
          <LoadingSkeleton count={1} className="h-28" />
        ) : stats ? (
          <div className="p-6 rounded-2xl bg-gradient-to-r from-midnight-950 via-indigo-950 to-midnight-900 text-white shadow-xl border border-indigo-900/40">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              {/* Streak Card */}
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-inner">
                  <Flame className="w-8 h-8 fill-amber-400 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-black text-amber-300">
                      {stats.streakCount} Day Streak
                    </span>
                    <span className="text-xs bg-amber-400/20 text-amber-300 font-bold px-2 py-0.5 rounded-full border border-amber-400/30">
                      🔥 Active
                    </span>
                  </div>
                  <p className="text-xs text-pearl-300 mt-0.5">
                    Solve a 5-question mock daily to keep your streak blazing!
                  </p>
                </div>
              </div>

              {/* XP & Level Progress */}
              <div className="flex-1 max-w-sm space-y-2 bg-white/5 p-4 rounded-xl border border-white/10">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold flex items-center gap-1.5 text-indigo-300">
                    <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                    Level {stats.level.currentLevel}: {stats.level.levelTitle}
                  </span>
                  <span className="font-mono font-bold text-pearl-200">
                    {stats.xpPoints} / {stats.level.nextLevelXp} XP
                  </span>
                </div>
                <div className="w-full bg-midnight-900 rounded-full h-2.5 overflow-hidden border border-white/10">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-amber-400 rounded-full transition-all duration-500"
                    style={{ width: `${stats.level.progressPercent}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-pearl-400 font-mono">
                  <span>{stats.solvedPracticeCount} questions conquered</span>
                  <span>+{stats.level.nextLevelXp - stats.xpPoints} XP to next rank</span>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* QUIZ INTERFACE OR TOPIC SELECTION */}
        {!activeQuiz && !quizResult && (
          <div className="space-y-6">
            {/* Quick Play Banner */}
            <Card className="border-indigo-100 bg-gradient-to-br from-white via-indigo-50/30 to-purple-50/20 shadow-md">
              <CardContent className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="purple" className="text-[10px]">
                      Daily Challenge
                    </Badge>
                    <span className="text-xs font-bold text-indigo-brand">+20 XP Reward</span>
                  </div>
                  <h3 className="text-lg font-black text-midnight-950">
                    5-Minute Daily Mock Arena
                  </h3>
                  <p className="text-xs text-midnight-600 max-w-md">
                    Test your memory and programming fundamentals with randomized questions drawn directly from official question banks.
                  </p>
                </div>
                <Button
                  variant="electric"
                  size="md"
                  leftIcon={<Play className="w-4 h-4 fill-white" />}
                  onClick={() => handleStartQuiz()}
                  isLoading={isGeneratingQuiz && !selectedTopic}
                >
                  Quick Random Mock
                </Button>
              </CardContent>
            </Card>

            {/* Topic Explorer */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-extrabold text-midnight-950">
                    Practice by Specific Topic
                  </h3>
                  <p className="text-xs text-midnight-600">
                    Select a skill area to strengthen your conceptual knowledge.
                  </p>
                </div>
                <span className="text-xs font-mono font-bold text-midnight-500">
                  {topics.length} Topic{topics.length === 1 ? '' : 's'} Available
                </span>
              </div>

              {topics.length === 0 ? (
                <Card className="border-pearl-200">
                  <CardContent className="py-10 text-center space-y-2">
                    <BookOpen className="w-8 h-8 text-midnight-400 mx-auto opacity-50" />
                    <p className="text-xs text-midnight-600">
                      No question bank topics published yet. Your instructors will add topics soon!
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {topics.map((t) => (
                    <Card
                      key={t.topic}
                      className="hover:border-indigo-brand/60 hover:shadow-md transition-all cursor-pointer group"
                      onClick={() => handleStartQuiz(t.topic)}
                    >
                      <CardContent className="p-5 flex items-center justify-between">
                        <div>
                          <h4 className="font-extrabold text-sm text-midnight-950 group-hover:text-indigo-brand transition-colors">
                            {t.topic}
                          </h4>
                          <span className="text-xs text-midnight-500 font-mono">
                            {t.count} question{t.count === 1 ? '' : 's'} in bank
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="group-hover:translate-x-1 transition-transform"
                        >
                          <ArrowRight className="w-4 h-4 text-indigo-brand" />
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ACTIVE QUIZ RUNNER */}
        {activeQuiz && !quizResult && (
          <div className="space-y-6 animate-fadeIn">
            <Card className="border-pearl-200 shadow-xl overflow-hidden">
              {/* Quiz Header Bar */}
              <div className="bg-midnight-950 text-white p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-amber-400">
                    Question {currentIdx + 1} of {activeQuiz.length}
                  </span>
                  <Badge variant="purple" className="text-[10px]">
                    {activeQuiz[currentIdx].topic}
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-pearl-300 hover:text-white text-xs h-7"
                  onClick={() => {
                    if (window.confirm('Leave practice test? Your progress will be discarded.')) {
                      setActiveQuiz(null);
                    }
                  }}
                >
                  Exit Quiz
                </Button>
              </div>

              {/* Progress Indicator */}
              <div className="w-full bg-pearl-200 h-1.5">
                <div
                  className="bg-indigo-brand h-full transition-all duration-300"
                  style={{ width: `${((currentIdx + 1) / activeQuiz.length) * 100}%` }}
                />
              </div>

              <CardContent className="p-6 space-y-6">
                {/* Question Statement */}
                <div className="space-y-2">
                  <h3 className="text-base font-extrabold text-midnight-950 leading-relaxed">
                    {activeQuiz[currentIdx].questionText}
                  </h3>
                  <span className="text-[11px] font-mono text-midnight-500 uppercase">
                    Type: {activeQuiz[currentIdx].type} • Value: {activeQuiz[currentIdx].marks} Marks
                  </span>
                </div>

                {/* Multiple Choice Options */}
                {activeQuiz[currentIdx].options && activeQuiz[currentIdx].options!.length > 0 && (
                  <div className="space-y-2.5">
                    {activeQuiz[currentIdx].options!.map((opt, oIdx) => {
                      const qId = activeQuiz[currentIdx].questionId;
                      const isSelected = userAnswers[qId] === opt;

                      return (
                        <div
                          key={oIdx}
                          onClick={() => handleSelectAnswer(qId, opt)}
                          className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center gap-3 ${
                            isSelected
                              ? 'border-indigo-brand bg-indigo-50/70 text-indigo-950 font-bold shadow-xs'
                              : 'border-pearl-200 hover:border-pearl-300 hover:bg-pearl-50 text-midnight-900'
                          }`}
                        >
                          <div
                            className={`w-5 h-5 rounded-full border flex items-center justify-center text-xs font-mono ${
                              isSelected
                                ? 'border-indigo-brand bg-indigo-brand text-white'
                                : 'border-pearl-300 text-midnight-600'
                            }`}
                          >
                            {String.fromCharCode(65 + oIdx)}
                          </div>
                          <span className="text-xs">{opt}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Navigation Controls */}
                <div className="flex items-center justify-between pt-4 border-t border-pearl-200">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentIdx === 0}
                    onClick={() => setCurrentIdx((i) => i - 1)}
                  >
                    Previous
                  </Button>

                  <div className="flex items-center gap-2">
                    {currentIdx < activeQuiz.length - 1 ? (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => setCurrentIdx((i) => i + 1)}
                      >
                        Next Question
                      </Button>
                    ) : (
                      <Button
                        variant="electric"
                        size="sm"
                        leftIcon={<Sparkles className="w-4 h-4 text-amber-300" />}
                        onClick={handleSubmitQuiz}
                        isLoading={isSubmitting}
                      >
                        Submit & Claim XP
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* QUIZ COMPLETION & REVIEW RESULT */}
        {quizResult && (
          <div className="space-y-6 animate-fadeIn">
            {/* Victory Celebration Card */}
            <Card className="border-indigo-200 bg-gradient-to-r from-midnight-950 via-indigo-950 to-midnight-900 text-white shadow-xl overflow-hidden">
              <CardContent className="p-8 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-amber-400/20 border-2 border-amber-400 mx-auto flex items-center justify-center text-amber-300">
                  <Trophy className="w-8 h-8 fill-amber-300" />
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-mono uppercase tracking-widest text-amber-300 font-bold">
                    Daily Mock Complete!
                  </span>
                  <h3 className="text-2xl font-black">
                    You Scored {quizResult.score} / {quizResult.totalMarks} Marks ({quizResult.accuracy}%)
                  </h3>
                  <p className="text-xs text-pearl-300 max-w-md mx-auto">
                    {quizResult.feedback}
                  </p>
                </div>

                {/* XP Reward Pill */}
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-sm font-bold text-amber-300 shadow-inner">
                  <Zap className="w-4 h-4 fill-amber-300 text-amber-300" />
                  <span>+{quizResult.xpAwarded} XP Gained! 🔥 Streak Updated</span>
                </div>

                <div className="pt-2 flex justify-center gap-3">
                  <Button
                    variant="electric"
                    size="sm"
                    leftIcon={<RotateCcw className="w-4 h-4" />}
                    onClick={() => handleStartQuiz(selectedTopic)}
                  >
                    Practice Again
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-midnight-900 border-midnight-700 text-pearl-200 hover:text-white"
                    onClick={() => {
                      setActiveQuiz(null);
                      setQuizResult(null);
                    }}
                  >
                    Back to Arena
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Answer-by-Answer Explanations */}
            <Card className="border-pearl-200 shadow-md">
              <CardHeader className="pb-3 border-b border-pearl-100">
                <CardTitle className="text-base">Review & Explanations</CardTitle>
                <CardDescription>
                  Deepen your understanding by reviewing verified answers and conceptual explanations.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                {quizResult.review?.map((r: any, idx: number) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-xl border text-xs space-y-2 ${
                      r.isCorrect
                        ? 'border-emerald-200 bg-emerald-50/40'
                        : 'border-rose-200 bg-rose-50/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-midnight-900">
                        Q{idx + 1}: {r.questionText}
                      </span>
                      <Badge variant={r.isCorrect ? 'success' : 'danger'}>
                        {r.isCorrect ? 'Correct (+1 Mark)' : 'Incorrect'}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1">
                      <div className="p-2 rounded bg-white border border-pearl-200">
                        <span className="font-bold text-midnight-700 block">Your Answer:</span>
                        <span className="font-mono text-midnight-900 font-semibold">
                          {r.userAnswer || 'No response'}
                        </span>
                      </div>
                      <div className="p-2 rounded bg-white border border-emerald-200">
                        <span className="font-bold text-emerald-800 block">Correct Answer:</span>
                        <span className="font-mono text-emerald-950 font-semibold">
                          {r.correctAnswer}
                        </span>
                      </div>
                    </div>

                    {r.explanation && (
                      <p className="text-[11px] text-midnight-600 bg-white p-2.5 rounded border border-pearl-200">
                        <strong>Explanation:</strong> {r.explanation}
                      </p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
};
