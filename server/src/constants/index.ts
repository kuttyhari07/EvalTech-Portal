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
    name: 'Free',
    tier: SUBSCRIPTION_TIERS.FREE,
    slug: 'free',
    maxStudents: 15,
    priceMonthly: 0,
    priceYearly: 0,
    features: [
      'Up to 15 active students',
      'Unlimited classes & standard exams',
      'Full coding (Python, Java, C++, C) + MCQs',
      'Safe Exam Browser (SEB) lockdown support',
      'Instant automated grading & scorecard',
      'Community email support',
    ],
    aiQuestionsPerMonth: 0,
    isActive: true,
    isPopular: false,
    hasNextGenAi: false,
  },
  {
    name: 'Plus',
    tier: SUBSCRIPTION_TIERS.PLUS,
    slug: 'plus',
    maxStudents: 60,
    priceMonthly: 799, // in INR (approx $10)
    priceYearly: 7990, // 2 months free
    features: [
      'Up to 60 active students',
      'AI Question Generator (100 questions/mo)',
      'Automated result email delivery & PDF reports',
      'CSV batch student roster import',
      'Detailed question & topic mastery analytics',
      'Browser blur & anti-tamper tracking',
      'Priority email support',
    ],
    aiQuestionsPerMonth: 100,
    isActive: true,
    isPopular: false,
    hasNextGenAi: false,
  },
  {
    name: 'Pro',
    tier: SUBSCRIPTION_TIERS.PRO,
    slug: 'pro',
    maxStudents: 250,
    priceMonthly: 1999,
    priceYearly: 19990,
    features: [
      'Up to 250 active students',
      '🧠 Thought Playback (Cadence & 15s replay)',
      '🎙️ AI Socratic Viva (Oral code defense & comprehension)',
      '🚨 Bug Hunt Mode (Production debugging & crash logs)',
      '🧬 Adversarial Mutation Testing (Catch hardcoding)',
      '🤖 AI Co-Pilot Pair Programmer (Constrained mentor)',
      '🛡️ AI Face & Voice Proctoring Suite',
      '🏆 Verified Skill DNA & LinkedIn Credential Exporter',
      '500 AI Question Generations / month',
      '24/7 Priority Dedicated Support',
    ],
    aiQuestionsPerMonth: 500,
    isActive: true,
    isPopular: true,
    highlightBadge: 'MOST POPULAR',
    hasNextGenAi: true,
  },
  {
    name: 'Organization',
    tier: SUBSCRIPTION_TIERS.ORGANIZATION,
    slug: 'organization',
    maxStudents: 1000,
    priceMonthly: 4999,
    priceYearly: 49990,
    features: [
      'Up to 1,000 active students (expandable)',
      'All Pro Next-Gen AI & Proctoring features included',
      'Unlimited staff member accounts & classes',
      'Centralized institution billing & department analytics',
      'Custom college white-label logo & domain',
      'LMS Integration (Moodle, Canvas, Google Classroom)',
      'Dedicated account manager & 99.9% uptime SLA',
    ],
    aiQuestionsPerMonth: 2500,
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

