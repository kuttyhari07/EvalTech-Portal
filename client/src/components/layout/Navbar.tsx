import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/Button';
import { GraduationCap, ArrowRight, ShieldCheck, Sparkles, LayoutDashboard, Menu, X } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const getDashboardPath = () => {
    if (!user) return '/login';
    if (user.role === 'super_admin') return '/admin';
    if (user.role === 'org_admin') return '/org';
    return '/staff';
  };

  return (
    <nav className="sticky top-0 z-40 w-full border-b border-pearl-200/80 bg-white/90 backdrop-blur-md">
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

          {/* Desktop Nav Links */}
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

          {/* Desktop Action CTAs */}
          <div className="hidden sm:flex items-center gap-2.5">
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

          {/* Mobile Menu Hamburger Toggle */}
          <div className="flex items-center gap-2 md:hidden">
            <Link to="/exam/join">
              <Button variant="outline" size="sm" className="h-8 px-2 text-xs">
                <Sparkles className="w-3.5 h-3.5 text-indigo-brand" />
              </Button>
            </Link>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-midnight-700 hover:text-midnight-950 hover:bg-pearl-100 transition-colors"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Slide-down Navigation Panel */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-pearl-200 bg-white px-4 pt-3 pb-5 space-y-3 shadow-xl animate-fadeIn">
          <div className="flex flex-col space-y-2 text-sm font-semibold text-midnight-800">
            <a
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-pearl-100 transition-colors"
            >
              Platform Features
            </a>
            <a
              href="#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-pearl-100 transition-colors"
            >
              How It Works
            </a>
            <a
              href="#pricing"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-pearl-100 transition-colors"
            >
              Pricing Plans
            </a>
            <Link
              to="/exam/join"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg text-indigo-brand font-bold bg-indigo-50 flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-indigo-brand" />
              <span>Attend Exam with Code</span>
            </Link>
          </div>

          <div className="pt-2 border-t border-pearl-100 flex flex-col gap-2">
            {user ? (
              <Button
                variant="primary"
                size="sm"
                className="w-full justify-center"
                leftIcon={<LayoutDashboard className="w-4 h-4" />}
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigate(getDashboardPath());
                }}
              >
                Go to Dashboard
              </Button>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="w-full">
                  <Button variant="outline" size="sm" className="w-full justify-center">
                    Sign In
                  </Button>
                </Link>
                <Link to="/register" onClick={() => setMobileMenuOpen(false)} className="w-full">
                  <Button variant="electric" size="sm" className="w-full justify-center">
                    Get Started
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};
