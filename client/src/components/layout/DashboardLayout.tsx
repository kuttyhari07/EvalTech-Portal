import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import { CapacityCheck } from '../../types';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import {
  GraduationCap,
  LayoutDashboard,
  BookOpen,
  Users,
  FileQuestion,
  ClipboardList,
  BarChart3,
  CreditCard,
  Settings,
  Shield,
  Building2,
  FileText,
  LogOut,
  Menu,
  X,
  Bell,
  Sparkles,
  ChevronRight,
  UserCheck,
} from 'lucide-react';

export const DashboardLayout: React.FC = () => {
  const { user, organization, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [capacity, setCapacity] = useState<CapacityCheck | null>(null);

  useEffect(() => {
    // Fetch live capacity stats for staff and org admins
    if (user?.role === 'staff' || user?.role === 'org_admin') {
      api
        .get(user.role === 'org_admin' ? '/organizations/my-org' : '/subscriptions/my-subscription')
        .then((res) => {
          if (res.data?.data?.capacity) {
            setCapacity(res.data.data.capacity);
          }
        })
        .catch(() => {});
    }
  }, [user, location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Role-based Nav items
  const getNavLinks = () => {
    if (user?.role === 'super_admin') {
      return [
        { name: 'Global Overview', path: '/admin', icon: LayoutDashboard },
        { name: 'Organizations', path: '/admin/tenants', icon: Building2 },
        { name: 'Platform Users', path: '/admin/users', icon: Users },
        { name: 'Subscription Plans', path: '/admin/plans', icon: CreditCard },
        { name: 'Audit Logs', path: '/admin/audit-logs', icon: Shield },
        { name: 'System Settings', path: '/admin/settings', icon: Settings },
      ];
    }

    if (user?.role === 'org_admin') {
      return [
        { name: 'Institution Overview', path: '/org', icon: LayoutDashboard },
        { name: 'Staff Management', path: '/org/staff', icon: UserCheck },
        { name: 'Classes & Departments', path: '/org/classes', icon: BookOpen },
        { name: 'Student Roster', path: '/org/students', icon: Users },
        { name: 'Subscription & Quota', path: '/org/billing', icon: CreditCard },
      ];
    }

    // Default: Staff / Teacher
    return [
      { name: 'Overview', path: '/staff', icon: LayoutDashboard },
      { name: 'My Classes', path: '/staff/classes', icon: BookOpen },
      { name: 'Student Roster', path: '/staff/students', icon: Users },
      { name: 'Question Bank', path: '/staff/questions', icon: FileQuestion },
      { name: 'Examinations', path: '/staff/exams', icon: ClipboardList },
      { name: 'Results & Reports', path: '/staff/results', icon: BarChart3 },
      { name: 'Subscription & Quota', path: '/staff/billing', icon: CreditCard },
    ];
  };

  const navLinks = getNavLinks();

  const getRoleBadgeVariant = (role?: string) => {
    if (role === 'super_admin') return 'danger';
    if (role === 'org_admin') return 'purple';
    return 'info';
  };

  const capacityUsagePercent = capacity
    ? Math.min(100, Math.round((capacity.currentUsage / (capacity.maxCapacity || 1)) * 100))
    : 0;

  return (
    <div className="min-h-screen bg-pearl-50 flex flex-col lg:flex-row">
      {/* Mobile Top Header */}
      <div className="lg:hidden flex items-center justify-between px-4 py-3 bg-midnight-950 text-white border-b border-midnight-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-brand flex items-center justify-center text-white">
            <GraduationCap className="w-5 h-5 text-indigo-glow" />
          </div>
          <span className="text-lg font-bold">
            Eval<span className="text-indigo-glow">Tech</span>
          </span>
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-lg bg-midnight-800 text-pearl-200"
        >
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Backdrop Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-midnight-950/70 backdrop-blur-xs z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-midnight-950 text-pearl-100 flex flex-col justify-between border-r border-midnight-850 transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-auto ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-5 flex flex-col flex-1 overflow-y-auto">
          {/* Brand */}
          <div className="hidden lg:flex items-center gap-2.5 pb-6 border-b border-midnight-850">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-midnight-900 to-indigo-brand flex items-center justify-center text-white shadow-subtle">
              <GraduationCap className="w-5 h-5 text-indigo-glow" />
            </div>
            <div>
              <span className="text-xl font-extrabold tracking-tight text-white block">
                Eval<span className="text-indigo-glow">Tech</span>
              </span>
              <span className="text-[10px] text-pearl-300/70 font-mono tracking-wider uppercase">
                {organization?.name || 'SaaS Examination'}
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="mt-6 space-y-1">
            <p className="text-[10px] uppercase font-bold tracking-wider text-pearl-300/50 px-3 pb-2">
              Menu
            </p>
            {navLinks.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path || (item.path !== '/staff' && item.path !== '/org' && item.path !== '/admin' && location.pathname.startsWith(item.path));

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-indigo-brand text-white shadow-sm'
                      : 'text-pearl-200 hover:bg-midnight-900 hover:text-white'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-pearl-300/80'}`} />
                  {item.name}
                </Link>
              );
            })}
          </div>

          {/* Student Capacity Meter (for Staff and Org Admins) */}
          {capacity && user?.role !== 'super_admin' && (
            <div className="mt-8 p-3.5 rounded-xl bg-midnight-900/90 border border-midnight-800 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-pearl-200">Student Capacity</span>
                <span className="text-[11px] font-mono font-bold text-indigo-glow">
                  {capacity.currentUsage} / {capacity.maxCapacity}
                </span>
              </div>
              <div className="w-full bg-midnight-800 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    capacityUsagePercent >= 90
                      ? 'bg-rose-500'
                      : capacityUsagePercent >= 75
                      ? 'bg-amber-400'
                      : 'bg-indigo-brand'
                  }`}
                  style={{ width: `${capacityUsagePercent}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-pearl-300/80">
                <span className="capitalize">{capacity.tier} Plan</span>
                <Link
                  to={user?.role === 'org_admin' ? '/org/billing' : '/staff/billing'}
                  className="text-electric-blue hover:text-indigo-glow font-bold flex items-center gap-1"
                >
                  Upgrade <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* User Card & Logout */}
        <div className="p-4 border-t border-midnight-850 bg-midnight-900/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-indigo-brand/20 border border-indigo-brand/40 flex items-center justify-center text-indigo-glow font-bold text-xs shrink-0">
                {user?.name.charAt(0).toUpperCase()}
              </div>
              <div className="truncate">
                <p className="text-xs font-bold text-white truncate">{user?.name}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Badge variant={getRoleBadgeVariant(user?.role)} className="text-[9px] px-1.5 py-0">
                    {user?.role.replace('_', ' ')}
                  </Badge>
                </div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Sign Out"
              className="p-1.5 rounded-lg text-pearl-300/70 hover:text-rose-400 hover:bg-midnight-800 transition-colors shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Backdrop Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-midnight-950/70 backdrop-blur-xs lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="sticky top-0 z-20 bg-white border-b border-pearl-200 px-4 sm:px-6 py-2.5 sm:py-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 sm:gap-3 truncate">
            <h1 className="text-sm sm:text-base font-bold text-midnight-900 capitalize truncate">
              {location.pathname.split('/').pop()?.replace('-', ' ') || 'Dashboard'}
            </h1>
            {organization && (
              <span className="hidden sm:inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md bg-pearl-100 text-midnight-700 font-medium truncate max-w-[180px]">
                <Building2 className="w-3.5 h-3.5 text-indigo-brand shrink-0" />
                <span className="truncate">{organization.name}</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link to="/exam/join">
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Sparkles className="w-3.5 h-3.5 text-indigo-brand" />}
                className="text-xs h-8 sm:h-9 px-2.5 sm:px-3"
              >
                <span className="hidden sm:inline">Join Exam Preview</span>
                <span className="sm:hidden">Join Exam</span>
              </Button>
            </Link>
          </div>
        </header>

        {/* Page Content View */}
        <main className="flex-1 p-3.5 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
