import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';
import { GraduationCap, ArrowRight, Lock, Mail, User, Building2, Phone, AlertCircle } from 'lucide-react';

export const Register: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [role, setRole] = useState<'staff' | 'org_admin'>('staff');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await register({
        name,
        email,
        password,
        role,
        organizationName: role === 'org_admin' ? organizationName : undefined,
        phone,
      });

      if (role === 'org_admin') navigate('/org');
      else navigate('/staff');
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please check your inputs.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-pearl-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
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
          Create Your Examination Workspace
        </h2>
        <p className="text-xs text-midnight-600 mt-1">
          Free Starter plan with 10 student capacity included automatically.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <Card className="shadow-xl border-pearl-200">
          <CardContent className="pt-6">
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-center gap-2 text-xs font-medium text-rose-700 animate-fadeIn">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Account Type Selector */}
            <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-pearl-100 border border-pearl-200 mb-5">
              <button
                type="button"
                onClick={() => setRole('staff')}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  role === 'staff'
                    ? 'bg-white text-midnight-900 shadow-subtle'
                    : 'text-midnight-600 hover:text-midnight-900'
                }`}
              >
                <User className="w-3.5 h-3.5 text-indigo-brand" /> Individual Staff
              </button>
              <button
                type="button"
                onClick={() => setRole('org_admin')}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  role === 'org_admin'
                    ? 'bg-white text-midnight-900 shadow-subtle'
                    : 'text-midnight-600 hover:text-midnight-900'
                }`}
              >
                <Building2 className="w-3.5 h-3.5 text-indigo-brand" /> Organization
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {role === 'org_admin' && (
                <Input
                  label="Institution / Organization Name"
                  placeholder="e.g. Oxford Academy, St. John High School"
                  required
                  value={organizationName}
                  onChange={(e) => setOrganizationName(e.target.value)}
                  leftIcon={<Building2 className="w-4 h-4" />}
                />
              )}

              <Input
                label="Full Name"
                placeholder="Dr. Eleanor Vance"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                leftIcon={<User className="w-4 h-4" />}
              />

              <Input
                label="Email Address"
                type="email"
                placeholder="name@institution.edu"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                leftIcon={<Mail className="w-4 h-4" />}
              />

              <Input
                label="Phone Number (Optional)"
                type="tel"
                placeholder="+91 98765 43210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                leftIcon={<Phone className="w-4 h-4" />}
              />

              <Input
                label="Password (min. 6 characters)"
                type="password"
                placeholder="••••••••"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                leftIcon={<Lock className="w-4 h-4" />}
              />

              <Button
                type="submit"
                variant="electric"
                className="w-full mt-3"
                isLoading={isLoading}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Create Account & Workspace
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-midnight-600 mt-6">
          Already have an account?{' '}
          <Link to="/login" className="font-bold text-indigo-brand hover:underline">
            Sign In Here
          </Link>
        </p>
      </div>
    </div>
  );
};
