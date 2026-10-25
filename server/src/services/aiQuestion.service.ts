import { z } from 'zod';
import { config } from '../config/env';
import { AIUsageLog, Subscription } from '../models';
import { QUESTION_TYPES, DIFFICULTY_LEVELS } from '../constants';

export const GeneratedQuestionItemSchema = z.object({
  subject: z.string(),
  topic: z.string().optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  type: z.enum(['mcq', 'multiple_select', 'true_false', 'fill_blank', 'short_answer', 'long_answer', 'code']),
  text: z.string().min(5),
  codeSnippet: z.string().optional(),
  options: z.array(
    z.object({
      id: z.string(),
      text: z.string(),
    })
  ).default([]),
  correctAnswers: z.array(z.string()).min(1),
  explanation: z.string().optional(),
  defaultMarks: z.number().min(1).default(1),
});

export type IGeneratedQuestionItem = z.infer<typeof GeneratedQuestionItemSchema>;

export interface GenerateQuestionsParams {
  userId: string;
  organizationId?: string;
  topic: string;
  subject: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  count?: number;
  questionTypes?: string[];
  marksPerQuestion?: number;
  language?: string;
  includeExplanations?: boolean;
}

export class AIQuestionService {
  /**
   * Generates a structured set of questions using LLM API or fallback algorithm.
   */
  static async generateQuestions(params: GenerateQuestionsParams): Promise<IGeneratedQuestionItem[]> {
    const count = Math.min(Math.max(1, params.count || 5), 20); // Clamp 1..20
    const difficulty = params.difficulty || 'medium';
    const marks = params.marksPerQuestion || 2;
    const types = params.questionTypes && params.questionTypes.length > 0 ? params.questionTypes : ['mcq', 'true_false'];

    let questions: IGeneratedQuestionItem[] = [];
    let tokensUsed = 0;
    let isSuccess = true;
    let errorMessage: string | undefined;

    try {
      // Check if external Gemini / OpenAI key is available
      if (config.GEMINI_API_KEY) {
        questions = await this.callGeminiAPI(params, count, difficulty, marks, types);
      } else if (config.OPENAI_API_KEY) {
        questions = await this.callOpenAIAPI(params, count, difficulty, marks, types);
      } else {
        // High quality simulated domain question generator
        questions = this.generateFallbackQuestions(params, count, difficulty, marks, types);
      }

      // Strict validation through Zod
      questions = questions.map((q) => GeneratedQuestionItemSchema.parse(q));
      tokensUsed = count * 150;
    } catch (err: any) {
      isSuccess = false;
      errorMessage = err.message;
      console.error('[AIService] Generation error:', err.message);
      // Fallback generator ensures user experience is never blocked
      questions = this.generateFallbackQuestions(params, count, difficulty, marks, types);
      questions = questions.map((q) => GeneratedQuestionItemSchema.parse(q));
    } finally {
      // Record usage log
      await AIUsageLog.create({
        userId: params.userId,
        organizationId: params.organizationId,
        prompt: `Generate ${count} questions for ${params.subject} / ${params.topic}`,
        action: 'generate_questions',
        questionCountGenerated: questions.length,
        tokensUsed,
        success: isSuccess,
        errorMessage,
      });
    }

    return questions;
  }

  private static async callGeminiAPI(
    params: GenerateQuestionsParams,
    count: number,
    difficulty: string,
    marks: number,
    types: string[]
  ): Promise<IGeneratedQuestionItem[]> {
    const candidateModels = [
      config.GEMINI_MODEL || 'gemini-3.5-flash',
      'gemini-flash-lite-latest',
      'gemini-3.1-flash-lite',
      'gemini-3.5-flash-lite',
    ];

    const prompt = `
      You are an expert exam question author. Generate ${count} high quality examination questions for:
      Subject: ${params.subject}
      Topic: ${params.topic}
      Difficulty: ${difficulty}
      Permitted Types: ${types.join(', ')}
      Marks per question: ${marks}

      Respond strictly with a JSON array adhering to this schema:
      [
        {
          "subject": "${params.subject}",
          "topic": "${params.topic}",
          "difficulty": "${difficulty}",
          "type": "mcq" | "multiple_select" | "true_false" | "fill_blank" | "short_answer",
          "text": "Question text here",
          "options": [{"id": "opt_1", "text": "Choice 1"}, {"id": "opt_2", "text": "Choice 2"}],
          "correctAnswers": ["opt_1"],
          "explanation": "Why this is correct",
          "defaultMarks": ${marks}
        }
      ]
      Do not include markdown code ticks, output only valid JSON.
    `;

    let lastError: Error | null = null;
    for (const model of candidateModels) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.GEMINI_API_KEY}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
          }),
        });

        if (!res.ok) {
          const errData: any = await res.json().catch(() => ({}));
          console.warn(`[AIService] Gemini model ${model} returned ${res.status}: ${errData?.error?.message || res.statusText}`);
          continue;
        }

        const data: any = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) continue;
        const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleanJson);
      } catch (err: any) {
        lastError = err;
        console.warn(`[AIService] Gemini model ${model} invocation error:`, err.message);
      }
    }

    throw lastError || new Error('All Gemini candidate models failed to generate questions');
  }

  private static async callOpenAIAPI(
    params: GenerateQuestionsParams,
    count: number,
    difficulty: string,
    marks: number,
    types: string[]
  ): Promise<IGeneratedQuestionItem[]> {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an educational assessment expert. Return JSON arrays of exam questions strictly.',
          },
          {
            role: 'user',
            content: `Generate ${count} questions for subject "${params.subject}", topic "${params.topic}", difficulty "${difficulty}". Types: ${types.join(',')}. Marks: ${marks}.`,
          },
        ],
        response_format: { type: 'json_object' },
      }),
    });

    if (!res.ok) {
      throw new Error(`OpenAI API failed with status ${res.status}`);
    }

    const data: any = await res.json();
    const parsed = JSON.parse(data.choices[0].message.content);
    return Array.isArray(parsed) ? parsed : parsed.questions || [];
  }

  /**
   * Deterministic educational fallback generator for instant, resilient offline operation.
   */
  static generateFallbackQuestions(
    params: GenerateQuestionsParams,
    count: number,
    difficulty: 'easy' | 'medium' | 'hard',
    marks: number,
    types: string[]
  ): IGeneratedQuestionItem[] {
    const questions: IGeneratedQuestionItem[] = [];
    const sampleTopics = [
      {
        text: `What is the primary architectural principle of ${params.topic} in ${params.subject}?`,
        type: 'mcq' as const,
        options: [
          { id: 'opt_1', text: `Separation of concerns and modular decoupling` },
          { id: 'opt_2', text: `Monolithic centralization with global mutable state` },
          { id: 'opt_3', text: `Immediate synchrony without asynchronous callbacks` },
          { id: 'opt_4', text: `Direct hardware access bypassing OS kernel boundaries` },
        ],
        correct: ['opt_1'],
        exp: `Decoupled components ensure testability, fault isolation, and independent scalability.`,
      },
      {
        text: `True or False: In ${params.subject}, ${params.topic} guarantees atomic consistency across distributed nodes without two-phase commit.`,
        type: 'true_false' as const,
        options: [
          { id: 'opt_true', text: 'True' },
          { id: 'opt_false', text: 'False' },
        ],
        correct: ['opt_false'],
        exp: `The CAP theorem and FLP impossibility demonstrate distributed consensus requires coordination protocols.`,
      },
      {
        text: `Which of the following are valid characteristics of ${params.topic}?`,
        type: 'multiple_select' as const,
        options: [
          { id: 'opt_1', text: `High availability under network partitions` },
          { id: 'opt_2', text: `Strict idempotent execution semantics` },
          { id: 'opt_3', text: `Deterministic output for identical input parameters` },
          { id: 'opt_4', text: `Unbounded recursive execution without termination guarantees` },
        ],
        correct: ['opt_1', 'opt_2', 'opt_3'],
        exp: `Idempotence, partition tolerance, and determinism are core pillars.`,
      },
      {
        text: `Fill in the blank: The mechanism used in ${params.topic} to prevent race conditions during concurrent mutations is called ________.`,
        type: 'fill_blank' as const,
        options: [],
        correct: ['mutex', 'locking', 'atomic transaction', 'semaphore'],
        exp: `Mutex or atomic locking guarantees mutual exclusion.`,
      },
      {
        text: `Briefly explain the role and significance of ${params.topic} in modern ${params.subject} applications.`,
        type: 'short_answer' as const,
        options: [],
        correct: ['keyword: scalability, modularity, efficiency'],
        exp: `Evaluated based on conceptual clarity, real-world examples, and architectural tradeoffs.`,
      },
    ];

    for (let i = 0; i < count; i++) {
      const template = sampleTopics[i % sampleTopics.length];
      questions.push({
        subject: params.subject,
        topic: params.topic,
        difficulty,
        type: template.type,
        text: `Q${i + 1}: ${template.text}`,
        options: template.options,
        correctAnswers: template.correct,
        explanation: template.exp,
        defaultMarks: marks,
      });
    }

    return questions;
  }

  /**
   * Generates a complete coding/programming problem with test cases and starter code using Gemini AI.
   */
  static async generateProgrammingQuestion(params: {
    userId: string;
    organizationId?: string;
    subject: string;
    topic: string;
    difficulty?: 'easy' | 'medium' | 'hard';
  }): Promise<any> {
    const difficulty = params.difficulty || 'medium';
    const candidateModels = [
      config.GEMINI_MODEL || 'gemini-3.5-flash',
      'gemini-flash-lite-latest',
      'gemini-3.1-flash-lite',
      'gemini-3.5-flash-lite',
    ];

    const prompt = `
      You are an expert computer science professor and competitive programming problem setter.
      Generate a complete, high-quality, production-ready coding challenge for:
      Subject: ${params.subject}
      Topic: ${params.topic}
      Difficulty: ${difficulty}

      Respond STRICTLY with a single valid JSON object adhering to this schema (do NOT include markdown code blocks, do NOT write anything outside the JSON):
      {
        "title": "Title of the problem",
        "problemStatement": "Clear and detailed problem statement describing the task.",
        "inputFormat": "Clear specification of input lines and data types.",
        "outputFormat": "Clear specification of expected output format.",
        "constraints": "e.g. 1 <= N <= 10^5",
        "sampleInput": "Sample standard input data",
        "sampleExpectedOutput": "Expected standard output for sample input",
        "sampleExplanation": "Detailed step by step explanation of the sample case",
        "defaultMarks": 10,
        "timeLimitSeconds": 2,
        "memoryLimitMb": 256,
        "starterCode": {
          "python": "import sys\\n\\ndef main():\\n    # Write your solution here\\n    pass\\n\\nif __name__ == '__main__':\\n    main()\\n",
          "java": "import java.util.*;\\n\\npublic class Main {\\n    public static void main(String[] args) {\\n        Scanner sc = new Scanner(System.in);\\n        // Write your solution here\\n        sc.close();\\n    }\\n}\\n",
          "cpp": "#include <iostream>\\nusing namespace std;\\n\\nint main() {\\n    // Write your solution here\\n    return 0;\\n}\\n",
          "c": "#include <stdio.h>\\n\\nint main() {\\n    // Write your solution here\\n    return 0;\\n}\\n"
        },
        "testCases": [
          {
            "input": "Sample input value",
            "expectedOutput": "Sample expected output",
            "isHidden": false,
            "isSample": true,
            "weight": 5,
            "description": "Sample test case"
          },
          {
            "input": "Edge case input value",
            "expectedOutput": "Expected output for edge case",
            "isHidden": true,
            "isSample": false,
            "weight": 5,
            "description": "Hidden test case"
          }
        ]
      }
    `;

    if (config.GEMINI_API_KEY) {
      for (const model of candidateModels) {
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.GEMINI_API_KEY}`;
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
            }),
          });

          if (!res.ok) {
            console.warn(`[AIService] Programming question gen model ${model} HTTP ${res.status}`);
            continue;
          }

          const data: any = await res.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (!text) continue;
          const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(cleanJson);

          // Log AI usage
          await AIUsageLog.create({
            userId: params.userId,
            organizationId: params.organizationId,
            prompt: `Generate coding question for ${params.subject} / ${params.topic}`,
            action: 'generate_coding_question',
            questionCountGenerated: 1,
            tokensUsed: 400,
            success: true,
          }).catch(() => {});

          return parsed;
        } catch (err: any) {
          console.warn(`[AIService] Failed with model ${model}:`, err.message);
        }
      }
    }

    // Fallback if AI service unavailable
    return this.generateFallbackProgrammingQuestion(params.subject, params.topic, difficulty);
  }

  static generateFallbackProgrammingQuestion(
    subject: string,
    topic: string,
    difficulty: 'easy' | 'medium' | 'hard'
  ): any {
    return {
      title: `${topic} Challenge: Optimal Processing`,
      problemStatement: `Given a collection of data elements representing ${topic} in ${subject}, design an optimal algorithm to process the elements and output the aggregated result based on standard problem constraints.`,
      inputFormat: `The first line contains an integer N, the number of test elements.\nThe second line contains N space-separated integers.`,
      outputFormat: `Print the calculated result on a single line.`,
      constraints: `1 <= N <= 10^5\n-10^9 <= Value <= 10^9`,
      sampleInput: `5\n10 20 30 40 50`,
      sampleExpectedOutput: `150`,
      sampleExplanation: `Sum of all array elements: 10 + 20 + 30 + 40 + 50 = 150.`,
      defaultMarks: 10,
      timeLimitSeconds: 2,
      memoryLimitMb: 256,
      starterCode: {
        python: `import sys\n\ndef main():\n    lines = sys.stdin.read().split()\n    if not lines:\n        return\n    n = int(lines[0])\n    nums = [int(x) for x in lines[1:n+1]]\n    # Solve:\n    print(sum(nums))\n\nif __name__ == '__main__':\n    main()\n`,
        java: `import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (sc.hasNextInt()) {\n            int n = sc.nextInt();\n            long sum = 0;\n            for (int i = 0; i < n; i++) {\n                sum += sc.nextInt();\n            }\n            System.out.println(sum);\n        }\n        sc.close();\n    }\n}\n`,
        cpp: `#include <iostream>\n#include <vector>\nusing namespace std;\n\nint main() {\n    ios_base::sync_with_stdio(false);\n    cin.tie(NULL);\n    int n;\n    if (cin >> n) {\n        long long sum = 0;\n        for (int i = 0; i < n; i++) {\n            long long val;\n            cin >> val;\n            sum += val;\n        }\n        cout << sum << "\\n";\n    }\n    return 0;\n}\n`,
        c: `#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf("%d", &n) == 1) {\n        long long sum = 0;\n        for (int i = 0; i < n; i++) {\n            long long val;\n            scanf("%lld", &val);\n            sum += val;\n        }\n        printf("%lld\\n", sum);\n    }\n    return 0;\n}\n`,
      },
      testCases: [
        {
          input: `5\n10 20 30 40 50`,
          expectedOutput: `150`,
          isHidden: false,
          isSample: true,
          weight: 5,
          description: `Sample case with positive integers`,
        },
        {
          input: `3\n-5 10 -2`,
          expectedOutput: `3`,
          isHidden: true,
          isSample: false,
          weight: 5,
          description: `Hidden case with negative integers`,
        },
      ],
    };
  }
}
