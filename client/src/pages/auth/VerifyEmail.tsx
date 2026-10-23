import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../../api/client';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { CheckCircle2, XCircle, Loader2, ArrowRight } from 'lucide-react';

export const VerifyEmail: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const email = searchParams.get('email');

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!token || !email) {
      setStatus('error');
      setErrorMessage('Verification parameters missing.');
      return;
    }

    api
      .get(`/auth/verify-email?token=${token}&email=${encodeURIComponent(email)}`)
      .then(() => setStatus('success'))
      .catch((err) => {
        setStatus('error');
        setErrorMessage(err.message || 'Verification token invalid or expired.');
      });
  }, [token, email]);

  return (
    <div className="min-h-screen bg-pearl-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full shadow-2xl border-pearl-200">
        <CardContent className="pt-8 text-center space-y-4">
          {status === 'loading' && (
            <div className="py-8 space-y-3">
              <Loader2 className="w-10 h-10 animate-spin text-indigo-brand mx-auto" />
              <h3 className="text-base font-bold text-midnight-900">Verifying Email Address...</h3>
              <p className="text-xs text-midnight-600">Please wait while we confirm your credentials.</p>
            </div>
          )}

          {status === 'success' && (
            <div className="py-4 space-y-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
              <h3 className="text-lg font-bold text-midnight-900">Email Successfully Verified!</h3>
              <p className="text-xs text-midnight-600">
                Your account is fully activated. You now have full access to create classes and examinations.
              </p>
              <div className="pt-4">
                <Link to="/login">
                  <Button variant="primary" size="md" rightIcon={<ArrowRight className="w-4 h-4" />}>
                    Sign In to Workspace
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="py-4 space-y-3">
              <XCircle className="w-12 h-12 text-rose-500 mx-auto" />
              <h3 className="text-lg font-bold text-midnight-900">Verification Failed</h3>
              <p className="text-xs text-rose-600">{errorMessage}</p>
              <div className="pt-4">
                <Link to="/login">
                  <Button variant="outline" size="sm">
                    Return to Login
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
