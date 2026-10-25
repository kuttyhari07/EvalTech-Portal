export type UserRole = 'super_admin' | 'org_admin' | 'staff' | 'student';

export interface User {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  status: 'active' | 'suspended' | 'pending';
  avatar?: string;
  phone?: string;
  emailVerified: boolean;
  currentOrganizationId?: string;
  studentIdNumber?: string;
  passwordChanged?: boolean;
  createdAt: string;
}

export interface Organization {
  _id: string;
  name: string;
  slug: string;
  logo?: string;
  address?: string;
  contactEmail: string;
  contactPhone?: string;
  status: 'active' | 'suspended';
  createdAt: string;
}

export interface CapacityCheck {
  allowed: boolean;
  maxCapacity: number;
  currentUsage: number;
  remainingCapacity: number;
  tier: string;
  status: string;
  message?: string;
}

export interface SubscriptionPlan {
  _id: string;
  name: string;
  slug: string;
  tier: 'free' | 'plus' | 'pro' | 'organization';
  maxStudents: number;
  priceMonthly: number;
  priceYearly: number;
  features: string[];
  aiQuestionsPerMonth: number;
  isActive: boolean;
}

export interface Subscription {
  _id: string;
  targetType: 'staff' | 'organization';
  targetId: string;
  planId: SubscriptionPlan;
  tier: string;
  studentCapacity: number;
  billingCycle: 'monthly' | 'yearly';
  status: 'active' | 'expired' | 'cancelled' | 'pending' | 'past_due';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  autoRenew: boolean;
}

export interface ClassItem {
  _id: string;
  name: string;
  section?: string;
  subject?: string;
  academicYear?: string;
  code: string;
  description?: string;
  organizationId?: string;
  staffId: {
    _id: string;
    name: string;
    email: string;
  };
  isActive: boolean;
  studentCount?: number;
  createdAt: string;
}

export interface StudentItem {
  _id: string;
  studentIdNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  organizationId?: string;
  status: 'active' | 'archived';
  classes?: { _id: string; name: string; code: string }[];
  createdAt: string;
}

export type QuestionType =
  | 'mcq'
  | 'multiple_select'
  | 'true_false'
  | 'fill_blank'
  | 'short_answer'
  | 'long_answer'
  | 'code'
  | 'programming';

export type ProgrammingLanguage = 'c' | 'cpp' | 'java' | 'python';

export type CodeVerdict =
  | 'Accepted'
  | 'Wrong Answer'
  | 'Compilation Error'
  | 'Runtime Error'
  | 'Time Limit Exceeded'
  | 'Memory Limit Exceeded'
  | 'Partially Correct'
  | 'Pending Evaluation'
  | 'Internal Evaluation Error';

export interface ProgrammingTestCaseItem {
  _id: string;
  questionId: string;
  input: string;
  expectedOutput: string;
  isHidden: boolean;
  isSample: boolean;
  weight: number;
  description?: string;
  isEnabled: boolean;
  order: number;
}

export interface ProgrammingQuestionDetail {
  _id: string;
  questionId: string;
  title: string;
  problemStatement: string;
  problemDescriptionMarkdown: string;
  inputFormat: string;
  outputFormat: string;
  constraints: string;
  difficulty: 'easy' | 'medium' | 'hard';
  topic?: string;
  tags: string[];
  supportedLanguages: ProgrammingLanguage[];
  starterCode: {
    c?: string;
    cpp?: string;
    java?: string;
    python?: string;
  };
  executionMode: 'standard_io' | 'function_signature';
  sampleInput?: string;
  sampleExpectedOutput?: string;
  sampleExplanation?: string;
  defaultMarks: number;
  timeLimitSeconds: number;
  memoryLimitMb: number;
  allowedAttempts: number;
  scoringPolicy: 'all_or_nothing' | 'weighted';
  status: 'draft' | 'published' | 'archived';
  testCases?: ProgrammingTestCaseItem[];
}

export interface TestResultItem {
  testCaseId?: string;
  isSample: boolean;
  isHidden: boolean;
  passed: boolean;
  verdict: CodeVerdict;
  executionTimeMs?: number;
  memoryKb?: number;
  studentOutput?: string;
  expectedOutput?: string;
  compileError?: string;
  runtimeError?: string;
}

export interface CodeSubmissionItem {
  _id: string;
  examId: string;
  questionId: string;
  attemptId: string;
  language: ProgrammingLanguage;
  sourceCode: string;
  submissionNumber: number;
  type: 'run' | 'submit';
  status: 'queued' | 'processing' | 'completed' | 'failed';
  verdict: CodeVerdict;
  marksObtained: number;
  totalMarks: number;
  passedTestCasesCount: number;
  totalTestCasesCount: number;
  testResults: TestResultItem[];
  executionMetadata?: {
    executionTimeMs: number;
    memoryKb: number;
    compileOutput?: string;
  };
  evaluatedAt?: string;
  createdAt: string;
}


export interface QuestionOption {
  id: string;
  text: string;
}

export interface QuestionItem {
  _id: string;
  subject: string;
  topic?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  type: QuestionType;
  title?: string;
  text: string;
  codeSnippet?: string;
  options: QuestionOption[];
  correctAnswers: string[];
  explanation?: string;
  defaultMarks: number;
  negativeMarks: number;
  questionBankId?: string;
  programmingQuestionId?: any;
  tags: string[];
  aiGenerated: boolean;
  creatorId: string;
  createdAt: string;
}

export interface QuestionBankItem {
  _id: string;
  title: string;
  description?: string;
  subject: string;
  creatorId: string;
  organizationId?: string;
  questionIds: (QuestionItem | any)[];
  tags: string[];
  isPublicWithinOrg: boolean;
  createdAt: string;
}

export interface ExamQuestionConfig {
  questionId: QuestionItem | string;
  marks: number;
  negativeMarks: number;
  order: number;
}

export interface ExamItem {
  _id: string;
  title: string;
  description?: string;
  examCode: string;
  subject: string;
  category?: string;
  totalMarks: number;
  passingMarks: number;
  durationMinutes: number;
  startsAt: string;
  endsAt: string;
  maxAttempts: number;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  negativeMarking: {
    enabled: boolean;
    penaltyPerQuestion: number;
  };
  canRevisitQuestions: boolean;
  releaseResultsMode: 'immediate' | 'manual';
  showExplanationsAfterSubmission: boolean;
  instructions?: string;
  questions: ExamQuestionConfig[];
  classIds: { _id: string; name: string; code: string }[];
  status: 'draft' | 'published' | 'archived';
  isPublicLinkEnabled: boolean;
  requireSEB?: boolean;
  startPassword?: string;
  exitPassword?: string;
  requireStartPassword?: boolean;
  requireExitPassword?: boolean;
  createdAt: string;
}

export interface ExamResultBreakdown {
  questionId: string;
  questionText: string;
  questionType: QuestionType;
  studentAnswer: any;
  correctAnswer: any;
  marksObtained: number;
  maxMarks: number;
  isCorrect: boolean;
  isPartial: boolean;
  explanation?: string;
  feedback?: string;
  codeSubmissionId?: string;
  programmingLanguage?: string;
  programmingVerdict?: CodeVerdict;
  passedTestCasesCount?: number;
  totalTestCasesCount?: number;
}

export interface ExamResultItem {
  _id: string;
  attemptId: string;
  examId: string;
  studentInfo: {
    name: string;
    email: string;
    rollNo?: string;
  };
  totalScore: number;
  maxScore: number;
  percentage: number;
  isPassed: boolean;
  programmingScore?: number;
  programmingMaxScore?: number;
  evaluationStatus?: 'pending' | 'completed' | 'failed';
  rank?: number;
  questionBreakdown: ExamResultBreakdown[];
  isReleased: boolean;
  releasedAt?: string;
  emailSent: boolean;
  evaluatedAt: string;
}

export interface AuditLogItem {
  _id: string;
  actorEmail?: string;
  actorRole?: string;
  action: string;
  entity: string;
  entityId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}
