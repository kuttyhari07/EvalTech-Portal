import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';
import { GraduationCap, Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';

export const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSubmitted(true);
    } catch {
      setSubmitted(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-pearl-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link to="/" className="inline-flex items-center gap-2 mb-4">
          <div className="w-10 h-10 rounded-xl bg-midnight-900 flex items-center justify-center text-white">
            <GraduationCap className="w-6 h-6 text-indigo-glow" />
          </div>
          <span className="text-2xl font-extrabold text-midnight-950">
            Eval<span className="text-indigo-brand">Tech</span>
          </span>
        </Link>
        <h2 className="text-xl font-bold text-midnight-900">Reset Your Password</h2>
        <p className="text-xs text-midnight-600 mt-1">
          Enter your registered email and we'll send password reset instructions.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <Card className="shadow-xl border-pearl-200">
          <CardContent className="pt-6">
            {submitted ? (
              <div className="text-center py-4 space-y-3">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                <h4 className="text-base font-bold text-midnight-900">Instructions Sent</h4>
                <p className="text-xs text-midnight-600 leading-relaxed">
                  If <strong>{email}</strong> is associated with an EvalTech account, you will receive a secure password reset link shortly.
                </p>
                <div className="pt-4">
                  <Link to="/login">
                    <Button variant="outline" size="sm" leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}>
                      Back to Sign In
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  label="Email Address"
                  type="email"
                  required
                  placeholder="name@institution.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  leftIcon={<Mail className="w-4 h-4" />}
                />
                <Button type="submit" variant="primary" className="w-full" isLoading={isLoading}>
                  Send Password Reset Link
                </Button>
                <div className="text-center pt-2">
                  <Link to="/login" className="text-xs font-semibold text-midnight-600 hover:text-indigo-brand flex items-center justify-center gap-1">
                    <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
                  </Link>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
