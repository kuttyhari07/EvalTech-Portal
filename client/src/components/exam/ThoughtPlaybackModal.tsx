import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Play, Pause, RotateCcw, Brain, ShieldAlert, CheckCircle2, Clock, Zap, Loader2 } from 'lucide-react';

interface ThoughtPlaybackModalProps {
  isOpen: boolean;
  onClose: () => void;
  attemptId: string;
  studentName?: string;
}

export const ThoughtPlaybackModal: React.FC<ThoughtPlaybackModalProps> = ({
  isOpen,
  onClose,
  attemptId,
  studentName,
}) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (!isOpen || !attemptId) return;

    setLoading(true);
    setCurrentIdx(0);
    setIsPlaying(false);

    api
      .get(`/ai-advanced/attempts/${attemptId}/thought-playback`)
      .then((res) => {
        setData(res.data?.data);
      })
      .catch((err) => {
        console.error('Failed to load thought playback:', err);
      })
      .finally(() => setLoading(false));
  }, [isOpen, attemptId]);

  // Playback timer
  useEffect(() => {
    if (!isPlaying || !data?.snapshots?.length) return;

    const timer = setInterval(() => {
      setCurrentIdx((prev) => {
        if (prev + 1 >= data.snapshots.length) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 800);

    return () => clearInterval(timer);
  }, [isPlaying, data]);

  const snapshots = data?.snapshots || [];
  const metrics = data?.metrics || {};
  const currentSnapshot = snapshots[currentIdx];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      size="xl"
    >
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-pearl-200 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-700 flex items-center justify-center border border-violet-200">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-midnight-950">
                Thought Playback & Keystroke Biometrics
              </h3>
              <p className="text-xs text-midnight-600">
                Candidate: <strong>{studentName || data?.studentInfo?.name || 'Student'}</strong>
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>

        {loading ? (
          <div className="py-16 text-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-brand mx-auto" />
            <p className="text-xs text-midnight-600">Reconstructing keystroke timeline & telemetry...</p>
          </div>
        ) : snapshots.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <Clock className="w-8 h-8 text-pearl-400 mx-auto" />
            <h4 className="text-sm font-bold text-midnight-800">No Keystroke Telemetry Recorded</h4>
            <p className="text-xs text-midnight-500 max-w-sm mx-auto">
              This exam was completed without Thought Playback enabled, or no programming keystrokes were captured.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Biometric Telemetry Score Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-pearl-100/70 border border-pearl-200">
                <span className="text-[10px] uppercase font-bold text-midnight-500">Authenticity Score</span>
                <p className="text-lg font-extrabold text-indigo-brand mt-0.5">
                  {metrics.typingScore || 100}%
                </p>
              </div>

              <div className="p-3 rounded-xl bg-pearl-100/70 border border-pearl-200">
                <span className="text-[10px] uppercase font-bold text-midnight-500">Typing Cadence</span>
                <p className="text-lg font-extrabold text-midnight-900 mt-0.5">
                  {metrics.avgWpm || 45} <span className="text-xs font-normal">WPM</span>
                </p>
              </div>

              <div className="p-3 rounded-xl bg-pearl-100/70 border border-pearl-200">
                <span className="text-[10px] uppercase font-bold text-midnight-500">Copy-Paste Bursts</span>
                <p className={`text-lg font-extrabold mt-0.5 ${metrics.pasteCount > 2 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {metrics.pasteCount || 0}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-pearl-100/70 border border-pearl-200">
                <span className="text-[10px] uppercase font-bold text-midnight-500">AI Cadence Verdict</span>
                <p className="text-xs font-bold text-midnight-800 mt-1 truncate" title={metrics.verdict}>
                  {metrics.verdict || 'Natural typing rhythm'}
                </p>
              </div>
            </div>

            {/* Code Playback Viewport */}
            <div className="rounded-xl border border-midnight-800 bg-midnight-950 text-pearl-100 overflow-hidden font-mono text-xs">
              <div className="p-2.5 bg-midnight-900 border-b border-midnight-800 flex items-center justify-between">
                <div className="flex items-center gap-2 text-[11px] text-pearl-400">
                  <span>Frame: {currentIdx + 1} / {snapshots.length}</span>
                  <span>•</span>
                  <span>
                    Timestamp: {currentSnapshot?.timestamp ? new Date(currentSnapshot.timestamp).toLocaleTimeString() : '--:--'}
                  </span>
                </div>
                {currentSnapshot?.pasteDetected && (
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-rose-500/20 text-rose-300 border border-rose-500/40">
                    ⚠️ Paste Burst Detected
                  </span>
                )}
              </div>

              <div className="p-4 max-h-64 overflow-y-auto whitespace-pre leading-relaxed select-none">
                {currentSnapshot?.codeSnippet || '// [Code state at this snapshot timestamp]'}
              </div>
            </div>

            {/* Scrubber & Controls */}
            <div className="p-3 rounded-xl bg-pearl-100/80 border border-pearl-200 flex items-center gap-3">
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsPlaying(!isPlaying)}
                className="shrink-0"
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span className="ml-1.5">{isPlaying ? 'Pause' : 'Play Replay'}</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsPlaying(false);
                  setCurrentIdx(0);
                }}
                className="shrink-0"
                title="Restart from beginning"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </Button>

              {/* Range slider */}
              <input
                type="range"
                min={0}
                max={Math.max(0, snapshots.length - 1)}
                value={currentIdx}
                onChange={(e) => {
                  setIsPlaying(false);
                  setCurrentIdx(Number(e.target.value));
                }}
                className="w-full h-1.5 bg-pearl-300 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
