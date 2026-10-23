import { Response } from 'express';
import { z } from 'zod';
import { AIQuestionService, GeneratedQuestionItemSchema } from '../services/aiQuestion.service';
import { Question } from '../models';
import { AuthRequest } from '../middleware/auth';
import { sendSuccess, sendError } from '../utils/response';

const generateSchema = z.object({
  subject: z.string().min(1, 'Subject is required'),
  topic: z.string().min(1, 'Topic is required'),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
  count: z.number().min(1).max(20).default(5),
  questionTypes: z.array(z.string()).optional(),
  marksPerQuestion: z.number().min(1).default(1),
  language: z.string().default('English'),
});

export class AIController {
  static async generateQuestions(req: AuthRequest, res: Response): Promise<void> {
    const data = generateSchema.parse(req.body);
    const userId = req.user!.userId;
    const orgId = req.user?.organizationId;

    const questions = await AIQuestionService.generateQuestions({
      userId,
      organizationId: orgId,
      ...data,
    });

    sendSuccess(
      res,
      questions,
      `Generated ${questions.length} questions. Please review before saving to your question bank.`
    );
  }

  static async saveApprovedQuestions(req: AuthRequest, res: Response): Promise<void> {
    const { questions } = req.body;
    if (!Array.isArray(questions) || questions.length === 0) {
      sendError(res, 'No questions provided to save.', 400);
      return;
    }

    const userId = req.user!.userId;
    const orgId = req.user?.organizationId;

    const savedDocs = [];
    for (const q of questions) {
      const validated = GeneratedQuestionItemSchema.parse(q);
      const doc = await Question.create({
        ...validated,
        creatorId: userId,
        organizationId: orgId,
        isApproved: true,
        approvalStatus: 'approved',
        aiGenerated: true,
      });
      savedDocs.push(doc);
    }

    sendSuccess(
      res,
      savedDocs,
      `Successfully saved ${savedDocs.length} approved questions into your Question Bank.`,
      201
    );
  }

  static async assistantDraft(req: AuthRequest, res: Response): Promise<void> {
    const { subject, examTitle, durationMinutes } = req.body;

    const draftInstructions = `
1. Please read each question carefully before submitting your final response.
2. The examination duration is ${durationMinutes || 60} minutes. A live countdown timer is synchronized with the server.
3. Your answers are automatically saved every few seconds. You may review your answers before submitting.
4. Switching browser tabs, minimizing the screen, or unauthorized peripheral connections are strictly logged.
5. Once the time expires, your exam will be automatically submitted.
    `.trim();

    sendSuccess(res, { instructions: draftInstructions });
  }
}
