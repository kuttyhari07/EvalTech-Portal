import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Navbar } from '../../components/layout/Navbar';
import { Footer } from '../../components/layout/Footer';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
  CheckCircle2,
  Clock,
  Layers,
  BarChart3,
  Bot,
  Users,
  Building2,
  Lock,
  ChevronDown,
  HelpCircle,
  FileCheck,
  Send,
  Star,
  CreditCard,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [activePreviewTab, setActivePreviewTab] = useState<'exam' | 'analytics' | 'ai'>('exam');

  const faqs = [
    {
      q: 'How does student capacity work across multiple classes?',
      a: 'Student capacity counts distinct active students within your workspace or institution. If the same student is enrolled in three different subjects taught by you, they only consume a single capacity slot.',
    },
    {
      q: 'Can students take examinations without creating a permanent account?',
      a: 'Yes! Students can access authorized examinations instantly using their unique 6-character exam access code or a direct invite link, validating their credentials on the spot.',
    },
    {
      q: 'How does the AI-assisted question generation maintain quality?',
      a: 'AI question generation acts as a human-in-the-loop copilot. Every question generated must be reviewed, edited, and approved by the instructor before entering your question bank or exam paper.',
    },
    {
      q: 'Is Razorpay payment integration secure?',
      a: 'All subscription checkouts and renewals are cryptographically verified using SHA-256 HMAC backend verification and automated webhook reconciliation.',
    },
  ];

  return (
    <div className="min-h-screen bg-pearl-50 text-midnight-900 flex flex-col selection:bg-indigo-brand selection:text-white">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-28 lg:pt-28 lg:pb-36 bg-gradient-to-b from-white via-pearl-50 to-pearl-100/50">
        <div className="absolute inset-0 bg-[radial-gradient(#4F46E5_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.04]" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-200/80 text-indigo-brand text-xs font-semibold mb-6 shadow-subtle animate-fadeIn">
            <Sparkles className="w-4 h-4 text-indigo-light" />
            <span>AI-Assisted Examination SaaS Architecture</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-midnight-950 max-w-4xl mx-auto leading-[1.12]">
            Conduct & Evaluate Exams with <span className="bg-gradient-to-r from-indigo-brand via-electric-violet to-electric-blue bg-clip-text text-transparent">Flawless Precision</span>.
          </h1>

          <p className="mt-6 text-base sm:text-lg text-midnight-600 max-w-2xl mx-auto leading-relaxed">
            EvalTech empowers educators, schools, and enterprise institutions to build question banks, generate AI assessments, conduct secure live exams, and evaluate results instantly.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/register">
              <Button variant="electric" size="lg" rightIcon={<ArrowRight className="w-5 h-5" />}>
                Start Free Examination Workspace
              </Button>
            </Link>
            <Link to="/exam/join">
              <Button variant="outline" size="lg" leftIcon={<Clock className="w-4 h-4 text-indigo-brand" />}>
                Join Live Exam with Code
              </Button>
            </Link>
          </div>

          <div className="mt-12 flex items-center justify-center gap-8 text-xs text-midnight-600">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Free 10-Student Tier
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" /> No Credit Card Required
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Multi-Tenant Ready
            </span>
          </div>
        </div>

        {/* Interactive Dashboard / Examination Preview */}
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-16">
          <div className="rounded-2xl border border-pearl-300/80 bg-midnight-950 p-2 sm:p-3 shadow-2xl">
            {/* Window chrome header */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-midnight-800">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-500 inline-block" />
                <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />
                <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
                <span className="text-xs text-pearl-300 font-mono ml-2">evaltech.app/workspace/exams</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActivePreviewTab('exam')}
                  className={`text-xs px-2.5 py-1 rounded font-medium transition-colors ${
                    activePreviewTab === 'exam' ? 'bg-indigo-brand text-white' : 'text-pearl-300 hover:text-white'
                  }`}
                >
                  Student Exam View
                </button>
                <button
                  onClick={() => setActivePreviewTab('analytics')}
                  className={`text-xs px-2.5 py-1 rounded font-medium transition-colors ${
                    activePreviewTab === 'analytics' ? 'bg-indigo-brand text-white' : 'text-pearl-300 hover:text-white'
                  }`}
                >
                  Analytics & Results
                </button>
                <button
                  onClick={() => setActivePreviewTab('ai')}
                  className={`text-xs px-2.5 py-1 rounded font-medium transition-colors ${
                    activePreviewTab === 'ai' ? 'bg-indigo-brand text-white' : 'text-pearl-300 hover:text-white'
                  }`}
                >
                  AI Question Generator
                </button>
              </div>
            </div>

            {/* Preview Body */}
            <div className="p-6 bg-midnight-900 rounded-b-xl min-h-[360px] text-pearl-100 flex flex-col justify-center">
              {activePreviewTab === 'exam' && (
                <div className="max-w-2xl mx-auto w-full space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-midnight-800">
                    <div>
                      <span className="text-xs text-indigo-glow uppercase font-bold tracking-wider">Exam Live</span>
                      <h4 className="text-lg font-bold text-white">Advanced Software Architecture (EVT-842)</h4>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-pearl-300 block">Server Synced Timer</span>
                      <span className="text-sm font-mono font-bold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-600/40">
                        42:18 Remaining
                      </span>
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-midnight-800/80 border border-midnight-700 space-y-3">
                    <p className="text-xs text-indigo-glow font-bold">Question 3 of 20 (4 Marks)</p>
                    <p className="text-sm font-semibold text-white">
                      Which architectural design pattern guarantees that duplicate network retry requests do not cause state corruption?
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                      <div className="p-2.5 rounded-lg border border-indigo-brand/60 bg-indigo-brand/20 text-xs font-medium text-white flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-indigo-glow" /> Idempotent Consumer Pattern
                      </div>
                      <div className="p-2.5 rounded-lg border border-midnight-700 bg-midnight-900/60 text-xs font-medium text-pearl-300 flex items-center gap-2">
                        <span className="w-4 h-4 rounded-full border border-pearl-300/40 inline-block" /> Competing Consumers
                      </div>
                      <div className="p-2.5 rounded-lg border border-midnight-700 bg-midnight-900/60 text-xs font-medium text-pearl-300 flex items-center gap-2">
                        <span className="w-4 h-4 rounded-full border border-pearl-300/40 inline-block" /> Scatter-Gather Routing
                      </div>
                      <div className="p-2.5 rounded-lg border border-midnight-700 bg-midnight-900/60 text-xs font-medium text-pearl-300 flex items-center gap-2">
                        <span className="w-4 h-4 rounded-full border border-pearl-300/40 inline-block" /> Event Sourcing Append-Only
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-pearl-300/80">
                    <span className="flex items-center gap-1.5 text-emerald-400 font-mono">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" /> Auto-saved to server
                    </span>
                    <span className="font-mono text-pearl-300">Answered: 3/20</span>
                  </div>
                </div>
              )}

              {activePreviewTab === 'analytics' && (
                <div className="max-w-3xl mx-auto w-full space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 rounded-lg bg-midnight-800 border border-midnight-700 text-center">
                      <span className="text-[10px] text-pearl-300 uppercase">Submissions</span>
                      <p className="text-xl font-bold text-white mt-1">48 / 50</p>
                    </div>
                    <div className="p-3 rounded-lg bg-midnight-800 border border-midnight-700 text-center">
                      <span className="text-[10px] text-pearl-300 uppercase">Class Average</span>
                      <p className="text-xl font-bold text-indigo-glow mt-1">79.4%</p>
                    </div>
                    <div className="p-3 rounded-lg bg-midnight-800 border border-midnight-700 text-center">
                      <span className="text-[10px] text-pearl-300 uppercase">Highest Score</span>
                      <p className="text-xl font-bold text-emerald-400 mt-1">98 / 100</p>
                    </div>
                    <div className="p-3 rounded-lg bg-midnight-800 border border-midnight-700 text-center">
                      <span className="text-[10px] text-pearl-300 uppercase">Pass Rate</span>
                      <p className="text-xl font-bold text-emerald-400 mt-1">91.6%</p>
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-midnight-800 border border-midnight-700 flex items-center justify-between">
                    <div>
                      <h5 className="text-xs font-bold text-white">Automated Grading Status</h5>
                      <p className="text-[11px] text-pearl-300">All 48 submissions evaluated. Results ready for release.</p>
                    </div>
                    <Button variant="primary" size="sm">
                      Release Results to Students
                    </Button>
                  </div>
                </div>
              )}

              {activePreviewTab === 'ai' && (
                <div className="max-w-2xl mx-auto w-full space-y-4">
                  <div className="p-4 rounded-xl bg-midnight-800 border border-indigo-brand/40 space-y-3">
                    <div className="flex items-center gap-2 text-indigo-glow text-xs font-bold">
                      <Bot className="w-4 h-4" /> AI Question Generator Ready
                    </div>
                    <p className="text-xs text-pearl-200">
                      Prompt: "Generate 5 medium-difficulty multiple-choice questions on Docker container orchestration with explanations."
                    </p>
                    <div className="p-3 rounded-lg bg-midnight-900 border border-midnight-700 text-xs text-pearl-200 space-y-1">
                      <p className="font-semibold text-white">Q1: What is the primary role of a Docker Swarm manager node?</p>
                      <p className="text-[11px] text-emerald-400">✓ Correct: Maintaining cluster state and dispatching tasks to worker nodes</p>
                      <p className="text-[10px] text-pearl-300 italic">Validated against schema. Teacher approval required before publishing.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 bg-white border-y border-pearl-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-brand mb-2">
              Engineering Excellence
            </h2>
            <h3 className="text-3xl sm:text-4xl font-extrabold text-midnight-950 tracking-tight">
              Built for Modern Educational Workflows
            </h3>
            <p className="mt-3 text-sm text-midnight-600">
              Everything required to author, conduct, grade, and monitor examinations without administrative friction.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-brand flex items-center justify-center mb-2">
                  <Bot className="w-5 h-5" />
                </div>
                <CardTitle>AI Question Authoring</CardTitle>
                <CardDescription>
                  Generate curriculum-aligned questions across 7 question types with structured schema validation and mandatory teacher review.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2">
                  <Zap className="w-5 h-5" />
                </div>
                <CardTitle>Automated Evaluation</CardTitle>
                <CardDescription>
                  Objective questions evaluate instantaneously. Supports partial scoring, negative marking penalties, and subjective teacher feedback.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-10 h-10 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center mb-2">
                  <Users className="w-5 h-5" />
                </div>
                <CardTitle>Distinct Capacity Engine</CardTitle>
                <CardDescription>
                  Students belong to multiple classes without counting against your subscription limit twice. Concurrency-safe quota enforcement.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center mb-2">
                  <Building2 className="w-5 h-5" />
                </div>
                <CardTitle>Multi-Tenant Organizations</CardTitle>
                <CardDescription>
                  Schools manage multiple staff members with dedicated classes and shared capacity pools under institutional oversight.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center mb-2">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <CardTitle>Anti-Tamper & Autosave</CardTitle>
                <CardDescription>
                  Browser blur logs, tab-switch tracking, and sub-second incremental answer persistence prevent data loss and cheating.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-10 h-10 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center mb-2">
                  <CreditCard className="w-5 h-5" />
                </div>
                <CardTitle>Razorpay Subscription Billing</CardTitle>
                <CardDescription>
                  Monthly and yearly automated checkout with cryptographic webhook signature verification and instant tier activation.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 bg-pearl-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-brand mb-2">
              Transparent Pricing
            </h2>
            <h3 className="text-3xl sm:text-4xl font-extrabold text-midnight-950 tracking-tight">
              Scale Comfortably With Your Student Roster
            </h3>
            <p className="mt-3 text-sm text-midnight-600">
              Start free with up to 10 students. Upgrade whenever your classes grow.
            </p>

            {/* Monthly / Yearly Toggle */}
            <div className="mt-8 inline-flex items-center p-1 rounded-xl bg-pearl-200 border border-pearl-300">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`text-xs font-bold px-4 py-1.5 rounded-lg transition-all ${
                  billingCycle === 'monthly' ? 'bg-white text-midnight-900 shadow-subtle' : 'text-midnight-600'
                }`}
              >
                Monthly Billing
              </button>
              <button
                onClick={() => setBillingCycle('yearly')}
                className={`text-xs font-bold px-4 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  billingCycle === 'yearly' ? 'bg-white text-midnight-900 shadow-subtle' : 'text-midnight-600'
                }`}
              >
                Yearly Billing <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-bold">2 Months Free</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Free Plan */}
            <Card className="flex flex-col justify-between border-pearl-300">
              <CardHeader>
                <Badge variant="default" className="w-fit mb-2">Free Starter</Badge>
                <CardTitle>Free</CardTitle>
                <div className="mt-4 flex items-baseline text-midnight-900">
                  <span className="text-3xl font-extrabold">₹0</span>
                  <span className="text-xs text-midnight-600 ml-1">/ forever</span>
                </div>
                <CardDescription className="mt-2">Ideal for individual teachers trying out the platform.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-xs font-semibold text-midnight-800">Included:</div>
                <ul className="text-xs text-midnight-600 space-y-2">
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-indigo-brand" /> Up to 10 active students</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-indigo-brand" /> Unlimited exams & classes</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-indigo-brand" /> Instant automated grading</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-indigo-brand" /> Standard question types</li>
                </ul>
              </CardContent>
              <div className="p-6 pt-0">
                <Link to="/register" className="w-full block">
                  <Button variant="outline" className="w-full" size="sm">Get Started</Button>
                </Link>
              </div>
            </Card>

            {/* Plus Plan */}
            <Card className="flex flex-col justify-between border-indigo-brand/30 shadow-card">
              <CardHeader>
                <Badge variant="purple" className="w-fit mb-2">Popular for Tutors</Badge>
                <CardTitle>Plus</CardTitle>
                <div className="mt-4 flex items-baseline text-midnight-900">
                  <span className="text-3xl font-extrabold">
                    {billingCycle === 'yearly' ? '₹7,990' : '₹799'}
                  </span>
                  <span className="text-xs text-midnight-600 ml-1">/{billingCycle === 'yearly' ? 'yr' : 'mo'}</span>
                </div>
                <CardDescription className="mt-2">For individual instructors with multiple cohorts.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-xs font-semibold text-midnight-800">Everything in Free, plus:</div>
                <ul className="text-xs text-midnight-600 space-y-2">
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-indigo-brand" /> Up to 50 active students</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-indigo-brand" /> AI Question Generator (50/mo)</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-indigo-brand" /> CSV student roster import</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-indigo-brand" /> Result email automation</li>
                </ul>
              </CardContent>
              <div className="p-6 pt-0">
                <Link to="/register" className="w-full block">
                  <Button variant="primary" className="w-full" size="sm">Choose Plus</Button>
                </Link>
              </div>
            </Card>

            {/* Pro Plan */}
            <Card className="flex flex-col justify-between border-electric-violet/40 ring-2 ring-indigo-brand/20 shadow-card">
              <CardHeader>
                <Badge variant="purple" className="w-fit mb-2">Best Value</Badge>
                <CardTitle>Pro</CardTitle>
                <div className="mt-4 flex items-baseline text-midnight-900">
                  <span className="text-3xl font-extrabold">
                    {billingCycle === 'yearly' ? '₹14,990' : '₹1,499'}
                  </span>
                  <span className="text-xs text-midnight-600 ml-1">/{billingCycle === 'yearly' ? 'yr' : 'mo'}</span>
                </div>
                <CardDescription className="mt-2">For busy educators and professional coaching academies.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-xs font-semibold text-midnight-800">Everything in Plus, plus:</div>
                <ul className="text-xs text-midnight-600 space-y-2">
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-indigo-brand" /> Up to 100 active students</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-indigo-brand" /> AI Question Generator (250/mo)</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-indigo-brand" /> Full question bank with tags</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-indigo-brand" /> Anti-tamper logs & blur detection</li>
                </ul>
              </CardContent>
              <div className="p-6 pt-0">
                <Link to="/register" className="w-full block">
                  <Button variant="electric" className="w-full" size="sm">Choose Pro</Button>
                </Link>
              </div>
            </Card>

            {/* Organization Plan */}
            <Card className="flex flex-col justify-between border-pearl-300">
              <CardHeader>
                <Badge variant="default" className="w-fit mb-2">Institutions</Badge>
                <CardTitle>Organization</CardTitle>
                <div className="mt-4 flex items-baseline text-midnight-900">
                  <span className="text-3xl font-extrabold">
                    {billingCycle === 'yearly' ? '₹34,990' : '₹3,499'}
                  </span>
                  <span className="text-xs text-midnight-600 ml-1">/{billingCycle === 'yearly' ? 'yr' : 'mo'}</span>
                </div>
                <CardDescription className="mt-2">For schools, colleges, and training companies.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-xs font-semibold text-midnight-800">Institutional power:</div>
                <ul className="text-xs text-midnight-600 space-y-2">
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-indigo-brand" /> Up to 250 students (expandable)</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-indigo-brand" /> Unlimited staff teachers</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-indigo-brand" /> Shared org capacity pool</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-indigo-brand" /> Centralized institutional billing</li>
                </ul>
              </CardContent>
              <div className="p-6 pt-0">
                <Link to="/register" className="w-full block">
                  <Button variant="outline" className="w-full" size="sm">Register Organization</Button>
                </Link>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* FAQ Accordion */}
      <section className="py-20 bg-white border-b border-pearl-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h3 className="text-2xl sm:text-3xl font-extrabold text-midnight-950 tracking-tight">
              Frequently Asked Questions
            </h3>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-pearl-200 bg-pearl-50/50 overflow-hidden transition-all"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full p-4 text-left flex items-center justify-between font-bold text-sm text-midnight-900"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-midnight-600 transition-transform duration-200 ${
                      openFaq === idx ? 'rotate-180 text-indigo-brand' : ''
                    }`}
                  />
                </button>
                {openFaq === idx && (
                  <div className="px-4 pb-4 text-xs text-midnight-600 leading-relaxed border-t border-pearl-200/60 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};
