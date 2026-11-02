import { Response } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import { Department, Class, ClassEnrollment, OrganizationMembership } from '../models';
import { AuthRequest } from '../middleware/auth';
import { sendSuccess, sendError } from '../utils/response';
import { ROLES } from '../constants';
import { recordAuditLog } from '../utils/audit';

const createDepartmentSchema = z.object({
  name: z.string().min(2, 'Department name is required'),
  code: z.string().min(2, 'Department code is required').max(10, 'Code too long'),
  description: z.string().optional(),
  headOfDepartmentId: z.string().optional(),
});

const updateDepartmentSchema = z.object({
  name: z.string().min(2).optional(),
  code: z.string().min(2).max(10).optional(),
  description: z.string().optional(),
  headOfDepartmentId: z.string().nullable().optional(),
});

export class DepartmentController {
  static async createDepartment(req: AuthRequest, res: Response): Promise<void> {
    const data = createDepartmentSchema.parse(req.body);
    const orgId = req.user?.organizationId;

    if (!orgId && req.user?.role !== ROLES.SUPER_ADMIN) {
      sendError(res, 'Organization context required.', 400);
      return;
    }

    const targetOrgId = orgId || req.body.organizationId;
    if (!targetOrgId) {
      sendError(res, 'Organization ID is required.', 400);
      return;
    }

    const existing = await Department.findOne({
      organizationId: targetOrgId,
      code: data.code.toUpperCase(),
      isActive: true,
    });

    if (existing) {
      sendError(res, `A department with code "${data.code.toUpperCase()}" already exists.`, 409);
      return;
    }

    const department = await Department.create({
      name: data.name,
      code: data.code.toUpperCase(),
      description: data.description,
      organizationId: targetOrgId,
      headOfDepartmentId: data.headOfDepartmentId || undefined,
      isActive: true,
    });

    await recordAuditLog({
      req,
      action: 'DEPARTMENT_CREATE',
      entity: 'Department',
      entityId: department._id.toString(),
      metadata: { name: department.name, code: department.code },
    });

    sendSuccess(res, department, 'Department created successfully.', 201);
  }

  static async listDepartments(req: AuthRequest, res: Response): Promise<void> {
    const orgId = req.user?.organizationId;
    const role = req.user!.role;

    const query: any = { isActive: true };

    if (role === ROLES.SUPER_ADMIN) {
      if (req.query.organizationId) query.organizationId = req.query.organizationId;
    } else if (orgId) {
      query.organizationId = orgId;
    } else {
      sendSuccess(res, []);
      return;
    }

    const departments = await Department.find(query)
      .populate('headOfDepartmentId', 'name email')
      .sort({ name: 1 });

    const departmentIds = departments.map((d) => d._id);

    // Aggregate classes per department
    const classes = await Class.find({
      departmentId: { $in: departmentIds },
      isActive: true,
    }).select('_id departmentId staffId assignedStaffIds');

    const classCountMap = new Map<string, number>();
    const deptClassesMap = new Map<string, mongoose.Types.ObjectId[]>();
    const staffSetMap = new Map<string, Set<string>>();

    for (const cls of classes) {
      const deptIdStr = cls.departmentId!.toString();
      classCountMap.set(deptIdStr, (classCountMap.get(deptIdStr) || 0) + 1);

      if (!deptClassesMap.has(deptIdStr)) deptClassesMap.set(deptIdStr, []);
      deptClassesMap.get(deptIdStr)!.push(cls._id as mongoose.Types.ObjectId);

      if (!staffSetMap.has(deptIdStr)) staffSetMap.set(deptIdStr, new Set<string>());
      if (cls.staffId) staffSetMap.get(deptIdStr)!.add(cls.staffId.toString());
      if (Array.isArray(cls.assignedStaffIds)) {
        for (const sid of cls.assignedStaffIds) {
          staffSetMap.get(deptIdStr)!.add(sid.toString());
        }
      }
    }

    // Aggregate student counts across all classes in each department
    const allClasses = Array.from(deptClassesMap.values()).flat();
    const enrollmentCounts = await ClassEnrollment.aggregate([
      { $match: { classId: { $in: allClasses }, status: 'active' } },
      { $group: { _id: '$classId', count: { $sum: 1 } } },
    ]);

    const classStudentMap = new Map<string, number>();
    for (const ec of enrollmentCounts) {
      classStudentMap.set(ec._id.toString(), ec.count);
    }

    const formatted = departments.map((dept) => {
      const deptIdStr = dept._id.toString();
      const deptClassIds = deptClassesMap.get(deptIdStr) || [];
      const studentTotal = deptClassIds.reduce(
        (acc, cid) => acc + (classStudentMap.get(cid.toString()) || 0),
        0
      );

      return {
        ...dept.toObject(),
        classCount: classCountMap.get(deptIdStr) || 0,
        staffCount: staffSetMap.get(deptIdStr)?.size || 0,
        studentCount: studentTotal,
      };
    });

    sendSuccess(res, formatted);
  }

  static async getDepartmentById(req: AuthRequest, res: Response): Promise<void> {
    const { id } = req.params;

    const department = await Department.findById(id).populate('headOfDepartmentId', 'name email');
    if (!department || !department.isActive) {
      sendError(res, 'Department not found.', 404);
      return;
    }

    // Fetch classes in this department
    const classes = await Class.find({ departmentId: department._id, isActive: true })
      .populate('staffId', 'name email')
      .populate('assignedStaffIds', 'name email')
      .sort({ name: 1 });

    const classIds = classes.map((c) => c._id);
    const enrollmentCounts = await ClassEnrollment.aggregate([
      { $match: { classId: { $in: classIds }, status: 'active' } },
      { $group: { _id: '$classId', count: { $sum: 1 } } },
    ]);

    const countMap = new Map<string, number>();
    for (const ec of enrollmentCounts) {
      countMap.set(ec._id.toString(), ec.count);
    }

    const classesFormatted = classes.map((cls) => ({
      ...cls.toObject(),
      studentCount: countMap.get(cls._id.toString()) || 0,
    }));

    sendSuccess(res, {
      department,
      classes: classesFormatted,
    });
  }

  static async updateDepartment(req: AuthRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const data = updateDepartmentSchema.parse(req.body);

    const updateFields: any = {};
    if (data.name) updateFields.name = data.name;
    if (data.code) updateFields.code = data.code.toUpperCase();
    if (data.description !== undefined) updateFields.description = data.description;
    if (data.headOfDepartmentId !== undefined) {
      updateFields.headOfDepartmentId = data.headOfDepartmentId || null;
    }

    const department = await Department.findByIdAndUpdate(id, { $set: updateFields }, { new: true });
    if (!department) {
      sendError(res, 'Department not found.', 404);
      return;
    }

    sendSuccess(res, department, 'Department updated successfully.');
  }

  static async deleteDepartment(req: AuthRequest, res: Response): Promise<void> {
    const { id } = req.params;

    const department = await Department.findByIdAndUpdate(id, { isActive: false });
    if (!department) {
      sendError(res, 'Department not found.', 404);
      return;
    }

    // Also unassign or archive classes if necessary, or keep classes active
    sendSuccess(res, null, 'Department deleted successfully.');
  }

  static async assignStaffToDepartment(req: AuthRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const { staffIds } = req.body;

    if (!Array.isArray(staffIds) || staffIds.length === 0) {
      sendError(res, 'staffIds array is required.', 400);
      return;
    }

    const department = await Department.findById(id);
    if (!department || !department.isActive) {
      sendError(res, 'Department not found.', 404);
      return;
    }

    // Find all classes in this department
    const deptClasses = await Class.find({ departmentId: department._id, isActive: true });
    const classIds = deptClasses.map((c) => c._id);

    if (classIds.length > 0) {
      // Add staffIds to assignedStaffIds on all classes in this department
      await Class.updateMany(
        { _id: { $in: classIds } },
        { $addToSet: { assignedStaffIds: { $each: staffIds } } }
      );

      // Add classIds to OrganizationMembership assignedClassIds for each staff
      await OrganizationMembership.updateMany(
        { organizationId: department.organizationId, userId: { $in: staffIds } },
        { $addToSet: { assignedClassIds: { $each: classIds } } }
      );
    }

    sendSuccess(res, null, 'Staff assigned to department classes successfully.');
  }
}

