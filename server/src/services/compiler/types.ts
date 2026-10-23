import { CodeVerdict, ProgrammingLanguage } from '../../constants';

export interface ExecutionRequest {
  language: ProgrammingLanguage;
  sourceCode: string;
  stdin?: string;
  expectedOutput?: string;
  timeLimitSeconds?: number;
  memoryLimitMb?: number;
}

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  compileOutput?: string;
  exitCode: number;
  timeMs: number;
  memoryKb: number;
  verdict: CodeVerdict;
  statusDescription: string;
  rawStatusId?: number;
}

export interface IExecutionProvider {
  name: string;
  checkHealth(): Promise<{ available: boolean; message?: string; supportedLanguages: ProgrammingLanguage[] }>;
  execute(request: ExecutionRequest): Promise<ExecutionResult>;
}
