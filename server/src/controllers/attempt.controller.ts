import { Request, Response } from 'express';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { z } from 'zod';
import {
  Exam,
  ExamAttempt,
  StudentAnswer,
  Question,
  Student,
  ProgrammingQuestion,
  ProgrammingTestCase,
} from '../models';
import { sendSuccess, sendError } from '../utils/response';
import { EvaluationService } from '../services/evaluation.service';
import { ATTEMPT_STATUS, EXAM_STATUS, QUESTION_TYPES } from '../constants';

const startAttemptSchema = z.object({
  examCode: z.string().min(1, 'Exam code is required'),
  name: z.string().min(1, 'Full name is required'),
  email: z.string().email('Valid email is required'),
  rollNo: z.string().optional(),
  startPassword: z.string().optional(),
});

function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export class AttemptController {
  static async startOrResume(req: Request, res: Response): Promise<void> {
    const data = startAttemptSchema.parse(req.body);
    const email = data.email.toLowerCase().trim();

    const exam = await Exam.findOne({ examCode: data.examCode.toUpperCase().trim() });
    if (!exam || exam.status !== EXAM_STATUS.PUBLISHED) {
      sendError(res, 'Exam is not currently published or available.', 404);
      return;
    }

    const now = new Date();
    if (now > exam.endsAt) {
      sendError(res, 'This examination has concluded.', 403);
      return;
    }

    const userAgent = (req.headers['user-agent'] as string) || '';
    const isSEB = Boolean(
      userAgent.includes('SEB') ||
      userAgent.includes('SafeExamBrowser') ||
      req.headers['x-safeexambrowser-requesthash'] ||
      req.headers['x-safeexambrowser-configkeyhash'] ||
      (req.body as any)?.isSEB
    );

    // Check for an existing in-progress attempt
    let attempt = await ExamAttempt.findOne({
      examId: exam._id,
      'studentInfo.email': email,
      status: ATTEMPT_STATUS.IN_PROGRESS,
    });

    if (attempt) {
      if (isSEB && !attempt.isSEB) {
        attempt.isSEB = true;
        await attempt.save();
      }

      // Check if server timer expired while user was away
      if (now > attempt.expiresAt) {
        attempt.status = ATTEMPT_STATUS.TIMED_OUT;
        await attempt.save();
        await EvaluationService.evaluateAttempt(attempt._id);
        sendError(res, 'Your examination time has expired and your answers were automatically submitted.', 403);
        return;
      }
    } else {
      // If exam is protected by startPassword, verify it before creating new attempt
      if (exam.startPassword) {
        if (!data.startPassword || data.startPassword.trim() !== exam.startPassword.trim()) {
          sendError(
            res,
            'Incorrect exam start password. Please enter the valid password provided by your teacher.',
            401
          );
          return;
        }
      }

      // Check attempt count
      const existingCount = await ExamAttempt.countDocuments({
        examId: exam._id,
        'studentInfo.email': email,
      });

      if (existingCount >= exam.maxAttempts) {
        sendError(
          res,
          `You have already reached the maximum permitted attempts (${exam.maxAttempts}) for this exam.`,
          403
        );
        return;
      }

      // Check if student profile exists in DB
      const studentProfile = await Student.findOne({
        email,
        ...(exam.organizationId ? { organizationId: exam.organizationId } : {}),
      });

      const submissionToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + exam.durationMinutes * 60 * 1000);

      attempt = await ExamAttempt.create({
        examId: exam._id,
        studentId: studentProfile?._id,
        studentInfo: {
          name: data.name,
          email,
          rollNo: data.rollNo,
        },
        attemptNumber: existingCount + 1,
        startedAt: now,
        expiresAt,
        status: ATTEMPT_STATUS.IN_PROGRESS,
        ipAddress: req.ip || req.headers['x-forwarded-for']?.toString(),
        userAgent: req.headers['user-agent'],
        isSEB,
        submissionToken,
      });
    }

    // Fetch questions and strip answers
    const questionIds = exam.questions.map((q) => q.questionId);
    const questions = await Question.find({ _id: { $in: questionIds } });
    const questionMap = new Map<string, any>();
    const programmingQIds: mongoose.Types.ObjectId[] = [];
    for (const q of questions) {
      questionMap.set(q._id.toString(), q);
      if (q.type === QUESTION_TYPES.PROGRAMMING) {
        programmingQIds.push(q._id as mongoose.Types.ObjectId);
      }
    }

    // Load ProgrammingQuestion details and visible/sample test cases
    const progDetailsMap = new Map<string, any>();
    const sampleTestCasesMap = new Map<string, any[]>();

    if (programmingQIds.length > 0) {
      const progQuestions = await ProgrammingQuestion.find({
        questionId: { $in: programmingQIds },
      });
      for (const pq of progQuestions) {
        progDetailsMap.set(pq.questionId.toString(), pq);
      }

      // Strictly load ONLY non-hidden test cases for students
      const visibleTestCases = await ProgrammingTestCase.find({
        questionId: { $in: programmingQIds },
        isHidden: false,
        isEnabled: true,
      }).sort({ order: 1 });

      for (const tc of visibleTestCases) {
        const qIdStr = tc.questionId.toString();
        if (!sampleTestCasesMap.has(qIdStr)) {
          sampleTestCasesMap.set(qIdStr, []);
        }
        sampleTestCasesMap.get(qIdStr)!.push({
          id: tc._id,
          input: tc.input,
          expectedOutput: tc.expectedOutput,
          isSample: tc.isSample,
          description: tc.description,
        });
      }
    }

    let preparedQuestions = exam.questions.map((item) => {
      const q = questionMap.get(item.questionId.toString());
      if (!q) return null;

      let options = q.options ? [...q.options] : [];
      if (exam.shuffleOptions) {
        options = shuffleArray(options);
      }

      let programmingDetails: any = undefined;
      if (q.type === QUESTION_TYPES.PROGRAMMING) {
        const pd = progDetailsMap.get(q._id.toString());
        if (pd) {
          programmingDetails = {
            title: pd.title || q.title,
            problemStatement: pd.problemStatement || q.text,
            problemDescriptionMarkdown: pd.problemDescriptionMarkdown || '',
            inputFormat: pd.inputFormat || '',
            outputFormat: pd.outputFormat || '',
            constraints: pd.constraints || '',
            supportedLanguages: pd.supportedLanguages,
            starterCode: pd.starterCode,
            executionMode: pd.executionMode,
            sampleInput: pd.sampleInput,
            sampleExpectedOutput: pd.sampleExpectedOutput,
            sampleExplanation: pd.sampleExplanation,
            timeLimitSeconds: pd.timeLimitSeconds,
            memoryLimitMb: pd.memoryLimitMb,
            allowedAttempts: pd.allowedAttempts,
            scoringPolicy: pd.scoringPolicy,
            sampleTestCases: sampleTestCasesMap.get(q._id.toString()) || [],
          };
        }
      }

      return {
        id: q._id,
        title: q.title,
        text: q.text,
        type: q.type,
        codeSnippet: q.codeSnippet,
        options,
        marks: item.marks || q.defaultMarks,
        negativeMarks: exam.negativeMarking.enabled ? item.negativeMarks : 0,
        order: item.order,
        programmingDetails,
      };
    }).filter(Boolean);

    if (exam.shuffleQuestions) {
      preparedQuestions = shuffleArray(preparedQuestions);
    }

    // Load any previously saved answers for this attempt
    const existingAnswers = await StudentAnswer.find({ attemptId: attempt._id });
    const savedAnswersMap: Record<string, any> = {};
    const reviewStatusMap: Record<string, boolean> = {};

    for (const ans of existingAnswers) {
      savedAnswersMap[ans.questionId.toString()] = ans.answerValue;
      if (ans.isMarkedForReview) {
        reviewStatusMap[ans.questionId.toString()] = true;
      }
    }

    // Load draft code for programming questions
    const programmingDraftsMap: Record<string, { language: string; sourceCode: string }> = {};
    for (const draft of attempt.programmingDrafts || []) {
      programmingDraftsMap[draft.questionId.toString()] = {
        language: draft.language,
        sourceCode: draft.sourceCode,
      };
    }

    const remainingMilliseconds = Math.max(0, attempt.expiresAt.getTime() - Date.now());

    sendSuccess(res, {
      attemptId: attempt._id,
      submissionToken: attempt.submissionToken,
      exam: {
        id: exam._id,
        title: exam.title,
        description: exam.description,
        examCode: exam.examCode,
        durationMinutes: exam.durationMinutes,
        instructions: exam.instructions,
        totalMarks: exam.totalMarks,
        passingMarks: exam.passingMarks,
        canRevisitQuestions: exam.canRevisitQuestions,
        requireSEB: exam.requireSEB,
        requireStartPassword: Boolean(exam.startPassword),
        requireExitPassword: Boolean(exam.exitPassword),
      },
      student: attempt.studentInfo,
      questions: preparedQuestions,
      savedAnswers: savedAnswersMap,
      reviewStatus: reviewStatusMap,
      programmingDrafts: programmingDraftsMap,
      expiresAt: attempt.expiresAt,
      remainingMilliseconds,
      serverTime: new Date(),
    });
  }

  static async saveAnswer(req: Request, res: Response): Promise<void> {
    const { id } = req.params; // attemptId
    const { submissionToken, questionId, answerValue, isMarkedForReview } = req.body;

    if (!submissionToken || !questionId) {
      sendError(res, 'Token and question ID are required.', 400);
      return;
    }

    const attempt = await ExamAttempt.findOne({
      _id: id,
      submissionToken,
      status: ATTEMPT_STATUS.IN_PROGRESS,
    });

    if (!attempt) {
      sendError(res, 'Active attempt session not found.', 404);
      return;
    }

    // Check timer
    if (new Date() > attempt.expiresAt) {
      attempt.status = ATTEMPT_STATUS.TIMED_OUT;
      await attempt.save();
      await EvaluationService.evaluateAttempt(attempt._id);
      sendError(res, 'Exam time has expired.', 403);
      return;
    }

    const isAnswered =
      answerValue !== null &&
      answerValue !== undefined &&
      (Array.isArray(answerValue) ? answerValue.length > 0 : String(answerValue).trim() !== '');

    // Upsert StudentAnswer
    await StudentAnswer.findOneAndUpdate(
      { attemptId: attempt._id, questionId },
      {
        attemptId: attempt._id,
        examId: attempt.examId,
        questionId,
        answerValue,
        isAnswered,
        isMarkedForReview: Boolean(isMarkedForReview),
        savedAt: new Date(),
      },
      { upsert: true }
    );

    sendSuccess(res, { saved: true, savedAt: new Date() });
  }

  static async recordClientEvent(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const { submissionToken, event, details, isSEB } = req.body;

    if (!submissionToken || !event) {
      sendError(res, 'Invalid event payload', 400);
      return;
    }

    const userAgent = (req.headers['user-agent'] as string) || '';
    const detectedSEB = Boolean(
      isSEB ||
      event === 'seb_detected' ||
      userAgent.includes('SEB') ||
      userAgent.includes('SafeExamBrowser') ||
      req.headers['x-safeexambrowser-requesthash'] ||
      req.headers['x-safeexambrowser-configkeyhash']
    );

    const updateOps: any = {
      $push: {
        clientEvents: {
          event,
          timestamp: new Date(),
          details,
        },
      },
    };

    if (detectedSEB) {
      updateOps.$set = { isSEB: true };
    }

    await ExamAttempt.updateOne(
      { _id: id, submissionToken },
      updateOps
    );

    sendSuccess(res, { recorded: true });
  }

  static async submitAttempt(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const { submissionToken, timeSpentSeconds = 0, exitPassword } = req.body;

    const attempt = await ExamAttempt.findOne({ _id: id, submissionToken });
    if (!attempt) {
      sendError(res, 'Attempt session not found.', 404);
      return;
    }

    // Verify exit password if configured on exam
    const exam = await Exam.findById(attempt.examId);
    if (exam?.exitPassword) {
      if (!exitPassword || exitPassword.trim() !== exam.exitPassword.trim()) {
        sendError(
          res,
          'Incorrect exam exit password. An authorized invigilator or teacher must enter the exit password to finish/leave.',
          401
        );
        return;
      }
    }

    // Idempotent: if already submitted, return success directly
    if (attempt.status === ATTEMPT_STATUS.SUBMITTED || attempt.status === ATTEMPT_STATUS.EVALUATED) {
      sendSuccess(res, { submitted: true, message: 'Exam was already submitted.' });
      return;
    }

    attempt.status = ATTEMPT_STATUS.SUBMITTED;
    attempt.submittedAt = new Date();
    attempt.timeSpentSeconds = timeSpentSeconds;
    await attempt.save();

    // Trigger immediate evaluation
    const result = await EvaluationService.evaluateAttempt(attempt._id);

    sendSuccess(res, {
      submitted: true,
      result: result.isReleased
        ? {
            totalScore: result.totalScore,
            maxScore: result.maxScore,
            percentage: result.percentage,
            isPassed: result.isPassed,
          }
        : null,
      message: 'Examination submitted successfully!',
    });
  }
}
