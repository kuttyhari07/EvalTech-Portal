import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../api/client';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import {
  ShieldCheck,
  CheckCircle2,
  Share2,
  Copy,
  Check,
  ExternalLink,
  ArrowLeft,
  Award,
  Zap,
  Terminal,
  Activity,
  AlertTriangle,
} from 'lucide-react';

export const VerifyCredential: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!token) return;
    const fetchCredential = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get(`/ai-advanced/credential/${encodeURIComponent(token)}`);
        setData(res.data?.data);
      } catch (err: any) {
        setError(err.message || 'Invalid or expired verification credential.');
      } finally {
        setLoading(false);
      }
    };
    fetchCredential();
  }, [token]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareLinkedIn = () => {
    const url = encodeURIComponent(window.location.href);
    const title = encodeURIComponent(
      `Officially Certified in ${data?.examTitle || 'Software Engineering'} on EvalTech!`
    );
    const summary = encodeURIComponent(
      `Verified credential achieved on EvalTech Next-Gen Assessment Platform with ${data?.percentage}% score. Token: ${token}`
    );
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${url}&title=${title}&summary=${summary}`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-12 px-4 sm:px-6 lg:px-8 selection:bg-indigo-500/30">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-2">
            <img
              src="/logo.png"
              alt="EvalTech"
              className="w-8 h-8 rounded-full object-cover ring-2 ring-indigo-500/40"
            />
            <span className="text-xl font-extrabold text-white tracking-tight">
              Eval<span className="text-indigo-400">Tech</span>
            </span>
          </Link>
          <Link
            to="/"
            className="text-xs font-semibold text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Return to Portal
          </Link>
        </div>

        {loading ? (
          <div className="p-12 text-center space-y-4 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur">
            <div className="w-12 h-12 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-slate-400 font-mono">Verifying cryptographic credential signature...</p>
          </div>
        ) : error ? (
          <Card className="bg-slate-900/80 border-rose-900/40 text-center p-8 space-y-4">
            <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto" />
            <h3 className="text-lg font-bold text-rose-300">Verification Failed</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">{error}</p>
            <Button variant="outline" onClick={() => window.location.reload()} size="sm">
              Try Again
            </Button>
          </Card>
        ) : (
          <div className="space-y-6 animate-fadeIn">
            {/* Certificate Hero Card */}
            <div className="relative rounded-3xl border border-indigo-500/30 bg-gradient-to-b from-indigo-950/40 via-slate-900 to-slate-950 p-6 sm:p-8 shadow-2xl overflow-hidden">
              <div className="absolute top-0 right-0 -mt-6 -mr-6 w-44 h-44 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 -mb-6 -ml-6 w-44 h-44 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

              {/* Status Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-6 border-b border-slate-800/80">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-emerald-400 block">
                      Authentic Credential Verified
                    </span>
                    <span className="text-xs text-slate-400 font-mono">EvalTech Trust Network</span>
                  </div>
                </div>

                <Badge variant={data.isPassed ? 'success' : 'warning'} className="text-xs px-3 py-1 font-mono uppercase">
                  {data.isPassed ? 'Verified Pass' : 'Completed'}
                </Badge>
              </div>

              {/* Recipient & Exam Meta */}
              <div className="py-6 space-y-4">
                <span className="text-xs font-mono uppercase tracking-wider text-indigo-400 font-semibold block">
                  Candidate Competency Certification
                </span>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  {data.issuedTo || 'Candidate'}
                </h1>
                <p className="text-xs text-slate-300 font-mono">
                  Roll ID: <span className="text-white font-bold">{data.studentRollNo || 'N/A'}</span> • Subject:{' '}
                  <span className="text-white font-bold">{data.subject || 'N/A'}</span>
                </p>

                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-1">
                  <span className="text-[11px] font-mono text-slate-400 uppercase">Assessment Title</span>
                  <div className="text-base font-bold text-white">{data.examTitle}</div>
                </div>

                {/* Score Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                  <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
                    <span className="text-[10px] font-mono uppercase text-slate-400 block">Score Achieved</span>
                    <div className="text-xl font-extrabold text-white mt-1">
                      {data.score} / {data.maxScore}
                    </div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
                    <span className="text-[10px] font-mono uppercase text-slate-400 block">Percentage</span>
                    <div className="text-xl font-extrabold text-indigo-400 mt-1">
                      {data.percentage}%
                    </div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-center col-span-2 sm:col-span-1">
                    <span className="text-[10px] font-mono uppercase text-slate-400 block">Evaluation Date</span>
                    <div className="text-xs font-semibold text-slate-200 mt-2">
                      {new Date(data.evaluatedAt).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Skill DNA Breakdown */}
              {data.skillDna && data.skillDna.length > 0 && (
                <div className="pt-6 border-t border-slate-800/80 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-indigo-300">
                    <Activity className="w-4 h-4 text-indigo-400" />
                    Verified Skill DNA & Competency Matrix
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {data.skillDna.map((cat: any, idx: number) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-200 truncate pr-2">{cat.category}</span>
                          <span className="font-mono font-bold text-indigo-400 shrink-0">{cat.score}%</span>
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                            style={{ width: `${cat.score}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono block">
                          Top {100 - (cat.percentile || 90)}% candidate percentile
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Cryptographic Signature Footer */}
              <div className="pt-6 mt-6 border-t border-slate-800/80 space-y-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 block">
                  Tamper-Proof Verification Hash
                </span>
                <div className="p-2.5 rounded-lg bg-black/50 border border-slate-800 font-mono text-[11px] text-slate-400 break-all select-all">
                  {data.verificationHash}
                </div>
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Button
                type="button"
                variant="primary"
                onClick={handleShareLinkedIn}
                leftIcon={<Share2 className="w-4 h-4" />}
                className="bg-[#0A66C2] hover:bg-[#084e96] text-white border-none flex-1 sm:flex-none"
              >
                Share on LinkedIn
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleCopyLink}
                leftIcon={copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                className="border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 flex-1 sm:flex-none"
              >
                {copied ? 'Link Copied!' : 'Copy Credential Link'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
