import { spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import { CODE_VERDICTS, PROGRAMMING_LANGUAGES, ProgrammingLanguage } from '../../constants';
import { ExecutionRequest, ExecutionResult, IExecutionProvider } from './types';
import { compareOutputs } from './outputNormalizer';

function checkCommandAvailable(cmd: string): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const child = spawn(cmd, ['--version'], {
        shell: false,
        stdio: 'ignore',
        timeout: 2000,
      });
      child.on('error', () => resolve(false));
      child.on('close', (code) => resolve(code === 0 || code === 1)); // Some tools exit with 0 or 1 on --version
    } catch {
      resolve(false);
    }
  });
}

export class LocalSandboxProvider implements IExecutionProvider {
  name = 'Local Isolated Sandbox Provider';

  private pythonCmd = 'python';
  private hasCheckedPython = false;

  private async resolvePythonCmd(): Promise<string> {
    if (this.hasCheckedPython) return this.pythonCmd;
    if (await checkCommandAvailable('python3')) {
      this.pythonCmd = 'python3';
    } else if (await checkCommandAvailable('python')) {
      this.pythonCmd = 'python';
    }
    this.hasCheckedPython = true;
    return this.pythonCmd;
  }

  async checkHealth(): Promise<{
    available: boolean;
    message?: string;
    supportedLanguages: ProgrammingLanguage[];
  }> {
    const supported: ProgrammingLanguage[] = [];
    const pyCmd = await this.resolvePythonCmd();

    if (await checkCommandAvailable(pyCmd)) supported.push(PROGRAMMING_LANGUAGES.PYTHON);
    if (await checkCommandAvailable('gcc')) supported.push(PROGRAMMING_LANGUAGES.C);
    if (await checkCommandAvailable('g++')) supported.push(PROGRAMMING_LANGUAGES.CPP);
    if ((await checkCommandAvailable('javac')) && (await checkCommandAvailable('java'))) {
      supported.push(PROGRAMMING_LANGUAGES.JAVA);
    }

    return {
      available: supported.length > 0,
      message:
        supported.length > 0
          ? `Local compilers detected: ${supported.join(', ')}`
          : 'No local compilers (Python, GCC, or Java) found in system PATH.',
      supportedLanguages: supported,
    };
  }

  async execute(request: ExecutionRequest): Promise<ExecutionResult> {
    const sandboxId = `evt_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const tempDir = path.join(os.tmpdir(), sandboxId);

    // Create isolated directory
    await fs.promises.mkdir(tempDir, { recursive: true });

    // Strict stripped environment to prevent credential exfiltration
    const sanitizedEnv: NodeJS.ProcessEnv = {
      PATH: process.env.PATH || '',
      SYSTEMROOT: process.env.SYSTEMROOT || '',
      TEMP: tempDir,
      TMP: tempDir,
      HOME: tempDir,
      USERPROFILE: tempDir,
    };

    try {
      const timeoutMs = Math.max(1000, (request.timeLimitSeconds || 2) * 1000);
      const startTime = Date.now();

      switch (request.language) {
        case PROGRAMMING_LANGUAGES.PYTHON:
          return await this.executePython(request, tempDir, sanitizedEnv, timeoutMs);

        case PROGRAMMING_LANGUAGES.C:
          return await this.executeC(request, tempDir, sanitizedEnv, timeoutMs);

        case PROGRAMMING_LANGUAGES.CPP:
          return await this.executeCpp(request, tempDir, sanitizedEnv, timeoutMs);

        case PROGRAMMING_LANGUAGES.JAVA:
          return await this.executeJava(request, tempDir, sanitizedEnv, timeoutMs);

        default:
          return {
            stdout: '',
            stderr: `Unsupported language: ${request.language}`,
            exitCode: 1,
            timeMs: 0,
            memoryKb: 0,
            verdict: CODE_VERDICTS.INTERNAL_EVALUATION_ERROR,
            statusDescription: 'Unsupported Language',
          };
      }
    } finally {
      // Safe cleanup of sandbox directory
      try {
        await fs.promises.rm(tempDir, { recursive: true, force: true });
      } catch {}
    }
  }

  private runProcess(
    command: string,
    args: string[],
    cwd: string,
    env: NodeJS.ProcessEnv,
    stdin: string,
    timeoutMs: number
  ): Promise<{ stdout: string; stderr: string; exitCode: number; timeMs: number; timedOut: boolean }> {
    return new Promise((resolve) => {
      const startTime = Date.now();
      let stdoutData = '';
      let stderrData = '';
      let timedOut = false;

      let child: any;
      try {
        child = spawn(command, args, {
          cwd,
          env,
          shell: false,
          stdio: ['pipe', 'pipe', 'pipe'],
        });
      } catch (err: any) {
        resolve({
          stdout: '',
          stderr: `Process spawn error: ${err.message}`,
          exitCode: 1,
          timeMs: 0,
          timedOut: false,
        });
        return;
      }

      const timer = setTimeout(() => {
        timedOut = true;
        try {
          child.kill('SIGKILL');
        } catch {}
      }, timeoutMs);

      child.stdout.on('data', (chunk: Buffer) => {
        stdoutData += chunk.toString('utf-8');
      });

      child.stderr.on('data', (chunk: Buffer) => {
        stderrData += chunk.toString('utf-8');
      });

      child.on('error', (err: any) => {
        clearTimeout(timer);
        resolve({
          stdout: stdoutData,
          stderr: stderrData || err.message,
          exitCode: 1,
          timeMs: Date.now() - startTime,
          timedOut: false,
        });
      });

      child.on('close', (code: number | null) => {
        clearTimeout(timer);
        resolve({
          stdout: stdoutData,
          stderr: stderrData,
          exitCode: timedOut ? 124 : (code ?? 0),
          timeMs: Date.now() - startTime,
          timedOut,
        });
      });

      // Write stdin
      if (stdin) {
        try {
          child.stdin.write(stdin);
          child.stdin.end();
        } catch {}
      } else {
        try {
          child.stdin.end();
        } catch {}
      }
    });
  }

  private async executePython(
    req: ExecutionRequest,
    tempDir: string,
    env: NodeJS.ProcessEnv,
    timeoutMs: number
  ): Promise<ExecutionResult> {
    const pyCmd = await this.resolvePythonCmd();
    if (!(await checkCommandAvailable(pyCmd))) {
      return {
        stdout: '',
        stderr: 'Python interpreter not available in execution sandbox.',
        exitCode: 1,
        timeMs: 0,
        memoryKb: 0,
        verdict: CODE_VERDICTS.INTERNAL_EVALUATION_ERROR,
        statusDescription: 'Python interpreter not found',
      };
    }

    const scriptPath = path.join(tempDir, 'solution.py');
    await fs.promises.writeFile(scriptPath, req.sourceCode, 'utf-8');

    // Run with -u for unbuffered binary stdout and -B to prevent __pycache__ writing
    const res = await this.runProcess(
      pyCmd,
      ['-u', '-B', 'solution.py'],
      tempDir,
      env,
      req.stdin || '',
      timeoutMs
    );

    return this.buildResult(res, req.expectedOutput);
  }

  private async executeC(
    req: ExecutionRequest,
    tempDir: string,
    env: NodeJS.ProcessEnv,
    timeoutMs: number
  ): Promise<ExecutionResult> {
    if (!(await checkCommandAvailable('gcc'))) {
      return {
        stdout: '',
        stderr: 'GCC compiler not available in execution sandbox.',
        exitCode: 1,
        timeMs: 0,
        memoryKb: 0,
        verdict: CODE_VERDICTS.INTERNAL_EVALUATION_ERROR,
        statusDescription: 'GCC not found',
      };
    }

    const srcPath = path.join(tempDir, 'solution.c');
    const binName = process.platform === 'win32' ? 'solution.exe' : 'solution';
    const binPath = path.join(tempDir, binName);
    await fs.promises.writeFile(srcPath, req.sourceCode, 'utf-8');

    // Compile
    const compileRes = await this.runProcess(
      'gcc',
      ['-O2', '-Wall', 'solution.c', '-o', binName, '-lm'],
      tempDir,
      env,
      '',
      10000 // 10s compile limit
    );

    if (compileRes.exitCode !== 0) {
      return {
        stdout: '',
        stderr: compileRes.stderr,
        compileOutput: compileRes.stderr || 'Compilation failed',
        exitCode: compileRes.exitCode,
        timeMs: compileRes.timeMs,
        memoryKb: 0,
        verdict: CODE_VERDICTS.COMPILATION_ERROR,
        statusDescription: 'Compilation Error',
      };
    }

    // Execute
    const execRes = await this.runProcess(binPath, [], tempDir, env, req.stdin || '', timeoutMs);
    return this.buildResult(execRes, req.expectedOutput, compileRes.stderr);
  }

  private async executeCpp(
    req: ExecutionRequest,
    tempDir: string,
    env: NodeJS.ProcessEnv,
    timeoutMs: number
  ): Promise<ExecutionResult> {
    if (!(await checkCommandAvailable('g++'))) {
      return {
        stdout: '',
        stderr: 'G++ compiler not available in execution sandbox.',
        exitCode: 1,
        timeMs: 0,
        memoryKb: 0,
        verdict: CODE_VERDICTS.INTERNAL_EVALUATION_ERROR,
        statusDescription: 'G++ not found',
      };
    }

    const srcPath = path.join(tempDir, 'solution.cpp');
    const binName = process.platform === 'win32' ? 'solution.exe' : 'solution';
    const binPath = path.join(tempDir, binName);
    await fs.promises.writeFile(srcPath, req.sourceCode, 'utf-8');

    // Compile
    const compileRes = await this.runProcess(
      'g++',
      ['-O2', '-std=c++17', '-Wall', 'solution.cpp', '-o', binName],
      tempDir,
      env,
      '',
      10000
    );

    if (compileRes.exitCode !== 0) {
      return {
        stdout: '',
        stderr: compileRes.stderr,
        compileOutput: compileRes.stderr || 'Compilation failed',
        exitCode: compileRes.exitCode,
        timeMs: compileRes.timeMs,
        memoryKb: 0,
        verdict: CODE_VERDICTS.COMPILATION_ERROR,
        statusDescription: 'Compilation Error',
      };
    }

    // Execute
    const execRes = await this.runProcess(binPath, [], tempDir, env, req.stdin || '', timeoutMs);
    return this.buildResult(execRes, req.expectedOutput, compileRes.stderr);
  }

  private async executeJava(
    req: ExecutionRequest,
    tempDir: string,
    env: NodeJS.ProcessEnv,
    timeoutMs: number
  ): Promise<ExecutionResult> {
    if (!(await checkCommandAvailable('javac')) || !(await checkCommandAvailable('java'))) {
      return {
        stdout: '',
        stderr: 'Java development kit (javac/java) not available in execution sandbox.',
        exitCode: 1,
        timeMs: 0,
        memoryKb: 0,
        verdict: CODE_VERDICTS.INTERNAL_EVALUATION_ERROR,
        statusDescription: 'JDK not found',
      };
    }

    // Replace class name if necessary or enforce Main.java
    const srcPath = path.join(tempDir, 'Main.java');
    await fs.promises.writeFile(srcPath, req.sourceCode, 'utf-8');

    // Compile
    const compileRes = await this.runProcess('javac', ['Main.java'], tempDir, env, '', 10000);

    if (compileRes.exitCode !== 0) {
      return {
        stdout: '',
        stderr: compileRes.stderr,
        compileOutput: compileRes.stderr || 'Java compilation failed',
        exitCode: compileRes.exitCode,
        timeMs: compileRes.timeMs,
        memoryKb: 0,
        verdict: CODE_VERDICTS.COMPILATION_ERROR,
        statusDescription: 'Compilation Error',
      };
    }

    // Execute
    const execRes = await this.runProcess(
      'java',
      ['-Xmx256m', '-Xss64m', 'Main'],
      tempDir,
      env,
      req.stdin || '',
      timeoutMs
    );
    return this.buildResult(execRes, req.expectedOutput, compileRes.stderr);
  }

  private buildResult(
    res: { stdout: string; stderr: string; exitCode: number; timeMs: number; timedOut: boolean },
    expectedOutput?: string,
    compileOutput?: string
  ): ExecutionResult {
    let verdict: any = CODE_VERDICTS.INTERNAL_EVALUATION_ERROR;
    let statusDescription = 'Completed';

    if (res.timedOut) {
      verdict = CODE_VERDICTS.TIME_LIMIT_EXCEEDED;
      statusDescription = 'Time Limit Exceeded';
    } else if (res.exitCode !== 0) {
      verdict = CODE_VERDICTS.RUNTIME_ERROR;
      statusDescription = `Runtime Error (Exit Code ${res.exitCode})`;
    } else {
      if (expectedOutput !== undefined) {
        const matches = compareOutputs(res.stdout, expectedOutput);
        verdict = matches ? CODE_VERDICTS.ACCEPTED : CODE_VERDICTS.WRONG_ANSWER;
        statusDescription = matches ? 'Accepted' : 'Wrong Answer';
      } else {
        verdict = CODE_VERDICTS.ACCEPTED;
        statusDescription = 'Success';
      }
    }

    return {
      stdout: res.stdout,
      stderr: res.stderr,
      compileOutput,
      exitCode: res.exitCode,
      timeMs: res.timeMs,
      memoryKb: 0,
      verdict,
      statusDescription,
    };
  }
}
