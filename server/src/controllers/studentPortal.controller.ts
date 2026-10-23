import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import {
  Student,
  Exam,
  ExamAttempt,
  ExamResult,
  ClassEnrollment,
} from '../models';
import { sendSuccess, sendError } from '../utils/response';
import { ATTEMPT_STATUS, EXAM_STATUS, ROLES } from '../constants';

export class StudentPortalController {
  /**
   * Returns assigned exams, class enrollments, and past completed results for the logged-in student
   */
  static async getDashboard(req: AuthRequest, res: Response): Promise<void> {
    const studentId = req.user!.userId;
    const student = await Student.findById(studentId);
    if (!student) {
      sendError(res, 'Student account not found.', 404);
      return;
    }

    // 1. Get student's enrolled classes
    const enrollments = await ClassEnrollment.find({
      studentId: student._id,
      status: 'active',
    }).populate('classId', 'name code description');

    const classIds = enrollments
      .map((e: any) => e.classId?._id)
      .filter(Boolean);

    // 2. Find exams assigned to this student:
    // Match published exams that target student's enrolled classes, or created by student's staff / in student's org
    const examQuery: any = {
      status: EXAM_STATUS.PUBLISHED,
      $or: [
        { classIds: { $in: classIds } },
        { creatorId: student.createdByStaffId },
        ...(student.organizationId ? [{ organizationId: student.organizationId }] : []),
      ],
    };

    const assignedExams = await Exam.find(examQuery)
      .sort({ startsAt: -1 })
      .populate('classIds', 'name code');

    // 3. Find attempts & results made by this student
    const attempts = await ExamAttempt.find({
      $or: [{ studentId: student._id }, { 'studentInfo.email': student.email }],
    }).sort({ createdAt: -1 });

    const results = await ExamResult.find({
      $or: [{ studentId: student._id }, { 'studentInfo.email': student.email }],
    })
      .sort({ evaluatedAt: -1 })
      .populate('examId', 'title subject examCode totalMarks passingMarks');

    // 4. Map assigned exams with current student attempt status
    const now = new Date();
    const mappedExams = assignedExams.map((exam) => {
      const examAttempts = attempts.filter(
        (a) => a.examId.toString() === exam._id.toString()
      );
      const activeAttempt = examAttempts.find(
        (a) => a.status === ATTEMPT_STATUS.IN_PROGRESS && now <= a.expiresAt
      );
      const examResult = results.find(
        (r) =>
          (r.examId as any)?._id?.toString() === exam._id.toString() ||
          r.examId?.toString() === exam._id.toString()
      );

      let status = 'upcoming';
      if (now >= exam.startsAt && now <= exam.endsAt) {
        status = 'active';
      } else if (now > exam.endsAt) {
        status = 'concluded';
      }

      let studentState: 'not_started' | 'in_progress' | 'completed' = 'not_started';
      if (examResult || examAttempts.some((a) => a.status === ATTEMPT_STATUS.SUBMITTED || a.status === ATTEMPT_STATUS.EVALUATED)) {
        studentState = 'completed';
      } else if (activeAttempt) {
        studentState = 'in_progress';
      }

      return {
        _id: exam._id,
        title: exam.title,
        description: exam.description,
        examCode: exam.examCode,
        subject: exam.subject,
        totalMarks: exam.totalMarks,
        passingMarks: exam.passingMarks,
        durationMinutes: exam.durationMinutes,
        startsAt: exam.startsAt,
        endsAt: exam.endsAt,
        questionCount: exam.questions.length,
        requireStartPassword: Boolean(exam.startPassword),
        requireExitPassword: Boolean(exam.exitPassword),
        requireSEB: Boolean(exam.requireSEB),
        classes: exam.classIds,
        examStatus: status,
        studentState,
        attemptsCount: examAttempts.length,
        maxAttempts: exam.maxAttempts,
        activeAttemptId: activeAttempt?._id,
        myResult: examResult
          ? {
              totalScore: examResult.totalScore,
              maxScore: examResult.maxScore,
              percentage: examResult.percentage,
              isPassed: examResult.isPassed,
              programmingScore: examResult.programmingScore,
              programmingMaxScore: examResult.programmingMaxScore,
              isReleased: examResult.isReleased,
              evaluatedAt: examResult.evaluatedAt,
            }
          : null,
      };
    });

    sendSuccess(res, {
      student: {
        _id: student._id,
        name: `${student.firstName} ${student.lastName}`.trim(),
        email: student.email,
        studentIdNumber: student.studentIdNumber,
        phone: student.phone,
        passwordChanged: student.passwordChanged,
        enrolledClasses: enrollments.map((e: any) => e.classId).filter(Boolean),
      },
      assignedExams: mappedExams,
      pastResults: results.map((r) => ({
        _id: r._id,
        examId: (r.examId as any)?._id || r.examId,
        examTitle: (r.examId as any)?.title || 'Examination',
        examCode: (r.examId as any)?.examCode || '',
        subject: (r.examId as any)?.subject || '',
        totalScore: r.totalScore,
        maxScore: r.maxScore,
        percentage: r.percentage,
        isPassed: r.isPassed,
        programmingScore: r.programmingScore,
        programmingMaxScore: r.programmingMaxScore,
        isReleased: r.isReleased,
        evaluatedAt: r.evaluatedAt,
      })),
    });
  }

  /**
   * Returns cohort leaderboard and high scores partitioned by exam
   */
  static async getLeaderboard(req: AuthRequest, res: Response): Promise<void> {
    const studentId = req.user!.userId;
    const student = await Student.findById(studentId);
    if (!student) {
      sendError(res, 'Student account not found.', 404);
      return;
    }

    const { examId } = req.query;

    // Get all published exams accessible to this student for the exam selector
    const enrollments = await ClassEnrollment.find({
      studentId: student._id,
      status: 'active',
    });
    const classIds = enrollments.map((e) => e.classId);

    const availableExams = await Exam.find({
      status: EXAM_STATUS.PUBLISHED,
      $or: [
        { classIds: { $in: classIds } },
        { creatorId: student.createdByStaffId },
        ...(student.organizationId ? [{ organizationId: student.organizationId }] : []),
      ],
    })
      .select('title examCode subject totalMarks startsAt')
      .sort({ startsAt: -1 });

    if (availableExams.length === 0) {
      sendSuccess(res, {
        exams: [],
        selectedExam: null,
        leaderboard: [],
        myRank: null,
      });
      return;
    }

    // Determine target exam: specific examId or first available
    const targetExamId =
      examId && availableExams.some((e) => e._id.toString() === examId.toString())
        ? examId
        : availableExams[0]._id;

    const selectedExam = availableExams.find(
      (e) => e._id.toString() === targetExamId.toString()
    );

    // Fetch all exam results for this exam
    const results = await ExamResult.find({ examId: targetExamId })
      .sort({ totalScore: -1, percentage: -1, evaluatedAt: 1 })
      .limit(100);

    let currentStudentRank: number | null = null;

    const leaderboard = results.map((r, index) => {
      const isMe =
        r.studentInfo.email?.toLowerCase() === student.email.toLowerCase() ||
        r.studentId?.toString() === student._id.toString();

      if (isMe && currentStudentRank === null) {
        currentStudentRank = index + 1;
      }

      return {
        rank: index + 1,
        studentName: r.studentInfo.name,
        rollNo: r.studentInfo.rollNo || '—',
        email: isMe ? r.studentInfo.email : undefined,
        totalScore: r.totalScore,
        maxScore: r.maxScore,
        percentage: r.percentage,
        isPassed: r.isPassed,
        programmingScore: r.programmingScore,
        programmingMaxScore: r.programmingMaxScore,
        isCurrentStudent: isMe,
        evaluatedAt: r.evaluatedAt,
      };
    });

    sendSuccess(res, {
      exams: availableExams,
      selectedExam,
      leaderboard,
      myRank: currentStudentRank,
      totalParticipants: results.length,
      highestScore: results.length > 0 ? results[0].totalScore : 0,
      averagePercentage:
        results.length > 0
          ? Math.round(
              results.reduce((acc, curr) => acc + (curr.percentage || 0), 0) /
                results.length
            )
          : 0,
    });
  }
}
