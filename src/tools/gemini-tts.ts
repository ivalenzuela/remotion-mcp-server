import * as fs from 'node:fs';
import * as path from 'node:path';
import { z } from 'zod';
import { logger } from '../utils/logger.js';
import { runPythonScript } from '../utils/python.js';

/**
 * Zod validation schema for remotion_generate_tts tool arguments
 */
export const GenerateTtsSchema = z.object({
  text: z.string().min(1, 'text is required'),
  outputPath: z.string().min(1, 'outputPath is required'),
  voice: z.string().optional().default('Puck'),
  accent: z.string().optional(),
  fps: z.number().positive().optional().default(30),
  timeoutMs: z.number().positive().optional().default(60000),
});

export type GenerateTtsInput = z.infer<typeof GenerateTtsSchema>;

/**
 * Structure of each word timecode element for kinetic captions
 */
export interface WordTimecode {
  word: string;
  startSeconds: number;
  endSeconds: number;
  startFrame: number;
  endFrame: number;
  durationInFrames: number;
}

/**
 * Result object returned by handleGenerateTts
 */
export interface GenerateTtsResult {
  success: boolean;
  audioPath?: string;
  durationSeconds?: number;
  totalFrames?: number;
  fps?: number;
  voice?: string;
  accent?: string;
  isMock?: boolean;
  wordTimecodes?: WordTimecode[];
  error?: string;
  code?: string;
  errorCode?: string;
  details?: string;
}

/**
 * MCP tool definition for remotion_generate_tts
 */
export const GEMINI_TTS_TOOLS = [
  {
    name: 'remotion_generate_tts',
    description:
      'Generate natural AI voiceover audio and word-level frame alignment timecodes using Google Gemini 3.1 Flash TTS (gemini-3.1-flash-tts-preview). Produces audio WAV file, duration, total frames, and character-weighted word timecodes for Remotion kinetic captions.',
    inputSchema: {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          description: 'Transcript text to synthesize into spoken audio voiceover',
        },
        outputPath: {
          type: 'string',
          description: 'Output file path for generated audio (e.g. public/audio/voiceover.wav)',
        },
        voice: {
          type: 'string',
          description: 'Optional prebuilt Gemini voice name (default: Puck)',
        },
        accent: {
          type: 'string',
          description: 'Optional regional accent description (e.g. Spanish (Spain), British English)',
        },
        fps: {
          type: 'number',
          description: 'Target video frame rate for frame alignment calculation (default: 30)',
        },
        timeoutMs: {
          type: 'number',
          description: 'Execution timeout limit in milliseconds (default: 60000)',
        },
      },
      required: ['text', 'outputPath'],
    },
  },
];

/**
 * Handler function for executing remotion_generate_tts
 */
export async function handleGenerateTts(input: GenerateTtsInput): Promise<GenerateTtsResult> {
  const parseResult = GenerateTtsSchema.safeParse(input);

  if (!parseResult.success) {
    return {
      success: false,
      code: 'ERR_INVALID_INPUT',
      errorCode: 'ERR_INVALID_INPUT',
      error: `Invalid generate_tts input: ${parseResult.error.issues
        .map((e: any) => `${e.path.join('.')}: ${e.message}`)
        .join('; ')}`,
    };
  }

  const { text, outputPath, voice = 'Puck', accent, fps = 30, timeoutMs = 60000 } = parseResult.data;

  const resolvedOutputPath = path.resolve(outputPath);
  const outputDir = path.dirname(resolvedOutputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const scriptPath = path.resolve(process.cwd(), 'scripts', 'generate_gemini_tts.py');
  if (!fs.existsSync(scriptPath)) {
    return {
      success: false,
      code: 'ERR_SCRIPT_NOT_FOUND',
      errorCode: 'ERR_SCRIPT_NOT_FOUND',
      error: `Python TTS script not found: ${scriptPath}`,
    };
  }

  const args: string[] = [
    '--text',
    text,
    '--output',
    resolvedOutputPath,
    '--fps',
    String(fps),
  ];

  if (voice && voice.trim().length > 0) {
    args.push('--voice', voice.trim());
  }

  if (accent && accent.trim().length > 0) {
    args.push('--accent', accent.trim());
  }

  logger.info(`Invoking generate_gemini_tts.py for text length ${text.length}...`);

  const pyResult = await runPythonScript<GenerateTtsResult>({
    scriptPath,
    args,
    timeoutMs,
  });

  if (!pyResult.success || !pyResult.data) {
    return {
      success: false,
      code: 'ERR_PYTHON_EXECUTION',
      errorCode: 'ERR_PYTHON_EXECUTION',
      error: pyResult.error || pyResult.stderr || 'TTS generation failed.',
      details: pyResult.stderr,
    };
  }

  return pyResult.data;
}
