import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { QuestionItem, QuestionType } from '../../types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import {
  FileQuestion,
  Plus,
  Sparkles,
  Search,
  Filter,
  CheckCircle2,
  Trash2,
  Bot,
  AlertCircle,
  HelpCircle,
  Code2,
} from 'lucide-react';
import { ProgrammingQuestionModal } from '../../components/programming/ProgrammingQuestionModal';

export const StaffQuestionBank: React.FC = () => {
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('');

  // Programming Question Modal
  const [isProgrammingModalOpen, setIsProgrammingModalOpen] = useState(false);

  // Manual Question Modal
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [type, setType] = useState<QuestionType>('mcq');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [text, setText] = useState('');
  const [defaultMarks, setDefaultMarks] = useState(1);
  const [negativeMarks, setNegativeMarks] = useState(0);
  const [explanation, setExplanation] = useState('');
  const [options, setOptions] = useState([
    { id: 'opt_1', text: '' },
    { id: 'opt_2', text: '' },
    { id: 'opt_3', text: '' },
    { id: 'opt_4', text: '' },
  ]);
  const [correctAnswer, setCorrectAnswer] = useState('opt_1');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // AI Question Generator Modal
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  const [aiSubject, setAiSubject] = useState('');
  const [aiCount, setAiCount] = useState(3);
  const [aiDifficulty, setAiDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiGeneratedItems, setAiGeneratedItems] = useState<any[]>([]);
  const [aiReviewStep, setAiReviewStep] = useState<'prompt' | 'review'>('prompt');

  const fetchQuestions = async () => {
    try {
      const res = await api.get('/questions');
      setQuestions(res.data?.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, []);

  const handleCreateManual = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      let finalOptions = options;
      let finalCorrectAnswers = [correctAnswer];

      if (type === 'true_false') {
        finalOptions = [
          { id: 'opt_true', text: 'True' },
          { id: 'opt_false', text: 'False' },
        ];
      } else if (type === 'fill_blank') {
        finalOptions = [];
        finalCorrectAnswers = [correctAnswer.trim()];
      }

      await api.post('/questions', {
        subject,
        topic,
        type,
        difficulty,
        text,
        defaultMarks: Number(defaultMarks),
        negativeMarks: Number(negativeMarks),
        options: finalOptions,
        correctAnswers: finalCorrectAnswers,
        explanation,
      });

      setIsManualModalOpen(false);
      setText('');
      setExplanation('');
      fetchQuestions();
    } catch (err: any) {
      setFormError(err.message || 'Failed to create question.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGenerateAI = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setAiGenerating(true);

    try {
      const res = await api.post('/ai/generate-questions', {
        subject: aiSubject,
        topic: aiTopic,
        difficulty: aiDifficulty,
        count: Number(aiCount),
      });

      setAiGeneratedItems(res.data?.data || []);
      setAiReviewStep('review');
    } catch (err: any) {
      setFormError(err.message || 'AI generation failed.');
    } finally {
      setAiGenerating(false);
    }
  };

  const handleSaveAiQuestions = async () => {
    setIsSubmitting(true);
    try {
      await api.post('/ai/save-approved', {
        questions: aiGeneratedItems,
      });

      setIsAiModalOpen(false);
      setAiReviewStep('prompt');
      setAiGeneratedItems([]);
      fetchQuestions();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this question from question bank?')) {
      await api.delete(`/questions/${id}`);
      fetchQuestions();
    }
  };

  const filtered = questions.filter((q) => {
    const matchesSearch =
      q.text.toLowerCase().includes(search.toLowerCase()) ||
      q.subject.toLowerCase().includes(search.toLowerCase()) ||
      q.topic?.toLowerCase().includes(search.toLowerCase());
    const matchesType = selectedType ? q.type === selectedType : true;
    const matchesDiff = selectedDifficulty ? q.difficulty === selectedDifficulty : true;
    return matchesSearch && matchesType && matchesDiff;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-pearl-200">
        <div>
          <h2 className="text-2xl font-extrabold text-midnight-950 tracking-tight">Question Bank Repository</h2>
          <p className="text-xs text-midnight-600 mt-1">
            Build and organize reusable question items with manual authoring or AI generation.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="electric"
            size="sm"
            leftIcon={<Sparkles className="w-4 h-4" />}
            onClick={() => {
              setAiReviewStep('prompt');
              setIsAiModalOpen(true);
            }}
          >
            AI Question Generator
          </Button>
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Code2 className="w-4 h-4 text-indigo-brand" />}
            onClick={() => setIsProgrammingModalOpen(true)}
            className="border-indigo-brand/40 text-indigo-brand hover:bg-indigo-50"
          >
            New Coding Question
          </Button>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setIsManualModalOpen(true)}
          >
            Create Question
          </Button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Input
          placeholder="Search by topic, keyword, or question..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leftIcon={<Search className="w-4 h-4" />}
        />
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="rounded-lg border border-pearl-300 bg-white px-3 py-2 text-xs text-midnight-900 focus:border-indigo-brand focus:outline-none"
        >
          <option value="">All Question Types</option>
          <option value="programming">Programming (Coding Problem)</option>
          <option value="mcq">Multiple Choice (MCQ)</option>
          <option value="multiple_select">Multiple Select</option>
          <option value="true_false">True / False</option>
          <option value="fill_blank">Fill in the Blanks</option>
          <option value="short_answer">Short Answer</option>
        </select>
        <select
          value={selectedDifficulty}
          onChange={(e) => setSelectedDifficulty(e.target.value)}
          className="rounded-lg border border-pearl-300 bg-white px-3 py-2 text-xs text-midnight-900 focus:border-indigo-brand focus:outline-none"
        >
          <option value="">All Difficulties</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
      </div>

      {/* Questions List */}
      {loading ? (
        <LoadingSkeleton count={4} className="h-28" />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No Questions Found"
          description={
            search ? 'No questions match your filter.' : 'Your question bank is empty. Author questions manually or use AI.'
          }
          actionText="Create Question"
          onAction={() => setIsManualModalOpen(true)}
        />
      ) : (
        <div className="space-y-4">
          {filtered.map((q, idx) => (
            <Card key={q._id} className="p-5 hover:border-indigo-brand/30 transition-all">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-mono font-bold text-indigo-brand bg-indigo-50 px-2 py-0.5 rounded">
                      #{idx + 1}
                    </span>
                    <Badge variant="purple" className="text-[10px]">{q.subject}</Badge>
                    {q.topic && <Badge variant="default" className="text-[10px]">{q.topic}</Badge>}
                    <Badge
                      variant={q.difficulty === 'easy' ? 'success' : q.difficulty === 'medium' ? 'warning' : 'danger'}
                      className="text-[10px]"
                    >
                      {q.difficulty}
                    </Badge>
                    <span className="text-[11px] font-semibold text-midnight-600 uppercase">
                      {q.type.replace('_', ' ')} • {q.defaultMarks} Mark{q.defaultMarks > 1 ? 's' : ''}
                    </span>
                    {q.aiGenerated && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200">
                        <Sparkles className="w-3 h-3 text-amber-500" /> AI Generated
                      </span>
                    )}
                  </div>

                  <p className="text-sm font-bold text-midnight-900 pt-1 leading-relaxed">
                    {q.text}
                  </p>

                  {/* Options render if MCQ or True/False */}
                  {q.options && q.options.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                      {q.options.map((opt) => {
                        const isCorrect = q.correctAnswers.includes(opt.id);
                        return (
                          <div
                            key={opt.id}
                            className={`p-2 rounded-lg border text-xs font-medium flex items-center justify-between ${
                              isCorrect
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-semibold'
                                : 'bg-pearl-50 border-pearl-200 text-midnight-700'
                            }`}
                          >
                            <span>{opt.text}</span>
                            {isCorrect && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {q.explanation && (
                    <div className="text-[11px] text-midnight-600 bg-pearl-50 p-2 rounded-lg border border-pearl-200 mt-2">
                      <strong className="text-midnight-800">Explanation:</strong> {q.explanation}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => handleDelete(q._id)}
                  title="Delete question"
                  className="p-1.5 rounded text-pearl-300 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Manual Question Modal */}
      <Modal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        title="Author Question Paper Item"
        size="lg"
      >
        <form onSubmit={handleCreateManual} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs font-medium text-rose-700">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Subject"
              required
              placeholder="e.g. Physics"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
            <Input
              label="Topic"
              placeholder="e.g. Thermodynamics"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-midnight-700 mb-1">
                Question Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as QuestionType)}
                className="w-full rounded-lg border border-pearl-300 bg-white px-3 py-2.5 text-xs text-midnight-900"
              >
                <option value="mcq">Multiple Choice</option>
                <option value="true_false">True / False</option>
                <option value="fill_blank">Fill in the Blanks</option>
                <option value="short_answer">Short Answer</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-midnight-700 mb-1">
                Difficulty
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as any)}
                className="w-full rounded-lg border border-pearl-300 bg-white px-3 py-2.5 text-xs text-midnight-900"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>

            <Input
              label="Default Marks"
              type="number"
              min={1}
              value={defaultMarks}
              onChange={(e) => setDefaultMarks(Number(e.target.value))}
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-midnight-700">
              Question Text
            </label>
            <textarea
              rows={3}
              required
              className="w-full rounded-lg border border-pearl-300 p-2.5 text-xs text-midnight-900 focus:border-indigo-brand focus:outline-none"
              placeholder="Write the question prompt clearly..."
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </div>

          {/* Type specific fields */}
          {type === 'mcq' && (
            <div className="space-y-2 pt-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-midnight-700">
                Multiple Choice Options (Select Correct Answer radio)
              </label>
              {options.map((opt, i) => (
                <div key={opt.id} className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="correctRadio"
                    checked={correctAnswer === opt.id}
                    onChange={() => setCorrectAnswer(opt.id)}
                    className="w-4 h-4 text-indigo-brand cursor-pointer"
                  />
                  <Input
                    placeholder={`Option ${i + 1}`}
                    required
                    value={opt.text}
                    onChange={(e) => {
                      const updated = [...options];
                      updated[i].text = e.target.value;
                      setOptions(updated);
                    }}
                  />
                </div>
              ))}
            </div>
          )}

          {type === 'true_false' && (
            <div className="space-y-2 pt-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-midnight-700">
                Correct Answer
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                  <input
                    type="radio"
                    name="tf"
                    value="opt_true"
                    checked={correctAnswer === 'opt_true'}
                    onChange={() => setCorrectAnswer('opt_true')}
                  />
                  True
                </label>
                <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                  <input
                    type="radio"
                    name="tf"
                    value="opt_false"
                    checked={correctAnswer === 'opt_false'}
                    onChange={() => setCorrectAnswer('opt_false')}
                  />
                  False
                </label>
              </div>
            </div>
          )}

          {type === 'fill_blank' && (
            <Input
              label="Canonical Correct Word / Answer"
              required
              placeholder="e.g. Gravity"
              value={correctAnswer}
              onChange={(e) => setCorrectAnswer(e.target.value)}
            />
          )}

          <Input
            label="Explanation / Rationale (Optional)"
            placeholder="Shown to students after submission if enabled..."
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
          />

          <div className="flex justify-end gap-3 pt-3">
            <Button type="button" variant="outline" onClick={() => setIsManualModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              Save to Question Bank
            </Button>
          </div>
        </form>
      </Modal>

      {/* AI Question Generator Modal */}
      <Modal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        title="AI Question Authoring Assistant"
        size={aiReviewStep === 'review' ? 'xl' : 'md'}
      >
        {aiReviewStep === 'prompt' ? (
          <form onSubmit={handleGenerateAI} className="space-y-4">
            <div className="p-3 rounded-lg bg-indigo-50 border border-indigo-200 text-xs text-indigo-brand font-medium flex items-start gap-2">
              <Bot className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Enter your subject syllabus or learning objective. The AI generates structured, schema-validated questions for your review.
              </span>
            </div>

            <Input
              label="Subject / Course"
              required
              placeholder="e.g. Computer Networks"
              value={aiSubject}
              onChange={(e) => setAiSubject(e.target.value)}
            />

            <Input
              label="Topic / Chapter / Concept"
              required
              placeholder="e.g. TCP Handshake and Congestion Control"
              value={aiTopic}
              onChange={(e) => setAiTopic(e.target.value)}
            />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-midnight-700 mb-1">
                  Target Difficulty
                </label>
                <select
                  value={aiDifficulty}
                  onChange={(e) => setAiDifficulty(e.target.value as any)}
                  className="w-full rounded-lg border border-pearl-300 bg-white px-3 py-2 text-xs text-midnight-900"
                >
                  <option value="easy">Easy (Definitions & Concepts)</option>
                  <option value="medium">Medium (Application & Analysis)</option>
                  <option value="hard">Hard (Synthesis & Edge Cases)</option>
                </select>
              </div>

              <Input
                label="Number of Questions (1-10)"
                type="number"
                min={1}
                max={10}
                value={aiCount}
                onChange={(e) => setAiCount(Number(e.target.value))}
              />
            </div>

            <div className="flex justify-end gap-3 pt-3">
              <Button type="button" variant="outline" onClick={() => setIsAiModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="electric" isLoading={aiGenerating}>
                Generate with AI
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-pearl-200">
              <div>
                <h4 className="text-sm font-bold text-midnight-900">
                  Review {aiGeneratedItems.length} AI-Generated Questions
                </h4>
                <p className="text-xs text-midnight-600">
                  Verify accuracy and answer keys before committing to your permanent bank.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setAiReviewStep('prompt')}>
                Regenerate
              </Button>
            </div>

            <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2">
              {aiGeneratedItems.map((q, idx) => (
                <div key={idx} className="p-4 rounded-xl border border-pearl-200 bg-pearl-50/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-brand">Question {idx + 1} ({q.type})</span>
                    <Badge variant="purple" className="text-[10px]">{q.difficulty}</Badge>
                  </div>
                  <p className="text-xs font-bold text-midnight-900">{q.text}</p>
                  {q.options && q.options.length > 0 && (
                    <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                      {q.options.map((opt: any) => {
                        const isCorrect = q.correctAnswers.includes(opt.id);
                        return (
                          <div
                            key={opt.id}
                            className={`p-2 rounded border ${
                              isCorrect ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold' : 'bg-white border-pearl-200'
                            }`}
                          >
                            {opt.text} {isCorrect && '✓'}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {q.explanation && (
                    <p className="text-[10px] text-midnight-600 italic">Why: {q.explanation}</p>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-pearl-200">
              <Button variant="outline" onClick={() => setIsAiModalOpen(false)}>
                Discard
              </Button>
              <Button variant="electric" onClick={handleSaveAiQuestions} isLoading={isSubmitting}>
                Save Reviewed Questions to Bank
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Programming Question Creator Modal */}
      <ProgrammingQuestionModal
        isOpen={isProgrammingModalOpen}
        onClose={() => setIsProgrammingModalOpen(false)}
        onCreated={() => fetchQuestions()}
      />
    </div>
  );
};

