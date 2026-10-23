import React, { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../../api/client';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';
import { Building2, Lock, User, CheckCircle2, AlertCircle } from 'lucide-react';

export const JoinOrg: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const email = searchParams.get('email') || '';
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await api.post('/organizations/accept-invitation', {
        token,
        name,
        password,
      });

      navigate('/login');
    } catch (err: any) {
      setError(err.message || 'Failed to accept invitation. The link may have expired.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-pearl-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full shadow-2xl border-pearl-200">
        <CardContent className="pt-6 space-y-4">
          <div className="text-center">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-brand mx-auto mb-3">
              <Building2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-midnight-900">Accept Staff Invitation</h3>
            <p className="text-xs text-midnight-600 mt-1">
              You have been invited to join your institution's examination workspace on EvalTech.
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-center gap-2 text-xs font-medium text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-midnight-700 mb-1">
                Invited Email
              </label>
              <input
                disabled
                value={email}
                className="w-full rounded-lg border border-pearl-200 bg-pearl-100 px-3 py-2 text-xs text-midnight-600 font-mono"
              />
            </div>

            <Input
              label="Your Full Name"
              required
              placeholder="e.g. Professor Sarah Jenkins"
              value={name}
              onChange={(e) => setName(e.target.value)}
              leftIcon={<User className="w-4 h-4" />}
            />

            <Input
              label="Choose a Password"
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leftIcon={<Lock className="w-4 h-4" />}
            />

            <Button type="submit" variant="primary" className="w-full" isLoading={isLoading}>
              Complete Account & Join Workspace
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
