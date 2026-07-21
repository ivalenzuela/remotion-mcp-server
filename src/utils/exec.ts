import { spawn, execSync, ChildProcess } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { logger } from './logger.js';

export interface RemotionExecOptions {
  cwd: string;
  args: string[];
  timeoutMs?: number;
  props?: Record<string, unknown>;
  env?: Record<string, string>;
  onProgress?: (progressPercent: number, currentFrame?: number, totalFrames?: number) => void;
}

export interface RemotionExecResult {
  success: boolean;
  stdout: string;
  stderr: string;
  durationMs: number;
  exitCode: number;
}

export function killProcessTree(pid: number): void {
  try {
    if (process.platform === 'win32') {
      execSync(`taskkill /F /T /PID ${pid}`, { stdio: 'ignore' });
    } else {
      process.kill(-pid, 'SIGKILL');
    }
  } catch (err) {
    logger.warn(`Failed to tree-kill process ${pid}: ${err instanceof Error ? err.message : String(err)}`);
  }
}

export async function runRemotionCli(options: RemotionExecOptions): Promise<RemotionExecResult> {
  const startTime = Date.now();
  const timeoutMs = options.timeoutMs ?? 300000;
  let tempPropsPath: string | null = null;

  try {
    const isWindows = process.platform === 'win32';
    const localBinaryName = isWindows ? 'remotion.cmd' : 'remotion';
    const localBinaryPath = path.join(options.cwd, 'node_modules', '.bin', localBinaryName);

    let command: string;
    const cliArgs = [...options.args];

    if (fs.existsSync(localBinaryPath)) {
      command = localBinaryPath;
      if (cliArgs[0] === 'remotion') {
        cliArgs.shift();
      }
    } else {
      command = isWindows ? 'npx.cmd' : 'npx';
      if (cliArgs[0] !== 'remotion') {
        cliArgs.unshift('remotion');
      }
    }

    const finalArgs = cliArgs.map((arg) => {
      if (isWindows && arg.includes(' ') && !arg.startsWith('"') && !arg.includes('="')) {
        if (arg.includes('=')) {
          const eqIdx = arg.indexOf('=');
          const key = arg.slice(0, eqIdx);
          const val = arg.slice(eqIdx + 1);
          if (val.startsWith('"') && val.endsWith('"')) {
            return arg;
          }
          return `${key}="${val}"`;
        }
        return `"${arg}"`;
      }
      return arg;
    });

    if (options.props && Object.keys(options.props).length > 0) {
      const randStr = Math.random().toString(36).substring(2, 8);
      tempPropsPath = path.join(os.tmpdir(), `remotion-props-${Date.now()}-${randStr}.json`);
      fs.writeFileSync(tempPropsPath, JSON.stringify(options.props, null, 2), 'utf-8');
      finalArgs.push(`--props="${tempPropsPath}"`);
    }

    logger.info(`Running CLI command: ${command} ${finalArgs.join(' ')} in ${options.cwd}`);

    return await new Promise<RemotionExecResult>((resolve) => {
      let stdoutData = '';
      let stderrData = '';
      let timedOut = false;
      let timer: NodeJS.Timeout | null = null;

      const child: ChildProcess = spawn(command, finalArgs, {
        cwd: options.cwd,
        shell: isWindows,
        env: {
          ...process.env,
          FORCE_COLOR: '0',
          REMOTION_LOG: 'info',
          ...(options.env || {}),
        },
      });

      if (timeoutMs > 0) {
        timer = setTimeout(() => {
          timedOut = true;
          logger.error(`Process timed out after ${timeoutMs}ms. Terminating process tree...`);
          if (child.pid) {
            killProcessTree(child.pid);
          } else {
            child.kill('SIGKILL');
          }
        }, timeoutMs);
      }

      if (child.stdout) {
        child.stdout.on('data', (chunk: Buffer) => {
          const text = chunk.toString('utf-8');
          stdoutData += text;

          if (options.onProgress) {
            const frameMatch = text.match(/Rendered frame (\d+)\/(\d+)/i);
            if (frameMatch) {
              const current = parseInt(frameMatch[1], 10);
              const total = parseInt(frameMatch[2], 10);
              const pct = Math.round((current / total) * 100);
              options.onProgress(pct, current, total);
            }
          }
        });
      }

      if (child.stderr) {
        child.stderr.on('data', (chunk: Buffer) => {
          const text = chunk.toString('utf-8');
          stderrData += text;
        });
      }

      child.on('error', (err: Error) => {
        if (timer) clearTimeout(timer);
        const durationMs = Date.now() - startTime;
        logger.error(`Child process error: ${err.message}`);
        resolve({
          success: false,
          stdout: stdoutData,
          stderr: stderrData + `\nProcess error: ${err.message}`,
          durationMs,
          exitCode: -1,
        });
      });

      child.on('close', (code: number | null) => {
        if (timer) clearTimeout(timer);
        const durationMs = Date.now() - startTime;
        const exitCode = code ?? 0;
        const success = exitCode === 0 && !timedOut;

        if (timedOut) {
          stderrData += `\nError: Execution timed out after ${timeoutMs}ms`;
        }

        resolve({
          success,
          stdout: stdoutData,
          stderr: stderrData,
          durationMs,
          exitCode,
        });
      });
    });
  } finally {
    if (tempPropsPath && fs.existsSync(tempPropsPath)) {
      try {
        fs.unlinkSync(tempPropsPath);
      } catch (e) {
        logger.warn(`Failed to remove temp props file ${tempPropsPath}: ${e}`);
      }
    }
  }
}
