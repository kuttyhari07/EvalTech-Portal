import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

import { EmailService } from '../services/email.service';

const testEmail = 'hariharangmhk0429@gmail.com';
const testName = 'Hariharan G';

async function run() {
  console.log(`Starting test email dispatch to: ${testEmail}`);

  // 1. Verification Email
  console.log('\n--- 1. Sending Verification Email ---');
  const vResult = await EmailService.sendVerificationEmail(
    testEmail,
    testName,
    'test_verification_token_123456'
  );
  console.log('Verification Email Sent:', vResult);

  // 2. Password Reset Email
  console.log('\n--- 2. Sending Password Reset Email ---');
  const pResult = await EmailService.sendPasswordResetEmail(
    testEmail,
    testName,
    'test_password_reset_token_abcdef'
  );
  console.log('Password Reset Email Sent:', pResult);

  // 3. Staff Invitation Email
  console.log('\n--- 3. Sending Staff Invitation Email ---');
  const iResult = await EmailService.sendStaffInvitation(
    testEmail,
    'EvalTech Engineering Academy',
    'Administrator',
    'test_staff_invite_token_xyz987'
  );
  console.log('Staff Invitation Email Sent:', iResult);

  // 4. Student Welcome Credentials Email
  console.log('\n--- 4. Sending Student Welcome Credentials Email ---');
  const sResult = await EmailService.sendStudentWelcomeEmail(
    testEmail,
    testName,
    'ES24IT38',
    'Test@123',
    'Department of Information Technology'
  );
  console.log('Student Welcome Email Sent:', sResult);

  // 5. Exam Notification Email (SEB enforced)
  console.log('\n--- 5. Sending Exam Notification Email (SEB Enforced) ---');
  const eResult = await EmailService.sendExamNotification(
    testEmail,
    testName,
    'PLACEMENT: JAVA & FULL STACK EVALUATION',
    'EVT-U8QX',
    new Date(),
    45,
    true
  );
  console.log('Exam Notification Email Sent:', eResult);

  // 6. Exam Result Email
  console.log('\n--- 6. Sending Exam Result Email ---');
  const rResult = await EmailService.sendExamResultEmail(
    testEmail,
    testName,
    'PLACEMENT: JAVA & FULL STACK EVALUATION',
    42,
    48,
    87.5,
    true,
    'EVT-U8QX',
    {
      examDate: new Date(),
      programmingScore: 24,
      programmingMaxScore: 25,
      evaluationStatus: 'completed',
    }
  );
  console.log('Exam Result Email Sent:', rResult);

  console.log('\n=== ALL TEST EMAILS FINISHED ===');
}

run().catch((err) => {
  console.error('Fatal error running email tests:', err);
  process.exit(1);
});
