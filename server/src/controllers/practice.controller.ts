import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { Question, QuestionBank, User, ProgrammingQuestion } from '../models';
import { sendSuccess, sendError } from '../utils/response';

export class PracticeController {
  /**
   * Get student's gamification stats (XP, Daily Streak, Solved Problems)
   */
  static async getPracticeStats(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const user = await User.findById(userId);
    if (!user) {
      sendError(res, 'User not found', 404);
      return;
    }

    const xpPoints = user.xpPoints || 0;
    const streakCount = user.streakCount || 1;
    const solvedPracticeCount = user.solvedPracticeCount || 0;
    const level = Math.floor(xpPoints / 100) + 1;
    const nextLevelXp = level * 100;
    const levelProgressPercent = Math.min(100, Math.round(((xpPoints % 100) / 100) * 100));

    sendSuccess(res, {
      xpPoints,
      streakCount,
      solvedPracticeCount,
      level,
      nextLevelXp,
      levelProgressPercent,
      lastPracticeDate: user.lastPracticeDate,
    });
  }

  /**
   * Get available practice topics and Question Banks
   */
  static async getPracticeTopics(req: AuthRequest, res: Response): Promise<void> {
    const subjects = await Question.distinct('subject');
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
      subjects: subjects.filter(Boolean),
      banks: formattedBanks,
    });
  }

  /**
   * Generate a 5-question practice session
   */
  static async generateQuiz(req: AuthRequest, res: Response): Promise<void> {
    const { subject, bankId, difficulty, count = 5 } = req.body;
    const questionLimit = Math.min(Math.max(1, Number(count) || 5), 10);

    let query: any = { isApproved: true };

    if (bankId) {
      const bank = await QuestionBank.findById(bankId);
      if (bank && bank.questionIds && bank.questionIds.length > 0) {
        query = { _id: { $in: bank.questionIds } };
      }
    } else {
      if (subject) query.subject = subject;
      if (difficulty && difficulty !== 'all') query.difficulty = difficulty;
    }

    const questions = await Question.find(query).limit(50);
    if (questions.length === 0) {
      sendError(res, 'No practice questions found for the selected criteria.', 404);
      return;
    }

    // Shuffle and pick
    const shuffled = [...questions].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, questionLimit);

    // Format safe questions for practice (hide answers)
    const safeQuestions: any[] = [];
    for (const q of selected) {
      if (q.type === 'programming') {
        const prog = await ProgrammingQuestion.findOne({ questionId: q._id });
        safeQuestions.push({
          id: q._id,
          type: 'programming',
          title: q.title || 'Coding Challenge',
          subject: q.subject,
          topic: q.topic,
          difficulty: q.difficulty,
          problemStatement: q.text,
          inputFormat: prog?.inputFormat || '',
          outputFormat: prog?.outputFormat || '',
          constraints: prog?.constraints || '',
          sampleInput: prog?.sampleInput || '',
          sampleExpectedOutput: prog?.sampleExpectedOutput || '',
          sampleExplanation: prog?.sampleExplanation || '',
          starterCode: prog?.starterCode || {},
          defaultMarks: q.defaultMarks || 10,
        });
      } else {
        safeQuestions.push({
          id: q._id,
          type: q.type,
          text: q.text,
          subject: q.subject,
          topic: q.topic,
          difficulty: q.difficulty,
          options: q.options || [],
          defaultMarks: q.defaultMarks || 1,
        });
      }
    }

    sendSuccess(res, {
      quizId: `PRACTICE-${Date.now()}`,
      questions: safeQuestions,
      totalQuestions: safeQuestions.length,
    });
  }

  /**
   * Submit practice quiz, award XP points and update Daily Streak
   */
  static async submitQuiz(req: AuthRequest, res: Response): Promise<void> {
    const { answers = [] } = req.body;
    const userId = req.user!.userId;

    if (!Array.isArray(answers) || answers.length === 0) {
      sendError(res, 'No answers submitted.', 400);
      return;
    }

    let correctCount = 0;
    const results: any[] = [];

    for (const item of answers) {
      const q = await Question.findById(item.questionId);
      if (!q) continue;

      let isCorrect = false;
      if (q.type === 'programming') {
        // Simple functional pass check if student submitted code
        isCorrect = Boolean(item.answer && item.answer.trim().length > 20);
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

      results.push({
        questionId: q._id,
        isCorrect,
        correctAnswers: q.correctAnswers,
        explanation: q.explanation || 'Reviewed based on foundational principles.',
      });
    }

    const earnedXp = correctCount * 20 + 10; // +10 participation XP + 20 per correct answer

    // Update User Gamification
    const user = await User.findById(userId);
    let updatedStreak = 1;
    let newXpTotal = earnedXp;

    if (user) {
      const now = new Date();
      const lastDate = user.lastPracticeDate ? new Date(user.lastPracticeDate) : null;

      if (lastDate) {
        const diffDays = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 3600 * 24));
        if (diffDays === 1) {
          user.streakCount = (user.streakCount || 1) + 1;
        } else if (diffDays > 1) {
          user.streakCount = 1;
        }
      } else {
        user.streakCount = 1;
      }

      user.lastPracticeDate = now;
      user.xpPoints = (user.xpPoints || 0) + earnedXp;
      user.solvedPracticeCount = (user.solvedPracticeCount || 0) + correctCount;
      await user.save();

      updatedStreak = user.streakCount;
      newXpTotal = user.xpPoints;
    }

    sendSuccess(res, {
      correctCount,
      totalCount: answers.length,
      accuracyPercent: Math.round((correctCount / answers.length) * 100),
      earnedXp,
      newXpTotal,
      streakCount: updatedStreak,
      breakdown: results,
    });
  }
}
