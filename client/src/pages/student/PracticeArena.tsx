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
  Terminal,
  AlertTriangle,
  Loader2,
  Code2,
  Copy,
  Check,
} from 'lucide-react';
import { CodeEditor } from '../../components/programming/CodeEditor';
import { ProgrammingLanguage } from '../../types';

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
  options?: Array<string | { id?: string; text?: string }>;
  marks: number;
  programmingDetails?: {
    title?: string;
    problemStatement?: string;
    problemDescriptionMarkdown?: string;
    inputFormat?: string;
    outputFormat?: string;
    constraints?: string;
    starterCode?: Record<string, string>;
    supportedLanguages?: ProgrammingLanguage[];
    sampleInput?: string;
    sampleExpectedOutput?: string;
    sampleExplanation?: string;
    sampleTestCases?: Array<{
      input: string;
      expectedOutput: string;
      description?: string;
    }>;
    timeLimitSeconds?: number;
    memoryLimitMb?: number;
  };
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

  // Programming Question Execution States
  const [selectedLanguage, setSelectedLanguage] = useState<Record<string, ProgrammingLanguage>>({});
  const [codeDrafts, setCodeDrafts] = useState<Record<string, Record<string, string>>>({});
  const [isRunningCode, setIsRunningCode] = useState<Record<string, boolean>>({});
  const [runResults, setRunResults] = useState<Record<string, any>>({});
  const [customInput, setCustomInput] = useState<Record<string, string>>({});
  const [useCustomInput, setUseCustomInput] = useState<Record<string, boolean>>({});

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
    setRunResults({});
    setUseCustomInput({});

    try {
      const res = await api.post('/practice/quiz', { topic, count: 5 });
      const questions: QuizQuestion[] = res.data?.data?.questions || [];
      setActiveQuiz(questions);

      // Initialize drafts and default answers for programming questions
      const initialDrafts: Record<string, Record<string, string>> = {};
      const initialAnswers: Record<string, string> = {};
      const initialLangs: Record<string, ProgrammingLanguage> = {};

      for (const q of questions) {
        if (q.type === 'programming') {
          const starterMap = q.programmingDetails?.starterCode || {};
          const defaultLang: ProgrammingLanguage =
            (q.programmingDetails?.supportedLanguages?.[0] as ProgrammingLanguage) || 'python';
          initialLangs[q.questionId] = defaultLang;
          initialDrafts[q.questionId] = {
            python:
              starterMap.python ||
              'import sys\n\ndef main():\n    # Read from standard input\n    # line = sys.stdin.read().split()\n    pass\n\nif __name__ == "__main__":\n    main()\n',
            java:
              starterMap.java ||
              'import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        \n    }\n}\n',
            cpp:
              starterMap.cpp ||
              '#include <iostream>\nusing namespace std;\n\nint main() {\n    \n    return 0;\n}\n',
            c:
              starterMap.c ||
              '#include <stdio.h>\n\nint main() {\n    \n    return 0;\n}\n',
          };
          initialAnswers[q.questionId] = initialDrafts[q.questionId][defaultLang];
        }
      }

      setCodeDrafts(initialDrafts);
      setSelectedLanguage(initialLangs);
      setUserAnswers(initialAnswers);
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

  const handleLanguageChange = (qId: string, lang: ProgrammingLanguage) => {
    setSelectedLanguage((prev) => ({ ...prev, [qId]: lang }));
    const currentCode = codeDrafts[qId]?.[lang] || '';
    setUserAnswers((prev) => ({ ...prev, [qId]: currentCode }));
  };

  const handleCodeChange = (qId: string, lang: ProgrammingLanguage, code: string) => {
    setCodeDrafts((prev) => ({
      ...prev,
      [qId]: {
        ...(prev[qId] || {}),
        [lang]: code,
      },
    }));
    setUserAnswers((prev) => ({
      ...prev,
      [qId]: code,
    }));
  };

  const handleRunCode = async (q: QuizQuestion) => {
    const qId = q.questionId;
    const lang = selectedLanguage[qId] || 'python';
    const code = codeDrafts[qId]?.[lang] || userAnswers[qId] || '';
    const customIn = useCustomInput[qId] ? customInput[qId] || '' : undefined;

    if (!code.trim()) {
      alert('Source code cannot be empty.');
      return;
    }

    setIsRunningCode((prev) => ({ ...prev, [qId]: true }));
    try {
      const res = await api.post('/practice/run', {
        questionId: qId,
        language: lang,
        sourceCode: code,
        customInput: customIn,
      });
      setRunResults((prev) => ({ ...prev, [qId]: res.data?.data }));
    } catch (err: any) {
      alert(err.message || 'Run code failed');
    } finally {
      setIsRunningCode((prev) => ({ ...prev, [qId]: false }));
    }
  };

  const handleSubmitQuiz = async () => {
    if (!activeQuiz) return;
    setIsSubmitting(true);
    try {
      const answersPayload = activeQuiz.map((q) => {
        const lang = selectedLanguage[q.questionId] || 'python';
        const isProg = q.type === 'programming';
        const result = runResults[q.questionId];
        const passed = isProg
          ? Boolean(result?.summary?.passed && result.summary.passed === result.summary.total)
          : undefined;
        return {
          questionId: q.questionId,
          answer: userAnswers[q.questionId] || '',
          language: isProg ? lang : undefined,
          passed,
        };
      });

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
                {activeQuiz[currentIdx].type !== 'programming' &&
                  activeQuiz[currentIdx].options &&
                  activeQuiz[currentIdx].options!.length > 0 && (
                    <div className="space-y-2.5">
                      {activeQuiz[currentIdx].options!.map((opt, oIdx) => {
                        const qId = activeQuiz[currentIdx].questionId;
                        const optText = typeof opt === 'string' ? opt : opt?.text || opt?.id || String(opt);
                        const optId = typeof opt === 'string' ? opt : opt?.id || opt?.text || String(opt);
                        const isSelected = userAnswers[qId] === optId || userAnswers[qId] === optText;

                        return (
                          <div
                            key={oIdx}
                            onClick={() => handleSelectAnswer(qId, optId)}
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
                            <span className="text-xs">{optText}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                {/* PROGRAMMING QUESTION WORKSPACE */}
                {activeQuiz[currentIdx].type === 'programming' && (
                  <div className="space-y-4">
                    {/* Specifications: Input, Output, Constraints */}
                    {(activeQuiz[currentIdx].programmingDetails?.inputFormat ||
                      activeQuiz[currentIdx].programmingDetails?.outputFormat ||
                      activeQuiz[currentIdx].programmingDetails?.constraints) && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3.5 rounded-xl bg-pearl-100/70 border border-pearl-200 text-xs">
                        {activeQuiz[currentIdx].programmingDetails?.inputFormat && (
                          <div className="space-y-1">
                            <span className="font-bold text-midnight-800 uppercase text-[10px] tracking-wider block">
                              Input Format
                            </span>
                            <p className="text-midnight-600 font-medium">
                              {activeQuiz[currentIdx].programmingDetails.inputFormat}
                            </p>
                          </div>
                        )}
                        {activeQuiz[currentIdx].programmingDetails?.outputFormat && (
                          <div className="space-y-1">
                            <span className="font-bold text-midnight-800 uppercase text-[10px] tracking-wider block">
                              Output Format
                            </span>
                            <p className="text-midnight-600 font-medium">
                              {activeQuiz[currentIdx].programmingDetails.outputFormat}
                            </p>
                          </div>
                        )}
                        {activeQuiz[currentIdx].programmingDetails?.constraints && (
                          <div className="space-y-1">
                            <span className="font-bold text-midnight-800 uppercase text-[10px] tracking-wider block">
                              Constraints
                            </span>
                            <p className="font-mono text-midnight-700 bg-white/80 px-2 py-0.5 rounded border border-pearl-200 inline-block">
                              {activeQuiz[currentIdx].programmingDetails.constraints}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Sample Test Case Preview */}
                    {(activeQuiz[currentIdx].programmingDetails?.sampleInput ||
                      activeQuiz[currentIdx].programmingDetails?.sampleExpectedOutput) && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3.5 bg-midnight-950 rounded-xl border border-midnight-800 text-xs font-mono">
                        <div>
                          <div className="text-[10px] uppercase font-bold text-pearl-400 mb-1 flex items-center gap-1.5">
                            <Terminal className="w-3.5 h-3.5 text-indigo-glow" /> Sample Input:
                          </div>
                          <pre className="p-2.5 bg-midnight-900 rounded-lg text-pearl-200 overflow-x-auto whitespace-pre-wrap select-all">
                            {activeQuiz[currentIdx].programmingDetails?.sampleInput || '(No input)'}
                          </pre>
                        </div>
                        <div>
                          <div className="text-[10px] uppercase font-bold text-pearl-400 mb-1 flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Expected Output:
                          </div>
                          <pre className="p-2.5 bg-midnight-900 rounded-lg text-emerald-300 overflow-x-auto whitespace-pre-wrap select-all">
                            {activeQuiz[currentIdx].programmingDetails?.sampleExpectedOutput || '(No output)'}
                          </pre>
                        </div>
                      </div>
                    )}

                    {/* Interactive Monaco Code Editor */}
                    <div className="h-[380px] rounded-xl overflow-hidden border border-midnight-800 shadow-xl">
                      <CodeEditor
                        language={selectedLanguage[activeQuiz[currentIdx].questionId] || 'python'}
                        onLanguageChange={(newLang) =>
                          handleLanguageChange(activeQuiz[currentIdx].questionId, newLang)
                        }
                        sourceCode={
                          codeDrafts[activeQuiz[currentIdx].questionId]?.[
                            selectedLanguage[activeQuiz[currentIdx].questionId] || 'python'
                          ] ||
                          userAnswers[activeQuiz[currentIdx].questionId] ||
                          ''
                        }
                        onChange={(val) =>
                          handleCodeChange(
                            activeQuiz[currentIdx].questionId,
                            selectedLanguage[activeQuiz[currentIdx].questionId] || 'python',
                            val
                          )
                        }
                        starterCodeMap={activeQuiz[currentIdx].programmingDetails?.starterCode || {}}
                        supportedLanguages={
                          activeQuiz[currentIdx].programmingDetails?.supportedLanguages || [
                            'python',
                            'java',
                            'cpp',
                            'c',
                          ]
                        }
                      />
                    </div>

                    {/* Run Code Control Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-midnight-950 rounded-xl border border-midnight-800 text-white">
                      <div className="flex items-center gap-3">
                        <Button
                          type="button"
                          variant="electric"
                          size="sm"
                          leftIcon={
                            isRunningCode[activeQuiz[currentIdx].questionId] ? (
                              <Loader2 className="w-4 h-4 animate-spin text-white" />
                            ) : (
                              <Play className="w-4 h-4 fill-white text-white" />
                            )
                          }
                          disabled={isRunningCode[activeQuiz[currentIdx].questionId]}
                          onClick={() => handleRunCode(activeQuiz[currentIdx])}
                          className="font-bold shadow-lg"
                        >
                          {isRunningCode[activeQuiz[currentIdx].questionId] ? 'Executing...' : 'Run Code'}
                        </Button>

                        <label className="flex items-center gap-2 text-xs font-medium text-pearl-300 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={Boolean(useCustomInput[activeQuiz[currentIdx].questionId])}
                            onChange={(e) =>
                              setUseCustomInput((prev) => ({
                                ...prev,
                                [activeQuiz[currentIdx].questionId]: e.target.checked,
                              }))
                            }
                            className="rounded border-midnight-700 bg-midnight-900 text-indigo-brand focus:ring-indigo-brand w-4 h-4 cursor-pointer"
                          />
                          <span>Custom Input</span>
                        </label>
                      </div>

                      {runResults[activeQuiz[currentIdx].questionId]?.summary && (
                        <div className="flex items-center gap-2">
                          {runResults[activeQuiz[currentIdx].questionId].summary.passed ===
                          runResults[activeQuiz[currentIdx].questionId].summary.total ? (
                            <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-800/80 px-2.5 py-1 rounded-lg">
                              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                              Passed (
                              {runResults[activeQuiz[currentIdx].questionId].summary.passed}/
                              {runResults[activeQuiz[currentIdx].questionId].summary.total})
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5 text-xs font-bold text-amber-400 bg-amber-950/80 border border-amber-800/80 px-2.5 py-1 rounded-lg">
                              <AlertTriangle className="w-4 h-4 text-amber-400" />
                              Failed (
                              {runResults[activeQuiz[currentIdx].questionId].summary.passed}/
                              {runResults[activeQuiz[currentIdx].questionId].summary.total})
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Custom Input Textarea */}
                    {useCustomInput[activeQuiz[currentIdx].questionId] && (
                      <div className="p-3 bg-midnight-950 rounded-xl border border-midnight-800 space-y-1.5 animate-fadeIn">
                        <div className="text-[11px] font-mono text-pearl-400 uppercase font-bold flex items-center gap-1.5">
                          <Terminal className="w-3.5 h-3.5 text-indigo-glow" /> Standard Input (stdin):
                        </div>
                        <textarea
                          rows={3}
                          value={customInput[activeQuiz[currentIdx].questionId] || ''}
                          onChange={(e) =>
                            setCustomInput((prev) => ({
                              ...prev,
                              [activeQuiz[currentIdx].questionId]: e.target.value,
                            }))
                          }
                          placeholder="Enter your custom input data here..."
                          className="w-full bg-midnight-900 border border-midnight-800 rounded-lg p-2.5 text-xs font-mono text-white placeholder-pearl-500 focus:outline-none focus:border-indigo-brand"
                        />
                      </div>
                    )}

                    {/* Test Results Output Panel */}
                    {runResults[activeQuiz[currentIdx].questionId]?.results && (
                      <div className="bg-midnight-950 border border-midnight-800 rounded-xl p-4 space-y-3 animate-fadeIn">
                        <div className="flex items-center justify-between border-b border-midnight-800 pb-2">
                          <span className="text-xs font-mono font-bold uppercase text-pearl-300 flex items-center gap-1.5">
                            <Terminal className="w-3.5 h-3.5 text-indigo-glow" /> Execution Terminal
                          </span>
                          <span className="text-[11px] font-mono text-pearl-400">
                            {runResults[activeQuiz[currentIdx].questionId].results.length} Test Case(s)
                          </span>
                        </div>

                        <div className="space-y-3">
                          {runResults[activeQuiz[currentIdx].questionId].results.map(
                            (res: any, rIdx: number) => (
                              <div
                                key={rIdx}
                                className={`p-3 rounded-lg border text-xs font-mono space-y-2 ${
                                  res.passed
                                    ? 'bg-emerald-950/20 border-emerald-800/40'
                                    : 'bg-rose-950/20 border-rose-800/40'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    {res.passed ? (
                                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                    ) : (
                                      <XCircle className="w-4 h-4 text-rose-400" />
                                    )}
                                    <span className="font-bold text-white">
                                      {res.description || `Test Case #${rIdx + 1}`}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                        res.passed
                                          ? 'bg-emerald-500/20 text-emerald-300'
                                          : 'bg-rose-500/20 text-rose-300'
                                      }`}
                                    >
                                      {res.verdict}
                                    </span>
                                    <span className="text-[10px] text-pearl-400">{res.timeMs || 0}ms</span>
                                  </div>
                                </div>

                                {res.compileOutput && (
                                  <div className="space-y-1">
                                    <span className="text-[10px] uppercase text-rose-300 block">
                                      Compilation Error:
                                    </span>
                                    <pre className="p-2 bg-midnight-900 rounded text-rose-300 text-[11px] overflow-x-auto whitespace-pre-wrap">
                                      {res.compileOutput}
                                    </pre>
                                  </div>
                                )}

                                {res.stderr && (
                                  <div className="space-y-1">
                                    <span className="text-[10px] uppercase text-rose-300 block">
                                      Runtime Error / Stderr:
                                    </span>
                                    <pre className="p-2 bg-midnight-900 rounded text-rose-300 text-[11px] overflow-x-auto whitespace-pre-wrap">
                                      {res.stderr}
                                    </pre>
                                  </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] pt-1">
                                  <div>
                                    <span className="text-[10px] uppercase text-pearl-400 block mb-0.5">
                                      Input:
                                    </span>
                                    <pre className="p-2 bg-midnight-900 rounded text-pearl-200 overflow-x-auto whitespace-pre-wrap">
                                      {res.input || '(None)'}
                                    </pre>
                                  </div>
                                  <div>
                                    <span className="text-[10px] uppercase text-pearl-400 block mb-0.5">
                                      Your Output:
                                    </span>
                                    <pre
                                      className={`p-2 bg-midnight-900 rounded overflow-x-auto whitespace-pre-wrap ${
                                        res.passed ? 'text-emerald-300' : 'text-rose-300'
                                      }`}
                                    >
                                      {res.actualOutput || '(No output)'}
                                    </pre>
                                  </div>
                                </div>

                                {res.expectedOutput && (
                                  <div>
                                    <span className="text-[10px] uppercase text-pearl-400 block mb-0.5">
                                      Expected Output:
                                    </span>
                                    <pre className="p-2 bg-midnight-900 rounded text-emerald-300 overflow-x-auto whitespace-pre-wrap">
                                      {res.expectedOutput}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    )}
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
                      <div className="p-2.5 rounded bg-white border border-pearl-200">
                        <span className="font-bold text-midnight-700 block mb-1">Your Answer / Solution:</span>
                        {String(r.userAnswer || '').includes('\n') ? (
                          <pre className="font-mono text-[10px] text-midnight-950 bg-pearl-50 p-2 rounded border border-pearl-200 overflow-x-auto whitespace-pre-wrap max-h-44">
                            {r.userAnswer}
                          </pre>
                        ) : (
                          <span className="font-mono text-midnight-900 font-semibold">
                            {r.userAnswer || 'No response'}
                          </span>
                        )}
                      </div>
                      <div className="p-2.5 rounded bg-white border border-emerald-200">
                        <span className="font-bold text-emerald-800 block mb-1">Evaluation / Correct Output:</span>
                        {String(r.correctAnswer || '').includes('\n') ? (
                          <pre className="font-mono text-[10px] text-emerald-950 bg-emerald-50/50 p-2 rounded border border-emerald-200 overflow-x-auto whitespace-pre-wrap max-h-44">
                            {r.correctAnswer}
                          </pre>
                        ) : (
                          <span className="font-mono text-emerald-950 font-semibold">
                            {r.correctAnswer}
                          </span>
                        )}
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
