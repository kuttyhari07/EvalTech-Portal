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
