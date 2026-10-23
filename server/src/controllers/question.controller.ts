import { Response } from 'express';
import { z } from 'zod';
import { Question, QuestionBank } from '../models';
import { AuthRequest } from '../middleware/auth';
import { sendSuccess, sendError } from '../utils/response';
import { QUESTION_TYPES, DIFFICULTY_LEVELS, ROLES } from '../constants';
import { recordAuditLog } from '../utils/audit';

const createQuestionSchema = z.object({
  subject: z.string().min(1, 'Subject is required'),
  topic: z.string().optional(),
  difficulty: z.enum([DIFFICULTY_LEVELS.EASY, DIFFICULTY_LEVELS.MEDIUM, DIFFICULTY_LEVELS.HARD]).default(DIFFICULTY_LEVELS.MEDIUM),
  type: z.enum([
    QUESTION_TYPES.MCQ,
    QUESTION_TYPES.MULTIPLE_SELECT,
    QUESTION_TYPES.TRUE_FALSE,
    QUESTION_TYPES.FILL_BLANK,
    QUESTION_TYPES.SHORT_ANSWER,
    QUESTION_TYPES.LONG_ANSWER,
    QUESTION_TYPES.CODE,
    QUESTION_TYPES.PROGRAMMING,
  ]),
  text: z.string().min(3, 'Question text is required'),
  codeSnippet: z.string().optional(),
  options: z.array(z.object({ id: z.string(), text: z.string() })).default([]),
  correctAnswers: z.array(z.string()).min(1, 'At least one correct answer must be specified'),
  explanation: z.string().optional(),
  defaultMarks: z.number().min(1).default(1),
  negativeMarks: z.number().default(0),
  tags: z.array(z.string()).default([]),
  aiGenerated: z.boolean().default(false),
});

export class QuestionController {
  static async createQuestion(req: AuthRequest, res: Response): Promise<void> {
    const data = createQuestionSchema.parse(req.body);
    const userId = req.user!.userId;
    const orgId = req.user?.organizationId;

    const question = await Question.create({
      ...data,
      creatorId: userId,
      organizationId: orgId,
      approvalStatus: 'approved',
      isApproved: true,
    });

    await recordAuditLog({
      req,
      action: 'QUESTION_CREATE',
      entity: 'Question',
      entityId: question._id.toString(),
      metadata: { subject: question.subject, type: question.type },
    });

    sendSuccess(res, question, 'Question created successfully.', 201);
  }

  static async listQuestions(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const orgId = req.user?.organizationId;
    const role = req.user!.role;
    const { subject, topic, difficulty, type, search, page = '1', limit = '50' } = req.query;

    const query: any = {};

    if (role === ROLES.SUPER_ADMIN) {
      if (req.query.organizationId) query.organizationId = req.query.organizationId;
    } else if (orgId) {
      query.$or = [{ organizationId: orgId }, { creatorId: userId }];
    } else {
      query.creatorId = userId;
    }

    if (subject) query.subject = subject;
    if (topic) query.topic = topic;
    if (difficulty) query.difficulty = difficulty;
    if (type) query.type = type;
    if (search) {
      query.text = { $regex: search as string, $options: 'i' };
    }

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const [questions, total] = await Promise.all([
      Question.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
      Question.countDocuments(query),
    ]);

    sendSuccess(res, questions, undefined, 200, {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    });
  }

  static async updateQuestion(req: AuthRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const data = req.body;

    const question = await Question.findByIdAndUpdate(id, { $set: data }, { new: true });
    if (!question) {
      sendError(res, 'Question not found', 404);
      return;
    }

    sendSuccess(res, question, 'Question updated successfully.');
  }

  static async deleteQuestion(req: AuthRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const question = await Question.findByIdAndDelete(id);
    if (!question) {
      sendError(res, 'Question not found', 404);
      return;
    }

    sendSuccess(res, null, 'Question deleted successfully.');
  }

  static async listQuestionBanks(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const orgId = req.user?.organizationId;

    const query: any = {
      $or: [{ creatorId: userId }, ...(orgId ? [{ organizationId: orgId, isPublicWithinOrg: true }] : [])],
    };

    const banks = await QuestionBank.find(query).populate('questionIds');
    sendSuccess(res, banks);
  }

  static async createQuestionBank(req: AuthRequest, res: Response): Promise<void> {
    const { title, description, subject, questionIds = [], tags = [], isPublicWithinOrg = false } = req.body;
    const userId = req.user!.userId;
    const orgId = req.user?.organizationId;

    if (!title || !subject) {
      sendError(res, 'Title and subject are required.', 400);
      return;
    }

    const bank = await QuestionBank.create({
      title,
      description,
      subject,
      creatorId: userId,
      organizationId: orgId,
      questionIds,
      tags,
      isPublicWithinOrg,
    });

    sendSuccess(res, bank, 'Question bank created.', 201);
  }
}
