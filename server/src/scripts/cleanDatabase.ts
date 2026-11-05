import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import bcrypt from 'bcryptjs';

dotenv.config({ path: path.join(__dirname, '../../.env') });

import {
  User,
  Organization,
  OrganizationMembership,
  Class,
  Student,
  ClassEnrollment,
  Subscription,
  Payment,
  Question,
  QuestionBank,
  Exam,
  ExamAttempt,
  StudentAnswer,
  ExamResult,
  AuditLog,
  SupportRequest,
  AIUsageLog,
  ProgrammingQuestion,
  ProgrammingTestCase,
  CodeSubmission,
  EvaluationJob,
  PlatformSetting,
  SubscriptionPlan,
} from '../models';
import { ROLES, INITIAL_PLANS } from '../constants';

async function cleanDatabase() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/evaltech';
  console.log(`Connecting to database: ${uri}`);
  await mongoose.connect(uri);

  console.log('--- Starting Database Cleanup ---');

  // 1. Ensure Super Admin is preserved or created
  let superAdmin = await User.findOne({ role: ROLES.SUPER_ADMIN });

  if (!superAdmin) {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(process.env.INITIAL_ADMIN_PASSWORD || 'Admin@EvalTech2025!', salt);
    superAdmin = await User.create({
      name: 'Super Admin',
      email: 'evaltech32@gmail.com',
      passwordHash,
      role: ROLES.SUPER_ADMIN,
      status: 'active',
      emailVerified: true,
    });
    console.log('[User] Created default Super Admin account: evaltech32@gmail.com');
  } else {
    // Unset any organization reference since all organizations will be deleted
    await User.updateOne(
      { _id: superAdmin._id },
      { $unset: { currentOrganizationId: 1 } }
    );
    console.log(`[User] Preserving existing Super Admin: ${superAdmin.email} (ID: ${superAdmin._id})`);
  }

  // 2. Delete all other users
  const deletedUsers = await User.deleteMany({ _id: { $ne: superAdmin._id } });
  console.log(`[Users] Deleted ${deletedUsers.deletedCount} non-admin user(s)`);

  // 3. Delete registered organizations and memberships
  const deletedOrgMemberships = await OrganizationMembership.deleteMany({});
  console.log(`[OrganizationMemberships] Deleted ${deletedOrgMemberships.deletedCount} record(s)`);

  const deletedOrgs = await Organization.deleteMany({});
  console.log(`[Organizations] Deleted ${deletedOrgs.deletedCount} record(s)`);

  // 4. Delete classes and students
  const deletedEnrollments = await ClassEnrollment.deleteMany({});
  console.log(`[ClassEnrollments] Deleted ${deletedEnrollments.deletedCount} record(s)`);

  const deletedClasses = await Class.deleteMany({});
  console.log(`[Classes] Deleted ${deletedClasses.deletedCount} record(s)`);

  const deletedStudents = await Student.deleteMany({});
  console.log(`[Students] Deleted ${deletedStudents.deletedCount} record(s)`);

  // 5. Delete questions, question banks & programming questions
  const deletedTestCases = await ProgrammingTestCase.deleteMany({});
  console.log(`[ProgrammingTestCases] Deleted ${deletedTestCases.deletedCount} record(s)`);

  const deletedProgQuestions = await ProgrammingQuestion.deleteMany({});
  console.log(`[ProgrammingQuestions] Deleted ${deletedProgQuestions.deletedCount} record(s)`);

  const deletedQuestions = await Question.deleteMany({});
  console.log(`[Questions] Deleted ${deletedQuestions.deletedCount} record(s)`);

  const deletedQuestionBanks = await QuestionBank.deleteMany({});
  console.log(`[QuestionBanks] Deleted ${deletedQuestionBanks.deletedCount} record(s)`);

  // 6. Delete exams, attempts, results, submissions
  const deletedStudentAnswers = await StudentAnswer.deleteMany({});
  console.log(`[StudentAnswers] Deleted ${deletedStudentAnswers.deletedCount} record(s)`);

  const deletedExamAttempts = await ExamAttempt.deleteMany({});
  console.log(`[ExamAttempts] Deleted ${deletedExamAttempts.deletedCount} record(s)`);

  const deletedExamResults = await ExamResult.deleteMany({});
  console.log(`[ExamResults] Deleted ${deletedExamResults.deletedCount} record(s)`);

  const deletedCodeSubmissions = await CodeSubmission.deleteMany({});
  console.log(`[CodeSubmissions] Deleted ${deletedCodeSubmissions.deletedCount} record(s)`);

  const deletedEvaluationJobs = await EvaluationJob.deleteMany({});
  console.log(`[EvaluationJobs] Deleted ${deletedEvaluationJobs.deletedCount} record(s)`);

  const deletedExams = await Exam.deleteMany({});
  console.log(`[Exams] Deleted ${deletedExams.deletedCount} record(s)`);

  // 7. Delete subscriptions and payments
  const deletedSubscriptions = await Subscription.deleteMany({});
  console.log(`[Subscriptions] Deleted ${deletedSubscriptions.deletedCount} record(s)`);

  const deletedPayments = await Payment.deleteMany({});
  console.log(`[Payments] Deleted ${deletedPayments.deletedCount} record(s)`);

  // 8. Delete logs & requests
  const deletedAuditLogs = await AuditLog.deleteMany({});
  console.log(`[AuditLogs] Deleted ${deletedAuditLogs.deletedCount} record(s)`);

  const deletedAIUsageLogs = await AIUsageLog.deleteMany({});
  console.log(`[AIUsageLogs] Deleted ${deletedAIUsageLogs.deletedCount} record(s)`);

  const deletedSupportRequests = await SupportRequest.deleteMany({});
  console.log(`[SupportRequests] Deleted ${deletedSupportRequests.deletedCount} record(s)`);

  const deletedPlatformSettings = await PlatformSetting.deleteMany({});
  console.log(`[PlatformSettings] Deleted ${deletedPlatformSettings.deletedCount} record(s)`);

  // 9. Verify / Seed Subscription Plans
  const planCount = await SubscriptionPlan.countDocuments();
  if (planCount === 0) {
    await SubscriptionPlan.insertMany(INITIAL_PLANS);
    console.log('[SubscriptionPlans] Default subscription plans seeded');
  } else {
    console.log(`[SubscriptionPlans] Preserved ${planCount} default subscription plan(s)`);
  }

  console.log('--- Cleanup Complete! ---');
  console.log(`Preserved Super Admin: ${superAdmin.email}`);

  await mongoose.disconnect();
}

cleanDatabase().catch((err) => {
  console.error('Fatal cleanup error:', err);
  process.exit(1);
});
