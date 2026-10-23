import React, { useState } from 'react';
import { Badge } from '../ui/Badge';
import {
  FileText,
  Copy,
  Check,
  Clock,
  Cpu,
  Layers,
  History,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from 'lucide-react';

interface ProblemStatementPanelProps {
  questionNumber: number;
  totalQuestions: number;
  marks: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  title: string;
  problemStatement: string;
  problemDescriptionMarkdown?: string;
  inputFormat?: string;
  outputFormat?: string;
  constraints?: string;
  sampleTestCases?: Array<{
    id?: string;
    input: string;
    expectedOutput: string;
    description?: string;
  }>;
  sampleInput?: string;
  sampleExpectedOutput?: string;
  sampleExplanation?: string;
  timeLimitSeconds?: number;
  memoryLimitMb?: number;
  submissions?: any[];
}

export const ProblemStatementPanel: React.FC<ProblemStatementPanelProps> = ({
  questionNumber,
  totalQuestions,
  marks,
  difficulty = 'medium',
  title,
  problemStatement,
  problemDescriptionMarkdown,
  inputFormat,
  outputFormat,
  constraints,
  sampleTestCases = [],
  sampleInput,
  sampleExpectedOutput,
  sampleExplanation,
  timeLimitSeconds = 2,
  memoryLimitMb = 256,
  submissions = [],
}) => {
  const [activeTab, setActiveTab] = useState<'problem' | 'samples' | 'history'>('problem');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getDifficultyBadge = () => {
    switch (difficulty) {
      case 'easy':
        return <Badge variant="success">Easy</Badge>;
      case 'hard':
        return <Badge variant="danger">Hard</Badge>;
      case 'medium':
      default:
        return <Badge variant="warning">Medium</Badge>;
    }
  };

  // Compile list of sample cases
  const allSampleCases = [...sampleTestCases];
  if (allSampleCases.length === 0 && (sampleInput || sampleExpectedOutput)) {
    allSampleCases.push({
      input: sampleInput || '',
      expectedOutput: sampleExpectedOutput || '',
      description: 'Sample Test Case',
    });
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-midnight-950 rounded-xl border border-pearl-200 dark:border-midnight-800 shadow-md overflow-hidden">
      {/* Header with Title and Tabs */}
      <div className="px-5 py-4 border-b border-pearl-200 dark:border-midnight-800 bg-pearl-50/60 dark:bg-midnight-900/60">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-indigo-brand bg-indigo-50 dark:bg-indigo-950/80 px-2.5 py-1 rounded border border-indigo-200 dark:border-indigo-800">
              Q{questionNumber} of {totalQuestions}
            </span>
            {getDifficultyBadge()}
            <span className="text-xs font-mono font-bold text-midnight-600 dark:text-pearl-400">
              {marks} Mark{marks > 1 ? 's' : ''}
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs text-midnight-500 dark:text-pearl-400 font-mono">
            <span className="flex items-center gap-1" title="Time Limit per test">
              <Clock className="w-3.5 h-3.5 text-indigo-brand" /> {timeLimitSeconds}s
            </span>
            <span className="flex items-center gap-1" title="Memory Limit">
              <Cpu className="w-3.5 h-3.5 text-indigo-brand" /> {memoryLimitMb}MB
            </span>
          </div>
        </div>

        <h3 className="text-lg font-extrabold text-midnight-950 dark:text-white leading-snug">
          {title || 'Programming Problem'}
        </h3>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 mt-3 pt-2 border-t border-pearl-200/60 dark:border-midnight-800">
          <button
            type="button"
            onClick={() => setActiveTab('problem')}
            className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'problem'
                ? 'bg-indigo-brand text-white shadow-subtle'
                : 'text-midnight-600 dark:text-pearl-300 hover:bg-pearl-100 dark:hover:bg-midnight-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Problem
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('samples')}
            className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'samples'
                ? 'bg-indigo-brand text-white shadow-subtle'
                : 'text-midnight-600 dark:text-pearl-300 hover:bg-pearl-100 dark:hover:bg-midnight-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Sample Cases ({allSampleCases.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'bg-indigo-brand text-white shadow-subtle'
                : 'text-midnight-600 dark:text-pearl-300 hover:bg-pearl-100 dark:hover:bg-midnight-800'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Submissions ({submissions.length})
          </button>
        </div>
      </div>

      {/* Tab Content Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6 text-midnight-900 dark:text-pearl-100 text-sm leading-relaxed">
        {activeTab === 'problem' && (
          <>
            {/* Problem Statement */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-indigo-brand dark:text-indigo-glow uppercase tracking-wider font-mono">
                Problem Statement
              </h4>
              <p className="whitespace-pre-line text-midnight-800 dark:text-pearl-100 font-medium">
                {problemStatement}
              </p>
              {problemDescriptionMarkdown && (
                <div className="mt-3 p-4 rounded-xl bg-pearl-50 dark:bg-midnight-900 border border-pearl-200 dark:border-midnight-800 whitespace-pre-wrap font-sans text-xs">
                  {problemDescriptionMarkdown}
                </div>
              )}
            </div>

            {/* Input Format */}
            {inputFormat && (
              <div className="space-y-1.5">
                <h4 className="text-xs font-bold text-indigo-brand dark:text-indigo-glow uppercase tracking-wider font-mono">
                  Input Format
                </h4>
                <div className="p-3 rounded-lg bg-pearl-50 dark:bg-midnight-900 border border-pearl-200 dark:border-midnight-800 text-xs text-midnight-700 dark:text-pearl-300">
                  {inputFormat}
                </div>
              </div>
            )}

            {/* Output Format */}
            {outputFormat && (
              <div className="space-y-1.5">
                <h4 className="text-xs font-bold text-indigo-brand dark:text-indigo-glow uppercase tracking-wider font-mono">
                  Output Format
                </h4>
                <div className="p-3 rounded-lg bg-pearl-50 dark:bg-midnight-900 border border-pearl-200 dark:border-midnight-800 text-xs text-midnight-700 dark:text-pearl-300">
                  {outputFormat}
                </div>
              </div>
            )}

            {/* Constraints */}
            {constraints && (
              <div className="space-y-1.5">
                <h4 className="text-xs font-bold text-indigo-brand dark:text-indigo-glow uppercase tracking-wider font-mono">
                  Constraints
                </h4>
                <div className="p-3 rounded-lg bg-pearl-50 dark:bg-midnight-900 border border-pearl-200 dark:border-midnight-800 font-mono text-xs text-midnight-700 dark:text-pearl-300">
                  {constraints}
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === 'samples' && (
          <div className="space-y-5">
            {allSampleCases.length === 0 ? (
              <p className="text-xs text-midnight-500 dark:text-pearl-400 italic">No sample test cases configured.</p>
            ) : (
              allSampleCases.map((sc, idx) => (
                <div
                  key={sc.id || idx}
                  className="rounded-xl border border-pearl-200 dark:border-midnight-800 bg-pearl-50/50 dark:bg-midnight-900/50 p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-indigo-brand">
                      Sample Case {idx + 1}
                    </span>
                    {sc.description && (
                      <span className="text-[11px] text-midnight-500 dark:text-pearl-400">
                        {sc.description}
                      </span>
                    )}
                  </div>

                  {/* Input Block */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-mono font-semibold text-midnight-600 dark:text-pearl-400">
                        Input:
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyText(`in_${idx}`, sc.input)}
                        className="text-[11px] text-midnight-500 dark:text-pearl-400 hover:text-indigo-brand flex items-center gap-1 font-mono"
                      >
                        {copiedId === `in_${idx}` ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                        Copy
                      </button>
                    </div>
                    <pre className="p-3 rounded-lg bg-midnight-950 text-emerald-300 font-mono text-xs overflow-x-auto border border-midnight-800">
                      <code>{sc.input || '<empty input>'}</code>
                    </pre>
                  </div>

                  {/* Expected Output Block */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-mono font-semibold text-midnight-600 dark:text-pearl-400">
                        Expected Output:
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyText(`out_${idx}`, sc.expectedOutput)}
                        className="text-[11px] text-midnight-500 dark:text-pearl-400 hover:text-indigo-brand flex items-center gap-1 font-mono"
                      >
                        {copiedId === `out_${idx}` ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                        Copy
                      </button>
                    </div>
                    <pre className="p-3 rounded-lg bg-midnight-950 text-indigo-300 font-mono text-xs overflow-x-auto border border-midnight-800">
                      <code>{sc.expectedOutput}</code>
                    </pre>
                  </div>

                  {sampleExplanation && idx === 0 && (
                    <div className="pt-2 text-xs text-midnight-600 dark:text-pearl-300 italic border-t border-pearl-200 dark:border-midnight-800">
                      <strong>Explanation:</strong> {sampleExplanation}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-3">
            {submissions.length === 0 ? (
              <div className="text-center py-8 text-midnight-500 dark:text-pearl-400">
                <History className="w-8 h-8 mx-auto opacity-40 mb-2" />
                <p className="text-xs">No scored submissions made yet for this question.</p>
              </div>
            ) : (
              submissions.map((sub, idx) => {
                const isAccepted = sub.verdict === 'Accepted';
                return (
                  <div
                    key={sub._id || idx}
                    className="p-3.5 rounded-xl border border-pearl-200 dark:border-midnight-800 bg-white dark:bg-midnight-900 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      {isAccepted ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                      )}
                      <div>
                        <div className="font-bold text-midnight-900 dark:text-white flex items-center gap-2">
                          <span>Submission #{sub.submissionNumber || idx + 1}</span>
                          <span
                            className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
                              isAccepted
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                            }`}
                          >
                            {sub.verdict}
                          </span>
                        </div>
                        <span className="text-[11px] text-midnight-500 dark:text-pearl-400 font-mono">
                          {sub.language?.toUpperCase()} • {sub.passedTestCasesCount}/{sub.totalTestCasesCount} Passed
                        </span>
                      </div>
                    </div>

                    <div className="text-right font-mono">
                      <div className="font-bold text-indigo-brand dark:text-indigo-glow">
                        {sub.marksObtained} / {sub.totalMarks} Marks
                      </div>
                      <span className="text-[10px] text-midnight-400 dark:text-pearl-500">
                        {new Date(sub.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
};
