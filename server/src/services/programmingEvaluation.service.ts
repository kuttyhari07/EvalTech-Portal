import mongoose from 'mongoose';
import {
  CodeSubmission,
  ICodeSubmission,
  ITestResultItem,
  ProgrammingQuestion,
  ProgrammingTestCase,
  StudentAnswer,
} from '../models';
import {
  CODE_VERDICTS,
  CodeVerdict,
  SCORING_POLICIES,
} from '../constants';
import { CompilerService } from './compiler/compiler.service';
import { compareOutputs } from './compiler/outputNormalizer';

export class ProgrammingEvaluationService {
  /**
   * Evaluates a student's code submission against all enabled test cases
   * (sample, visible, and hidden) with scoring weight calculations and idempotency.
   */
  static async evaluateSubmission(
    submissionId: string | mongoose.Types.ObjectId
  ): Promise<ICodeSubmission> {
    const submission = await CodeSubmission.findById(submissionId);
    if (!submission) {
      throw new Error(`Submission not found: ${submissionId}`);
    }

    // Idempotency: if already completed, return existing evaluated record
    if (submission.status === 'completed' && submission.evaluatedAt) {
      return submission;
    }

    submission.status = 'processing';
    await submission.save();

    const progQ = await ProgrammingQuestion.findOne({ questionId: submission.questionId });
    if (!progQ) {
      submission.status = 'failed';
      submission.verdict = CODE_VERDICTS.INTERNAL_EVALUATION_ERROR;
      await submission.save();
      throw new Error(`Programming question metadata not found for question: ${submission.questionId}`);
    }

    // Load all enabled test cases ordered by order
    const testCases = await ProgrammingTestCase.find({
      questionId: submission.questionId,
      isEnabled: true,
    }).sort({ order: 1 });

    if (testCases.length === 0) {
      // If no test cases are configured, compile and execute against empty stdin
      const execResult = await CompilerService.execute({
        language: submission.language,
        sourceCode: submission.sourceCode,
        stdin: '',
        timeLimitSeconds: progQ.timeLimitSeconds,
        memoryLimitMb: progQ.memoryLimitMb,
      });

      const passed = execResult.verdict === CODE_VERDICTS.ACCEPTED;
      submission.status = 'completed';
      submission.verdict = execResult.verdict;
      submission.marksObtained = passed ? progQ.defaultMarks : 0;
      submission.totalMarks = progQ.defaultMarks;
      submission.passedTestCasesCount = passed ? 1 : 0;
      submission.totalTestCasesCount = 1;
      submission.executionMetadata = {
        executionTimeMs: execResult.timeMs,
        memoryKb: execResult.memoryKb,
        compileOutput: execResult.compileOutput,
      };
      submission.evaluatedAt = new Date();
      await submission.save();

      await this.updateStudentAnswer(submission, progQ.defaultMarks);
      return submission;
    }

    const testResults: ITestResultItem[] = [];
    let totalWeight = 0;
    let earnedWeight = 0;
    let passedCount = 0;
    let hasCompilationError = false;
    let compilationErrorMessage = '';
    let firstFailingVerdict: CodeVerdict | null = null;
    let maxExecutionTime = 0;
    let maxMemory = 0;

    for (const tc of testCases) {
      const weight = tc.weight > 0 ? tc.weight : 1;
      totalWeight += weight;

      // If already compilation error, subsequent tests fail with compilation error immediately
      if (hasCompilationError) {
        testResults.push({
          testCaseId: tc._id,
          isSample: tc.isSample,
          isHidden: tc.isHidden,
          passed: false,
          verdict: CODE_VERDICTS.COMPILATION_ERROR,
          compileError: compilationErrorMessage,
        });
        continue;
      }

      const execResult = await CompilerService.execute({
        language: submission.language,
        sourceCode: submission.sourceCode,
        stdin: tc.input || '',
        expectedOutput: tc.expectedOutput,
        timeLimitSeconds: progQ.timeLimitSeconds,
        memoryLimitMb: progQ.memoryLimitMb,
      });

      if (execResult.timeMs > maxExecutionTime) maxExecutionTime = execResult.timeMs;
      if (execResult.memoryKb > maxMemory) maxMemory = execResult.memoryKb;

      if (execResult.verdict === CODE_VERDICTS.COMPILATION_ERROR) {
        hasCompilationError = true;
        compilationErrorMessage = execResult.compileOutput || execResult.stderr;
        testResults.push({
          testCaseId: tc._id,
          isSample: tc.isSample,
          isHidden: tc.isHidden,
          passed: false,
          verdict: CODE_VERDICTS.COMPILATION_ERROR,
          compileError: compilationErrorMessage,
        });
        continue;
      }

      const passed = execResult.verdict === CODE_VERDICTS.ACCEPTED;

      if (passed) {
        passedCount++;
        earnedWeight += weight;
      } else if (!firstFailingVerdict) {
        firstFailingVerdict = execResult.verdict;
      }

      testResults.push({
        testCaseId: tc._id,
        isSample: tc.isSample,
        isHidden: tc.isHidden,
        passed,
        verdict: execResult.verdict,
        executionTimeMs: execResult.timeMs,
        memoryKb: execResult.memoryKb,
        // Only preserve stdout/expectedOutput for non-hidden or sample cases
        studentOutput: tc.isHidden ? undefined : execResult.stdout,
        expectedOutput: tc.isHidden ? undefined : tc.expectedOutput,
        runtimeError: execResult.stderr || undefined,
        compileError: execResult.compileOutput || undefined,
      });
    }

    // Determine Final Score and Verdict
    let finalVerdict: CodeVerdict = CODE_VERDICTS.ACCEPTED;
    let finalMarks = 0;
    const maxMarks = progQ.defaultMarks;

    if (hasCompilationError) {
      finalVerdict = CODE_VERDICTS.COMPILATION_ERROR;
      finalMarks = 0;
    } else if (passedCount === testCases.length) {
      finalVerdict = CODE_VERDICTS.ACCEPTED;
      finalMarks = maxMarks;
    } else if (passedCount === 0) {
      finalVerdict = firstFailingVerdict || CODE_VERDICTS.WRONG_ANSWER;
      finalMarks = 0;
    } else {
      // Partial passes
      if (progQ.scoringPolicy === SCORING_POLICIES.ALL_OR_NOTHING) {
        finalVerdict = CODE_VERDICTS.WRONG_ANSWER;
        finalMarks = 0;
      } else {
        finalVerdict = CODE_VERDICTS.PARTIALLY_CORRECT;
        const ratio = totalWeight > 0 ? earnedWeight / totalWeight : 0;
        finalMarks = Number((ratio * maxMarks).toFixed(2));
      }
    }

    submission.status = 'completed';
    submission.verdict = finalVerdict;
    submission.marksObtained = finalMarks;
    submission.totalMarks = maxMarks;
    submission.passedTestCasesCount = passedCount;
    submission.totalTestCasesCount = testCases.length;
    submission.testResults = testResults;
    submission.executionMetadata = {
      executionTimeMs: maxExecutionTime,
      memoryKb: maxMemory,
      compileOutput: compilationErrorMessage || undefined,
    };
    submission.evaluatedAt = new Date();
    await submission.save();

    await this.updateStudentAnswer(submission, maxMarks);

    return submission;
  }

  private static async updateStudentAnswer(
    submission: ICodeSubmission,
    maxMarks: number
  ): Promise<void> {
    await StudentAnswer.findOneAndUpdate(
      { attemptId: submission.attemptId, questionId: submission.questionId },
      {
        attemptId: submission.attemptId,
        examId: submission.examId,
        questionId: submission.questionId,
        answerValue: {
          language: submission.language,
          sourceCode: submission.sourceCode,
          submissionId: submission._id,
          verdict: submission.verdict,
          marksObtained: submission.marksObtained,
          maxMarks,
          passedTestCases: submission.passedTestCasesCount,
          totalTestCases: submission.totalTestCasesCount,
        },
        isAnswered: true,
        isEvaluated: true,
        marksAwarded: submission.marksObtained,
        savedAt: new Date(),
      },
      { upsert: true }
    );
  }

  /**
   * Sanitizes a submission for student consumption, strictly stripping
   * all hidden test case inputs, expected outputs, and private diagnostics.
   */
  static sanitizeForStudent(submission: ICodeSubmission): any {
    const doc = submission.toObject ? submission.toObject() : submission;
    const sanitizedTestResults = (doc.testResults || []).map((t: any) => {
      if (t.isHidden) {
        return {
          testCaseId: t.testCaseId,
          isSample: false,
          isHidden: true,
          passed: t.passed,
          verdict: t.verdict,
          executionTimeMs: t.executionTimeMs,
          memoryKb: t.memoryKb,
          // Never leak hidden test input, expected output, or stdout!
        };
      }
      return t;
    });

    return {
      ...doc,
      testResults: sanitizedTestResults,
    };
  }
}
