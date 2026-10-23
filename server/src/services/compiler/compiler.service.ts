import { config } from '../../config/env';
import {
  CODE_VERDICTS,
  PROGRAMMING_LANGUAGES,
  ProgrammingLanguage,
} from '../../constants';
import { ExecutionRequest, ExecutionResult, IExecutionProvider } from './types';
import { Judge0Provider } from './judge0.provider';
import { LocalSandboxProvider } from './localSandbox.provider';

export class CompilerService {
  private static provider: IExecutionProvider | null = null;

  static getProvider(): IExecutionProvider {
    if (!this.provider) {
      if (config.COMPILER_PROVIDER === 'judge0') {
        this.provider = new Judge0Provider();
      } else {
        this.provider = new LocalSandboxProvider();
      }
    }
    return this.provider;
  }

  /**
   * Override provider for testing
   */
  static setProvider(provider: IExecutionProvider | null): void {
    this.provider = provider;
  }

  /**
   * Check status of the active execution provider
   */
  static async checkHealth(): Promise<{
    provider: string;
    available: boolean;
    message?: string;
    supportedLanguages: ProgrammingLanguage[];
  }> {
    const prov = this.getProvider();
    const status = await prov.checkHealth();
    return {
      provider: prov.name,
      ...status,
    };
  }

  /**
   * Execute code with validation and resource enforcement
   */
  static async execute(request: ExecutionRequest): Promise<ExecutionResult> {
    // 1. Validate Language
    const validLanguages = Object.values(PROGRAMMING_LANGUAGES) as string[];
    if (!validLanguages.includes(request.language)) {
      return {
        stdout: '',
        stderr: `Unsupported programming language: "${request.language}". Supported: ${validLanguages.join(', ')}`,
        exitCode: 1,
        timeMs: 0,
        memoryKb: 0,
        verdict: CODE_VERDICTS.INTERNAL_EVALUATION_ERROR,
        statusDescription: 'Invalid Language',
      };
    }

    // 2. Validate Source Code Size
    const codeBytes = Buffer.byteLength(request.sourceCode, 'utf8');
    if (codeBytes > config.MAX_SOURCE_CODE_BYTES) {
      return {
        stdout: '',
        stderr: `Source code exceeds allowed size limit (${codeBytes} bytes > ${config.MAX_SOURCE_CODE_BYTES} bytes)`,
        exitCode: 1,
        timeMs: 0,
        memoryKb: 0,
        verdict: CODE_VERDICTS.INTERNAL_EVALUATION_ERROR,
        statusDescription: 'Source Code Too Large',
      };
    }

    if (!request.sourceCode.trim()) {
      return {
        stdout: '',
        stderr: 'Source code cannot be empty.',
        exitCode: 1,
        timeMs: 0,
        memoryKb: 0,
        verdict: CODE_VERDICTS.COMPILATION_ERROR,
        statusDescription: 'Empty Source Code',
      };
    }

    const provider = this.getProvider();
    return await provider.execute(request);
  }
}
