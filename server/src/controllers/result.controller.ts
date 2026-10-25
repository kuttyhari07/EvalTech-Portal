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

  static async exportExamResultsCsv(req: AuthRequest, res: Response): Promise<void> {
    const { examId } = req.params;

    const exam = await Exam.findById(examId);
    if (!exam) {
      sendError(res, 'Exam not found', 404);
      return;
    }

    const results = await ExamResult.find({ examId }).sort({ totalScore: -1 });
    const attempts = await ExamAttempt.find({ examId });
    const attemptMap = new Map<string, any>();
    for (const a of attempts) {
      attemptMap.set(a._id.toString(), a);
    }

    const headers = [
      'Rank',
      'Student Name',
      'Roll Number',
      'Email',
      'Total Marks',
      'Max Marks',
      'Percentage (%)',
      'Result Status',
      'MCQ Marks',
      'Coding Marks',
      'Time Spent (min)',
      'Violations Count',
      'Submission Date',
    ];

    const rows = results.map((r, index) => {
      const attempt = r.attemptId ? attemptMap.get(r.attemptId.toString()) : null;
      const violationsCount =
        attempt?.clientEvents?.filter((e: any) =>
          ['tab_blur', 'tab_hidden', 'fullscreen_exit', 'devtools_opened'].includes(e.event)
        )?.length || 0;
      const timeSpentMin = attempt?.timeSpentSeconds ? (attempt.timeSpentSeconds / 60).toFixed(1) : '0';
      const mcqScore = r.totalScore - (r.programmingScore || 0);

      return [
        index + 1,
        `"${(r.studentInfo?.name || 'Student').replace(/"/g, '""')}"`,
        `"${(r.studentInfo?.rollNo || '-').replace(/"/g, '""')}"`,
        `"${(r.studentInfo?.email || '-').replace(/"/g, '""')}"`,
        r.totalScore,
        r.maxScore,
        `${r.percentage}%`,
        r.isPassed ? 'PASSED' : 'FAILED',
        mcqScore,
        r.programmingScore || 0,
        timeSpentMin,
        violationsCount,
        `"${new Date(r.evaluatedAt || r.createdAt).toLocaleString()}"`,
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const safeTitle = exam.title.replace(/[^a-zA-Z0-9_-]/g, '_');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="EvalTech_${safeTitle}_Results.csv"`);
    res.status(200).send(csvContent);
  }

  static async getStudentAnalytics(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user?.userId;
    const targetEmail = ((req.query.email as string) || req.user?.email || '').trim().toLowerCase();

    // Find all results for this student
    const filterOr: any[] = [];
    if (userId) filterOr.push({ studentId: userId });
    if (targetEmail) filterOr.push({ 'studentInfo.email': targetEmail });

    if (filterOr.length === 0) {
      sendSuccess(res, {
        overallStats: { totalExams: 0, totalQuestions: 0, correctQuestions: 0, overallAccuracy: 0 },
        masteryCategories: { strong: [], moderate: [], weak: [] },
        topicBreakdown: [],
        studyCoachRecommendations: 'Complete your first examination to see tailored study coach recommendations.',
        totalExamsTaken: 0,
        averagePercentage: 0,
        topics: [],
        coachingFeedback: { strengths: [], criticalGaps: [], recommendation: 'Complete your first examination to unlock analytics.' },
      });
      return;
    }

    const results = await ExamResult.find({ $or: filterOr }).populate('examId');

    // Aggregate topic performance
    const topicStatsMap = new Map<
      string,
      { subject: string; correct: number; total: number; marksEarned: number; marksMax: number }
    >();

    for (const r of results) {
      const examSubject = (r.examId as any)?.subject || 'General';
      for (const q of r.questionBreakdown || []) {
        const topicName = (q as any).topic || examSubject;
        const current = topicStatsMap.get(topicName) || {
          subject: examSubject,
          correct: 0,
          total: 0,
          marksEarned: 0,
          marksMax: 0,
        };

        current.total += 1;
        if (q.isCorrect) current.correct += 1;
        current.marksEarned += q.marksObtained || 0;
        current.marksMax += q.maxMarks || 1;

        topicStatsMap.set(topicName, current);
      }
    }

    const topics = Array.from(topicStatsMap.entries()).map(([topic, data]) => {
      const accuracy = data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0;
      let masteryLevel: 'strong' | 'moderate' | 'weak' = 'moderate';
      if (accuracy >= 75) masteryLevel = 'strong';
      else if (accuracy < 50) masteryLevel = 'weak';

      return {
        topic,
        subject: data.subject,
        totalQuestions: data.total,
        correctQuestions: data.correct,
        accuracyPercent: accuracy,
        accuracy,
        masteryLevel,
      };
    });

    // Sort weakest first for study recommendations
    topics.sort((a, b) => a.accuracyPercent - b.accuracyPercent);

    const weakTopics = topics.filter((t) => t.masteryLevel === 'weak');
    const moderateTopics = topics.filter((t) => t.masteryLevel === 'moderate');
    const strongTopics = topics.filter((t) => t.masteryLevel === 'strong');

    const totalQuestions = topics.reduce((acc, t) => acc + t.totalQuestions, 0);
    const correctQuestions = topics.reduce((acc, t) => acc + t.correctQuestions, 0);
    const overallAccuracy =
      totalQuestions > 0 ? Math.round((correctQuestions / totalQuestions) * 100) : 0;

    const coachingRecommendation =
      weakTopics.length > 0
        ? `Focus your upcoming study sessions on ${weakTopics
            .slice(0, 3)
            .map((t) => t.topic)
            .join(', ')}. Practice more coding problems and review fundamental concepts.`
        : 'Outstanding consistency across all examined topics! Continue daily mock practice to maintain peak retention.';

    const coachingFeedback = {
      strengths: strongTopics.map((t) => t.topic),
      criticalGaps: weakTopics.map((t) => t.topic),
      recommendation: coachingRecommendation,
    };

    sendSuccess(res, {
      overallStats: {
        totalExams: results.length,
        totalQuestions,
        correctQuestions,
        overallAccuracy,
      },
      masteryCategories: {
        strong: strongTopics.map((t) => t.topic),
        moderate: moderateTopics.map((t) => t.topic),
        weak: weakTopics.map((t) => t.topic),
      },
      topicBreakdown: topics.map((t) => ({
        topic: t.topic,
        subject: t.subject,
        totalQuestions: t.totalQuestions,
        correctQuestions: t.correctQuestions,
        accuracy: t.accuracyPercent,
        masteryLevel: t.masteryLevel,
      })),
      studyCoachRecommendations: coachingRecommendation,
      totalExamsTaken: results.length,
      averagePercentage:
        results.length > 0
          ? Math.round(results.reduce((acc, r) => acc + (r.percentage || 0), 0) / results.length)
          : 0,
      topics,
      coachingFeedback,
    });
  }
}
