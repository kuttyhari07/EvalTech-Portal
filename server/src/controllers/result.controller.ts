import { Request, Response } from 'express';
import { ExamResult, Exam, StudentAnswer, ExamAttempt, Question } from '../models';
import { AuthRequest } from '../middleware/auth';
import { sendSuccess, sendError } from '../utils/response';
import { EmailService } from '../services/email.service';
import { recordAuditLog } from '../utils/audit';
import { EvaluationService } from '../services/evaluation.service';

export class ResultController {
  static async getExamResults(req: AuthRequest, res: Response): Promise<void> {
    const { examId } = req.params;

    const exam = await Exam.findById(examId);
    if (!exam) {
      sendError(res, 'Exam not found', 404);
      return;
    }

    const results = await ExamResult.find({ examId }).sort({ totalScore: -1 });

    // Calculate analytics metrics
    const totalSubmissions = results.length;
    let totalScoreSum = 0;
    let passedCount = 0;
    let highestScore = 0;
    let lowestScore = totalSubmissions > 0 ? results[0].totalScore : 0;

    for (const r of results) {
      totalScoreSum += r.totalScore;
      if (r.isPassed) passedCount++;
      if (r.totalScore > highestScore) highestScore = r.totalScore;
      if (r.totalScore < lowestScore) lowestScore = r.totalScore;
    }

    const averageScore = totalSubmissions > 0 ? Number((totalScoreSum / totalSubmissions).toFixed(1)) : 0;
    const passPercentage = totalSubmissions > 0 ? Number(((passedCount / totalSubmissions) * 100).toFixed(1)) : 0;

    sendSuccess(res, {
      exam: {
        id: exam._id,
        title: exam.title,
        totalMarks: exam.totalMarks,
        passingMarks: exam.passingMarks,
        releaseResultsMode: exam.releaseResultsMode,
      },
      analytics: {
        totalSubmissions,
        averageScore,
        passPercentage,
        highestScore,
        lowestScore,
      },
      results,
    });
  }

  static async gradeSubjectiveQuestion(req: AuthRequest, res: Response): Promise<void> {
    const { attemptId, questionId } = req.params;
    const { marksAwarded, feedback } = req.body;

    if (marksAwarded === undefined || marksAwarded === null) {
      sendError(res, 'Marks awarded is required.', 400);
      return;
    }

    const studentAnswer = await StudentAnswer.findOne({ attemptId, questionId });
    if (!studentAnswer) {
      sendError(res, 'Student answer document not found.', 404);
      return;
    }

    studentAnswer.marksAwarded = Number(marksAwarded);
    studentAnswer.teacherFeedback = feedback;
    studentAnswer.isEvaluated = true;
    await studentAnswer.save();

    // Re-evaluate attempt to recalculate totalScore & pass status
    const updatedResult = await EvaluationService.evaluateAttempt(attemptId);

    sendSuccess(res, updatedResult, 'Grade updated successfully.');
  }

  static async toggleReleaseResults(req: AuthRequest, res: Response): Promise<void> {
    const { examId } = req.params;
    const { release } = req.body; // boolean

    const isReleased = Boolean(release);

    await ExamResult.updateMany(
      { examId },
      {
        $set: {
          isReleased,
          releasedAt: isReleased ? new Date() : null,
        },
      }
    );

    await recordAuditLog({
      req,
      action: isReleased ? 'RESULTS_RELEASED' : 'RESULTS_UNRELEASED',
      entity: 'ExamResult',
      metadata: { examId, isReleased },
    });

    sendSuccess(res, { isReleased }, isReleased ? 'All results released to students!' : 'Results hidden.');
  }

  static async emailResultsToStudents(req: AuthRequest, res: Response): Promise<void> {
    const { examId } = req.params;

    const exam = await Exam.findById(examId);
    if (!exam) {
      sendError(res, 'Exam not found', 404);
      return;
    }

    const results = await ExamResult.find({ examId, isReleased: true });
    if (results.length === 0) {
      sendError(res, 'No released results found to dispatch.', 400);
      return;
    }

    let sentCount = 0;
    for (const r of results) {
      if (r.studentInfo?.email) {
        EmailService.sendExamResultEmail(
          r.studentInfo.email,
          r.studentInfo.name,
          exam.title,
          r.totalScore,
          r.maxScore,
          r.percentage,
          r.isPassed,
          exam.examCode,
          {
            examDate: r.createdAt || r.evaluatedAt,
            programmingScore: r.programmingScore,
            programmingMaxScore: r.programmingMaxScore,
            evaluationStatus: r.evaluationStatus,
          }
        ).catch(console.error);

        r.emailSent = true;
        r.emailSentAt = new Date();
        await r.save();
        sentCount++;
      }
    }

    sendSuccess(res, { sentCount }, `Dispatched result emails to ${sentCount} students.`);
  }

  /**
   * Public/Student portal view of their released result
   */
  static async getStudentReleasedResult(req: Request, res: Response): Promise<void> {
    const { email, examCode } = req.query;

    if (!email || !examCode) {
      sendError(res, 'Email and Exam Code are required.', 400);
      return;
    }

    const exam = await Exam.findOne({ examCode: String(examCode).toUpperCase().trim() });
    if (!exam) {
      sendError(res, 'Exam not found.', 404);
      return;
    }

    const result = await ExamResult.findOne({
      examId: exam._id,
      'studentInfo.email': String(email).toLowerCase().trim(),
    });

    if (!result) {
      sendError(res, 'No submission found for this student and exam.', 404);
      return;
    }

    if (!result.isReleased) {
      sendError(res, 'The results for this exam have not been released by your instructor yet.', 403);
      return;
    }

    sendSuccess(res, {
      examTitle: exam.title,
      examSubject: exam.subject,
      student: result.studentInfo,
      totalScore: result.totalScore,
      maxScore: result.maxScore,
      percentage: result.percentage,
      isPassed: result.isPassed,
      programmingScore: result.programmingScore || 0,
      programmingMaxScore: result.programmingMaxScore || 0,
      evaluationStatus: result.evaluationStatus || 'completed',
      evaluatedAt: result.evaluatedAt,
      questionBreakdown: exam.showExplanationsAfterSubmission ? result.questionBreakdown : undefined,
    });
  }
}
