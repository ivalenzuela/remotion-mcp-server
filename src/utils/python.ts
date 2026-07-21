import { spawn } from 'node:child_process';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { logger } from './logger.js';
import { killProcessTree } from './exec.js';

export interface PythonRunOptions {
  scriptPath: string;
  args: string[];
  cwd?: string;
  env?: Record<string, string>;
  timeoutMs?: number;
  pythonPath?: string;
}

export interface PythonRunResult<T = unknown> {
  success: boolean;
  data?: T;
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
  error?: string;
}

export function getPythonExecutable(customPath?: string): string {
  if (customPath && customPath.trim().length > 0) {
    return customPath.trim();
  }

  if (process.env.PYTHON_PATH && process.env.PYTHON_PATH.trim().length > 0) {
    return process.env.PYTHON_PATH.trim();
  }

  return process.platform === 'win32' ? 'python' : 'python3';
}

export async function runPythonScript<T = unknown>(
  options: PythonRunOptions
): Promise<PythonRunResult<T>> {
  const startTime = Date.now();
  const timeoutMs = options.timeoutMs ?? 60000;
  const pythonBin = getPythonExecutable(options.pythonPath);
  const resolvedScript = path.resolve(options.scriptPath);

  if (!fs.existsSync(resolvedScript)) {
    return {
      success: false,
      stdout: '',
      stderr: `Python script not found: ${resolvedScript}`,
      exitCode: -1,
      durationMs: 0,
      error: `Python script not found at ${resolvedScript}`,
    };
  }

  const fullArgs = [resolvedScript, ...options.args];

  logger.info(`Running Python script: ${pythonBin} ${fullArgs.join(' ')}`);

  return new Promise<PythonRunResult<T>>((resolve) => {
    let stdoutData = '';
    let stderrData = '';
    let timedOut = false;
    let timer: NodeJS.Timeout | null = null;

    const child = spawn(pythonBin, fullArgs, {
      cwd: options.cwd || path.dirname(resolvedScript),
      shell: false,
      env: {
        ...process.env,
        PYTHONUNBUFFERED: '1',
        ...(options.env || {}),
      },
    });

    if (timeoutMs > 0) {
      timer = setTimeout(() => {
        timedOut = true;
        logger.error(`Python process timed out after ${timeoutMs}ms. Terminating process tree...`);
        if (child.pid) {
          killProcessTree(child.pid);
        } else {
          child.kill('SIGKILL');
        }
      }, timeoutMs);
    }

    if (child.stdout) {
      child.stdout.on('data', (chunk: Buffer) => {
        stdoutData += chunk.toString('utf-8');
      });
    }

    if (child.stderr) {
      child.stderr.on('data', (chunk: Buffer) => {
        stderrData += chunk.toString('utf-8');
      });
    }

    child.on('error', (err: Error) => {
      if (timer) clearTimeout(timer);
      const durationMs = Date.now() - startTime;
      logger.error(`Python spawn error: ${err.message}`);
      resolve({
        success: false,
        stdout: stdoutData,
        stderr: stderrData + `\nSpawn error: ${err.message}`,
        exitCode: -1,
        durationMs,
        error: `Failed to spawn Python process: ${err.message}`,
      });
    });

    child.on('close', (code: number | null) => {
      if (timer) clearTimeout(timer);
      const durationMs = Date.now() - startTime;
      const exitCode = code ?? 0;

      if (timedOut) {
        return resolve({
          success: false,
          stdout: stdoutData,
          stderr: stderrData + `\nError: Execution timed out after ${timeoutMs}ms`,
          exitCode: -1,
          durationMs,
          error: `Python execution timed out after ${timeoutMs}ms`,
        });
      }

      let parsedData: T | undefined = undefined;
      let parseError: string | undefined = undefined;

      try {
        if (stdoutData.trim()) {
          parsedData = JSON.parse(stdoutData.trim()) as T;
        }
      } catch (err) {
        parseError = `Failed to parse JSON stdout: ${err instanceof Error ? err.message : String(err)}`;
      }

      const isSuccess = exitCode === 0 && !parseError;

      resolve({
        success: isSuccess,
        data: parsedData,
        stdout: stdoutData,
        stderr: stderrData,
        exitCode,
        durationMs,
        error: parseError || (exitCode !== 0 ? stderrData || `Exited with code ${exitCode}` : undefined),
      });
    });
  });
}
