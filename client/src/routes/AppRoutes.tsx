import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { LoadingSkeleton } from '../components/ui/LoadingSkeleton';

// Public Pages
import { LandingPage } from '../pages/public/LandingPage';
import { Login } from '../pages/auth/Login';
import { Register } from '../pages/auth/Register';
import { ForgotPassword } from '../pages/auth/ForgotPassword';
import { VerifyEmail } from '../pages/auth/VerifyEmail';
import { JoinOrg } from '../pages/auth/JoinOrg';

// Staff Pages
import { StaffOverview } from '../pages/staff/Overview';
import { StaffClassesList } from '../pages/staff/ClassesList';
import { StaffClassDetail } from '../pages/staff/ClassDetail';
import { StaffStudentsList } from '../pages/staff/StudentsList';
import { StaffQuestionBank } from '../pages/staff/QuestionBank';
import { StaffExamsList } from '../pages/staff/ExamsList';
import { StaffExamBuilder } from '../pages/staff/ExamBuilder';
import { StaffExamResults } from '../pages/staff/ExamResults';
import { StaffBilling } from '../pages/staff/Billing';

// Organization Admin Pages
import { OrgOverview } from '../pages/organization/Overview';
import { OrgStaffManagement } from '../pages/organization/StaffManagement';

// Super Admin Pages
import { AdminOverview } from '../pages/admin/Overview';
import { AdminTenants } from '../pages/admin/Tenants';
import { AdminUsers } from '../pages/admin/Users';
import { AdminAuditLogs } from '../pages/admin/AuditLogs';

// Student Exam Experience Pages
import { StudentExamWelcome } from '../pages/student/ExamWelcome';
import { StudentExamLive } from '../pages/student/ExamLiveInterface';
import { StudentExamSubmitted } from '../pages/student/ExamSubmitted';
import { StudentResultView } from '../pages/student/StudentResultView';
import { StudentDashboard } from '../pages/student/StudentDashboard';

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
    <Routes>
      {/* Public Pages */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
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
      <Route path="/exam/join" element={<StudentExamWelcome />} />
      <Route path="/exam/:code" element={<StudentExamWelcome />} />
      <Route path="/exam/:code/take" element={<StudentExamLive />} />
      <Route path="/exam/:code/submitted" element={<StudentExamSubmitted />} />
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
        <Route path="classes" element={<StaffClassesList />} />
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
  );
};
