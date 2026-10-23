import { Response } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { Organization, OrganizationMembership, User, Class, Student, Exam } from '../models';
import { AuthRequest } from '../middleware/auth';
import { sendSuccess, sendError } from '../utils/response';
import { EmailService } from '../services/email.service';
import { CapacityService } from '../services/capacity.service';
import { ROLES } from '../constants';
import { recordAuditLog } from '../utils/audit';

export class OrganizationController {
  static async getMyOrganization(req: AuthRequest, res: Response): Promise<void> {
    if (!req.user?.organizationId) {
      sendError(res, 'User does not belong to an organization.', 404);
      return;
    }

    const org = await Organization.findById(req.user.organizationId);
    if (!org) {
      sendError(res, 'Organization not found.', 404);
      return;
    }

    const capacity = await CapacityService.verifyCapacity('organization', org._id, 0);

    sendSuccess(res, {
      organization: org,
      capacity,
    });
  }

  static async updateOrganization(req: AuthRequest, res: Response): Promise<void> {
    const { name, address, contactPhone, logo } = req.body;
    const orgId = req.user?.organizationId;

    if (!orgId) {
      sendError(res, 'Organization context missing.', 400);
      return;
    }

    const org = await Organization.findByIdAndUpdate(
      orgId,
      { $set: { name, address, contactPhone, logo } },
      { new: true }
    );

    sendSuccess(res, org, 'Organization profile updated.');
  }

  static async listStaff(req: AuthRequest, res: Response): Promise<void> {
    const orgId = req.user?.organizationId;
    if (!orgId) {
      sendError(res, 'Organization context missing.', 400);
      return;
    }

    const memberships = await OrganizationMembership.find({ organizationId: orgId })
      .populate('userId', 'name email status avatar phone createdAt')
      .populate('assignedClassIds', 'name code');

    sendSuccess(res, memberships);
  }

  static async inviteStaff(req: AuthRequest, res: Response): Promise<void> {
    const { email, roleInOrg = 'staff', assignedClassIds = [] } = req.body;
    const orgId = req.user?.organizationId;

    if (!email) {
      sendError(res, 'Staff email is required.', 400);
      return;
    }

    const org = await Organization.findById(orgId);
    if (!org) {
      sendError(res, 'Organization not found.', 404);
      return;
    }

    let user = await User.findOne({ email: email.toLowerCase() });
    const invitationToken = crypto.randomBytes(32).toString('hex');

    if (!user) {
      // Create user placeholder with random password until they accept
      const salt = await bcrypt.genSalt(10);
      const tempHash = await bcrypt.hash(crypto.randomBytes(16).toString('hex'), salt);

      user = await User.create({
        name: email.split('@')[0],
        email: email.toLowerCase(),
        passwordHash: tempHash,
        role: ROLES.STAFF,
        status: 'pending',
        currentOrganizationId: org._id,
      });
    }

    // Check if already a member
    const existing = await OrganizationMembership.findOne({
      organizationId: org._id,
      userId: user._id,
    });

    if (existing) {
      sendError(res, 'This user is already a member of this organization.', 409);
      return;
    }

    const membership = await OrganizationMembership.create({
      organizationId: org._id,
      userId: user._id,
      roleInOrg,
      status: 'invited',
      assignedClassIds,
      invitationToken,
      invitedAt: new Date(),
    });

    // Send invitation email
    EmailService.sendStaffInvitation(
      user.email,
      org.name,
      req.user?.email || 'Administrator',
      invitationToken
    ).catch(console.error);

    await recordAuditLog({
      req,
      action: 'ORG_STAFF_INVITED',
      entity: 'OrganizationMembership',
      entityId: membership._id.toString(),
      metadata: { invitedEmail: user.email },
    });

    sendSuccess(res, membership, `Invitation sent to ${user.email}`, 201);
  }

  static async acceptInvitation(req: AuthRequest, res: Response): Promise<void> {
    const { token, name, password } = req.body;
    if (!token) {
      sendError(res, 'Invitation token is required.', 400);
      return;
    }

    const membership = await OrganizationMembership.findOne({
      invitationToken: token,
      status: 'invited',
    }).populate('organizationId');

    if (!membership) {
      sendError(res, 'Invalid or expired invitation token.', 400);
      return;
    }

    const user = await User.findById(membership.userId);
    if (!user) {
      sendError(res, 'Associated user account not found.', 404);
      return;
    }

    if (name) user.name = name;
    if (password) {
      const salt = await bcrypt.genSalt(10);
      user.passwordHash = await bcrypt.hash(password, salt);
    }
    user.status = 'active';
    user.emailVerified = true;
    user.currentOrganizationId = membership.organizationId as any;
    await user.save();

    membership.status = 'active';
    membership.acceptedAt = new Date();
    membership.invitationToken = undefined;
    await membership.save();

    sendSuccess(res, null, 'Invitation accepted! You may now sign in.');
  }

  static async removeStaff(req: AuthRequest, res: Response): Promise<void> {
    const { membershipId } = req.params;
    const orgId = req.user?.organizationId;

    const membership = await OrganizationMembership.findOne({
      _id: membershipId,
      organizationId: orgId,
    });

    if (!membership) {
      sendError(res, 'Staff membership not found.', 404);
      return;
    }

    await OrganizationMembership.findByIdAndDelete(membershipId);

    sendSuccess(res, null, 'Staff member removed from organization.');
  }

  static async getAnalytics(req: AuthRequest, res: Response): Promise<void> {
    const orgId = req.user?.organizationId;
    if (!orgId) {
      sendError(res, 'Organization context required.', 400);
      return;
    }

    const [staffCount, classCount, studentCount, examCount, capacity] = await Promise.all([
      OrganizationMembership.countDocuments({ organizationId: orgId, status: 'active' }),
      Class.countDocuments({ organizationId: orgId, isActive: true }),
      Student.countDocuments({ organizationId: orgId, status: 'active' }),
      Exam.countDocuments({ organizationId: orgId }),
      CapacityService.verifyCapacity('organization', orgId, 0),
    ]);

    sendSuccess(res, {
      staffCount,
      classCount,
      studentCount,
      examCount,
      capacity,
    });
  }
}
