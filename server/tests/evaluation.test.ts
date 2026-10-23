import mongoose from 'mongoose';
import './setup';
import { EvaluationService } from '../src/services/evaluation.service';
import { Exam, Question, ExamAttempt, StudentAnswer, ExamResult } from '../src/models';
import { QUESTION_TYPES, EXAM_STATUS, ATTEMPT_STATUS } from '../src/constants';

describe('EvaluationService & Auto-Scoring Engine', () => {
  let exam: any;
  let attempt: any;
  let qMcq: any;
  let qMulti: any;
  let qFill: any;

  beforeEach(async () => {
    const creatorId = new mongoose.Types.ObjectId();

    // 1. Create MCQ Question (2 marks, 0.5 negative)
    qMcq = await Question.create({
      subject: 'Computer Science',
      type: QUESTION_TYPES.MCQ,
      text: 'What does CPU stand for?',
      options: [
        { id: 'opt_1', text: 'Central Processing Unit' },
        { id: 'opt_2', text: 'Computer Personal Unit' },
      ],
      correctAnswers: ['opt_1'],
      defaultMarks: 2,
      negativeMarks: 0.5,
      creatorId,
    });

    // 2. Create Multi-Select Question (4 marks)
    qMulti = await Question.create({
      subject: 'Computer Science',
      type: QUESTION_TYPES.MULTIPLE_SELECT,
      text: 'Select the primary cloud providers',
      options: [
        { id: 'opt_aws', text: 'AWS' },
        { id: 'opt_gcp', text: 'GCP' },
        { id: 'opt_fake', text: 'FakeCloud' },
      ],
      correctAnswers: ['opt_aws', 'opt_gcp'],
      defaultMarks: 4,
      creatorId,
    });

    // 3. Create Fill-in-the-blank Question (2 marks)
    qFill = await Question.create({
      subject: 'Computer Science',
      type: QUESTION_TYPES.FILL_BLANK,
      text: 'HTTP stands for HyperText Transfer ________',
      options: [],
      correctAnswers: ['Protocol'],
      defaultMarks: 2,
      creatorId,
    });

    // Create Exam
    exam = await Exam.create({
      title: 'CS 101 Midterm',
      examCode: 'CS101TEST',
      creatorId,
      subject: 'Computer Science',
      totalMarks: 8,
      passingMarks: 4,
      durationMinutes: 30,
      startsAt: new Date(),
      endsAt: new Date(Date.now() + 3600000),
      negativeMarking: { enabled: true, penaltyPerQuestion: 0.5 },
      releaseResultsMode: 'immediate',
      questions: [
        { questionId: qMcq._id, marks: 2, negativeMarks: 0.5, order: 1 },
        { questionId: qMulti._id, marks: 4, negativeMarks: 0.5, order: 2 },
        { questionId: qFill._id, marks: 2, negativeMarks: 0.5, order: 3 },
      ],
      status: EXAM_STATUS.PUBLISHED,
    });

    // Create Attempt
    attempt = await ExamAttempt.create({
      examId: exam._id,
      studentInfo: {
        name: 'Test Student',
        email: 'test@student.edu',
      },
      attemptNumber: 1,
      startedAt: new Date(),
      expiresAt: new Date(Date.now() + 1800000),
      status: ATTEMPT_STATUS.SUBMITTED,
      submissionToken: 'sub_tok_test_123',
    });
  });

  test('correctly scores perfect answers with 100% pass status', async () => {
    // Record perfect answers
    await StudentAnswer.create({
      attemptId: attempt._id,
      examId: exam._id,
      questionId: qMcq._id,
      answerValue: 'opt_1',
      isAnswered: true,
    });
    await StudentAnswer.create({
      attemptId: attempt._id,
      examId: exam._id,
      questionId: qMulti._id,
      answerValue: ['opt_aws', 'opt_gcp'],
      isAnswered: true,
    });
    await StudentAnswer.create({
      attemptId: attempt._id,
      examId: exam._id,
      questionId: qFill._id,
      answerValue: 'protocol', // Lowercase test
      isAnswered: true,
    });

    const result = await EvaluationService.evaluateAttempt(attempt._id);

    expect(result).toBeDefined();
    expect(result.totalScore).toBe(8);
    expect(result.maxScore).toBe(8);
    expect(result.percentage).toBe(100);
    expect(result.isPassed).toBe(true);
    expect(result.isReleased).toBe(true); // Immediate mode
  });

  test('awards partial credit for multiple select when subset correct with no wrong choices', async () => {
    // Student only selects 1 of 2 correct choices for multi-select
    await StudentAnswer.create({
      attemptId: attempt._id,
      examId: exam._id,
      questionId: qMulti._id,
      answerValue: ['opt_aws'],
      isAnswered: true,
    });

    const result = await EvaluationService.evaluateAttempt(attempt._id);

    expect(result.totalScore).toBe(2); // 1 out of 2 of 4 marks = 2 marks
    expect(result.questionBreakdown[1].isPartial).toBe(true);
    expect(result.isPassed).toBe(false); // 2 < 4 passing marks
  });

  test('applies negative marking penalty for incorrect MCQ answer', async () => {
    await StudentAnswer.create({
      attemptId: attempt._id,
      examId: exam._id,
      questionId: qMcq._id,
      answerValue: 'opt_2', // Wrong
      isAnswered: true,
    });

    const result = await EvaluationService.evaluateAttempt(attempt._id);

    // Negative penalty applied (-0.5), floored at 0 for overall exam
    expect(result.questionBreakdown[0].marksObtained).toBe(-0.5);
    expect(result.totalScore).toBe(0);
  });
});
