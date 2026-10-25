import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { StudentItem, ClassItem, CapacityCheck } from '../../types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import {
  Users,
  Plus,
  Upload,
  Search,
  BookOpen,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Archive,
  FileText,
  Download,
} from 'lucide-react';

export const StaffStudentsList: React.FC = () => {
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [capacity, setCapacity] = useState<CapacityCheck | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedClass, setSelectedClass] = useState('');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Form states
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [studentIdNumber, setStudentIdNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [targetClassId, setTargetClassId] = useState('');
  const [csvText, setCsvText] = useState('');
  const [csvTab, setCsvTab] = useState<'upload' | 'manual'>('upload');
  const [parsedPreview, setParsedPreview] = useState<
    Array<{ firstName: string; lastName: string; email: string; studentIdNumber: string }>
  >([]);

  const handleDownloadTemplate = () => {
    const templateContent =
      'FirstName,LastName,Email,StudentIdNumber\nArun,Kumar,arun.k@evaltech.io,STU-101\nPriya,Rajan,priya.r@evaltech.io,STU-102\nKarthik,Subbaraj,karthik.s@evaltech.io,STU-103\nDeepa,Selvam,deepa.s@evaltech.io,STU-104\n';
    const blob = new Blob([templateContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'evaltech_students_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const parseCsvContent = (content: string) => {
    const lines = content.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const results: Array<{ firstName: string; lastName: string; email: string; studentIdNumber: string }> = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (i === 0 && (line.toLowerCase().includes('firstname') || line.toLowerCase().includes('email'))) {
        continue;
      }
      const parts = line.split(',').map((p) => p.trim().replace(/^["']|["']$/g, ''));
      if (parts.length >= 3 && parts[2].includes('@')) {
        results.push({
          firstName: parts[0] || 'Student',
          lastName: parts[1] || '',
          email: parts[2].toLowerCase(),
          studentIdNumber: parts[3] || `STU-${Math.floor(1000 + Math.random() * 9000)}`,
        });
      }
    }
    return results;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvText(text);
      const parsed = parseCsvContent(text);
      setParsedPreview(parsed);
      if (parsed.length === 0) {
        setModalError('No valid student rows recognized. Ensure Email column contains valid email addresses.');
      } else {
        setModalError(null);
      }
    };
    reader.readAsText(file);
  };

  const fetchData = async () => {
    try {
      const [stuRes, clsRes, subRes] = await Promise.all([
        api.get(`/students${selectedClass ? `?classId=${selectedClass}` : ''}`),
        api.get('/classes'),
        api.get('/subscriptions/my-subscription'),
      ]);

      setStudents(stuRes.data?.data || []);
      setClasses(clsRes.data?.data || []);
      setCapacity(subRes.data?.data?.capacity || null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedClass]);

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
        classId: targetClassId || undefined,
      });

      setIsAddModalOpen(false);
      setFirstName('');
      setLastName('');
      setEmail('');
      setStudentIdNumber('');
      setPhone('');
      fetchData();
    } catch (err: any) {
      setModalError(err.message || 'Failed to add student.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBatchImport = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    const candidates = parsedPreview.length > 0 ? parsedPreview : parseCsvContent(csvText);
    if (candidates.length === 0) {
      setModalError('Please upload a valid CSV file or paste student records.');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/students/batch-import', {
        students: candidates,
        classId: targetClassId || undefined,
      });

      setIsCsvModalOpen(false);
      setCsvText('');
      setParsedPreview([]);
      fetchData();
    } catch (err: any) {
      setModalError(err.message || 'Batch import failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleArchive = async (id: string) => {
    if (confirm('Archive this student? They will be removed from classes and free up 1 capacity slot.')) {
      await api.delete(`/students/${id}`);
      fetchData();
    }
  };

  const filtered = students.filter(
    (s) =>
      s.firstName.toLowerCase().includes(search.toLowerCase()) ||
      s.lastName.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase()) ||
      s.studentIdNumber.toLowerCase().includes(search.toLowerCase())
  );

  const capacityPercent = capacity
    ? Math.min(100, Math.round((capacity.currentUsage / (capacity.maxCapacity || 1)) * 100))
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-pearl-200">
        <div>
          <h2 className="text-2xl font-extrabold text-midnight-950 tracking-tight">Student Roster Directory</h2>
          <p className="text-xs text-midnight-600 mt-1">
            Manage distinct enrolled students across all your classes and verify capacity limits.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Upload className="w-4 h-4" />}
            onClick={() => setIsCsvModalOpen(true)}
          >
            Batch CSV
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

      {/* Live Capacity Quota Card */}
      {capacity && (
        <Card className="bg-white border-pearl-200">
          <CardContent className="pt-5 pb-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-midnight-900 uppercase tracking-wider">
                    Plan Capacity Status
                  </span>
                  <Badge variant={capacityPercent >= 90 ? 'danger' : 'purple'} className="text-[10px]">
                    {capacity.tier} Tier ({capacity.currentUsage} / {capacity.maxCapacity})
                  </Badge>
                </div>
                <p className="text-xs text-midnight-600">
                  {capacity.remainingCapacity} student slot{capacity.remainingCapacity === 1 ? '' : 's'} remaining in your plan. Duplicate student records across multiple classes do not consume extra capacity.
                </p>
              </div>

              <div className="w-full sm:w-64 space-y-1">
                <div className="flex justify-between text-[11px] font-mono font-bold text-midnight-700">
                  <span>Usage</span>
                  <span>{capacityPercent}%</span>
                </div>
                <div className="w-full bg-pearl-200 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      capacityPercent >= 90 ? 'bg-rose-500' : 'bg-indigo-brand'
                    }`}
                    style={{ width: `${capacityPercent}%` }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="w-full sm:w-80">
          <Input
            placeholder="Search by name, roll no, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>

        <div className="w-full sm:w-60">
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="w-full rounded-lg border border-pearl-300 bg-white px-3 py-2.5 text-xs text-midnight-900 focus:border-indigo-brand focus:outline-none"
          >
            <option value="">All Classes</option>
            {classes.map((cls) => (
              <option key={cls._id} value={cls._id}>
                {cls.name} ({cls.code})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <LoadingSkeleton count={5} className="h-12" />
          ) : filtered.length === 0 ? (
            <EmptyState
              title="No Students Found"
              description={search ? 'No students matched your search.' : 'Add your first student to get started.'}
              actionText={search ? undefined : 'Add Student'}
              onAction={() => setIsAddModalOpen(true)}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-pearl-200 text-midnight-600 uppercase font-semibold text-[11px]">
                    <th className="py-3 px-4">Student Name</th>
                    <th className="py-3 px-4">Roll / ID</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Phone</th>
                    <th className="py-3 px-4">Enrolled Classes</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-pearl-100 font-medium">
                  {filtered.map((s) => (
                    <tr key={s._id} className="hover:bg-pearl-50/70 transition-colors">
                      <td className="py-3 px-4 font-bold text-midnight-900">
                        {s.firstName} {s.lastName}
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-indigo-brand">
                        {s.studentIdNumber}
                      </td>
                      <td className="py-3 px-4 text-midnight-600">{s.email}</td>
                      <td className="py-3 px-4 text-midnight-600">{s.phone || '—'}</td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {s.classes && s.classes.length > 0 ? (
                            s.classes.map((c) => (
                              <span
                                key={c._id}
                                className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-pearl-100 text-midnight-800"
                              >
                                {c.name}
                              </span>
                            ))
                          ) : (
                            <span className="text-[11px] text-midnight-600 italic">Not in class</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleArchive(s._id)}
                          title="Archive Student"
                          className="p-1 rounded text-rose-500 hover:bg-rose-50 transition-colors"
                        >
                          <Archive className="w-4 h-4" />
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
        title="Add New Student"
        description="Add a student and optionally enroll them into a class immediately."
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
              placeholder="First name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
            <Input
              label="Last Name"
              required
              placeholder="Last name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>

          <Input
            label="Email Address"
            type="email"
            required
            placeholder="student@institution.edu"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Roll / Student ID Number"
              required
              placeholder="STU-001"
              value={studentIdNumber}
              onChange={(e) => setStudentIdNumber(e.target.value)}
            />
            <Input
              label="Phone"
              placeholder="+91..."
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-midnight-700">
              Initial Class Enrollment (Optional)
            </label>
            <select
              value={targetClassId}
              onChange={(e) => setTargetClassId(e.target.value)}
              className="w-full rounded-lg border border-pearl-300 bg-white px-3 py-2.5 text-xs text-midnight-900 focus:border-indigo-brand focus:outline-none"
            >
              <option value="">No initial class</option>
              {classes.map((cls) => (
                <option key={cls._id} value={cls._id}>
                  {cls.name} ({cls.code})
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              Add Student
            </Button>
          </div>
        </form>
      </Modal>

      {/* CSV Batch Import Modal */}
      <Modal
        isOpen={isCsvModalOpen}
        onClose={() => {
          setIsCsvModalOpen(false);
          setParsedPreview([]);
          setCsvText('');
          setModalError(null);
        }}
        title="Bulk Student Onboarding & Batch Import"
        description="Upload a CSV/Excel file or paste student records to create accounts in seconds."
        size="lg"
      >
        <form onSubmit={handleBatchImport} className="space-y-4">
          {modalError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-center gap-2 text-xs font-medium text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{modalError}</span>
            </div>
          )}

          {/* Quick Header Ribbon */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-pearl-50 border border-pearl-200 text-xs">
            <div>
              <span className="font-bold text-midnight-900 block">Need the exact CSV format?</span>
              <span className="text-[11px] text-midnight-600">
                Headers: FirstName, LastName, Email, StudentIdNumber
              </span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              leftIcon={<Download className="w-3.5 h-3.5 text-indigo-brand" />}
              onClick={handleDownloadTemplate}
            >
              Download Sample CSV Template
            </Button>
          </div>

          {/* Target Class Selection */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-midnight-700">
              Target Class Enrollment (Optional)
            </label>
            <select
              value={targetClassId}
              onChange={(e) => setTargetClassId(e.target.value)}
              className="w-full rounded-lg border border-pearl-300 bg-white px-3 py-2 text-xs text-midnight-900 focus:border-indigo-brand focus:outline-none"
            >
              <option value="">Do not assign to class yet</option>
              {classes.map((cls) => (
                <option key={cls._id} value={cls._id}>
                  {cls.name} ({cls.code})
                </option>
              ))}
            </select>
          </div>

          {/* Upload Method Tabs */}
          <div className="flex items-center gap-2 border-b border-pearl-200 pb-2">
            <button
              type="button"
              onClick={() => setCsvTab('upload')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                csvTab === 'upload' ? 'bg-midnight-900 text-white' : 'text-midnight-600 hover:text-midnight-900'
              }`}
            >
              📁 File Upload (.csv, .txt)
            </button>
            <button
              type="button"
              onClick={() => setCsvTab('manual')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                csvTab === 'manual' ? 'bg-midnight-900 text-white' : 'text-midnight-600 hover:text-midnight-900'
              }`}
            >
              ✏️ Direct Paste
            </button>
          </div>

          {csvTab === 'upload' ? (
            <div className="space-y-3">
              <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-pearl-300 hover:border-indigo-brand rounded-2xl cursor-pointer bg-white transition-all">
                <Upload className="w-8 h-8 text-indigo-brand mb-2" />
                <span className="text-xs font-bold text-midnight-900">
                  Click to select or drag & drop CSV file
                </span>
                <span className="text-[11px] text-midnight-500 mt-0.5">
                  Standard comma-separated format (.csv or .txt)
                </span>
                <input
                  type="file"
                  accept=".csv,text/csv,text/plain"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </label>
            </div>
          ) : (
            <div className="space-y-1.5">
              <textarea
                rows={6}
                className="w-full rounded-lg border border-pearl-300 p-3 text-xs font-mono text-midnight-900 focus:border-indigo-brand focus:outline-none"
                placeholder={`Arun, Kumar, arun.k@evaltech.io, STU-101\nPriya, Rajan, priya.r@evaltech.io, STU-102`}
                value={csvText}
                onChange={(e) => {
                  setCsvText(e.target.value);
                  setParsedPreview(parseCsvContent(e.target.value));
                }}
              />
            </div>
          )}

          {/* Parsed Preview Table */}
          {parsedPreview.length > 0 && (
            <div className="space-y-2 border-t border-pearl-200 pt-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-midnight-900">
                  Preview Valid Candidates ({parsedPreview.length} recognized)
                </span>
                <span className="text-emerald-600 font-semibold text-[11px]">Ready for batch creation</span>
              </div>
              <div className="max-h-44 overflow-y-auto border border-pearl-200 rounded-lg">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-pearl-100 text-midnight-700 uppercase font-semibold sticky top-0">
                    <tr>
                      <th className="py-2 px-3">#</th>
                      <th className="py-2 px-3">First Name</th>
                      <th className="py-2 px-3">Last Name</th>
                      <th className="py-2 px-3">Email Address</th>
                      <th className="py-2 px-3">Student Roll ID</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-pearl-100 font-mono text-midnight-800">
                    {parsedPreview.map((p, idx) => (
                      <tr key={idx} className="hover:bg-pearl-50">
                        <td className="py-1.5 px-3">{idx + 1}</td>
                        <td className="py-1.5 px-3 font-bold">{p.firstName}</td>
                        <td className="py-1.5 px-3">{p.lastName || '—'}</td>
                        <td className="py-1.5 px-3 text-indigo-brand">{p.email}</td>
                        <td className="py-1.5 px-3">{p.studentIdNumber}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2 border-t border-pearl-200">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsCsvModalOpen(false);
                setParsedPreview([]);
                setCsvText('');
              }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              {parsedPreview.length > 0 ? `Import ${parsedPreview.length} Students` : 'Import Cohort'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
