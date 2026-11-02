import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { LoadingSkeleton } from '../components/ui/LoadingSkeleton';

// Instant lightweight Page Loader during code-split chunk load
const PageLoader: React.FC = () => (
  <div className="min-h-[50vh] flex flex-col items-center justify-center p-8 space-y-4">
    <div className="w-12 h-12 rounded-full bg-midnight-950 flex items-center justify-center shadow-subtle border border-midnight-800 animate-pulse overflow-hidden">
      <img src="/logo.png" alt="EvalTech" className="w-12 h-12 rounded-full object-cover" />
    </div>
    <div className="space-y-2 w-full max-w-xs">
      <div className="h-3 bg-pearl-200 rounded animate-pulse w-3/4 mx-auto" />
      <div className="h-2 bg-pearl-100 rounded animate-pulse w-1/2 mx-auto" />
    </div>
  </div>
);

// Public Pages (Lazy Loaded for ultra-fast initial bundle)
const LandingPage = React.lazy(() => import('../pages/public/LandingPage').then(m => ({ default: m.LandingPage })));
const Login = React.lazy(() => import('../pages/auth/Login').then(m => ({ default: m.Login })));
const Register = React.lazy(() => import('../pages/auth/Register').then(m => ({ default: m.Register })));
const ForgotPassword = React.lazy(() => import('../pages/auth/ForgotPassword').then(m => ({ default: m.ForgotPassword })));
const ResetPassword = React.lazy(() => import('../pages/auth/ResetPassword').then(m => ({ default: m.ResetPassword })));
const VerifyEmail = React.lazy(() => import('../pages/auth/VerifyEmail').then(m => ({ default: m.VerifyEmail })));
const JoinOrg = React.lazy(() => import('../pages/auth/JoinOrg').then(m => ({ default: m.JoinOrg })));

// Staff Pages
const StaffOverview = React.lazy(() => import('../pages/staff/Overview').then(m => ({ default: m.StaffOverview })));
const StaffClassesList = React.lazy(() => import('../pages/staff/ClassesList').then(m => ({ default: m.StaffClassesList })));
const StaffClassDetail = React.lazy(() => import('../pages/staff/ClassDetail').then(m => ({ default: m.StaffClassDetail })));
const StaffStudentsList = React.lazy(() => import('../pages/staff/StudentsList').then(m => ({ default: m.StaffStudentsList })));
const StaffQuestionBank = React.lazy(() => import('../pages/staff/QuestionBank').then(m => ({ default: m.StaffQuestionBank })));
const StaffExamsList = React.lazy(() => import('../pages/staff/ExamsList').then(m => ({ default: m.StaffExamsList })));
const StaffExamBuilder = React.lazy(() => import('../pages/staff/ExamBuilder').then(m => ({ default: m.StaffExamBuilder })));
const StaffExamResults = React.lazy(() => import('../pages/staff/ExamResults').then(m => ({ default: m.StaffExamResults })));
const StaffBilling = React.lazy(() => import('../pages/staff/Billing').then(m => ({ default: m.StaffBilling })));

// Organization Admin Pages
const OrgOverview = React.lazy(() => import('../pages/organization/Overview').then(m => ({ default: m.OrgOverview })));
const OrgStaffManagement = React.lazy(() => import('../pages/organization/StaffManagement').then(m => ({ default: m.OrgStaffManagement })));
const OrgDepartmentClassManagement = React.lazy(() => import('../pages/organization/DepartmentClassManagement').then(m => ({ default: m.OrgDepartmentClassManagement })));

// Super Admin Pages
const AdminOverview = React.lazy(() => import('../pages/admin/Overview').then(m => ({ default: m.AdminOverview })));
const AdminTenants = React.lazy(() => import('../pages/admin/Tenants').then(m => ({ default: m.AdminTenants })));
const AdminUsers = React.lazy(() => import('../pages/admin/Users').then(m => ({ default: m.AdminUsers })));
const AdminAuditLogs = React.lazy(() => import('../pages/admin/AuditLogs').then(m => ({ default: m.AdminAuditLogs })));

// Student Exam Experience Pages
const StudentExamWelcome = React.lazy(() => import('../pages/student/ExamWelcome').then(m => ({ default: m.StudentExamWelcome })));
const StudentExamLive = React.lazy(() => import('../pages/student/ExamLiveInterface').then(m => ({ default: m.StudentExamLive })));
const StudentExamSubmitted = React.lazy(() => import('../pages/student/ExamSubmitted').then(m => ({ default: m.StudentExamSubmitted })));
const StudentResultView = React.lazy(() => import('../pages/student/StudentResultView').then(m => ({ default: m.StudentResultView })));
const StudentDashboard = React.lazy(() => import('../pages/student/StudentDashboard').then(m => ({ default: m.StudentDashboard })));
const PracticeArena = React.lazy(() => import('../pages/student/PracticeArena').then(m => ({ default: m.PracticeArena })));

// Protected Route Guard
const ProtectedRoute: React.FC<{
  children: React.ReactNode;
  allowedRoles?: string[];
}> = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <LoadingSkeleton count={3} className="h-16 w-96" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to permitted home based on user's actual role
    if (user.role === 'super_admin') return <Navigate to="/admin" replace />;
    if (user.role === 'org_admin') return <Navigate to="/org" replace />;
    if (user.role === 'student') return <Navigate to="/student/dashboard" replace />;
    return <Navigate to="/staff" replace />;
  }

  return <>{children}</>;
};

export const AppRoutes: React.FC = () => {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public Pages */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/join-org" element={<JoinOrg />} />

        {/* Student Portal Dashboard & Exam Experience */}
        <Route
          path="/student/dashboard"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentDashboard />
            </ProtectedRoute>
          }
        />
        <Route path="/student" element={<Navigate to="/student/dashboard" replace />} />
        <Route
          path="/student/practice"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <PracticeArena />
            </ProtectedRoute>
          }
        />
        <Route path="/exam/join" element={<StudentExamWelcome />} />
        <Route path="/exam/:code" element={<StudentExamWelcome />} />
        <Route path="/exam/:code/take" element={<StudentExamLive />} />
        <Route path="/exam/:code/submitted" element={<StudentExamSubmitted />} />
        <Route path="/exam/:code/quit" element={<StudentExamSubmitted />} />
        <Route path="/student/results" element={<StudentResultView />} />

        {/* Staff / Teacher Dashboard */}
        <Route
          path="/staff"
          element={
            <ProtectedRoute allowedRoles={['staff', 'super_admin']}>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<StaffOverview />} />
          <Route path="classes" element={<StaffClassesList />} />
          <Route path="classes/:id" element={<StaffClassDetail />} />
          <Route path="students" element={<StaffStudentsList />} />
          <Route path="questions" element={<StaffQuestionBank />} />
          <Route path="exams" element={<StaffExamsList />} />
          <Route path="exams/create" element={<StaffExamBuilder />} />
          <Route path="exams/:id/edit" element={<StaffExamBuilder />} />
          <Route path="results" element={<StaffExamResults />} />
          <Route path="billing" element={<StaffBilling />} />
        </Route>

        {/* Organization Admin Dashboard */}
        <Route
          path="/org"
          element={
            <ProtectedRoute allowedRoles={['org_admin', 'super_admin']}>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<OrgOverview />} />
          <Route path="staff" element={<OrgStaffManagement />} />
          <Route path="classes" element={<OrgDepartmentClassManagement />} />
          <Route path="students" element={<StaffStudentsList />} />
          <Route path="billing" element={<StaffBilling />} />
        </Route>

        {/* Super Admin Dashboard */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={['super_admin']}>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminOverview />} />
          <Route path="tenants" element={<AdminTenants />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="plans" element={<StaffBilling />} />
          <Route path="audit-logs" element={<AdminAuditLogs />} />
          <Route path="settings" element={<AdminOverview />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
};
