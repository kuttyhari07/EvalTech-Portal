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
}) => {
  const [activeTab, setActiveTab] = useState<'basic' | 'starter' | 'testcases'>('basic');
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');
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

        {/* Modal Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-pearl-200 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab('basic')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
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
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
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
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
              activeTab === 'testcases'
                ? 'bg-indigo-brand text-white shadow-subtle'
                : 'text-midnight-600 hover:bg-pearl-100'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Test Cases ({testCases.length})
          </button>
        </div>

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
