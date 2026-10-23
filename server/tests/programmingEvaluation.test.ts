import mongoose from 'mongoose';
import './setup';
import {
  Exam,
  Question,
  ExamAttempt,
  StudentAnswer,
  ExamResult,
  ProgrammingQuestion,
  ProgrammingTestCase,
  CodeSubmission,
} from '../src/models';
import {
  QUESTION_TYPES,
  EXAM_STATUS,
  ATTEMPT_STATUS,
  PROGRAMMING_LANGUAGES,
  CODE_VERDICTS,
  SCORING_POLICIES,
} from '../src/constants';
import { CompilerService } from '../src/services/compiler/compiler.service';
import { ProgrammingEvaluationService } from '../src/services/programmingEvaluation.service';
import { EvaluationService } from '../src/services/evaluation.service';
import { IExecutionProvider, ExecutionRequest, ExecutionResult } from '../src/services/compiler/types';

class MockExecutionProvider implements IExecutionProvider {
  name = 'Mock Execution Provider for Tests';

  async checkHealth() {
    return {
      available: true,
      supportedLanguages: [
        PROGRAMMING_LANGUAGES.PYTHON,
        PROGRAMMING_LANGUAGES.JAVA,
        PROGRAMMING_LANGUAGES.CPP,
        PROGRAMMING_LANGUAGES.C,
      ],
    };
  }

  async execute(req: ExecutionRequest): Promise<ExecutionResult> {
    // If source code contains trigger strings, simulate compiler states
    if (req.sourceCode.includes('TRIGGER_COMPILE_ERROR')) {
      return {
        stdout: '',
        stderr: 'syntax error: unexpected token near line 3',
        compileOutput: 'solution.py:3:1: SyntaxError: invalid syntax',
        exitCode: 1,
        timeMs: 25,
        memoryKb: 12000,
        verdict: CODE_VERDICTS.COMPILATION_ERROR,
        statusDescription: 'Compilation Error',
      };
    }

    if (req.sourceCode.includes('TRIGGER_RUNTIME_ERROR')) {
      return {
        stdout: '',
        stderr: 'ZeroDivisionError: division by zero',
        exitCode: 1,
        timeMs: 40,
        memoryKb: 14000,
        verdict: CODE_VERDICTS.RUNTIME_ERROR,
        statusDescription: 'Runtime Error',
      };
    }

    if (req.sourceCode.includes('TRIGGER_TIME_LIMIT')) {
      return {
        stdout: '',
        stderr: 'Process terminated due to timeout',
        exitCode: 124,
        timeMs: 2500,
        memoryKb: 16000,
        verdict: CODE_VERDICTS.TIME_LIMIT_EXCEEDED,
        statusDescription: 'Time Limit Exceeded',
      };
    }

    // Normal execution simulation:
    // For test case "10 20" -> "30", "0 0" -> "0", etc.
    let output = '';
    const trimmedInput = (req.stdin || '').trim();

    if (trimmedInput === '10 20') {
      output = req.sourceCode.includes('WRONG_SUM') ? '25' : '30';
    } else if (trimmedInput === '-5 10') {
      output = req.sourceCode.includes('FAIL_NEGATIVES') ? '0' : '5';
    } else if (trimmedInput === '0 0') {
      output = '0';
    } else {
      output = '0';
    }

    const matches = req.expectedOutput !== undefined && output.trim() === req.expectedOutput.trim();

    return {
      stdout: output,
      stderr: '',
      exitCode: 0,
      timeMs: 35,
      memoryKb: 14500,
      verdict: matches ? CODE_VERDICTS.ACCEPTED : CODE_VERDICTS.WRONG_ANSWER,
      statusDescription: matches ? 'Accepted' : 'Wrong Answer',
    };
  }
}

describe('Programming Examination & Auto-Evaluation Engine', () => {
  let creatorId: mongoose.Types.ObjectId;
  let qProgramming: any;
  let progDetails: any;
  let tcSample: any;
  let tcHidden1: any;
  let tcHidden2: any;
  let exam: any;
  let attempt: any;

  beforeEach(async () => {
    // Install Mock Compiler Provider
    CompilerService.setProvider(new MockExecutionProvider());

    creatorId = new mongoose.Types.ObjectId();

    // 1. Create Base Question
    qProgramming = await Question.create({
      subject: 'Computer Science',
      topic: 'Algorithms',
      difficulty: 'medium',
      type: QUESTION_TYPES.PROGRAMMING,
      title: 'Sum of Two Integers',
      text: 'Write a program that takes two integers from standard input and prints their sum.',
      defaultMarks: 20,
      creatorId,
    });

    // 2. Create ProgrammingQuestion details
    progDetails = await ProgrammingQuestion.create({
      questionId: qProgramming._id,
      creatorId,
      title: 'Sum of Two Integers',
      problemStatement: 'Write a program that takes two integers from standard input and prints their sum.',
      inputFormat: 'Two space-separated integers A and B',
      outputFormat: 'Print the sum A + B',
      constraints: '-10^9 <= A, B <= 10^9',
      defaultMarks: 20,
      timeLimitSeconds: 2,
      memoryLimitMb: 256,
      scoringPolicy: SCORING_POLICIES.WEIGHTED,
      status: 'published',
    });

    qProgramming.programmingQuestionId = progDetails._id;
    await qProgramming.save();

    // 3. Create Test Cases: 1 sample + 2 hidden (weights: 5, 10, 5 = 20 total)
    tcSample = await ProgrammingTestCase.create({
      questionId: qProgramming._id,
      programmingQuestionId: progDetails._id,
      input: '10 20',
      expectedOutput: '30',
      isHidden: false,
      isSample: true,
      weight: 5,
      isEnabled: true,
      order: 1,
    });

    tcHidden1 = await ProgrammingTestCase.create({
      questionId: qProgramming._id,
      programmingQuestionId: progDetails._id,
      input: '-5 10',
      expectedOutput: '5',
      isHidden: true,
      isSample: false,
      weight: 10,
      isEnabled: true,
      order: 2,
    });

    tcHidden2 = await ProgrammingTestCase.create({
      questionId: qProgramming._id,
      programmingQuestionId: progDetails._id,
      input: '0 0',
      expectedOutput: '0',
      isHidden: true,
      isSample: false,
      weight: 5,
      isEnabled: true,
      order: 3,
    });

    // 4. Create Exam
    exam = await Exam.create({
      title: 'Advanced Programming Midterm',
      examCode: 'PROG101',
      creatorId,
      subject: 'Computer Science',
      totalMarks: 20,
      passingMarks: 10,
      durationMinutes: 45,
      startsAt: new Date(),
      endsAt: new Date(Date.now() + 3600000),
      releaseResultsMode: 'immediate',
      questions: [
        { questionId: qProgramming._id, marks: 20, negativeMarks: 0, order: 1 },
      ],
      status: EXAM_STATUS.PUBLISHED,
    });

    // 5. Create Exam Attempt
    attempt = await ExamAttempt.create({
      examId: exam._id,
      studentInfo: {
        name: 'Alice Coder',
        email: 'alice@evaltech.io',
      },
      attemptNumber: 1,
      startedAt: new Date(),
      expiresAt: new Date(Date.now() + 1800000),
      status: ATTEMPT_STATUS.IN_PROGRESS,
      submissionToken: 'sub_tok_alice_456',
    });
  });

  afterAll(() => {
    CompilerService.setProvider(null);
  });

  test('evaluates 100% correct solution and awards full marks', async () => {
    const submission = await CodeSubmission.create({
      examId: exam._id,
      questionId: qProgramming._id,
      attemptId: attempt._id,
      studentInfo: attempt.studentInfo,
      language: PROGRAMMING_LANGUAGES.PYTHON,
      sourceCode: `import sys\na, b = map(int, sys.stdin.read().split())\nprint(a + b)`,
      submissionNumber: 1,
      type: 'submit',
      status: 'queued',
    });

    const evaluated = await ProgrammingEvaluationService.evaluateSubmission(submission._id);

    expect(evaluated.status).toBe('completed');
    expect(evaluated.verdict).toBe(CODE_VERDICTS.ACCEPTED);
    expect(evaluated.marksObtained).toBe(20);
    expect(evaluated.passedTestCasesCount).toBe(3);
    expect(evaluated.totalTestCasesCount).toBe(3);

    // Verify student answer document updated
    const ansDoc = await StudentAnswer.findOne({ attemptId: attempt._id, questionId: qProgramming._id });
    expect(ansDoc).toBeDefined();
    expect(ansDoc?.isEvaluated).toBe(true);
    expect(ansDoc?.marksAwarded).toBe(20);
  });

  test('awards partial marks under weighted scoring policy when subset of test cases pass', async () => {
    // Fails the negative numbers test (-5 10, weight: 10). Passes sample (5) and zero (5) = 10/20 marks
    const submission = await CodeSubmission.create({
      examId: exam._id,
      questionId: qProgramming._id,
      attemptId: attempt._id,
      studentInfo: attempt.studentInfo,
      language: PROGRAMMING_LANGUAGES.PYTHON,
      sourceCode: `FAIL_NEGATIVES\nprint('code')`,
      submissionNumber: 1,
      type: 'submit',
      status: 'queued',
    });

    const evaluated = await ProgrammingEvaluationService.evaluateSubmission(submission._id);

    expect(evaluated.status).toBe('completed');
    expect(evaluated.verdict).toBe(CODE_VERDICTS.PARTIALLY_CORRECT);
    expect(evaluated.marksObtained).toBe(10); // 10 out of 20
    expect(evaluated.passedTestCasesCount).toBe(2);
    expect(evaluated.totalTestCasesCount).toBe(3);
  });

  test('awards 0 marks under all-or-nothing policy if any test case fails', async () => {
    progDetails.scoringPolicy = SCORING_POLICIES.ALL_OR_NOTHING;
    await progDetails.save();

    const submission = await CodeSubmission.create({
      examId: exam._id,
      questionId: qProgramming._id,
      attemptId: attempt._id,
      studentInfo: attempt.studentInfo,
      language: PROGRAMMING_LANGUAGES.PYTHON,
      sourceCode: `FAIL_NEGATIVES\nprint('code')`,
      submissionNumber: 1,
      type: 'submit',
      status: 'queued',
    });

    const evaluated = await ProgrammingEvaluationService.evaluateSubmission(submission._id);

    expect(evaluated.status).toBe('completed');
    expect(evaluated.verdict).toBe(CODE_VERDICTS.WRONG_ANSWER);
    expect(evaluated.marksObtained).toBe(0);
  });

  test('handles compilation error cleanly without crashing', async () => {
    const submission = await CodeSubmission.create({
      examId: exam._id,
      questionId: qProgramming._id,
      attemptId: attempt._id,
      studentInfo: attempt.studentInfo,
      language: PROGRAMMING_LANGUAGES.PYTHON,
      sourceCode: `TRIGGER_COMPILE_ERROR\nprint('syntax error')`,
      submissionNumber: 1,
      type: 'submit',
      status: 'queued',
    });

    const evaluated = await ProgrammingEvaluationService.evaluateSubmission(submission._id);

    expect(evaluated.status).toBe('completed');
    expect(evaluated.verdict).toBe(CODE_VERDICTS.COMPILATION_ERROR);
    expect(evaluated.marksObtained).toBe(0);
    expect(evaluated.passedTestCasesCount).toBe(0);
    expect(evaluated.executionMetadata.compileOutput).toBeDefined();
  });

  test('strictly protects hidden test cases from leaking in student sanitization', async () => {
    const submission = await CodeSubmission.create({
      examId: exam._id,
      questionId: qProgramming._id,
      attemptId: attempt._id,
      studentInfo: attempt.studentInfo,
      language: PROGRAMMING_LANGUAGES.PYTHON,
      sourceCode: `print('test')`,
      submissionNumber: 1,
      type: 'submit',
      status: 'queued',
    });

    const evaluated = await ProgrammingEvaluationService.evaluateSubmission(submission._id);
    const sanitized = ProgrammingEvaluationService.sanitizeForStudent(evaluated);

    // Inspect sanitized test results
    const hiddenResults = sanitized.testResults.filter((t: any) => t.isHidden);
    expect(hiddenResults.length).toBe(2);

    for (const hr of hiddenResults) {
      expect(hr.input).toBeUndefined();
      expect(hr.expectedOutput).toBeUndefined();
      expect(hr.studentOutput).toBeUndefined();
      // Verdict and status are permitted
      expect(hr.verdict).toBeDefined();
    }
  });

  test('recalculates exam total result including programming marks and dispatches email', async () => {
    // Submit solution for attempt
    const submission = await CodeSubmission.create({
      examId: exam._id,
      questionId: qProgramming._id,
      attemptId: attempt._id,
      studentInfo: attempt.studentInfo,
      language: PROGRAMMING_LANGUAGES.PYTHON,
      sourceCode: `import sys\na, b = map(int, sys.stdin.read().split())\nprint(a + b)`,
      submissionNumber: 1,
      type: 'submit',
      status: 'queued',
    });

    await ProgrammingEvaluationService.evaluateSubmission(submission._id);

    // Evaluate whole attempt
    const result = await EvaluationService.evaluateAttempt(attempt._id);

    expect(result).toBeDefined();
    expect(result.totalScore).toBe(20);
    expect(result.maxScore).toBe(20);
    expect(result.programmingScore).toBe(20);
    expect(result.programmingMaxScore).toBe(20);
    expect(result.percentage).toBe(100);
    expect(result.isPassed).toBe(true);
    expect(result.evaluationStatus).toBe('completed');
    expect(result.emailSent).toBe(true);
  });
});
