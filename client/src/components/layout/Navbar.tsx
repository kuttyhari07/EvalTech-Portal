import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/Button';
import { GraduationCap, ArrowRight, ShieldCheck, Sparkles, LayoutDashboard } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const getDashboardPath = () => {
    if (!user) return '/login';
    if (user.role === 'super_admin') return '/admin';
    if (user.role === 'org_admin') return '/org';
    return '/staff';
  };

  return (
    <nav className="sticky top-0 z-40 w-full border-b border-pearl-200/80 bg-white/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-midnight-900 to-indigo-brand flex items-center justify-center text-white shadow-subtle group-hover:scale-105 transition-transform">
              <GraduationCap className="w-5 h-5 text-indigo-glow" />
            </div>
            <span className="text-xl font-extrabold tracking-tight text-midnight-900">
              Eval<span className="text-indigo-brand">Tech</span>
            </span>
          </Link>

          {/* Nav Links */}
          <div className="hidden md:flex items-center space-x-8 text-sm font-medium text-midnight-700">
            <a href="#features" className="hover:text-indigo-brand transition-colors">
              Platform Features
            </a>
            <a href="#how-it-works" className="hover:text-indigo-brand transition-colors">
              How It Works
            </a>
            <a href="#pricing" className="hover:text-indigo-brand transition-colors">
              Pricing Plans
            </a>
            <Link to="/exam/join" className="flex items-center gap-1.5 text-electric-blue hover:text-indigo-brand font-semibold transition-colors">
              <Sparkles className="w-4 h-4" /> Attend Exam
            </Link>
          </div>

          {/* Action CTAs */}
          <div className="flex items-center gap-3">
            {user ? (
              <Button
                variant="primary"
                size="sm"
                leftIcon={<LayoutDashboard className="w-4 h-4" />}
                onClick={() => navigate(getDashboardPath())}
              >
                Go to Dashboard
              </Button>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost" size="sm">
                    Sign In
                  </Button>
                </Link>
                <Link to="/register">
                  <Button
                    variant="electric"
                    size="sm"
                    rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                  >
                    Get Started Free
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
