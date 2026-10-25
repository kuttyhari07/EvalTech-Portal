import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';
import {
  GraduationCap,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Shield,
  FileQuestion,
  BookOpen,
  Trophy,
  Award,
  Key,
  Lock,
  LogOut,
  User,
  Calendar,
  Sparkles,
  ChevronRight,
  Search,
  Hash,
  Crown,
  Medal,
  Flame,
} from 'lucide-react';

export const StudentDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'exams' | 'leaderboard' | 'results'>('exams');
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Leaderboard state
  const [leaderboardData, setLeaderboardData] = useState<any>(null);
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);

  // Start exam password modal
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [selectedExamForStart, setSelectedExamForStart] = useState<any>(null);
  const [startPasswordInput, setStartPasswordInput] = useState('');
  const [startError, setStartError] = useState<string | null>(null);
  const [isStartingExam, setIsStartingExam] = useState(false);

  // Change password modal
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch student dashboard data
  const fetchDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/student-portal/dashboard');
      setDashboardData(res.data?.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load student dashboard.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch leaderboard data
  const fetchLeaderboard = async (examId?: string) => {
    setLoadingLeaderboard(true);
    try {
      const url = examId
        ? `/student-portal/leaderboard?examId=${examId}`
        : '/student-portal/leaderboard';
      const res = await api.get(url);
      setLeaderboardData(res.data?.data);
      if (res.data?.data?.selectedExam?._id && !selectedExamId) {
        setSelectedExamId(res.data.data.selectedExam._id);
      }
    } catch (err: any) {
      console.error('Failed to load leaderboard:', err);
    } finally {
      setLoadingLeaderboard(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
    fetchLeaderboard();
  }, []);

  const handleSelectExamForLeaderboard = (eId: string) => {
    setSelectedExamId(eId);
    fetchLeaderboard(eId);
  };

  // Handle Start Examination
  const handleInitiateExamStart = (exam: any) => {
    if (exam.requireStartPassword) {
      setSelectedExamForStart(exam);
      setStartPasswordInput('');
      setStartError(null);
      setIsPasswordModalOpen(true);
    } else {
      executeExamStart(exam.examCode);
    }
  };

  const executeExamStart = async (code: string, password?: string) => {
    setIsStartingExam(true);
    setStartError(null);
    try {
      const res = await api.post('/attempts/start', {
        examCode: code,
        name: user?.name || dashboardData?.student?.name || 'Student',
        email: user?.email || dashboardData?.student?.email,
        rollNo: user?.studentIdNumber || dashboardData?.student?.studentIdNumber,
        startPassword: password,
      });

      sessionStorage.setItem('evaltech_attempt_id', res.data?.data?.attemptId);
      sessionStorage.setItem('evaltech_submission_token', res.data?.data?.submissionToken);
      sessionStorage.setItem('evaltech_exam_session', JSON.stringify(res.data?.data));

      navigate(`/exam/${code}/take`);
    } catch (err: any) {
      setStartError(err.message || 'Failed to start exam. Please verify credentials.');
      setIsStartingExam(false);
    }
  };

  const handlePasswordModalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExamForStart) return;
    executeExamStart(selectedExamForStart.examCode, startPasswordInput);
  };

  // Handle Change Password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation password do not match.');
      return;
    }

    setIsChangingPassword(true);
    try {
      await api.post('/auth/student/change-password', {
        currentPassword,
        newPassword,
      });

      setPasswordSuccess('Password successfully changed! Your account is now secured.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setIsChangePasswordOpen(false);
        setPasswordSuccess(null);
      }, 2000);
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to change password. Verify your current password.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const student = dashboardData?.student || user;
  const assignedExams = dashboardData?.assignedExams || [];
  const pastResults = dashboardData?.pastResults || [];

  const filteredExams = assignedExams.filter((ex: any) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      ex.title.toLowerCase().includes(q) ||
      ex.subject.toLowerCase().includes(q) ||
      ex.examCode.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-pearl-50 text-midnight-900 selection:bg-indigo-brand selection:text-white flex flex-col">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-midnight-950 text-white border-b border-midnight-800 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/student/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-brand flex items-center justify-center text-white">
              <GraduationCap className="w-5 h-5" />
            </div>
            <span className="text-xl font-extrabold text-white tracking-tight">
              Eval<span className="text-indigo-glow">Tech</span>
            </span>
          </Link>
          <span className="hidden sm:inline text-xs font-mono font-bold uppercase bg-midnight-900 text-indigo-glow px-2.5 py-1 rounded border border-midnight-800">
            Student Portal
          </span>
        </div>

        {/* Student Profile Quick Bar */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-bold text-white flex items-center gap-1.5 justify-end">
              <span>{student?.name || 'Student Candidate'}</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
            </div>
            <div className="text-[11px] font-mono text-pearl-400">
              Roll No: {student?.studentIdNumber || user?.studentIdNumber || '—'}
            </div>
          </div>

          <Link to="/student/practice">
            <Button
              variant="electric"
              size="sm"
              leftIcon={<Flame className="w-3.5 h-3.5 fill-amber-300 text-amber-300 animate-pulse" />}
              className="text-xs font-bold px-2.5 sm:px-3"
            >
              <span className="hidden sm:inline">Practice Arena</span>
              <span className="sm:hidden">Practice</span>
            </Button>
          </Link>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsChangePasswordOpen(true)}
            leftIcon={<Key className="w-3.5 h-3.5" />}
            className="bg-midnight-900 border-midnight-700 text-pearl-200 hover:text-white text-xs px-2.5 sm:px-3"
            title="Security"
          >
            <span className="hidden sm:inline">Security</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => logout()}
            leftIcon={<LogOut className="w-3.5 h-3.5" />}
            className="bg-midnight-900 border-midnight-700 text-rose-300 hover:text-rose-200 text-xs px-2.5 sm:px-3"
            title="Sign Out"
          >
            <span className="hidden sm:inline">Sign Out</span>
          </Button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Banner Card */}
        <div className="p-6 rounded-2xl bg-gradient-to-r from-midnight-950 via-midnight-900 to-indigo-950 text-white shadow-xl border border-midnight-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[11px] uppercase font-bold tracking-wider font-mono text-indigo-glow">
              Candidate Workspace
            </span>
            <h1 className="text-2xl font-extrabold text-white">
              Welcome back, {student?.name || 'Student'}!
            </h1>
            <p className="text-xs text-pearl-300 max-w-xl">
              Access examinations assigned by your instructors, check your real-time scorecards, and view
              cohort leaderboards.
            </p>
          </div>

          {/* Quick Enrolled Classes Chips */}
          <div className="bg-midnight-900/80 border border-midnight-700/80 p-3.5 rounded-xl space-y-1.5 min-w-[200px]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-pearl-400 block font-mono">
              Enrolled Classes
            </span>
            <div className="flex flex-wrap gap-1.5">
              {student?.enrolledClasses && student.enrolledClasses.length > 0 ? (
                student.enrolledClasses.map((cls: any) => (
                  <span
                    key={cls._id || cls}
                    className="text-xs font-mono font-bold bg-indigo-950 text-indigo-300 px-2 py-0.5 rounded border border-indigo-800"
                  >
                    {cls.name || cls.code || 'Class'}
                  </span>
                ))
              ) : (
                <span className="text-xs text-pearl-400 font-mono italic">Independent Batch</span>
              )}
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-pearl-200 pb-2 overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab('exams')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'exams'
                ? 'bg-indigo-brand text-white shadow-subtle'
                : 'text-midnight-600 hover:text-midnight-900 hover:bg-pearl-100'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Assigned Examinations ({assignedExams.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('leaderboard')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'leaderboard'
                ? 'bg-indigo-brand text-white shadow-subtle'
                : 'text-midnight-600 hover:text-midnight-900 hover:bg-pearl-100'
            }`}
          >
            <Trophy className="w-4 h-4" />
            Cohort Leaderboard
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('results')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'results'
                ? 'bg-indigo-brand text-white shadow-subtle'
                : 'text-midnight-600 hover:text-midnight-900 hover:bg-pearl-100'
            }`}
          >
            <Award className="w-4 h-4" />
            My Performance History ({pastResults.length})
          </button>

          <Link to="/student/practice" className="shrink-0">
            <button
              type="button"
              className="px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 bg-gradient-to-r from-amber-500/10 to-indigo-500/10 text-amber-800 hover:bg-amber-100/60 border border-amber-300/70 shadow-xs"
            >
              <Flame className="w-4 h-4 text-amber-500 fill-amber-500" />
              Daily Practice Arena (+20 XP 🔥)
            </button>
          </Link>
        </div>

        {loading ? (
          <LoadingSkeleton count={3} className="h-40" />
        ) : error ? (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : (
          <>
            {/* TAB 1: ASSIGNED EXAMINATIONS */}
            {activeTab === 'exams' && (
              <div className="space-y-4">
                {/* Search Bar */}
                <div className="flex items-center justify-between gap-4">
                  <div className="relative w-full max-w-sm">
                    <Search className="w-4 h-4 text-midnight-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search assigned exams by title or code..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full rounded-xl border border-pearl-300 bg-white pl-9 pr-3 py-2 text-xs text-midnight-900 focus:outline-none focus:border-indigo-brand font-medium shadow-sm"
                    />
                  </div>
                  <span className="text-xs text-midnight-500 font-mono">
                    Showing {filteredExams.length} of {assignedExams.length} exams
                  </span>
                </div>

                {filteredExams.length === 0 ? (
                  <Card className="border-pearl-200">
                    <CardContent className="py-12 text-center space-y-3">
                      <BookOpen className="w-10 h-10 text-midnight-400 mx-auto opacity-50" />
                      <h4 className="text-base font-bold text-midnight-900">No Assigned Examinations</h4>
                      <p className="text-xs text-midnight-500 max-w-sm mx-auto">
                        Your teachers haven't assigned any active exams to your enrolled classes yet. Check back
                        soon!
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filteredExams.map((exam: any) => {
                      const isCompleted = exam.studentState === 'completed';
                      const isInProgress = exam.studentState === 'in_progress';
                      const isLive = exam.examStatus === 'active';

                      return (
                        <Card
                          key={exam._id}
                          className="border-pearl-200 shadow-md hover:shadow-lg transition-all flex flex-col justify-between overflow-hidden"
                        >
                          <div className="p-5 space-y-4">
                            {/* Card Header Badges */}
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-mono text-xs font-bold text-indigo-brand bg-indigo-50 px-2.5 py-1 rounded border border-indigo-100">
                                {exam.examCode}
                              </span>

                              {isCompleted ? (
                                <Badge variant="success" className="text-[10px]">
                                  <CheckCircle2 className="w-3 h-3 mr-1 inline" /> Completed
                                </Badge>
                              ) : isLive ? (
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 animate-pulse">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                                  Live Now
                                </span>
                              ) : (
                                <Badge variant="warning" className="text-[10px]">
                                  {exam.examStatus}
                                </Badge>
                              )}
                            </div>

                            {/* Title & Subject */}
                            <div>
                              <h3 className="text-base font-extrabold text-midnight-950 leading-snug">
                                {exam.title}
                              </h3>
                              <span className="text-xs text-midnight-500 font-semibold block mt-0.5">
                                Subject: {exam.subject}
                              </span>
                            </div>

                            {/* Exam Meta Metrics */}
                            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-midnight-600 bg-pearl-50 p-3 rounded-xl border border-pearl-100">
                              <span className="flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-indigo-brand" /> {exam.durationMinutes} Mins
                              </span>
                              <span className="flex items-center gap-1.5">
                                <FileQuestion className="w-3.5 h-3.5 text-indigo-brand" /> {exam.questionCount} Questions
                              </span>
                              <span className="flex items-center gap-1.5">
                                <Award className="w-3.5 h-3.5 text-indigo-brand" /> {exam.totalMarks} Marks
                              </span>
                              <span className="flex items-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5 text-indigo-brand" /> Pass: {exam.passingMarks}
                              </span>
                            </div>

                            {/* Password Protection Indicators */}
                            <div className="flex flex-wrap gap-1.5 text-[10px]">
                              {exam.requireStartPassword && (
                                <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-bold flex items-center gap-1">
                                  <Lock className="w-3 h-3" /> Start Password
                                </span>
                              )}
                              {exam.requireExitPassword && (
                                <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded font-bold flex items-center gap-1">
                                  <Shield className="w-3 h-3" /> Exit Password
                                </span>
                              )}
                            </div>

                            {/* If completed, display score */}
                            {exam.myResult && (
                              <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 flex items-center justify-between text-xs">
                                <div>
                                  <span className="text-[10px] uppercase font-bold text-emerald-800 block">
                                    Your Score
                                  </span>
                                  <span className="font-extrabold text-emerald-950 text-sm">
                                    {exam.myResult.totalScore} / {exam.myResult.maxScore} ({exam.myResult.percentage}%)
                                  </span>
                                </div>
                                <Badge variant={exam.myResult.isPassed ? 'success' : 'danger'}>
                                  {exam.myResult.isPassed ? 'Passed' : 'Failed'}
                                </Badge>
                              </div>
                            )}
                          </div>

                          {/* Action Button Footer */}
                          <div className="p-4 bg-pearl-50/60 border-t border-pearl-100">
                            {isCompleted ? (
                              <Link to={`/student/results?email=${encodeURIComponent(student?.email)}&examCode=${exam.examCode}`}>
                                <Button variant="outline" size="sm" className="w-full text-xs" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                                  View Scorecard
                                </Button>
                              </Link>
                            ) : isInProgress ? (
                              <Button
                                variant="primary"
                                size="sm"
                                className="w-full text-xs"
                                onClick={() => navigate(`/exam/${exam.examCode}/take`)}
                                rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                              >
                                Resume In-Progress Exam
                              </Button>
                            ) : (
                              <Button
                                variant="electric"
                                size="sm"
                                className="w-full text-xs"
                                onClick={() => handleInitiateExamStart(exam)}
                                rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                              >
                                Attend Examination
                              </Button>
                            )}
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: COHORT LEADERBOARD */}
            {activeTab === 'leaderboard' && (
              <div className="space-y-6">
                {/* Header Bar with Exam Selector */}
                <Card className="border-pearl-200">
                  <CardContent className="pt-5 pb-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-base font-extrabold text-midnight-950 flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-amber-500" />
                        Examination Leaderboard & Top Scorers
                      </h3>
                      <p className="text-xs text-midnight-600 mt-0.5">
                        High scores and cohort rankings for exams conducted by your teachers.
                      </p>
                    </div>

                    {/* Selector */}
                    {leaderboardData?.exams && leaderboardData.exams.length > 0 && (
                      <div className="w-full sm:w-72">
                        <select
                          value={selectedExamId}
                          onChange={(e) => handleSelectExamForLeaderboard(e.target.value)}
                          className="w-full rounded-xl border border-pearl-300 bg-white px-3 py-2 text-xs font-bold text-midnight-900 focus:border-indigo-brand focus:outline-none shadow-sm"
                        >
                          {leaderboardData.exams.map((ex: any) => (
                            <option key={ex._id} value={ex._id}>
                              {ex.title} ({ex.examCode})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {loadingLeaderboard ? (
                  <LoadingSkeleton count={3} className="h-32" />
                ) : !leaderboardData || leaderboardData.leaderboard.length === 0 ? (
                  <Card className="border-pearl-200 text-center py-12">
                    <CardContent className="space-y-3">
                      <Trophy className="w-10 h-10 text-midnight-300 mx-auto" />
                      <h4 className="text-base font-bold text-midnight-900">No Submissions Recorded Yet</h4>
                      <p className="text-xs text-midnight-500 max-w-sm mx-auto">
                        Once students complete this exam and results are graded, the leaderboard rankings will appear
                        here automatically.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-6">
                    {/* Podium for Top 3 High Scorers */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {/* Rank 2 (Silver) */}
                      {leaderboardData.leaderboard[1] && (
                        <Card className="border-pearl-200 bg-gradient-to-b from-slate-50 to-white text-center shadow-md">
                          <CardContent className="pt-6 pb-6 space-y-2">
                            <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-700 mx-auto flex items-center justify-center font-extrabold text-sm border-2 border-slate-300 shadow-sm">
                              🥈 2
                            </div>
                            <h4 className="text-sm font-extrabold text-midnight-950 truncate px-2">
                              {leaderboardData.leaderboard[1].studentName}
                            </h4>
                            <span className="text-[11px] font-mono text-midnight-500 block">
                              Roll: {leaderboardData.leaderboard[1].rollNo}
                            </span>
                            <div className="text-lg font-extrabold text-indigo-brand font-mono pt-1">
                              {leaderboardData.leaderboard[1].totalScore} Marks
                              <span className="text-xs text-midnight-500 block">
                                ({leaderboardData.leaderboard[1].percentage}%)
                              </span>
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Rank 1 (Gold Champion) */}
                      {leaderboardData.leaderboard[0] && (
                        <Card className="border-amber-300 bg-gradient-to-b from-amber-50/80 via-white to-amber-50/30 text-center shadow-xl ring-2 ring-amber-400/50 transform sm:-translate-y-2">
                          <CardContent className="pt-6 pb-6 space-y-2">
                            <div className="w-12 h-12 rounded-full bg-amber-400 text-amber-950 mx-auto flex items-center justify-center font-extrabold text-base border-2 border-amber-300 shadow-md animate-bounce">
                              👑 1
                            </div>
                            <Badge variant="warning" className="text-[10px] font-bold">
                              High Score Champion
                            </Badge>
                            <h4 className="text-base font-extrabold text-midnight-950 truncate px-2">
                              {leaderboardData.leaderboard[0].studentName}
                            </h4>
                            <span className="text-xs font-mono text-midnight-600 block">
                              Roll: {leaderboardData.leaderboard[0].rollNo}
                            </span>
                            <div className="text-2xl font-extrabold text-amber-950 font-mono pt-1">
                              {leaderboardData.leaderboard[0].totalScore} Marks
                              <span className="text-xs text-midnight-600 block">
                                ({leaderboardData.leaderboard[0].percentage}%)
                              </span>
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Rank 3 (Bronze) */}
                      {leaderboardData.leaderboard[2] && (
                        <Card className="border-pearl-200 bg-gradient-to-b from-amber-900/5 to-white text-center shadow-md">
                          <CardContent className="pt-6 pb-6 space-y-2">
                            <div className="w-10 h-10 rounded-full bg-amber-200/80 text-amber-900 mx-auto flex items-center justify-center font-extrabold text-sm border-2 border-amber-300 shadow-sm">
                              🥉 3
                            </div>
                            <h4 className="text-sm font-extrabold text-midnight-950 truncate px-2">
                              {leaderboardData.leaderboard[2].studentName}
                            </h4>
                            <span className="text-[11px] font-mono text-midnight-500 block">
                              Roll: {leaderboardData.leaderboard[2].rollNo}
                            </span>
                            <div className="text-lg font-extrabold text-indigo-brand font-mono pt-1">
                              {leaderboardData.leaderboard[2].totalScore} Marks
                              <span className="text-xs text-midnight-500 block">
                                ({leaderboardData.leaderboard[2].percentage}%)
                              </span>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>

                    {/* Full Leaderboard Table */}
                    <Card className="border-pearl-200 shadow-md">
                      <CardHeader className="pb-3 border-b border-pearl-100 flex flex-row items-center justify-between">
                        <div>
                          <CardTitle className="text-sm">Cohort Standings Roster</CardTitle>
                          <CardDescription>
                            Total {leaderboardData.totalParticipants} students evaluated • Class Average: {leaderboardData.averagePercentage}%
                          </CardDescription>
                        </div>
                        {leaderboardData.myRank && (
                          <div className="px-3 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-xs font-bold text-indigo-brand font-mono">
                            Your Rank: #{leaderboardData.myRank}
                          </div>
                        )}
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead>
                              <tr className="border-b border-pearl-200 text-midnight-600 uppercase font-semibold text-[11px]">
                                <th className="py-3 px-4">Rank</th>
                                <th className="py-3 px-4">Student Name</th>
                                <th className="py-3 px-4">Roll No</th>
                                <th className="py-3 px-4">Marks Obtained</th>
                                <th className="py-3 px-4">Percentage</th>
                                <th className="py-3 px-4">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-pearl-100 font-medium">
                              {leaderboardData.leaderboard.map((item: any) => {
                                const isMe = item.isCurrentStudent;
                                return (
                                  <tr
                                    key={item.rank}
                                    className={`transition-colors ${
                                      isMe
                                        ? 'bg-indigo-50/90 font-bold border-l-4 border-l-indigo-brand shadow-xs'
                                        : 'hover:bg-pearl-50/70'
                                    }`}
                                  >
                                    <td className="py-3 px-4 font-mono">
                                      <span
                                        className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                                          item.rank === 1
                                            ? 'bg-amber-400 text-amber-950'
                                            : item.rank === 2
                                            ? 'bg-slate-300 text-slate-800'
                                            : item.rank === 3
                                            ? 'bg-amber-200 text-amber-900'
                                            : 'text-midnight-600'
                                        }`}
                                      >
                                        {item.rank}
                                      </span>
                                    </td>
                                    <td className="py-3 px-4">
                                      <div className="flex items-center gap-2">
                                        <span className="text-midnight-950 font-bold">{item.studentName}</span>
                                        {isMe && (
                                          <Badge variant="purple" className="text-[10px]">
                                            You
                                          </Badge>
                                        )}
                                      </div>
                                    </td>
                                    <td className="py-3 px-4 font-mono text-midnight-700">
                                      {item.rollNo}
                                    </td>
                                    <td className="py-3 px-4 font-mono font-bold text-indigo-brand">
                                      {item.totalScore} / {item.maxScore}
                                    </td>
                                    <td className="py-3 px-4 font-mono font-bold text-midnight-900">
                                      {item.percentage}%
                                    </td>
                                    <td className="py-3 px-4">
                                      <Badge variant={item.isPassed ? 'success' : 'danger'}>
                                        {item.isPassed ? 'Passed' : 'Failed'}
                                      </Badge>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: MY PERFORMANCE HISTORY */}
            {activeTab === 'results' && (
              <div className="space-y-4">
                {pastResults.length === 0 ? (
                  <Card className="border-pearl-200 text-center py-12">
                    <CardContent className="space-y-3">
                      <Award className="w-10 h-10 text-midnight-300 mx-auto" />
                      <h4 className="text-base font-bold text-midnight-900">No Completed Exams Yet</h4>
                      <p className="text-xs text-midnight-500 max-w-sm mx-auto">
                        Your performance scorecards and released answer explanations will appear here once you
                        finish your first examination.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {pastResults.map((r: any) => (
                      <Card key={r._id} className="border-pearl-200 shadow-md">
                        <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-indigo-brand bg-indigo-50 px-2.5 py-0.5 rounded border border-indigo-200">
                                {r.examCode}
                              </span>
                              <Badge variant={r.isPassed ? 'success' : 'danger'}>
                                {r.isPassed ? 'Passed' : 'Failed'}
                              </Badge>
                            </div>
                            <h3 className="text-base font-extrabold text-midnight-950">{r.examTitle}</h3>
                            <span className="text-xs text-midnight-500 block">
                              Subject: {r.subject} • Evaluated: {new Date(r.evaluatedAt).toLocaleDateString()}
                            </span>
                          </div>

                          <div className="flex items-center gap-6">
                            <div className="text-right font-mono">
                              <div className="text-xl font-extrabold text-indigo-brand">
                                {r.totalScore} / {r.maxScore}
                              </div>
                              <span className="text-xs font-bold text-midnight-600 block">{r.percentage}%</span>
                            </div>

                            <Link to={`/student/results?email=${encodeURIComponent(student?.email)}&examCode=${r.examCode}`}>
                              <Button variant="outline" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                                Inspect Scorecard
                              </Button>
                            </Link>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* MODAL 1: START EXAM PASSWORD PROMPT */}
      {isPasswordModalOpen && selectedExamForStart && (
        <Modal
          isOpen={isPasswordModalOpen}
          onClose={() => setIsPasswordModalOpen(false)}
          title={`Unlock Examination: ${selectedExamForStart.title}`}
          size="sm"
        >
          <form onSubmit={handlePasswordModalSubmit} className="space-y-4">
            <p className="text-xs text-midnight-600 leading-relaxed">
              Your instructor has password-protected this examination. Please enter the Start Password provided
              by your teacher to unlock the exam session.
            </p>

            {startError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{startError}</span>
              </div>
            )}

            <Input
              type="password"
              label="Exam Start Password"
              required
              autoFocus
              placeholder="Enter start password"
              value={startPasswordInput}
              onChange={(e) => setStartPasswordInput(e.target.value)}
              leftIcon={<Lock className="w-4 h-4" />}
            />

            <div className="flex justify-end gap-2 pt-2 border-t border-pearl-100">
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => setIsPasswordModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                type="submit"
                isLoading={isStartingExam}
                rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
              >
                Unlock & Start Exam
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL 2: STUDENT PROFILE & CHANGE PASSWORD */}
      {isChangePasswordOpen && (
        <Modal
          isOpen={isChangePasswordOpen}
          onClose={() => setIsChangePasswordOpen(false)}
          title="Student Security & Profile"
          size="md"
        >
          <div className="space-y-5">
            {/* Student Info Card */}
            <div className="p-4 rounded-xl bg-pearl-100 space-y-1.5 text-xs font-medium">
              <div className="flex justify-between">
                <span className="text-midnight-600">Candidate Name:</span>
                <span className="font-bold text-midnight-950">{student?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-midnight-600">Roll Number:</span>
                <span className="font-mono font-bold text-midnight-950">
                  {student?.studentIdNumber || user?.studentIdNumber || '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-midnight-600">Registered Email:</span>
                <span className="font-mono text-midnight-950">{student?.email}</span>
              </div>
            </div>

            {/* Change Password Form */}
            <form onSubmit={handleChangePassword} className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-midnight-900 pb-1 border-b border-pearl-200">
                Change Login Password
              </h4>

              {passwordError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{passwordError}</span>
                </div>
              )}

              {passwordSuccess && (
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{passwordSuccess}</span>
                </div>
              )}

              <Input
                type="password"
                label="Current Password"
                required
                placeholder="Initial default is Test@123"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                leftIcon={<Lock className="w-4 h-4" />}
                helperText="If you haven't changed your password yet, enter Test@123"
              />

              <Input
                type="password"
                label="New Password"
                required
                placeholder="At least 6 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                leftIcon={<Key className="w-4 h-4" />}
              />

              <Input
                type="password"
                label="Confirm New Password"
                required
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                leftIcon={<Key className="w-4 h-4" />}
              />

              <div className="flex justify-end gap-2 pt-2 border-t border-pearl-100">
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => setIsChangePasswordOpen(false)}
                >
                  Close
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  type="submit"
                  isLoading={isChangingPassword}
                >
                  Save New Password
                </Button>
              </div>
            </form>
          </div>
        </Modal>
      )}
    </div>
  );
};
