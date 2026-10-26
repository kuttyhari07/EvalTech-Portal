import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../api/client';
import { ClassItem, StudentItem } from '../../types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import {
  BookOpen,
  Users,
  Plus,
  Upload,
  ArrowLeft,
  Mail,
  User,
  Calendar,
  AlertCircle,
  FileSpreadsheet,
  Pencil,
  KeyRound,
  CheckCircle2,
} from 'lucide-react';

export const StaffClassDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [classData, setClassData] = useState<ClassItem | null>(null);
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Add single student modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [studentIdNumber, setStudentIdNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Edit single student modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentItem | null>(null);
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editStudentIdNumber, setEditStudentIdNumber] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [resetPassword, setResetPassword] = useState(false);
  const [editModalError, setEditModalError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Batch CSV modal
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [csvText, setCsvText] = useState('');

  const fetchClassDetails = async () => {
    try {
      const res = await api.get(`/classes/${id}`);
      setClassData(res.data?.data?.class);
      setStudents(res.data?.data?.students || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClassDetails();
  }, [id]);

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    setIsSubmitting(true);
    try {
      await api.post('/students', {
        firstName,
        lastName,
        email,
        studentIdNumber,
        phone,
        classId: id,
      });

      setIsAddModalOpen(false);
      setFirstName('');
      setLastName('');
      setEmail('');
      setStudentIdNumber('');
      setPhone('');
      fetchClassDetails();
    } catch (err: any) {
      setModalError(err.message || 'Failed to add student. Capacity limit may have been reached.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBatchImport = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    setIsSubmitting(true);

    try {
      // Parse CSV rows: firstName, lastName, email, studentIdNumber
      const lines = csvText.trim().split('\n');
      const parsedStudents = [];

      for (const line of lines) {
        const parts = line.split(',').map((p) => p.trim());
        if (parts.length >= 3) {
          parsedStudents.push({
            firstName: parts[0],
            lastName: parts[1] || '',
            email: parts[2],
            studentIdNumber: parts[3] || `STU-${Math.floor(1000 + Math.random() * 9000)}`,
          });
        }
      }

      if (parsedStudents.length === 0) {
        throw new Error('No valid student rows found. Expected format: First, Last, Email, RollNumber');
      }

      await api.post('/students/batch-import', {
        students: parsedStudents,
        classId: id,
      });

      setIsCsvModalOpen(false);
      setCsvText('');
      fetchClassDetails();
    } catch (err: any) {
      setModalError(err.message || 'Batch import failed. Please verify format.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEdit = (s: StudentItem) => {
    setEditingStudent(s);
    setEditFirstName(s.firstName);
    setEditLastName(s.lastName);
    setEditEmail(s.email);
    setEditStudentIdNumber(s.studentIdNumber);
    setEditPhone(s.phone || '');
    setResetPassword(false);
    setEditModalError(null);
    setIsEditModalOpen(true);
  };

  const handleUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;

    setIsUpdating(true);
    setEditModalError(null);

    try {
      const res = await api.put(`/students/${editingStudent._id}`, {
        firstName: editFirstName.trim(),
        lastName: editLastName.trim(),
        email: editEmail.toLowerCase().trim(),
        studentIdNumber: editStudentIdNumber.trim(),
        phone: editPhone.trim() || undefined,
        resetPasswordToDefault: resetPassword,
      });

      const updated = res.data?.data;
      setStudents((prev) =>
        prev.map((s) => (s._id === editingStudent._id ? { ...s, ...updated } : s))
      );

      setIsEditModalOpen(false);
      setEditingStudent(null);
      setToastMsg(`Student "${editFirstName} ${editLastName}" updated successfully!`);
      setTimeout(() => setToastMsg(null), 3500);
      fetchClassDetails();
    } catch (err: any) {
      setEditModalError(err.message || 'Failed to update student details.');
    } finally {
      setIsUpdating(false);
    }
  };

  if (loading) return <LoadingSkeleton count={4} className="h-32" />;
  if (!classData) return <div>Class not found.</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-pearl-200">
        <div className="space-y-1">
          <Link
            to="/staff/classes"
            className="text-xs text-indigo-brand font-bold inline-flex items-center gap-1 hover:underline mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Classes
          </Link>
          <div className="flex items-center gap-2.5">
            <h2 className="text-2xl font-extrabold text-midnight-950 tracking-tight">
              {classData.name}
            </h2>
            <span className="font-mono text-xs font-bold bg-indigo-50 text-indigo-brand px-2 py-0.5 rounded">
              {classData.code}
            </span>
          </div>
          <p className="text-xs text-midnight-600">
            Subject: {classData.subject} • Section: {classData.section || 'All'} • Academic Year: {classData.academicYear}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Upload className="w-4 h-4" />}
            onClick={() => setIsCsvModalOpen(true)}
          >
            Batch CSV Import
          </Button>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setIsAddModalOpen(true)}
          >
            Add Student
          </Button>
        </div>
      </div>

      {toastMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800 flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Roster Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Class Roster ({students.length} Students)</CardTitle>
            <CardDescription>All students currently enrolled and eligible for scheduled exams</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {students.length === 0 ? (
            <EmptyState
              title="No Students Enrolled"
              description="Add students manually or import an entire cohort using CSV."
              actionText="Add Student"
              onAction={() => setIsAddModalOpen(true)}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-pearl-200 text-midnight-600 uppercase font-semibold text-[11px]">
                    <th className="py-3 px-4">Student Name</th>
                    <th className="py-3 px-4">Roll / ID Number</th>
                    <th className="py-3 px-4">Email Address</th>
                    <th className="py-3 px-4">Phone</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-pearl-100 font-medium">
                  {students.map((student) => (
                    <tr key={student._id} className="hover:bg-pearl-50/70 transition-colors">
                      <td className="py-3 px-4 font-bold text-midnight-900">
                        {student.firstName} {student.lastName}
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-indigo-brand">
                        {student.studentIdNumber}
                      </td>
                      <td className="py-3 px-4 text-midnight-600">{student.email}</td>
                      <td className="py-3 px-4 text-midnight-600">{student.phone || '—'}</td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Active
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleOpenEdit(student)}
                          title="Edit Student Details"
                          className="p-1.5 rounded-lg text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 border border-transparent hover:border-indigo-200 transition-all"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Student Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Student to Class"
        description="Verify capacity boundaries before enrollment."
      >
        <form onSubmit={handleAddStudent} className="space-y-4">
          {modalError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-center gap-2 text-xs font-medium text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{modalError}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="First Name"
              required
              placeholder="John"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
            <Input
              label="Last Name"
              required
              placeholder="Doe"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>

          <Input
            label="Email Address"
            type="email"
            required
            placeholder="john.doe@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Roll / Student ID Number"
              required
              placeholder="e.g. STU-1029"
              value={studentIdNumber}
              onChange={(e) => setStudentIdNumber(e.target.value)}
            />
            <Input
              label="Phone (Optional)"
              placeholder="+91 98765 43210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              Enroll Student
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Student Details Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingStudent(null);
        }}
        title={`Edit Student Details • ${editingStudent?.firstName} ${editingStudent?.lastName}`}
        description="Modify student profile, roll number, or email address."
      >
        <form onSubmit={handleUpdateStudent} className="space-y-4">
          {editModalError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-center gap-2 text-xs font-medium text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{editModalError}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="First Name"
              required
              placeholder="First name"
              value={editFirstName}
              onChange={(e) => setEditFirstName(e.target.value)}
            />
            <Input
              label="Last Name"
              required
              placeholder="Last name"
              value={editLastName}
              onChange={(e) => setEditLastName(e.target.value)}
            />
          </div>

          <Input
            label="Email Address"
            type="email"
            required
            placeholder="student@institution.edu"
            value={editEmail}
            onChange={(e) => setEditEmail(e.target.value)}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Roll / Student ID Number"
              required
              placeholder="STU-001"
              value={editStudentIdNumber}
              onChange={(e) => setEditStudentIdNumber(e.target.value)}
            />
            <Input
              label="Phone"
              placeholder="+91..."
              value={editPhone}
              onChange={(e) => setEditPhone(e.target.value)}
            />
          </div>

          <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200 space-y-1.5">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-amber-950">
              <input
                type="checkbox"
                checked={resetPassword}
                onChange={(e) => setResetPassword(e.target.checked)}
                className="w-4 h-4 text-indigo-brand rounded border-amber-300 focus:ring-indigo-brand"
              />
              <span className="flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-amber-700" />
                Reset Student Password to Initial Default
              </span>
            </label>
            <p className="text-[11px] text-amber-800 pl-6 leading-relaxed">
              If the student forgot their password or cannot log in, enable this to reset their credentials back to <code>Test@123</code>.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-pearl-200">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsEditModalOpen(false);
                setEditingStudent(null);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isUpdating}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* CSV Batch Import Modal */}
      <Modal
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
        title="Batch Import Students via CSV"
        description="Paste raw CSV lines below. Format: FirstName, LastName, Email, StudentIdNumber"
      >
        <form onSubmit={handleBatchImport} className="space-y-4">
          {modalError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-center gap-2 text-xs font-medium text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{modalError}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-midnight-600">
              <span className="font-semibold text-midnight-800">CSV Data (1 student per row)</span>
              <span className="font-mono text-[11px]">First, Last, Email, RollNo</span>
            </div>
            <textarea
              rows={8}
              required
              className="w-full rounded-lg border border-pearl-300 p-3 text-xs font-mono text-midnight-900 focus:border-indigo-brand focus:outline-none"
              placeholder={`Alice, Smith, alice.smith@edu.com, STU-201\nBob, Miller, bob.miller@edu.com, STU-202\nCharlie, Brown, charlie@edu.com, STU-203`}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setIsCsvModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              Import Cohort
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
