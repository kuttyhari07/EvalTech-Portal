import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ShieldAlert,
  Volume2,
  UserX,
  Users,
  EyeOff,
  ExternalLink,
  CheckCircle,
  Clock,
} from 'lucide-react';
import { MalpracticeViolation } from '../../hooks/useAIProctor';
import { Button } from '../ui/Button';

interface MalpracticeModalProps {
  violation: MalpracticeViolation | null;
  warningCount: number;
  maxStrikes: number;
  isTerminated: boolean;
  onDismiss: () => void;
}

export const MalpracticeModal: React.FC<MalpracticeModalProps> = ({
  violation,
  warningCount,
  maxStrikes,
  isTerminated,
  onDismiss,
}) => {
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    if (isTerminated) {
      setCountdown(3);
      const timer = setInterval(() => {
        setCountdown((c) => {
          if (c <= 1) {
            clearInterval(timer);
            return 0;
          }
          return c - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [isTerminated]);

  if (!violation) return null;

  const strikeNumber = violation.strikeNumber || warningCount;
  const isFinalStrike = strikeNumber >= maxStrikes || isTerminated;

  // Icon selector based on violation type
  const getViolationIcon = () => {
    switch (violation.type) {
      case 'voice':
        return <Volume2 className="w-8 h-8 text-rose-500" />;
      case 'multiple_faces':
        return <Users className="w-8 h-8 text-rose-500" />;
      case 'no_face':
        return <UserX className="w-8 h-8 text-rose-500" />;
      case 'looking_away':
        return <EyeOff className="w-8 h-8 text-amber-500" />;
      case 'tab_switch':
      case 'fullscreen_exit':
        return <ExternalLink className="w-8 h-8 text-rose-500" />;
      default:
        return <ShieldAlert className="w-8 h-8 text-rose-500" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-midnight-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className={`w-full max-w-lg rounded-2xl bg-midnight-900 border-2 shadow-2xl overflow-hidden transition-all text-white ${
          isFinalStrike
            ? 'border-rose-600 shadow-rose-600/30 ring-4 ring-rose-600/20'
            : strikeNumber === 2
            ? 'border-amber-500 shadow-amber-500/30 ring-4 ring-amber-500/20'
            : 'border-amber-400 shadow-amber-400/20'
        }`}
      >
        {/* Header Alert Strip */}
        <div
          className={`py-4 px-6 flex items-center justify-between ${
            isFinalStrike
              ? 'bg-gradient-to-r from-rose-700 to-rose-900 text-white'
              : strikeNumber === 2
              ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-midnight-950'
              : 'bg-gradient-to-r from-amber-500 to-amber-600 text-midnight-950'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-6 h-6 shrink-0 animate-bounce" />
            <div>
              <h3 className="text-base font-extrabold tracking-tight uppercase">
                {isFinalStrike
                  ? '🛑 Examination Terminated'
                  : strikeNumber === 2
                  ? '⚠️ High Malpractice Warning'
                  : '⚠️ Malpractice Warning'}
              </h3>
              <p className="text-xs font-semibold opacity-90">
                Strike {strikeNumber} of {maxStrikes} Recorded
              </p>
            </div>
          </div>

          {/* Visual Strike Dots */}
          <div className="flex items-center gap-1.5 bg-black/30 px-3 py-1.5 rounded-full">
            {Array.from({ length: maxStrikes }).map((_, i) => (
              <span
                key={i}
                className={`w-3 h-3 rounded-full ${
                  i < strikeNumber ? 'bg-rose-500 animate-pulse' : 'bg-white/20'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          <div className="flex items-start gap-4 p-4 rounded-xl bg-midnight-950/80 border border-white/10">
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 shrink-0">
              {getViolationIcon()}
            </div>
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-pearl-400 block">
                Detected Malpractice Incident
              </span>
              <h4 className="text-sm font-extrabold text-white">{violation.title}</h4>
              <p className="text-xs text-pearl-300 leading-relaxed">{violation.reason}</p>
              <span className="text-[10px] text-pearl-400 font-mono block pt-1">
                Timestamp: {new Date(violation.timestamp).toLocaleTimeString()}
              </span>
            </div>
          </div>

          {/* Warning Impact Description */}
          {isFinalStrike ? (
            <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-200 text-xs space-y-2">
              <span className="font-extrabold block text-rose-300 uppercase tracking-wide">
                Maximum 3 Strikes Reached
              </span>
              <p className="leading-relaxed">
                You have accumulated {maxStrikes} malpractice strikes. As per academic integrity
                policy, your examination session is being automatically submitted now.
              </p>
              <div className="pt-2 flex items-center gap-2 font-mono font-bold text-rose-400 text-sm">
                <Clock className="w-4 h-4 animate-spin" />
                <span>Auto-submitting in {countdown} seconds...</span>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs space-y-1.5">
              <span className="font-bold block text-amber-300">
                {maxStrikes - strikeNumber} Warning{maxStrikes - strikeNumber === 1 ? '' : 's'} Remaining
              </span>
              <p className="leading-relaxed text-[11px]">
                {strikeNumber === 2
                  ? 'CRITICAL WARNING: This is your final chance. If another violation (talking, looking away, no face, or tab switch) occurs, your exam will be SUBMITTED AUTOMATICALLY without further warning.'
                  : 'Maintain complete silence, stay centered facing the camera, and do not navigate away from the examination window.'}
              </p>
            </div>
          )}

          {/* Footer Actions */}
          {!isFinalStrike && (
            <div className="pt-2 flex justify-end">
              <Button
                variant={strikeNumber === 2 ? 'danger' : 'primary'}
                className="w-full sm:w-auto font-bold py-2.5 px-6 shadow-lg"
                onClick={onDismiss}
                leftIcon={<CheckCircle className="w-4 h-4" />}
              >
                I Understand & Resume Exam
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
