import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { ClassItem } from '../../types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { EmptyState } from '../../components/ui/EmptyState';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';
import { BookOpen, Plus, Users, Search, ArrowRight, Calendar, Sparkles } from 'lucide-react';

export const StaffClassesList: React.FC = () => {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New class form
  const [name, setName] = useState('');
  const [section, setSection] = useState('');
  const [academicYear, setAcademicYear] = useState('2025-2026');
  const [description, setDescription] = useState('');

  const fetchClasses = async () => {
    try {
      const res = await api.get('/classes');
      setClasses(res.data?.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.post('/classes', {
        name,
        section,
        academicYear,
        description,
      });

      setIsModalOpen(false);
      setName('');
      setSection('');
      setDescription('');
      fetchClasses();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtered = classes.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.section && c.section.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-pearl-200">
        <div>
          <h2 className="text-2xl font-extrabold text-midnight-950 tracking-tight">Classes & Cohorts</h2>
          <p className="text-xs text-midnight-600 mt-1">
            Organize your subjects, assign students, and target examination schedules.
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => setIsModalOpen(true)}
        >
          Create New Class
        </Button>
      </div>

      {/* Search Bar */}
      <div className="max-w-md">
        <Input
          placeholder="Search by class name, subject, or code..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leftIcon={<Search className="w-4 h-4" />}
        />
      </div>

      {/* Content */}
      {loading ? (
        <LoadingSkeleton count={3} className="h-40" />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No Classes Found"
          description={
            search ? 'No classes matched your search term.' : 'Create your first class to begin enrolling students.'
          }
          actionText={search ? undefined : 'Create Class'}
          onAction={() => setIsModalOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((cls) => (
            <Card key={cls._id} className="flex flex-col justify-between hover:border-indigo-brand/40 transition-colors">
              <CardHeader>
                <div className="flex items-center justify-between mb-1">
                  {cls.departmentId && typeof cls.departmentId === 'object' ? (
                    <span className="inline-block text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/60 px-2 py-0.5 rounded">
                      Dept: {cls.departmentId.name} ({cls.departmentId.code})
                    </span>
                  ) : (
                    <span className="text-[11px] text-midnight-500 font-medium">General Class</span>
                  )}
                  <span className="text-[11px] text-midnight-600 flex items-center gap-1 font-medium">
                    <Calendar className="w-3.5 h-3.5" /> {cls.academicYear || '2025-2026'}
                  </span>
                </div>
                <CardTitle className="text-base">{cls.name}</CardTitle>
                {cls.section && (
                  <CardDescription>
                    Section {cls.section}
                  </CardDescription>
                )}
              </CardHeader>

              <CardContent className="space-y-4">
                {cls.description && (
                  <p className="text-xs text-midnight-600 line-clamp-2">{cls.description}</p>
                )}
                <div className="flex items-center gap-2 text-xs font-semibold text-midnight-800 bg-pearl-50 p-2.5 rounded-lg border border-pearl-200/60">
                  <Users className="w-4 h-4 text-emerald-600" />
                  <span>{cls.studentCount || 0} Enrolled Students</span>
                </div>
              </CardContent>

              <div className="p-6 pt-0 border-t border-pearl-100 flex items-center justify-between">
                <Link to={`/staff/classes/${cls._id}`} className="w-full">
                  <Button variant="outline" size="sm" className="w-full" rightIcon={<ArrowRight className="w-4 h-4" />}>
                    Manage Class Roster
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Class Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create New Class"
        description="Fill in class details to initialize your class."
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="Class Name"
            required
            placeholder="e.g. Section A, 2nd Year - Sec A, Class 10"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Section (Optional)"
              placeholder="e.g. Section A"
              value={section}
              onChange={(e) => setSection(e.target.value)}
            />
            <Input
              label="Academic Year"
              placeholder="2025-2026"
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-midnight-700">
              Description (Optional)
            </label>
            <textarea
              rows={3}
              className="w-full rounded-lg border border-pearl-300 p-2.5 text-xs text-midnight-900 focus:border-indigo-brand focus:outline-none"
              placeholder="Class syllabus, room details, or notes..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              Create Class
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
