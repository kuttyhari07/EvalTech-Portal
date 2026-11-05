import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Mic, MicOff, Volume2, Sparkles, CheckCircle2, AlertCircle, Loader2, Bot, Brain } from 'lucide-react';

interface SocraticVivaQuestion {
  id: string;
  question: string;
  focusArea: string;
}

interface SocraticVivaModalProps {
  isOpen: boolean;
  onComplete: () => void;
  attemptId: string;
  problemTitle: string;
  problemStatement: string;
  studentCode: string;
  language: string;
}

export const SocraticVivaModal: React.FC<SocraticVivaModalProps> = ({
  isOpen,
  onComplete,
  attemptId,
  problemTitle,
  problemStatement,
  studentCode,
  language,
}) => {
  const [questions, setQuestions] = useState<SocraticVivaQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const [studentAnswer, setStudentAnswer] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [vivaScore, setVivaScore] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [vivaCompleted, setVivaCompleted] = useState(false);

  // Speech Recognition setup (Voice Input)
  const [recognition, setRecognition] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const reco = new SpeechRecognition();
        reco.continuous = true;
        reco.interimResults = true;
        reco.lang = 'en-US';

        reco.onresult = (event: any) => {
          let transcript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
          }
          if (transcript) {
            setStudentAnswer((prev) => (prev ? `${prev} ${transcript}` : transcript));
          }
        };

        reco.onerror = () => setIsRecording(false);
        reco.onend = () => setIsRecording(false);
        setRecognition(reco);
      }
    }
  }, []);

  // Fetch Viva Questions on Open
  useEffect(() => {
    if (!isOpen) return;

    setLoadingQuestions(true);
    setVivaCompleted(false);
    setCurrentIdx(0);
    setStudentAnswer('');

    api
      .post('/ai-advanced/socratic-viva/generate', {
        problemTitle,
        problemStatement,
        studentCode,
        language,
      })
      .then((res) => {
        setQuestions(res.data?.data || []);
      })
      .catch((err) => {
        console.error('Failed to generate viva questions:', err);
        // Fallback question
        setQuestions([
          {
            id: 'viva_q1',
            question: `Explain your logic for "${problemTitle}" and what time & space complexity your implementation achieves.`,
            focusArea: 'architecture',
          },
        ]);
      })
      .finally(() => setLoadingQuestions(false));
  }, [isOpen, problemTitle, problemStatement, studentCode, language]);

  const toggleRecording = () => {
    if (!recognition) {
      alert('Speech-to-text is not supported by your browser. Please type your response below.');
      return;
    }

    if (isRecording) {
      recognition.stop();
      setIsRecording(false);
    } else {
      try {
        recognition.start();
        setIsRecording(true);
      } catch (err) {
        console.error('Mic start failed:', err);
      }
    }
  };

  const speakQuestion = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleNextOrSubmit = async () => {
    if (!studentAnswer.trim()) {
      alert('Please provide an oral or written explanation to defend your code before proceeding.');
      return;
    }

    const currentQ = questions[currentIdx];
    setEvaluating(true);

    try {
      const evalRes = await api.post('/ai-advanced/socratic-viva/evaluate', {
        question: currentQ.question,
        studentResponse: studentAnswer,
        originalCode: studentCode,
        attemptId,
      });

      const resData = evalRes.data?.data;
      setVivaScore(resData?.score || 80);
      setFeedback(resData?.feedback || 'Good defense of logic.');

      if (currentIdx + 1 < questions.length) {
        // Next question
        setCurrentIdx((prev) => prev + 1);
        setStudentAnswer('');
      } else {
        // All viva questions done
        setVivaCompleted(true);
      }
    } catch (err) {
      console.error('Evaluation failed:', err);
      setVivaCompleted(true);
    } finally {
      setEvaluating(false);
      if (isRecording && recognition) {
        recognition.stop();
        setIsRecording(false);
      }
    }
  };

  const currentQ = questions[currentIdx];

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {}} // Cannot dismiss until completed
      title=""
      size="lg"
    >
      <div className="p-2 sm:p-4 space-y-5">
        {/* Header with AI Examiner Identity */}
        <div className="flex items-center gap-3 bg-gradient-to-r from-indigo-950 via-midnight-900 to-indigo-900 p-4 rounded-xl text-white shadow-md">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center shrink-0">
            <Bot className="w-6 h-6 text-indigo-300 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white">AI Socratic Code Defense</h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/40">
                Phase 2
              </span>
            </div>
            <p className="text-xs text-indigo-200/80">
              Defend your submitted code logic orally or in writing to certify authenticity.
            </p>
          </div>
        </div>

        {loadingQuestions ? (
          <div className="py-12 text-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto" />
            <p className="text-xs font-semibold text-midnight-800">
              AI Examiner is reviewing your source code structure...
            </p>
            <p className="text-[11px] text-midnight-500">Formulating 2 personalized defense questions.</p>
          </div>
        ) : vivaCompleted ? (
          <div className="py-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h4 className="text-base font-bold text-midnight-950">Code Defense Verified!</h4>
              <p className="text-xs text-midnight-600 mt-1 max-w-md mx-auto">
                {feedback || 'Your conceptual understanding and algorithmic justification have been logged.'}
              </p>
            </div>
            {vivaScore !== null && (
              <div className="inline-block px-4 py-2 rounded-xl bg-pearl-100 border border-pearl-200">
                <span className="text-xs text-midnight-600">Conceptual Authenticity Score: </span>
                <span className="text-base font-extrabold text-indigo-brand">{vivaScore} / 100</span>
              </div>
            )}
            <div className="pt-2">
              <Button variant="primary" size="md" className="w-full sm:w-auto" onClick={onComplete}>
                Finalize & Submit Exam
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Step indicator */}
            <div className="flex items-center justify-between text-xs text-midnight-600 font-semibold border-b border-pearl-200 pb-2">
              <span>
                Question {currentIdx + 1} of {questions.length}
              </span>
              <span className="capitalize text-indigo-brand text-[11px] bg-indigo-50 px-2 py-0.5 rounded">
                Focus: {currentQ?.focusArea?.replace('_', ' ') || 'Architecture'}
              </span>
            </div>

            {/* AI Question Box */}
            <div className="p-4 rounded-xl bg-pearl-100/70 border border-pearl-200 relative">
              <p className="text-sm font-semibold text-midnight-950 leading-relaxed pr-8">
                "{currentQ?.question}"
              </p>
              <button
                type="button"
                onClick={() => speakQuestion(currentQ?.question)}
                className="absolute top-3 right-3 p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-100 transition-colors"
                title="Read question aloud"
              >
                <Volume2 className="w-4 h-4" />
              </button>
            </div>

            {/* Answer Input Area */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-midnight-800">
                  Your Explanation / Code Defense:
                </label>
                <button
                  type="button"
                  onClick={toggleRecording}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                    isRecording
                      ? 'bg-rose-500 text-white animate-pulse'
                      : 'bg-pearl-200 text-midnight-700 hover:bg-pearl-300'
                  }`}
                >
                  {isRecording ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                  <span>{isRecording ? 'Listening (Click to Stop)' : 'Speak Answer'}</span>
                </button>
              </div>

              <textarea
                value={studentAnswer}
                onChange={(e) => setStudentAnswer(e.target.value)}
                rows={4}
                placeholder="Explain the architectural logic of your solution in your own words (or use microphone to speak)..."
                className="w-full rounded-xl border border-pearl-300 p-3 text-xs text-midnight-950 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              />
              <p className="text-[11px] text-midnight-500">
                Tip: Speak or type clearly. Explain why your chosen approach works and how it handles inputs.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-2 border-t border-pearl-200">
              <Button
                variant="primary"
                size="md"
                onClick={handleNextOrSubmit}
                isLoading={evaluating}
                disabled={!studentAnswer.trim()}
              >
                {currentIdx + 1 < questions.length ? 'Next Defense Question →' : 'Complete Defense & Submit'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

