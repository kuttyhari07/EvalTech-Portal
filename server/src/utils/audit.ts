import { Request } from 'express';
import { AuditLog } from '../models';

export interface AuditParams {
  req?: Request;
  actorId?: any;
  actorEmail?: string;
  actorRole?: string;
  action: string;
  entity: string;
  entityId?: string;
  organizationId?: any;
  metadata?: Record<string, any>;
}

export async function recordAuditLog(params: AuditParams): Promise<void> {
  try {
    const ipAddress = params.req?.ip || params.req?.headers['x-forwarded-for']?.toString();
    const userAgent = params.req?.headers['user-agent'];

    await AuditLog.create({
      actorId: params.actorId || (params.req as any)?.user?.userId,
      actorEmail: params.actorEmail || (params.req as any)?.user?.email,
      actorRole: params.actorRole || (params.req as any)?.user?.role,
      action: params.action,
      entity: params.entity,
      entityId: params.entityId,
      organizationId: params.organizationId || (params.req as any)?.user?.organizationId,
      ipAddress,
      userAgent,
      metadata: params.metadata,
    });
  } catch (err: any) {
    console.error('[AuditLog] Failed to record audit log:', err.message);
  }
}
