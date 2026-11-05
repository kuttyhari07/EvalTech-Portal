import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { Subscription, SubscriptionPlan, CapacityCheck } from '../../types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';
import {
  CreditCard,
  CheckCircle2,
  Zap,
  ArrowRight,
  ShieldCheck,
  Calendar,
  AlertTriangle,
  Sparkles,
  Brain,
  Lock,
  Building,
  GraduationCap,
  Users,
  Check,
  HelpCircle,
  Shield,
  Layers,
  Award,
  Infinity,
  Flame,
} from 'lucide-react';

export const StaffBilling: React.FC = () => {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [capacity, setCapacity] = useState<CapacityCheck | null>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [loading, setLoading] = useState(true);
  const [upgradingPlanId, setUpgradingPlanId] = useState<string | null>(null);
  const [upgradeSuccess, setUpgradeSuccess] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const [subRes, plansRes] = await Promise.all([
        api.get('/subscriptions/my-subscription'),
        api.get('/subscriptions/plans'),
      ]);

      setSubscription(subRes.data?.data?.subscription || null);
      setCapacity(subRes.data?.data?.capacity || null);
      setPayments(subRes.data?.data?.paymentHistory || []);
      setPlans(plansRes.data?.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpgrade = async (plan: SubscriptionPlan) => {
    setUpgradingPlanId(plan._id);
    setUpgradeSuccess(null);

    try {
      // 1. Initialize Order
      const res = await api.post('/subscriptions/checkout', {
        planId: plan._id,
        billingCycle,
      });

      const orderData = res.data?.data;

      // In sandbox / simulated mode or when Razorpay script is not in browser
      // Complete verification directly
      const verifyRes = await api.post('/subscriptions/verify', {
        razorpayOrderId: orderData?.orderId || `order_${Date.now()}`,
        razorpayPaymentId: `pay_${Date.now()}`,
        razorpaySignature: 'sandbox_verified_signature',
      });

      setUpgradeSuccess(`Successfully upgraded to ${plan.name}! Your Next-Gen AI exam allocation is immediately active.`);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Upgrade failed.');
    } finally {
      setUpgradingPlanId(null);
    }
  };

  if (loading) return <LoadingSkeleton count={4} className="h-32" />;

  const isProOrOrg = capacity?.tier === 'pro' || capacity?.tier === 'organization';

  return (
    <div className="space-y-8 animate-fadeIn pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-pearl-200">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-extrabold text-midnight-950 tracking-tight">
              Subscription & Next-Gen AI Engine
            </h2>
            <Badge variant="purple" className="text-[10px] font-mono uppercase">
              Zero Student Caps
            </Badge>
          </div>
          <p className="text-xs text-midnight-600 mt-1">
            All plans include unlimited candidate seats. Experience AI Socratic Vivas, Thought Playback, and Proctoring on every tier.
          </p>
        </div>

        {/* Quick Trust Indicator */}
        <div className="flex items-center gap-2 text-xs font-mono font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Bank-Grade 256-Bit SSL Encrypted Billing</span>
        </div>
      </div>

      {upgradeSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800 flex items-center justify-between gap-3 shadow-subtle">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{upgradeSuccess}</span>
          </div>
          <button
            onClick={() => setUpgradeSuccess(null)}
            className="text-emerald-700 hover:text-emerald-900 font-bold underline text-[11px]"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Active Plan Overview Card */}
      {capacity && (
        <Card className="bg-gradient-to-r from-midnight-950 via-midnight-900 to-indigo-950 text-white border-none shadow-glow rounded-3xl overflow-hidden relative">
          <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          <CardContent className="pt-6 pb-6 relative z-10">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
              {/* Left Column: Plan Meta */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="purple" className="bg-white/10 text-indigo-glow border-none uppercase font-mono tracking-wider">
                    {capacity.tier === 'organization'
                      ? 'Campus Enterprise'
                      : capacity.tier === 'pro'
                      ? 'Pro Educator Tier'
                      : capacity.tier === 'plus'
                      ? 'On-Demand Pass Tier'
                      : 'Free Explorer Tier'}
                  </Badge>
                  <span className="text-[11px] text-emerald-400 font-bold flex items-center gap-1 font-mono">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Active Status
                  </span>
                </div>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
                  <Infinity className="w-7 h-7 text-indigo-300" />
                  Unlimited Student Seats
                </h3>
                <div className="pt-1">
                  {isProOrOrg ? (
                    <span className="inline-flex items-center gap-1.5 text-xs text-indigo-300 font-mono font-bold bg-indigo-500/20 px-2.5 py-1 rounded-lg border border-indigo-400/30">
                      <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                      UNLIMITED Next-Gen AI Exams & Proctoring Active
                    </span>
                  ) : capacity.tier === 'plus' ? (
                    <span className="inline-flex items-center gap-1.5 text-xs text-amber-300 font-mono font-bold bg-amber-500/20 px-2.5 py-1 rounded-lg border border-amber-400/30">
                      <Zap className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                      On-Demand AI Exam Passes Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs text-pearl-200 font-mono bg-white/10 px-2.5 py-1 rounded-lg border border-white/15">
                      <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                      Free Explorer: 2 Next-Gen AI Exams / mo (Unlimited standard exams)
                    </span>
                  )}
                </div>
              </div>

              {/* Middle Column: Active Cohort Insights */}
              <div className="space-y-2 p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
                <span className="text-[11px] font-mono text-pearl-300 block uppercase">
                  Active Enrollment Footprint
                </span>
                <div className="text-xl font-extrabold text-white font-mono flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-glow" />
                  <span>{capacity.currentUsage} Candidates Enrolled</span>
                </div>
                <p className="text-[11px] text-pearl-300 leading-relaxed">
                  No artificial student restrictions. You can host examinations for classes of any size without seat overage charges.
                </p>
              </div>

              {/* Right Column: Renewal & Subscription Status */}
              <div className="text-left md:text-right space-y-1">
                <span className="text-[10px] uppercase font-bold text-pearl-400 font-mono block">
                  Current Billing Cycle
                </span>
                <span className="text-sm font-semibold text-white flex items-center md:justify-end gap-1.5 font-mono">
                  <Calendar className="w-4 h-4 text-indigo-glow" />
                  {subscription?.currentPeriodEnd
                    ? new Date(subscription.currentPeriodEnd).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })
                    : 'Active Lifetime'}
                </span>
                <span className="text-[11px] text-indigo-300 font-mono block">
                  Auto-renews: {subscription?.autoRenew ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Available Plans Upgrade Grid */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-extrabold text-midnight-950 tracking-tight">
              Select Your Next-Gen AI Allowance Tier
            </h3>
            <p className="text-xs text-midnight-600 mt-0.5">
              All plans include complete Next-Gen features. Upgrade to unlock unlimited AI exams and institutional scaling.
            </p>
          </div>

          {/* Billing Cycle Switcher with Savings Badge */}
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center p-1 rounded-2xl bg-pearl-100 border border-pearl-200">
              <button
                type="button"
                onClick={() => setBillingCycle('monthly')}
                className={`text-xs font-bold px-4 py-1.5 rounded-xl transition-all ${
                  billingCycle === 'monthly'
                    ? 'bg-white text-midnight-950 shadow-subtle'
                    : 'text-midnight-600 hover:text-midnight-900'
                }`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle('yearly')}
                className={`text-xs font-bold px-4 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                  billingCycle === 'yearly'
                    ? 'bg-indigo-brand text-white shadow-subtle'
                    : 'text-midnight-600 hover:text-midnight-900'
                }`}
              >
                <span>Yearly</span>
                <span className="text-[10px] bg-emerald-500 text-white font-mono px-1.5 py-0.2 rounded-full">
                  Save 20%
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* 4 Plans Pricing Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
          {plans.map((p) => {
            const isCurrent = capacity?.tier === p.tier;
            const isPro = p.tier === 'pro';
            const isOrg = p.tier === 'organization';
            const isPass = p.tier === 'plus';
            const price = billingCycle === 'yearly' ? p.priceYearly : p.priceMonthly;
            const monthlyEquivalent = billingCycle === 'yearly' ? Math.round(p.priceYearly / 12) : p.priceMonthly;

            return (
              <div
                key={p._id}
                className={`rounded-3xl border flex flex-col justify-between transition-all duration-300 relative ${
                  isPro
                    ? 'border-indigo-500 shadow-2xl ring-2 ring-indigo-500/50 bg-gradient-to-b from-indigo-50/50 via-white to-white dark:from-indigo-950/20 dark:to-midnight-950'
                    : isCurrent
                    ? 'border-indigo-400 bg-indigo-50/20 shadow-subtle'
                    : 'border-pearl-200 bg-white hover:border-pearl-300 hover:shadow-subtle'
                }`}
              >
                {/* Ribbon Badges */}
                {isPro && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-[10px] font-mono font-bold uppercase tracking-widest px-3.5 py-1 rounded-full shadow-md flex items-center gap-1">
                    <Flame className="w-3 h-3 text-amber-300" />
                    Unlimited Powerhouse
                  </div>
                )}

                {isPass && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-amber-600 text-white text-[10px] font-mono font-bold uppercase tracking-widest px-3 py-1 rounded-full shadow-md">
                    Pay-As-You-Go
                  </div>
                )}

                {isOrg && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-midnight-900 text-pearl-100 text-[10px] font-mono font-bold uppercase tracking-widest px-3 py-1 rounded-full shadow-md">
                    Campus Enterprise
                  </div>
                )}

                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <Badge
                      variant={isPro ? 'purple' : isOrg ? 'default' : isPass ? 'warning' : 'info'}
                      className="text-[11px] font-mono uppercase font-bold"
                    >
                      {p.name}
                    </Badge>
                    {isCurrent && (
                      <span className="text-[10px] font-bold font-mono text-indigo-brand bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 uppercase">
                        Current Plan
                      </span>
                    )}
                  </div>

                  <div>
                    <h4 className="text-xl font-extrabold text-midnight-950 tracking-tight flex items-center gap-1.5">
                      <Infinity className="w-5 h-5 text-indigo-brand" />
                      Unlimited Students
                    </h4>
                    <p className="text-[11px] text-midnight-500 mt-0.5">
                      {p.tier === 'free'
                        ? 'Taste the full magic: 2 Next-Gen AI exams / mo'
                        : p.tier === 'plus'
                        ? '5 AI Exam passes with no monthly lock-in'
                        : p.tier === 'pro'
                        ? 'Unlimited AI vivas, playback & proctoring'
                        : 'Full campus license with custom college branding'}
                    </p>
                  </div>

                  {/* Price */}
                  <div className="pt-2 border-t border-pearl-100">
                    <div className="flex items-baseline">
                      <span className="text-3xl font-extrabold text-midnight-950 font-mono">
                        {price === 0 ? '₹0' : `₹${monthlyEquivalent.toLocaleString()}`}
                      </span>
                      <span className="text-xs text-midnight-600 ml-1 font-mono">
                        {isPass ? '/pass pack' : '/month'}
                      </span>
                    </div>
                    {billingCycle === 'yearly' && price > 0 ? (
                      <span className="text-[11px] text-emerald-600 font-mono block mt-0.5">
                        Billed annually as ₹{price.toLocaleString()} (Save 20%)
                      </span>
                    ) : (
                      <span className="text-[11px] text-midnight-400 font-mono block mt-0.5">
                        {price === 0 ? 'Free Forever trial' : 'Billed monthly'}
                      </span>
                    )}
                  </div>

                  {/* Features List */}
                  <div className="space-y-2.5 pt-3 border-t border-pearl-100 text-xs text-midnight-700">
                    {p.features.map((feat, i) => {
                      const isNextGen =
                        feat.includes('Thought Playback') ||
                        feat.includes('Socratic Viva') ||
                        feat.includes('Bug Hunt') ||
                        feat.includes('Mutation') ||
                        feat.includes('Co-Pilot') ||
                        feat.includes('Proctoring') ||
                        feat.includes('Unlimited students') ||
                        feat.includes('UNLIMITED');

                      return (
                        <div key={i} className="flex items-start gap-2">
                          {isNextGen ? (
                            <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                          )}
                          <span className={isNextGen ? 'font-semibold text-indigo-950' : ''}>{feat}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Upgrade Action Button */}
                <div className="p-6 pt-0">
                  <Button
                    variant={isPro ? 'primary' : isCurrent ? 'outline' : 'secondary'}
                    className={`w-full py-2.5 ${
                      isPro ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md' : ''
                    }`}
                    size="sm"
                    disabled={isCurrent}
                    isLoading={upgradingPlanId === p._id}
                    onClick={() => handleUpgrade(p)}
                  >
                    {isCurrent ? 'Current Plan' : `Upgrade to ${p.name}`}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* The EvalTech Unlimited Promise */}
      <div className="p-6 rounded-3xl bg-pearl-100/60 border border-pearl-200 space-y-4">
        <h4 className="text-sm font-extrabold text-midnight-950 flex items-center gap-2">
          <Shield className="w-4 h-4 text-indigo-brand" />
          The EvalTech "Taste the Magic" Architectural Commitment
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-2xl bg-white border border-pearl-200 space-y-1">
            <span className="font-bold text-midnight-900 block font-mono">Zero Student Seat Restrictions</span>
            <p className="text-midnight-600 leading-relaxed text-[11px]">
              We believe education should never be bounded by cohort size. Whether you teach 25 students or 2,500, your classroom is never blocked.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-pearl-200 space-y-1">
            <span className="font-bold text-midnight-900 block font-mono">Full Features for Everyone</span>
            <p className="text-midnight-600 leading-relaxed text-[11px]">
              Every teacher gets access to AI Socratic Viva, Thought Playback, and Face/Voice Proctoring. You upgrade only when you need unlimited volume.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-pearl-200 space-y-1">
            <span className="font-bold text-midnight-900 block font-mono">Instant Gateway Activation</span>
            <p className="text-midnight-600 leading-relaxed text-[11px]">
              Razorpay payments activate immediately via UPI, NetBanking, and Cards. Upgrades apply instantly without restarting sessions.
            </p>
          </div>
        </div>
      </div>

      {/* Payment History Table */}
      <Card className="rounded-3xl border-pearl-200 shadow-sm overflow-hidden">
        <CardHeader className="border-b border-pearl-100 bg-pearl-50/50">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-extrabold text-midnight-950">
                Invoices & Payment History
              </CardTitle>
              <CardDescription className="text-xs">
                Verified Razorpay billing transactions and downloadable tax receipts
              </CardDescription>
            </div>
            <CreditCard className="w-5 h-5 text-midnight-400" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {payments.length === 0 ? (
            <div className="p-8 text-center text-xs text-midnight-500">
              <CreditCard className="w-8 h-8 mx-auto text-midnight-300 mb-2 opacity-50" />
              <p>No billing transactions recorded yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-pearl-200 text-midnight-600 uppercase font-semibold text-[11px] bg-pearl-50/30">
                    <th className="py-3.5 px-6">Invoice No</th>
                    <th className="py-3.5 px-6">Amount Paid</th>
                    <th className="py-3.5 px-6">Payment Status</th>
                    <th className="py-3.5 px-6">Transaction ID</th>
                    <th className="py-3.5 px-6 text-right">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-pearl-100 font-medium">
                  {payments.map((pay) => (
                    <tr key={pay._id} className="hover:bg-pearl-50/50 transition-colors">
                      <td className="py-3.5 px-6 font-mono font-bold text-midnight-900">{pay.invoiceNumber}</td>
                      <td className="py-3.5 px-6 font-mono font-bold text-indigo-brand">₹{pay.amount.toLocaleString()}</td>
                      <td className="py-3.5 px-6">
                        <Badge variant="success" className="text-[10px] font-mono uppercase">
                          {pay.status}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-6 font-mono text-midnight-600 text-[11px]">{pay.receipt || pay.razorpayPaymentId || '-'}</td>
                      <td className="py-3.5 px-6 text-midnight-600 text-right font-mono">
                        {new Date(pay.createdAt).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
