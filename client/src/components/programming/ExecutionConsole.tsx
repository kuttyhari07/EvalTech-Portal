import React, { useState } from 'react';
import { Button } from '../ui/Button';
import {
  Play,
  Send,
  Terminal,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Cpu,
  Layers,
  ChevronUp,
  ChevronDown,
  Loader2,
  Lock,
} from 'lucide-react';
import { CodeVerdict } from '../../types';

interface TestResultDisplay {
  testCaseId?: string;
  isSample?: boolean;
  isHidden?: boolean;
  passed: boolean;
  verdict: CodeVerdict;
  executionTimeMs?: number;
  memoryKb?: number;
  studentOutput?: string;
  expectedOutput?: string;
  compileError?: string;
  runtimeError?: string;
  input?: string;
  actualOutput?: string;
  description?: string;
  stderr?: string;
}

interface ExecutionConsoleProps {
  onRunCode: () => void;
  onSubmitSolution: () => void;
  isRunning: boolean;
  isSubmitting: boolean;
  customInput: string;
  onCustomInputChange: (val: string) => void;
  runResults?: any;
  submissionResults?: any;
  lastAction: 'run' | 'submit' | null;
}

export const ExecutionConsole: React.FC<ExecutionConsoleProps> = ({
  onRunCode,
  onSubmitSolution,
  isRunning,
  isSubmitting,
  customInput,
  onCustomInputChange,
  runResults,
  submissionResults,
  lastAction,
}) => {
  const [activeTab, setActiveTab] = useState<'tests' | 'custom' | 'console'>('tests');
  const [isExpanded, setIsExpanded] = useState(true);
  const [selectedCaseIdx, setSelectedCaseIdx] = useState(0);

  // Active list of results: if lastAction === 'submit' and submissionResults exists, show submission results; else show runResults
  const isSubmission = lastAction === 'submit' && submissionResults;
  const testResults: TestResultDisplay[] = isSubmission
    ? submissionResults.testResults || []
    : runResults?.results || [];

  const activeCase = testResults[selectedCaseIdx] || null;

  return (
    <div className="bg-midnight-950 border border-midnight-800 rounded-xl shadow-2xl overflow-hidden flex flex-col transition-all">
      {/* Console Header Bar */}
      <div className="px-4 py-2.5 bg-midnight-900 border-b border-midnight-800 flex items-center justify-between gap-3">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <button
            type="button"
            onClick={() => {
              setActiveTab('tests');
              setIsExpanded(true);
            }}
            className={`text-xs font-mono font-bold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 shrink-0 ${
              activeTab === 'tests'
                ? 'bg-midnight-800 text-indigo-glow border border-midnight-700'
                : 'text-pearl-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Test Results
            {testResults.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-midnight-700 text-[10px] flex items-center justify-center text-pearl-200">
                {testResults.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('custom');
              setIsExpanded(true);
            }}
            className={`text-xs font-mono font-bold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 shrink-0 ${
              activeTab === 'custom'
                ? 'bg-midnight-800 text-indigo-glow border border-midnight-700'
                : 'text-pearl-400 hover:text-white'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            Custom Input
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('console');
              setIsExpanded(true);
            }}
            className={`text-xs font-mono font-bold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 shrink-0 ${
              activeTab === 'console'
                ? 'bg-midnight-800 text-indigo-glow border border-midnight-700'
                : 'text-pearl-400 hover:text-white'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            Compiler Log
          </button>
        </div>

        {/* Right CTA Buttons & Minimize */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 text-pearl-400 hover:text-white bg-midnight-950 border border-midnight-800 rounded-lg transition-colors"
            title={isExpanded ? 'Collapse Console' : 'Expand Console'}
          >
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>

          <Button
            variant="outline"
            size="sm"
            onClick={onRunCode}
            disabled={isRunning || isSubmitting}
            leftIcon={isRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            className="bg-midnight-950 border-midnight-700 text-white hover:bg-midnight-800 text-xs"
          >
            {isRunning ? 'Running...' : 'Run Code'}
          </Button>

          <Button
            variant="electric"
            size="sm"
            onClick={onSubmitSolution}
            disabled={isRunning || isSubmitting}
            leftIcon={isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            className="text-xs"
          >
            {isSubmitting ? 'Evaluating...' : 'Submit Solution'}
          </Button>
        </div>
      </div>

      {/* Expandable Console Body */}
      {isExpanded && (
        <div className="p-4 bg-midnight-950 max-h-72 overflow-y-auto text-xs text-pearl-200 font-mono space-y-4">
          {/* Custom Input Tab */}
          {activeTab === 'custom' && (
            <div className="space-y-2">
              <label className="text-pearl-400 block text-xs">
                Provide custom standard input (stdin) for practice runs:
              </label>
              <textarea
                rows={4}
                value={customInput}
                onChange={(e) => onCustomInputChange(e.target.value)}
                placeholder="Type sample inputs here..."
                className="w-full rounded-lg bg-midnight-900 border border-midnight-800 text-pearl-100 p-3 text-xs font-mono focus:border-indigo-brand focus:outline-none"
              />
            </div>
          )}

          {/* Test Results Tab */}
          {activeTab === 'tests' && (
            <div>
              {testResults.length === 0 ? (
                <div className="text-center py-6 text-pearl-500">
                  <Play className="w-6 h-6 mx-auto opacity-30 mb-2" />
                  <p>Click "Run Code" to test against sample cases, or "Submit Solution" for final evaluation.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Verdict Banner for Submissions */}
                  {isSubmission && (
                    <div
                      className={`p-3.5 rounded-xl border flex items-center justify-between ${
                        submissionResults.verdict === 'Accepted'
                          ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                          : submissionResults.verdict === 'Partially Correct'
                          ? 'bg-amber-950/40 border-amber-500/40 text-amber-300'
                          : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        {submissionResults.verdict === 'Accepted' ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                        ) : (
                          <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
                        )}
                        <div>
                          <div className="text-sm font-extrabold uppercase tracking-wide">
                            {submissionResults.verdict}
                          </div>
                          <div className="text-[11px] opacity-80">
                            {submissionResults.passedTestCasesCount} of {submissionResults.totalTestCasesCount} test cases passed
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-base font-extrabold font-mono">
                          {submissionResults.marksObtained} / {submissionResults.totalMarks} Marks
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Test Case Selection Chips */}
                  <div className="flex flex-wrap items-center gap-2">
                    {testResults.map((tr, idx) => {
                      const isSelected = selectedCaseIdx === idx;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setSelectedCaseIdx(idx)}
                          className={`px-3 py-1.5 rounded-lg border text-xs font-bold font-mono flex items-center gap-1.5 transition-all ${
                            isSelected
                              ? 'bg-indigo-brand text-white border-indigo-brand shadow-subtle ring-1 ring-indigo-400/30'
                              : 'bg-midnight-900 border-midnight-800 text-pearl-300 hover:bg-midnight-800'
                          }`}
                        >
                          {tr.passed ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5 text-rose-400" />
                          )}
                          <span>Test {idx + 1}</span>
                          {tr.isHidden && <Lock className="w-3 h-3 text-pearl-400" />}
                        </button>
                      );
                    })}
                  </div>

                  {/* Active Selected Test Case Details */}
                  {activeCase && (
                    <div className="rounded-xl border border-midnight-800 bg-midnight-900/60 p-4 space-y-3">
                      <div className="flex items-center justify-between text-xs pb-2 border-b border-midnight-800">
                        <div className="flex items-center gap-2 font-bold">
                          <span className={activeCase.passed ? 'text-emerald-400' : 'text-rose-400'}>
                            {activeCase.verdict}
                          </span>
                          {activeCase.isHidden && (
                            <span className="bg-midnight-800 text-pearl-400 px-2 py-0.5 rounded text-[10px]">
                              Hidden Test Case
                            </span>
                          )}
                        </div>
                        {activeCase.executionTimeMs !== undefined && (
                          <div className="flex items-center gap-1 text-pearl-400">
                            <Clock className="w-3 h-3" /> {activeCase.executionTimeMs} ms
                          </div>
                        )}
                      </div>

                      {/* If hidden test case: explain that content is protected */}
                      {activeCase.isHidden ? (
                        <div className="p-4 rounded-lg bg-midnight-950/80 border border-midnight-800 text-center text-pearl-400 space-y-1 py-6">
                          <Lock className="w-5 h-5 mx-auto text-indigo-glow opacity-60 mb-1" />
                          <p className="font-semibold text-white">Hidden Test Case</p>
                          <p className="text-[11px] text-pearl-400 max-w-sm mx-auto">
                            The input and expected output for this test case are hidden to preserve examination integrity.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {/* Input */}
                          {(activeCase.input !== undefined || activeCase.description) && (
                            <div>
                              <span className="text-[11px] font-semibold text-pearl-400 block mb-1">Input:</span>
                              <pre className="p-2.5 rounded bg-midnight-950 text-emerald-300 overflow-x-auto border border-midnight-800">
                                <code>{activeCase.input || '<empty>'}</code>
                              </pre>
                            </div>
                          )}

                          {/* Expected Output */}
                          {activeCase.expectedOutput !== undefined && (
                            <div>
                              <span className="text-[11px] font-semibold text-pearl-400 block mb-1">Expected Output:</span>
                              <pre className="p-2.5 rounded bg-midnight-950 text-indigo-300 overflow-x-auto border border-midnight-800">
                                <code>{activeCase.expectedOutput}</code>
                              </pre>
                            </div>
                          )}

                          {/* Student Actual Output */}
                          {(activeCase.actualOutput !== undefined || activeCase.studentOutput !== undefined) && (
                            <div>
                              <span className="text-[11px] font-semibold text-pearl-400 block mb-1">Your Output:</span>
                              <pre
                                className={`p-2.5 rounded bg-midnight-950 overflow-x-auto border ${
                                  activeCase.passed ? 'border-emerald-800/60 text-white' : 'border-rose-800/60 text-rose-300'
                                }`}
                              >
                                <code>{activeCase.actualOutput || activeCase.studentOutput || '<no output>'}</code>
                              </pre>
                            </div>
                          )}

                          {/* Runtime Error / Compile Error */}
                          {(activeCase.compileError || activeCase.runtimeError || activeCase.stderr) && (
                            <div>
                              <span className="text-[11px] font-semibold text-rose-400 block mb-1">Error Stream:</span>
                              <pre className="p-2.5 rounded bg-rose-950/40 border border-rose-800/60 text-rose-300 overflow-x-auto whitespace-pre-wrap">
                                <code>{activeCase.compileError || activeCase.runtimeError || activeCase.stderr}</code>
                              </pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Compiler Log Tab */}
          {activeTab === 'console' && (
            <div className="space-y-2">
              <span className="text-pearl-400 block text-xs">Standard Output / Compiler Diagnostics:</span>
              <pre className="p-3.5 rounded-lg bg-midnight-900 border border-midnight-800 text-pearl-300 overflow-x-auto whitespace-pre-wrap min-h-[100px]">
                <code>
                  {submissionResults?.executionMetadata?.compileOutput ||
                    runResults?.results?.find((r: any) => r.compileOutput)?.compileOutput ||
                    runResults?.results?.find((r: any) => r.stderr)?.stderr ||
                    'No compiler warnings or errors recorded.'}
                </code>
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
