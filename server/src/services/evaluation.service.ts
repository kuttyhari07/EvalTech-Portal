import mongoose from 'mongoose';
import {
  Exam,
  ExamAttempt,
  StudentAnswer,
  ExamResult,
  Question,
  IQuestionResult,
  CodeSubmission,
} from '../models';
import { QUESTION_TYPES, CODE_VERDICTS } from '../constants';
import { EmailService } from './email.service';

export class EvaluationService {
  /**
   * Evaluates an exam attempt, grades all objective questions and programming submissions,
   * calculates score and percentage, and generates/updates ExamResult.
   */
  static async evaluateAttempt(attemptId: string | mongoose.Types.ObjectId): Promise<any> {
    const attempt = await ExamAttempt.findById(attemptId);
    if (!attempt) {
      throw new Error(`Attempt not found: ${attemptId}`);
    }

    const exam = await Exam.findById(attempt.examId);
    if (!exam) {
      throw new Error(`Exam not found: ${attempt.examId}`);
    }

    // Fetch all student answers for this attempt
    const studentAnswers = await StudentAnswer.find({ attemptId: attempt._id });
    const answerMap = new Map<string, any>();
    for (const ans of studentAnswers) {
      answerMap.set(ans.questionId.toString(), ans);
    }

    // Fetch all questions for this exam
    const questionIds = exam.questions.map((q) => q.questionId);
    const questions = await Question.find({ _id: { $in: questionIds } });
    const questionMap = new Map<string, any>();
    for (const q of questions) {
      questionMap.set(q._id.toString(), q);
    }

    let totalScore = 0;
    let totalMaxMarks = 0;
    let totalProgrammingScore = 0;
    let totalProgrammingMaxMarks = 0;
    let hasPendingEvaluation = false;
    const questionBreakdown: IQuestionResult[] = [];

    for (const examQ of exam.questions) {
      const qIdStr = examQ.questionId.toString();
      const question = questionMap.get(qIdStr);
      if (!question) continue;

      const studentAnsDoc = answerMap.get(qIdStr);
      const studentVal = studentAnsDoc ? studentAnsDoc.answerValue : null;

      const maxMarks = examQ.marks || question.defaultMarks || 1;
      const penalty = exam.negativeMarking.enabled
        ? exam.negativeMarking.penaltyPerQuestion || examQ.negativeMarks || 0
        : 0;

      totalMaxMarks += maxMarks;

      let marksObtained = 0;
      let isCorrect = false;
      let isPartial = false;
      let verdict: string | undefined = undefined;
      let passedTestCases: number | undefined = undefined;
      let totalTestCases: number | undefined = undefined;
      let language: string | undefined = undefined;
      let codeSubmissionId: mongoose.Types.ObjectId | undefined = undefined;

      // Evaluation by Question Type
      switch (question.type) {
        case QUESTION_TYPES.MCQ: {
          if (studentVal !== null && studentVal !== undefined && studentVal !== '') {
            const correctAnswer = question.correctAnswers[0];
            if (String(studentVal).trim() === String(correctAnswer).trim()) {
              marksObtained = maxMarks;
              isCorrect = true;
            } else if (penalty > 0) {
              marksObtained = -penalty;
            }
          }
          break;
        }

        case QUESTION_TYPES.TRUE_FALSE: {
          if (studentVal !== null && studentVal !== undefined && studentVal !== '') {
            const correctVal = String(question.correctAnswers[0]).toLowerCase().trim();
            const givenVal = String(studentVal).toLowerCase().trim();
            if (givenVal === correctVal) {
              marksObtained = maxMarks;
              isCorrect = true;
            } else if (penalty > 0) {
              marksObtained = -penalty;
            }
          }
          break;
        }

        case QUESTION_TYPES.FILL_BLANK: {
          if (studentVal !== null && studentVal !== undefined && String(studentVal).trim() !== '') {
            const normalizedGiven = String(studentVal).toLowerCase().trim();
            const matched = question.correctAnswers.some(
              (ans: string) => ans.toLowerCase().trim() === normalizedGiven
            );
            if (matched) {
              marksObtained = maxMarks;
              isCorrect = true;
            } else if (penalty > 0) {
              marksObtained = -penalty;
            }
          }
          break;
        }

        case QUESTION_TYPES.MULTIPLE_SELECT: {
          if (Array.isArray(studentVal) && studentVal.length > 0) {
            const correctSet = new Set(question.correctAnswers.map((a: string) => String(a).trim()));
            const givenSet = new Set(studentVal.map((a: string) => String(a).trim()));

            let correctCount = 0;
            let wrongCount = 0;

            for (const ans of givenSet) {
              if (correctSet.has(ans)) {
                correctCount++;
              } else {
                wrongCount++;
              }
            }

            if (wrongCount === 0 && correctCount === correctSet.size) {
              marksObtained = maxMarks;
              isCorrect = true;
            } else if (wrongCount === 0 && correctCount > 0) {
              // Partial credit
              marksObtained = Number(((correctCount / correctSet.size) * maxMarks).toFixed(2));
              isPartial = true;
            } else if (penalty > 0) {
              marksObtained = -penalty;
            }
          }
          break;
        }

        case QUESTION_TYPES.PROGRAMMING: {
          totalProgrammingMaxMarks += maxMarks;

          // Find the latest scored submission for this attempt and question
          const submission = await CodeSubmission.findOne({
            attemptId: attempt._id,
            questionId: question._id,
            type: 'submit',
          }).sort({ createdAt: -1 });

          if (submission) {
            codeSubmissionId = submission._id as mongoose.Types.ObjectId;
            language = submission.language;
            verdict = submission.verdict;
            passedTestCases = submission.passedTestCasesCount;
            totalTestCases = submission.totalTestCasesCount;

            if (submission.status === 'completed') {
              marksObtained = submission.marksObtained;
              isCorrect = marksObtained === maxMarks;
              isPartial = marksObtained > 0 && marksObtained < maxMarks;
              totalProgrammingScore += marksObtained;
            } else {
              hasPendingEvaluation = true;
              marksObtained = 0;
            }
          } else {
            // Check if student answer document has direct marks or no submission
            if (studentAnsDoc && studentAnsDoc.isEvaluated) {
              marksObtained = studentAnsDoc.marksAwarded || 0;
              isCorrect = marksObtained === maxMarks;
              isPartial = marksObtained > 0 && marksObtained < maxMarks;
              totalProgrammingScore += marksObtained;
            } else {
              marksObtained = 0;
              verdict = 'No Submission';
            }
          }
          break;
        }

        case QUESTION_TYPES.SHORT_ANSWER:
        case QUESTION_TYPES.LONG_ANSWER:
        case QUESTION_TYPES.CODE: {
          // If already manually graded by teacher
          if (studentAnsDoc && studentAnsDoc.isEvaluated) {
            marksObtained = studentAnsDoc.marksAwarded || 0;
            isCorrect = marksObtained === maxMarks;
            isPartial = marksObtained > 0 && marksObtained < maxMarks;
          } else {
            hasPendingEvaluation = true;
            marksObtained = 0; // Pending teacher grading
          }
          break;
        }

        default:
          marksObtained = 0;
      }

      totalScore += marksObtained;

      questionBreakdown.push({
        questionId: question._id,
        questionText: question.text,
        questionType: question.type,
        studentAnswer: studentVal,
        correctAnswer: question.type === QUESTION_TYPES.PROGRAMMING ? undefined : question.correctAnswers,
        marksObtained,
        maxMarks,
        isCorrect,
        isPartial,
        explanation: question.explanation,
        feedback: studentAnsDoc?.teacherFeedback,
        verdict,
        passedTestCases,
        totalTestCases,
        language,
        codeSubmissionId,
      });

      // Update StudentAnswer doc if present
      if (studentAnsDoc) {
        studentAnsDoc.isEvaluated = true;
        studentAnsDoc.marksAwarded = marksObtained;
        await studentAnsDoc.save();
      }
    }

    // Floor score at 0 if negative marking resulted in negative
    const finalScore = Math.max(0, Number(totalScore.toFixed(2)));
    const percentage = totalMaxMarks > 0 ? Number(((finalScore / totalMaxMarks) * 100).toFixed(2)) : 0;
    const isPassed = finalScore >= exam.passingMarks;
    const isReleased = exam.releaseResultsMode === 'immediate';
    const evaluationStatus = hasPendingEvaluation ? 'pending_evaluation' : 'completed';

    // Upsert ExamResult
    const result = await ExamResult.findOneAndUpdate(
      { attemptId: attempt._id },
      {
        attemptId: attempt._id,
        examId: exam._id,
        studentId: attempt.studentId,
        studentInfo: attempt.studentInfo,
        totalScore: finalScore,
        maxScore: totalMaxMarks,
        percentage,
        isPassed,
        programmingScore: Number(totalProgrammingScore.toFixed(2)),
        programmingMaxScore: totalProgrammingMaxMarks,
        evaluationStatus,
        questionBreakdown,
        isReleased,
        releasedAt: isReleased ? new Date() : undefined,
        evaluatedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    attempt.status = 'evaluated';
    await attempt.save();

    // If released immediately and evaluation is complete, dispatch email if not already sent
    if (isReleased && !result.emailSent && evaluationStatus === 'completed' && attempt.studentInfo?.email) {
      EmailService.sendExamResultEmail(
        attempt.studentInfo.email,
        attempt.studentInfo.name,
        exam.title,
        finalScore,
        totalMaxMarks,
        percentage,
        isPassed,
        exam.examCode,
        {
          programmingScore: totalProgrammingScore,
          programmingMaxScore: totalProgrammingMaxMarks,
          evaluationStatus,
        }
      ).catch((err) => console.error('Error dispatching result email:', err.message));

      result.emailSent = true;
      result.emailSentAt = new Date();
      await result.save();
    }

    return result;
  }
}

