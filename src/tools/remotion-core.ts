import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';
import { z } from 'zod';
import { logger } from '../utils/logger.js';
import { runRemotionCli } from '../utils/exec.js';
import { writeScaffoldProjectFiles, TemplateType } from './templates.js';

export const ScaffoldProjectSchema = z.object({
  projectName: z.string().min(1),
  template: z.enum(['tiktok-916', 'youtube-169', 'social-11']),
  targetDir: z.string().min(1),
});

export const PreviewFrameSchema = z.object({
  projectDir: z.string().min(1),
  compositionId: z.string().min(1),
  frame: z.number().min(0).optional().default(0),
  outputPath: z.string().optional(),
  imageFormat: z.enum(['png', 'jpeg', 'webp']).optional().default('png'),
  scale: z.number().positive().optional().default(1),
  props: z.record(z.unknown()).optional(),
  timeoutMs: z.number().positive().optional().default(180000),
});

export const RenderVideoSchema = z.object({
  projectDir: z.string().min(1),
  compositionId: z.string().min(1),
  outputPath: z.string().optional(),
  concurrency: z.union([z.number(), z.string()]).optional(),
  codec: z.string().optional().default('h264'),
  crf: z.number().optional(),
  pixelFormat: z.string().optional().default('yuv420p'),
  audioBitrate: z.string().optional(),
  gl: z.string().optional(),
  props: z.record(z.unknown()).optional(),
  timeoutMs: z.number().positive().optional().default(300000),
});

export type ScaffoldProjectInput = z.infer<typeof ScaffoldProjectSchema>;
export type PreviewFrameInput = z.infer<typeof PreviewFrameSchema>;
export type RenderVideoInput = z.infer<typeof RenderVideoSchema>;

export const REMOTION_CORE_TOOLS = [
  {
    name: 'remotion_scaffold_project',
    description: 'Scaffold a complete Remotion video project with pre-configured React compositions, aspect ratio presets, and installed dependencies.',
    inputSchema: {
      type: 'object',
      properties: {
        projectName: { type: 'string', description: 'Name of the project folder' },
        template: {
          type: 'string',
          enum: ['tiktok-916', 'youtube-169', 'social-11'],
          description: 'Composition aspect ratio template (tiktok-916: 1080x1920, youtube-169: 1920x1080, social-11: 1080x1080)'
        },
        targetDir: { type: 'string', description: 'Target parent directory path where project folder will be created' }
      },
      required: ['projectName', 'template', 'targetDir']
    }
  },
  {
    name: 'remotion_preview_frame',
    description: 'Render a single frame snapshot image (PNG/JPEG/WebP) from a Remotion composition for visual preview.',
    inputSchema: {
      type: 'object',
      properties: {
        projectDir: { type: 'string', description: 'Absolute path to Remotion project directory' },
        compositionId: { type: 'string', description: 'Remotion composition ID (e.g. MainComposition)' },
        frame: { type: 'number', description: 'Frame index to snapshot (default: 0)', minimum: 0 },
        outputPath: { type: 'string', description: 'Optional path to save frame snapshot image' },
        imageFormat: { type: 'string', enum: ['png', 'jpeg', 'webp'], description: 'Image format (default: png)' },
        scale: { type: 'number', description: 'Image render scale factor (default: 1)' },
        props: { type: 'object', description: 'Optional input props object passed to composition' },
        timeoutMs: { type: 'number', description: 'Timeout limit in milliseconds (default: 180000)' }
      },
      required: ['projectDir', 'compositionId']
    }
  },
  {
    name: 'remotion_render_video',
    description: 'Programmatically render a full video (MP4/WebM) from a Remotion composition.',
    inputSchema: {
      type: 'object',
      properties: {
        projectDir: { type: 'string', description: 'Absolute path to Remotion project directory' },
        compositionId: { type: 'string', description: 'Remotion composition ID (e.g. MainComposition)' },
        outputPath: { type: 'string', description: 'Optional path to save rendered video output' },
        concurrency: { oneOf: [{ type: 'number' }, { type: 'string' }], description: 'Number of CPU render threads or percentage' },
        codec: { type: 'string', description: 'Video codec (default: h264)' },
        crf: { type: 'number', description: 'Constant Rate Factor quality parameter (e.g. 18 for high, 23 for standard)' },
        pixelFormat: { type: 'string', description: 'Pixel format (default: yuv420p)' },
        audioBitrate: { type: 'string', description: 'Audio bitrate (e.g. 320k)' },
        gl: { type: 'string', description: 'OpenGL rendering backend (angle, egl, swiftshader, swangle, vulkan, opengl)' },
        props: { type: 'object', description: 'Optional dynamic props object passed to composition' },
        timeoutMs: { type: 'number', description: 'Timeout limit in milliseconds (default: 300000)' }
      },
      required: ['projectDir', 'compositionId']
    }
  }
];

export async function handleScaffoldProject(input: ScaffoldProjectInput) {
  const parseResult = ScaffoldProjectSchema.safeParse(input);
  if (!parseResult.success) {
    return {
      success: false,
      code: 'ERR_INVALID_INPUT',
      errorCode: 'ERR_INVALID_INPUT',
      error: `Invalid scaffold parameters: ${parseResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ')}`,
    };
  }
  const { projectName, template, targetDir } = parseResult.data;
  const projectPath = path.resolve(targetDir, projectName);

  logger.info(`Scaffolding Remotion project "${projectName}" with template "${template}" at ${projectPath}`);

  if (!fs.existsSync(projectPath)) {
    fs.mkdirSync(projectPath, { recursive: true });
  }

  // Generate all complete runnable Remotion template files
  writeScaffoldProjectFiles(projectPath, template as TemplateType, projectName);

  logger.info(`Running npm install in ${projectPath}...`);
  const runNpmInstall = (): { success: boolean; error?: string } => {
    try {
      execSync('npm install --no-audit --no-fund', {
        cwd: projectPath,
        stdio: 'pipe',
        env: { ...process.env, FORCE_COLOR: '0' },
      });
      return { success: true };
    } catch (err: any) {
      return {
        success: false,
        error: err.stderr?.toString() || err.stdout?.toString() || err.message,
      };
    }
  };

  let installResult = runNpmInstall();
  if (!installResult.success && process.platform === 'win32') {
    logger.warn(`npm install initial attempt failed on Windows, retrying after 1000ms... Error: ${installResult.error}`);
    execSync('node -e "new Promise(r => setTimeout(r, 1000))"');
    installResult = runNpmInstall();
  }

  if (!installResult.success) {
    logger.error(`npm install failed in ${projectPath}: ${installResult.error}`);
    return {
      success: false,
      code: 'ERR_NPM_INSTALL_FAILED',
      errorCode: 'ERR_NPM_INSTALL_FAILED',
      error: `Failed to install dependencies: ${installResult.error}`,
      projectPath,
    };
  }

  logger.info(`Successfully scaffolded Remotion project at ${projectPath}`);
  return {
    success: true,
    projectPath,
    message: `Project scaffolded successfully with template ${template}.`,
  };
}

export async function handlePreviewFrame(input: PreviewFrameInput) {
  const parseResult = PreviewFrameSchema.safeParse(input);
  if (!parseResult.success) {
    return {
      success: false,
      code: 'ERR_INVALID_INPUT',
      errorCode: 'ERR_INVALID_INPUT',
      error: `Invalid preview parameters: ${parseResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ')}`,
    };
  }
  const {
    projectDir,
    compositionId,
    frame = 0,
    outputPath: customOutputPath,
    imageFormat = 'png',
    scale = 1,
    props,
    timeoutMs = 180000,
  } = parseResult.data;

  const resolvedDir = path.resolve(projectDir);
  if (!fs.existsSync(resolvedDir) || !fs.existsSync(path.join(resolvedDir, 'package.json'))) {
    return {
      success: false,
      code: 'ERR_PROJECT_NOT_FOUND',
      errorCode: 'ERR_PROJECT_NOT_FOUND',
      error: `Project directory does not exist or missing package.json: ${resolvedDir}`,
    };
  }

  let entryPoint = 'src/index.ts';
  if (!fs.existsSync(path.join(resolvedDir, entryPoint))) {
    if (fs.existsSync(path.join(resolvedDir, 'src/index.tsx'))) {
      entryPoint = 'src/index.tsx';
    } else if (fs.existsSync(path.join(resolvedDir, 'src/Root.tsx'))) {
      entryPoint = 'src/Root.tsx';
    }
  }

  const outputPath = customOutputPath
    ? path.resolve(customOutputPath)
    : path.resolve(resolvedDir, 'out', `preview_${compositionId}_f${frame}.${imageFormat}`);

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  const args = [
    'remotion',
    'still',
    entryPoint,
    compositionId,
    outputPath,
    `--frame=${frame}`,
    `--image-format=${imageFormat}`,
    `--scale=${scale}`,
    '--log=info',
  ];

  const result = await runRemotionCli({
    cwd: resolvedDir,
    args,
    props,
    timeoutMs,
  });

  if (!result.success || !fs.existsSync(outputPath) || fs.statSync(outputPath).size === 0) {
    let errorCode = 'ERR_CLI_EXECUTION';
    let errorMessage = result.stderr || result.stdout || 'Failed to render frame snapshot.';

    if (/Could not find composition with ID/i.test(result.stderr) || /Could not find composition with ID/i.test(result.stdout)) {
      errorCode = 'ERR_COMPOSITION_NOT_FOUND';
      errorMessage = `Composition '${compositionId}' not found in ${entryPoint}.`;
    } else if (result.stderr.includes('Could not launch Chromium') || result.stderr.includes('Target closed')) {
      errorCode = 'ERR_PUPPETEER_CHROMIUM';
      errorMessage = 'Headless browser launch failed. Run npx remotion browser ensure to install Chromium.';
    } else if (result.stderr.includes('timed out')) {
      errorCode = 'ERR_RENDER_TIMEOUT';
      errorMessage = `Frame preview timed out after ${timeoutMs}ms.`;
    }

    return {
      success: false,
      code: errorCode,
      errorCode: errorCode,
      error: errorMessage,
      details: result.stderr,
    };
  }

  return {
    success: true,
    frameImagePath: outputPath,
    frame,
    compositionId,
    renderTimeMs: result.durationMs,
  };
}

export async function handleRenderVideo(input: RenderVideoInput) {
  const parseResult = RenderVideoSchema.safeParse(input);
  if (!parseResult.success) {
    return {
      success: false,
      code: 'ERR_INVALID_INPUT',
      errorCode: 'ERR_INVALID_INPUT',
      error: `Invalid render parameters: ${parseResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ')}`,
    };
  }
  const {
    projectDir,
    compositionId,
    outputPath: customOutputPath,
    concurrency,
    codec = 'h264',
    crf,
    pixelFormat = 'yuv420p',
    audioBitrate,
    gl,
    props,
    timeoutMs = 300000,
  } = parseResult.data;

  const resolvedDir = path.resolve(projectDir);
  if (!fs.existsSync(resolvedDir) || !fs.existsSync(path.join(resolvedDir, 'package.json'))) {
    return {
      success: false,
      code: 'ERR_PROJECT_NOT_FOUND',
      errorCode: 'ERR_PROJECT_NOT_FOUND',
      error: `Project directory does not exist or missing package.json: ${resolvedDir}`,
    };
  }

  let entryPoint = 'src/index.ts';
  if (!fs.existsSync(path.join(resolvedDir, entryPoint))) {
    if (fs.existsSync(path.join(resolvedDir, 'src/index.tsx'))) {
      entryPoint = 'src/index.tsx';
    } else if (fs.existsSync(path.join(resolvedDir, 'src/Root.tsx'))) {
      entryPoint = 'src/Root.tsx';
    }
  }

  const outputPath = customOutputPath
    ? path.resolve(customOutputPath)
    : path.resolve(resolvedDir, 'out', `${compositionId}.mp4`);

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  const args = [
    'remotion',
    'render',
    entryPoint,
    compositionId,
    outputPath,
    `--codec=${codec}`,
    `--pixel-format=${pixelFormat}`,
    '--log=info',
  ];

  if (concurrency !== undefined) {
    args.push(`--concurrency=${concurrency}`);
  }
  if (crf !== undefined) {
    args.push(`--crf=${crf}`);
  }
  if (audioBitrate) {
    args.push(`--audio-bitrate=${audioBitrate}`);
  }
  if (gl) {
    args.push(`--gl=${gl}`);
  }

  const result = await runRemotionCli({
    cwd: resolvedDir,
    args,
    props,
    timeoutMs,
    onProgress: (pct, current, total) => {
      logger.info(`Rendering ${compositionId}: ${pct}% (${current}/${total} frames)`);
    },
  });

  if (!result.success || !fs.existsSync(outputPath) || fs.statSync(outputPath).size === 0) {
    let errorCode = 'ERR_CLI_EXECUTION';
    let errorMessage = result.stderr || result.stdout || 'Failed to render video.';

    if (/Could not find composition with ID/i.test(result.stderr) || /Could not find composition with ID/i.test(result.stdout)) {
      errorCode = 'ERR_COMPOSITION_NOT_FOUND';
      errorMessage = `Composition '${compositionId}' not found in ${entryPoint}.`;
    } else if (result.stderr.includes('Could not launch Chromium') || result.stderr.includes('Target closed')) {
      errorCode = 'ERR_PUPPETEER_CHROMIUM';
      errorMessage = 'Headless browser launch failed. Run npx remotion browser ensure to install Chromium.';
    } else if (result.stderr.includes('timed out')) {
      errorCode = 'ERR_RENDER_TIMEOUT';
      errorMessage = `Video rendering timed out after ${timeoutMs}ms.`;
    }

    return {
      success: false,
      code: errorCode,
      errorCode: errorCode,
      error: errorMessage,
      details: result.stderr,
    };
  }

  const fileSizeBytes = fs.statSync(outputPath).size;

  return {
    success: true,
    videoPath: outputPath,
    compositionId,
    renderTimeMs: result.durationMs,
    fileSizeBytes,
  };
}
