import React, { useState } from 'react';
import { api } from '../../api/client';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import {
  Code2,
  Plus,
  Trash2,
  CheckCircle2,
  Lock,
  Layers,
  Sparkles,
  Play,
  AlertCircle,
  FileText,
  Sliders,
} from 'lucide-react';
import { ProgrammingLanguage } from '../../types';

interface ProgrammingQuestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  questionBankId?: string;
  initialSubject?: string;
  initialTopic?: string;
}

interface TestCaseDraft {
  input: string;
  expectedOutput: string;
  isHidden: boolean;
  isSample: boolean;
  weight: number;
  description: string;
}

export const ProgrammingQuestionModal: React.FC<ProgrammingQuestionModalProps> = ({
  isOpen,
  onClose,
  onCreated,
  questionBankId,
  initialSubject,
  initialTopic,
}) => {
  const [activeTab, setActiveTab] = useState<'basic' | 'starter' | 'testcases'>('basic');
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState(initialSubject || '');
  const [topic, setTopic] = useState(initialTopic || '');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [problemStatement, setProblemStatement] = useState('');
  const [descriptionMarkdown, setDescriptionMarkdown] = useState('');
  const [inputFormat, setInputFormat] = useState('');
  const [outputFormat, setOutputFormat] = useState('');
  const [constraints, setConstraints] = useState('');
  const [defaultMarks, setDefaultMarks] = useState(10);
  const [timeLimitSeconds, setTimeLimitSeconds] = useState(2);
  const [memoryLimitMb, setMemoryLimitMb] = useState(256);
  const [scoringPolicy, setScoringPolicy] = useState<'weighted' | 'all_or_nothing'>('weighted');

  // AI Generator state
  const [showAiPrompt, setShowAiPrompt] = useState(false);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [aiTopic, setAiTopic] = useState(initialTopic || '');
  const [aiSubject, setAiSubject] = useState(initialSubject || 'Computer Science');
  const [aiDifficulty, setAiDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [aiSuccessMsg, setAiSuccessMsg] = useState<string | null>(null);

  // Starter code tabs
  const [starterLanguage, setStarterLanguage] = useState<ProgrammingLanguage>('python');
  const [starterCode, setStarterCode] = useState<Record<ProgrammingLanguage, string>>({
    python: `import sys\n\ndef main():\n    # Write your solution here\n    pass\n\nif __name__ == '__main__':\n    main()\n`,
    java: `import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        // Write your solution here\n        \n        sc.close();\n    }\n}\n`,
    cpp: `#include <iostream>\nusing namespace std;\n\nint main() {\n    // Write your solution here\n    \n    return 0;\n}\n`,
    c: `#include <stdio.h>\n\nint main() {\n    // Write your solution here\n    \n    return 0;\n}\n`,
  });

  // Test cases
  const [testCases, setTestCases] = useState<TestCaseDraft[]>([
    {
      input: '10 20',
      expectedOutput: '30',
      isHidden: false,
      isSample: true,
      weight: 5,
      description: 'Sample addition test',
    },
    {
      input: '-5 10',
      expectedOutput: '5',
      isHidden: true,
      isSample: false,
      weight: 5,
      description: 'Negative numbers test case',
    },
  ]);

  // Form submission & state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddTestCase = () => {
    setTestCases([
      ...testCases,
      {
        input: '',
        expectedOutput: '',
        isHidden: false,
        isSample: false,
        weight: 1,
        description: '',
      },
    ]);
  };

  const handleRemoveTestCase = (idx: number) => {
    const updated = [...testCases];
    updated.splice(idx, 1);
    setTestCases(updated);
  };

  const handleUpdateTestCase = (idx: number, field: keyof TestCaseDraft, val: any) => {
    const updated = [...testCases];
    (updated[idx] as any)[field] = val;
    setTestCases(updated);
  };

  const handleGenerateAiProblem = async () => {
    if (!aiTopic.trim()) {
      setError('Please provide a topic or concept for AI problem generation.');
      return;
    }
    setIsAiGenerating(true);
    setError(null);
    try {
      const res = await api.post('/ai/generate-programming-question', {
        subject: aiSubject || 'Computer Science',
        topic: aiTopic.trim(),
        difficulty: aiDifficulty,
      });

      const data = res.data?.data;
      if (data) {
        setTitle(data.title || '');
        setSubject(data.subject || aiSubject || 'Computer Science');
        setTopic(data.topic || aiTopic);
        setDifficulty(data.difficulty || aiDifficulty);
        setProblemStatement(data.problemStatement || '');
        setDescriptionMarkdown(data.problemDescriptionMarkdown || '');
        setInputFormat(data.inputFormat || '');
        setOutputFormat(data.outputFormat || '');
        setConstraints(data.constraints || '');
        setDefaultMarks(data.defaultMarks || 10);
        setTimeLimitSeconds(data.timeLimitSeconds || 2);
        setMemoryLimitMb(data.memoryLimitMb || 256);

        if (data.starterCode) {
          setStarterCode((prev) => ({
            ...prev,
            ...data.starterCode,
          }));
        }

        if (Array.isArray(data.testCases) && data.testCases.length > 0) {
          setTestCases(
            data.testCases.map((tc: any) => ({
              input: tc.input || '',
              expectedOutput: tc.expectedOutput || '',
              isHidden: !!tc.isHidden,
              isSample: !!tc.isSample,
              weight: Number(tc.weight) || 5,
              description: tc.description || '',
            }))
          );
        }

        setAiSuccessMsg(`✨ AI generated "${data.title}" successfully! Review details and test cases below.`);
        setShowAiPrompt(false);
        setActiveTab('basic');
      }
    } catch (err: any) {
      setError(err.message || 'AI problem generation failed. Please try again.');
    } finally {
      setIsAiGenerating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title || !subject || !problemStatement) {
      setError('Title, subject, and problem statement are required.');
      return;
    }

    if (testCases.length === 0) {
      setError('Please configure at least one test case before creating the question.');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/programming-questions', {
        questionBankId,
        title,
        subject,
        topic,
        difficulty,
        problemStatement,
        problemDescriptionMarkdown: descriptionMarkdown,
        inputFormat,
        outputFormat,
        constraints,
        defaultMarks: Number(defaultMarks),
        timeLimitSeconds: Number(timeLimitSeconds),
        memoryLimitMb: Number(memoryLimitMb),
        scoringPolicy,
        supportedLanguages: ['python', 'java', 'cpp', 'c'],
        starterCode,
        sampleInput: testCases.find((t) => t.isSample)?.input || testCases[0]?.input || '',
        sampleExpectedOutput: testCases.find((t) => t.isSample)?.expectedOutput || testCases[0]?.expectedOutput || '',
        testCases: testCases.map((tc, i) => ({
          ...tc,
          order: i,
          weight: Number(tc.weight),
        })),
      });

      onCreated();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create programming question.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl" title="Create Programming Question">
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {aiSuccessMsg && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{aiSuccessMsg}</span>
            </div>
            <button
              type="button"
              onClick={() => setAiSuccessMsg(null)}
              className="text-emerald-700 text-xs font-bold hover:underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Modal Navigation Tabs & AI Action */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 border-b border-pearl-200 pb-2">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            <button
              type="button"
              onClick={() => setActiveTab('basic')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'basic'
                  ? 'bg-indigo-brand text-white shadow-subtle'
                  : 'text-midnight-600 hover:bg-pearl-100'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Problem & Details
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('starter')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'starter'
                  ? 'bg-indigo-brand text-white shadow-subtle'
                  : 'text-midnight-600 hover:bg-pearl-100'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              Starter Code Templates
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('testcases')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'testcases'
                  ? 'bg-indigo-brand text-white shadow-subtle'
                  : 'text-midnight-600 hover:bg-pearl-100'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Test Cases ({testCases.length})
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowAiPrompt(!showAiPrompt)}
            className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 shadow-sm shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>{showAiPrompt ? 'Hide AI Generator' : '✨ AI Generate Problem'}</span>
          </button>
        </div>

        {/* AI Generator Inline Drawer */}
        {showAiPrompt && (
          <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-50/80 via-purple-50/50 to-pink-50/30 border border-indigo-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-extrabold text-indigo-950 uppercase tracking-wider">
                  AI Coding Question Generator (Powered by Gemini AI)
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowAiPrompt(false)}
                className="text-xs text-midnight-500 hover:text-midnight-900 font-medium"
              >
                Close
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-bold text-midnight-700 block mb-1">Subject</label>
                <input
                  type="text"
                  value={aiSubject}
                  onChange={(e) => setAiSubject(e.target.value)}
                  placeholder="e.g. Data Structures & Algorithms"
                  className="w-full text-xs rounded-lg border border-pearl-300 p-2 bg-white text-midnight-900 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-midnight-700 block mb-1">Topic / Concept *</label>
                <input
                  type="text"
                  value={aiTopic}
                  onChange={(e) => setAiTopic(e.target.value)}
                  placeholder="e.g. Binary Search, Two Pointers, Palindrome"
                  className="w-full text-xs rounded-lg border border-pearl-300 p-2 bg-white text-midnight-900 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-midnight-700 block mb-1">Difficulty</label>
                <select
                  value={aiDifficulty}
                  onChange={(e) => setAiDifficulty(e.target.value as any)}
                  className="w-full text-xs rounded-lg border border-pearl-300 p-2 bg-white text-midnight-900 focus:outline-none focus:border-indigo-500"
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-midnight-500">
                Gemini will craft problem description, input/output formats, sample cases, starter templates, and hidden test cases.
              </span>
              <Button
                type="button"
                variant="electric"
                size="sm"
                leftIcon={<Sparkles className="w-3.5 h-3.5 text-amber-300" />}
                disabled={isAiGenerating}
                onClick={handleGenerateAiProblem}
              >
                {isAiGenerating ? 'Generating with Gemini AI...' : 'Generate Problem'}
              </Button>
            </div>
          </div>
        )}

        {/* Tab 1: Problem & Details */}
        {activeTab === 'basic' && (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Problem Title *"
                placeholder="e.g. Sum of Two Integers"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
              <Input
                label="Subject *"
                placeholder="e.g. Data Structures & Algorithms"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="Topic"
                placeholder="e.g. Arrays, I/O"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              />

              <div>
                <label className="text-xs font-bold text-midnight-700 block mb-1.5">Difficulty</label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as any)}
                  className="w-full rounded-xl border border-pearl-300 p-2.5 text-xs text-midnight-900 bg-white focus:border-indigo-brand focus:outline-none"
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>

              <Input
                type="number"
                label="Maximum Marks *"
                value={defaultMarks}
                onChange={(e) => setDefaultMarks(Number(e.target.value))}
                min={1}
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-midnight-700 block mb-1.5">
                Problem Statement (Primary Prompt) *
              </label>
              <textarea
                rows={3}
                value={problemStatement}
                onChange={(e) => setProblemStatement(e.target.value)}
                placeholder="Describe the problem clearly..."
                className="w-full rounded-xl border border-pearl-300 p-3 text-xs text-midnight-900 focus:border-indigo-brand focus:outline-none"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-midnight-700 block mb-1.5">Input Format</label>
                <textarea
                  rows={2}
                  value={inputFormat}
                  onChange={(e) => setInputFormat(e.target.value)}
                  placeholder="e.g. Two space-separated integers A and B"
                  className="w-full rounded-xl border border-pearl-300 p-3 text-xs text-midnight-900 focus:border-indigo-brand focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-midnight-700 block mb-1.5">Output Format</label>
                <textarea
                  rows={2}
                  value={outputFormat}
                  onChange={(e) => setOutputFormat(e.target.value)}
                  placeholder="e.g. Print single integer representing sum"
                  className="w-full rounded-xl border border-pearl-300 p-3 text-xs text-midnight-900 focus:border-indigo-brand focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-midnight-700 block mb-1.5">Constraints</label>
              <input
                type="text"
                value={constraints}
                onChange={(e) => setConstraints(e.target.value)}
                placeholder="e.g. 1 <= N <= 10^5, -10^9 <= A[i] <= 10^9"
                className="w-full rounded-xl border border-pearl-300 p-2.5 text-xs text-midnight-900 focus:border-indigo-brand focus:outline-none font-mono"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-pearl-100">
              <Input
                type="number"
                label="Time Limit (Seconds)"
                value={timeLimitSeconds}
                onChange={(e) => setTimeLimitSeconds(Number(e.target.value))}
                min={0.5}
                max={15}
                step={0.5}
              />
              <Input
                type="number"
                label="Memory Limit (MB)"
                value={memoryLimitMb}
                onChange={(e) => setMemoryLimitMb(Number(e.target.value))}
                min={16}
                max={1024}
              />
              <div>
                <label className="text-xs font-bold text-midnight-700 block mb-1.5">Scoring Policy</label>
                <select
                  value={scoringPolicy}
                  onChange={(e) => setScoringPolicy(e.target.value as any)}
                  className="w-full rounded-xl border border-pearl-300 p-2.5 text-xs text-midnight-900 bg-white focus:border-indigo-brand focus:outline-none"
                >
                  <option value="weighted">Weighted (Partial Marks per Test)</option>
                  <option value="all_or_nothing">All or Nothing (100% or 0)</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Starter Code Templates */}
        {activeTab === 'starter' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {(['python', 'java', 'cpp', 'c'] as ProgrammingLanguage[]).map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => setStarterLanguage(lang)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase transition-colors ${
                      starterLanguage === lang
                        ? 'bg-midnight-900 text-white'
                        : 'bg-pearl-100 text-midnight-600 hover:bg-pearl-200'
                    }`}
                  >
                    {lang}
                  </button>
                ))}
              </div>
              <span className="text-[11px] text-midnight-500 font-mono">
                Custom starter template for students
              </span>
            </div>

            <textarea
              rows={12}
              value={starterCode[starterLanguage] || ''}
              onChange={(e) =>
                setStarterCode({
                  ...starterCode,
                  [starterLanguage]: e.target.value,
                })
              }
              className="w-full rounded-xl bg-midnight-950 text-pearl-100 p-4 font-mono text-xs border border-midnight-800 focus:border-indigo-brand focus:outline-none"
            />
          </div>
        )}

        {/* Tab 3: Test Cases */}
        {activeTab === 'testcases' && (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-midnight-600 font-medium">
                Configure visible sample inputs and secure hidden evaluation tests:
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddTestCase}
                leftIcon={<Plus className="w-3.5 h-3.5" />}
              >
                Add Test Case
              </Button>
            </div>

            <div className="space-y-3">
              {testCases.map((tc, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl border border-pearl-200 bg-pearl-50/50 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-midnight-800">
                        Test #{idx + 1}
                      </span>
                      {tc.isSample && <Badge variant="success">Sample Case</Badge>}
                      {tc.isHidden && <Badge variant="warning">Hidden Test</Badge>}
                    </div>

                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-1.5 text-xs text-midnight-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={tc.isSample}
                          onChange={(e) => handleUpdateTestCase(idx, 'isSample', e.target.checked)}
                          className="rounded text-indigo-brand"
                        />
                        <span>Sample</span>
                      </label>

                      <label className="flex items-center gap-1.5 text-xs text-midnight-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={tc.isHidden}
                          onChange={(e) => handleUpdateTestCase(idx, 'isHidden', e.target.checked)}
                          className="rounded text-indigo-brand"
                        />
                        <span>Hidden</span>
                      </label>

                      <div className="flex items-center gap-1">
                        <span className="text-xs text-midnight-500 font-mono">Weight:</span>
                        <input
                          type="number"
                          value={tc.weight}
                          onChange={(e) => handleUpdateTestCase(idx, 'weight', Number(e.target.value))}
                          className="w-14 rounded border border-pearl-300 p-1 text-xs text-midnight-900 font-mono text-center"
                          min={0}
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveTestCase(idx)}
                        className="text-rose-500 hover:text-rose-700 p-1"
                        title="Delete test case"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <span className="text-[11px] font-mono font-semibold text-midnight-600 block mb-1">
                        Input (stdin):
                      </span>
                      <textarea
                        rows={2}
                        value={tc.input}
                        onChange={(e) => handleUpdateTestCase(idx, 'input', e.target.value)}
                        placeholder="e.g. 10 20"
                        className="w-full rounded-lg border border-pearl-300 p-2 font-mono text-xs text-midnight-900 bg-white"
                      />
                    </div>
                    <div>
                      <span className="text-[11px] font-mono font-semibold text-midnight-600 block mb-1">
                        Expected Output (stdout) *:
                      </span>
                      <textarea
                        rows={2}
                        value={tc.expectedOutput}
                        onChange={(e) => handleUpdateTestCase(idx, 'expectedOutput', e.target.value)}
                        placeholder="e.g. 30"
                        className="w-full rounded-lg border border-pearl-300 p-2 font-mono text-xs text-midnight-900 bg-white"
                        required
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Modal Actions Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-pearl-200">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="submit"
              variant="electric"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating Question...' : 'Save Programming Question'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
