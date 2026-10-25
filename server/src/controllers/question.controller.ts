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
  questionBankId: z.string().optional(),
});

export class QuestionController {
  static async createQuestion(req: AuthRequest, res: Response): Promise<void> {
    const data = createQuestionSchema.parse(req.body);
    const userId = req.user!.userId;
    const orgId = req.user?.organizationId;

    const question = await Question.create({
      ...data,
      questionBankId: data.questionBankId || undefined,
      creatorId: userId,
      organizationId: orgId,
      approvalStatus: 'approved',
      isApproved: true,
    });

    if (data.questionBankId) {
      await QuestionBank.findByIdAndUpdate(data.questionBankId, {
        $addToSet: { questionIds: question._id },
      });
    }

    await recordAuditLog({
      req,
      action: 'QUESTION_CREATE',
      entity: 'Question',
      entityId: question._id.toString(),
      metadata: { subject: question.subject, type: question.type, questionBankId: data.questionBankId },
    });

    sendSuccess(res, question, 'Question created successfully.', 201);
  }

  static async listQuestions(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const orgId = req.user?.organizationId;
    const role = req.user!.role;
    const { subject, topic, difficulty, type, search, questionBankId, page = '1', limit = '100' } = req.query;

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
    if (questionBankId) query.questionBankId = questionBankId;
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

    // Unlink from any question bank
    await QuestionBank.updateMany({ questionIds: id }, { $pull: { questionIds: id } });

    sendSuccess(res, null, 'Question deleted successfully.');
  }

  // --- Question Bank Operations ---

  static async listQuestionBanks(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const orgId = req.user?.organizationId;

    const query: any = {
      $or: [{ creatorId: userId }, ...(orgId ? [{ organizationId: orgId, isPublicWithinOrg: true }] : [])],
    };

    const banks = await QuestionBank.find(query).populate('questionIds').sort({ createdAt: -1 });
    sendSuccess(res, banks);
  }

  static async getQuestionBankById(req: AuthRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const bank = await QuestionBank.findById(id).populate({
      path: 'questionIds',
      populate: {
        path: 'programmingQuestionId',
      },
    });

    if (!bank) {
      sendError(res, 'Question bank not found', 404);
      return;
    }

    sendSuccess(res, bank);
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

    if (questionIds.length > 0) {
      await Question.updateMany(
        { _id: { $in: questionIds } },
        { $set: { questionBankId: bank._id } }
      );
    }

    sendSuccess(res, bank, 'Question bank created successfully.', 201);
  }

  static async updateQuestionBank(req: AuthRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const { title, description, subject, tags, isPublicWithinOrg } = req.body;

    const bank = await QuestionBank.findByIdAndUpdate(
      id,
      { $set: { title, description, subject, tags, isPublicWithinOrg } },
      { new: true }
    );

    if (!bank) {
      sendError(res, 'Question bank not found', 404);
      return;
    }

    sendSuccess(res, bank, 'Question bank updated successfully.');
  }

  static async deleteQuestionBank(req: AuthRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const bank = await QuestionBank.findByIdAndDelete(id);

    if (!bank) {
      sendError(res, 'Question bank not found', 404);
      return;
    }

    // Unset questionBankId from questions (questions themselves are kept)
    await Question.updateMany({ questionBankId: id }, { $unset: { questionBankId: 1 } });

    sendSuccess(res, null, 'Question bank removed.');
  }

  static async addQuestionsToBank(req: AuthRequest, res: Response): Promise<void> {
    const { id } = req.params; // bankId
    const { questionIds = [] } = req.body;

    if (!Array.isArray(questionIds) || questionIds.length === 0) {
      sendError(res, 'Please provide question IDs to add to this bank.', 400);
      return;
    }

    const bank = await QuestionBank.findByIdAndUpdate(
      id,
      { $addToSet: { questionIds: { $each: questionIds } } },
      { new: true }
    ).populate('questionIds');

    if (!bank) {
      sendError(res, 'Question bank not found', 404);
      return;
    }

    await Question.updateMany(
      { _id: { $in: questionIds } },
      { $set: { questionBankId: bank._id } }
    );

    sendSuccess(res, bank, `Added ${questionIds.length} question(s) to ${bank.title}.`);
  }

  static async removeQuestionFromBank(req: AuthRequest, res: Response): Promise<void> {
    const { id, questionId } = req.params;

    const bank = await QuestionBank.findByIdAndUpdate(
      id,
      { $pull: { questionIds: questionId } },
      { new: true }
    );

    if (!bank) {
      sendError(res, 'Question bank not found', 404);
      return;
    }

    await Question.findByIdAndUpdate(questionId, { $unset: { questionBankId: 1 } });

    sendSuccess(res, bank, 'Question removed from bank.');
  }
}
