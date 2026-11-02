import { Response } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import { Class, ClassEnrollment, OrganizationMembership, Student, User } from '../models';
import { AuthRequest } from '../middleware/auth';
import { sendSuccess, sendError } from '../utils/response';
import { ROLES } from '../constants';
import { recordAuditLog } from '../utils/audit';

const createClassSchema = z.object({
  name: z.string().optional(),
  section: z.string().optional(),
  subject: z.string().optional(),
  academicYear: z.string().optional(),
  code: z.string().optional(),
  description: z.string().optional(),
  departmentId: z.string().optional(),
  assignedStaffId: z.string().optional(),
  assignedStaffIds: z.array(z.string()).optional(),
});

export class ClassController {
  static async createClass(req: AuthRequest, res: Response): Promise<void> {
    const data = createClassSchema.parse(req.body);
    const userId = req.user!.userId;
    const orgId = req.user?.organizationId;

    // Determine target staff owner
    let targetStaffId = userId;
    if (req.user?.role === ROLES.ORG_ADMIN && data.assignedStaffId) {
      targetStaffId = data.assignedStaffId;
    }

    const code =
      data.code ||
      `CLS-${Math.floor(1000 + Math.random() * 9000)}`;

    const initialAssignedStaffIds: string[] = [];
    if (targetStaffId) initialAssignedStaffIds.push(targetStaffId.toString());

    if (Array.isArray(data.assignedStaffIds) && data.assignedStaffIds.length > 0) {
      // Explicitly assigned staff members
      initialAssignedStaffIds.push(...data.assignedStaffIds);
    } else if (orgId) {
      // Default: include all active org staff members
      const orgStaffMemberships = await OrganizationMembership.find({
        organizationId: orgId,
        roleInOrg: 'staff',
        status: { $in: ['active', 'invited'] },
      });
      for (const m of orgStaffMemberships) {
        initialAssignedStaffIds.push(m.userId.toString());
      }
    }

    const uniqueStaffIds = Array.from(new Set(initialAssignedStaffIds)).map(
      (id) => new mongoose.Types.ObjectId(id)
    );

    const className = data.name || data.section || 'Section';

    const newClass = await Class.create({
      name: className,
      section: data.section || className,
      subject: data.subject,
      academicYear: data.academicYear,
      code,
      description: data.description,
      organizationId: orgId,
      departmentId: data.departmentId ? new mongoose.Types.ObjectId(data.departmentId) : undefined,
      staffId: targetStaffId,
      assignedStaffIds: uniqueStaffIds,
      isActive: true,
    });

    // Sync back to OrganizationMembership assignedClassIds
    if (orgId && uniqueStaffIds.length > 0) {
      await OrganizationMembership.updateMany(
        { organizationId: orgId, userId: { $in: uniqueStaffIds } },
        { $addToSet: { assignedClassIds: newClass._id } }
      );
    }

    await recordAuditLog({
      req,
      action: 'CLASS_CREATE',
      entity: 'Class',
      entityId: newClass._id.toString(),
      metadata: { name: newClass.name, code: newClass.code, departmentId: data.departmentId },
    });

    sendSuccess(res, newClass, 'Class created successfully.', 201);
  }

  static async listClasses(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const orgId = req.user?.organizationId;
    const role = req.user!.role;

    const query: any = { isActive: true };

    if (req.query.departmentId) {
      query.departmentId = req.query.departmentId;
    }

    if (role === ROLES.SUPER_ADMIN) {
      // Super admin sees all or filtered by org
      if (req.query.organizationId) query.organizationId = req.query.organizationId;
    } else if (role === ROLES.ORG_ADMIN && orgId) {
      query.organizationId = orgId;
    } else {
      // Staff sees classes they own, or are assigned to, or assigned in membership
      const membership = orgId
        ? await OrganizationMembership.findOne({ organizationId: orgId, userId })
        : null;
      const assignedIds = membership?.assignedClassIds || [];

      query.$or = [
        { staffId: userId },
        { assignedStaffIds: userId },
        { _id: { $in: assignedIds } },
      ];
    }

    const classes = await Class.find(query)
      .populate('staffId', 'name email')
      .populate('assignedStaffIds', 'name email')
      .populate('departmentId', 'name code')
      .sort({ createdAt: -1 });

    // Attach student enrollment count to each class
    const classIds = classes.map((c) => c._id);
    const counts = await ClassEnrollment.aggregate([
      { $match: { classId: { $in: classIds }, status: 'active' } },
      { $group: { _id: '$classId', count: { $sum: 1 } } },
    ]);

    const countMap = new Map<string, number>();
    for (const c of counts) {
      countMap.set(c._id.toString(), c.count);
    }

    const formatted = classes.map((cls) => ({
      ...cls.toObject(),
      studentCount: countMap.get(cls._id.toString()) || 0,
    }));

    sendSuccess(res, formatted);
  }

  static async getClassById(req: AuthRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const cls = await Class.findById(id)
      .populate('staffId', 'name email')
      .populate('assignedStaffIds', 'name email')
      .populate('departmentId', 'name code');

    if (!cls || !cls.isActive) {
      sendError(res, 'Class not found', 404);
      return;
    }

    // Fetch enrolled students
    const enrollments = await ClassEnrollment.find({ classId: cls._id, status: 'active' }).populate('studentId');
    const students = enrollments.map((e) => e.studentId);

    sendSuccess(res, {
      class: cls,
      students,
    });
  }

  static async updateClass(req: AuthRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const data = req.body;

    const updateFields: any = {
      name: data.name,
      section: data.section,
      subject: data.subject,
      academicYear: data.academicYear,
      description: data.description,
    };

    if (data.departmentId !== undefined) {
      updateFields.departmentId = data.departmentId || null;
    }

    if (data.assignedStaffId) {
      updateFields.staffId = data.assignedStaffId;
    }

    if (Array.isArray(data.assignedStaffIds)) {
      updateFields.assignedStaffIds = data.assignedStaffIds;
    }

    const cls = await Class.findByIdAndUpdate(
      id,
      { $set: updateFields },
      { new: true }
    )
      .populate('staffId', 'name email')
      .populate('assignedStaffIds', 'name email')
      .populate('departmentId', 'name code');

    if (!cls) {
      sendError(res, 'Class not found', 404);
      return;
    }

    sendSuccess(res, cls, 'Class updated successfully.');
  }

  static async assignStaffToClass(req: AuthRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const { staffIds } = req.body;

    if (!Array.isArray(staffIds)) {
      sendError(res, 'staffIds array is required.', 400);
      return;
    }

    const cls = await Class.findById(id);
    if (!cls || !cls.isActive) {
      sendError(res, 'Class not found.', 404);
      return;
    }

    cls.assignedStaffIds = Array.from(
      new Set([...(cls.assignedStaffIds || []).map((s) => s.toString()), ...staffIds])
    ).map((sid) => new mongoose.Types.ObjectId(sid));

    await cls.save();

    if (cls.organizationId) {
      await OrganizationMembership.updateMany(
        { organizationId: cls.organizationId, userId: { $in: staffIds } },
        { $addToSet: { assignedClassIds: cls._id } }
      );
    }

    sendSuccess(res, cls, 'Staff assigned to class successfully.');
  }

  static async deleteClass(req: AuthRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const cls = await Class.findByIdAndUpdate(id, { isActive: false });
    if (!cls) {
      sendError(res, 'Class not found', 404);
      return;
    }

    sendSuccess(res, null, 'Class archived successfully.');
  }
}
