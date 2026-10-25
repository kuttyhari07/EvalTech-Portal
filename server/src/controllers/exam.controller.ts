import { Request, Response } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { Exam, Question, ClassEnrollment, Student, ExamAttempt, StudentAnswer } from '../models';
import { AuthRequest } from '../middleware/auth';
import { sendSuccess, sendError } from '../utils/response';
import { EXAM_STATUS, ROLES } from '../constants';
import { EmailService } from '../services/email.service';
import { recordAuditLog } from '../utils/audit';
import { EvaluationService } from '../services/evaluation.service';
import { SebService } from '../services/seb.service';

function generateExamCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = 'EVT-';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export class ExamController {
  static async createExam(req: AuthRequest, res: Response): Promise<void> {
    const data = req.body;
    const userId = req.user!.userId;
    const orgId = req.user?.organizationId;

    if (!data.title || !data.subject || !data.durationMinutes) {
      sendError(res, 'Title, subject, and duration are required.', 400);
      return;
    }

    let examCode = generateExamCode();
    // Ensure uniqueness
    while (await Exam.findOne({ examCode })) {
      examCode = generateExamCode();
    }

    const exam = await Exam.create({
      title: data.title,
      description: data.description,
      examCode,
      creatorId: userId,
      organizationId: orgId,
      classIds: data.classIds || [],
      subject: data.subject,
      category: data.category,
      totalMarks: data.totalMarks || 100,
      passingMarks: data.passingMarks || 40,
      durationMinutes: data.durationMinutes || 60,
      startsAt: data.startsAt ? new Date(data.startsAt) : new Date(),
      endsAt: data.endsAt ? new Date(data.endsAt) : new Date(Date.now() + 7 * 24 * 3600 * 1000),
      maxAttempts: data.maxAttempts || 1,
      shuffleQuestions: Boolean(data.shuffleQuestions),
      shuffleOptions: Boolean(data.shuffleOptions),
      negativeMarking: data.negativeMarking || { enabled: false, penaltyPerQuestion: 0 },
      canRevisitQuestions: data.canRevisitQuestions !== false,
      releaseResultsMode: data.releaseResultsMode || 'immediate',
      showExplanationsAfterSubmission: data.showExplanationsAfterSubmission !== false,
      instructions: data.instructions,
      questions: data.questions || [],
      status: (data.status === EXAM_STATUS.PUBLISHED && data.questions && data.questions.length > 0) ? EXAM_STATUS.PUBLISHED : EXAM_STATUS.DRAFT,
      isPublicLinkEnabled: data.isPublicLinkEnabled !== false,
      requireSEB: Boolean(data.requireSEB),
      sebBrowserExamKey: data.sebBrowserExamKey?.trim() || undefined,
      sebConfigKey: data.sebConfigKey?.trim() || undefined,
      startPassword: data.startPassword?.trim() || undefined,
      exitPassword: data.exitPassword?.trim() || undefined,
    });

    await recordAuditLog({
      req,
      action: 'EXAM_CREATE',
      entity: 'Exam',
      entityId: exam._id.toString(),
      metadata: { title: exam.title, code: exam.examCode, questionCount: exam.questions.length },
    });

    sendSuccess(res, exam, 'Exam created successfully in draft mode.', 201);
  }

  static async listExams(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const orgId = req.user?.organizationId;
    const role = req.user!.role;
    const { status, classId, search } = req.query;

    const query: any = {};

    if (role === ROLES.SUPER_ADMIN) {
      if (req.query.organizationId) query.organizationId = req.query.organizationId;
    } else if (role === ROLES.ORG_ADMIN && orgId) {
      query.organizationId = orgId;
    } else {
      query.creatorId = userId;
    }

    if (status) query.status = status;
    if (classId) query.classIds = classId;
    if (search) {
      query.title = { $regex: search as string, $options: 'i' };
    }

    const exams = await Exam.find(query).sort({ createdAt: -1 }).populate('classIds', 'name code');
    sendSuccess(res, exams);
  }

  static async getExamById(req: AuthRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const exam = await Exam.findById(id)
      .populate('classIds', 'name code')
      .populate('questions.questionId');

    if (!exam) {
      sendError(res, 'Exam not found', 404);
      return;
    }

    sendSuccess(res, exam);
  }

  static async updateExam(req: AuthRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const data = req.body;
    const userId = req.user!.userId;
    const role = req.user!.role;

    const exam = await Exam.findById(id);
    if (!exam) {
      sendError(res, 'Exam not found', 404);
      return;
    }

    if (role !== ROLES.SUPER_ADMIN && role !== ROLES.ORG_ADMIN && exam.creatorId.toString() !== userId) {
      sendError(res, 'Unauthorized to update this exam', 403);
      return;
    }

    const updatedExam = await Exam.findByIdAndUpdate(id, { $set: data }, { new: true })
      .populate('classIds', 'name code')
      .populate('questions.questionId');

    await recordAuditLog({
      req,
      action: 'EXAM_UPDATE',
      entity: 'Exam',
      entityId: id,
      metadata: { title: updatedExam?.title, questionCount: updatedExam?.questions?.length },
    });

    sendSuccess(res, updatedExam, 'Exam updated successfully.');
  }

  static async deleteExam(req: AuthRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const userId = req.user!.userId;
    const role = req.user!.role;

    const exam = await Exam.findById(id);
    if (!exam) {
      sendError(res, 'Exam not found', 404);
      return;
    }

    if (role !== ROLES.SUPER_ADMIN && role !== ROLES.ORG_ADMIN && exam.creatorId.toString() !== userId) {
      sendError(res, 'Unauthorized to delete this exam', 403);
      return;
    }

    await Exam.findByIdAndDelete(id);

    await recordAuditLog({
      req,
      action: 'EXAM_DELETE',
      entity: 'Exam',
      entityId: id,
      metadata: { title: exam.title, code: exam.examCode },
    });

    sendSuccess(res, null, 'Exam deleted successfully.');
  }

  static async publishExam(req: AuthRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const { notifyStudents = true } = req.body;

    const exam = await Exam.findById(id);
    if (!exam) {
      sendError(res, 'Exam not found', 404);
      return;
    }

    if (exam.questions.length === 0) {
      sendError(res, 'Cannot publish an exam with no questions. Please add questions first.', 400);
      return;
    }

    exam.status = EXAM_STATUS.PUBLISHED;
    await exam.save();

    // Notify enrolled or staff students
    if (notifyStudents !== false) {
      let targetStudents: any[] = [];

      if (exam.classIds && exam.classIds.length > 0) {
        const enrollments = await ClassEnrollment.find({
          classId: { $in: exam.classIds },
          status: 'active',
        }).populate('studentId');

        for (const enr of enrollments) {
          if (enr.studentId) targetStudents.push(enr.studentId);
        }
      }

      // If no class assigned or no enrollments found, notify all students of this staff/organization
      if (targetStudents.length === 0) {
        const staffStudents = await Student.find({
          $or: [
            { createdByStaffId: req.user!.userId },
            ...(req.user?.organizationId ? [{ organizationId: req.user.organizationId }] : []),
          ],
          status: 'active',
        });
        targetStudents.push(...staffStudents);
      }

      const seenEmails = new Set<string>();
      for (const student of targetStudents) {
        if (student && student.email && !seenEmails.has(student.email.toLowerCase())) {
          seenEmails.add(student.email.toLowerCase());
          EmailService.sendExamNotification(
            student.email,
            `${student.firstName} ${student.lastName}`.trim(),
            exam.title,
            exam.examCode,
            exam.startsAt || new Date(),
            exam.durationMinutes
          ).catch(console.error);
        }
      }
    }

    await recordAuditLog({
      req,
      action: 'EXAM_PUBLISHED',
      entity: 'Exam',
      entityId: exam._id.toString(),
      metadata: { code: exam.examCode, notified: notifyStudents },
    });

    sendSuccess(res, exam, `Exam published! Access code is ${exam.examCode}`);
  }

  static async unpublishExam(req: AuthRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const exam = await Exam.findByIdAndUpdate(id, { status: EXAM_STATUS.DRAFT }, { new: true });
    sendSuccess(res, exam, 'Exam reverted to draft mode.');
  }

  /**
   * Public endpoint: Student inspects exam metadata before starting
   * Never leaks correct answers, explanations, or question text before attempt start!
   */
  static async getPublicExamByCode(req: Request, res: Response): Promise<void> {
    const { code } = req.params;

    const exam = await Exam.findOne({ examCode: code.toUpperCase().trim() });
    if (!exam) {
      sendError(res, 'Examination not found. Please verify the exam code.', 404);
      return;
    }

    if (exam.status !== EXAM_STATUS.PUBLISHED) {
      sendError(res, 'This exam is not yet active or has concluded.', 403);
      return;
    }

    const now = new Date();
    if (now > exam.endsAt) {
      sendError(res, 'The deadline for this examination has passed.', 403);
      return;
    }

    // Safe public representation
    const publicData = {
      id: exam._id,
      title: exam.title,
      description: exam.description,
      examCode: exam.examCode,
      subject: exam.subject,
      totalMarks: exam.totalMarks,
      passingMarks: exam.passingMarks,
      durationMinutes: exam.durationMinutes,
      startsAt: exam.startsAt,
      endsAt: exam.endsAt,
      instructions: exam.instructions,
      questionCount: exam.questions.length,
      negativeMarking: exam.negativeMarking,
      canRevisitQuestions: exam.canRevisitQuestions,
      requireStartPassword: Boolean(exam.startPassword),
      requireExitPassword: Boolean(exam.exitPassword),
      requireSEB: Boolean(exam.requireSEB),
    };

    sendSuccess(res, publicData);
  }

  /**
   * Live Proctoring & Exam Monitoring Dashboard for Staff
   */
  static async getLiveMonitoring(req: AuthRequest, res: Response): Promise<void> {
    const { id } = req.params;

    const exam = await Exam.findById(id);
    if (!exam) {
      sendError(res, 'Exam not found', 404);
      return;
    }

    const attempts = await ExamAttempt.find({ examId: id }).sort({ startedAt: -1 });

    const totalQuestions = exam.questions?.length || 0;
    const attemptIds = attempts.map((a) => a._id);

    // Fetch all student answers for these attempts to count answered questions
    const answers = await StudentAnswer.find({ attemptId: { $in: attemptIds }, isAnswered: true }, 'attemptId questionId');
    const answersCountMap = new Map<string, number>();
    for (const ans of answers) {
      const aId = ans.attemptId.toString();
      answersCountMap.set(aId, (answersCountMap.get(aId) || 0) + 1);
    }

    const now = new Date();
    let inProgressCount = 0;
    let submittedCount = 0;
    let flaggedViolationsCount = 0;

    const attemptsData = attempts.map((attempt) => {
      const isExpired = now > new Date(attempt.expiresAt);
      const isActive = attempt.status === 'in_progress' && !isExpired;

      if (isActive) inProgressCount++;
      else if (attempt.status === 'submitted' || attempt.status === 'evaluated') submittedCount++;

      // Violations detection
      const violations = (attempt.clientEvents || []).filter((e) =>
        ['tab_blur', 'tab_hidden', 'fullscreen_exit', 'devtools_opened'].includes(e.event)
      );

      if (violations.length > 0) flaggedViolationsCount++;

      const answeredCount =
        (answersCountMap.get(attempt._id.toString()) || 0) +
        (attempt.programmingDrafts?.filter((d) => d.sourceCode?.trim()?.length > 0)?.length || 0);

      const timeRemainingSeconds = Math.max(
        0,
        Math.floor((new Date(attempt.expiresAt).getTime() - now.getTime()) / 1000)
      );

      return {
        id: attempt._id,
        student: attempt.studentInfo,
        status: isActive ? 'in_progress' : isExpired ? 'timed_out' : attempt.status,
        startedAt: attempt.startedAt,
        expiresAt: attempt.expiresAt,
        submittedAt: attempt.submittedAt,
        timeSpentSeconds: attempt.timeSpentSeconds,
        timeRemainingSeconds,
        answeredCount: Math.min(answeredCount, totalQuestions),
        totalQuestions,
        progressPercent: totalQuestions > 0 ? Math.min(100, Math.round((answeredCount / totalQuestions) * 100)) : 0,
        violationsCount: violations.length,
        recentViolations: violations.slice(-5),
        ipAddress: attempt.ipAddress,
        userAgent: attempt.userAgent,
      };
    });

    sendSuccess(res, {
      exam: {
        id: exam._id,
        title: exam.title,
        examCode: exam.examCode,
        durationMinutes: exam.durationMinutes,
        totalQuestions,
        status: exam.status,
      },
      stats: {
        totalAttempts: attempts.length,
        inProgressCount,
        submittedCount,
        flaggedViolationsCount,
      },
      liveBroadcasts: exam.liveBroadcasts || [],
      attempts: attemptsData,
    });
  }

  /**
   * Broadcast an instant message to all candidates taking the exam
   */
  static async broadcastLiveMessage(req: AuthRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const { message } = req.body;

    if (!message || !message.trim()) {
      sendError(res, 'Announcement message is required', 400);
      return;
    }

    const exam = await Exam.findById(id);
    if (!exam) {
      sendError(res, 'Exam not found', 404);
      return;
    }

    const senderName = req.user?.dbUser?.name || 'Exam Proctor';
    const broadcastItem = {
      message: message.trim(),
      timestamp: new Date(),
      senderName,
    };

    if (!exam.liveBroadcasts) exam.liveBroadcasts = [];
    exam.liveBroadcasts.push(broadcastItem);
    await exam.save();

    sendSuccess(res, exam.liveBroadcasts, 'Broadcast sent to candidates successfully.');
  }

  /**
   * Proctor force-terminates a student attempt for cheating
   */
  static async forceTerminateAttempt(req: AuthRequest, res: Response): Promise<void> {
    const { id, attemptId } = req.params;
    const { reason } = req.body;

    const attempt = await ExamAttempt.findOne({ _id: attemptId, examId: id });
    if (!attempt) {
      sendError(res, 'Attempt not found for this exam', 404);
      return;
    }

    attempt.status = 'submitted';
    attempt.submittedAt = new Date();
    attempt.clientEvents.push({
      event: 'forced_termination_by_proctor',
      timestamp: new Date(),
      details: reason || 'Exam Proctor terminated session due to integrity violation',
    });
    await attempt.save();

    // Trigger evaluation
    await EvaluationService.evaluateAttempt(attempt._id).catch(() => {});

    sendSuccess(res, null, 'Attempt successfully terminated and submitted for evaluation.');
  }

  /**
   * Generates and downloads the Safe Exam Browser (.seb) configuration file
   */
  static async downloadSebConfig(req: Request, res: Response): Promise<void> {
    const { id, code } = req.params;

    let exam: any = null;
    if (code) {
      exam = await Exam.findOne({ examCode: String(code).toUpperCase().trim() });
    } else if (id) {
      exam = await Exam.findById(id);
    }

    if (!exam) {
      sendError(res, 'Exam not found', 404);
      return;
    }

    const origin = req.get('origin') || req.get('referer');
    let clientBaseUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    if (origin) {
      try {
        const parsed = new URL(origin);
        clientBaseUrl = `${parsed.protocol}//${parsed.host}`;
      } catch {}
    }

    const startUrl = `${clientBaseUrl}/exam/${exam.examCode}`;
    const quitUrl = `${clientBaseUrl}/exam/${exam.examCode}/submitted`;

    const sebXml = SebService.generateSebXml({
      examCode: exam.examCode,
      examTitle: exam.title,
      startUrl,
      quitUrl,
      exitPassword: exam.exitPassword,
      browserExamKey: exam.sebBrowserExamKey,
    });

    res.setHeader('Content-Type', 'application/seb');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="EvalTech-${exam.examCode}-SEB.seb"`
    );
    res.send(sebXml);
  }
}

