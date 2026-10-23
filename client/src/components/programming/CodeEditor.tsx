import React, { useState, useEffect } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import { ProgrammingLanguage } from '../../types';
import { Button } from '../ui/Button';
import {
  Code2,
  RotateCcw,
  Sun,
  Moon,
  Check,
  CheckCircle2,
  AlertCircle,
  Copy,
  Sparkles,
} from 'lucide-react';

interface CodeEditorProps {
  language: ProgrammingLanguage;
  onLanguageChange: (lang: ProgrammingLanguage) => void;
  sourceCode: string;
  onChange: (value: string) => void;
  starterCodeMap?: Record<string, string>;
  isReadOnly?: boolean;
  isAutosaving?: boolean;
  lastSavedText?: string;
  supportedLanguages?: ProgrammingLanguage[];
}

const MONACO_LANG_MAP: Record<ProgrammingLanguage, string> = {
  python: 'python',
  java: 'java',
  cpp: 'cpp',
  c: 'c',
};

export const CodeEditor: React.FC<CodeEditorProps> = ({
  language,
  onLanguageChange,
  sourceCode,
  onChange,
  starterCodeMap = {},
  isReadOnly = false,
  isAutosaving = false,
  lastSavedText = 'All changes saved',
  supportedLanguages = ['python', 'java', 'cpp', 'c'],
}) => {
  const [theme, setTheme] = useState<'vs-dark' | 'light'>('vs-dark');
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(sourceCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleResetToStarter = () => {
    const starter = starterCodeMap[language] || '';
    onChange(starter);
    setIsResetConfirmOpen(false);
  };

  return (
    <div className="flex flex-col h-full bg-midnight-950 rounded-xl border border-midnight-800 shadow-xl overflow-hidden">
      {/* Editor Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between px-4 py-2.5 bg-midnight-900 border-b border-midnight-800 gap-2">
        {/* Left: Language Selector */}
        <div className="flex items-center gap-2">
          <Code2 className="w-4 h-4 text-indigo-glow" />
          <span className="text-xs font-bold text-pearl-300 font-mono uppercase">Language:</span>
          <select
            value={language}
            onChange={(e) => onLanguageChange(e.target.value as ProgrammingLanguage)}
            disabled={isReadOnly}
            className="bg-midnight-950 text-white border border-midnight-700 text-xs font-mono font-bold rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-brand transition-colors cursor-pointer"
          >
            {supportedLanguages.includes('python') && <option value="python">Python (3.x)</option>}
            {supportedLanguages.includes('java') && <option value="java">Java (OpenJDK)</option>}
            {supportedLanguages.includes('cpp') && <option value="cpp">C++ (GCC/G++ 17)</option>}
            {supportedLanguages.includes('c') && <option value="c">C (GCC 9.x)</option>}
          </select>
        </div>

        {/* Right: Actions & Theme Toggle */}
        <div className="flex items-center gap-2">
          {/* Autosave Status */}
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-pearl-400 mr-2">
            {isAutosaving ? (
              <span className="flex items-center gap-1 text-amber-400 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                Saving draft...
              </span>
            ) : (
              <span className="flex items-center gap-1 text-emerald-400">
                <Check className="w-3.5 h-3.5" />
                {lastSavedText}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={handleCopy}
            className="p-1.5 text-pearl-400 hover:text-white bg-midnight-950 hover:bg-midnight-800 border border-midnight-800 rounded-lg transition-colors"
            title="Copy Code"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          {!isReadOnly && (
            <button
              type="button"
              onClick={() => setIsResetConfirmOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-pearl-300 hover:text-white bg-midnight-950 hover:bg-midnight-800 border border-midnight-800 rounded-lg transition-colors font-medium"
              title="Reset code to starter template"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setTheme(theme === 'vs-dark' ? 'light' : 'vs-dark')}
            className="p-1.5 text-pearl-400 hover:text-white bg-midnight-950 hover:bg-midnight-800 border border-midnight-800 rounded-lg transition-colors"
            title={theme === 'vs-dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
          >
            {theme === 'vs-dark' ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-indigo-400" />}
          </button>
        </div>
      </div>

      {/* Monaco Code Editor Canvas */}
      <div className="flex-1 w-full min-h-[350px] relative">
        <Editor
          height="100%"
          language={MONACO_LANG_MAP[language] || 'python'}
          value={sourceCode}
          theme={theme}
          onChange={(val) => onChange(val || '')}
          options={{
            readOnly: isReadOnly,
            minimap: { enabled: false },
            fontSize: 13,
            fontFamily: "'Fira Code', 'JetBrains Mono', Consolas, 'Courier New', monospace",
            lineNumbers: 'on',
            roundedSelection: true,
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 4,
            insertSpaces: true,
            padding: { top: 12, bottom: 12 },
            cursorBlinking: 'smooth',
            wordWrap: 'on',
            lineDecorationsWidth: 10,
          }}
        />
      </div>

      {/* Reset Confirmation Overlay Modal */}
      {isResetConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-midnight-900 border border-midnight-700 rounded-2xl max-w-sm w-full p-6 text-white shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white">Reset Starter Code?</h4>
                <p className="text-xs text-pearl-400 mt-0.5">
                  Your current code for {language.toUpperCase()} will be replaced by the default template.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsResetConfirmOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleResetToStarter}
              >
                Yes, Reset Code
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
