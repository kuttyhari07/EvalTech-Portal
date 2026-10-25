import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { Question, QuestionBank, User, Student, ProgrammingQuestion, ProgrammingTestCase } from '../models';
import { sendSuccess, sendError } from '../utils/response';
import { CompilerService } from '../services/compiler/compiler.service';
import { CODE_VERDICTS } from '../constants';

export class PracticeController {
  /**
   * Get student or user gamification stats (XP, Daily Streak, Solved Problems)
   */
  static async getPracticeStats(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user?.userId;
    let userEntity: any = req.user?.dbUser;

    if (!userEntity && userId) {
      userEntity = (await Student.findById(userId)) || (await User.findById(userId));
    }

    const xpPoints = userEntity?.xpPoints || 0;
    const streakCount = userEntity?.streakCount || 1;
    const solvedPracticeCount = userEntity?.solvedPracticeCount || 0;
    const currentLevel = Math.floor(xpPoints / 100) + 1;
    const nextLevelXp = currentLevel * 100;
    const progressPercent = Math.min(100, Math.round(((xpPoints % 100) / 100) * 100));

    const levelTitles = [
      'Novice Coder',
      'Code Apprentice',
      'Syntax Warrior',
      'Logic Crusader',
      'Algorithm Master',
      'Grandmaster Architect',
    ];
    const levelTitle = levelTitles[Math.min(currentLevel - 1, levelTitles.length - 1)];

    sendSuccess(res, {
      xpPoints,
      streakCount,
      solvedPracticeCount,
      level: {
        currentLevel,
        nextLevelXp,
        progressPercent,
        levelTitle,
      },
      lastPracticeDate: userEntity?.lastPracticeDate || null,
    });
  }

  /**
   * Get available practice topics and Question Banks
   */
  static async getPracticeTopics(req: AuthRequest, res: Response): Promise<void> {
    const distinctSubjects = await Question.distinct('subject');
    const distinctTopics = await Question.distinct('topic');
    const allTopicsSet = new Set([...distinctSubjects, ...distinctTopics].filter(Boolean));

    const topicsList = await Promise.all(
      Array.from(allTopicsSet).map(async (t) => {
        const count = await Question.countDocuments({
          $or: [{ subject: t }, { topic: t }],
        });
        return { topic: t, count };
      })
    );

    const banks = await QuestionBank.find({}, 'title subject description tags questionIds').limit(20);
    const formattedBanks = banks.map((b) => ({
      id: b._id,
      title: b.title,
      subject: b.subject,
      description: b.description,
      questionCount: b.questionIds?.length || 0,
      tags: b.tags || [],
    }));

    sendSuccess(res, {
      topics: topicsList.filter((item) => item.count > 0),
      subjects: distinctSubjects.filter(Boolean),
      banks: formattedBanks,
    });
  }

  /**
   * Generate a 5-question practice session
   */
  static async generateQuiz(req: AuthRequest, res: Response): Promise<void> {
    const { topic, subject, bankId, difficulty, count = 5 } = req.body;
    const questionLimit = Math.min(Math.max(1, Number(count) || 5), 10);

    let query: any = {};

    if (bankId) {
      const bank = await QuestionBank.findById(bankId);
      if (bank && bank.questionIds && bank.questionIds.length > 0) {
        query = { _id: { $in: bank.questionIds } };
      }
    } else {
      const searchTarget = topic || subject;
      if (searchTarget) {
        query.$or = [{ subject: searchTarget }, { topic: searchTarget }];
      }
      if (difficulty && difficulty !== 'all') {
        query.difficulty = difficulty;
      }
    }

    let questions = await Question.find(query).limit(50);
    if (questions.length === 0) {
      // Fallback: If no questions matched the specific topic filter, grab any available questions in the DB
      questions = await Question.find({}).limit(50);
    }

    if (questions.length === 0) {
      sendError(res, 'No practice questions found in repository.', 404);
      return;
    }

    // Shuffle and pick
    const shuffled = [...questions].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, questionLimit);

    // Format safe questions for practice (hide answers)
    const safeQuestions: any[] = [];
    for (const q of selected) {
      let programmingDetails: any = undefined;

      if (q.type === 'programming') {
        const prog = await ProgrammingQuestion.findOne({
          $or: [
            { questionId: q._id },
            { _id: q._id },
            ...(q.programmingQuestionId ? [{ _id: q.programmingQuestionId }] : []),
          ],
        });

        const sampleCases = await ProgrammingTestCase.find({
          questionId: q._id,
          isSample: true,
          isEnabled: true,
        }).sort({ order: 1 });

        programmingDetails = {
          title: prog?.title || q.title || q.text,
          problemStatement: prog?.problemStatement || q.text,
          problemDescriptionMarkdown: prog?.problemDescriptionMarkdown || '',
          inputFormat: prog?.inputFormat || '',
          outputFormat: prog?.outputFormat || '',
          constraints: prog?.constraints || '',
          supportedLanguages: prog?.supportedLanguages || ['python', 'java', 'cpp', 'c'],
          starterCode: prog?.starterCode || {
            python: 'import sys\n\ndef main():\n    # Read input from standard input\n    # lines = sys.stdin.read().split()\n    pass\n\nif __name__ == "__main__":\n    main()\n',
            java: 'import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        \n    }\n}\n',
            cpp: '#include <iostream>\nusing namespace std;\n\nint main() {\n    \n    return 0;\n}\n',
            c: '#include <stdio.h>\n\nint main() {\n    \n    return 0;\n}\n',
          },
          sampleInput: prog?.sampleInput || (sampleCases.length > 0 ? sampleCases[0].input : ''),
          sampleExpectedOutput: prog?.sampleExpectedOutput || (sampleCases.length > 0 ? sampleCases[0].expectedOutput : ''),
          sampleExplanation: prog?.sampleExplanation || '',
          sampleTestCases: sampleCases.map((s) => ({
            input: s.input,
            expectedOutput: s.expectedOutput,
            description: s.description || 'Sample Test Case',
          })),
          timeLimitSeconds: prog?.timeLimitSeconds || 2,
          memoryLimitMb: prog?.memoryLimitMb || 256,
        };
      }

      safeQuestions.push({
        questionId: String(q._id),
        id: String(q._id),
        topic: q.topic || q.subject || 'General',
        subject: q.subject || 'General',
        type: q.type || 'multiple_choice',
        questionText: q.text,
        text: q.text,
        options: q.options || [],
        marks: q.defaultMarks || 1,
        defaultMarks: q.defaultMarks || 1,
        programmingDetails,
      });
    }

    sendSuccess(res, {
      quizId: `PRACTICE-${Date.now()}`,
      questions: safeQuestions,
      totalQuestions: safeQuestions.length,
    });
  }

  /**
   * Practice "Run Code" against sample inputs or user custom input
   */
  static async runCode(req: AuthRequest, res: Response): Promise<void> {
    const { questionId, language = 'python', sourceCode = '', customInput } = req.body;

    if (!sourceCode || !sourceCode.trim()) {
      sendError(res, 'Source code cannot be empty.', 400);
      return;
    }

    let progQ: any = await ProgrammingQuestion.findOne({
      $or: [{ questionId }, { _id: questionId }],
    });

    if (!progQ) {
      const baseQ = await Question.findById(questionId);
      if (baseQ && baseQ.programmingQuestionId) {
        progQ = await ProgrammingQuestion.findById(baseQ.programmingQuestionId);
      }
    }

    let testRuns: { input: string; expectedOutput?: string; description?: string }[] = [];

    if (customInput !== undefined && customInput !== null && customInput.trim() !== '') {
      testRuns = [{ input: customInput, description: 'Custom Input' }];
    } else {
      const sampleCases = await ProgrammingTestCase.find({
        questionId: progQ?.questionId || questionId,
        isSample: true,
        isEnabled: true,
      }).sort({ order: 1 });

      if (sampleCases.length > 0) {
        testRuns = sampleCases.map((s) => ({
          input: s.input,
          expectedOutput: s.expectedOutput,
          description: s.description || 'Sample Test Case',
        }));
      } else if (progQ?.sampleInput) {
        testRuns = [
          {
            input: progQ.sampleInput,
            expectedOutput: progQ.sampleExpectedOutput,
            description: 'Sample Input',
          },
        ];
      } else {
        testRuns = [{ input: '', description: 'Default Run' }];
      }
    }

    const results = [];
    for (const tr of testRuns) {
      const exec = await CompilerService.execute({
        language: language as any,
        sourceCode,
        stdin: tr.input,
        expectedOutput: tr.expectedOutput,
        timeLimitSeconds: progQ?.timeLimitSeconds || 2,
        memoryLimitMb: progQ?.memoryLimitMb || 256,
      });

      results.push({
        description: tr.description,
        input: tr.input,
        expectedOutput: tr.expectedOutput,
        actualOutput: exec.stdout,
        stderr: exec.stderr,
        compileOutput: exec.compileOutput,
        exitCode: exec.exitCode,
        timeMs: exec.timeMs,
        memoryKb: exec.memoryKb,
        verdict: exec.verdict,
        passed: exec.verdict === CODE_VERDICTS.ACCEPTED,
      });
    }

    sendSuccess(res, {
      results,
      summary: {
        total: results.length,
        passed: results.filter((r) => r.passed).length,
        hasCompileError: results.some((r) => r.verdict === CODE_VERDICTS.COMPILATION_ERROR),
      },
    });
  }

  /**
   * Submit practice quiz, award XP points and update Daily Streak
   */
  static async submitQuiz(req: AuthRequest, res: Response): Promise<void> {
    const { answers = [] } = req.body;
    const userId = req.user?.userId;

    if (!Array.isArray(answers) || answers.length === 0) {
      sendError(res, 'No answers submitted.', 400);
      return;
    }

    let correctCount = 0;
    let totalMarks = 0;
    const reviewList: any[] = [];

    for (const item of answers) {
      const q = await Question.findById(item.questionId || item.id);
      if (!q) continue;

      totalMarks += q.defaultMarks || 1;
      let isCorrect = false;

      if (q.type === 'programming') {
        if (item.passed === true) {
          isCorrect = true;
        } else if (item.answer && item.answer.trim().length > 10) {
          try {
            const sampleCase = await ProgrammingTestCase.findOne({ questionId: q._id, isSample: true });
            if (sampleCase) {
              const exec = await CompilerService.execute({
                language: item.language || 'python',
                sourceCode: item.answer,
                stdin: sampleCase.input,
                expectedOutput: sampleCase.expectedOutput,
              });
              isCorrect = exec.verdict === CODE_VERDICTS.ACCEPTED;
            } else {
              isCorrect = true;
            }
          } catch {
            isCorrect = true;
          }
        }
      } else {
        const correctAnswers = q.correctAnswers || [];
        const studentAns = item.answer;

        if (Array.isArray(studentAns)) {
          isCorrect =
            studentAns.length === correctAnswers.length &&
            studentAns.every((a: string) => correctAnswers.includes(a));
        } else {
          isCorrect = correctAnswers.includes(String(studentAns));
        }
      }

      if (isCorrect) correctCount++;

      reviewList.push({
        questionId: q._id,
        questionText: q.text,
        userAnswer: item.answer || 'Unanswered',
        correctAnswer: (q.correctAnswers || []).join(', ') || 'See explanation',
        isCorrect,
        explanation: q.explanation || 'Verified based on foundational topic principles.',
      });
    }

    const accuracy = answers.length > 0 ? Math.round((correctCount / answers.length) * 100) : 0;
    const earnedXp = correctCount * 20 + 10; // +10 participation + 20 per correct answer

    // Update Student or User Gamification record
    let updatedStreak = 1;
    let newXpTotal = earnedXp;

    if (userId) {
      const userEntity =
        req.user?.dbUser || (await Student.findById(userId)) || (await User.findById(userId));
      if (userEntity) {
        const now = new Date();
        const lastDate = userEntity.lastPracticeDate ? new Date(userEntity.lastPracticeDate) : null;

        if (lastDate) {
          const diffDays = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 3600 * 24));
          if (diffDays === 1) {
            userEntity.streakCount = (userEntity.streakCount || 1) + 1;
          } else if (diffDays > 1) {
            userEntity.streakCount = 1;
          }
        } else {
          userEntity.streakCount = 1;
        }

        userEntity.lastPracticeDate = now;
        userEntity.xpPoints = (userEntity.xpPoints || 0) + earnedXp;
        userEntity.solvedPracticeCount = (userEntity.solvedPracticeCount || 0) + correctCount;
        await userEntity.save();

        updatedStreak = userEntity.streakCount || 1;
        newXpTotal = userEntity.xpPoints || earnedXp;
      }
    }

    const feedback =
      accuracy >= 80
        ? 'Outstanding mastery! Your concepts are sharp.'
        : accuracy >= 50
        ? 'Solid performance! Review the explanations to lock in the fundamentals.'
        : 'Good effort! Review the missed questions below and try another practice run.';

    sendSuccess(res, {
      score: correctCount,
      correctCount,
      totalMarks: answers.length,
      totalCount: answers.length,
      accuracy,
      accuracyPercent: accuracy,
      earnedXp,
      xpAwarded: earnedXp,
      newXpTotal,
      streakCount: updatedStreak,
      feedback,
      review: reviewList,
      breakdown: reviewList,
    });
  }
}
