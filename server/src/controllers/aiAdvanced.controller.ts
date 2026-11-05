import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { sendSuccess, sendError } from '../utils/response';
import { AIAdvancedService } from '../services/aiAdvanced.service';
import { ExamAttempt, Exam, ExamResult, Question } from '../models';
import crypto from 'crypto';

export class AIAdvancedController {
  /**
   * 1. Generate Socratic Viva Questions for a submitted code
   */
  static async generateSocraticViva(req: Request, res: Response): Promise<void> {
    const { problemTitle, problemStatement, studentCode, language } = req.body;

    if (!studentCode || !problemStatement) {
      sendError(res, 'Student code and problem statement are required', 400);
      return;
    }

    try {
      const questions = await AIAdvancedService.generateSocraticViva(
        problemTitle || 'Programming Task',
        problemStatement,
        studentCode,
        language || 'python'
      );
      sendSuccess(res, questions);
    } catch (err: any) {
      sendError(res, err.message || 'Failed to generate Socratic Viva questions', 500);
    }
  }

  /**
   * 1b. Evaluate Student's Socratic Viva Defense Answer
   */
  static async evaluateSocraticViva(req: Request, res: Response): Promise<void> {
    const { question, studentResponse, originalCode, attemptId } = req.body;

    if (!question || !studentResponse) {
      sendError(res, 'Question and student defense response are required', 400);
      return;
    }

    try {
      const evaluation = await AIAdvancedService.evaluateSocraticViva(
        question,
        studentResponse,
        originalCode || ''
      );

      // If attemptId provided, record to attempt vivaRecords
      if (attemptId) {
        await ExamAttempt.findByIdAndUpdate(attemptId, {
          $push: {
            vivaRecords: {
              question,
              studentResponse,
              score: evaluation.score,
              feedback: evaluation.feedback,
            },
          },
        });
      }

      sendSuccess(res, evaluation);
    } catch (err: any) {
      sendError(res, err.message || 'Failed to evaluate viva response', 500);
    }
  }

  /**
   * 4. Real-time Adversarial Mutation Stress Test
   */
  static async runMutationTest(req: Request, res: Response): Promise<void> {
    const { problemTitle, problemStatement, studentCode, language, sampleInputs } = req.body;

    if (!studentCode || !problemStatement) {
      sendError(res, 'Code and problem statement are required for mutation test', 400);
      return;
    }

    try {
      const mutation = await AIAdvancedService.generateAdversarialMutation(
        problemTitle || 'Problem',
        problemStatement,
        studentCode,
        language || 'python',
        sampleInputs || []
      );
      sendSuccess(res, mutation);
    } catch (err: any) {
      sendError(res, err.message || 'Failed to generate adversarial test', 500);
    }
  }

  /**
   * 5. AI Co-Pilot Exam Assistant (Constrained Pair Programmer)
   */
  static async copilotAssist(req: Request, res: Response): Promise<void> {
    const { userPrompt, problemStatement, currentCode, language, attemptId, questionId } = req.body;

    if (!userPrompt || !problemStatement) {
      sendError(res, 'Prompt and problem statement are required', 400);
      return;
    }

    try {
      const assist = await AIAdvancedService.getCopilotAssist(
        userPrompt,
        problemStatement,
        currentCode || '',
        language || 'python'
      );

      // Record interaction log in attempt if available
      if (attemptId && questionId) {
        await ExamAttempt.findByIdAndUpdate(attemptId, {
          $push: {
            copilotLogs: {
              timestamp: new Date(),
              questionId: String(questionId),
              prompt: userPrompt,
              response: assist.message,
            },
          },
        });
      }

      sendSuccess(res, assist);
    } catch (err: any) {
      sendError(res, err.message || 'Co-pilot assistant service error', 500);
    }
  }

  /**
   * 2. Save Keystroke Snapshot for Thought Playback
   */
  static async saveKeystrokeSnapshot(req: Request, res: Response): Promise<void> {
    const { attemptId } = req.params;
    const { questionId, sourceLength, wpm, pasteDetected, codeSnippet } = req.body;

    if (!attemptId || !questionId) {
      sendError(res, 'AttemptId and QuestionId are required', 400);
      return;
    }

    try {
      await ExamAttempt.findByIdAndUpdate(attemptId, {
        $push: {
          keystrokeSnapshots: {
            timestamp: new Date(),
            questionId: String(questionId),
            sourceLength: Number(sourceLength) || 0,
            wpm: Number(wpm) || 0,
            pasteDetected: Boolean(pasteDetected),
            codeSnippet: codeSnippet ? String(codeSnippet).slice(0, 3000) : undefined,
          },
        },
      });

      sendSuccess(res, { recorded: true });
    } catch (err: any) {
      sendError(res, err.message || 'Failed to record keystroke snapshot', 500);
    }
  }

  /**
   * 2b. Get Thought Playback Timeline for Teacher Review
   */
  static async getThoughtPlayback(req: AuthRequest, res: Response): Promise<void> {
    const { attemptId } = req.params;

    const attempt = await ExamAttempt.findById(attemptId);
    if (!attempt) {
      sendError(res, 'Exam attempt not found', 404);
      return;
    }

    const snapshots = attempt.keystrokeSnapshots || [];
    let pasteCount = 0;
    let totalWpm = 0;
    snapshots.forEach((s) => {
      if (s.pasteDetected) pasteCount++;
      if (s.wpm) totalWpm += s.wpm;
    });

    const avgWpm = snapshots.length > 0 ? Math.round(totalWpm / snapshots.length) : 0;
    const typingScore = Math.max(20, Math.min(100, 100 - pasteCount * 15));
    const verdict =
      pasteCount > 2
        ? 'High copy-paste frequency detected'
        : typingScore > 80
        ? 'Natural cognitive cadence & steady typing evolution'
        : 'Moderate typing pacing';

    sendSuccess(res, {
      studentInfo: attempt.studentInfo,
      startedAt: attempt.startedAt,
      submittedAt: attempt.submittedAt,
      snapshots,
      metrics: {
        totalSnapshots: snapshots.length,
        avgWpm,
        pasteCount,
        typingScore,
        verdict,
      },
    });
  }

  /**
   * 6. Get Skill DNA & GitHub Portfolio Bundle
   */
  static async getPortfolioBundle(req: Request, res: Response): Promise<void> {
    const { resultId } = req.params;

    const result = await ExamResult.findById(resultId).populate('examId');
    if (!result) {
      sendError(res, 'Exam result not found', 404);
      return;
    }

    const exam: any = result.examId;
    const token =
      result.portfolioToken ||
      `evt_${crypto.randomBytes(8).toString('hex')}`;

    if (!result.portfolioToken) {
      result.portfolioToken = token;
      await result.save();
    }

    const verificationUrl = `https://eval-tech-portal.vercel.app/verify-credential/${token}`;

    const skillDna = AIAdvancedService.calculateSkillDna(
      result.percentage,
      (result.programmingScore / (result.programmingMaxScore || 1)) * 100,
      result.socraticViva?.score
    );

    const bundle = AIAdvancedService.generateGitHubPortfolioBundle(
      exam?.title || 'Coding Examination',
      result.studentInfo?.name || 'Student',
      exam?.examCode || 'EVT',
      result.totalScore,
      result.maxScore,
      result.percentage,
      result.questionBreakdown || [],
      verificationUrl
    );

    sendSuccess(res, {
      verificationToken: token,
      verificationUrl,
      skillDna,
      readmeContent: bundle.readmeContent,
      files: bundle.files,
    });
  }

  /**
   * 6b. Public Endpoint for Verified Credential Badge (LinkedIn / Social Proof)
   */
  static async getVerifiedCredential(req: Request, res: Response): Promise<void> {
    const { token } = req.params;

    const result = await ExamResult.findOne({ portfolioToken: token }).populate('examId');
    if (!result) {
      sendError(res, 'Invalid or expired verification credential token', 404);
      return;
    }

    const exam: any = result.examId;
    const skillDna = AIAdvancedService.calculateSkillDna(
      result.percentage,
      (result.programmingScore / (result.programmingMaxScore || 1)) * 100,
      result.socraticViva?.score
    );

    sendSuccess(res, {
      isVerified: true,
      issuedTo: result.studentInfo?.name,
      studentRollNo: result.studentInfo?.rollNo,
      examTitle: exam?.title,
      subject: exam?.subject,
      score: result.totalScore,
      maxScore: result.maxScore,
      percentage: result.percentage,
      isPassed: result.isPassed,
      evaluatedAt: result.evaluatedAt,
      skillDna,
      verificationHash: `SHA256:${crypto.createHash('sha256').update(token + result._id).digest('hex').slice(0, 32).toUpperCase()}`,
    });
  }
}
