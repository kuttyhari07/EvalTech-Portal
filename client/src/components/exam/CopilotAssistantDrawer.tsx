import React, { useState } from 'react';
import { api } from '../../api/client';
import { Bot, Sparkles, Send, X, Lightbulb, AlertTriangle, ShieldCheck, ChevronRight } from 'lucide-react';
import { Button } from '../ui/Button';

interface CopilotAssistantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  attemptId: string;
  questionId: string;
  problemStatement: string;
  currentCode: string;
  language: string;
}

interface Message {
  sender: 'student' | 'copilot';
  text: string;
  hintType?: string;
  suggestedAction?: string;
  timestamp: Date;
}

export const CopilotAssistantDrawer: React.FC<CopilotAssistantDrawerProps> = ({
  isOpen,
  onClose,
  attemptId,
  questionId,
  problemStatement,
  currentCode,
  language,
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'copilot',
      text: 'Hello! I am your AI Co-Pilot Pair-Programming Mentor. I can explain compiler errors, suggest algorithmic patterns, and review edge cases. I will not write the full solution for you, but I will help you architect it.',
      timestamp: new Date(),
    },
  ]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const quickPrompts = [
    'Give me an algorithmic hint without giving the solution',
    'What edge cases or constraints should I watch out for?',
    'How can I optimize the time complexity of this approach?',
  ];

  const handleSend = async (textToSend?: string) => {
    const prompt = textToSend || inputPrompt;
    if (!prompt.trim() || isLoading) return;

    const userMsg: Message = {
      sender: 'student',
      text: prompt,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputPrompt('');
    setIsLoading(true);

    try {
      const res = await api.post('/ai-advanced/copilot-assist', {
        userPrompt: prompt,
        problemStatement,
        currentCode,
        language,
        attemptId,
        questionId,
      });

      const assist = res.data?.data;
      const botMsg: Message = {
        sender: 'copilot',
        text: assist?.message || 'Review your data structures and verify array boundaries.',
        hintType: assist?.hintType,
        suggestedAction: assist?.suggestedAction,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'copilot',
          text: err.message || 'Mentor service unavailable momentarily. Please try again.',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-96 bg-midnight-950 border-l border-indigo-900/60 shadow-2xl flex flex-col text-pearl-100">
      {/* Header */}
      <div className="p-3.5 bg-gradient-to-r from-indigo-950 to-midnight-900 border-b border-indigo-900/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-white">AI Co-Pilot Mentor</span>
              <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded font-semibold border border-emerald-500/30">
                Active
              </span>
            </div>
            <p className="text-[10px] text-pearl-400">Architectural Pair-Programming</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-pearl-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`flex flex-col ${
              m.sender === 'student' ? 'items-end' : 'items-start'
            }`}
          >
            <div
              className={`max-w-[90%] rounded-xl p-3 text-xs leading-relaxed ${
                m.sender === 'student'
                  ? 'bg-indigo-600 text-white rounded-br-none'
                  : 'bg-midnight-900 border border-indigo-900/60 text-pearl-200 rounded-bl-none shadow-sm'
              }`}
            >
              {m.text}

              {m.suggestedAction && (
                <div className="mt-2 pt-2 border-t border-indigo-800/40 text-[11px] text-amber-300 flex items-start gap-1.5">
                  <Lightbulb className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-400" />
                  <span>
                    <strong>Next Action:</strong> {m.suggestedAction}
                  </span>
                </div>
              )}
            </div>
            <span className="text-[9px] text-pearl-500 mt-1 px-1">
              {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-midnight-900 border border-indigo-900/60 max-w-[85%] text-xs text-indigo-300 animate-pulse">
            <Sparkles className="w-3.5 h-3.5 animate-spin" />
            <span>AI Co-Pilot is analyzing your architecture...</span>
          </div>
        )}
      </div>

      {/* Quick Prompts */}
      <div className="p-2.5 border-t border-indigo-950 bg-midnight-900/60 space-y-1.5">
        <span className="text-[10px] font-semibold text-pearl-400 uppercase tracking-wider block">
          Quick Mentorship Prompts:
        </span>
        <div className="flex flex-col gap-1">
          {quickPrompts.map((qp, idx) => (
            <button
              key={idx}
              type="button"
              disabled={isLoading}
              onClick={() => handleSend(qp)}
              className="text-left text-[11px] px-2.5 py-1.5 rounded-lg bg-indigo-950/60 hover:bg-indigo-900/80 border border-indigo-900/40 text-pearl-300 hover:text-white transition-colors truncate"
            >
              💡 {qp}
            </button>
          ))}
        </div>
      </div>

      {/* Input box */}
      <div className="p-3 bg-midnight-900 border-t border-indigo-900/60">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            disabled={isLoading}
            placeholder="Ask mentor for advice or guidance..."
            className="flex-1 bg-midnight-950 border border-indigo-900/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder-pearl-500"
          />
          <button
            type="submit"
            disabled={isLoading || !inputPrompt.trim()}
            className="p-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
};
