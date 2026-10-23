import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { api } from '../../api/client';
import { QuestionItem, ClassItem } from '../../types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import {
  ClipboardList,
  Plus,
  ArrowLeft,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Shuffle,
  Trash2,
  FileQuestion,
  Lock,
} from 'lucide-react';

export const StaffExamBuilder: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const isEditing = Boolean(id);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subject, setSubject] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [passingMarks, setPassingMarks] = useState(40);
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [shuffleQuestions, setShuffleQuestions] = useState(false);
  const [shuffleOptions, setShuffleOptions] = useState(false);
  const [negativeMarkingEnabled, setNegativeMarkingEnabled] = useState(false);
  const [negativePenalty, setNegativePenalty] = useState(0.5);
  const [releaseResultsMode, setReleaseResultsMode] = useState<'immediate' | 'manual'>('immediate');
  const [showExplanations, setShowExplanations] = useState(true);
  const [instructions, setInstructions] = useState('');
  const [requireSEB, setRequireSEB] = useState(false);
  const [sebBrowserExamKey, setSebBrowserExamKey] = useState('');
  const [startPassword, setStartPassword] = useState('');
  const [exitPassword, setExitPassword] = useState('');

  // Selected questions for this exam
  const [examQuestions, setExamQuestions] = useState<{ question: QuestionItem; marks: number }[]>([]);

  // Database resources
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [bankQuestions, setBankQuestions] = useState<QuestionItem[]>([]);
  const [isQuestionPickerOpen, setIsQuestionPickerOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Defaults for dates: now and 7 days later
    const now = new Date();
    const future = new Date(Date.now() + 7 * 24 * 3600 * 1000);
    setStartsAt(now.toISOString().slice(0, 16));
    setEndsAt(future.toISOString().slice(0, 16));

    // Load classes and question bank
    Promise.all([api.get('/classes'), api.get('/questions')])
      .then(([clsRes, qRes]) => {
        setClasses(clsRes.data?.data || []);
        setBankQuestions(qRes.data?.data || []);
      })
      .catch((err) => console.error(err));

    // If in edit mode, fetch existing exam details
    if (id) {
      api.get(`/exams/${id}`)
        .then((res) => {
          const ex = res.data?.data;
          if (ex) {
            setTitle(ex.title || '');
            setDescription(ex.description || '');
            setSubject(ex.subject || '');
            setDurationMinutes(ex.durationMinutes || 60);
            setPassingMarks(ex.passingMarks || 40);
            if (ex.startsAt) setStartsAt(new Date(ex.startsAt).toISOString().slice(0, 16));
            if (ex.endsAt) setEndsAt(new Date(ex.endsAt).toISOString().slice(0, 16));
            setSelectedClassIds((ex.classIds || []).map((c: any) => (typeof c === 'object' ? c._id : c)));
            setShuffleQuestions(Boolean(ex.shuffleQuestions));
            setShuffleOptions(Boolean(ex.shuffleOptions));
            setNegativeMarkingEnabled(Boolean(ex.negativeMarking?.enabled));
            setNegativePenalty(ex.negativeMarking?.penaltyPerQuestion ?? 0.5);
            setReleaseResultsMode(ex.releaseResultsMode || 'immediate');
            setShowExplanations(ex.showExplanationsAfterSubmission !== false);
            setInstructions(ex.instructions || '');
            setRequireSEB(Boolean(ex.requireSEB));
            setSebBrowserExamKey(ex.sebBrowserExamKey || '');
            setStartPassword(ex.startPassword || '');
            setExitPassword(ex.exitPassword || '');

            if (ex.questions && Array.isArray(ex.questions)) {
              const loadedQuestions = ex.questions
                .filter((item: any) => item.questionId)
                .map((item: any) => ({
                  question: typeof item.questionId === 'object' ? item.questionId : { _id: item.questionId },
                  marks: item.marks || 1,
                }));
              setExamQuestions(loadedQuestions);
            }
          }
        })
        .catch((err) => console.error('Failed to load exam:', err));
    }
  }, [id]);

  const totalCalculatedMarks = examQuestions.reduce((acc, q) => acc + (q.marks || 1), 0);

  const handleAddQuestionFromBank = (q: QuestionItem) => {
    if (!examQuestions.some((item) => item.question._id === q._id)) {
      setExamQuestions([...examQuestions, { question: q, marks: q.defaultMarks || 1 }]);
    }
  };

  const handleRemoveQuestion = (idx: number) => {
    const updated = [...examQuestions];
    updated.splice(idx, 1);
    setExamQuestions(updated);
  };

  const handleUpdateMarks = (idx: number, newMarks: number) => {
    const updated = [...examQuestions];
    updated[idx].marks = Math.max(1, newMarks);
    setExamQuestions(updated);
  };

  const handleGenerateInstructions = async () => {
    try {
      const res = await api.post('/ai/assistant', {
        subject,
        examTitle: title,
        durationMinutes,
      });
      if (res.data?.data?.instructions) {
        setInstructions(res.data.data.instructions);
      }
    } catch {}
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (examQuestions.length === 0) {
      setError('Please add at least one question to this examination before saving.');
      return;
    }

    setIsSubmitting(true);
    try {
      const formattedQuestions = examQuestions.map((item, idx) => ({
        questionId: item.question._id,
        marks: item.marks,
        negativeMarks: negativeMarkingEnabled ? negativePenalty : 0,
        order: idx + 1,
      }));

      const payload = {
        title,
        description,
        subject,
        durationMinutes: Number(durationMinutes),
        totalMarks: totalCalculatedMarks,
        passingMarks: Number(passingMarks),
        startsAt: new Date(startsAt),
        endsAt: new Date(endsAt),
        classIds: selectedClassIds,
        shuffleQuestions,
        shuffleOptions,
        negativeMarking: {
          enabled: negativeMarkingEnabled,
          penaltyPerQuestion: negativePenalty,
        },
        releaseResultsMode,
        showExplanationsAfterSubmission: showExplanations,
        instructions,
        questions: formattedQuestions,
        requireSEB,
        sebBrowserExamKey: requireSEB ? sebBrowserExamKey : undefined,
        startPassword: startPassword.trim() || undefined,
        exitPassword: exitPassword.trim() || undefined,
      };

      if (isEditing) {
        await api.put(`/exams/${id}`, payload);
      } else {
        await api.post('/exams', payload);
      }

      navigate('/staff/exams');
    } catch (err: any) {
      setError(err.message || 'Failed to save examination.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-pearl-200">
        <div>
          <Link
            to="/staff/exams"
            className="text-xs text-indigo-brand font-bold inline-flex items-center gap-1 hover:underline mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Examinations
          </Link>
          <h2 className="text-2xl font-extrabold text-midnight-950 tracking-tight">
            {isEditing ? 'Edit Examination' : 'Examination Builder Suite'}
          </h2>
          <p className="text-xs text-midnight-600 mt-1">
            {isEditing
              ? 'Update examination parameters, question items, and student rules.'
              : 'Configure examination parameters, assign eligible cohorts, and select question items.'}
          </p>
        </div>

        <Button
          type="button"
          variant="primary"
          onClick={handleSubmit}
          isLoading={isSubmitting}
        >
          {isEditing ? 'Save Changes' : 'Save & Publish Exam'}
        </Button>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-center gap-2 text-xs font-medium text-rose-700">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Configuration Details (Left 2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>General Exam Information</CardTitle>
              <CardDescription>Title, subject, duration, and scheduled active window</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="Examination Title"
                required
                placeholder="e.g. Midterm Assessment: Algorithms & Data Structures"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Subject / Domain"
                  required
                  placeholder="e.g. Computer Science"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
                <Input
                  label="Duration (Minutes)"
                  type="number"
                  min={5}
                  required
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Scheduled Starts At"
                  type="datetime-local"
                  required
                  value={startsAt}
                  onChange={(e) => setStartsAt(e.target.value)}
                />
                <Input
                  label="Deadline Ends At"
                  type="datetime-local"
                  required
                  value={endsAt}
                  onChange={(e) => setEndsAt(e.target.value)}
                />
              </div>

              {/* Class Assignment */}
              <div className="space-y-1.5 pt-1">
                <label className="block text-xs font-semibold uppercase tracking-wider text-midnight-700">
                  Target Enrolled Classes (Select multiple)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {classes.map((c) => {
                    const isSelected = selectedClassIds.includes(c._id);
                    return (
                      <button
                        type="button"
                        key={c._id}
                        onClick={() => {
                          setSelectedClassIds(
                            isSelected
                              ? selectedClassIds.filter((id) => id !== c._id)
                              : [...selectedClassIds, c._id]
                          );
                        }}
                        className={`p-2.5 rounded-lg border text-xs font-semibold text-left transition-all ${
                          isSelected
                            ? 'bg-indigo-50 border-indigo-brand text-indigo-brand shadow-subtle'
                            : 'bg-white border-pearl-200 text-midnight-700 hover:border-pearl-300'
                        }`}
                      >
                        <div className="truncate">{c.name}</div>
                        <div className="text-[10px] text-midnight-600 font-mono">{c.code}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Instructions with AI Draft helper */}
              <div className="space-y-1.5 pt-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-midnight-700">
                    Student Examination Rules & Instructions
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateInstructions}
                    className="text-xs text-indigo-brand hover:underline flex items-center gap-1 font-bold"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-indigo-light" /> AI Draft Instructions
                  </button>
                </div>
                <textarea
                  rows={4}
                  className="w-full rounded-lg border border-pearl-300 p-3 text-xs text-midnight-900 focus:border-indigo-brand focus:outline-none"
                  placeholder="Rules on calculator use, timer behavior, penalties for tab switching..."
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Exam Questions Section */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Question Paper ({examQuestions.length} Questions)</CardTitle>
                <CardDescription>Select questions and customize marks per question</CardDescription>
              </div>
              <Button
                type="button"
                variant="electric"
                size="sm"
                leftIcon={<Plus className="w-4 h-4" />}
                onClick={() => setIsQuestionPickerOpen(true)}
              >
                Add Questions from Bank
              </Button>
            </CardHeader>
            <CardContent>
              {examQuestions.length === 0 ? (
                <div className="text-center py-10 border-2 border-dashed border-pearl-200 rounded-xl bg-pearl-50/50">
                  <FileQuestion className="w-8 h-8 text-midnight-600 mx-auto mb-2" />
                  <p className="text-xs font-bold text-midnight-800">No questions added yet</p>
                  <p className="text-[11px] text-midnight-600 mt-0.5 mb-3">
                    Click "Add Questions from Bank" to pick questions.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsQuestionPickerOpen(true)}
                  >
                    Select Questions
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {examQuestions.map((item, idx) => (
                    <div
                      key={item.question._id}
                      className="p-3.5 rounded-xl border border-pearl-200 bg-white shadow-subtle flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-6 h-6 rounded-full bg-pearl-100 text-midnight-700 font-bold text-xs flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <div className="truncate">
                          <p className="text-xs font-bold text-midnight-900 truncate">
                            {item.question.title || item.question.text || 'Question'}
                          </p>
                          <div className="flex items-center gap-2 text-[10px] text-midnight-600 mt-0.5">
                            <span className="capitalize">{(item.question.type || 'mcq').replace('_', ' ')}</span>
                            <span>•</span>
                            <span className="capitalize">{item.question.difficulty || 'medium'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-midnight-600 font-medium">Marks:</span>
                          <input
                            type="number"
                            min={1}
                            className="w-14 rounded border border-pearl-300 px-2 py-1 text-xs font-bold text-midnight-900 text-center"
                            value={item.marks}
                            onChange={(e) => handleUpdateMarks(idx, Number(e.target.value))}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveQuestion(idx)}
                          className="text-pearl-300 hover:text-rose-500 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Sidebar: Rules & Controls */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Exam Execution Rules</CardTitle>
              <CardDescription>Security and release controls</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Input
                  label="Passing Marks"
                  type="number"
                  min={1}
                  required
                  value={passingMarks}
                  onChange={(e) => setPassingMarks(Number(e.target.value))}
                />
              </div>

              {/* Shuffling */}
              <div className="space-y-2 pt-2 border-t border-pearl-100">
                <label className="flex items-center justify-between text-xs font-semibold text-midnight-800 cursor-pointer">
                  <span>Randomize Question Order</span>
                  <input
                    type="checkbox"
                    checked={shuffleQuestions}
                    onChange={(e) => setShuffleQuestions(e.target.checked)}
                    className="w-4 h-4 text-indigo-brand rounded"
                  />
                </label>
                <label className="flex items-center justify-between text-xs font-semibold text-midnight-800 cursor-pointer">
                  <span>Shuffle Answer Options</span>
                  <input
                    type="checkbox"
                    checked={shuffleOptions}
                    onChange={(e) => setShuffleOptions(e.target.checked)}
                    className="w-4 h-4 text-indigo-brand rounded"
                  />
                </label>
              </div>

              {/* Negative Marking */}
              <div className="space-y-2 pt-2 border-t border-pearl-100">
                <label className="flex items-center justify-between text-xs font-semibold text-midnight-800 cursor-pointer">
                  <span>Enable Negative Marking</span>
                  <input
                    type="checkbox"
                    checked={negativeMarkingEnabled}
                    onChange={(e) => setNegativeMarkingEnabled(e.target.checked)}
                    className="w-4 h-4 text-indigo-brand rounded"
                  />
                </label>
                {negativeMarkingEnabled && (
                  <Input
                    label="Penalty Per Incorrect Answer"
                    type="number"
                    step="0.25"
                    min="0.25"
                    value={negativePenalty}
                    onChange={(e) => setNegativePenalty(Number(e.target.value))}
                  />
                )}
              </div>

              {/* Result Release Mode */}
              <div className="space-y-2 pt-2 border-t border-pearl-100">
                <label className="block text-xs font-semibold uppercase tracking-wider text-midnight-700">
                  Result Release Mode
                </label>
                <select
                  value={releaseResultsMode}
                  onChange={(e) => setReleaseResultsMode(e.target.value as any)}
                  className="w-full rounded-lg border border-pearl-300 bg-white px-3 py-2 text-xs text-midnight-900"
                >
                  <option value="immediate">Immediate (Auto-release upon submit)</option>
                  <option value="manual">Manual (Hold results until teacher releases)</option>
                </select>
              </div>

              {/* Show Explanations */}
              <label className="flex items-center justify-between text-xs font-semibold text-midnight-800 cursor-pointer pt-2 border-t border-pearl-100">
                <span>Show Explanations to Students</span>
                <input
                  type="checkbox"
                  checked={showExplanations}
                  onChange={(e) => setShowExplanations(e.target.checked)}
                  className="w-4 h-4 text-indigo-brand rounded"
                />
              </label>

              {/* Safe Exam Browser */}
              <div className="space-y-2 pt-2 border-t border-pearl-100">
                <label className="flex items-center justify-between text-xs font-semibold text-midnight-800 cursor-pointer">
                  <span>Enforce Safe Exam Browser (SEB)</span>
                  <input
                    type="checkbox"
                    checked={requireSEB}
                    onChange={(e) => setRequireSEB(e.target.checked)}
                    className="w-4 h-4 text-indigo-brand rounded"
                  />
                </label>
                {requireSEB && (
                  <Input
                    label="SEB Browser Exam Key (Optional)"
                    placeholder="Enter 64-char key hash"
                    value={sebBrowserExamKey}
                    onChange={(e) => setSebBrowserExamKey(e.target.value)}
                  />
                )}
              </div>

              {/* Start & Exit Password Protection */}
              <div className="space-y-3 pt-2 border-t border-pearl-100">
                <div className="flex items-center gap-1.5 text-xs font-bold text-midnight-900 uppercase tracking-wider">
                  <Lock className="w-3.5 h-3.5 text-indigo-brand" />
                  <span>Access & Exit Passwords</span>
                </div>
                <Input
                  label="Exam Start Password (Optional)"
                  placeholder="e.g. START-123"
                  value={startPassword}
                  onChange={(e) => setStartPassword(e.target.value)}
                  helperText="Students must enter this password to begin the exam"
                />
                <Input
                  label="Exam Exit Password (Optional)"
                  placeholder="e.g. EXIT-456"
                  value={exitPassword}
                  onChange={(e) => setExitPassword(e.target.value)}
                  helperText="Required by invigilator to finalize/leave the exam early"
                />
              </div>
            </CardContent>
          </Card>

          {/* Paper Summary Pill */}
          <Card className="bg-pearl-100 border-pearl-200">
            <CardContent className="pt-4 pb-4 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-midnight-600">Total Questions:</span>
                <span className="font-bold text-midnight-900">{examQuestions.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-midnight-600">Total Marks:</span>
                <span className="font-bold text-midnight-900">{totalCalculatedMarks}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-midnight-600">Passing Threshold:</span>
                <span className="font-bold text-emerald-600">{passingMarks} Marks</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </form>

      {/* Question Picker Modal */}
      <Modal
        isOpen={isQuestionPickerOpen}
        onClose={() => setIsQuestionPickerOpen(false)}
        title="Select Questions from Question Bank"
        size="lg"
      >
        <div className="space-y-4">
          <Input
            placeholder="Search questions by topic, text..."
            value={pickerSearch}
            onChange={(e) => setPickerSearch(e.target.value)}
          />

          <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
            {bankQuestions
              .filter((q) => {
                const searchLower = pickerSearch.toLowerCase();
                return (
                  (q.title || '').toLowerCase().includes(searchLower) ||
                  (q.text || '').toLowerCase().includes(searchLower) ||
                  (q.subject || '').toLowerCase().includes(searchLower) ||
                  (q.topic || '').toLowerCase().includes(searchLower)
                );
              })
              .map((q) => {
                const isAdded = examQuestions.some((item) => item.question._id === q._id);
                return (
                  <div
                    key={q._id}
                    className="p-3 rounded-lg border border-pearl-200 bg-white flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="truncate">
                      <p className="font-bold text-midnight-900 truncate">{q.title || q.text}</p>
                      <span className="text-[10px] text-midnight-600 capitalize">
                        {q.subject} • {(q.type || 'mcq').replace('_', ' ')} • {q.difficulty}
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant={isAdded ? 'outline' : 'primary'}
                      size="sm"
                      onClick={() => handleAddQuestionFromBank(q)}
                      disabled={isAdded}
                    >
                      {isAdded ? 'Added' : 'Add to Exam'}
                    </Button>
                  </div>
                );
              })}
          </div>

          <div className="flex justify-end pt-2 border-t border-pearl-200">
            <Button variant="primary" onClick={() => setIsQuestionPickerOpen(false)}>
              Done Adding ({examQuestions.length} Added)
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
