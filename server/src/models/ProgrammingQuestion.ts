import mongoose, { Schema, Document } from 'mongoose';
import {
  DIFFICULTY_LEVELS,
  DifficultyLevel,
  PROGRAMMING_LANGUAGES,
  ProgrammingLanguage,
  SCORING_POLICIES,
  ScoringPolicy,
} from '../constants';

export interface IStarterCode {
  c?: string;
  cpp?: string;
  java?: string;
  python?: string;
}

export interface IProgrammingQuestion extends Document {
  questionId: mongoose.Types.ObjectId;
  creatorId: mongoose.Types.ObjectId;
  organizationId?: mongoose.Types.ObjectId;
  title: string;
  problemStatement: string;
  problemDescriptionMarkdown: string;
  inputFormat: string;
  outputFormat: string;
  constraints: string;
  difficulty: DifficultyLevel;
  topic?: string;
  tags: string[];
  supportedLanguages: ProgrammingLanguage[];
  starterCode: IStarterCode;
  executionMode: 'standard_io' | 'function_signature';
  sampleInput: string;
  sampleExpectedOutput: string;
  sampleExplanation?: string;
  defaultMarks: number;
  timeLimitSeconds: number;
  memoryLimitMb: number;
  allowedAttempts: number;
  scoringPolicy: ScoringPolicy;
  status: 'draft' | 'published' | 'archived';
  showTestCasesOnFail: 'none' | 'sample_only' | 'visible_only';
  createdAt: Date;
  updatedAt: Date;
}

const DEFAULT_STARTER_CODE: IStarterCode = {
  python: `import sys

def main():
    # Read standard input
    # input_data = sys.stdin.read().split()
    
    # Write your solution here
    pass

if __name__ == '__main__':
    main()
`,
  java: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        // Write your solution here
        
        sc.close();
    }
}
`,
  cpp: `#include <iostream>
using namespace std;

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);
    
    // Write your solution here
    
    return 0;
}
`,
  c: `#include <stdio.h>

int main() {
    // Write your solution here
    
    return 0;
}
`,
};

const starterCodeSchema = new Schema<IStarterCode>(
  {
    c: { type: String, default: DEFAULT_STARTER_CODE.c },
    cpp: { type: String, default: DEFAULT_STARTER_CODE.cpp },
    java: { type: String, default: DEFAULT_STARTER_CODE.java },
    python: { type: String, default: DEFAULT_STARTER_CODE.python },
  },
  { _id: false }
);

const programmingQuestionSchema = new Schema<IProgrammingQuestion>(
  {
    questionId: { type: Schema.Types.ObjectId, ref: 'Question', required: true, unique: true, index: true },
    creatorId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', index: true },
    title: { type: String, required: true, trim: true },
    problemStatement: { type: String, required: true },
    problemDescriptionMarkdown: { type: String, default: '' },
    inputFormat: { type: String, default: '' },
    outputFormat: { type: String, default: '' },
    constraints: { type: String, default: '' },
    difficulty: {
      type: String,
      enum: Object.values(DIFFICULTY_LEVELS),
      default: DIFFICULTY_LEVELS.MEDIUM,
      index: true,
    },
    topic: { type: String, trim: true, index: true },
    tags: [{ type: String, index: true }],
    supportedLanguages: {
      type: [String],
      enum: Object.values(PROGRAMMING_LANGUAGES),
      default: [
        PROGRAMMING_LANGUAGES.PYTHON,
        PROGRAMMING_LANGUAGES.JAVA,
        PROGRAMMING_LANGUAGES.CPP,
        PROGRAMMING_LANGUAGES.C,
      ],
    },
    starterCode: { type: starterCodeSchema, default: () => ({ ...DEFAULT_STARTER_CODE }) },
    executionMode: {
      type: String,
      enum: ['standard_io', 'function_signature'],
      default: 'standard_io',
    },
    sampleInput: { type: String, default: '' },
    sampleExpectedOutput: { type: String, default: '' },
    sampleExplanation: { type: String },
    defaultMarks: { type: Number, required: true, default: 10 },
    timeLimitSeconds: { type: Number, default: 2 },
    memoryLimitMb: { type: Number, default: 256 },
    allowedAttempts: { type: Number, default: 10 },
    scoringPolicy: {
      type: String,
      enum: Object.values(SCORING_POLICIES),
      default: SCORING_POLICIES.WEIGHTED,
    },
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'draft',
      index: true,
    },
    showTestCasesOnFail: {
      type: String,
      enum: ['none', 'sample_only', 'visible_only'],
      default: 'visible_only',
    },
  },
  { timestamps: true }
);

export const ProgrammingQuestion = mongoose.model<IProgrammingQuestion>(
  'ProgrammingQuestion',
  programmingQuestionSchema
);
