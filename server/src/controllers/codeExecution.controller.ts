import { Request, Response } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import {
  ExamAttempt,
  Exam,
  ProgrammingQuestion,
  ProgrammingTestCase,
  CodeSubmission,
  StudentAnswer,
} from '../models';
import { sendSuccess, sendError } from '../utils/response';
import { ATTEMPT_STATUS, CODE_VERDICTS, PROGRAMMING_LANGUAGES, ProgrammingLanguage } from '../constants';
import { CompilerService } from '../services/compiler/compiler.service';
import { ProgrammingEvaluationService } from '../services/programmingEvaluation.service';
import { config } from '../config/env';

// Track execution rate limits in memory per attempt (e.g. max 15 runs/min)
const runRateLimits = new Map<string, { count: number; windowStart: number }>();

function checkRunRateLimit(attemptId: string): boolean {
  const now = Date.now();
  const record = runRateLimits.get(attemptId);
  if (!record || now - record.windowStart > 60000) {
    runRateLimits.set(attemptId, { count: 1, windowStart: now });
    return true;
  }
  if (record.count >= config.MAX_RUN_CODE_PER_MINUTE) {
    return false;
  }
  record.count++;
  return true;
}

const runCodeSchema = z.object({
  attemptId: z.string().min(1, 'Attempt ID is required'),
  submissionToken: z.string().min(1, 'Submission token is required'),
  questionId: z.string().min(1, 'Question ID is required'),
  language: z.enum([
    PROGRAMMING_LANGUAGES.C,
    PROGRAMMING_LANGUAGES.CPP,
    PROGRAMMING_LANGUAGES.JAVA,
    PROGRAMMING_LANGUAGES.PYTHON,
  ]),
  sourceCode: z.string().min(1, 'Source code cannot be empty'),
  customInput: z.string().optional(),
  useSampleTestCases: z.boolean().default(true),
});

const submitCodeSchema = z.object({
  attemptId: z.string().min(1, 'Attempt ID is required'),
  submissionToken: z.string().min(1, 'Submission token is required'),
  questionId: z.string().min(1, 'Question ID is required'),
  language: z.enum([
    PROGRAMMING_LANGUAGES.C,
    PROGRAMMING_LANGUAGES.CPP,
    PROGRAMMING_LANGUAGES.JAVA,
    PROGRAMMING_LANGUAGES.PYTHON,
  ]),
  sourceCode: z.string().min(1, 'Source code cannot be empty'),
  idempotencyKey: z.string().optional(),
});

export class CodeExecutionController {
  /**
   * Practice "Run Code" against sample inputs or user custom input.
   * Rate limited, strictly isolated, and never touches hidden test cases!
   */
  static async runCode(req: Request, res: Response): Promise<void> {
    const data = runCodeSchema.parse(req.body);

    const attempt = await ExamAttempt.findOne({
      _id: data.attemptId,
      submissionToken: data.submissionToken,
      status: ATTEMPT_STATUS.IN_PROGRESS,
    });

    if (!attempt) {
      sendError(res, 'Active exam attempt session not found or invalid token.', 404);
      return;
    }

    if (new Date() > attempt.expiresAt) {
      sendError(res, 'Examination time has expired.', 403);
      return;
    }

    if (!checkRunRateLimit(data.attemptId)) {
      sendError(
        res,
        `Rate limit exceeded: Maximum ${config.MAX_RUN_CODE_PER_MINUTE} run requests per minute allowed.`,
        429
      );
      return;
    }

    const progQ = await ProgrammingQuestion.findOne({ questionId: data.questionId });
    if (!progQ) {
      sendError(res, 'Programming question not found.', 404);
      return;
    }

    // Determine inputs to run against:
    // 1. If customInput is provided, run against customInput.
    // 2. Otherwise run against enabled sample test cases.
    let testRuns: { input: string; expectedOutput?: string; description?: string }[] = [];

    if (data.customInput !== undefined && data.customInput !== null && data.customInput.trim() !== '') {
      testRuns = [{ input: data.customInput, description: 'Custom Input' }];
    } else {
      const sampleCases = await ProgrammingTestCase.find({
        questionId: data.questionId,
        isSample: true,
        isEnabled: true,
      }).sort({ order: 1 });

      if (sampleCases.length > 0) {
        testRuns = sampleCases.map((s) => ({
          input: s.input,
          expectedOutput: s.expectedOutput,
          description: s.description || 'Sample Test Case',
        }));
      } else if (progQ.sampleInput) {
        testRuns = [{
          input: progQ.sampleInput,
          expectedOutput: progQ.sampleExpectedOutput,
          description: 'Sample Input',
        }];
      } else {
        testRuns = [{ input: '', description: 'Default Run' }];
      }
    }

    const results = [];
    for (const tr of testRuns) {
      const exec = await CompilerService.execute({
        language: data.language,
        sourceCode: data.sourceCode,
        stdin: tr.input,
        expectedOutput: tr.expectedOutput,
        timeLimitSeconds: progQ.timeLimitSeconds,
        memoryLimitMb: progQ.memoryLimitMb,
      });

      results.push({
        description: tr.description,
        input: tr.input,
        expectedOutput: tr.expectedOutput,
        actualOutput: exec.stdout,
        stderr: exec.stderr,
        compileOutput: exec.compileOutput,
        exitCode: exec.exitCode,
        timeMs: exec.timeMs,
        memoryKb: exec.memoryKb,
        verdict: exec.verdict,
        passed: exec.verdict === CODE_VERDICTS.ACCEPTED,
      });
    }

    sendSuccess(res, {
      results,
      summary: {
        total: results.length,
        passed: results.filter((r) => r.passed).length,
        hasCompileError: results.some((r) => r.verdict === CODE_VERDICTS.COMPILATION_ERROR),
      },
    });
  }

  /**
   * "Submit Solution" for final automated grading against all configured test cases.
   */
  static async submitSolution(req: Request, res: Response): Promise<void> {
    const data = submitCodeSchema.parse(req.body);

    const attempt = await ExamAttempt.findOne({
      _id: data.attemptId,
      submissionToken: data.submissionToken,
      status: ATTEMPT_STATUS.IN_PROGRESS,
    });

    if (!attempt) {
      sendError(res, 'Active exam attempt session not found.', 404);
      return;
    }

    if (new Date() > attempt.expiresAt) {
      sendError(res, 'Examination time has expired. Submissions are no longer accepted.', 403);
      return;
    }

    const progQ = await ProgrammingQuestion.findOne({ questionId: data.questionId });
    if (!progQ) {
      sendError(res, 'Programming question not found.', 404);
      return;
    }

    // Check submission count limit
    const previousSubmissionsCount = await CodeSubmission.countDocuments({
      attemptId: attempt._id,
      questionId: data.questionId,
      type: 'submit',
    });

    if (progQ.allowedAttempts > 0 && previousSubmissionsCount >= progQ.allowedAttempts) {
      sendError(
        res,
        `Maximum submission attempts (${progQ.allowedAttempts}) reached for this question.`,
        403
      );
      return;
    }

    // Prevent duplicate idempotent requests
    if (data.idempotencyKey) {
      const existing = await CodeSubmission.findOne({
        attemptId: attempt._id,
        idempotencyKey: data.idempotencyKey,
      });
      if (existing) {
        const sanitized = ProgrammingEvaluationService.sanitizeForStudent(existing);
        sendSuccess(res, sanitized, 'Existing submission retrieved.');
        return;
      }
    }

    // Create durable CodeSubmission record
    const submission = await CodeSubmission.create({
      examId: attempt.examId,
      questionId: data.questionId,
      attemptId: attempt._id,
      studentId: attempt.studentId,
      studentInfo: attempt.studentInfo,
      language: data.language,
      sourceCode: data.sourceCode,
      submissionNumber: previousSubmissionsCount + 1,
      type: 'submit',
      status: 'queued',
      verdict: CODE_VERDICTS.PENDING_EVALUATION,
      idempotencyKey: data.idempotencyKey,
    });

    // Evaluate submission against all enabled test cases
    const evaluatedSubmission = await ProgrammingEvaluationService.evaluateSubmission(submission._id);

    // Sanitize for student: strips all hidden test case inputs and expected outputs
    const sanitizedResult = ProgrammingEvaluationService.sanitizeForStudent(evaluatedSubmission);

    sendSuccess(res, sanitizedResult, 'Code evaluated successfully.', 201);
  }

  static async getSubmission(req: Request, res: Response): Promise<void> {
    const { submissionId } = req.params;

    const submission = await CodeSubmission.findById(submissionId);
    if (!submission) {
      sendError(res, 'Submission not found', 404);
      return;
    }

    const sanitized = ProgrammingEvaluationService.sanitizeForStudent(submission);
    sendSuccess(res, sanitized);
  }

  static async getAttemptSubmissions(req: Request, res: Response): Promise<void> {
    const { attemptId } = req.params;
    const { questionId } = req.query;

    const query: any = { attemptId, type: 'submit' };
    if (questionId) query.questionId = questionId;

    const submissions = await CodeSubmission.find(query).sort({ createdAt: -1 });
    const sanitized = submissions.map((s) => ProgrammingEvaluationService.sanitizeForStudent(s));

    sendSuccess(res, sanitized);
  }

  /**
   * Autosave / persist draft code for an exam attempt
   */
  static async saveDraftCode(req: Request, res: Response): Promise<void> {
    const { attemptId } = req.params;
    const { submissionToken, questionId, language, sourceCode } = req.body;

    if (!submissionToken || !questionId || !language) {
      sendError(res, 'Token, question ID, and language are required.', 400);
      return;
    }

    const attempt = await ExamAttempt.findOne({
      _id: attemptId,
      submissionToken,
      status: ATTEMPT_STATUS.IN_PROGRESS,
    });

    if (!attempt) {
      sendError(res, 'Active attempt session not found.', 404);
      return;
    }

    // Upsert programming draft in attempt
    const drafts = attempt.programmingDrafts || [];
    const existingIdx = drafts.findIndex(
      (d) => d.questionId.toString() === questionId.toString()
    );

    if (existingIdx >= 0) {
      drafts[existingIdx].language = language;
      drafts[existingIdx].sourceCode = sourceCode || '';
      drafts[existingIdx].lastSavedAt = new Date();
    } else {
      drafts.push({
        questionId: new mongoose.Types.ObjectId(questionId),
        language,
        sourceCode: sourceCode || '',
        lastSavedAt: new Date(),
      });
    }

    attempt.programmingDrafts = drafts;
    await attempt.save();

    sendSuccess(res, { saved: true, lastSavedAt: new Date() });
  }

  static async getDraftCode(req: Request, res: Response): Promise<void> {
    const { attemptId, questionId } = req.params;
    const { submissionToken } = req.query;

    const attempt = await ExamAttempt.findOne({
      _id: attemptId,
      submissionToken: String(submissionToken),
    });

    if (!attempt) {
      sendError(res, 'Attempt session not found.', 404);
      return;
    }

    const draft = (attempt.programmingDrafts || []).find(
      (d) => d.questionId.toString() === questionId.toString()
    );

    sendSuccess(res, draft || null);
  }
}
