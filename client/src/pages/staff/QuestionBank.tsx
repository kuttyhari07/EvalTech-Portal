import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { QuestionItem, QuestionType, QuestionBankItem } from '../../types';
import { Card } from '../../components/ui/Card';
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
  CheckCircle2,
  Trash2,
  Bot,
  AlertCircle,
  Code2,
  Folder,
  FolderPlus,
  ArrowLeft,
  Layers,
  BookOpen,
  CheckSquare,
  Square,
  MinusCircle,
  Clock,
  Tag,
  FileUp,
  FileText,
  UploadCloud,
} from 'lucide-react';
import { ProgrammingQuestionModal } from '../../components/programming/ProgrammingQuestionModal';

export const StaffQuestionBank: React.FC = () => {
  // Navigation: 'banks' view vs 'all-questions' view
  const [viewMode, setViewMode] = useState<'banks' | 'all-questions'>('banks');

  // Question Banks state
  const [banks, setBanks] = useState<QuestionBankItem[]>([]);
  const [activeBank, setActiveBank] = useState<QuestionBankItem | null>(null);
  const [loadingBanks, setLoadingBanks] = useState(true);
  const [bankSearch, setBankSearch] = useState('');

  // All Questions state
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const [questionSearch, setQuestionSearch] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('');

  // Create Question Bank Modal
  const [isCreateBankOpen, setIsCreateBankOpen] = useState(false);
  const [bankTitle, setBankTitle] = useState('');
  const [bankSubject, setBankSubject] = useState('');
  const [bankDescription, setBankDescription] = useState('');
  const [bankTags, setBankTags] = useState('');
  const [bankCreating, setBankCreating] = useState(false);
  const [bankFormError, setBankFormError] = useState<string | null>(null);

  // Pick Existing Questions Modal (inside an active bank)
  const [isPickQuestionsOpen, setIsPickQuestionsOpen] = useState(false);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  const [isAddingToBank, setIsAddingToBank] = useState(false);

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

  // AI MCQ Generator Modal
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  const [aiSubject, setAiSubject] = useState('');
  const [aiCount, setAiCount] = useState(3);
  const [aiDifficulty, setAiDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiGeneratedItems, setAiGeneratedItems] = useState<any[]>([]);
  const [aiReviewStep, setAiReviewStep] = useState<'prompt' | 'review'>('prompt');

  // Document / PDF Import Modal State
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [docModalTargetBankId, setDocModalTargetBankId] = useState<string | null>(null);
  const [docUploadMode, setDocUploadMode] = useState<'file' | 'text'>('file');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileBase64, setFileBase64] = useState<string>('');
  const [pastedText, setPastedText] = useState<string>('');
  const [docBankTitle, setDocBankTitle] = useState<string>('');
  const [docSubject, setDocSubject] = useState<string>('');
  const [docDescription, setDocDescription] = useState<string>('');
  const [docCount, setDocCount] = useState<number>(5);
  const [docQuestionTypes, setDocQuestionTypes] = useState<'all' | 'mcq' | 'programming'>('all');
  const [docDifficulty, setDocDifficulty] = useState<'mixed' | 'easy' | 'medium' | 'hard'>('mixed');
  const [docStep, setDocStep] = useState<'upload' | 'review'>('upload');
  const [docAnalyzing, setDocAnalyzing] = useState<boolean>(false);
  const [docSaving, setDocSaving] = useState<boolean>(false);
  const [docError, setDocError] = useState<string | null>(null);
  const [extractedQuestions, setExtractedQuestions] = useState<any[]>([]);
  const [selectedExtractedIndices, setSelectedExtractedIndices] = useState<number[]>([]);

  // Fetch Banks
  const fetchBanks = async () => {
    setLoadingBanks(true);
    try {
      const res = await api.get('/questions/banks');
      setBanks(res.data?.data || []);
    } catch (err: any) {
      console.error('Failed to fetch question banks', err);
    } finally {
      setLoadingBanks(false);
    }
  };

  // Fetch Bank Details
  const fetchBankDetails = async (bankId: string) => {
    try {
      const res = await api.get(`/questions/banks/${bankId}`);
      setActiveBank(res.data?.data || null);
    } catch (err: any) {
      console.error('Failed to fetch question bank details', err);
    }
  };

  // Fetch All Questions
  const fetchQuestions = async () => {
    setLoadingQuestions(true);
    try {
      const res = await api.get('/questions');
      setQuestions(res.data?.data || []);
    } catch (err: any) {
      console.error('Failed to fetch questions', err);
    } finally {
      setLoadingQuestions(false);
    }
  };

  useEffect(() => {
    fetchBanks();
    fetchQuestions();
  }, []);

  // Create Question Bank Handler
  const handleCreateBank = async (e: React.FormEvent) => {
    e.preventDefault();
    setBankFormError(null);

    if (!bankTitle.trim() || !bankSubject.trim()) {
      setBankFormError('Bank title and subject are required.');
      return;
    }

    setBankCreating(true);
    try {
      const tagsArray = bankTags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const res = await api.post('/questions/banks', {
        title: bankTitle.trim(),
        subject: bankSubject.trim(),
        description: bankDescription.trim(),
        tags: tagsArray,
        isPublicWithinOrg: true,
      });

      const newBank = res.data?.data;
      setIsCreateBankOpen(false);
      setBankTitle('');
      setBankSubject('');
      setBankDescription('');
      setBankTags('');
      await fetchBanks();
      if (newBank?._id) {
        fetchBankDetails(newBank._id);
      }
    } catch (err: any) {
      setBankFormError(err.message || 'Failed to create question bank.');
    } finally {
      setBankCreating(false);
    }
  };

  // Delete Question Bank
  const handleDeleteBank = async (bankId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (confirm('Are you sure you want to delete this question bank? Individual questions will be preserved.')) {
      try {
        await api.delete(`/questions/banks/${bankId}`);
        if (activeBank?._id === bankId) {
          setActiveBank(null);
        }
        fetchBanks();
      } catch (err: any) {
        alert(err.message || 'Failed to delete question bank.');
      }
    }
  };

  // Remove question from bank
  const handleRemoveQuestionFromBank = async (questionId: string) => {
    if (!activeBank) return;
    if (confirm('Remove this question from the bank? The question will still remain in the global repository.')) {
      try {
        await api.delete(`/questions/banks/${activeBank._id}/questions/${questionId}`);
        await fetchBankDetails(activeBank._id);
        fetchBanks();
      } catch (err: any) {
        alert(err.message || 'Failed to remove question.');
      }
    }
  };

  // Add selected questions to active bank
  const handleAddSelectedQuestionsToBank = async () => {
    if (!activeBank || selectedQuestionIds.length === 0) return;
    setIsAddingToBank(true);
    try {
      await api.post(`/questions/banks/${activeBank._id}/questions`, {
        questionIds: selectedQuestionIds,
      });
      setIsPickQuestionsOpen(false);
      setSelectedQuestionIds([]);
      await fetchBankDetails(activeBank._id);
      fetchBanks();
    } catch (err: any) {
      alert(err.message || 'Failed to add questions to bank.');
    } finally {
      setIsAddingToBank(false);
    }
  };

  // Create Manual Question
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
        questionBankId: activeBank?._id,
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
      if (activeBank) {
        fetchBankDetails(activeBank._id);
        fetchBanks();
      }
    } catch (err: any) {
      setFormError(err.message || 'Failed to create question.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Generate AI MCQs
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

  // Save approved AI MCQs
  const handleSaveAiQuestions = async () => {
    setIsSubmitting(true);
    try {
      await api.post('/ai/save-approved', {
        questions: aiGeneratedItems,
        questionBankId: activeBank?._id,
      });

      setIsAiModalOpen(false);
      setAiReviewStep('prompt');
      setAiGeneratedItems([]);
      fetchQuestions();
      if (activeBank) {
        fetchBankDetails(activeBank._id);
        fetchBanks();
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete question permanently
  const handleDeleteQuestion = async (id: string) => {
    if (confirm('Permanently delete this question from the system?')) {
      await api.delete(`/questions/${id}`);
      fetchQuestions();
      if (activeBank) {
        fetchBankDetails(activeBank._id);
        fetchBanks();
      }
    }
  };

  // Open manual question authoring modal with pre-fills
  const openManualModal = () => {
    setSubject(activeBank?.subject || '');
    setTopic('');
    setText('');
    setExplanation('');
    setFormError(null);
    setIsManualModalOpen(true);
  };

  // Open AI MCQ modal with pre-fills
  const openAiMcqModal = () => {
    setAiSubject(activeBank?.subject || '');
    setAiTopic('');
    setAiReviewStep('prompt');
    setAiGeneratedItems([]);
    setFormError(null);
    setIsAiModalOpen(true);
  };

  // Document / PDF Import Modal Handlers
  const resetDocModal = () => {
    setSelectedFile(null);
    setFileBase64('');
    setPastedText('');
    setDocBankTitle('');
    setDocSubject('');
    setDocDescription('');
    setDocCount(5);
    setDocQuestionTypes('all');
    setDocDifficulty('mixed');
    setDocStep('upload');
    setDocAnalyzing(false);
    setDocSaving(false);
    setDocError(null);
    setExtractedQuestions([]);
    setSelectedExtractedIndices([]);
  };

  const openDocImportModal = (targetBankId?: string) => {
    resetDocModal();
    if (targetBankId) {
      setDocModalTargetBankId(targetBankId);
      if (activeBank) {
        setDocBankTitle(activeBank.title);
        setDocSubject(activeBank.subject);
        setDocDescription(activeBank.description || '');
      }
    } else {
      setDocModalTargetBankId(null);
    }
    setIsDocModalOpen(true);
  };

  const handleFileSelection = (file: File) => {
    setSelectedFile(file);
    setDocError(null);

    // Auto populate bank title from file name if blank
    if (!docBankTitle) {
      const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      setDocBankTitle(cleanName);
    }

    const reader = new FileReader();
    if (
      file.name.endsWith('.txt') ||
      file.name.endsWith('.md') ||
      file.name.endsWith('.csv') ||
      file.name.endsWith('.json')
    ) {
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setPastedText(text || '');
        const b64 = btoa(unescape(encodeURIComponent(text || '')));
        setFileBase64(b64);
      };
      reader.readAsText(file);
    } else {
      // PDF or DOCX binary
      reader.onload = (event) => {
        const result = event.target?.result as string;
        const base64Content = result.split(',')[1] || '';
        setFileBase64(base64Content);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDocDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelection(file);
  };

  const handleAnalyzeDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    setDocError(null);

    if (docUploadMode === 'file' && !selectedFile && !fileBase64) {
      setDocError('Please choose a PDF or document file to upload.');
      return;
    }
    if (docUploadMode === 'text' && !pastedText.trim()) {
      setDocError('Please paste your syllabus, exam questions, or lecture notes.');
      return;
    }

    setDocAnalyzing(true);
    try {
      const res = await api.post('/ai/generate-from-document', {
        fileBase64: docUploadMode === 'file' ? fileBase64 : undefined,
        fileName: docUploadMode === 'file' ? selectedFile?.name : undefined,
        mimeType: docUploadMode === 'file' ? selectedFile?.type : undefined,
        textContent: docUploadMode === 'text' ? pastedText : undefined,
        bankTitle: docBankTitle.trim() || undefined,
        subject: docSubject.trim() || undefined,
        count: docCount,
        questionTypes: docQuestionTypes,
        difficulty: docDifficulty,
      });

      const data = res.data?.data;
      if (data) {
        if (!docBankTitle && data.suggestedBankTitle) {
          setDocBankTitle(data.suggestedBankTitle);
        }
        if (!docSubject && data.suggestedSubject) {
          setDocSubject(data.suggestedSubject);
        }
        if (!docDescription && data.suggestedDescription) {
          setDocDescription(data.suggestedDescription);
        }
        const qs = Array.isArray(data.questions) ? data.questions : [];
        setExtractedQuestions(qs);
        setSelectedExtractedIndices(qs.map((_: any, idx: number) => idx));
        setDocStep('review');
      }
    } catch (err: any) {
      setDocError(err.response?.data?.message || err.message || 'Failed to analyze document.');
    } finally {
      setDocAnalyzing(false);
    }
  };

  const handleToggleDocQuestion = (index: number) => {
    setSelectedExtractedIndices((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  const handleDeleteExtractedQuestion = (index: number) => {
    setExtractedQuestions((prev) => prev.filter((_, i) => i !== index));
    setSelectedExtractedIndices((prev) =>
      prev
        .filter((i) => i !== index)
        .map((i) => (i > index ? i - 1 : i))
    );
  };

  const handleSaveDocumentBank = async () => {
    if (selectedExtractedIndices.length === 0) {
      setDocError('Please select at least one question to save.');
      return;
    }

    const titleToUse = docBankTitle.trim() || activeBank?.title;
    const subjectToUse = docSubject.trim() || activeBank?.subject;

    if (!titleToUse && !docModalTargetBankId) {
      setDocError('Please provide a Question Bank Title.');
      return;
    }

    if (!subjectToUse && !docModalTargetBankId) {
      setDocError('Please provide a Subject.');
      return;
    }

    setDocSaving(true);
    try {
      const selectedQuestions = selectedExtractedIndices.map((i) => extractedQuestions[i]);

      const res = await api.post('/ai/create-bank-with-questions', {
        bankTitle: titleToUse || 'Imported Question Bank',
        subject: subjectToUse || 'General Knowledge',
        description: docDescription.trim(),
        existingBankId: docModalTargetBankId || undefined,
        questions: selectedQuestions,
      });

      const bank = res.data?.data?.bank;
      setIsDocModalOpen(false);
      resetDocModal();
      await fetchBanks();
      await fetchQuestions();
      if (bank?._id) {
        await fetchBankDetails(bank._id);
        setViewMode('banks');
      }
    } catch (err: any) {
      setDocError(err.response?.data?.message || err.message || 'Failed to save question bank.');
    } finally {
      setDocSaving(false);
    }
  };

  // Filtering for banks
  const filteredBanks = banks.filter((b) => {
    const q = bankSearch.toLowerCase();
    return (
      b.title.toLowerCase().includes(q) ||
      b.subject.toLowerCase().includes(q) ||
      b.description?.toLowerCase().includes(q)
    );
  });

  // Filtering for questions inside active bank
  const bankQuestionsList: QuestionItem[] = (activeBank?.questionIds || []).filter(
    (item: any) => typeof item === 'object' && item !== null
  );

  const filteredBankQuestions = bankQuestionsList.filter((q) => {
    const matchesSearch =
      q.text?.toLowerCase().includes(questionSearch.toLowerCase()) ||
      q.title?.toLowerCase().includes(questionSearch.toLowerCase()) ||
      q.subject?.toLowerCase().includes(questionSearch.toLowerCase()) ||
      q.topic?.toLowerCase().includes(questionSearch.toLowerCase());
    const matchesType = selectedType ? q.type === selectedType : true;
    const matchesDiff = selectedDifficulty ? q.difficulty === selectedDifficulty : true;
    return matchesSearch && matchesType && matchesDiff;
  });

  // Filtering for global questions
  const filteredGlobalQuestions = questions.filter((q) => {
    const matchesSearch =
      q.text?.toLowerCase().includes(questionSearch.toLowerCase()) ||
      q.title?.toLowerCase().includes(questionSearch.toLowerCase()) ||
      q.subject?.toLowerCase().includes(questionSearch.toLowerCase()) ||
      q.topic?.toLowerCase().includes(questionSearch.toLowerCase());
    const matchesType = selectedType ? q.type === selectedType : true;
    const matchesDiff = selectedDifficulty ? q.difficulty === selectedDifficulty : true;
    return matchesSearch && matchesType && matchesDiff;
  });

  // Questions available to add to active bank (not already in active bank)
  const existingBankQIds = new Set(
    (activeBank?.questionIds || []).map((q: any) => (typeof q === 'string' ? q : q._id))
  );
  const questionsAvailableForBank = questions.filter((q) => !existingBankQIds.has(q._id));

  return (
    <div className="space-y-6">
      {/* Top Header & Navigation Tabs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-3 border-b border-pearl-200">
        <div>
          <h2 className="text-2xl font-extrabold text-midnight-950 tracking-tight flex items-center gap-2">
            <span>Question Bank Management</span>
          </h2>
          <p className="text-xs text-midnight-600 mt-1">
            Create structured question banks for your subjects and store as many MCQs and Coding questions as needed.
          </p>
        </div>

        {/* Global View Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-pearl-100 rounded-xl">
          <button
            type="button"
            onClick={() => {
              setViewMode('banks');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              viewMode === 'banks'
                ? 'bg-white text-indigo-brand shadow-subtle'
                : 'text-midnight-600 hover:text-midnight-950'
            }`}
          >
            <Folder className="w-3.5 h-3.5" />
            <span>Question Banks ({banks.length})</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setViewMode('all-questions');
              setActiveBank(null);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              viewMode === 'all-questions'
                ? 'bg-white text-indigo-brand shadow-subtle'
                : 'text-midnight-600 hover:text-midnight-950'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>All Questions ({questions.length})</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: QUESTION BANKS LIST */}
      {viewMode === 'banks' && !activeBank && (
        <div className="space-y-6">
          {/* Action Bar for Banks */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Input
                placeholder="Search question banks by title, subject..."
                value={bankSearch}
                onChange={(e) => setBankSearch(e.target.value)}
                leftIcon={<Search className="w-4 h-4" />}
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="electric"
                size="sm"
                leftIcon={<FileUp className="w-4 h-4" />}
                onClick={() => openDocImportModal()}
              >
                Create Bank from PDF / File
              </Button>
              <Button
                variant="primary"
                size="sm"
                leftIcon={<FolderPlus className="w-4 h-4" />}
                onClick={() => {
                  setBankFormError(null);
                  setIsCreateBankOpen(true);
                }}
              >
                Create Question Bank
              </Button>
            </div>
          </div>

          {/* Banks Grid */}
          {loadingBanks ? (
            <LoadingSkeleton count={3} className="h-40" />
          ) : filteredBanks.length === 0 ? (
            <EmptyState
              title="No Question Banks Created Yet"
              description="Create a dedicated question bank (e.g. Data Structures, Python Basics, Physics Unit 1) and populate it with unlimited MCQs and Coding questions."
              actionText="Create First Question Bank"
              onAction={() => setIsCreateBankOpen(true)}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredBanks.map((bank) => {
                const count = bank.questionIds?.length || 0;
                return (
                  <Card
                    key={bank._id}
                    className="p-5 hover:border-indigo-brand/40 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
                    onClick={() => fetchBankDetails(bank._id)}
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-brand group-hover:scale-105 transition-transform">
                          <BookOpen className="w-5 h-5" />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Badge variant="purple" className="text-[10px]">
                            {bank.subject}
                          </Badge>
                          <button
                            type="button"
                            title="Delete Bank"
                            onClick={(e) => handleDeleteBank(bank._id, e)}
                            className="p-1 rounded text-pearl-400 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-base font-extrabold text-midnight-950 group-hover:text-indigo-brand transition-colors">
                          {bank.title}
                        </h3>
                        {bank.description && (
                          <p className="text-xs text-midnight-600 line-clamp-2 mt-1">
                            {bank.description}
                          </p>
                        )}
                      </div>

                      {/* Tags */}
                      {bank.tags && bank.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {bank.tags.map((t, idx) => (
                            <span
                              key={idx}
                              className="text-[10px] font-medium bg-pearl-100 text-midnight-700 px-2 py-0.5 rounded-full"
                            >
                              #{t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="pt-4 mt-4 border-t border-pearl-200 flex items-center justify-between text-xs">
                      <span className="font-extrabold text-indigo-brand bg-indigo-50 px-2.5 py-1 rounded-lg">
                        {count} Question{count === 1 ? '' : 's'} inside
                      </span>
                      <span className="text-midnight-500 font-semibold group-hover:text-indigo-brand flex items-center gap-1">
                        Open Bank &rarr;
                      </span>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: ACTIVE QUESTION BANK DETAIL VIEW */}
      {viewMode === 'banks' && activeBank && (
        <div className="space-y-6">
          {/* Back Button & Bank Header */}
          <div className="p-6 rounded-2xl bg-gradient-to-r from-indigo-900 via-indigo-950 to-midnight-950 text-white space-y-4 shadow-subtle">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setActiveBank(null)}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-200 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Question Banks</span>
              </button>
              <div className="flex items-center gap-2">
                <span className="text-xs bg-indigo-800/80 px-2.5 py-1 rounded-full text-indigo-100 font-semibold">
                  {activeBank.subject}
                </span>
                <span className="text-xs bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 px-2.5 py-1 rounded-full font-bold">
                  {bankQuestionsList.length} Questions
                </span>
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-black tracking-tight">{activeBank.title}</h2>
              {activeBank.description && (
                <p className="text-xs text-indigo-200/80 mt-1 max-w-2xl">
                  {activeBank.description}
                </p>
              )}
            </div>

            {/* Actions Inside Bank */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-indigo-800/60">
              <Button
                variant="electric"
                size="sm"
                leftIcon={<FileUp className="w-4 h-4" />}
                onClick={() => openDocImportModal(activeBank._id)}
              >
                Import from PDF / File
              </Button>
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Sparkles className="w-4 h-4 text-indigo-300" />}
                onClick={openAiMcqModal}
                className="border-indigo-400/40 text-indigo-100 hover:bg-white/10"
              >
                AI Generate MCQs
              </Button>
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Code2 className="w-4 h-4 text-emerald-400" />}
                onClick={() => setIsProgrammingModalOpen(true)}
                className="border-indigo-400/40 text-indigo-100 hover:bg-white/10"
              >
                Create Coding Problem
              </Button>
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Plus className="w-4 h-4" />}
                onClick={openManualModal}
              >
                Add Manual MCQ
              </Button>
              {questionsAvailableForBank.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<Layers className="w-4 h-4 text-indigo-300" />}
                  onClick={() => {
                    setSelectedQuestionIds([]);
                    setIsPickQuestionsOpen(true);
                  }}
                  className="border-indigo-400/40 text-indigo-100 hover:bg-white/10"
                >
                  Pick Existing Questions ({questionsAvailableForBank.length})
                </Button>
              )}
            </div>
          </div>

          {/* Search & Filters Inside Bank */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              placeholder="Search questions inside this bank..."
              value={questionSearch}
              onChange={(e) => setQuestionSearch(e.target.value)}
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

          {/* Question List Inside Active Bank */}
          {filteredBankQuestions.length === 0 ? (
            <EmptyState
              title={
                bankQuestionsList.length === 0
                  ? 'No Questions Added to this Bank Yet'
                  : 'No Matching Questions'
              }
              description={
                bankQuestionsList.length === 0
                  ? 'You can add unlimited MCQs or Coding problems into this bank using AI or manual creation.'
                  : 'Try clearing your search or filter options.'
              }
              actionText="Add Questions Now"
              onAction={openManualModal}
            />
          ) : (
            <div className="space-y-4">
              {filteredBankQuestions.map((q, idx) => (
                <Card key={q._id} className="p-5 hover:border-indigo-brand/30 transition-all">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-mono font-bold text-indigo-brand bg-indigo-50 px-2 py-0.5 rounded">
                          #{idx + 1}
                        </span>
                        <Badge variant="purple" className="text-[10px]">
                          {q.subject}
                        </Badge>
                        {q.topic && (
                          <Badge variant="default" className="text-[10px]">
                            {q.topic}
                          </Badge>
                        )}
                        <Badge
                          variant={
                            q.difficulty === 'easy'
                              ? 'success'
                              : q.difficulty === 'medium'
                              ? 'warning'
                              : 'danger'
                          }
                          className="text-[10px]"
                        >
                          {q.difficulty}
                        </Badge>
                        <span className="text-[11px] font-bold text-midnight-600 uppercase">
                          {q.type.replace('_', ' ')} &bull; {q.defaultMarks} Mark
                          {q.defaultMarks > 1 ? 's' : ''}
                        </span>
                        {q.aiGenerated && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200">
                            <Sparkles className="w-3 h-3 text-amber-500" /> AI Generated
                          </span>
                        )}
                      </div>

                      {/* Title if present (e.g. for programming questions) */}
                      {q.title && (
                        <h4 className="text-sm font-extrabold text-midnight-950 flex items-center gap-1.5">
                          <Code2 className="w-4 h-4 text-indigo-brand" />
                          <span>{q.title}</span>
                        </h4>
                      )}

                      <p className="text-xs font-bold text-midnight-900 pt-1 leading-relaxed">
                        {q.text}
                      </p>

                      {/* Options render if MCQ or True/False */}
                      {q.options && q.options.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                          {q.options.map((opt) => {
                            const isCorrect = q.correctAnswers?.includes(opt.id);
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
                                {isCorrect && (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                )}
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

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleRemoveQuestionFromBank(q._id)}
                        title="Remove question from this bank"
                        className="p-1.5 rounded text-amber-600 hover:bg-amber-50 transition-colors"
                      >
                        <MinusCircle className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteQuestion(q._id)}
                        title="Delete question permanently"
                        className="p-1.5 rounded text-pearl-300 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* VIEW 3: ALL QUESTIONS (GLOBAL REPOSITORY) */}
      {viewMode === 'all-questions' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Button
                variant="electric"
                size="sm"
                leftIcon={<Sparkles className="w-4 h-4" />}
                onClick={openAiMcqModal}
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
                onClick={openManualModal}
              >
                Create Question
              </Button>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              placeholder="Search by topic, keyword, or question..."
              value={questionSearch}
              onChange={(e) => setQuestionSearch(e.target.value)}
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
          {loadingQuestions ? (
            <LoadingSkeleton count={4} className="h-28" />
          ) : filteredGlobalQuestions.length === 0 ? (
            <EmptyState
              title="No Questions Found"
              description="Your repository is empty. Author questions manually or generate with AI."
              actionText="Create Question"
              onAction={openManualModal}
            />
          ) : (
            <div className="space-y-4">
              {filteredGlobalQuestions.map((q, idx) => (
                <Card key={q._id} className="p-5 hover:border-indigo-brand/30 transition-all">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-mono font-bold text-indigo-brand bg-indigo-50 px-2 py-0.5 rounded">
                          #{idx + 1}
                        </span>
                        <Badge variant="purple" className="text-[10px]">
                          {q.subject}
                        </Badge>
                        {q.topic && (
                          <Badge variant="default" className="text-[10px]">
                            {q.topic}
                          </Badge>
                        )}
                        <Badge
                          variant={
                            q.difficulty === 'easy'
                              ? 'success'
                              : q.difficulty === 'medium'
                              ? 'warning'
                              : 'danger'
                          }
                          className="text-[10px]"
                        >
                          {q.difficulty}
                        </Badge>
                        <span className="text-[11px] font-semibold text-midnight-600 uppercase">
                          {q.type.replace('_', ' ')} &bull; {q.defaultMarks} Mark
                          {q.defaultMarks > 1 ? 's' : ''}
                        </span>
                        {q.aiGenerated && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200">
                            <Sparkles className="w-3 h-3 text-amber-500" /> AI Generated
                          </span>
                        )}
                      </div>

                      {q.title && (
                        <h4 className="text-sm font-extrabold text-midnight-950 flex items-center gap-1.5">
                          <Code2 className="w-4 h-4 text-indigo-brand" />
                          <span>{q.title}</span>
                        </h4>
                      )}

                      <p className="text-sm font-bold text-midnight-900 pt-1 leading-relaxed">
                        {q.text}
                      </p>

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
                                {isCorrect && (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => handleDeleteQuestion(q._id)}
                      title="Delete question permanently"
                      className="p-1.5 rounded text-pearl-300 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: CREATE QUESTION BANK */}
      <Modal
        isOpen={isCreateBankOpen}
        onClose={() => setIsCreateBankOpen(false)}
        title="Create New Question Bank"
        size="md"
      >
        <form onSubmit={handleCreateBank} className="space-y-4">
          {bankFormError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{bankFormError}</span>
            </div>
          )}

          <Input
            label="Question Bank Title *"
            required
            placeholder="e.g. Data Structures & Algorithms Bank"
            value={bankTitle}
            onChange={(e) => setBankTitle(e.target.value)}
          />

          <Input
            label="Subject / Course *"
            required
            placeholder="e.g. Computer Science"
            value={bankSubject}
            onChange={(e) => setBankSubject(e.target.value)}
          />

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-midnight-700">
              Description (Optional)
            </label>
            <textarea
              rows={2}
              className="w-full rounded-lg border border-pearl-300 p-2.5 text-xs text-midnight-900 focus:border-indigo-brand focus:outline-none"
              placeholder="e.g. Contains Unit 1 & Unit 2 MCQs, dynamic programming and recursion coding problems."
              value={bankDescription}
              onChange={(e) => setBankDescription(e.target.value)}
            />
          </div>

          <Input
            label="Tags (Comma-separated)"
            placeholder="e.g. dsa, mid-term, python"
            value={bankTags}
            onChange={(e) => setBankTags(e.target.value)}
          />

          <div className="flex justify-end gap-3 pt-3 border-t border-pearl-200">
            <Button type="button" variant="outline" onClick={() => setIsCreateBankOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="electric" isLoading={bankCreating}>
              Create Question Bank
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: PICK EXISTING QUESTIONS INTO BANK */}
      <Modal
        isOpen={isPickQuestionsOpen}
        onClose={() => setIsPickQuestionsOpen(false)}
        title={`Add Questions to "${activeBank?.title}"`}
        size="lg"
      >
        <div className="space-y-4">
          <p className="text-xs text-midnight-600">
            Select questions from your global repository to attach to this bank. You can select as many as you like.
          </p>

          <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-2">
            {questionsAvailableForBank.map((q) => {
              const isSelected = selectedQuestionIds.includes(q._id);
              return (
                <div
                  key={q._id}
                  onClick={() => {
                    if (isSelected) {
                      setSelectedQuestionIds(selectedQuestionIds.filter((id) => id !== q._id));
                    } else {
                      setSelectedQuestionIds([...selectedQuestionIds, q._id]);
                    }
                  }}
                  className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex items-start gap-3 ${
                    isSelected
                      ? 'border-indigo-brand bg-indigo-50/70 font-semibold'
                      : 'border-pearl-200 bg-white hover:border-pearl-300'
                  }`}
                >
                  <div className="pt-0.5 text-indigo-brand">
                    {isSelected ? (
                      <CheckSquare className="w-4 h-4 text-indigo-brand" />
                    ) : (
                      <Square className="w-4 h-4 text-pearl-400" />
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="purple" className="text-[9px]">{q.subject}</Badge>
                      <Badge variant="default" className="text-[9px]">{q.type}</Badge>
                      <Badge
                        variant={q.difficulty === 'easy' ? 'success' : q.difficulty === 'medium' ? 'warning' : 'danger'}
                        className="text-[9px]"
                      >
                        {q.difficulty}
                      </Badge>
                      <span className="text-[10px] text-midnight-500 font-mono">{q.defaultMarks} Marks</span>
                    </div>
                    <p className="text-midnight-900 font-medium line-clamp-2">
                      {q.title ? `${q.title} - ${q.text}` : q.text}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-pearl-200">
            <span className="text-xs text-midnight-600 font-semibold">
              {selectedQuestionIds.length} question(s) selected
            </span>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setIsPickQuestionsOpen(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="electric"
                disabled={selectedQuestionIds.length === 0}
                isLoading={isAddingToBank}
                onClick={handleAddSelectedQuestionsToBank}
              >
                Add Selected to Bank
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* MODAL 3: MANUAL QUESTION AUTHORING */}
      <Modal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        title={activeBank ? `Add Question to ${activeBank.title}` : 'Author Question Paper Item'}
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
              {activeBank ? `Save to ${activeBank.title}` : 'Save to Question Bank'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 4: AI MCQ GENERATOR */}
      <Modal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        title={activeBank ? `AI MCQ Generator - ${activeBank.title}` : 'AI Question Authoring Assistant'}
        size={aiReviewStep === 'review' ? 'xl' : 'md'}
      >
        {aiReviewStep === 'prompt' ? (
          <form onSubmit={handleGenerateAI} className="space-y-4">
            <div className="p-3 rounded-lg bg-indigo-50 border border-indigo-200 text-xs text-indigo-brand font-medium flex items-start gap-2">
              <Bot className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Enter your subject syllabus or learning objective. Gemini AI generates structured, schema-validated questions for your review.
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
                  Verify accuracy and answer keys before committing to{' '}
                  {activeBank ? `"${activeBank.title}"` : 'your bank'}.
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
                    <span className="text-xs font-bold text-indigo-brand">
                      Question {idx + 1} ({q.type})
                    </span>
                    <Badge variant="purple" className="text-[10px]">
                      {q.difficulty}
                    </Badge>
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
                              isCorrect
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold'
                                : 'bg-white border-pearl-200'
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
              <Button
                variant="electric"
                onClick={handleSaveAiQuestions}
                isLoading={isSubmitting}
              >
                {activeBank
                  ? `Save to "${activeBank.title}"`
                  : 'Save Reviewed Questions to Bank'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL 5: PROGRAMMING QUESTION CREATOR / AI GENERATOR */}
      <ProgrammingQuestionModal
        isOpen={isProgrammingModalOpen}
        onClose={() => setIsProgrammingModalOpen(false)}
        questionBankId={activeBank?._id}
        initialSubject={activeBank?.subject}
        onCreated={() => {
          fetchQuestions();
          if (activeBank) {
            fetchBankDetails(activeBank._id);
            fetchBanks();
          }
        }}
      />

      {/* MODAL 6: DOCUMENT / PDF QUESTION BANK CREATOR */}
      <Modal
        isOpen={isDocModalOpen}
        onClose={() => setIsDocModalOpen(false)}
        title={
          docModalTargetBankId
            ? `Import from File into "${activeBank?.title || 'Bank'}"`
            : docStep === 'upload'
            ? '📄 Create Question Bank from Document / PDF'
            : `Review & Save Question Bank (${selectedExtractedIndices.length}/${extractedQuestions.length} Selected)`
        }
        size={docStep === 'review' ? 'xl' : 'lg'}
      >
        {docStep === 'upload' ? (
          <form onSubmit={handleAnalyzeDocument} className="space-y-5">
            {/* Mode Tabs */}
            <div className="flex items-center gap-2 p-1 bg-pearl-100 rounded-xl">
              <button
                type="button"
                onClick={() => setDocUploadMode('file')}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  docUploadMode === 'file'
                    ? 'bg-white text-indigo-brand shadow-subtle'
                    : 'text-midnight-600 hover:text-midnight-950'
                }`}
              >
                <FileUp className="w-4 h-4" />
                <span>Upload Document / PDF</span>
              </button>
              <button
                type="button"
                onClick={() => setDocUploadMode('text')}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  docUploadMode === 'text'
                    ? 'bg-white text-indigo-brand shadow-subtle'
                    : 'text-midnight-600 hover:text-midnight-950'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>Paste Text / Syllabus</span>
              </button>
            </div>

            {/* Error Banner */}
            {docError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{docError}</span>
              </div>
            )}

            {/* File Upload Zone */}
            {docUploadMode === 'file' ? (
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDocDrop}
                className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer ${
                  selectedFile
                    ? 'border-emerald-400 bg-emerald-50/40'
                    : 'border-pearl-300 hover:border-indigo-400 hover:bg-indigo-50/20'
                }`}
                onClick={() => document.getElementById('doc-file-input')?.click()}
              >
                <input
                  id="doc-file-input"
                  type="file"
                  accept=".pdf,.docx,.txt,.md,.csv,.json"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelection(file);
                  }}
                />

                {selectedFile ? (
                  <div className="space-y-2">
                    <div className="w-12 h-12 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-bold text-midnight-900">{selectedFile.name}</p>
                    <p className="text-xs text-midnight-500">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB • Ready for AI extraction
                    </p>
                    <p className="text-xs text-indigo-brand font-semibold underline">
                      Click to choose another file
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="w-12 h-12 mx-auto rounded-full bg-indigo-50 text-indigo-brand flex items-center justify-center">
                      <UploadCloud className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-bold text-midnight-900">
                      Drag & drop your file here, or browse
                    </p>
                    <p className="text-xs text-midnight-500">
                      Supports PDF exam papers, Word docs, TXT syllabus, Markdown, CSV, JSON
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-1.5 pt-2">
                      {['PDF', 'DOCX', 'TXT', 'MD', 'CSV', 'JSON'].map((fmt) => (
                        <span
                          key={fmt}
                          className="px-2 py-0.5 rounded text-[10px] font-bold bg-pearl-200/80 text-midnight-700"
                        >
                          .{fmt}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-midnight-700 mb-1">
                  Paste Syllabus, Textbook Excerpt, or Exam Questions
                </label>
                <textarea
                  rows={6}
                  placeholder="Paste your curriculum text, question sheet, or course notes here..."
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  className="w-full rounded-xl border border-pearl-300 p-3 text-xs text-midnight-900 focus:border-indigo-brand focus:outline-none"
                />
              </div>
            )}

            {/* Config Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Question Bank Title (Optional)"
                placeholder="Auto-detected from document if blank"
                value={docBankTitle}
                onChange={(e) => setDocBankTitle(e.target.value)}
              />
              <Input
                label="Subject / Topic (Optional)"
                placeholder="Auto-detected from document if blank"
                value={docSubject}
                onChange={(e) => setDocSubject(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-midnight-700 mb-1">
                  Questions to Generate
                </label>
                <select
                  value={docCount}
                  onChange={(e) => setDocCount(Number(e.target.value))}
                  className="w-full rounded-lg border border-pearl-300 bg-white px-3 py-2 text-xs text-midnight-900 focus:border-indigo-brand focus:outline-none"
                >
                  <option value={3}>3 Questions (Quick)</option>
                  <option value={5}>5 Questions (Standard)</option>
                  <option value={10}>10 Questions (Comprehensive)</option>
                  <option value={15}>15 Questions (Full Exam)</option>
                  <option value={20}>20 Questions (Deep Bank)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-midnight-700 mb-1">
                  Question Types
                </label>
                <select
                  value={docQuestionTypes}
                  onChange={(e) => setDocQuestionTypes(e.target.value as any)}
                  className="w-full rounded-lg border border-pearl-300 bg-white px-3 py-2 text-xs text-midnight-900 focus:border-indigo-brand focus:outline-none"
                >
                  <option value="all">Mixed (MCQs & Coding)</option>
                  <option value="mcq">MCQs Only</option>
                  <option value="programming">Coding Problems Only</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-midnight-700 mb-1">
                  Difficulty Level
                </label>
                <select
                  value={docDifficulty}
                  onChange={(e) => setDocDifficulty(e.target.value as any)}
                  className="w-full rounded-lg border border-pearl-300 bg-white px-3 py-2 text-xs text-midnight-900 focus:border-indigo-brand focus:outline-none"
                >
                  <option value="mixed">Mixed (All Levels)</option>
                  <option value="easy">Easy (Foundations)</option>
                  <option value="medium">Medium (Standard)</option>
                  <option value="hard">Hard (Advanced)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-pearl-200">
              <Button type="button" variant="outline" onClick={() => setIsDocModalOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="electric"
                isLoading={docAnalyzing}
                leftIcon={<Sparkles className="w-4 h-4" />}
              >
                {docAnalyzing ? 'Analyzing Document with AI...' : 'Analyze & Generate Questions'}
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            {/* Review Step: Header with Bank info */}
            <div className="p-4 rounded-xl bg-pearl-50 border border-pearl-200 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Question Bank Title"
                  required
                  value={docBankTitle}
                  onChange={(e) => setDocBankTitle(e.target.value)}
                />
                <Input
                  label="Subject"
                  required
                  value={docSubject}
                  onChange={(e) => setDocSubject(e.target.value)}
                />
              </div>
              <Input
                label="Description"
                placeholder="Optional description for this bank..."
                value={docDescription}
                onChange={(e) => setDocDescription(e.target.value)}
              />
            </div>

            {/* Error Banner */}
            {docError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{docError}</span>
              </div>
            )}

            {/* Questions List Header */}
            <div className="flex items-center justify-between pb-2 border-b border-pearl-200 text-xs">
              <span className="font-bold text-midnight-900">
                Extracted Questions ({selectedExtractedIndices.length} of {extractedQuestions.length} selected)
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setSelectedExtractedIndices(
                      selectedExtractedIndices.length === extractedQuestions.length
                        ? []
                        : extractedQuestions.map((_, i) => i)
                    )
                  }
                  className="font-bold text-indigo-brand hover:underline"
                >
                  {selectedExtractedIndices.length === extractedQuestions.length
                    ? 'Unselect All'
                    : 'Select All'}
                </button>
                <span className="text-pearl-300">|</span>
                <button
                  type="button"
                  onClick={() => setDocStep('upload')}
                  className="text-midnight-600 hover:text-midnight-900 font-semibold"
                >
                  Upload Another File
                </button>
              </div>
            </div>

            {/* Questions Scrollable List */}
            <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
              {extractedQuestions.map((q, idx) => {
                const isSelected = selectedExtractedIndices.includes(idx);
                const isProg = q.type === 'programming';

                return (
                  <div
                    key={idx}
                    className={`p-4 rounded-xl border transition-all ${
                      isSelected
                        ? 'border-indigo-brand/40 bg-white shadow-subtle'
                        : 'border-pearl-200 bg-pearl-50/50 opacity-70'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <button
                          type="button"
                          onClick={() => handleToggleDocQuestion(idx)}
                          className="mt-0.5 text-indigo-brand hover:scale-110 transition-transform"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-5 h-5 text-indigo-brand" />
                          ) : (
                            <Square className="w-5 h-5 text-pearl-400" />
                          )}
                        </button>
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-black text-midnight-950">
                              #{idx + 1}
                            </span>
                            <Badge
                              variant={isProg ? 'success' : 'info'}
                              className="text-[10px] font-bold uppercase tracking-wider"
                            >
                              {isProg ? '💻 Coding Problem' : q.type || 'MCQ'}
                            </Badge>
                            <Badge variant="purple" className="text-[10px]">
                              {q.difficulty || 'medium'}
                            </Badge>
                            <span className="text-[10px] font-semibold text-midnight-600 bg-pearl-100 px-2 py-0.5 rounded">
                              {q.defaultMarks || (isProg ? 10 : 1)} Mark
                              {(q.defaultMarks || (isProg ? 10 : 1)) === 1 ? '' : 's'}
                            </span>
                          </div>

                          <p className="text-xs font-bold text-midnight-950">
                            {isProg ? q.title : q.text}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteExtractedQuestion(idx)}
                        className="text-midnight-400 hover:text-red-600 p-1 rounded transition-colors"
                        title="Remove question"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Programming Details Preview */}
                    {isProg ? (
                      <div className="mt-3 pl-8 space-y-2 text-xs">
                        <p className="text-midnight-700 text-[11px] leading-relaxed line-clamp-2">
                          {q.problemStatement}
                        </p>
                        {q.sampleInput && (
                          <div className="grid grid-cols-2 gap-2 bg-pearl-100 p-2.5 rounded-lg text-[10px] font-mono">
                            <div>
                              <span className="font-bold text-midnight-600 block">Sample Input:</span>
                              <pre className="text-midnight-900 mt-0.5">{q.sampleInput}</pre>
                            </div>
                            <div>
                              <span className="font-bold text-midnight-600 block">Expected Output:</span>
                              <pre className="text-emerald-700 mt-0.5">{q.sampleExpectedOutput}</pre>
                            </div>
                          </div>
                        )}
                        {q.testCases && q.testCases.length > 0 && (
                          <p className="text-[10px] text-midnight-500 font-semibold">
                            Includes {q.testCases.length} verified test cases & starter code in 4 languages
                          </p>
                        )}
                      </div>
                    ) : (
                      /* MCQ Details Preview */
                      <div className="mt-3 pl-8 space-y-2">
                        {q.options && q.options.length > 0 && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
                            {q.options.map((opt: any) => {
                              const isCorrect = (q.correctAnswers || []).includes(opt.id);
                              return (
                                <div
                                  key={opt.id}
                                  className={`px-3 py-1.5 rounded-lg border text-[11px] flex items-center justify-between ${
                                    isCorrect
                                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold'
                                      : 'bg-pearl-50/60 border-pearl-200 text-midnight-800'
                                  }`}
                                >
                                  <span>
                                    <strong className="mr-1">{opt.id}:</strong> {opt.text}
                                  </span>
                                  {isCorrect && (
                                    <span className="text-emerald-600 text-[10px] font-extrabold uppercase ml-1">
                                      Correct ✓
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                        {q.explanation && (
                          <p className="text-[10px] text-midnight-600 italic bg-pearl-50 p-2 rounded border border-pearl-200">
                            <strong>Explanation:</strong> {q.explanation}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-pearl-200">
              <Button variant="outline" onClick={() => setDocStep('upload')}>
                &larr; Back to Document
              </Button>
              <Button
                variant="electric"
                onClick={handleSaveDocumentBank}
                isLoading={docSaving}
                disabled={selectedExtractedIndices.length === 0}
                leftIcon={<FolderPlus className="w-4 h-4" />}
              >
                {docModalTargetBankId
                  ? `Import ${selectedExtractedIndices.length} Questions into Bank`
                  : `Create Question Bank (${selectedExtractedIndices.length} Questions)`}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
