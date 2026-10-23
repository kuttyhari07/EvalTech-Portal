import { Response } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import {
  Question,
  ProgrammingQuestion,
  ProgrammingTestCase,
} from '../models';
import { AuthRequest } from '../middleware/auth';
import { sendSuccess, sendError } from '../utils/response';
import {
  DIFFICULTY_LEVELS,
  PROGRAMMING_LANGUAGES,
  QUESTION_TYPES,
  ROLES,
  SCORING_POLICIES,
} from '../constants';
import { recordAuditLog } from '../utils/audit';
import { CompilerService } from '../services/compiler/compiler.service';
import { compareOutputs } from '../services/compiler/outputNormalizer';

const testCaseInputSchema = z.object({
  input: z.string().default(''),
  expectedOutput: z.string().min(1, 'Expected output is required'),
  isHidden: z.boolean().default(false),
  isSample: z.boolean().default(false),
  weight: z.number().min(0).default(1),
  description: z.string().optional(),
  isEnabled: z.boolean().default(true),
  order: z.number().default(0),
});

const createProgrammingQuestionSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  subject: z.string().min(1, 'Subject is required'),
  topic: z.string().optional(),
  difficulty: z.enum([DIFFICULTY_LEVELS.EASY, DIFFICULTY_LEVELS.MEDIUM, DIFFICULTY_LEVELS.HARD]).default(DIFFICULTY_LEVELS.MEDIUM),
  problemStatement: z.string().min(5, 'Problem statement is required'),
  problemDescriptionMarkdown: z.string().default(''),
  inputFormat: z.string().default(''),
  outputFormat: z.string().default(''),
  constraints: z.string().default(''),
  tags: z.array(z.string()).default([]),
  supportedLanguages: z.array(z.enum([
    PROGRAMMING_LANGUAGES.C,
    PROGRAMMING_LANGUAGES.CPP,
    PROGRAMMING_LANGUAGES.JAVA,
    PROGRAMMING_LANGUAGES.PYTHON,
  ])).default([
    PROGRAMMING_LANGUAGES.PYTHON,
    PROGRAMMING_LANGUAGES.JAVA,
    PROGRAMMING_LANGUAGES.CPP,
    PROGRAMMING_LANGUAGES.C,
  ]),
  starterCode: z.object({
    c: z.string().optional(),
    cpp: z.string().optional(),
    java: z.string().optional(),
    python: z.string().optional(),
  }).optional(),
  executionMode: z.enum(['standard_io', 'function_signature']).default('standard_io'),
  sampleInput: z.string().default(''),
  sampleExpectedOutput: z.string().default(''),
  sampleExplanation: z.string().optional(),
  defaultMarks: z.number().min(1).default(10),
  timeLimitSeconds: z.number().min(0.5).max(15).default(2),
  memoryLimitMb: z.number().min(16).max(1024).default(256),
  allowedAttempts: z.number().min(1).default(10),
  scoringPolicy: z.enum([SCORING_POLICIES.ALL_OR_NOTHING, SCORING_POLICIES.WEIGHTED]).default(SCORING_POLICIES.WEIGHTED),
  testCases: z.array(testCaseInputSchema).optional(),
});

export class ProgrammingQuestionController {
  static async create(req: AuthRequest, res: Response): Promise<void> {
    const data = createProgrammingQuestionSchema.parse(req.body);
    const userId = req.user!.userId;
    const orgId = req.user?.organizationId;

    // 1. Create base Question entry for unified question bank and exam builder
    const baseQuestion = await Question.create({
      subject: data.subject,
      topic: data.topic,
      difficulty: data.difficulty,
      type: QUESTION_TYPES.PROGRAMMING,
      title: data.title,
      text: data.problemStatement,
      defaultMarks: data.defaultMarks,
      negativeMarks: 0,
      tags: data.tags,
      options: [],
      correctAnswers: [],
      creatorId: userId,
      organizationId: orgId,
      approvalStatus: 'approved',
      isApproved: true,
    });

    // 2. Create detailed ProgrammingQuestion document
    const progQuestion = await ProgrammingQuestion.create({
      questionId: baseQuestion._id,
      creatorId: userId,
      organizationId: orgId,
      title: data.title,
      problemStatement: data.problemStatement,
      problemDescriptionMarkdown: data.problemDescriptionMarkdown,
      inputFormat: data.inputFormat,
      outputFormat: data.outputFormat,
      constraints: data.constraints,
      difficulty: data.difficulty,
      topic: data.topic,
      tags: data.tags,
      supportedLanguages: data.supportedLanguages,
      starterCode: data.starterCode,
      executionMode: data.executionMode,
      sampleInput: data.sampleInput,
      sampleExpectedOutput: data.sampleExpectedOutput,
      sampleExplanation: data.sampleExplanation,
      defaultMarks: data.defaultMarks,
      timeLimitSeconds: data.timeLimitSeconds,
      memoryLimitMb: data.memoryLimitMb,
      allowedAttempts: data.allowedAttempts,
      scoringPolicy: data.scoringPolicy,
      status: 'draft',
    });

    // Link back to Question
    baseQuestion.programmingQuestionId = progQuestion._id as mongoose.Types.ObjectId;
    await baseQuestion.save();

    // 3. Create initial test cases if provided
    const createdTestCases = [];
    if (data.testCases && data.testCases.length > 0) {
      for (let i = 0; i < data.testCases.length; i++) {
        const tc = data.testCases[i];
        const testCaseDoc = await ProgrammingTestCase.create({
          questionId: baseQuestion._id,
          programmingQuestionId: progQuestion._id,
          input: tc.input,
          expectedOutput: tc.expectedOutput,
          isHidden: tc.isHidden,
          isSample: tc.isSample,
          weight: tc.weight,
          description: tc.description,
          isEnabled: tc.isEnabled,
          order: tc.order ?? i,
        });
        createdTestCases.push(testCaseDoc);
      }
    } else if (data.sampleInput && data.sampleExpectedOutput) {
      // Create automatic sample test case from sample input/output
      const sampleTc = await ProgrammingTestCase.create({
        questionId: baseQuestion._id,
        programmingQuestionId: progQuestion._id,
        input: data.sampleInput,
        expectedOutput: data.sampleExpectedOutput,
        isHidden: false,
        isSample: true,
        weight: 1,
        description: 'Sample Test Case',
        isEnabled: true,
        order: 0,
      });
      createdTestCases.push(sampleTc);
    }

    await recordAuditLog({
      req,
      action: 'PROGRAMMING_QUESTION_CREATE',
      entity: 'ProgrammingQuestion',
      entityId: progQuestion._id.toString(),
      metadata: { title: progQuestion.title, questionId: baseQuestion._id },
    });

    sendSuccess(
      res,
      {
        question: baseQuestion,
        programmingDetails: progQuestion,
        testCases: createdTestCases,
      },
      'Programming question created successfully.',
      201
    );
  }

  static async list(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const orgId = req.user?.organizationId;
    const role = req.user!.role;
    const { subject, topic, difficulty, search, page = '1', limit = '50' } = req.query;

    const query: any = {};

    if (role === ROLES.SUPER_ADMIN) {
      if (req.query.organizationId) query.organizationId = req.query.organizationId;
    } else if (orgId) {
      query.$or = [{ organizationId: orgId }, { creatorId: userId }];
    } else {
      query.creatorId = userId;
    }

    if (subject) query.subject = subject;
    if (topic) query.topic = topic;
    if (difficulty) query.difficulty = difficulty;
    if (search) {
      query.title = { $regex: search as string, $options: 'i' };
    }

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const [questions, total] = await Promise.all([
      ProgrammingQuestion.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
      ProgrammingQuestion.countDocuments(query),
    ]);

    sendSuccess(res, questions, undefined, 200, {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    });
  }

  static async getById(req: AuthRequest, res: Response): Promise<void> {
    const { id } = req.params;

    // Can look up by either ProgrammingQuestion._id or parent Question._id
    let progQuestion = await ProgrammingQuestion.findById(id);
    if (!progQuestion) {
      progQuestion = await ProgrammingQuestion.findOne({ questionId: id });
    }

    if (!progQuestion) {
      sendError(res, 'Programming question not found', 404);
      return;
    }

    const testCases = await ProgrammingTestCase.find({
      questionId: progQuestion.questionId,
    }).sort({ order: 1 });

    sendSuccess(res, {
      ...progQuestion.toObject(),
      testCases,
    });
  }

  static async update(req: AuthRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const data = req.body;

    let progQuestion = await ProgrammingQuestion.findById(id);
    if (!progQuestion) {
      progQuestion = await ProgrammingQuestion.findOne({ questionId: id });
    }

    if (!progQuestion) {
      sendError(res, 'Programming question not found', 404);
      return;
    }

    // Permission check
    const userId = req.user!.userId;
    const orgId = req.user?.organizationId;
    const role = req.user!.role;

    if (
      role !== ROLES.SUPER_ADMIN &&
      progQuestion.creatorId.toString() !== userId &&
      (!orgId || progQuestion.organizationId?.toString() !== orgId.toString())
    ) {
      sendError(res, 'Unauthorized to edit this programming question.', 403);
      return;
    }

    // Update ProgrammingQuestion
    Object.assign(progQuestion, data);
    await progQuestion.save();

    // Sync base Question record
    await Question.findByIdAndUpdate(progQuestion.questionId, {
      title: progQuestion.title,
      text: progQuestion.problemStatement,
      difficulty: progQuestion.difficulty,
      topic: progQuestion.topic,
      tags: progQuestion.tags,
      defaultMarks: progQuestion.defaultMarks,
    });

    sendSuccess(res, progQuestion, 'Programming question updated successfully.');
  }

  static async delete(req: AuthRequest, res: Response): Promise<void> {
    const { id } = req.params;

    let progQuestion = await ProgrammingQuestion.findById(id);
    if (!progQuestion) {
      progQuestion = await ProgrammingQuestion.findOne({ questionId: id });
    }

    if (!progQuestion) {
      sendError(res, 'Programming question not found', 404);
      return;
    }

    // Permission check
    const userId = req.user!.userId;
    const orgId = req.user?.organizationId;
    const role = req.user!.role;

    if (
      role !== ROLES.SUPER_ADMIN &&
      progQuestion.creatorId.toString() !== userId &&
      (!orgId || progQuestion.organizationId?.toString() !== orgId.toString())
    ) {
      sendError(res, 'Unauthorized to delete this question.', 403);
      return;
    }

    // Delete test cases, detailed doc, and parent question
    await ProgrammingTestCase.deleteMany({ questionId: progQuestion.questionId });
    await Question.findByIdAndDelete(progQuestion.questionId);
    await progQuestion.deleteOne();

    sendSuccess(res, null, 'Programming question deleted successfully.');
  }

  static async addTestCase(req: AuthRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const tcData = testCaseInputSchema.parse(req.body);

    let progQuestion = await ProgrammingQuestion.findById(id);
    if (!progQuestion) {
      progQuestion = await ProgrammingQuestion.findOne({ questionId: id });
    }

    if (!progQuestion) {
      sendError(res, 'Programming question not found', 404);
      return;
    }

    const testCase = await ProgrammingTestCase.create({
      questionId: progQuestion.questionId,
      programmingQuestionId: progQuestion._id,
      input: tcData.input,
      expectedOutput: tcData.expectedOutput,
      isHidden: tcData.isHidden,
      isSample: tcData.isSample,
      weight: tcData.weight,
      description: tcData.description,
      isEnabled: tcData.isEnabled,
      order: tcData.order,
    });

    sendSuccess(res, testCase, 'Test case added successfully.', 201);
  }

  static async updateTestCase(req: AuthRequest, res: Response): Promise<void> {
    const { testCaseId } = req.params;
    const data = req.body;

    const testCase = await ProgrammingTestCase.findByIdAndUpdate(
      testCaseId,
      { $set: data },
      { new: true }
    );

    if (!testCase) {
      sendError(res, 'Test case not found', 404);
      return;
    }

    sendSuccess(res, testCase, 'Test case updated successfully.');
  }

  static async deleteTestCase(req: AuthRequest, res: Response): Promise<void> {
    const { testCaseId } = req.params;

    const testCase = await ProgrammingTestCase.findByIdAndDelete(testCaseId);
    if (!testCase) {
      sendError(res, 'Test case not found', 404);
      return;
    }

    sendSuccess(res, null, 'Test case deleted successfully.');
  }

  /**
   * Validates solution code against all enabled test cases
   */
  static async validate(req: AuthRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const { language, sourceCode } = req.body;

    if (!language || !sourceCode) {
      sendError(res, 'Language and source code are required for validation.', 400);
      return;
    }

    let progQuestion = await ProgrammingQuestion.findById(id);
    if (!progQuestion) {
      progQuestion = await ProgrammingQuestion.findOne({ questionId: id });
    }

    if (!progQuestion) {
      sendError(res, 'Programming question not found', 404);
      return;
    }

    const testCases = await ProgrammingTestCase.find({
      questionId: progQuestion.questionId,
      isEnabled: true,
    }).sort({ order: 1 });

    if (testCases.length === 0) {
      sendError(res, 'Cannot validate without configured test cases.', 400);
      return;
    }

    const results = [];
    let allPassed = true;

    for (const tc of testCases) {
      const execResult = await CompilerService.execute({
        language,
        sourceCode,
        stdin: tc.input || '',
        expectedOutput: tc.expectedOutput,
        timeLimitSeconds: progQuestion.timeLimitSeconds,
        memoryLimitMb: progQuestion.memoryLimitMb,
      });

      const passed = execResult.verdict === 'Accepted';
      if (!passed) allPassed = false;

      results.push({
        testCaseId: tc._id,
        isSample: tc.isSample,
        isHidden: tc.isHidden,
        passed,
        verdict: execResult.verdict,
        executionTimeMs: execResult.timeMs,
        actualOutput: execResult.stdout,
        expectedOutput: tc.expectedOutput,
        compileError: execResult.compileOutput,
        runtimeError: execResult.stderr,
      });
    }

    sendSuccess(res, {
      allPassed,
      passedTests: results.filter((r) => r.passed).length,
      totalTests: results.length,
      results,
    });
  }

  static async publish(req: AuthRequest, res: Response): Promise<void> {
    const { id } = req.params;

    let progQuestion = await ProgrammingQuestion.findById(id);
    if (!progQuestion) {
      progQuestion = await ProgrammingQuestion.findOne({ questionId: id });
    }

    if (!progQuestion) {
      sendError(res, 'Programming question not found', 404);
      return;
    }

    const testCaseCount = await ProgrammingTestCase.countDocuments({
      questionId: progQuestion.questionId,
      isEnabled: true,
    });

    if (testCaseCount === 0) {
      sendError(
        res,
        'Cannot publish question without at least one enabled test case.',
        400
      );
      return;
    }

    progQuestion.status = 'published';
    await progQuestion.save();

    await recordAuditLog({
      req,
      action: 'PROGRAMMING_QUESTION_PUBLISHED',
      entity: 'ProgrammingQuestion',
      entityId: progQuestion._id.toString(),
      metadata: { questionId: progQuestion.questionId, title: progQuestion.title },
    });

    sendSuccess(res, progQuestion, 'Programming question published successfully!');
  }
}
