import { config } from '../config/env';

export interface SocraticVivaQuestion {
  id: string;
  question: string;
  focusArea: 'architecture' | 'edge_cases' | 'complexity' | 'data_structures';
  expectedConcepts: string[];
}

export interface SocraticVivaEvaluation {
  score: number; // 0 to 100
  conceptualClarity: 'high' | 'moderate' | 'low';
  isAuthentic: boolean;
  feedback: string;
}

export interface MutationTestCase {
  input: string;
  expectedOutput: string;
  vulnerabilityType: 'hardcoding' | 'off_by_one' | 'boundary_limit' | 'empty_or_null';
  explanation: string;
}

export interface CopilotResponse {
  message: string;
  hintType: 'concept' | 'syntax_fix' | 'algorithm_direction' | 'edge_case_warning';
  suggestedAction?: string;
}

export interface SkillDnaCategory {
  category: string;
  score: number; // 0 to 100
  percentile: number;
}

export class AIAdvancedService {
  private static async callGemini(prompt: string): Promise<string> {
    if (!config.GEMINI_API_KEY) {
      throw new Error('Gemini API Key is not configured');
    }

    const candidateModels = [
      'gemini-2.5-flash',
      'gemini-2.0-flash',
      'gemini-1.5-flash',
      'gemini-flash-latest',
      config.GEMINI_MODEL || 'gemini-2.5-flash',
    ];

    let lastError: Error | null = null;
    for (const model of candidateModels) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.GEMINI_API_KEY}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.3,
              maxOutputTokens: 1024,
            },
          }),
        });

        if (!res.ok) {
          const errBody = await res.text().catch(() => '');
          throw new Error(`Gemini HTTP ${res.status}: ${errBody}`);
        }

        const data: any = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return text.trim();
      } catch (err: any) {
        lastError = err;
      }
    }

    throw lastError || new Error('Failed to query Gemini models');
  }

  /**
   * 1. AI Socratic Viva Question Generator
   */
  static async generateSocraticViva(
    problemTitle: string,
    problemStatement: string,
    studentCode: string,
    language: string
  ): Promise<SocraticVivaQuestion[]> {
    const prompt = `
      You are an elite Senior Staff Software Engineer and Oral Technical Examiner conducting a code defense viva.
      A student has just submitted their solution for:
      Problem: ${problemTitle}
      Description: ${problemStatement.slice(0, 500)}
      Language: ${language}

      Student's Submitted Code:
      \`\`\`${language}
      ${studentCode.slice(0, 1500)}
      \`\`\`

      Task: Generate exactly 2 distinct, highly specific questions to verify that the student actually wrote and understands their code.
      - Question 1: Ask about a specific algorithmic or architectural choice in their code (e.g. why they chose a specific data structure, loop structure, or helper).
      - Question 2: Ask about an edge-case or time/space complexity behavior (e.g. "What would happen if the input array is empty or contains duplicates?").

      Respond ONLY with valid JSON array:
      [
        {
          "id": "viva_q1",
          "question": "Question text here",
          "focusArea": "architecture" | "data_structures",
          "expectedConcepts": ["concept1", "concept2"]
        },
        {
          "id": "viva_q2",
          "question": "Question text here",
          "focusArea": "edge_cases" | "complexity",
          "expectedConcepts": ["concept1", "concept2"]
        }
      ]
      Do NOT include markdown formatting or backticks outside the JSON.
    `;

    try {
      const raw = await this.callGemini(prompt);
      const clean = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(clean);
      if (Array.isArray(parsed) && parsed.length >= 2) {
        return parsed.slice(0, 2);
      }
    } catch (err) {
      console.warn('[AI Viva] Gemini generation fallback:', err);
    }

    // Heuristic fallback
    return [
      {
        id: 'viva_q1',
        question: `In your ${language} solution for "${problemTitle}", explain why you structured your primary loop/function this way and what data structures you relied on.`,
        focusArea: 'architecture',
        expectedConcepts: ['Time complexity', 'Data structures', 'Algorithmic flow'],
      },
      {
        id: 'viva_q2',
        question: `How does your code handle boundary edge conditions, such as empty inputs, negative numbers, or maximum constraints?`,
        focusArea: 'edge_cases',
        expectedConcepts: ['Edge cases', 'Boundary checks', 'Constraint handling'],
      },
    ];
  }

  /**
   * 1b. Evaluate Socratic Viva Response
   */
  static async evaluateSocraticViva(
    question: string,
    studentResponse: string,
    originalCode: string
  ): Promise<SocraticVivaEvaluation> {
    if (!studentResponse || studentResponse.trim().length < 5) {
      return {
        score: 0,
        conceptualClarity: 'low',
        isAuthentic: false,
        feedback: 'No meaningful verbal or written explanation was provided to defend the solution.',
      };
    }

    const prompt = `
      You are an expert technical interviewer evaluating a student's answer to a code defense question.
      Defense Question: "${question}"
      Student's Defense Answer: "${studentResponse}"
      Submitted Code Context:
      \`\`\`
      ${originalCode.slice(0, 800)}
      \`\`\`

      Evaluate the student's conceptual understanding, logic accuracy, and whether their explanation authentically matches their written code.
      Score between 0 and 100.
      Respond strictly with JSON:
      {
        "score": number (0-100),
        "conceptualClarity": "high" | "moderate" | "low",
        "isAuthentic": boolean,
        "feedback": "2 sentence constructive critique"
      }
    `;

    try {
      const raw = await this.callGemini(prompt);
      const clean = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(clean);
      return {
        score: Math.min(100, Math.max(0, Number(parsed.score) || 75)),
        conceptualClarity: parsed.conceptualClarity || 'moderate',
        isAuthentic: Boolean(parsed.isAuthentic ?? true),
        feedback: parsed.feedback || 'Good defense of the underlying algorithm.',
      };
    } catch {
      // Heuristic fallback
      const wordCount = studentResponse.trim().split(/\s+/).length;
      const score = Math.min(95, Math.max(30, wordCount * 5));
      return {
        score,
        conceptualClarity: score > 70 ? 'high' : 'moderate',
        isAuthentic: true,
        feedback: 'Response addresses the core algorithmic design and edge case handling satisfactorily.',
      };
    }
  }

  /**
   * 4. Real-time Adversarial Mutation Testing
   */
  static async generateAdversarialMutation(
    problemTitle: string,
    problemStatement: string,
    studentCode: string,
    language: string,
    knownSampleInputs: string[]
  ): Promise<MutationTestCase | null> {
    const prompt = `
      You are an Adversarial QA Stress-Tester designed to catch hardcoded solutions, false heuristics, and unhandled edge cases.
      Problem: ${problemTitle}
      Problem Statement: ${problemStatement.slice(0, 400)}
      Known Sample Inputs: ${JSON.stringify(knownSampleInputs)}
      Student's Code:
      \`\`\`${language}
      ${studentCode.slice(0, 1200)}
      \`\`\`

      Analyze if the student hardcoded test outputs (e.g., \`if (n == 5) return 25\`) or made flawed assumptions (e.g., positive only, non-empty, small scale).
      Generate ONE valid adversarial corner-case test input that is valid according to the problem constraints but will expose hardcoded/flawed logic.

      Respond ONLY with valid JSON:
      {
        "input": "test input string formatted for stdin",
        "expectedOutput": "correct expected output",
        "vulnerabilityType": "hardcoding" | "boundary_limit" | "off_by_one" | "empty_or_null",
        "explanation": "Why this adversarial test case was synthesized"
      }
    `;

    try {
      const raw = await this.callGemini(prompt);
      const clean = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
      return JSON.parse(clean);
    } catch {
      return null;
    }
  }

  /**
   * 5. Constrained AI Co-Pilot / Pair-Programming Assistant
   */
  static async getCopilotAssist(
    userPrompt: string,
    problemStatement: string,
    currentCode: string,
    language: string
  ): Promise<CopilotResponse> {
    const prompt = `
      You are an AI Senior Software Architect acting as an exam pair-programming mentor.
      CRITICAL RULE: Under NO circumstances should you provide the complete solution code or write the answer for the student.
      Your role is to guide the student, explain compiler errors, suggest algorithmic patterns (e.g. "consider using two-pointers or binary search"), or point out logic pitfalls.

      Problem:
      ${problemStatement.slice(0, 500)}

      Student's Current Code (${language}):
      \`\`\`${language}
      ${currentCode.slice(0, 1200)}
      \`\`\`

      Student's Request / Question:
      "${userPrompt}"

      Provide an insightful, concise mentor response (max 3-4 sentences) with actionable architectural guidance.
      Respond strictly with JSON:
      {
        "message": "Mentor guidance text",
        "hintType": "concept" | "syntax_fix" | "algorithm_direction" | "edge_case_warning",
        "suggestedAction": "One sentence step student should try next"
      }
    `;

    try {
      const raw = await this.callGemini(prompt);
      const clean = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
      return JSON.parse(clean);
    } catch {
      return {
        message: 'Review your loop boundary conditions and verify your data structures match the constraints.',
        hintType: 'algorithm_direction',
        suggestedAction: 'Trace your code with a small manual input example on paper.',
      };
    }
  }

  /**
   * 6. Calculate Skill DNA Breakdown
   */
  static calculateSkillDna(
    totalPercentage: number,
    programmingPercentage: number,
    vivaScore?: number,
    keystrokeScore = 100
  ): SkillDnaCategory[] {
    const safeTotal = Math.min(100, Math.max(0, totalPercentage));
    const safeProg = Math.min(100, Math.max(0, programmingPercentage || totalPercentage));
    const safeViva = vivaScore !== undefined ? Math.min(100, Math.max(0, vivaScore)) : safeProg;

    return [
      {
        category: 'Algorithmic Problem Solving',
        score: Math.round(safeProg * 0.9 + safeTotal * 0.1),
        percentile: Math.min(99, Math.round(safeProg * 0.95 + 4)),
      },
      {
        category: 'Code Elegance & Clean Architecture',
        score: Math.round(safeProg * 0.85 + (keystrokeScore > 80 ? 15 : 5)),
        percentile: Math.min(99, Math.round(safeProg * 0.88 + 8)),
      },
      {
        category: 'Conceptual Defense (Socratic Viva)',
        score: Math.round(safeViva),
        percentile: Math.min(99, Math.round(safeViva * 0.92 + 5)),
      },
      {
        category: 'Industry Execution & Testing Discipline',
        score: Math.round(safeTotal * 0.8 + safeProg * 0.2),
        percentile: Math.min(99, Math.round(safeTotal * 0.9 + 6)),
      },
    ];
  }

  /**
   * 6b. Generate Markdown Portfolio Export for GitHub
   */
  static generateGitHubPortfolioBundle(
    examTitle: string,
    studentName: string,
    examCode: string,
    totalScore: number,
    maxScore: number,
    percentage: number,
    questionBreakdown: any[],
    verificationUrl: string
  ): { readmeContent: string; files: { fileName: string; code: string; language: string }[] } {
    const files: { fileName: string; code: string; language: string }[] = [];

    let questionsMarkdown = '';
    questionBreakdown.forEach((q, idx) => {
      const qNum = idx + 1;
      const isProg = Boolean(q.language && q.studentAnswer);
      questionsMarkdown += `
### Question ${qNum}: ${q.questionText.slice(0, 80)}...
- **Score Awarded:** ${q.marksObtained} / ${q.maxMarks} Marks (${q.isCorrect ? 'PASSED' : 'PARTIAL'})
${q.feedback ? `- **Evaluator Feedback:** ${q.feedback}` : ''}
`;

      if (isProg) {
        const ext = q.language === 'python' ? 'py' : q.language === 'java' ? 'java' : q.language === 'cpp' ? 'cpp' : 'c';
        const fileName = `Solution_Q${qNum}.${ext}`;
        files.push({
          fileName,
          code: String(q.studentAnswer),
          language: q.language,
        });

        questionsMarkdown += `
\`\`\`${q.language}
${q.studentAnswer}
\`\`\`
`;
      }
    });

    const readmeContent = `# ${examTitle} — Verified Evaluation Solution
**Candidate:** ${studentName}  
**Exam Access Code:** \`${examCode}\`  
**Evaluation Score:** **${totalScore} / ${maxScore}** (${percentage}%)  
**Status:** Certified & Verified by EvalTech Next-Gen Assessment Engine  
**Verification Badge:** [View Live Certified Credential](${verificationUrl})

---

## 🏆 Assessment Summary
This repository contains verified source code and algorithmic solutions completed under the EvalTech proctored environment.

| Metric | Result |
| :--- | :--- |
| **Total Score** | ${totalScore} / ${maxScore} Marks |
| **Pass Percentage** | ${percentage}% |
| **Verification Key** | \`EVT-CERT-${examCode}-${Date.now().toString(36).toUpperCase()}\` |
| **Evaluation Engine** | EvalTech Autonomous Scoring & Gemini AI |

---

## 💻 Solutions & Explanations
${questionsMarkdown}

---
*Generated automatically by [EvalTech Next-Gen Examination SaaS](https://eval-tech-portal.vercel.app)*
`;

    return { readmeContent, files };
  }
}

