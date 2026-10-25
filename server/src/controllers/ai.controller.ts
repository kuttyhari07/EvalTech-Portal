import { Response } from 'express';
import { z } from 'zod';
import { AIQuestionService, GeneratedQuestionItemSchema } from '../services/aiQuestion.service';
import { Question, QuestionBank, ProgrammingQuestion, ProgrammingTestCase } from '../models';
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

const generateProgSchema = z.object({
  subject: z.string().min(1, 'Subject is required'),
  topic: z.string().min(1, 'Topic is required'),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
});

const generateFromDocSchema = z.object({
  fileBase64: z.string().optional(),
  fileName: z.string().optional(),
  mimeType: z.string().optional(),
  textContent: z.string().optional(),
  bankTitle: z.string().optional(),
  subject: z.string().optional(),
  count: z.number().min(1).max(25).default(5),
  questionTypes: z.enum(['all', 'mcq', 'programming']).default('all'),
  difficulty: z.enum(['easy', 'medium', 'hard', 'mixed']).default('mixed'),
});

const createBankWithQuestionsSchema = z.object({
  bankTitle: z.string().min(1, 'Question Bank title is required'),
  subject: z.string().min(1, 'Subject is required'),
  description: z.string().optional(),
  tags: z.array(z.string()).default([]),
  existingBankId: z.string().optional(),
  questions: z.array(z.any()).min(1, 'At least one question is required'),
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

  static async generateProgrammingQuestion(req: AuthRequest, res: Response): Promise<void> {
    const data = generateProgSchema.parse(req.body);
    const userId = req.user!.userId;
    const orgId = req.user?.organizationId;

    const question = await AIQuestionService.generateProgrammingQuestion({
      userId,
      organizationId: orgId,
      ...data,
    });

    sendSuccess(res, question, 'AI Programming problem generated successfully.');
  }

  static async saveApprovedQuestions(req: AuthRequest, res: Response): Promise<void> {
    const { questions, questionBankId } = req.body;
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
        questionBankId: questionBankId || undefined,
        isApproved: true,
        approvalStatus: 'approved',
        aiGenerated: true,
      });
      savedDocs.push(doc);
    }

    if (questionBankId && savedDocs.length > 0) {
      await QuestionBank.findByIdAndUpdate(questionBankId, {
        $addToSet: { questionIds: { $each: savedDocs.map((d) => d._id) } },
      });
    }

    sendSuccess(
      res,
      savedDocs,
      `Successfully saved ${savedDocs.length} approved questions into your Question Bank.`,
      201
    );
  }

  static async generateFromDocument(req: AuthRequest, res: Response): Promise<void> {
    const data = generateFromDocSchema.parse(req.body);
    const userId = req.user!.userId;
    const orgId = req.user?.organizationId;

    if (!data.fileBase64 && !data.textContent) {
      sendError(res, 'Please provide an uploaded file or text content to generate questions.', 400);
      return;
    }

    const result = await AIQuestionService.generateFromDocument({
      userId,
      organizationId: orgId,
      ...data,
    });

    sendSuccess(
      res,
      result,
      `Successfully extracted ${result.questions.length} questions from ${data.fileName || 'document'}.`
    );
  }

  static async createBankWithQuestions(req: AuthRequest, res: Response): Promise<void> {
    const data = createBankWithQuestionsSchema.parse(req.body);
    const userId = req.user!.userId;
    const orgId = req.user?.organizationId;

    let bank: any = null;
    if (data.existingBankId) {
      bank = await QuestionBank.findById(data.existingBankId);
      if (!bank) {
        sendError(res, 'Target question bank not found.', 404);
        return;
      }
    } else {
      bank = await QuestionBank.create({
        title: data.bankTitle,
        subject: data.subject,
        description: data.description || '',
        tags: data.tags || [],
        creatorId: userId,
        organizationId: orgId,
        questionIds: [],
      });
    }

    const savedQuestionIds: any[] = [];
    const savedDocs: any[] = [];

    for (const q of data.questions) {
      if (q.type === 'programming') {
        // Create base Question entry
        const baseQ = await Question.create({
          subject: data.subject,
          topic: q.topic || data.bankTitle,
          difficulty: q.difficulty || 'medium',
          type: 'programming',
          title: q.title || 'Coding Problem',
          text: q.problemStatement || q.title || 'Solve the coding problem',
          defaultMarks: q.defaultMarks || 10,
          negativeMarks: 0,
          tags: q.tags || [],
          options: [],
          correctAnswers: [],
          creatorId: userId,
          organizationId: orgId,
          questionBankId: bank._id,
          approvalStatus: 'approved',
          isApproved: true,
          aiGenerated: true,
        });

        // Create detailed ProgrammingQuestion document
        const progDoc = await ProgrammingQuestion.create({
          questionId: baseQ._id,
          creatorId: userId,
          organizationId: orgId,
          title: q.title || 'Coding Problem',
          problemStatement: q.problemStatement || q.title || '',
          problemDescriptionMarkdown: q.problemDescriptionMarkdown || q.problemStatement || '',
          inputFormat: q.inputFormat || '',
          outputFormat: q.outputFormat || '',
          constraints: q.constraints || '',
          difficulty: q.difficulty || 'medium',
          topic: q.topic || data.bankTitle,
          tags: q.tags || [],
          supportedLanguages: ['python', 'java', 'cpp', 'c'],
          starterCode: q.starterCode || {},
          sampleInput: q.sampleInput || '',
          sampleExpectedOutput: q.sampleExpectedOutput || '',
          sampleExplanation: q.sampleExplanation || '',
          defaultMarks: q.defaultMarks || 10,
          timeLimitSeconds: q.timeLimitSeconds || 2,
          memoryLimitMb: q.memoryLimitMb || 256,
          allowedAttempts: 10,
          scoringPolicy: 'weighted',
          status: 'published',
        });

        // Insert test cases if provided
        if (Array.isArray(q.testCases) && q.testCases.length > 0) {
          const testCaseDocs = q.testCases.map((tc: any, idx: number) => ({
            questionId: baseQ._id,
            programmingQuestionId: progDoc._id,
            input: tc.input || '',
            expectedOutput: tc.expectedOutput || '',
            isHidden: !!tc.isHidden,
            isSample: !!tc.isSample,
            weight: tc.weight || 1,
            description: tc.description || `Test case ${idx + 1}`,
            isEnabled: true,
            order: idx,
          }));
          await ProgrammingTestCase.insertMany(testCaseDocs);
        }

        baseQ.programmingQuestionId = progDoc._id as any;
        await baseQ.save();

        savedQuestionIds.push(baseQ._id);
        savedDocs.push(baseQ);
      } else {
        // Standard MCQ / True False / Short Answer
        const formattedOptions = Array.isArray(q.options)
          ? q.options.map((opt: any, idx: number) => ({
              id: opt.id || String.fromCharCode(65 + idx),
              text: typeof opt === 'string' ? opt : opt.text || '',
            }))
          : [];

        const correctAns = Array.isArray(q.correctAnswers)
          ? q.correctAnswers
          : q.correctAnswer
          ? [q.correctAnswer]
          : formattedOptions.length > 0
          ? [formattedOptions[0].id]
          : [];

        const doc = await Question.create({
          subject: data.subject,
          topic: q.topic || data.bankTitle,
          difficulty: q.difficulty || 'medium',
          type: q.type || 'mcq',
          text: q.text || q.questionText || 'Question',
          options: formattedOptions,
          correctAnswers: correctAns,
          explanation: q.explanation || '',
          defaultMarks: q.defaultMarks || 1,
          negativeMarks: q.negativeMarks || 0,
          tags: q.tags || [],
          creatorId: userId,
          organizationId: orgId,
          questionBankId: bank._id,
          approvalStatus: 'approved',
          isApproved: true,
          aiGenerated: true,
        });

        savedQuestionIds.push(doc._id);
        savedDocs.push(doc);
      }
    }

    // Attach all new questions to the QuestionBank
    if (savedQuestionIds.length > 0) {
      await QuestionBank.findByIdAndUpdate(bank._id, {
        $addToSet: { questionIds: { $each: savedQuestionIds } },
      });
    }

    const updatedBank = await QuestionBank.findById(bank._id).populate('questionIds');

    sendSuccess(
      res,
      {
        bank: updatedBank,
        savedCount: savedQuestionIds.length,
      },
      `Successfully added ${savedQuestionIds.length} questions to Question Bank "${bank.title}".`,
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
