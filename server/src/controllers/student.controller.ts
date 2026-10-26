import { Response } from 'express';
import { z } from 'zod';
import { Student, ClassEnrollment, Class } from '../models';
import { AuthRequest } from '../middleware/auth';
import { sendSuccess, sendError } from '../utils/response';
import { CapacityService } from '../services/capacity.service';
import { EmailService } from '../services/email.service';
import { ROLES } from '../constants';
import { recordAuditLog } from '../utils/audit';

const addStudentSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid student email'),
  studentIdNumber: z.string().min(1, 'Roll or ID number is required'),
  phone: z.string().optional(),
  classId: z.string().optional(),
});

const updateStudentSchema = z.object({
  firstName: z.string().min(1, 'First name is required').optional(),
  lastName: z.string().min(1, 'Last name is required').optional(),
  email: z.string().email('Invalid student email').optional(),
  studentIdNumber: z.string().min(1, 'Roll or ID number is required').optional(),
  phone: z.string().optional(),
  classId: z.string().optional(),
  resetPasswordToDefault: z.boolean().optional(),
});

export class StudentController {
  static async addStudent(req: AuthRequest, res: Response): Promise<void> {
    const data = addStudentSchema.parse(req.body);
    const userId = req.user!.userId;
    const orgId = req.user?.organizationId;
    const targetType = orgId ? 'organization' : 'staff';
    const targetId = orgId || userId;

    // Check if student with this email already exists in this scope
    const filter: any = {
      email: data.email.toLowerCase(),
      status: 'active',
    };
    if (orgId) {
      filter.organizationId = orgId;
    } else {
      filter.createdByStaffId = userId;
      filter.organizationId = null;
    }

    let student = await Student.findOne(filter);
    let isNewStudent = false;

    // If new student, verify capacity limit before inserting
    if (!student) {
      await CapacityService.assertCanAddStudents(targetType, targetId, 1);

      student = await Student.create({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email.toLowerCase(),
        studentIdNumber: data.studentIdNumber,
        phone: data.phone,
        organizationId: orgId,
        createdByStaffId: userId,
        status: 'active',
      });
      isNewStudent = true;
    }

    // Enroll into class if provided
    if (data.classId) {
      await ClassEnrollment.findOneAndUpdate(
        { classId: data.classId, studentId: student._id },
        { classId: data.classId, studentId: student._id, status: 'active', enrolledAt: new Date() },
        { upsert: true }
      );
    }

    await recordAuditLog({
      req,
      action: 'STUDENT_ADD',
      entity: 'Student',
      entityId: student._id.toString(),
      metadata: { studentEmail: student.email, classId: data.classId },
    });

    // Send welcome credentials email to new student
    if (isNewStudent) {
      const inviterName = req.user?.dbUser?.name || 'Your Institution';
      EmailService.sendStudentWelcomeEmail(
        student.email,
        `${student.firstName} ${student.lastName}`.trim(),
        student.studentIdNumber,
        'Test@123',
        inviterName
      ).catch(console.error);
    }

    sendSuccess(res, student, 'Student added and enrolled successfully.', 201);
  }

  static async batchImport(req: AuthRequest, res: Response): Promise<void> {
    const { students = [], classId } = req.body;
    if (!Array.isArray(students) || students.length === 0) {
      sendError(res, 'A list of students is required for batch import.', 400);
      return;
    }

    const userId = req.user!.userId;
    const orgId = req.user?.organizationId;
    const targetType = orgId ? 'organization' : 'staff';
    const targetId = orgId || userId;

    // Deduplicate input array by email
    const uniqueInputs = new Map<string, any>();
    for (const s of students) {
      if (s.email && s.firstName && s.studentIdNumber) {
        uniqueInputs.set(s.email.toLowerCase().trim(), s);
      }
    }

    const emails = Array.from(uniqueInputs.keys());

    // Find existing students in this scope
    const existingFilter: any = {
      email: { $in: emails },
      status: 'active',
    };
    if (orgId) existingFilter.organizationId = orgId;
    else {
      existingFilter.createdByStaffId = userId;
      existingFilter.organizationId = null;
    }

    const existingStudents = await Student.find(existingFilter);
    const existingEmailSet = new Set(existingStudents.map((s) => s.email.toLowerCase()));

    // Count how many are genuinely new distinct students
    const newStudentsToInsert = emails.filter((e) => !existingEmailSet.has(e));

    // Assert capacity limit
    if (newStudentsToInsert.length > 0) {
      await CapacityService.assertCanAddStudents(targetType, targetId, newStudentsToInsert.length);
    }

    const insertedDocs: any[] = [];

    // Create new students
    for (const email of newStudentsToInsert) {
      const item = uniqueInputs.get(email);
      const newStudent = await Student.create({
        firstName: item.firstName,
        lastName: item.lastName || '',
        email,
        studentIdNumber: item.studentIdNumber,
        phone: item.phone,
        organizationId: orgId,
        createdByStaffId: userId,
        status: 'active',
      });
      insertedDocs.push(newStudent);
    }

    const allStudents = [...existingStudents, ...insertedDocs];

    // Enroll all in class if specified
    if (classId) {
      const enrollmentOps: any[] = allStudents.map((s) => ({
        updateOne: {
          filter: { classId, studentId: s._id },
          update: { $set: { classId, studentId: s._id, status: 'active', enrolledAt: new Date() } },
          upsert: true,
        },
      }));

      if (enrollmentOps.length > 0) {
        await ClassEnrollment.bulkWrite(enrollmentOps);
      }
    }

    await recordAuditLog({
      req,
      action: 'STUDENT_BATCH_IMPORT',
      entity: 'Student',
      metadata: { total: allStudents.length, newlyCreated: insertedDocs.length, classId },
    });

    // Send welcome emails to all newly created students
    const inviterName = req.user?.dbUser?.name || 'Your Institution';
    for (const newStudent of insertedDocs) {
      EmailService.sendStudentWelcomeEmail(
        newStudent.email,
        `${newStudent.firstName} ${newStudent.lastName}`.trim(),
        newStudent.studentIdNumber,
        'Test@123',
        inviterName
      ).catch(console.error);
    }

    sendSuccess(
      res,
      {
        totalProcessed: uniqueInputs.size,
        newlyCreated: insertedDocs.length,
        alreadyExisting: existingStudents.length,
        enrolledCount: classId ? allStudents.length : 0,
      },
      `Successfully processed ${uniqueInputs.size} students (${insertedDocs.length} new records created).`
    );
  }

  static async listStudents(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const orgId = req.user?.organizationId;
    const role = req.user!.role;
    const { classId, search, page = '1', limit = '50' } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    let studentIds: any[] | null = null;

    // If filtering by class
    if (classId) {
      const enrollments = await ClassEnrollment.find({ classId, status: 'active' });
      studentIds = enrollments.map((e) => e.studentId);
    }

    const query: any = { status: 'active' };

    if (role === ROLES.SUPER_ADMIN) {
      if (req.query.organizationId) query.organizationId = req.query.organizationId;
    } else if (role === ROLES.ORG_ADMIN && orgId) {
      query.organizationId = orgId;
    } else {
      query.createdByStaffId = userId;
    }

    if (studentIds) {
      query._id = { $in: studentIds };
    }

    if (search) {
      const regex = new RegExp(search as string, 'i');
      query.$or = [{ firstName: regex }, { lastName: regex }, { email: regex }, { studentIdNumber: regex }];
    }

    const [students, total] = await Promise.all([
      Student.find(query).sort({ firstName: 1 }).skip(skip).limit(limitNum),
      Student.countDocuments(query),
    ]);

    // Attach enrolled class names to each student
    const sIds = students.map((s) => s._id);
    const allEnrollments = await ClassEnrollment.find({ studentId: { $in: sIds }, status: 'active' }).populate(
      'classId',
      'name code'
    );

    const enrollmentMap = new Map<string, any[]>();
    for (const e of allEnrollments) {
      const key = e.studentId.toString();
      const list = enrollmentMap.get(key) || [];
      if (e.classId) list.push(e.classId);
      enrollmentMap.set(key, list);
    }

    const formatted = students.map((s) => ({
      ...s.toObject(),
      classes: enrollmentMap.get(s._id.toString()) || [],
    }));

    sendSuccess(res, formatted, undefined, 200, {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    });
  }

  static async archiveStudent(req: AuthRequest, res: Response): Promise<void> {
    const { id } = req.params;

    const student = await Student.findByIdAndUpdate(id, { status: 'archived' });
    if (!student) {
      sendError(res, 'Student not found', 404);
      return;
    }

    // Drop from all classes
    await ClassEnrollment.updateMany({ studentId: student._id }, { status: 'dropped' });

    sendSuccess(res, null, 'Student archived and capacity slot freed.');
  }

  static async updateStudent(req: AuthRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const data = updateStudentSchema.parse(req.body);
    const userId = req.user!.userId;
    const orgId = req.user?.organizationId;
    const role = req.user!.role;

    const student = await Student.findById(id);
    if (!student) {
      sendError(res, 'Student not found.', 404);
      return;
    }

    // Permission check
    if (role !== ROLES.SUPER_ADMIN) {
      if (orgId && student.organizationId) {
        if (student.organizationId.toString() !== orgId.toString()) {
          sendError(res, 'Forbidden: You cannot modify students outside your institution.', 403);
          return;
        }
      } else if (student.createdByStaffId.toString() !== userId) {
        sendError(res, 'Forbidden: You can only edit students created by you.', 403);
        return;
      }
    }

    // If email is changing, check uniqueness in same scope
    if (data.email && data.email.toLowerCase().trim() !== student.email.toLowerCase().trim()) {
      const emailFilter: any = {
        _id: { $ne: student._id },
        email: data.email.toLowerCase().trim(),
        status: 'active',
      };
      if (orgId) {
        emailFilter.organizationId = orgId;
      } else {
        emailFilter.createdByStaffId = userId;
        emailFilter.organizationId = null;
      }

      const conflict = await Student.findOne(emailFilter);
      if (conflict) {
        sendError(res, 'Another active student already exists with this email address.', 400);
        return;
      }
      student.email = data.email.toLowerCase().trim();
    }

    if (data.firstName !== undefined) student.firstName = data.firstName.trim();
    if (data.lastName !== undefined) student.lastName = data.lastName.trim();
    if (data.studentIdNumber !== undefined) student.studentIdNumber = data.studentIdNumber.trim();
    if (data.phone !== undefined) student.phone = data.phone?.trim() || undefined;

    if (data.resetPasswordToDefault) {
      student.passwordHash = undefined;
      student.passwordChanged = false;
    }

    await student.save();

    // If classId is specified, ensure active enrollment in that class
    if (data.classId) {
      await ClassEnrollment.findOneAndUpdate(
        { classId: data.classId, studentId: student._id },
        { classId: data.classId, studentId: student._id, status: 'active', enrolledAt: new Date() },
        { upsert: true }
      );
    }

    await recordAuditLog({
      req,
      action: 'STUDENT_UPDATE',
      entity: 'Student',
      entityId: student._id.toString(),
      metadata: {
        studentEmail: student.email,
        studentIdNumber: student.studentIdNumber,
        updatedFields: Object.keys(data),
      },
    });

    // Populate enrolled classes to return updated student
    const enrollments = await ClassEnrollment.find({ studentId: student._id, status: 'active' }).populate(
      'classId',
      'name code'
    );
    const classes = enrollments.map((e) => e.classId).filter(Boolean);

    sendSuccess(
      res,
      {
        ...student.toSafeObject(),
        classes,
      },
      'Student details updated successfully.'
    );
  }
}
