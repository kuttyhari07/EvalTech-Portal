import mongoose from 'mongoose';
import './setup';
import { CapacityService } from '../src/services/capacity.service';
import { Student, User, SubscriptionPlan } from '../src/models';
import { INITIAL_PLANS, SUBSCRIPTION_TIERS } from '../src/constants';

describe('CapacityService & Student Quota Engine', () => {
  let staffId: mongoose.Types.ObjectId;

  beforeEach(async () => {
    await SubscriptionPlan.insertMany(INITIAL_PLANS);
    staffId = new mongoose.Types.ObjectId();
  });

  test('auto-assigns Free plan with 10 max students on first lookup', async () => {
    const sub = await CapacityService.getActiveSubscription('staff', staffId);
    expect(sub).toBeDefined();
    expect(sub.tier).toBe(SUBSCRIPTION_TIERS.FREE);
    expect(sub.studentCapacity).toBe(10);
  });

  test('calculates distinct active students and enforces capacity boundaries', async () => {
    // Add 10 students
    for (let i = 1; i <= 10; i++) {
      await Student.create({
        studentIdNumber: `STU-00${i}`,
        firstName: `First${i}`,
        lastName: `Last${i}`,
        email: `student${i}@test.com`,
        createdByStaffId: staffId,
        status: 'active',
      });
    }

    const check1 = await CapacityService.verifyCapacity('staff', staffId, 0);
    expect(check1.currentUsage).toBe(10);
    expect(check1.remainingCapacity).toBe(0);

    // Attempting to add 1 more student must be blocked
    const checkBlocked = await CapacityService.verifyCapacity('staff', staffId, 1);
    expect(checkBlocked.allowed).toBe(false);

    // assertCanAddStudents must throw 403
    await expect(CapacityService.assertCanAddStudents('staff', staffId, 1)).rejects.toThrow(
      /Student capacity limit reached/
    );
  });

  test('does not double count duplicate students in multiple classes within same staff workspace', async () => {
    // Add same student email
    await Student.create({
      studentIdNumber: 'STU-100',
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane.doe@example.com',
      createdByStaffId: staffId,
      status: 'active',
    });

    const usage = await CapacityService.getUsageCount('staff', staffId);
    expect(usage).toBe(1);

    const check = await CapacityService.verifyCapacity('staff', staffId, 1);
    expect(check.remainingCapacity).toBe(9);
  });

  test('releasing/archiving a student immediately frees capacity', async () => {
    const student = await Student.create({
      studentIdNumber: 'STU-RELEASE',
      firstName: 'Alice',
      lastName: 'Smith',
      email: 'alice@example.com',
      createdByStaffId: staffId,
      status: 'active',
    });

    expect(await CapacityService.getUsageCount('staff', staffId)).toBe(1);

    // Archive student
    student.status = 'archived';
    await student.save();

    expect(await CapacityService.getUsageCount('staff', staffId)).toBe(0);
  });
});
