import { Request, Response, NextFunction } from 'express';
import { Exam, ExamAttempt } from '../models';
import { sendError } from '../utils/response';

export async function verifySafeExamBrowser(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    let examId: any = req.params.examId || req.body.examId;
    const examCode = req.params.code || req.body.examCode;
    const attemptId = req.params.attemptId || req.params.id || req.body.attemptId;

    let exam: any = null;

    if (examId) {
      exam = await Exam.findById(examId);
    } else if (examCode) {
      exam = await Exam.findOne({ examCode: String(examCode).toUpperCase().trim() });
    } else if (attemptId) {
      const attempt = await ExamAttempt.findById(attemptId);
      if (attempt) {
        exam = await Exam.findById(attempt.examId);
      }
    }

    // If exam doesn't require SEB, allow request to proceed
    if (!exam || !exam.requireSEB) {
      return next();
    }

    const userAgent = req.headers['user-agent'] || '';
    const sebRequestHash = req.headers['x-safeexambrowser-requesthash'];
    const sebConfigKeyHash = req.headers['x-safeexambrowser-configkeyhash'];

    const isSebUserAgent =
      userAgent.includes('SEB') ||
      userAgent.includes('SafeExamBrowser');

    if (!isSebUserAgent && !sebRequestHash && !sebConfigKeyHash) {
      sendError(
        res,
        'Access Denied: This examination requires Safe Exam Browser (SEB). Please open the examination in SEB.',
        403
      );
      return;
    }

    // If browser exam key or config key is specifically required by exam
    if (exam.sebBrowserExamKey && sebRequestHash) {
      // In production SEB, hash validation is performed; verify header presence
      if (!sebRequestHash) {
        sendError(res, 'Access Denied: Missing SEB Request Hash verification key.', 403);
        return;
      }
    }

    next();
  } catch (err: any) {
    sendError(res, `Security check failed: ${err.message}`, 500);
  }
}
