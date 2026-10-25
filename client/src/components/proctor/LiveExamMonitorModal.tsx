import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { LoadingSkeleton } from '../ui/LoadingSkeleton';
import {
  Radio,
  Users,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Send,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  XCircle,
  Megaphone,
} from 'lucide-react';

interface LiveExamMonitorModalProps {
  isOpen?: boolean;
  onClose: () => void;
  examId: string;
  examTitle?: string;
}

export const LiveExamMonitorModal: React.FC<LiveExamMonitorModalProps> = ({
  isOpen = true,
  onClose,
  examId,
  examTitle,
}) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [broadcasting, setBroadcasting] = useState(false);
  const [expandedAttemptId, setExpandedAttemptId] = useState<string | null>(null);
  const [terminatingId, setTerminatingId] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const fetchLiveStatus = async () => {
    if (!examId || !isOpen) return;
    try {
      const res = await api.get(`/exams/${examId}/live-monitoring`);
      setData(res.data?.data);
    } catch (err: any) {
      console.error('Failed to fetch live monitoring', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      fetchLiveStatus();
    }
  }, [isOpen, examId]);

  // Periodic polling every 6 seconds if autoRefresh is enabled
  useEffect(() => {
    if (!isOpen || !autoRefresh) return;
    const interval = setInterval(fetchLiveStatus, 6000);
    return () => clearInterval(interval);
  }, [isOpen, autoRefresh, examId]);

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastMsg.trim()) return;

    setBroadcasting(true);
    try {
      await api.post(`/exams/${examId}/live-broadcast`, {
        message: broadcastMsg.trim(),
      });
      setBroadcastMsg('');
      setFeedbackMsg('Broadcast dispatched to active candidates!');
      setTimeout(() => setFeedbackMsg(null), 3000);
      fetchLiveStatus();
    } catch (err: any) {
      alert(err.message || 'Failed to send broadcast');
    } finally {
      setBroadcasting(false);
    }
  };

  const handleForceTerminate = async (attemptId: string, studentName: string) => {
    const reason = window.prompt(
      `Are you sure you want to force-submit ${studentName}'s exam session? Enter reason (e.g. Repeated tab violations):`
    );
    if (reason === null) return;

    setTerminatingId(attemptId);
    try {
      await api.post(`/exams/${examId}/force-terminate/${attemptId}`, { reason });
      setFeedbackMsg(`Terminated and submitted session for ${studentName}.`);
      setTimeout(() => setFeedbackMsg(null), 3000);
      fetchLiveStatus();
    } catch (err: any) {
      alert(err.message || 'Failed to terminate session');
    } finally {
      setTerminatingId(null);
    }
  };

  const attempts: any[] = data?.attempts || [];
  const stats = data?.stats || {
    totalAttempts: 0,
    inProgressCount: 0,
    submittedCount: 0,
    flaggedViolationsCount: 0,
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Live Proctoring & Telemetry • ${data?.exam?.title || examTitle || 'Active Exam'}`}
      description="Real-time telemetry, active participant progress, violation alerts, and broadcast controls."
      size="xl"
    >
      <div className="space-y-5">
        {/* Top Control Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 rounded-xl bg-pearl-100 border border-pearl-200 text-xs">
          <div className="flex items-center gap-3">
            <span className="font-mono bg-white px-2 py-0.5 rounded border border-pearl-300 font-bold text-midnight-900">
              Code: {data?.exam?.examCode}
            </span>
            <span className="text-midnight-600 font-medium">
              Duration: {data?.exam?.durationMinutes} mins • {data?.exam?.totalQuestions} Questions
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                autoRefresh
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-white text-midnight-600 border border-pearl-300'
              }`}
            >
              <RefreshCw className={`w-3 h-3 ${autoRefresh ? 'animate-spin' : ''}`} />
              <span>{autoRefresh ? 'Live Auto-Sync (6s)' : 'Sync Paused'}</span>
            </button>
            <Button variant="outline" size="sm" onClick={fetchLiveStatus}>
              Sync Now
            </Button>
          </div>
        </div>

        {feedbackMsg && (
          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{feedbackMsg}</span>
          </div>
        )}

        {/* Live KPI Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl bg-white border border-pearl-200 text-center shadow-subtle">
            <span className="text-[10px] font-bold text-midnight-500 uppercase tracking-wider block">
              Total Examinees
            </span>
            <span className="text-2xl font-black text-midnight-950 mt-1 block">
              {stats.totalAttempts}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 text-center shadow-subtle">
            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider flex items-center justify-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              Live In-Exam
            </span>
            <span className="text-2xl font-black text-emerald-800 mt-1 block">
              {stats.inProgressCount}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-200 text-center shadow-subtle">
            <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block">
              Completed / Submitted
            </span>
            <span className="text-2xl font-black text-indigo-900 mt-1 block">
              {stats.submittedCount}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 text-center shadow-subtle">
            <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider flex items-center justify-center gap-1">
              <AlertTriangle className="w-3 h-3 text-amber-600" />
              Flagged Warnings
            </span>
            <span className="text-2xl font-black text-amber-800 mt-1 block">
              {stats.flaggedViolationsCount}
            </span>
          </div>
        </div>

        {/* Broadcast Announcement Bar */}
        <form onSubmit={handleBroadcast} className="p-3.5 rounded-xl bg-midnight-950 text-white space-y-2 shadow-subtle">
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-300">
            <Megaphone className="w-4 h-4 text-amber-400" />
            <span>Broadcast Live Proctor Announcement to All Candidates</span>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. 10 minutes remaining! Ensure all coding test cases are executed before final submission."
              value={broadcastMsg}
              onChange={(e) => setBroadcastMsg(e.target.value)}
              className="flex-1 rounded-lg bg-midnight-900 border border-midnight-800 px-3 py-1.5 text-xs text-pearl-100 placeholder:text-midnight-500 focus:outline-none focus:border-indigo-400"
            />
            <Button
              type="submit"
              variant="electric"
              size="sm"
              isLoading={broadcasting}
              leftIcon={<Send className="w-3.5 h-3.5" />}
            >
              Send Alert
            </Button>
          </div>
        </form>

        {/* Candidate Sessions List */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-midnight-900 px-1">
            <span>Candidate Sessions ({attempts.length})</span>
            <span className="text-[11px] text-midnight-500 font-normal">
              Showing real-time progress and violation telemetry
            </span>
          </div>

          {loading ? (
            <LoadingSkeleton count={3} className="h-16" />
          ) : attempts.length === 0 ? (
            <div className="p-8 text-center bg-pearl-50 rounded-xl border border-pearl-200 text-xs text-midnight-600">
              No students have started this examination yet. Once candidates open the link, their live telemetry will appear here.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[45vh] overflow-y-auto pr-1">
              {attempts.map((att: any) => {
                const isExpanded = expandedAttemptId === att.id;
                const isLive = att.status === 'in_progress';

                return (
                  <div
                    key={att.id}
                    className={`rounded-xl border transition-all ${
                      att.violationsCount > 0
                        ? 'border-amber-300 bg-amber-50/20'
                        : isLive
                        ? 'border-emerald-200 bg-white'
                        : 'border-pearl-200 bg-pearl-50/40 opacity-80'
                    }`}
                  >
                    <div className="p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                            isLive
                              ? 'bg-emerald-500 animate-pulse'
                              : att.status === 'submitted' || att.status === 'evaluated'
                              ? 'bg-indigo-500'
                              : 'bg-pearl-400'
                          }`}
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-midnight-950">
                              {att.student?.name}
                            </span>
                            {att.student?.rollNo && (
                              <span className="text-[10px] font-mono bg-pearl-200 px-1.5 py-0.5 rounded text-midnight-700">
                                {att.student.rollNo}
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-midnight-500">{att.student?.email}</span>
                        </div>
                      </div>

                      {/* Progress & Time */}
                      <div className="flex items-center gap-6 text-xs">
                        <div className="text-right">
                          <span className="text-[11px] font-bold text-midnight-800 block">
                            {att.answeredCount} / {att.totalQuestions} Answered
                          </span>
                          <div className="w-24 bg-pearl-200 rounded-full h-1.5 mt-1 overflow-hidden">
                            <div
                              className="bg-indigo-brand h-full rounded-full transition-all"
                              style={{ width: `${att.progressPercent}%` }}
                            />
                          </div>
                        </div>

                        {/* Violations Warning Badge */}
                        {att.violationsCount > 0 ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 border border-amber-300 text-amber-900 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                            {att.violationsCount} Violation{att.violationsCount === 1 ? '' : 's'}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3 text-emerald-600" /> Clean
                          </span>
                        )}

                        {/* Status / Actions */}
                        <div className="flex items-center gap-2">
                          {isLive && (
                            <Button
                              variant="danger"
                              size="sm"
                              isLoading={terminatingId === att.id}
                              onClick={() => handleForceTerminate(att.id, att.student?.name)}
                              className="text-[10px] py-1 px-2 h-auto"
                            >
                              Force Submit
                            </Button>
                          )}

                          <button
                            type="button"
                            onClick={() => setExpandedAttemptId(isExpanded ? null : att.id)}
                            className="p-1 text-midnight-500 hover:text-midnight-900 rounded"
                            title="Toggle Telemetry Details"
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Expanded Telemetry Details */}
                    {isExpanded && (
                      <div className="p-3 border-t border-pearl-200 bg-pearl-50 text-xs space-y-2 text-midnight-700">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                          <div>
                            <span className="font-semibold text-midnight-500 block">IP Address:</span>
                            <span className="font-mono text-midnight-900">{att.ipAddress || '127.0.0.1'}</span>
                          </div>
                          <div>
                            <span className="font-semibold text-midnight-500 block">Session Started:</span>
                            <span>{new Date(att.startedAt).toLocaleTimeString()}</span>
                          </div>
                          <div>
                            <span className="font-semibold text-midnight-500 block">Time Spent:</span>
                            <span>{Math.round(att.timeSpentSeconds / 60)} mins</span>
                          </div>
                          <div>
                            <span className="font-semibold text-midnight-500 block">Time Left:</span>
                            <span className="font-mono font-bold text-indigo-brand">
                              {Math.floor(att.timeRemainingSeconds / 60)}m {att.timeRemainingSeconds % 60}s
                            </span>
                          </div>
                        </div>

                        {att.recentViolations && att.recentViolations.length > 0 && (
                          <div className="pt-2 border-t border-pearl-200">
                            <span className="font-bold text-amber-900 text-[11px] block mb-1">
                              Integrity & Tab Switch Incidents:
                            </span>
                            <div className="space-y-1">
                              {att.recentViolations.map((v: any, vIdx: number) => (
                                <div
                                  key={vIdx}
                                  className="text-[10px] bg-white p-1.5 rounded border border-amber-200 text-amber-900 flex items-center justify-between"
                                >
                                  <span>⚠️ Event: <strong>{v.event}</strong> ({v.details || 'Window unfocused'})</span>
                                  <span className="text-midnight-500 font-mono">
                                    {new Date(v.timestamp).toLocaleTimeString()}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex justify-end pt-2 border-t border-pearl-200">
          <Button variant="outline" onClick={onClose}>
            Close Monitor
          </Button>
        </div>
      </div>
    </Modal>
  );
};
