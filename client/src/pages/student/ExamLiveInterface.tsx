import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { CodeEditor } from '../../components/programming/CodeEditor';
import { ProblemStatementPanel } from '../../components/programming/ProblemStatementPanel';
import { ExecutionConsole } from '../../components/programming/ExecutionConsole';
import { ProgrammingLanguage } from '../../types';
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Bookmark,
  Send,
  ShieldAlert,
  Loader2,
  Code2,
  Grid,
  X,
  FileCode,
  Lock,
} from 'lucide-react';

export const StudentExamLive: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();

  const [session, setSession] = useState<any>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [reviews, setReviews] = useState<Record<string, boolean>>({});
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
  const [isAutosaving, setIsAutosaving] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<string>('Saved');
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [exitPassword, setExitPassword] = useState('');
  const [tamperWarning, setTamperWarning] = useState<string | null>(null);
  const [isPaletteDrawerOpen, setIsPaletteDrawerOpen] = useState(false);

  // Programming specific state
  const [selectedLanguage, setSelectedLanguage] = useState<Record<string, ProgrammingLanguage>>({});
  const [codeDrafts, setCodeDrafts] = useState<Record<string, Record<string, string>>>({});
  const [customInputs, setCustomInputs] = useState<Record<string, string>>({});
  const [runResultsMap, setRunResultsMap] = useState<Record<string, any>>({});
  const [submissionResultsMap, setSubmissionResultsMap] = useState<Record<string, any>>({});
  const [submissionsHistory, setSubmissionsHistory] = useState<Record<string, any[]>>({});
  const [lastActionMap, setLastActionMap] = useState<Record<string, 'run' | 'submit' | null>>({});
  const [isRunningCode, setIsRunningCode] = useState(false);
  const [isSubmittingCode, setIsSubmittingCode] = useState(false);
  const [isDraftSaving, setIsDraftSaving] = useState(false);
  const [lastDraftSavedTime, setLastDraftSavedTime] = useState<string>('Draft saved');
  const [mobileTab, setMobileTab] = useState<'problem' | 'code' | 'console'>('code');

  const draftSaveTimeoutRef = useRef<any>(null);

  const attemptId = sessionStorage.getItem('evaltech_attempt_id');
  const submissionToken = sessionStorage.getItem('evaltech_submission_token');

  // Load active session from sessionStorage or restore from server
  useEffect(() => {
    const cached = sessionStorage.getItem('evaltech_exam_session');
    if (!cached || !attemptId || !submissionToken) {
      navigate(`/exam/${code || 'join'}`);
      return;
    }

    try {
      const parsed = JSON.parse(cached);
      setSession(parsed);
      setAnswers(parsed.savedAnswers || {});
      setReviews(parsed.reviewStatus || {});

      // Initialize programming drafts and starter templates
      const initialLanguages: Record<string, ProgrammingLanguage> = {};
      const initialCodes: Record<string, Record<string, string>> = {};

      (parsed.questions || []).forEach((q: any) => {
        if (q.type === 'programming' && q.programmingDetails) {
          const supported = (q.programmingDetails.supportedLanguages || [
            'python',
            'java',
            'cpp',
            'c',
          ]) as ProgrammingLanguage[];
          const serverDraft = parsed.programmingDrafts?.[q.id];
          const defaultLang = (serverDraft?.language as ProgrammingLanguage) || supported[0] || 'python';
          initialLanguages[q.id] = defaultLang;

          initialCodes[q.id] = {};
          supported.forEach((l: string) => {
            initialCodes[q.id][l] = q.programmingDetails.starterCode?.[l] || '';
          });

          if (serverDraft && serverDraft.sourceCode) {
            initialCodes[q.id][serverDraft.language] = serverDraft.sourceCode;
          }
        }
      });

      setSelectedLanguage(initialLanguages);
      setCodeDrafts(initialCodes);

      // Calculate initial remaining seconds based on server expiresAt
      const expiresAt = new Date(parsed.expiresAt).getTime();
      const diffSecs = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      setRemainingSeconds(diffSecs);
    } catch {
      navigate(`/exam/${code || 'join'}`);
    }
  }, [code, navigate, attemptId, submissionToken]);

  // Load previous scored code submissions for this attempt
  useEffect(() => {
    if (!attemptId) return;

    api
      .get(`/code-executions/attempts/${attemptId}/submissions`)
      .then((res) => {
        const subs = res.data?.data || [];
        const grouped: Record<string, any[]> = {};
        subs.forEach((s: any) => {
          const qId = s.questionId?.toString() || s.questionId;
          if (!grouped[qId]) grouped[qId] = [];
          grouped[qId].push(s);
        });
        setSubmissionsHistory(grouped);

        // Mark answered questions
        setAnswers((prev) => {
          const updated = { ...prev };
          Object.keys(grouped).forEach((qId) => {
            if (grouped[qId].length > 0) {
              updated[qId] = {
                submitted: true,
                verdict: grouped[qId][0].verdict,
                marksObtained: grouped[qId][0].marksObtained,
              };
            }
          });
          return updated;
        });
      })
      .catch(() => {});
  }, [attemptId]);

  // Synchronized Countdown Timer
  useEffect(() => {
    if (remainingSeconds <= 0 && session) return;

    const timer = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [remainingSeconds, session]);

  // Anti-tamper window blur / visibility tracker
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && attemptId && submissionToken) {
        setTamperWarning('Warning: Tab switch or window minimization detected and logged.');
        api
          .post(`/attempts/${attemptId}/event`, {
            submissionToken,
            event: 'tab_switch',
            details: 'User navigated away from examination window',
          })
          .catch(() => {});

        setTimeout(() => setTamperWarning(null), 5000);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [attemptId, submissionToken]);

  // Autosave single answer for objective / subjective questions
  const persistAnswer = async (questionId: string, val: any, isMarked: boolean) => {
    if (!attemptId || !submissionToken) return;

    setIsAutosaving(true);
    try {
      await api.post(`/attempts/${attemptId}/answer`, {
        submissionToken,
        questionId,
        answerValue: val,
        isMarkedForReview: isMarked,
      });
      setLastSavedTime(
        new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    } catch (err: any) {
      console.error('Autosave error:', err);
    } finally {
      setIsAutosaving(false);
    }
  };

  const handleSelectOption = (questionId: string, optionId: string) => {
    const updated = { ...answers, [questionId]: optionId };
    setAnswers(updated);
    persistAnswer(questionId, optionId, Boolean(reviews[questionId]));
  };

  const handleSelectMultipleOption = (questionId: string, optionId: string) => {
    const current = (answers[questionId] as string[]) || [];
    const updatedList = current.includes(optionId)
      ? current.filter((id) => id !== optionId)
      : [...current, optionId];

    const updated = { ...answers, [questionId]: updatedList };
    setAnswers(updated);
    persistAnswer(questionId, updatedList, Boolean(reviews[questionId]));
  };

  const handleTextAnswerChange = (questionId: string, text: string) => {
    const updated = { ...answers, [questionId]: text };
    setAnswers(updated);
    persistAnswer(questionId, text, Boolean(reviews[questionId]));
  };

  const toggleReview = (questionId: string) => {
    const nextVal = !reviews[questionId];
    const updated = { ...reviews, [questionId]: nextVal };
    setReviews(updated);
    persistAnswer(questionId, answers[questionId], nextVal);
  };

  // Programming: Code Editor change handler with debounced autosave
  const handleCodeChange = (newCode: string) => {
    const currentQ = session?.questions?.[currentIndex];
    if (!currentQ || currentQ.type !== 'programming') return;
    const qId = currentQ.id;
    const lang = selectedLanguage[qId] || 'python';

    setCodeDrafts((prev) => ({
      ...prev,
      [qId]: {
        ...(prev[qId] || {}),
        [lang]: newCode,
      },
    }));

    if (!attemptId || !submissionToken) return;

    if (draftSaveTimeoutRef.current) {
      clearTimeout(draftSaveTimeoutRef.current);
    }

    setIsDraftSaving(true);
    draftSaveTimeoutRef.current = setTimeout(async () => {
      try {
        await api.post(`/code-executions/attempts/${attemptId}/draft-code`, {
          submissionToken,
          questionId: qId,
          language: lang,
          sourceCode: newCode,
        });
        setLastDraftSavedTime(
          new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        );
      } catch (err) {
        console.error('Draft autosave error:', err);
      } finally {
        setIsDraftSaving(false);
      }
    }, 1200);
  };

  const handleLanguageChange = (newLang: ProgrammingLanguage) => {
    const currentQ = session?.questions?.[currentIndex];
    if (!currentQ || currentQ.type !== 'programming') return;
    const qId = currentQ.id;

    setSelectedLanguage((prev) => ({ ...prev, [qId]: newLang }));

    // If no draft exists for this language yet, initialize with default starter code
    if (!codeDrafts[qId]?.[newLang]) {
      const defaultStarter = currentQ.programmingDetails?.starterCode?.[newLang] || '';
      setCodeDrafts((prev) => ({
        ...prev,
        [qId]: {
          ...(prev[qId] || {}),
          [newLang]: defaultStarter,
        },
      }));
    }
  };

  // Practice "Run Code"
  const handleRunCode = async () => {
    const currentQ = session?.questions?.[currentIndex];
    if (!currentQ || currentQ.type !== 'programming') return;
    if (isRunningCode || isSubmittingCode) return;

    const qId = currentQ.id;
    const lang = selectedLanguage[qId] || 'python';
    const code = codeDrafts[qId]?.[lang] || '';
    const customIn = customInputs[qId] || '';

    setIsRunningCode(true);
    try {
      const res = await api.post('/code-executions/run', {
        attemptId,
        submissionToken,
        questionId: qId,
        language: lang,
        sourceCode: code,
        customInput: customIn,
      });

      setRunResultsMap((prev) => ({ ...prev, [qId]: res.data?.data }));
      setLastActionMap((prev) => ({ ...prev, [qId]: 'run' }));
      setMobileTab('console');
    } catch (err: any) {
      alert(err.message || 'Run code failed');
    } finally {
      setIsRunningCode(false);
    }
  };

  // Scored "Submit Solution"
  const handleSubmitSolution = async () => {
    const currentQ = session?.questions?.[currentIndex];
    if (!currentQ || currentQ.type !== 'programming') return;
    if (isRunningCode || isSubmittingCode) return;

    const qId = currentQ.id;
    const lang = selectedLanguage[qId] || 'python';
    const code = codeDrafts[qId]?.[lang] || '';

    if (!code.trim()) {
      alert('Source code cannot be empty.');
      return;
    }

    setIsSubmittingCode(true);
    try {
      const res = await api.post('/code-executions/submit', {
        attemptId,
        submissionToken,
        questionId: qId,
        language: lang,
        sourceCode: code,
      });

      const submissionData = res.data?.data;
      setSubmissionResultsMap((prev) => ({ ...prev, [qId]: submissionData }));
      setLastActionMap((prev) => ({ ...prev, [qId]: 'submit' }));

      // Add to submission history
      setSubmissionsHistory((prev) => ({
        ...prev,
        [qId]: [submissionData, ...(prev[qId] || [])],
      }));

      // Mark this question as answered in the palette
      setAnswers((prev) => ({
        ...prev,
        [qId]: {
          submitted: true,
          verdict: submissionData?.verdict,
          marksObtained: submissionData?.marksObtained,
        },
      }));

      setMobileTab('console');
    } catch (err: any) {
      alert(err.message || 'Submit solution failed');
    } finally {
      setIsSubmittingCode(false);
    }
  };

  const handleAutoSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await api.post(`/attempts/${attemptId}/submit`, {
        submissionToken,
      });
      sessionStorage.setItem('evaltech_submission_result', JSON.stringify(res.data?.data));
      navigate(`/exam/${code}/submitted`);
    } catch {
      navigate(`/exam/${code}/submitted`);
    }
  };

  const handleManualSubmit = async () => {
    setIsSubmitting(true);
    try {
      const res = await api.post(`/attempts/${attemptId}/submit`, {
        submissionToken,
        exitPassword: session?.exam?.requireExitPassword ? exitPassword : undefined,
      });
      sessionStorage.setItem('evaltech_submission_result', JSON.stringify(res.data?.data));
      navigate(`/exam/${code}/submitted`);
    } catch (err: any) {
      alert(err.message || 'Failed to submit exam.');
      setIsSubmitting(false);
    }
  };

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-midnight-950">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-glow" />
      </div>
    );
  }

  const questions = session.questions || [];
  const currentQ = questions[currentIndex];
  if (!currentQ) return null;

  const currentAnswer = answers[currentQ.id];
  const isCurrentMarked = Boolean(reviews[currentQ.id]);
  const isProgrammingQ = currentQ.type === 'programming';

  // Current programming values
  const currentLang = selectedLanguage[currentQ.id] || 'python';
  const currentSourceCode =
    codeDrafts[currentQ.id]?.[currentLang] !== undefined
      ? codeDrafts[currentQ.id][currentLang]
      : currentQ.programmingDetails?.starterCode?.[currentLang] || '';
  const currentCustomInput = customInputs[currentQ.id] || '';
  const currentRunResults = runResultsMap[currentQ.id];
  const currentSubmitResults = submissionResultsMap[currentQ.id];
  const currentSubmissions = submissionsHistory[currentQ.id] || [];
  const currentLastAction = lastActionMap[currentQ.id] || null;

  // Formatter for timer: MM:SS
  const mins = Math.floor(remainingSeconds / 60);
  const secs = remainingSeconds % 60;
  const timeFormatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  const isUrgent = remainingSeconds <= 300; // < 5 mins

  // Count answered questions
  const answeredCount = Object.keys(answers).filter((k) => {
    const a = answers[k];
    if (a === null || a === undefined) return false;
    if (typeof a === 'object' && a.submitted !== undefined) return a.submitted;
    return Array.isArray(a) ? a.length > 0 : String(a).trim() !== '';
  }).length;

  return (
    <div className="min-h-screen bg-pearl-50 dark:bg-midnight-950 text-midnight-900 dark:text-pearl-100 flex flex-col selection:bg-indigo-brand selection:text-white">
      {/* Anti-tamper Warning Alert */}
      {tamperWarning && (
        <div className="bg-rose-600 text-white px-4 py-2 text-center text-xs font-bold flex items-center justify-center gap-2 animate-fadeIn z-50 sticky top-0">
          <ShieldAlert className="w-4 h-4" />
          <span>{tamperWarning}</span>
        </div>
      )}

      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-midnight-950 text-white border-b border-midnight-800 px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsPaletteDrawerOpen(true)}
            className="p-2 rounded-lg bg-midnight-900 hover:bg-midnight-800 border border-midnight-700 text-pearl-300 hover:text-white transition-colors"
            title="Open Question Palette"
          >
            <Grid className="w-4 h-4" />
          </button>

          <div>
            <span className="text-[10px] uppercase font-bold text-indigo-glow font-mono tracking-wider">
              {session.exam.examCode} • {session.student.name}
            </span>
            <h2 className="text-xs sm:text-sm font-extrabold text-white truncate max-w-[200px] sm:max-w-md">
              {session.exam.title}
            </h2>
          </div>
        </div>

        {/* Quick Question Carousel Chips (Desktop) */}
        <div className="hidden md:flex items-center gap-1.5 overflow-x-auto max-w-md py-1">
          {questions.map((q: any, idx: number) => {
            const hasAns = Boolean(answers[q.id]);
            const isRev = Boolean(reviews[q.id]);
            const isCurr = idx === currentIndex;

            let badgeClass = 'bg-midnight-900 text-pearl-400 border-midnight-800';
            if (hasAns) badgeClass = 'bg-emerald-600 text-white border-emerald-500';
            if (isRev) badgeClass = 'bg-purple-600 text-white border-purple-500';
            if (isCurr) badgeClass += ' ring-2 ring-indigo-glow ring-offset-1 ring-offset-midnight-950 font-bold';

            return (
              <button
                key={q.id}
                onClick={() => setCurrentIndex(idx)}
                className={`w-7 h-7 rounded-lg border text-xs font-mono flex items-center justify-center shrink-0 transition-all ${badgeClass}`}
                title={`Q${idx + 1} (${q.type})`}
              >
                {q.type === 'programming' ? <Code2 className="w-3.5 h-3.5" /> : idx + 1}
              </button>
            );
          })}
        </div>

        {/* Timer & Finish Exam CTAs */}
        <div className="flex items-center gap-3">
          <div
            className={`px-3 py-1.5 rounded-lg border font-mono text-xs sm:text-sm font-extrabold flex items-center gap-2 ${
              isUrgent
                ? 'bg-rose-950/80 border-rose-500 text-rose-400 animate-pulse'
                : 'bg-midnight-900 border-midnight-700 text-white'
            }`}
          >
            <Clock className={`w-3.5 h-3.5 ${isUrgent ? 'text-rose-400' : 'text-indigo-glow'}`} />
            <span>{timeFormatted}</span>
          </div>

          <Button
            variant="electric"
            size="sm"
            onClick={() => setIsSubmitModalOpen(true)}
            rightIcon={<Send className="w-3.5 h-3.5" />}
            className="text-xs px-2.5 sm:px-3"
          >
            <span className="hidden sm:inline">Finish Exam</span>
            <span className="sm:hidden">Submit</span>
          </Button>
        </div>
      </header>

      {/* Main Examination Workspace */}
      {isProgrammingQ ? (
        /* PROGRAMMING QUESTION IDE LAYOUT */
        <div className="flex-1 flex flex-col h-[calc(100vh-61px)] overflow-hidden">
          {/* Subheader Toolbar with Question Switcher and Review Mark */}
          <div className="bg-midnight-900 border-b border-midnight-800 px-3 sm:px-4 py-2 flex items-center justify-between text-xs font-mono text-pearl-300">
            <div className="flex items-center gap-2 sm:gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
                disabled={currentIndex === 0}
                className="py-1 px-2 sm:px-2.5 h-7 text-xs bg-midnight-950 border-midnight-700 text-pearl-200"
                leftIcon={<ChevronLeft className="w-3.5 h-3.5" />}
              >
                <span className="hidden sm:inline">Prev</span>
              </Button>

              <span className="font-bold text-white text-[11px] sm:text-xs">
                Q{currentIndex + 1}/{questions.length} <span className="hidden sm:inline">(Programming)</span>
              </span>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentIndex(Math.min(questions.length - 1, currentIndex + 1))}
                disabled={currentIndex === questions.length - 1}
                className="py-1 px-2 sm:px-2.5 h-7 text-xs bg-midnight-950 border-midnight-700 text-pearl-200"
                rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
              >
                <span className="hidden sm:inline">Next</span>
              </Button>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => toggleReview(currentQ.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold transition-colors ${
                  isCurrentMarked
                    ? 'bg-purple-900/60 text-purple-300 border border-purple-500'
                    : 'bg-midnight-950 text-pearl-400 hover:text-white border border-midnight-800'
                }`}
              >
                <Bookmark className={`w-3.5 h-3.5 ${isCurrentMarked ? 'fill-current' : ''}`} />
                <span className="hidden sm:inline">{isCurrentMarked ? 'Marked for Review' : 'Mark for Review'}</span>
                <span className="sm:hidden">{isCurrentMarked ? 'Marked' : 'Review'}</span>
              </button>
            </div>
          </div>

          {/* Mobile View Tab Switcher for Programming Workspace */}
          <div className="flex lg:hidden items-center border-b border-midnight-800 bg-midnight-950 px-3 py-1.5 gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setMobileTab('problem')}
              className={`flex-1 py-1 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                mobileTab === 'problem'
                  ? 'bg-indigo-brand text-white shadow-subtle'
                  : 'bg-midnight-900 text-pearl-400 hover:text-white border border-midnight-800'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>Problem</span>
            </button>
            <button
              type="button"
              onClick={() => setMobileTab('code')}
              className={`flex-1 py-1 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                mobileTab === 'code'
                  ? 'bg-indigo-brand text-white shadow-subtle'
                  : 'bg-midnight-900 text-pearl-400 hover:text-white border border-midnight-800'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>Editor</span>
            </button>
            <button
              type="button"
              onClick={() => setMobileTab('console')}
              className={`flex-1 py-1 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                mobileTab === 'console'
                  ? 'bg-indigo-brand text-white shadow-subtle'
                  : 'bg-midnight-900 text-pearl-400 hover:text-white border border-midnight-800'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Console</span>
            </button>
          </div>

          {/* Desktop Dual-Pane / Mobile Tabs */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-hidden">
            {/* Left Pane: Problem Statement (5 cols on lg) */}
            <div
              className={`lg:col-span-5 h-full p-3 overflow-hidden border-r border-pearl-200 dark:border-midnight-800 ${
                mobileTab === 'problem' ? 'flex flex-col' : 'hidden lg:flex lg:flex-col'
              }`}
            >
              <ProblemStatementPanel
                questionNumber={currentIndex + 1}
                totalQuestions={questions.length}
                marks={currentQ.marks}
                difficulty={currentQ.programmingDetails?.difficulty || 'medium'}
                title={currentQ.programmingDetails?.title || currentQ.title || currentQ.text}
                problemStatement={currentQ.programmingDetails?.problemStatement || currentQ.text}
                problemDescriptionMarkdown={currentQ.programmingDetails?.problemDescriptionMarkdown}
                inputFormat={currentQ.programmingDetails?.inputFormat}
                outputFormat={currentQ.programmingDetails?.outputFormat}
                constraints={currentQ.programmingDetails?.constraints}
                sampleTestCases={currentQ.programmingDetails?.sampleTestCases || []}
                sampleInput={currentQ.programmingDetails?.sampleInput}
                sampleExpectedOutput={currentQ.programmingDetails?.sampleExpectedOutput}
                sampleExplanation={currentQ.programmingDetails?.sampleExplanation}
                timeLimitSeconds={currentQ.programmingDetails?.timeLimitSeconds}
                memoryLimitMb={currentQ.programmingDetails?.memoryLimitMb}
                submissions={currentSubmissions}
              />
            </div>

            {/* Right Pane: Code Editor + Execution Console (7 cols on lg) */}
            <div
              className={`lg:col-span-7 h-full flex flex-col p-3 gap-3 overflow-hidden bg-midnight-950 ${
                mobileTab !== 'problem' ? 'flex' : 'hidden lg:flex'
              }`}
            >
              <div
                className={`flex-1 min-h-[260px] overflow-hidden ${
                  mobileTab === 'console' ? 'hidden sm:block' : 'block'
                }`}
              >
                <CodeEditor
                  language={currentLang}
                  onLanguageChange={handleLanguageChange}
                  sourceCode={currentSourceCode}
                  onChange={handleCodeChange}
                  starterCodeMap={currentQ.programmingDetails?.starterCode || {}}
                  isAutosaving={isDraftSaving}
                  lastSavedText={`Autosaved ${lastDraftSavedTime}`}
                  supportedLanguages={
                    currentQ.programmingDetails?.supportedLanguages || ['python', 'java', 'cpp', 'c']
                  }
                />
              </div>

              {/* Execution Console Dock */}
              <div className="shrink-0">
                <ExecutionConsole
                  onRunCode={handleRunCode}
                  onSubmitSolution={handleSubmitSolution}
                  isRunning={isRunningCode}
                  isSubmitting={isSubmittingCode}
                  customInput={currentCustomInput}
                  onCustomInputChange={(val) =>
                    setCustomInputs((prev) => ({ ...prev, [currentQ.id]: val }))
                  }
                  runResults={currentRunResults}
                  submissionResults={currentSubmitResults}
                  lastAction={currentLastAction}
                />
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* STANDARD QUESTION LAYOUT (MCQ, Multiple Select, Fill Blank, Short/Long Answer) */
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Question Area (Left 3 cols) */}
          <div className="lg:col-span-3 space-y-4">
            <Card className="border-pearl-200 shadow-md">
              <CardContent className="pt-6 space-y-5">
                {/* Question Header */}
                <div className="flex items-center justify-between pb-3 border-b border-pearl-100">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-indigo-brand bg-indigo-50 px-2.5 py-1 rounded">
                      Question {currentIndex + 1} of {questions.length}
                    </span>
                    <span className="text-xs font-semibold text-midnight-600 uppercase">
                      {currentQ.type.replace('_', ' ')} • {currentQ.marks} Mark{currentQ.marks > 1 ? 's' : ''}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleReview(currentQ.id)}
                    className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded transition-colors ${
                      isCurrentMarked
                        ? 'bg-purple-100 text-indigo-brand border border-indigo-brand/40'
                        : 'bg-pearl-100 text-midnight-600 hover:bg-pearl-200'
                    }`}
                  >
                    <Bookmark className={`w-3.5 h-3.5 ${isCurrentMarked ? 'fill-current' : ''}`} />
                    <span>{isCurrentMarked ? 'Marked for Review' : 'Mark for Review'}</span>
                  </button>
                </div>

                {/* Question Text */}
                <div className="space-y-3">
                  <p className="text-base sm:text-lg font-bold text-midnight-950 leading-relaxed">
                    {currentQ.text}
                  </p>

                  {currentQ.codeSnippet && (
                    <pre className="p-4 rounded-xl bg-midnight-950 text-pearl-100 font-mono text-xs overflow-x-auto border border-midnight-800">
                      <code>{currentQ.codeSnippet}</code>
                    </pre>
                  )}
                </div>

                {/* Options Section */}
                <div className="pt-2">
                  {/* Single Choice (MCQ or True/False) */}
                  {(currentQ.type === 'mcq' || currentQ.type === 'true_false') && (
                    <div className="space-y-2.5">
                      {currentQ.options?.map((opt: any) => {
                        const isSelected = currentAnswer === opt.id;
                        return (
                          <div
                            key={opt.id}
                            onClick={() => handleSelectOption(currentQ.id, opt.id)}
                            className={`p-3.5 rounded-xl border text-sm font-semibold flex items-center justify-between cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-indigo-50/80 border-indigo-brand text-indigo-brand shadow-subtle ring-1 ring-indigo-brand/20'
                                : 'bg-white border-pearl-200 text-midnight-800 hover:border-pearl-300'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <span
                                className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                                  isSelected
                                    ? 'border-indigo-brand bg-indigo-brand text-white'
                                    : 'border-pearl-300'
                                }`}
                              >
                                {isSelected && <span className="w-2 h-2 rounded-full bg-white" />}
                              </span>
                              <span>{opt.text}</span>
                            </div>
                            {isSelected && <CheckCircle2 className="w-4 h-4 text-indigo-brand" />}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Multiple Select */}
                  {currentQ.type === 'multiple_select' && (
                    <div className="space-y-2.5">
                      <p className="text-xs text-midnight-600 italic mb-2">
                        Select all options that apply (partial marks may be awarded):
                      </p>
                      {currentQ.options?.map((opt: any) => {
                        const isSelected = Array.isArray(currentAnswer) && currentAnswer.includes(opt.id);
                        return (
                          <div
                            key={opt.id}
                            onClick={() => handleSelectMultipleOption(currentQ.id, opt.id)}
                            className={`p-3.5 rounded-xl border text-sm font-semibold flex items-center justify-between cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-indigo-50/80 border-indigo-brand text-indigo-brand shadow-subtle'
                                : 'bg-white border-pearl-200 text-midnight-800 hover:border-pearl-300'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <span
                                className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${
                                  isSelected
                                    ? 'border-indigo-brand bg-indigo-brand text-white'
                                    : 'border-pearl-300'
                                }`}
                              >
                                {isSelected && '✓'}
                              </span>
                              <span>{opt.text}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Fill in the Blanks / Short Answer */}
                  {(currentQ.type === 'fill_blank' ||
                    currentQ.type === 'short_answer' ||
                    currentQ.type === 'long_answer') && (
                    <div className="space-y-2">
                      <textarea
                        rows={currentQ.type === 'long_answer' ? 6 : 3}
                        className="w-full rounded-xl border border-pearl-300 p-3.5 text-sm text-midnight-900 focus:border-indigo-brand focus:outline-none"
                        placeholder="Type your answer response here..."
                        value={currentAnswer || ''}
                        onChange={(e) => handleTextAnswerChange(currentQ.id, e.target.value)}
                      />
                    </div>
                  )}
                </div>

                {/* Navigation Controls */}
                <div className="flex items-center justify-between pt-6 border-t border-pearl-100">
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<ChevronLeft className="w-4 h-4" />}
                    onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
                    disabled={currentIndex === 0}
                  >
                    Previous
                  </Button>

                  <div className="flex items-center gap-2 text-xs text-midnight-600 font-mono">
                    {isAutosaving ? (
                      <span className="flex items-center gap-1.5 text-indigo-brand">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-emerald-600 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Auto-saved ({lastSavedTime})
                      </span>
                    )}
                  </div>

                  <Button
                    variant="primary"
                    size="sm"
                    rightIcon={<ChevronRight className="w-4 h-4" />}
                    onClick={() => setCurrentIndex(Math.min(questions.length - 1, currentIndex + 1))}
                    disabled={currentIndex === questions.length - 1}
                  >
                    Next
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Question Palette Sidebar (Right 1 col) */}
          <div className="space-y-4">
            <Card className="border-pearl-200">
              <CardContent className="pt-5 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-midnight-700">
                  Question Palette
                </h3>

                {/* Status Legend */}
                <div className="grid grid-cols-2 gap-2 text-[10px] font-semibold text-midnight-600 pb-2 border-b border-pearl-100">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded bg-emerald-500" /> Answered ({answeredCount})
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded bg-purple-500" /> Review
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded bg-pearl-200" /> Unanswered
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded border border-indigo-brand" /> Current
                  </div>
                </div>

                {/* Question Number Badges */}
                <div className="grid grid-cols-5 gap-2">
                  {questions.map((q: any, idx: number) => {
                    const hasAnswer =
                      answers[q.id] !== null &&
                      answers[q.id] !== undefined &&
                      (typeof answers[q.id] === 'object' && answers[q.id].submitted !== undefined
                        ? answers[q.id].submitted
                        : Array.isArray(answers[q.id])
                        ? answers[q.id].length > 0
                        : String(answers[q.id]).trim() !== '');
                    const isReview = reviews[q.id];
                    const isCurrent = idx === currentIndex;

                    let colorClass = 'bg-pearl-100 text-midnight-700 border-pearl-200';
                    if (hasAnswer) colorClass = 'bg-emerald-600 text-white border-emerald-600';
                    if (isReview) colorClass = 'bg-purple-600 text-white border-purple-600';
                    if (isCurrent) colorClass += ' ring-2 ring-indigo-brand ring-offset-1 font-extrabold';

                    return (
                      <button
                        key={q.id}
                        onClick={() => setCurrentIndex(idx)}
                        className={`h-9 rounded-lg border text-xs font-bold flex items-center justify-center transition-all ${colorClass}`}
                      >
                        {q.type === 'programming' ? <Code2 className="w-3.5 h-3.5" /> : idx + 1}
                      </button>
                    );
                  })}
                </div>

                {/* Final Submit CTA */}
                <div className="pt-4 border-t border-pearl-100">
                  <Button
                    variant="electric"
                    className="w-full"
                    size="sm"
                    onClick={() => setIsSubmitModalOpen(true)}
                  >
                    Submit Examination
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      )}

      {/* Slide-Over Question Palette Drawer (Available anywhere, especially in IDE mode) */}
      {isPaletteDrawerOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end animate-fadeIn">
          <div className="w-full max-w-xs bg-white dark:bg-midnight-900 border-l border-pearl-200 dark:border-midnight-800 p-5 flex flex-col justify-between shadow-2xl animate-slideLeft">
            <div className="space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-pearl-200 dark:border-midnight-800">
                <div className="flex items-center gap-2">
                  <Grid className="w-4 h-4 text-indigo-brand" />
                  <h3 className="text-sm font-bold text-midnight-950 dark:text-white uppercase tracking-wider">
                    Question Palette
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPaletteDrawerOpen(false)}
                  className="p-1 rounded-lg text-midnight-500 hover:text-midnight-950 dark:text-pearl-400 dark:hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Status Legend */}
              <div className="grid grid-cols-2 gap-2 text-[10px] font-semibold text-midnight-600 dark:text-pearl-400 pb-2 border-b border-pearl-100 dark:border-midnight-800">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded bg-emerald-500" /> Answered ({answeredCount})
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded bg-purple-500" /> Review
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded bg-pearl-200 dark:bg-midnight-700" /> Unanswered
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded border border-indigo-brand" /> Current
                </div>
              </div>

              {/* Badges Grid */}
              <div className="grid grid-cols-5 gap-2 max-h-[55vh] overflow-y-auto pr-1">
                {questions.map((q: any, idx: number) => {
                  const hasAnswer = Boolean(answers[q.id]);
                  const isReview = reviews[q.id];
                  const isCurrent = idx === currentIndex;

                  let colorClass =
                    'bg-pearl-100 dark:bg-midnight-800 text-midnight-700 dark:text-pearl-300 border-pearl-200 dark:border-midnight-700';
                  if (hasAnswer) colorClass = 'bg-emerald-600 text-white border-emerald-600';
                  if (isReview) colorClass = 'bg-purple-600 text-white border-purple-600';
                  if (isCurrent) colorClass += ' ring-2 ring-indigo-brand ring-offset-1 font-extrabold';

                  return (
                    <button
                      key={q.id}
                      onClick={() => {
                        setCurrentIndex(idx);
                        setIsPaletteDrawerOpen(false);
                      }}
                      className={`h-9 rounded-lg border text-xs font-mono font-bold flex items-center justify-center transition-all ${colorClass}`}
                    >
                      {q.type === 'programming' ? <Code2 className="w-3.5 h-3.5" /> : idx + 1}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 border-t border-pearl-200 dark:border-midnight-800 space-y-2">
              <Button
                variant="electric"
                className="w-full"
                size="sm"
                onClick={() => {
                  setIsPaletteDrawerOpen(false);
                  setIsSubmitModalOpen(true);
                }}
              >
                Finish Examination
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal Before Final Submission */}
      <Modal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        title="Confirm Examination Submission"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-xs text-midnight-600 dark:text-pearl-400 leading-relaxed">
            Are you sure you want to finalize your examination? Once submitted, all your answers and
            programming code solutions will be graded and you cannot re-enter.
          </p>

          <div className="p-3.5 rounded-xl bg-pearl-100 dark:bg-midnight-900 space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-midnight-600 dark:text-pearl-400">Total Questions:</span>
              <span className="font-bold text-midnight-900 dark:text-white">{questions.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-emerald-700 dark:text-emerald-400 font-bold">Answered:</span>
              <span className="font-bold text-emerald-700 dark:text-emerald-400">{answeredCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-rose-600 dark:text-rose-400 font-bold">Unanswered:</span>
              <span className="font-bold text-rose-600 dark:text-rose-400">
                {questions.length - answeredCount}
              </span>
            </div>
          </div>

          {session?.exam?.requireExitPassword && (
            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800 dark:text-amber-300">
                <Lock className="w-3.5 h-3.5" />
                <span>Invigilator Exit Password Required</span>
              </div>
              <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed">
                This examination is protected with an exit password. Your teacher or invigilator must enter the password to allow you to exit and submit.
              </p>
              <input
                type="password"
                required
                placeholder="Enter Exit Password"
                value={exitPassword}
                onChange={(e) => setExitPassword(e.target.value)}
                className="w-full rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-midnight-900 px-3 py-1.5 text-xs text-midnight-900 dark:text-white font-mono focus:outline-none focus:border-amber-500"
              />
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" size="sm" onClick={() => setIsSubmitModalOpen(false)}>
              Continue Working
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleManualSubmit}
              isLoading={isSubmitting}
            >
              Submit Now
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
