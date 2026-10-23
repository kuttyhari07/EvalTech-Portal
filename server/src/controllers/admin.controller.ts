import { Response } from 'express';
import {
  User,
  Organization,
  Class,
  Student,
  Exam,
  ExamAttempt,
  Subscription,
  Payment,
  AuditLog,
  PlatformSetting,
} from '../models';
import { AuthRequest } from '../middleware/auth';
import { sendSuccess, sendError } from '../utils/response';
import { ROLES } from '../constants';
import { recordAuditLog } from '../utils/audit';

export class AdminController {
  static async getPlatformOverview(req: AuthRequest, res: Response): Promise<void> {
    const [
      totalUsers,
      totalStaff,
      totalOrgs,
      totalStudents,
      totalExams,
      totalAttempts,
      activeSubscriptions,
      payments,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: ROLES.STAFF }),
      Organization.countDocuments(),
      Student.countDocuments({ status: 'active' }),
      Exam.countDocuments(),
      ExamAttempt.countDocuments(),
      Subscription.countDocuments({ status: 'active' }),
      Payment.find({ status: 'captured' }),
    ]);

    const totalRevenue = payments.reduce((acc, p) => acc + (p.amount || 0), 0);

    sendSuccess(res, {
      metrics: {
        totalUsers,
        totalStaff,
        totalOrgs,
        totalStudents,
        totalExams,
        totalAttempts,
        activeSubscriptions,
        totalRevenue,
      },
    });
  }

  static async listUsers(req: AuthRequest, res: Response): Promise<void> {
    const { role, status, search, page = '1', limit = '20' } = req.query;

    const query: any = {};
    if (role) query.role = role;
    if (status) query.status = status;
    if (search) {
      query.$or = [{ name: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }];
    }

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);

    const [users, total] = await Promise.all([
      User.find(query).select('-passwordHash').sort({ createdAt: -1 }).skip((pageNum - 1) * limitNum).limit(limitNum),
      User.countDocuments(query),
    ]);

    sendSuccess(res, users, undefined, 200, {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    });
  }

  static async updateUserStatus(req: AuthRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const { status } = req.body; // 'active' | 'suspended'

    if (!['active', 'suspended'].includes(status)) {
      sendError(res, 'Invalid status', 400);
      return;
    }

    const user = await User.findByIdAndUpdate(id, { status }, { new: true }).select('-passwordHash');
    if (!user) {
      sendError(res, 'User not found', 404);
      return;
    }

    await recordAuditLog({
      req,
      action: 'ADMIN_USER_STATUS_CHANGE',
      entity: 'User',
      entityId: user._id.toString(),
      metadata: { newStatus: status },
    });

    sendSuccess(res, user, `User status updated to ${status}.`);
  }

  static async listOrganizations(req: AuthRequest, res: Response): Promise<void> {
    const orgs = await Organization.find().sort({ createdAt: -1 }).populate('createdBy', 'name email');

    const orgIds = orgs.map((o) => o._id);
    const subscriptions = await Subscription.find({ targetType: 'organization', targetId: { $in: orgIds } });
    const subMap = new Map<string, any>();
    for (const s of subscriptions) {
      subMap.set(s.targetId.toString(), s);
    }

    const formatted = orgs.map((o) => ({
      ...o.toObject(),
      subscription: subMap.get(o._id.toString()) || null,
    }));

    sendSuccess(res, formatted);
  }

  static async listAuditLogs(req: AuthRequest, res: Response): Promise<void> {
    const { action, entity, page = '1', limit = '50' } = req.query;

    const query: any = {};
    if (action) query.action = action;
    if (entity) query.entity = entity;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);

    const [logs, total] = await Promise.all([
      AuditLog.find(query).sort({ createdAt: -1 }).skip((pageNum - 1) * limitNum).limit(limitNum),
      AuditLog.countDocuments(query),
    ]);

    sendSuccess(res, logs, undefined, 200, {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    });
  }

  static async listPayments(req: AuthRequest, res: Response): Promise<void> {
    const payments = await Payment.find().sort({ createdAt: -1 }).populate('planId', 'name tier');
    sendSuccess(res, payments);
  }

  static async getPlatformSettings(req: AuthRequest, res: Response): Promise<void> {
    const settings = await PlatformSetting.find();
    sendSuccess(res, settings);
  }

  static async updatePlatformSetting(req: AuthRequest, res: Response): Promise<void> {
    const { key, value, description, category } = req.body;

    const setting = await PlatformSetting.findOneAndUpdate(
      { key },
      { key, value, description, category, updatedBy: req.user!.userId },
      { upsert: true, new: true }
    );

    sendSuccess(res, setting, 'Platform setting saved.');
  }
}
