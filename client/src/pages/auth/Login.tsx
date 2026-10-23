import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';
import {
  GraduationCap,
  ArrowRight,
  Lock,
  Mail,
  AlertCircle,
  UserCheck,
  BookOpen,
  Info,
} from 'lucide-react';

export const Login: React.FC = () => {
  const { login, studentLogin, user } = useAuth();
  const navigate = useNavigate();

  const [activePortal, setActivePortal] = useState<'staff' | 'student'>('staff');
  const [email, setEmail] = useState('');
  const [studentUsername, setStudentUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // If already logged in, redirect to appropriate role portal
  React.useEffect(() => {
    if (user) {
      if (user.role === 'super_admin') navigate('/admin');
      else if (user.role === 'org_admin') navigate('/org');
      else if (user.role === 'student') navigate('/student/dashboard');
      else navigate('/staff');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (activePortal === 'student') {
        await studentLogin({ username: studentUsername, password });
        navigate('/student/dashboard');
      } else {
        await login({ email, password });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to sign in. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-pearl-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 selection:bg-indigo-brand selection:text-white">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link to="/" className="inline-flex items-center gap-2 mb-4">
          <div className="w-10 h-10 rounded-xl bg-midnight-900 flex items-center justify-center text-white shadow-subtle">
            <GraduationCap className="w-6 h-6 text-indigo-glow" />
          </div>
          <span className="text-2xl font-extrabold text-midnight-950 tracking-tight">
            Eval<span className="text-indigo-brand">Tech</span>
          </span>
        </Link>
        <h2 className="text-2xl font-extrabold text-midnight-900 tracking-tight">
          Sign In to EvalTech
        </h2>
        <p className="text-xs text-midnight-600 mt-1">
          Select your portal to access examinations, assessments, and analytics.
        </p>

        {/* Portal Switcher Tabs */}
        <div className="mt-4 p-1 bg-pearl-200/70 rounded-xl grid grid-cols-2 gap-1 max-w-xs mx-auto border border-pearl-300">
          <button
            type="button"
            onClick={() => {
              setActivePortal('staff');
              setError(null);
            }}
            className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activePortal === 'staff'
                ? 'bg-white text-indigo-brand shadow-sm'
                : 'text-midnight-600 hover:text-midnight-900'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            Teacher / Staff
          </button>
          <button
            type="button"
            onClick={() => {
              setActivePortal('student');
              setError(null);
            }}
            className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activePortal === 'student'
                ? 'bg-white text-indigo-brand shadow-sm'
                : 'text-midnight-600 hover:text-midnight-900'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            Student Portal
          </button>
        </div>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <Card className="shadow-xl border-pearl-200">
          <CardContent className="pt-6">
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-center gap-2 text-xs font-medium text-rose-700 animate-fadeIn">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Portal Badge Banner */}
            <div className="mb-4 p-3 rounded-xl bg-pearl-100/80 border border-pearl-200 flex items-center justify-between text-xs font-semibold text-midnight-800">
              <span className="flex items-center gap-1.5">
                {activePortal === 'student' ? (
                  <>
                    <BookOpen className="w-4 h-4 text-indigo-brand" />
                    <strong>Student Examination Portal</strong>
                  </>
                ) : (
                  <>
                    <UserCheck className="w-4 h-4 text-emerald-600" />
                    <strong>Instructor & Admin Workspace</strong>
                  </>
                )}
              </span>
              <span className="text-[10px] font-mono uppercase bg-white px-2 py-0.5 rounded border border-pearl-300">
                {activePortal}
              </span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {activePortal === 'student' ? (
                <>
                  <Input
                    label="Student Roll No / ID or Email"
                    placeholder="e.g. 21CS042 or student@college.edu"
                    required
                    value={studentUsername}
                    onChange={(e) => setStudentUsername(e.target.value)}
                    leftIcon={<BookOpen className="w-4 h-4" />}
                    helperText="Enter the Roll Number assigned by your teacher"
                  />

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-midnight-700">
                      Password
                    </label>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      leftIcon={<Lock className="w-4 h-4" />}
                    />
                    <div className="flex items-center gap-1 text-[11px] text-midnight-500 pt-0.5">
                      <Info className="w-3.5 h-3.5 text-indigo-brand shrink-0" />
                      <span>Default initial password is <strong>Test@123</strong></span>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <Input
                    label="Staff Email Address"
                    type="email"
                    placeholder="name@institution.edu"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    leftIcon={<Mail className="w-4 h-4" />}
                  />

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-midnight-700">
                        Password
                      </label>
                      <Link
                        to="/forgot-password"
                        className="text-xs text-indigo-brand hover:underline font-medium"
                      >
                        Forgot Password?
                      </Link>
                    </div>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      leftIcon={<Lock className="w-4 h-4" />}
                    />
                  </div>
                </>
              )}

              <Button
                type="submit"
                variant="primary"
                className="w-full mt-2"
                isLoading={isLoading}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                {activePortal === 'student' ? 'Access Student Dashboard' : 'Sign In'}
              </Button>
            </form>

            {/* Quick Demo Logins Helper */}
            <div className="mt-6 pt-4 border-t border-pearl-100 space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-midnight-600 text-center">
                Demo Accounts
              </p>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={() => {
                    setActivePortal('staff');
                    setEmail('teacher@evaltech.io');
                    setPassword('Teacher@2025');
                  }}
                  className="p-2 rounded border border-pearl-200 bg-pearl-50 hover:bg-pearl-100 text-midnight-800 text-left font-medium transition-colors"
                >
                  <strong className="block text-emerald-600">Staff / Teacher</strong>
                  teacher@evaltech.io
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActivePortal('student');
                    setStudentUsername('alice@evaltech.io');
                    setPassword('Test@123');
                  }}
                  className="p-2 rounded border border-pearl-200 bg-pearl-50 hover:bg-pearl-100 text-midnight-800 text-left font-medium transition-colors"
                >
                  <strong className="block text-indigo-brand">Student Portal</strong>
                  Pass: Test@123
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {activePortal === 'staff' && (
          <p className="text-center text-xs text-midnight-600 mt-6">
            Don't have an instructor account yet?{' '}
            <Link to="/register" className="font-bold text-indigo-brand hover:underline">
              Register for Free
            </Link>
          </p>
        )}
      </div>
    </div>
  );
};
