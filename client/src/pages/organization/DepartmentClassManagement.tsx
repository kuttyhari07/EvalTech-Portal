import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { DepartmentItem, ClassItem } from '../../types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { EmptyState } from '../../components/ui/EmptyState';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';
import {
  Building2,
  BookOpen,
  Plus,
  Users,
  Search,
  ArrowRight,
  Calendar,
  Layers,
  GraduationCap,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  Pencil,
  Trash2,
} from 'lucide-react';

export const OrgDepartmentClassManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'departments' | 'classes'>('departments');

  // Data states
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [staffMembers, setStaffMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('all');

  // Department Modal
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<DepartmentItem | null>(null);
  const [deptName, setDeptName] = useState('');
  const [deptCode, setDeptCode] = useState('');
  const [deptDescription, setDeptDescription] = useState('');
  const [isDeptSubmitting, setIsDeptSubmitting] = useState(false);

  // Class Modal
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [className, setClassName] = useState('');
  const [classSection, setClassSection] = useState('');
  const [classSubject, setClassSubject] = useState('');
  const [classAcademicYear, setClassAcademicYear] = useState('2025-2026');
  const [classCode, setClassCode] = useState('');
  const [classDescription, setClassDescription] = useState('');
  const [classDepartmentId, setClassDepartmentId] = useState('');
  const [assignAllStaff, setAssignAllStaff] = useState(true);
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
  const [isClassSubmitting, setIsClassSubmitting] = useState(false);

  // Assign Staff to Class Modal
  const [isAssignStaffModalOpen, setIsAssignStaffModalOpen] = useState(false);
  const [selectedClassForStaff, setSelectedClassForStaff] = useState<ClassItem | null>(null);
  const [classAssignStaffIds, setClassAssignStaffIds] = useState<string[]>([]);
  const [isAssignSubmitting, setIsAssignSubmitting] = useState(false);

  // Notifications
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [deptRes, classRes, staffRes] = await Promise.all([
        api.get('/departments'),
        api.get('/classes'),
        api.get('/organizations/staff'),
      ]);
      setDepartments(deptRes.data?.data || []);
      setClasses(classRes.data?.data || []);
      setStaffMembers(staffRes.data?.data || []);
    } catch (err: any) {
      showToast('error', err.message || 'Failed to fetch data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Handle Department Create / Update
  const handleSaveDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsDeptSubmitting(true);
    try {
      if (editingDept) {
        await api.put(`/departments/${editingDept._id}`, {
          name: deptName,
          code: deptCode,
          description: deptDescription,
        });
        showToast('success', `Department "${deptName}" updated successfully.`);
      } else {
        await api.post('/departments', {
          name: deptName,
          code: deptCode,
          description: deptDescription,
        });
        showToast('success', `Department "${deptName}" created successfully.`);
      }

      setIsDeptModalOpen(false);
      setEditingDept(null);
      setDeptName('');
      setDeptCode('');
      setDeptDescription('');
      fetchData();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to save department.');
    } finally {
      setIsDeptSubmitting(false);
    }
  };

  const handleDeleteDepartment = async (deptId: string, deptName: string) => {
    if (confirm(`Are you sure you want to delete the department "${deptName}"?`)) {
      try {
        await api.delete(`/departments/${deptId}`);
        showToast('success', `Department "${deptName}" deleted.`);
        fetchData();
      } catch (err: any) {
        showToast('error', err.message || 'Failed to delete department.');
      }
    }
  };

  // Open Create Class pre-filled with department
  const handleOpenCreateClassForDept = (deptId: string) => {
    setClassDepartmentId(deptId);
    setClassName('');
    setClassSection('');
    setClassSubject('');
    setClassCode('');
    setClassDescription('');
    setAssignAllStaff(true);
    setSelectedStaffIds(staffMembers.map((m) => m.userId?._id).filter(Boolean));
    setIsClassModalOpen(true);
  };

  // Handle Class Create
  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsClassSubmitting(true);
    try {
      const assignedIds = assignAllStaff
        ? staffMembers.map((m) => m.userId?._id).filter(Boolean)
        : selectedStaffIds;

      await api.post('/classes', {
        name: className,
        section: classSection,
        subject: classSubject,
        academicYear: classAcademicYear,
        code: classCode || undefined,
        description: classDescription,
        departmentId: classDepartmentId || undefined,
        assignedStaffIds: assignedIds,
      });

      showToast('success', `Class "${className}" created successfully.`);
      setIsClassModalOpen(false);
      setClassName('');
      setClassSection('');
      setClassSubject('');
      setClassCode('');
      setClassDescription('');
      setClassDepartmentId('');
      fetchData();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to create class.');
    } finally {
      setIsClassSubmitting(false);
    }
  };

  // Open Assign Staff Modal
  const handleOpenAssignStaff = (cls: ClassItem) => {
    setSelectedClassForStaff(cls);
    const existingIds = (cls.assignedStaffIds || []).map((s: any) => s._id || s);
    if (cls.staffId?._id && !existingIds.includes(cls.staffId._id)) {
      existingIds.push(cls.staffId._id);
    }
    setClassAssignStaffIds(existingIds);
    setIsAssignStaffModalOpen(true);
  };

  const handleSaveAssignStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClassForStaff) return;
    setIsAssignSubmitting(true);
    try {
      await api.post(`/classes/${selectedClassForStaff._id}/assign-staff`, {
        staffIds: classAssignStaffIds,
      });
      showToast('success', `Staff assigned to "${selectedClassForStaff.name}" successfully.`);
      setIsAssignStaffModalOpen(false);
      fetchData();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to assign staff.');
    } finally {
      setIsAssignSubmitting(false);
    }
  };

  // Filtered lists
  const filteredDepartments = departments.filter(
    (d) =>
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredClasses = classes.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.subject?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesDept =
      selectedDeptFilter === 'all' ||
      (typeof c.departmentId === 'object' && c.departmentId?._id === selectedDeptFilter) ||
      (typeof c.departmentId === 'string' && c.departmentId === selectedDeptFilter);

    return matchesSearch && matchesDept;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-pearl-200">
        <div>
          <h2 className="text-2xl font-extrabold text-midnight-950 tracking-tight flex items-center gap-2">
            <Building2 className="w-6 h-6 text-indigo-brand" />
            Departments & Classes Management
          </h2>
          <p className="text-xs text-midnight-600 mt-1">
            Create institutional departments, organize classes under departments, and assign staff instructors to manage rosters.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Building2 className="w-4 h-4" />}
            onClick={() => {
              setEditingDept(null);
              setDeptName('');
              setDeptCode('');
              setDeptDescription('');
              setIsDeptModalOpen(true);
            }}
          >
            New Department
          </Button>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => {
              setClassDepartmentId('');
              setClassName('');
              setClassSection('');
              setClassSubject('');
              setClassCode('');
              setClassDescription('');
              setAssignAllStaff(true);
              setIsClassModalOpen(true);
            }}
          >
            Create New Class
          </Button>
        </div>
      </div>

      {/* Toast Notification */}
      {feedback && (
        <div
          className={`p-3 rounded-lg border text-xs font-semibold flex items-center gap-2 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-pearl-200">
        <button
          onClick={() => setActiveTab('departments')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'departments'
              ? 'border-indigo-brand text-indigo-brand'
              : 'border-transparent text-midnight-600 hover:text-midnight-900'
          }`}
        >
          <Building2 className="w-4 h-4" />
          Departments ({departments.length})
        </button>
        <button
          onClick={() => setActiveTab('classes')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'classes'
              ? 'border-indigo-brand text-indigo-brand'
              : 'border-transparent text-midnight-600 hover:text-midnight-900'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          Classes & Cohorts ({classes.length})
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="max-w-md w-full">
          <Input
            placeholder={
              activeTab === 'departments'
                ? 'Search departments by name or code...'
                : 'Search classes by name, subject, or code...'
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>

        {activeTab === 'classes' && (
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-midnight-600 whitespace-nowrap">Filter Dept:</label>
            <select
              value={selectedDeptFilter}
              onChange={(e) => setSelectedDeptFilter(e.target.value)}
              className="rounded-lg border border-pearl-300 bg-white px-3 py-2 text-xs text-midnight-900 focus:border-indigo-brand focus:outline-none"
            >
              <option value="all">All Departments ({classes.length})</option>
              {departments.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.name} ({d.code})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Content Rendering */}
      {loading ? (
        <LoadingSkeleton count={3} className="h-44" />
      ) : activeTab === 'departments' ? (
        /* ================= DEPARTMENTS TAB ================= */
        filteredDepartments.length === 0 ? (
          <EmptyState
            title="No Departments Established"
            description="Create your first academic or organizational department to organize classes and faculties."
            actionText="Create Department"
            onAction={() => {
              setEditingDept(null);
              setDeptName('');
              setDeptCode('');
              setDeptDescription('');
              setIsDeptModalOpen(true);
            }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDepartments.map((dept) => (
              <Card key={dept._id} className="flex flex-col justify-between hover:border-indigo-brand/40 transition-colors shadow-sm">
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-200/60 px-2.5 py-0.5 rounded-md">
                      {dept.code}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditingDept(dept);
                          setDeptName(dept.name);
                          setDeptCode(dept.code);
                          setDeptDescription(dept.description || '');
                          setIsDeptModalOpen(true);
                        }}
                        className="text-pearl-400 hover:text-indigo-600 p-1 transition-colors"
                        title="Edit Department"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteDepartment(dept._id, dept.name)}
                        className="text-pearl-400 hover:text-rose-600 p-1 transition-colors"
                        title="Delete Department"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <CardTitle className="text-base font-bold text-midnight-950">{dept.name}</CardTitle>
                  <CardDescription className="text-xs text-midnight-600 line-clamp-2 mt-1">
                    {dept.description || 'Institutional academic department.'}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-3">
                  <div className="grid grid-cols-3 gap-2 py-2 px-3 bg-pearl-50 rounded-lg border border-pearl-200/60 text-center">
                    <div>
                      <p className="text-[11px] text-midnight-500 font-medium">Classes</p>
                      <p className="text-sm font-extrabold text-midnight-900">{dept.classCount || 0}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-midnight-500 font-medium">Instructors</p>
                      <p className="text-sm font-extrabold text-indigo-700">{dept.staffCount || 0}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-midnight-500 font-medium">Students</p>
                      <p className="text-sm font-extrabold text-emerald-700">{dept.studentCount || 0}</p>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <Button
                      variant="primary"
                      size="sm"
                      className="w-full text-xs"
                      leftIcon={<Plus className="w-3.5 h-3.5" />}
                      onClick={() => handleOpenCreateClassForDept(dept._id)}
                    >
                      Add Class
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs"
                      rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                      onClick={() => {
                        setSelectedDeptFilter(dept._id);
                        setActiveTab('classes');
                      }}
                    >
                      View Classes
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      ) : (
        /* ================= CLASSES TAB ================= */
        filteredClasses.length === 0 ? (
          <EmptyState
            title="No Classes Found"
            description={
              searchQuery || selectedDeptFilter !== 'all'
                ? 'No classes match your filter or search query.'
                : 'Create your first class under a department to begin enrolling students.'
            }
            actionText="Create Class"
            onAction={() => {
              setClassDepartmentId(selectedDeptFilter !== 'all' ? selectedDeptFilter : '');
              setIsClassModalOpen(true);
            }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredClasses.map((cls) => {
              const deptObj = typeof cls.departmentId === 'object' ? cls.departmentId : null;
              const assignedCount = (cls.assignedStaffIds || []).length || (cls.staffId ? 1 : 0);

              return (
                <Card key={cls._id} className="flex flex-col justify-between hover:border-indigo-brand/40 transition-colors shadow-sm">
                  <CardHeader>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-[11px] font-bold text-indigo-brand bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                        {cls.code}
                      </span>
                      <span className="text-[11px] text-midnight-600 flex items-center gap-1 font-medium">
                        <Calendar className="w-3.5 h-3.5" /> {cls.academicYear || '2025-2026'}
                      </span>
                    </div>

                    <CardTitle className="text-base font-bold text-midnight-950 mt-1">{cls.name}</CardTitle>
                    <CardDescription className="text-xs">
                      {cls.subject || 'General'} {cls.section ? `• Sec ${cls.section}` : ''}
                    </CardDescription>

                    {deptObj && (
                      <div className="mt-2">
                        <Badge variant="purple" className="text-[10px] font-semibold">
                          Dept: {deptObj.name} ({deptObj.code})
                        </Badge>
                      </div>
                    )}
                  </CardHeader>

                  <CardContent className="space-y-3">
                    {cls.description && (
                      <p className="text-xs text-midnight-600 line-clamp-2">{cls.description}</p>
                    )}

                    <div className="space-y-1.5 bg-pearl-50 p-2.5 rounded-lg border border-pearl-200/60">
                      <div className="flex items-center justify-between text-xs font-semibold text-midnight-800">
                        <div className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{cls.studentCount || 0} Students Enrolled</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-midnight-600 pt-1 border-t border-pearl-200/50">
                        <div className="flex items-center gap-1.5">
                          <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
                          <span>{assignedCount} Staff Assigned</span>
                        </div>
                        <button
                          onClick={() => handleOpenAssignStaff(cls)}
                          className="text-indigo-600 hover:text-indigo-800 font-bold hover:underline"
                        >
                          Manage Staff
                        </button>
                      </div>
                    </div>
                  </CardContent>

                  <div className="p-6 pt-0 border-t border-pearl-100 flex items-center gap-2">
                    <Link to={`/staff/classes/${cls._id}`} className="w-full">
                      <Button variant="outline" size="sm" className="w-full text-xs" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                        Manage Class Roster & Students
                      </Button>
                    </Link>
                  </div>
                </Card>
              );
            })}
          </div>
        )
      )}

      {/* ================= MODAL: CREATE / EDIT DEPARTMENT ================= */}
      <Modal
        isOpen={isDeptModalOpen}
        onClose={() => setIsDeptModalOpen(false)}
        title={editingDept ? 'Edit Department' : 'Create New Department'}
        description="Departments organize your classes, courses, and faculty instructors."
      >
        <form onSubmit={handleSaveDepartment} className="space-y-4">
          <Input
            label="Department Name"
            required
            placeholder="e.g. Computer Science & Engineering"
            value={deptName}
            onChange={(e) => setDeptName(e.target.value)}
          />

          <Input
            label="Department Code"
            required
            maxLength={10}
            placeholder="e.g. CSE"
            value={deptCode}
            onChange={(e) => setDeptCode(e.target.value.toUpperCase())}
            helperText="Short uppercase acronym (e.g. CSE, MECH, EEE, MATH)"
          />

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-midnight-700">
              Description (Optional)
            </label>
            <textarea
              rows={3}
              placeholder="Brief details about this department..."
              value={deptDescription}
              onChange={(e) => setDeptDescription(e.target.value)}
              className="w-full rounded-lg border border-pearl-300 bg-white px-3 py-2 text-xs text-midnight-900 focus:border-indigo-brand focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <Button type="button" variant="outline" onClick={() => setIsDeptModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isDeptSubmitting}>
              {editingDept ? 'Save Changes' : 'Create Department'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ================= MODAL: CREATE NEW CLASS ================= */}
      <Modal
        isOpen={isClassModalOpen}
        onClose={() => setIsClassModalOpen(false)}
        title="Create New Class / Section"
        description="Add a class under an institutional department and assign staff."
      >
        <form onSubmit={handleCreateClass} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-midnight-700">
              Belongs to Department
            </label>
            <select
              value={classDepartmentId}
              onChange={(e) => setClassDepartmentId(e.target.value)}
              className="w-full rounded-lg border border-pearl-300 bg-white px-3 py-2.5 text-xs text-midnight-900 focus:border-indigo-brand focus:outline-none"
            >
              <option value="">No Department (General)</option>
              {departments.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.name} ({d.code})
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Class / Course Name"
            required
            placeholder="e.g. Data Structures & Algorithms"
            value={className}
            onChange={(e) => setClassName(e.target.value)}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Subject / Topic"
              placeholder="e.g. Computer Science"
              value={classSubject}
              onChange={(e) => setClassSubject(e.target.value)}
            />
            <Input
              label="Section / Cohort"
              placeholder="e.g. Sec A, Year 2"
              value={classSection}
              onChange={(e) => setClassSection(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Academic Year"
              placeholder="e.g. 2025-2026"
              value={classAcademicYear}
              onChange={(e) => setClassAcademicYear(e.target.value)}
            />
            <Input
              label="Class Code (Optional)"
              placeholder="Auto-generated if empty"
              value={classCode}
              onChange={(e) => setClassCode(e.target.value)}
            />
          </div>

          <div className="p-3 bg-indigo-50/70 rounded-lg border border-indigo-200/60 space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="assignAllStaffCheck"
                checked={assignAllStaff}
                onChange={(e) => setAssignAllStaff(e.target.checked)}
                className="w-4 h-4 text-indigo-brand rounded border-pearl-300 focus:ring-indigo-brand"
              />
              <label htmlFor="assignAllStaffCheck" className="text-xs font-bold text-midnight-900 cursor-pointer">
                Assign to all organization staff members automatically
              </label>
            </div>
            <p className="text-[11px] text-midnight-600 pl-6">
              When checked, all teachers in your organization can view this class, add students, and manage exams.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <Button type="button" variant="outline" onClick={() => setIsClassModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isClassSubmitting}>
              Create Class
            </Button>
          </div>
        </form>
      </Modal>

      {/* ================= MODAL: ASSIGN STAFF TO CLASS ================= */}
      <Modal
        isOpen={isAssignStaffModalOpen}
        onClose={() => setIsAssignStaffModalOpen(false)}
        title={`Assign Staff: ${selectedClassForStaff?.name}`}
        description="Select the teachers authorized to author exams and manage this class roster."
      >
        <form onSubmit={handleSaveAssignStaff} className="space-y-4">
          <div className="max-h-60 overflow-y-auto space-y-2 border border-pearl-200 rounded-lg p-3">
            {staffMembers.length === 0 ? (
              <p className="text-xs text-midnight-500 italic">No staff members found in organization roster.</p>
            ) : (
              staffMembers.map((m) => {
                const u = m.userId;
                if (!u) return null;
                const isChecked = classAssignStaffIds.includes(u._id);

                return (
                  <label
                    key={m._id}
                    className="flex items-center justify-between p-2 rounded hover:bg-pearl-50 cursor-pointer text-xs transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setClassAssignStaffIds([...classAssignStaffIds, u._id]);
                          } else {
                            setClassAssignStaffIds(classAssignStaffIds.filter((id) => id !== u._id));
                          }
                        }}
                        className="w-4 h-4 text-indigo-brand rounded border-pearl-300"
                      />
                      <div>
                        <p className="font-bold text-midnight-900">{u.name || 'Staff'}</p>
                        <p className="text-[11px] text-midnight-500">{u.email}</p>
                      </div>
                    </div>
                    <Badge variant={m.roleInOrg === 'org_admin' ? 'purple' : 'default'} className="text-[10px]">
                      {m.roleInOrg}
                    </Badge>
                  </label>
                );
              })
            )}
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <Button type="button" variant="outline" onClick={() => setIsAssignStaffModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isAssignSubmitting}>
              Save Assigned Staff
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

