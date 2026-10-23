import { Request, Response, NextFunction } from 'express';
import { verifyToken, TokenPayload } from '../utils/jwt';
import { sendError } from '../utils/response';
import { ROLES, UserRole } from '../constants';
import { User, OrganizationMembership, Student } from '../models';

export interface AuthRequest extends Request {
  user?: TokenPayload & {
    membership?: any;
    dbUser?: any;
  };
}

export async function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    let token = req.cookies?.token;

    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      sendError(res, 'Authentication required. Please sign in.', 401);
      return;
    }

    const decoded = verifyToken(token);
    
    // Check if user/student still exists and is active
    let dbUser: any = null;
    if (decoded.role === ROLES.STUDENT) {
      dbUser = await Student.findById(decoded.userId);
      if (!dbUser || dbUser.status === 'archived') {
        sendError(res, 'Student account is inactive or archived.', 403);
        return;
      }
    } else {
      dbUser = await User.findById(decoded.userId);
      if (!dbUser || dbUser.status === 'suspended') {
        sendError(res, 'User account is inactive or suspended.', 403);
        return;
      }
    }

    req.user = {
      ...decoded,
      dbUser,
    };

    next();
  } catch (err: any) {
    sendError(res, 'Invalid or expired session. Please sign in again.', 401);
  }
}

export function requireRoles(...allowedRoles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, 'Authentication required', 401);
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      sendError(res, `Access denied. Requires one of roles: [${allowedRoles.join(', ')}]`, 403);
      return;
    }

    next();
  };
}

export async function requireTenantAccess(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      sendError(res, 'Authentication required', 401);
      return;
    }

    // Super Admin has global access
    if (req.user.role === ROLES.SUPER_ADMIN) {
      return next();
    }

    const orgId = req.params.organizationId || req.body.organizationId || req.query.organizationId;
    if (!orgId) {
      return next();
    }

    const membership = await OrganizationMembership.findOne({
      organizationId: orgId,
      userId: req.user.userId,
      status: 'active',
    });

    if (!membership) {
      sendError(res, 'You do not have access to this organization.', 403);
      return;
    }

    req.user.membership = membership;
    next();
  } catch (err: any) {
    sendError(res, 'Tenant authorization check failed', 500);
  }
}
