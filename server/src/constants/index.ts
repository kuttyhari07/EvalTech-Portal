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
    maxStudents: 10,
    priceMonthly: 0,
    priceYearly: 0,
    features: [
      'Up to 10 active students',
      'Unlimited classes & exams',
      'Standard question types (MCQ, True/False, Short Answer)',
      'Instant automated grading',
      'Community email support',
    ],
    aiQuestionsPerMonth: 0,
    isActive: true,
  },
  {
    name: 'Plus',
    tier: SUBSCRIPTION_TIERS.PLUS,
    slug: 'plus',
    maxStudents: 50,
    priceMonthly: 799, // in INR (approx $10)
    priceYearly: 7990, // 2 months free
    features: [
      'Up to 50 active students',
      'All question types (inc. Multi-select, Fill-in-blanks, Long answer)',
      'AI Question Generator (50 questions/mo)',
      'Automated result email delivery',
      'CSV batch student roster import',
      'Detailed question analytics',
      'Priority email support',
    ],
    aiQuestionsPerMonth: 50,
    isActive: true,
  },
  {
    name: 'Pro',
    tier: SUBSCRIPTION_TIERS.PRO,
    slug: 'pro',
    maxStudents: 100,
    priceMonthly: 1499,
    priceYearly: 14990,
    features: [
      'Up to 100 active students',
      'Advanced AI Question Generator (250 questions/mo)',
      'Full question bank with tags & search',
      'Anti-tamper logs & browser blur detection',
      'Scheduled exam auto-release',
      'Rich cohort analytics & export to CSV/PDF',
      'Priority 24/7 support',
    ],
    aiQuestionsPerMonth: 250,
    isActive: true,
  },
  {
    name: 'Organization',
    tier: SUBSCRIPTION_TIERS.ORGANIZATION,
    slug: 'organization',
    maxStudents: 250,
    priceMonthly: 3499,
    priceYearly: 34990,
    features: [
      'Up to 250 active students (expandable)',
      'Unlimited staff member accounts',
      'Centralized institution billing',
      'Cross-class shared capacity pool',
      'Institution-wide performance benchmarking',
      'Role-based staff permissions & class assignment',
      'Dedicated account manager',
    ],
    aiQuestionsPerMonth: 1000,
    isActive: true,
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

