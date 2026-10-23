import { config } from '../../config/env';
import { CODE_VERDICTS, PROGRAMMING_LANGUAGES, ProgrammingLanguage } from '../../constants';
import { ExecutionRequest, ExecutionResult, IExecutionProvider } from './types';
import { compareOutputs } from './outputNormalizer';

const JUDGE0_LANGUAGE_IDS: Record<ProgrammingLanguage, number> = {
  [PROGRAMMING_LANGUAGES.C]: 50, // C (GCC 9.2.0)
  [PROGRAMMING_LANGUAGES.CPP]: 54, // C++ (GCC 9.2.0)
  [PROGRAMMING_LANGUAGES.JAVA]: 62, // Java (OpenJDK 13.0.1)
  [PROGRAMMING_LANGUAGES.PYTHON]: 71, // Python (3.8.1)
};

export class Judge0Provider implements IExecutionProvider {
  name = 'Judge0 Code Execution Service';

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    if (config.JUDGE0_API_KEY) {
      headers['X-RapidAPI-Key'] = config.JUDGE0_API_KEY;
      try {
        const url = new URL(config.JUDGE0_API_URL);
        headers['X-RapidAPI-Host'] = url.host;
      } catch {
        headers['X-RapidAPI-Host'] = 'judge0-ce.p.rapidapi.com';
      }
    }

    if (config.JUDGE0_AUTH_TOKEN) {
      headers['X-Auth-Token'] = config.JUDGE0_AUTH_TOKEN;
    }

    return headers;
  }

  async checkHealth(): Promise<{
    available: boolean;
    message?: string;
    supportedLanguages: ProgrammingLanguage[];
  }> {
    try {
      const response = await fetch(`${config.JUDGE0_API_URL}/about`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (response.ok) {
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

      return {
        available: false,
        message: `Judge0 returned HTTP status ${response.status}`,
        supportedLanguages: [],
      };
    } catch (err: any) {
      return {
        available: false,
        message: `Cannot reach Judge0 instance: ${err.message}`,
        supportedLanguages: [],
      };
    }
  }

  async execute(request: ExecutionRequest): Promise<ExecutionResult> {
    const langId = JUDGE0_LANGUAGE_IDS[request.language];
    if (!langId) {
      return {
        stdout: '',
        stderr: `Unsupported language: ${request.language}`,
        exitCode: 1,
        timeMs: 0,
        memoryKb: 0,
        verdict: CODE_VERDICTS.INTERNAL_EVALUATION_ERROR,
        statusDescription: `Unsupported language ${request.language}`,
      };
    }

    const payload: any = {
      language_id: langId,
      source_code: Buffer.from(request.sourceCode).toString('base64'),
      stdin: Buffer.from(request.stdin || '').toString('base64'),
      cpu_time_limit: Math.max(1, request.timeLimitSeconds || 2),
      memory_limit: Math.max(16384, (request.memoryLimitMb || 256) * 1024),
    };

    try {
      const url = `${config.JUDGE0_API_URL}/submissions?base64_encoded=true&wait=true`;
      const response = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          stdout: '',
          stderr: `Judge0 execution error HTTP ${response.status}: ${errorText}`,
          exitCode: 1,
          timeMs: 0,
          memoryKb: 0,
          verdict: CODE_VERDICTS.INTERNAL_EVALUATION_ERROR,
          statusDescription: `Judge0 returned status ${response.status}`,
        };
      }

      const data: any = await response.json();

      const stdout = data.stdout ? Buffer.from(data.stdout, 'base64').toString('utf-8') : '';
      const stderr = data.stderr ? Buffer.from(data.stderr, 'base64').toString('utf-8') : '';
      const compileOutput = data.compile_output
        ? Buffer.from(data.compile_output, 'base64').toString('utf-8')
        : undefined;

      const timeMs = data.time ? Math.round(parseFloat(data.time) * 1000) : 0;
      const memoryKb = data.memory || 0;
      const statusId = data.status?.id;
      const statusDescription = data.status?.description || 'Executed';

      let verdict: any = CODE_VERDICTS.INTERNAL_EVALUATION_ERROR;

      switch (statusId) {
        case 3: // Accepted by Judge0 or finished without runtime error
          if (request.expectedOutput !== undefined) {
            const matches = compareOutputs(stdout, request.expectedOutput);
            verdict = matches ? CODE_VERDICTS.ACCEPTED : CODE_VERDICTS.WRONG_ANSWER;
          } else {
            verdict = CODE_VERDICTS.ACCEPTED;
          }
          break;
        case 4: // Wrong Answer
          verdict = CODE_VERDICTS.WRONG_ANSWER;
          break;
        case 5: // Time Limit Exceeded
          verdict = CODE_VERDICTS.TIME_LIMIT_EXCEEDED;
          break;
        case 6: // Compilation Error
          verdict = CODE_VERDICTS.COMPILATION_ERROR;
          break;
        case 7:
        case 8:
        case 9:
        case 10:
        case 11:
        case 12:
          verdict = CODE_VERDICTS.RUNTIME_ERROR;
          break;
        default:
          if (stderr && stderr.trim().length > 0) {
            verdict = CODE_VERDICTS.RUNTIME_ERROR;
          } else if (request.expectedOutput !== undefined) {
            verdict = compareOutputs(stdout, request.expectedOutput)
              ? CODE_VERDICTS.ACCEPTED
              : CODE_VERDICTS.WRONG_ANSWER;
          } else {
            verdict = CODE_VERDICTS.ACCEPTED;
          }
      }

      return {
        stdout,
        stderr,
        compileOutput,
        exitCode: data.exit_code || 0,
        timeMs,
        memoryKb,
        verdict,
        statusDescription,
        rawStatusId: statusId,
      };
    } catch (err: any) {
      return {
        stdout: '',
        stderr: `Judge0 connectivity error: ${err.message}`,
        exitCode: 1,
        timeMs: 0,
        memoryKb: 0,
        verdict: CODE_VERDICTS.INTERNAL_EVALUATION_ERROR,
        statusDescription: `Judge0 unreachable: ${err.message}`,
      };
    }
  }
}
