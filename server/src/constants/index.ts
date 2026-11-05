export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ORG_ADMIN: 'org_admin',
  STAFF: 'staff',
  STUDENT: 'student',
} as const;

export type UserRole = (typeof ROLES)[keyof typeof ROLES];

export const SUBSCRIPTION_TIERS = {
  FREE: 'free',
  PLUS: 'plus',
  PRO: 'pro',
  ORGANIZATION: 'organization',
} as const;

export type SubscriptionTier = (typeof SUBSCRIPTION_TIERS)[keyof typeof SUBSCRIPTION_TIERS];

export const INITIAL_PLANS = [
  {
    name: 'Free Explorer',
    tier: SUBSCRIPTION_TIERS.FREE,
    slug: 'free',
    maxStudents: 999999,
    priceMonthly: 0,
    priceYearly: 0,
    aiExamsPerMonth: 2,
    aiVivaPerMonth: 50,
    features: [
      'Unlimited students & classes (Zero seat limits!)',
      'Unlimited standard exams (Coding Sandbox & MCQs)',
      '2 Next-Gen AI Exams per month included',
      '🧠 Thought Playback & Keystroke Biometrics (Active)',
      '🎙️ AI Socratic Oral Viva Code Defense (Active)',
      '🚨 Bug Hunt Mode (Production Debugging & Crash Logs)',
      '🛡️ AI Face & Voice Proctoring Suite (Active)',
      'Safe Exam Browser (SEB) Lockdown Support',
      'Instant Automated Grading & Student Analytics',
    ],
    aiQuestionsPerMonth: 50,
    isActive: true,
    isPopular: false,
    hasNextGenAi: true,
  },
  {
    name: 'On-Demand AI Pass',
    tier: SUBSCRIPTION_TIERS.PLUS,
    slug: 'plus',
    maxStudents: 999999,
    priceMonthly: 199, // ₹199 per single AI exam pass
    priceYearly: 799,  // ₹799 for 5 AI exam passes
    aiExamsPerMonth: 5,
    aiVivaPerMonth: 200,
    features: [
      'Unlimited students for 5 Next-Gen AI Exams',
      'Full AI Socratic Viva & Proctoring enabled',
      'Pay only when you conduct an exam (No recurring fee)',
      'Unused exam passes never expire',
      'Automated email result dispatches to all candidates',
      'Export cohort performance reports (CSV / PDF)',
      'Priority email support',
    ],
    aiQuestionsPerMonth: 150,
    isActive: true,
    isPopular: false,
    highlightBadge: 'PAY AS YOU GO',
    hasNextGenAi: true,
  },
  {
    name: 'Pro Educator',
    tier: SUBSCRIPTION_TIERS.PRO,
    slug: 'pro',
    maxStudents: 999999,
    priceMonthly: 1499,
    priceYearly: 14990,
    aiExamsPerMonth: -1, // Unlimited
    aiVivaPerMonth: -1,  // Unlimited
    features: [
      'Unlimited students & classes (Zero seat limits!)',
      'UNLIMITED Next-Gen AI Exams (Host anytime)',
      'UNLIMITED AI Socratic Vivas & Oral Evaluations',
      'UNLIMITED Thought Playback Replay Scrubbers',
      'UNLIMITED AI Face & Voice Proctoring Hours',
      'UNLIMITED Adversarial Mutation Stress Tests',
      'UNLIMITED AI Co-Pilot Pair Programming',
      'Auto Email Result Dispatches to Students & PDF Reports',
      'Priority AI Server Queue (Instant Gemini Processing)',
      '24/7 Dedicated Support',
    ],
    aiQuestionsPerMonth: 1000,
    isActive: true,
    isPopular: true,
    highlightBadge: 'MOST POPULAR',
    hasNextGenAi: true,
  },
  {
    name: 'Campus Enterprise',
    tier: SUBSCRIPTION_TIERS.ORGANIZATION,
    slug: 'organization',
    maxStudents: 999999,
    priceMonthly: 4999,
    priceYearly: 49990,
    aiExamsPerMonth: -1,
    aiVivaPerMonth: -1,
    features: [
      'Unlimited students across the entire institution',
      'Everything in Pro for ALL faculty & departments',
      'Unlimited Staff / Examiner accounts',
      'Centralized institution billing & shared exam banks',
      'College White-Label (Custom Logo & Domain)',
      'LMS Integration (Moodle, Canvas, Google Classroom)',
      'Dedicated Account Manager & 99.9% Uptime SLA',
    ],
    aiQuestionsPerMonth: 5000,
    isActive: true,
    isPopular: false,
    highlightBadge: 'CAMPUS ENTERPRISE',
    hasNextGenAi: true,
  },
];

export const QUESTION_TYPES = {
  MCQ: 'mcq',
  MULTIPLE_SELECT: 'multiple_select',
  TRUE_FALSE: 'true_false',
  FILL_BLANK: 'fill_blank',
  SHORT_ANSWER: 'short_answer',
  LONG_ANSWER: 'long_answer',
  CODE: 'code',
  PROGRAMMING: 'programming',
  DEBUGGING: 'debugging',
} as const;

export type QuestionType = (typeof QUESTION_TYPES)[keyof typeof QUESTION_TYPES];

export const DIFFICULTY_LEVELS = {
  EASY: 'easy',
  MEDIUM: 'medium',
  HARD: 'hard',
} as const;

export type DifficultyLevel = (typeof DIFFICULTY_LEVELS)[keyof typeof DIFFICULTY_LEVELS];

export const PROGRAMMING_LANGUAGES = {
  C: 'c',
  CPP: 'cpp',
  JAVA: 'java',
  PYTHON: 'python',
} as const;

export type ProgrammingLanguage = (typeof PROGRAMMING_LANGUAGES)[keyof typeof PROGRAMMING_LANGUAGES];

export const CODE_VERDICTS = {
  ACCEPTED: 'Accepted',
  WRONG_ANSWER: 'Wrong Answer',
  COMPILATION_ERROR: 'Compilation Error',
  RUNTIME_ERROR: 'Runtime Error',
  TIME_LIMIT_EXCEEDED: 'Time Limit Exceeded',
  MEMORY_LIMIT_EXCEEDED: 'Memory Limit Exceeded',
  PARTIALLY_CORRECT: 'Partially Correct',
  PENDING_EVALUATION: 'Pending Evaluation',
  INTERNAL_EVALUATION_ERROR: 'Internal Evaluation Error',
} as const;

export type CodeVerdict = (typeof CODE_VERDICTS)[keyof typeof CODE_VERDICTS];

export const SCORING_POLICIES = {
  ALL_OR_NOTHING: 'all_or_nothing',
  WEIGHTED: 'weighted',
} as const;

export type ScoringPolicy = (typeof SCORING_POLICIES)[keyof typeof SCORING_POLICIES];

export const EXAM_STATUS = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  ARCHIVED: 'archived',
} as const;

export const ATTEMPT_STATUS = {
  IN_PROGRESS: 'in_progress',
  SUBMITTED: 'submitted',
  TIMED_OUT: 'timed_out',
  EVALUATED: 'evaluated',
} as const;

