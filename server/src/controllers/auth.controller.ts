import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { z } from 'zod';
import { User, Organization, OrganizationMembership, Student } from '../models';
import { generateToken, setAuthCookie, clearAuthCookie } from '../utils/jwt';
import { sendSuccess, sendError } from '../utils/response';
import { recordAuditLog } from '../utils/audit';
import { EmailService } from '../services/email.service';
import { CapacityService } from '../services/capacity.service';
import { ROLES } from '../constants';
import { AuthRequest } from '../middleware/auth';

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum([ROLES.STAFF, ROLES.ORG_ADMIN]).default(ROLES.STAFF),
  organizationName: z.string().optional(),
  phone: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const studentLoginSchema = z.object({
  username: z.string().min(1, 'Roll number or email is required'),
  password: z.string().min(1, 'Password is required'),
});

export class AuthController {
  static async register(req: Request, res: Response): Promise<void> {
    const data = registerSchema.parse(req.body);

    const existingUser = await User.findOne({ email: data.email.toLowerCase() });
    if (existingUser) {
      sendError(res, 'An account with this email already exists.', 409);
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(data.password, salt);
    const verificationToken = crypto.randomBytes(32).toString('hex');

    let currentOrganizationId: any = undefined;

    // Create the User document
    const user = await User.create({
      name: data.name,
      email: data.email.toLowerCase(),
      passwordHash,
      role: data.role,
      phone: data.phone,
      emailVerified: false,
      emailVerificationToken: verificationToken,
    });

    // If registering as Org Admin and provided organizationName
    if (data.role === ROLES.ORG_ADMIN && data.organizationName) {
      const slug = data.organizationName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') + '-' + Date.now().toString().slice(-4);

      const org = await Organization.create({
        name: data.organizationName,
        slug,
        contactEmail: user.email,
        contactPhone: data.phone,
        createdBy: user._id,
      });

      await OrganizationMembership.create({
        organizationId: org._id,
        userId: user._id,
        roleInOrg: 'org_admin',
        status: 'active',
        permissions: ['*'],
      });

      user.currentOrganizationId = org._id;
      await user.save();
      currentOrganizationId = org._id.toString();

      // Initialize organization subscription (Free tier initial)
      await CapacityService.getActiveSubscription('organization', org._id);
    } else {
      // Independent staff: Initialize personal subscription (Free tier initial)
      await CapacityService.getActiveSubscription('staff', user._id);
    }

    // Send verification email in background
    EmailService.sendVerificationEmail(user.email, user.name, verificationToken).catch(console.error);

    // Generate JWT and set secure cookie
    const token = generateToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      organizationId: currentOrganizationId,
    });
    setAuthCookie(res, token);

    await recordAuditLog({
      req,
      actorId: user._id,
      actorEmail: user.email,
      actorRole: user.role,
      action: 'AUTH_REGISTER',
      entity: 'User',
      entityId: user._id.toString(),
    });

    sendSuccess(
      res,
      {
        user: user.toSafeObject(),
        token,
      },
      'Registration successful. Please check your email to verify your account.',
      201
    );
  }

  static async login(req: Request, res: Response): Promise<void> {
    const data = loginSchema.parse(req.body);

    const user = await User.findOne({ email: data.email.toLowerCase() });
    if (!user) {
      sendError(res, 'Invalid email or password.', 401);
      return;
    }

    if (user.status === 'suspended') {
      sendError(res, 'Your account has been suspended. Please contact platform support.', 403);
      return;
    }

    const isMatch = await user.comparePassword(data.password);
    if (!isMatch) {
      sendError(res, 'Invalid email or password.', 401);
      return;
    }

    // If user has organization membership
    let organizationId: string | undefined = user.currentOrganizationId?.toString();
    if (!organizationId && user.role !== ROLES.SUPER_ADMIN) {
      const membership = await OrganizationMembership.findOne({
        userId: user._id,
        status: 'active',
      });
      if (membership) {
        organizationId = membership.organizationId.toString();
        user.currentOrganizationId = membership.organizationId;
        await user.save();
      }
    }

    const token = generateToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      organizationId,
    });
    setAuthCookie(res, token);

    await recordAuditLog({
      req,
      actorId: user._id,
      actorEmail: user.email,
      actorRole: user.role,
      action: 'AUTH_LOGIN',
      entity: 'User',
      entityId: user._id.toString(),
    });

    sendSuccess(
      res,
      {
        user: user.toSafeObject(),
        token,
      },
      'Welcome back! Login successful.'
    );
  }

  static async studentLogin(req: Request, res: Response): Promise<void> {
    try {
      const data = studentLoginSchema.parse(req.body);
      const identifier = data.username.trim();

      // Lookup student by roll number (studentIdNumber) or email
      const student = await Student.findOne({
        $or: [
          { studentIdNumber: { $regex: new RegExp(`^${identifier.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } },
          { email: identifier.toLowerCase() },
        ],
        status: 'active',
      });

      if (!student) {
        sendError(res, 'Student account not found with this Roll Number or Email. Please check with your teacher.', 401);
        return;
      }

      const isMatch = await student.comparePassword(data.password);
      if (!isMatch) {
        sendError(res, 'Invalid password. (Default password for new students is Test@123)', 401);
        return;
      }

      const token = generateToken({
        userId: student._id.toString(),
        email: student.email,
        role: ROLES.STUDENT,
        organizationId: student.organizationId?.toString(),
      });
      setAuthCookie(res, token);

      await recordAuditLog({
        req,
        actorId: student._id,
        actorEmail: student.email,
        actorRole: ROLES.STUDENT,
        action: 'STUDENT_LOGIN',
        entity: 'Student',
        entityId: student._id.toString(),
      });

      const safeStudent = {
        _id: student._id,
        name: `${student.firstName} ${student.lastName}`.trim(),
        email: student.email,
        studentIdNumber: student.studentIdNumber,
        role: ROLES.STUDENT,
        organizationId: student.organizationId,
        passwordChanged: student.passwordChanged,
      };

      sendSuccess(
        res,
        {
          user: safeStudent,
          token,
        },
        'Welcome back, student! Login successful.'
      );
    } catch (err: any) {
      console.error('[StudentLogin Error]:', err);
      sendError(res, err.message || 'Student login failed.', 400);
    }
  }

  static async logout(req: Request, res: Response): Promise<void> {
    clearAuthCookie(res);
    sendSuccess(res, null, 'Successfully signed out.');
  }

  static async getCurrentUser(req: AuthRequest, res: Response): Promise<void> {
    if (!req.user) {
      sendError(res, 'Unauthenticated', 401);
      return;
    }

    // If logged-in user is a student
    if (req.user.role === ROLES.STUDENT) {
      const student = await Student.findById(req.user.userId);
      if (!student) {
        sendError(res, 'Student account not found', 404);
        return;
      }

      let organization: any = null;
      if (student.organizationId) {
        organization = await Organization.findById(student.organizationId);
      }

      sendSuccess(res, {
        user: {
          _id: student._id,
          name: `${student.firstName} ${student.lastName}`.trim(),
          email: student.email,
          studentIdNumber: student.studentIdNumber,
          role: ROLES.STUDENT,
          organizationId: student.organizationId,
          passwordChanged: student.passwordChanged,
          createdAt: student.createdAt,
        },
        organization,
      });
      return;
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      sendError(res, 'User not found', 404);
      return;
    }

    let organization: any = null;
    if (req.user.organizationId) {
      organization = await Organization.findById(req.user.organizationId);
    }

    sendSuccess(res, {
      user: user.toSafeObject(),
      organization,
    });
  }

  static async changeStudentPassword(req: AuthRequest, res: Response): Promise<void> {
    if (!req.user || req.user.role !== ROLES.STUDENT) {
      sendError(res, 'Only students can access this endpoint.', 403);
      return;
    }

    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword || newPassword.length < 6) {
      sendError(res, 'New password must be at least 6 characters long.', 400);
      return;
    }

    const student = await Student.findById(req.user.userId);
    if (!student) {
      sendError(res, 'Student record not found.', 404);
      return;
    }

    const isMatch = await student.comparePassword(currentPassword);
    if (!isMatch) {
      sendError(res, 'Current password entered is incorrect.', 401);
      return;
    }

    const salt = await bcrypt.genSalt(10);
    student.passwordHash = await bcrypt.hash(newPassword, salt);
    student.passwordChanged = true;
    await student.save();

    await recordAuditLog({
      req,
      actorId: student._id,
      actorEmail: student.email,
      actorRole: ROLES.STUDENT,
      action: 'STUDENT_PASSWORD_CHANGE',
      entity: 'Student',
      entityId: student._id.toString(),
    });

    sendSuccess(res, { success: true }, 'Your password has been changed successfully!');
  }

  static async verifyEmail(req: Request, res: Response): Promise<void> {
    const { token, email } = req.query;
    if (!token || !email) {
      sendError(res, 'Invalid verification link parameters.', 400);
      return;
    }

    const user = await User.findOne({
      email: String(email).toLowerCase(),
      emailVerificationToken: String(token),
    });

    if (!user) {
      sendError(res, 'Invalid or expired verification token.', 400);
      return;
    }

    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    await user.save();

    await recordAuditLog({
      req,
      actorId: user._id,
      actorEmail: user.email,
      action: 'AUTH_EMAIL_VERIFIED',
      entity: 'User',
      entityId: user._id.toString(),
    });

    sendSuccess(res, null, 'Email successfully verified! You may now use all platform features.');
  }

  static async forgotPassword(req: Request, res: Response): Promise<void> {
    const { email } = req.body;
    if (!email) {
      sendError(res, 'Email address is required.', 400);
      return;
    }

    const user = await User.findOne({ email: String(email).toLowerCase() });
    if (!user) {
      // Ambiguous message for security to avoid email enumeration
      sendSuccess(res, null, 'If that email is registered, password reset instructions have been sent.');
      return;
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetToken = resetToken;
    user.passwordResetExpires = new Date(Date.now() + 3600000); // 1 hour
    await user.save();

    const resetLink = `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}&email=${encodeURIComponent(user.email)}`;
    EmailService.sendMail(
      user.email,
      'Reset your EvalTech Password',
      `<p>Hello ${user.name},</p><p>Click the link below to reset your password:</p><p><a href="${resetLink}">Reset Password</a></p><p>This link expires in 1 hour.</p>`
    ).catch(console.error);

    sendSuccess(res, null, 'If that email is registered, password reset instructions have been sent.');
  }

  static async resetPassword(req: Request, res: Response): Promise<void> {
    const { token, email, newPassword } = req.body;
    if (!token || !email || !newPassword) {
      sendError(res, 'Token, email, and new password are required.', 400);
      return;
    }

    const user = await User.findOne({
      email: String(email).toLowerCase(),
      passwordResetToken: String(token),
      passwordResetExpires: { $gt: new Date() },
    });

    if (!user) {
      sendError(res, 'Invalid or expired password reset token.', 400);
      return;
    }

    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(newPassword, salt);
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    sendSuccess(res, null, 'Password successfully reset. You may now sign in.');
  }
}
