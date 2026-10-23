import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { CheckCircle2, Clock, Sparkles, Home, ArrowRight } from 'lucide-react';

export const StudentExamSubmitted: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    // Fire festive confetti animation
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
    });

    const stored = sessionStorage.getItem('evaltech_submission_result');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setResult(parsed.result);
      } catch {}
    }
  }, []);

  return (
    <div className="min-h-screen bg-pearl-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Card className="shadow-2xl border-pearl-200 overflow-hidden text-center">
          {/* Header banner */}
          <div className="bg-gradient-to-r from-emerald-600 to-indigo-brand py-8 text-white px-6">
            <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center mx-auto mb-3 shadow-inner">
              <CheckCircle2 className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-xl font-extrabold tracking-tight">Examination Submitted!</h2>
            <p className="text-xs text-white/80 mt-1">
              Your responses have been successfully recorded and encrypted.
            </p>
          </div>

          <CardContent className="pt-6 pb-8 space-y-6">
            {/* If Results were released immediately */}
            {result ? (
              <div className="space-y-4">
                <span className="text-[11px] font-bold uppercase tracking-wider text-midnight-600">
                  Instant Automated Result
                </span>
                <div className="p-4 rounded-2xl bg-pearl-50 border border-pearl-200">
                  <div className="text-3xl font-extrabold text-midnight-950">
                    {result.totalScore} / {result.maxScore}
                  </div>
                  <div className="text-sm font-bold text-indigo-brand mt-0.5">
                    {result.percentage}% Score
                  </div>
                  <div className="mt-3">
                    <Badge variant={result.isPassed ? 'success' : 'danger'}>
                      {result.isPassed ? 'PASSED' : 'NOT PASSED'}
                    </Badge>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-pearl-50 border border-pearl-200/80 text-xs text-midnight-700 space-y-1">
                <span className="font-bold text-midnight-900 block">Pending Instructor Review</span>
                <p className="leading-relaxed">
                  Your instructor has configured this examination for manual result release. You will receive an email notification when scores are made public.
                </p>
              </div>
            )}

            <div className="flex flex-col gap-2.5 pt-2">
              <Link to="/">
                <Button variant="outline" className="w-full" leftIcon={<Home className="w-4 h-4" />}>
                  Return to Home
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
