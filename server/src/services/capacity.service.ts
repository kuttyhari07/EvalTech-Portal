import mongoose from 'mongoose';
import { Subscription, Student, SubscriptionPlan } from '../models';
import { INITIAL_PLANS, SUBSCRIPTION_TIERS } from '../constants';

export interface CapacityCheckResult {
  allowed: boolean;
  maxCapacity: number;
  currentUsage: number;
  remainingCapacity: number;
  tier: string;
  status: string;
  message?: string;
}

export class CapacityService {
  /**
   * Get the active subscription for a target (staff or organization).
   * If none exists, creates or returns the Free tier (10 students).
   */
  static async getActiveSubscription(
    targetType: 'staff' | 'organization',
    targetId: string | mongoose.Types.ObjectId
  ) {
    const objectId = new mongoose.Types.ObjectId(targetId);

    let subscription = await Subscription.findOne({
      targetType,
      targetId: objectId,
      status: 'active',
      currentPeriodEnd: { $gte: new Date() },
    }).populate('planId');

    if (!subscription) {
      // Find or seed the Free plan
      let freePlan = await SubscriptionPlan.findOne({ tier: SUBSCRIPTION_TIERS.FREE });
      if (!freePlan) {
        const defaultFree = INITIAL_PLANS.find((p) => p.tier === SUBSCRIPTION_TIERS.FREE)!;
        freePlan = await SubscriptionPlan.create(defaultFree);
      }

      // Create an automatic free subscription
      const periodEnd = new Date();
      periodEnd.setFullYear(periodEnd.getFullYear() + 10); // 10 years free

      subscription = await Subscription.create({
        targetType,
        targetId: objectId,
        planId: freePlan._id,
        tier: freePlan.tier,
        studentCapacity: freePlan.maxStudents,
        billingCycle: 'monthly',
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: periodEnd,
        autoRenew: true,
      });

      subscription.planId = freePlan as any;
    }

    return subscription;
  }

  /**
   * Calculates distinct active student count within the target scope.
   * If organization: counts distinct active students where organizationId = targetId.
   * If staff: counts distinct active students where createdByStaffId = targetId AND organizationId is null.
   */
  static async getUsageCount(
    targetType: 'staff' | 'organization',
    targetId: string | mongoose.Types.ObjectId
  ): Promise<number> {
    const objectId = new mongoose.Types.ObjectId(targetId);

    const matchStage: any = {
      status: 'active',
    };

    if (targetType === 'organization') {
      matchStage.organizationId = objectId;
    } else {
      matchStage.createdByStaffId = objectId;
      matchStage.organizationId = null; // Independent staff capacity scope
    }

    // Group by email/studentIdNumber to ensure distinct count
    const result = await Student.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: { $toLower: '$email' },
          count: { $sum: 1 },
        },
      },
      {
        $count: 'distinctStudents',
      },
    ]);

    return result.length > 0 ? result[0].distinctStudents : 0;
  }

  /**
   * Check whether the target has remaining capacity to add N distinct students.
   */
  static async verifyCapacity(
    targetType: 'staff' | 'organization',
    targetId: string | mongoose.Types.ObjectId,
    incomingCount = 1
  ): Promise<CapacityCheckResult> {
    const subscription = await this.getActiveSubscription(targetType, targetId);
    const currentUsage = await this.getUsageCount(targetType, targetId);
    const maxCapacity = subscription.studentCapacity;
    const remaining = Math.max(0, maxCapacity - currentUsage);

    const allowed = currentUsage + incomingCount <= maxCapacity;

    return {
      allowed,
      maxCapacity,
      currentUsage,
      remainingCapacity: remaining,
      tier: subscription.tier,
      status: subscription.status,
      message: allowed
        ? undefined
        : `Student capacity limit reached (${currentUsage}/${maxCapacity}). Please upgrade your plan to add more students.`,
    };
  }

  /**
   * Guard function: throws or rejects if capacity exceeded.
   */
  static async assertCanAddStudents(
    targetType: 'staff' | 'organization',
    targetId: string | mongoose.Types.ObjectId,
    incomingCount = 1
  ): Promise<void> {
    const check = await this.verifyCapacity(targetType, targetId, incomingCount);
    if (!check.allowed) {
      const err: any = new Error(check.message);
      err.statusCode = 403;
      err.isOperational = true;
      err.capacityDetails = check;
      throw err;
    }
  }
}
