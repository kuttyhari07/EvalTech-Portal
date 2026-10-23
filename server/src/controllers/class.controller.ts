import { Response } from 'express';
import { z } from 'zod';
import { Class, ClassEnrollment, Student, User } from '../models';
import { AuthRequest } from '../middleware/auth';
import { sendSuccess, sendError } from '../utils/response';
import { ROLES } from '../constants';
import { recordAuditLog } from '../utils/audit';

const createClassSchema = z.object({
  name: z.string().min(2, 'Class name is required'),
  section: z.string().optional(),
  subject: z.string().optional(),
  academicYear: z.string().optional(),
  code: z.string().optional(),
  description: z.string().optional(),
  assignedStaffId: z.string().optional(),
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

    const newClass = await Class.create({
      name: data.name,
      section: data.section,
      subject: data.subject,
      academicYear: data.academicYear,
      code,
      description: data.description,
      organizationId: orgId,
      staffId: targetStaffId,
      isActive: true,
    });

    await recordAuditLog({
      req,
      action: 'CLASS_CREATE',
      entity: 'Class',
      entityId: newClass._id.toString(),
      metadata: { name: newClass.name, code: newClass.code },
    });

    sendSuccess(res, newClass, 'Class created successfully.', 201);
  }

  static async listClasses(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const orgId = req.user?.organizationId;
    const role = req.user!.role;

    const query: any = { isActive: true };

    if (role === ROLES.SUPER_ADMIN) {
      // Super admin sees all or filtered by org
      if (req.query.organizationId) query.organizationId = req.query.organizationId;
    } else if (role === ROLES.ORG_ADMIN && orgId) {
      query.organizationId = orgId;
    } else {
      // Staff only sees classes they own/are assigned to
      query.staffId = userId;
    }

    const classes = await Class.find(query).populate('staffId', 'name email').sort({ createdAt: -1 });

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
    const cls = await Class.findById(id).populate('staffId', 'name email');
    if (!cls) {
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

    const cls = await Class.findByIdAndUpdate(
      id,
      {
        $set: {
          name: data.name,
          section: data.section,
          subject: data.subject,
          academicYear: data.academicYear,
          description: data.description,
          staffId: data.assignedStaffId || undefined,
        },
      },
      { new: true }
    );

    if (!cls) {
      sendError(res, 'Class not found', 404);
      return;
    }

    sendSuccess(res, cls, 'Class updated successfully.');
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
