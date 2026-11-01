import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';
import {
  GraduationCap,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Shield,
  FileQuestion,
  User,
  Mail,
  Hash,
  Lock,
  Download,
  ExternalLink,
  ShieldCheck,
  Camera,
  Mic,
  ShieldAlert,
  Eye,
  Volume2,
} from 'lucide-react';

export const StudentExamWelcome: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [examCode, setExamCode] = useState(code || '');
  const [exam, setExam] = useState<any>(null);
  const [loading, setLoading] = useState(Boolean(code));
  const [error, setError] = useState<string | null>(null);

  // Student credentials
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [rollNo, setRollNo] = useState('');
  const [startPassword, setStartPassword] = useState('');
  const [starting, setStarting] = useState(false);
  const [devBypassSEB, setDevBypassSEB] = useState(false);

  // AI Proctor device test state
  const [testingHardware, setTestingHardware] = useState(false);
  const [hardwareGranted, setHardwareGranted] = useState(false);
  const [hardwareError, setHardwareError] = useState<string | null>(null);
  const [proctorAgreed, setProctorAgreed] = useState(false);
  const testVideoRef = React.useRef<HTMLVideoElement | null>(null);
  const testStreamRef = React.useRef<MediaStream | null>(null);

  // Clean up test media stream on unmount
  useEffect(() => {
    return () => {
      if (testStreamRef.current) {
        testStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const handleTestHardware = async () => {
    setTestingHardware(true);
    setHardwareError(null);
    try {
      if (testStreamRef.current) {
        testStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240, facingMode: 'user' },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      testStreamRef.current = stream;
      setHardwareGranted(true);
      if (testVideoRef.current) {
        testVideoRef.current.srcObject = stream;
        testVideoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      setHardwareError('Camera or Microphone access was denied. Please allow permissions in your browser.');
      setHardwareGranted(false);
    } finally {
      setTestingHardware(false);
    }
  };

  // Check if student opened inside Safe Exam Browser
  const isSEBBrowser =
    typeof navigator !== 'undefined' &&
    (navigator.userAgent.includes('SEB') ||
      navigator.userAgent.includes('SafeExamBrowser'));

  // Pre-fill student info if logged in
  useEffect(() => {
    if (user && user.role === 'student') {
      setName(user.name || '');
      setEmail(user.email || '');
      if (user.studentIdNumber) {
        setRollNo(user.studentIdNumber);
      }
    }
  }, [user]);

  const fetchExamDetails = async (inputCode: string) => {
    if (!inputCode) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/exams/code/${inputCode.trim().toUpperCase()}`);
      setExam(res.data?.data);
    } catch (err: any) {
      setError(err.message || 'Exam not found or inactive.');
      setExam(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (code) {
      fetchExamDetails(code);
    }
  }, [code]);

  const handleStartExam = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setStarting(true);

    try {
      const res = await api.post('/attempts/start', {
        examCode: exam.examCode,
        name,
        email,
        rollNo,
        startPassword: exam.requireStartPassword ? startPassword : undefined,
        bypassSEB: devBypassSEB,
      });

      // Store active session token and attempt ID in sessionStorage
      sessionStorage.setItem('evaltech_attempt_id', res.data?.data?.attemptId);
      sessionStorage.setItem('evaltech_submission_token', res.data?.data?.submissionToken);
      sessionStorage.setItem('evaltech_exam_session', JSON.stringify(res.data?.data));

      navigate(`/exam/${exam.examCode}/take`);
    } catch (err: any) {
      setError(err.message || 'Unable to join exam. Please verify credentials.');
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="min-h-screen bg-pearl-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 selection:bg-indigo-brand selection:text-white">
      <div className="sm:mx-auto sm:w-full sm:max-w-lg">
        {/* Brand */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="w-9 h-9 rounded-xl bg-midnight-900 flex items-center justify-center text-white shadow-subtle">
              <GraduationCap className="w-5 h-5 text-indigo-glow" />
            </div>
            <span className="text-2xl font-extrabold text-midnight-950">
              Eval<span className="text-indigo-brand">Tech</span>
            </span>
          </div>
          <h2 className="text-xl font-extrabold text-midnight-900">Online Examination Entrance</h2>
          <p className="text-xs text-midnight-600 mt-1">
            Secure browser session with server-synchronized timing.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* If no code was provided in route parameter, allow manual code entry */}
        {!code && !exam && (
          <Card className="shadow-xl border-pearl-200">
            <CardContent className="pt-6 space-y-4">
              <Input
                label="Enter 6-Character Exam Code"
                placeholder="e.g. EVT-842"
                value={examCode}
                onChange={(e) => setExamCode(e.target.value.toUpperCase())}
              />
              <Button
                variant="primary"
                className="w-full"
                onClick={() => fetchExamDetails(examCode)}
                disabled={!examCode.trim()}
              >
                Access Examination
              </Button>
            </CardContent>
          </Card>
        )}

        {loading && <LoadingSkeleton count={3} className="h-28" />}

        {/* Exam Metadata & Student Info Form */}
        {exam && !loading && (
          <Card className="shadow-2xl border-pearl-200">
            <CardHeader className="bg-pearl-100/50 pb-4">
              <div className="flex items-center justify-between">
                <Badge variant="purple" className="text-[10px] font-mono">
                  {exam.examCode}
                </Badge>
                <span className="text-xs font-semibold text-midnight-600 flex items-center gap-1 font-mono">
                  <Clock className="w-3.5 h-3.5 text-indigo-brand" /> {exam.durationMinutes} Minutes
                </span>
              </div>
              <CardTitle className="text-lg mt-1">{exam.title}</CardTitle>
              <CardDescription>
                Subject: {exam.subject} • {exam.questionCount} Questions • {exam.totalMarks} Total Marks
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-6 space-y-5">
              {/* Rules preview */}
              {exam.instructions && (
                <div className="p-3.5 rounded-xl bg-pearl-50 border border-pearl-200/80 text-xs text-midnight-700 space-y-1">
                  <span className="font-bold text-midnight-900 block uppercase text-[10px]">
                    Instructions & Guidelines:
                  </span>
                  <p className="whitespace-pre-line leading-relaxed">{exam.instructions}</p>
                </div>
              )}

              {/* Security indicators */}
              <div className="flex flex-wrap items-center gap-2">
                {exam.requireStartPassword && (
                  <Badge variant="warning" className="text-[10px]">
                    <Lock className="w-3 h-3 mr-1 inline" /> Start Password Required
                  </Badge>
                )}
                {exam.requireExitPassword && (
                  <Badge variant="danger" className="text-[10px]">
                    <Shield className="w-3 h-3 mr-1 inline" /> Invigilator Exit Password Enforced
                  </Badge>
                )}
                {exam.requireSEB && (
                  <Badge variant="info" className="text-[10px]">
                    <Shield className="w-3 h-3 mr-1 inline" /> Safe Exam Browser Required
                  </Badge>
                )}
              </div>

              {/* Safe Exam Browser Lockdown Verification Banner or Hub */}
              {exam.requireSEB && (
                isSEBBrowser ? (
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950 flex items-start gap-3 shadow-xs">
                    <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white shrink-0 shadow-xs">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wide">
                        Safe Exam Browser Active & Verified
                      </h4>
                      <p className="text-xs text-emerald-700 mt-0.5">
                        Your browser session is locked down. Background applications, screenshots, and unauthorized keyboard shortcuts are restricted.
                      </p>
                    </div>
                  </div>
                ) : devBypassSEB ? (
                  <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 flex items-start justify-between gap-3 text-xs">
                    <div className="flex items-start gap-2.5">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-amber-900 block">SEB Bypass Active (Testing Mode)</span>
                        <p className="text-amber-700 text-[11px] mt-0.5">
                          You are taking this exam in a regular browser for demonstration and testing.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDevBypassSEB(false)}
                      className="text-[11px] font-bold text-amber-800 underline hover:text-amber-950 shrink-0"
                    >
                      Enforce SEB
                    </button>
                  </div>
                ) : (
                  <div className="p-5 rounded-2xl bg-midnight-950 text-white border border-indigo-500/40 shadow-xl space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shrink-0 shadow-inner">
                        <Shield className="w-6 h-6 text-indigo-glow" />
                      </div>
                      <div>
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-glow block">
                          Security Lockdown Required
                        </span>
                        <h3 className="text-base font-extrabold text-white">Safe Exam Browser (SEB) Enforced</h3>
                        <p className="text-xs text-pearl-300 mt-1 leading-relaxed">
                          Your instructor has restricted this assessment to Safe Exam Browser to ensure exam integrity. To attend this exam, open it directly using the official SEB client.
                        </p>
                      </div>
                    </div>

                    {/* Launch & Download Buttons */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                      {/* 1-Click Launch Button */}
                      <a
                        href={`seb://${window.location.host}/api/exams/code/${exam.examCode}/seb-config`}
                        className="w-full"
                      >
                        <Button
                          type="button"
                          variant="electric"
                          size="md"
                          className="w-full justify-center text-xs font-bold shadow-md"
                          leftIcon={<Shield className="w-4 h-4 fill-white" />}
                        >
                          Launch in Safe Exam Browser
                        </Button>
                      </a>

                      {/* Download .seb file button */}
                      <a
                        href={`/api/exams/code/${exam.examCode}/seb-config`}
                        download={`EvalTech-${exam.examCode}-SEB.seb`}
                        className="w-full"
                      >
                        <Button
                          type="button"
                          variant="outline"
                          size="md"
                          className="w-full justify-center text-xs bg-midnight-900 border-midnight-700 text-pearl-200 hover:text-white"
                          leftIcon={<Download className="w-4 h-4" />}
                        >
                          Download .seb Config
                        </Button>
                      </a>
                    </div>

                    {/* Support & Download SEB Client */}
                    <div className="pt-2 border-t border-midnight-800 flex flex-col sm:flex-row items-start sm:items-center justify-between text-[11px] text-pearl-400 gap-2">
                      <span>Don't have Safe Exam Browser installed on your device?</span>
                      <a
                        href="https://safeexambrowser.org/download_en.html"
                        target="_blank"
                        rel="noreferrer"
                        className="text-indigo-glow hover:underline flex items-center gap-1 font-bold shrink-0"
                      >
                        Download SEB Client <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>

                    {/* Local Dev Testing Bypass */}
                    <div className="pt-1 text-center">
                      <button
                        type="button"
                        onClick={() => setDevBypassSEB(true)}
                        className="text-[11px] text-pearl-400 hover:text-indigo-glow underline transition-colors"
                      >
                        Testing in local development? Click here to test in standard browser
                      </button>
                    </div>
                  </div>
                )
              )}

              {/* Student identification form */}
              <form onSubmit={handleStartExam} className="space-y-4">
                <Input
                  label="Your Full Name"
                  required
                  placeholder="e.g. Alexander Clark"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  leftIcon={<User className="w-4 h-4" />}
                />

                <Input
                  label="Your Student Email Address"
                  type="email"
                  required
                  placeholder="alexander@university.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  leftIcon={<Mail className="w-4 h-4" />}
                />

                <Input
                  label="Roll / Student ID Number"
                  placeholder="e.g. 21CS042"
                  value={rollNo}
                  onChange={(e) => setRollNo(e.target.value)}
                  leftIcon={<Hash className="w-4 h-4" />}
                />

                {exam.requireStartPassword && (
                  <Input
                    label="Exam Start Password"
                    type="password"
                    required
                    placeholder="Enter start password from instructor"
                    value={startPassword}
                    onChange={(e) => setStartPassword(e.target.value)}
                    leftIcon={<Lock className="w-4 h-4" />}
                    helperText="Your instructor or invigilator has protected this exam with a start password."
                  />
                )}

                {/* AI Face & Voice Proctoring Notice & Device Check */}
                <div className="p-4 rounded-xl bg-midnight-950 text-white border border-indigo-500/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                        <Camera className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-bold text-white uppercase tracking-wider">
                        AI Proctoring Active
                      </span>
                    </div>
                    <Badge variant="warning" className="text-[10px]">
                      3 Strikes Auto-Submit
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-pearl-300">
                    <div className="flex items-start gap-1.5 p-2 rounded-lg bg-midnight-900 border border-white/5">
                      <Eye className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                      <span><strong>AI Face Tracker:</strong> Stay facing screen. Looking away or leaving triggers strikes.</span>
                    </div>
                    <div className="flex items-start gap-1.5 p-2 rounded-lg bg-midnight-900 border border-white/5">
                      <Volume2 className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                      <span><strong>AI Voice Monitor:</strong> Complete silence required. Talking triggers strikes.</span>
                    </div>
                  </div>

                  {/* Hardware Check Trigger */}
                  <div className="pt-1">
                    {!hardwareGranted ? (
                      <button
                        type="button"
                        onClick={handleTestHardware}
                        disabled={testingHardware}
                        className="w-full py-2 px-3 text-xs font-bold rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 text-indigo-200 flex items-center justify-center gap-2 transition-all"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <Mic className="w-3.5 h-3.5" />
                        <span>{testingHardware ? 'Requesting Camera & Mic...' : 'Test Camera & Microphone Hardware'}</span>
                      </button>
                    ) : (
                      <div className="p-2.5 rounded-lg bg-emerald-950/60 border border-emerald-500/40 flex items-center justify-between text-xs text-emerald-300">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span className="font-bold">Hardware Checked (Camera & Mic Ready)</span>
                        </div>
                        <video
                          ref={testVideoRef}
                          autoPlay
                          playsInline
                          muted
                          className="w-12 h-9 rounded object-cover -scale-x-100 border border-emerald-400"
                        />
                      </div>
                    )}

                    {hardwareError && (
                      <p className="text-[10px] text-rose-400 font-semibold mt-1">
                        ⚠️ {hardwareError}
                      </p>
                    )}
                  </div>

                  {/* Checkbox Acknowledgment */}
                  <label className="flex items-start gap-2 pt-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={proctorAgreed}
                      onChange={(e) => setProctorAgreed(e.target.checked)}
                      className="mt-0.5 rounded border-pearl-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-[11px] text-pearl-300 leading-tight">
                      I understand that AI face and voice monitoring is active. Reaching <strong>3 malpractice warnings</strong> will automatically terminate and submit my examination immediately.
                    </span>
                  </label>
                </div>

                <div className="pt-2">
                  <Button
                    type="submit"
                    variant="electric"
                    className="w-full"
                    size="lg"
                    isLoading={starting}
                    rightIcon={<ArrowRight className="w-4 h-4" />}
                  >
                    Start Live Examination
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
