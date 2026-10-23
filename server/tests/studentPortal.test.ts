import request from 'supertest';
import mongoose from 'mongoose';
import './setup';
import app from '../src/server';
import { Student, Class, ClassEnrollment, Exam, ExamAttempt, ExamResult, User } from '../src/models';
import { ROLES } from '../src/constants';

describe('Student Portal, Login, Exam Passwords & Leaderboard API', () => {
  let staffId: mongoose.Types.ObjectId;
  let student1Id: mongoose.Types.ObjectId;
  let student2Id: mongoose.Types.ObjectId;
  let classId: mongoose.Types.ObjectId;
  let examId: mongoose.Types.ObjectId;
  let student1Token: string;
  let student2Token: string;

  beforeEach(async () => {
    staffId = new mongoose.Types.ObjectId();
    classId = new mongoose.Types.ObjectId();

    // Create staff user
    await User.create({
      _id: staffId,
      name: 'Professor Turing',
      email: 'turing@evaltech.io',
      passwordHash: 'dummyhash',
      role: ROLES.STAFF,
      emailVerified: true,
    });

    // Create Class
    await Class.create({
      _id: classId,
      name: 'Computer Science 101',
      code: 'CS101',
      staffId: staffId,
    });

    // Create Student 1 (Roll Number: 21CS001)
    student1Id = new mongoose.Types.ObjectId();
    const student1 = await Student.create({
      _id: student1Id,
      firstName: 'Alice',
      lastName: 'Smith',
      email: 'alice@evaltech.io',
      studentIdNumber: '21CS001',
      createdByStaffId: staffId,
      status: 'active',
    });

    // Create Student 2 (Roll Number: 21CS002)
    student2Id = new mongoose.Types.ObjectId();
    const student2 = await Student.create({
      _id: student2Id,
      firstName: 'Bob',
      lastName: 'Jones',
      email: 'bob@evaltech.io',
      studentIdNumber: '21CS002',
      createdByStaffId: staffId,
      status: 'active',
    });

    // Enroll both students into Class CS101
    await ClassEnrollment.create([
      { classId, studentId: student1Id, status: 'active' },
      { classId, studentId: student2Id, status: 'active' },
    ]);

    // Create Exam with Start Password & Exit Password assigned to class CS101
    examId = new mongoose.Types.ObjectId();
    await Exam.create({
      _id: examId,
      title: 'Data Structures Midterm',
      examCode: 'DS-MID-2026',
      creatorId: staffId,
      subject: 'Computer Science',
      startsAt: new Date(Date.now() - 3600000),
      endsAt: new Date(Date.now() + 86400000),
      classIds: [classId],
      durationMinutes: 60,
      totalMarks: 100,
      passingMarks: 50,
      startPassword: 'START_KEY_999',
      exitPassword: 'EXIT_KEY_888',
      status: 'published',
      publishedAt: new Date(),
      questions: [],
    });
  });

  describe('1. Student Authentication & Default Password (Test@123)', () => {
    it('allows student to login using their Roll Number and default password Test@123', async () => {
      const res = await request(app)
        .post('/api/auth/student-login')
        .send({
          username: '21CS001',
          password: 'Test@123',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.studentIdNumber).toBe('21CS001');
      expect(res.body.data.user.role).toBe('student');
      expect(res.body.data.token).toBeDefined();

      student1Token = res.body.data.token;
    });

    it('allows student to login using their Email and default password Test@123', async () => {
      const res = await request(app)
        .post('/api/auth/student-login')
        .send({
          username: 'bob@evaltech.io',
          password: 'Test@123',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.studentIdNumber).toBe('21CS002');
      expect(res.body.data.token).toBeDefined();

      student2Token = res.body.data.token;
    });

    it('rejects login with invalid password', async () => {
      const res = await request(app)
        .post('/api/auth/student-login')
        .send({
          username: '21CS001',
          password: 'WrongPassword',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Invalid password/i);
    });

    it('rejects login when student roll number or email is not found', async () => {
      const res = await request(app)
        .post('/api/auth/student-login')
        .send({
          username: 'UNKNOWN_999',
          password: 'Test@123',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Student account not found/i);
    });
  });

  describe('2. Student Password Change in Profile', () => {
    it('allows student to change password and login with new password', async () => {
      // Login first to get token
      const loginRes = await request(app)
        .post('/api/auth/student-login')
        .send({
          username: '21CS001',
          password: 'Test@123',
        });
      const token = loginRes.body.data.token;

      // Change password
      const changeRes = await request(app)
        .post('/api/auth/student/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          currentPassword: 'Test@123',
          newPassword: 'MyNewSecurePassword!2026',
        });

      expect(changeRes.status).toBe(200);
      expect(changeRes.body.success).toBe(true);

      // Verify old password no longer works
      const oldLogin = await request(app)
        .post('/api/auth/student-login')
        .send({
          username: '21CS001',
          password: 'Test@123',
        });
      expect(oldLogin.status).toBe(401);

      // Verify new password works
      const newLogin = await request(app)
        .post('/api/auth/student-login')
        .send({
          username: '21CS001',
          password: 'MyNewSecurePassword!2026',
        });
      expect(newLogin.status).toBe(200);
      expect(newLogin.body.data.user.passwordChanged).toBe(true);
    });
  });

  describe('3. Student Dashboard & Assigned Exams', () => {

    it('returns assigned exams, class enrollments, and status in dashboard', async () => {
      // Login as student 1
      const loginRes = await request(app)
        .post('/api/auth/student-login')
        .send({
          username: '21CS001',
          password: 'Test@123',
        });
      const token = loginRes.body.data.token;

      const dashboardRes = await request(app)
        .get('/api/student-portal/dashboard')
        .set('Authorization', `Bearer ${token}`);

      expect(dashboardRes.status).toBe(200);
      expect(dashboardRes.body.success).toBe(true);
      expect(dashboardRes.body.data.student.studentIdNumber).toBe('21CS001');
      expect(dashboardRes.body.data.student.enrolledClasses.length).toBe(1);
      expect(dashboardRes.body.data.student.enrolledClasses[0].name).toBe('Computer Science 101');
      
      // Should show the exam assigned to their class
      expect(dashboardRes.body.data.assignedExams.length).toBe(1);
      const assignedExam = dashboardRes.body.data.assignedExams[0];
      expect(assignedExam.title).toBe('Data Structures Midterm');
      expect(assignedExam.requireStartPassword).toBe(true);
      expect(assignedExam.requireExitPassword).toBe(true);
      // Ensure raw passwords are never leaked
      expect(assignedExam.startPassword).toBeUndefined();
      expect(assignedExam.exitPassword).toBeUndefined();
    });
  });

  describe('4. Exam Start Password & Exit Password Enforcement', () => {
    it('requires startPassword to start attempt and exitPassword to finalize', async () => {
      // Student 1 starts attempt without password -> fails
      const startFailRes = await request(app)
        .post('/api/attempts/start')
        .send({
          examCode: 'DS-MID-2026',
          name: 'Alice Smith',
          email: 'alice@evaltech.io',
          rollNo: '21CS001',
          startPassword: 'WRONG_START_KEY',
        });

      expect(startFailRes.status).toBe(401);
      expect(startFailRes.body.message).toMatch(/Start Password/i);

      // Student 1 starts attempt with correct password -> succeeds
      const startSuccessRes = await request(app)
        .post('/api/attempts/start')
        .send({
          examCode: 'DS-MID-2026',
          name: 'Alice Smith',
          email: 'alice@evaltech.io',
          rollNo: '21CS001',
          startPassword: 'START_KEY_999',
        });

      expect(startSuccessRes.status).toBe(200);
      expect(startSuccessRes.body.success).toBe(true);
      const attemptId = startSuccessRes.body.data.attemptId;
      const submissionToken = startSuccessRes.body.data.submissionToken;
      expect(attemptId).toBeDefined();
      expect(submissionToken).toBeDefined();

      // Submit without exit password -> fails
      const submitFailRes = await request(app)
        .post(`/api/attempts/${attemptId}/submit`)
        .send({
          submissionToken,
          exitPassword: 'WRONG_EXIT_KEY',
        });

      expect(submitFailRes.status).toBe(401);
      expect(submitFailRes.body.message).toMatch(/exit password/i);

      // Submit with correct exit password -> succeeds
      const submitSuccessRes = await request(app)
        .post(`/api/attempts/${attemptId}/submit`)
        .send({
          submissionToken,
          exitPassword: 'EXIT_KEY_888',
        });

      expect(submitSuccessRes.status).toBe(200);
      expect(submitSuccessRes.body.success).toBe(true);
      expect(submitSuccessRes.body.data.submitted).toBe(true);
    });
  });

  describe('5. Exam Leaderboard with High Scores & Podium', () => {
    it('computes exam leaderboard partitioned by exam, sorting by high scores', async () => {
      // Create attempts and exam results for Student 1 (Score: 95) and Student 2 (Score: 78)
      const attempt1 = await ExamAttempt.create({
        examId,
        studentId: student1Id,
        studentInfo: {
          name: 'Alice Smith',
          email: 'alice@evaltech.io',
          rollNo: '21CS001',
        },
        attemptNumber: 1,
        startedAt: new Date(Date.now() - 3600000),
        expiresAt: new Date(Date.now() + 3600000),
        submittedAt: new Date(),
        status: 'submitted',
        timeSpentSeconds: 1800,
        submissionToken: 'token1_abc',
        clientEvents: [],
        programmingDrafts: [],
      });

      await ExamResult.create({
        attemptId: attempt1._id,
        examId,
        studentId: student1Id,
        studentInfo: {
          name: 'Alice Smith',
          email: 'alice@evaltech.io',
          rollNo: '21CS001',
        },
        totalScore: 95,
        maxScore: 100,
        percentage: 95,
        isPassed: true,
        programmingScore: 0,
        programmingMaxScore: 0,
        evaluationStatus: 'completed',
        questionBreakdown: [],
        isReleased: true,
        emailSent: false,
        evaluatedAt: new Date(),
      });

      const attempt2 = await ExamAttempt.create({
        examId,
        studentId: student2Id,
        studentInfo: {
          name: 'Bob Jones',
          email: 'bob@evaltech.io',
          rollNo: '21CS002',
        },
        attemptNumber: 1,
        startedAt: new Date(Date.now() - 3600000),
        expiresAt: new Date(Date.now() + 3600000),
        submittedAt: new Date(),
        status: 'submitted',
        timeSpentSeconds: 2400,
        submissionToken: 'token2_xyz',
        clientEvents: [],
        programmingDrafts: [],
      });

      await ExamResult.create({
        attemptId: attempt2._id,
        examId,
        studentId: student2Id,
        studentInfo: {
          name: 'Bob Jones',
          email: 'bob@evaltech.io',
          rollNo: '21CS002',
        },
        totalScore: 78,
        maxScore: 100,
        percentage: 78,
        isPassed: true,
        programmingScore: 0,
        programmingMaxScore: 0,
        evaluationStatus: 'completed',
        questionBreakdown: [],
        isReleased: true,
        emailSent: false,
        evaluatedAt: new Date(),
      });

      // Login as student 2
      const loginRes = await request(app)
        .post('/api/auth/student-login')
        .send({
          username: '21CS002',
          password: 'Test@123',
        });
      const token = loginRes.body.data.token;

      // Query Leaderboard
      const leaderboardRes = await request(app)
        .get(`/api/student-portal/leaderboard?examId=${examId.toString()}`)
        .set('Authorization', `Bearer ${token}`);

      expect(leaderboardRes.status).toBe(200);
      expect(leaderboardRes.body.success).toBe(true);

      const { selectedExam, leaderboard, myRank, totalParticipants, highestScore } =
        leaderboardRes.body.data;
      expect(selectedExam.title).toBe('Data Structures Midterm');
      expect(totalParticipants).toBe(2);
      expect(highestScore).toBe(95);

      // Leaderboard should be sorted descending: Alice (Rank 1, 95), Bob (Rank 2, 78)
      expect(leaderboard.length).toBe(2);
      expect(leaderboard[0].rank).toBe(1);
      expect(leaderboard[0].studentName).toBe('Alice Smith');
      expect(leaderboard[0].totalScore).toBe(95);

      expect(leaderboard[1].rank).toBe(2);
      expect(leaderboard[1].studentName).toBe('Bob Jones');
      expect(leaderboard[1].totalScore).toBe(78);

      // Current student (Bob) rank should be 2
      expect(myRank).toBe(2);
      expect(leaderboard[1].isCurrentStudent).toBe(true);
    });
  });
});
