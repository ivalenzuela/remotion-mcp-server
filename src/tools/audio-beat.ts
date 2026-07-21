import * as fs from 'node:fs';
import * as path from 'node:path';
import { z } from 'zod';
import { logger } from '../utils/logger.js';
import { runPythonScript } from '../utils/python.js';

export const AnalyzeAudioSchema = z.object({
  audioPath: z.string().min(1, 'audioPath is required'),
  srtPath: z.string().optional(),
  outputPath: z.string().optional(),
  fps: z.number().positive().optional().default(30),
  minSceneDuration: z.number().positive().optional().default(3.5),
  timeoutMs: z.number().positive().optional().default(60000),
});

export type AnalyzeAudioInput = z.infer<typeof AnalyzeAudioSchema>;

export interface AudioAnalysisResult {
  success: boolean;
  audioPath?: string;
  durationSeconds?: number;
  totalFrames?: number;
  fps?: number;
  bpm?: number;
  beats?: number[];
  beatTimestamps?: number[];
  sceneCutFrames?: number[];
  energyProfile?: Array<{ frame: number; timestamp: number; rms: number }>;
  srtAlignments?: Array<{
    id: number;
    startTime: string;
    endTime: string;
    startSeconds: number;
    endSeconds: number;
    fromFrame: number;
    toFrame: number;
    durationInFrames: number;
    text: string;
  }>;
  outputPath?: string;
  error?: string;
  code?: string;
  errorCode?: string;
  details?: string;
}

export const AUDIO_BEAT_TOOLS = [
  {
    name: 'remotion_analyze_audio',
    description:
      'Analyze audio files using Librosa to extract BPM, beat frame indices, energy drops, scene cut boundaries, and align SRT subtitles with Remotion video frames.',
    inputSchema: {
      type: 'object',
      properties: {
        audioPath: {
          type: 'string',
          description: 'Absolute or relative path to the soundtrack audio file (MP3/WAV)',
        },
        srtPath: {
          type: 'string',
          description: 'Optional path to SRT subtitle file for timecode alignment',
        },
        outputPath: {
          type: 'string',
          description: 'Optional path to save analyzed JSON result',
        },
        fps: {
          type: 'number',
          description: 'Target video frame rate (default: 30)',
        },
        minSceneDuration: {
          type: 'number',
          description: 'Minimum scene duration in seconds between automatic cuts (default: 3.5)',
        },
        timeoutMs: {
          type: 'number',
          description: 'Execution timeout in milliseconds (default: 60000)',
        },
      },
      required: ['audioPath'],
    },
  },
];

export async function handleAnalyzeAudio(input: AnalyzeAudioInput): Promise<AudioAnalysisResult> {
  const parseResult = AnalyzeAudioSchema.safeParse(input);

  if (!parseResult.success) {
    return {
      success: false,
      code: 'ERR_INVALID_INPUT',
      errorCode: 'ERR_INVALID_INPUT',
      error: `Invalid analyze_audio input: ${parseResult.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ')}`,
    };
  }

  const { audioPath, srtPath, outputPath, fps = 30, minSceneDuration = 3.5, timeoutMs = 60000 } = parseResult.data;

  const resolvedAudio = path.resolve(audioPath);
  if (!fs.existsSync(resolvedAudio)) {
    return {
      success: false,
      code: 'ERR_FILE_NOT_FOUND',
      errorCode: 'ERR_FILE_NOT_FOUND',
      error: `Audio file does not exist: ${resolvedAudio}`,
    };
  }

  let resolvedSrt: string | undefined = undefined;
  if (srtPath) {
    resolvedSrt = path.resolve(srtPath);
    if (!fs.existsSync(resolvedSrt)) {
      return {
        success: false,
        code: 'ERR_FILE_NOT_FOUND',
        errorCode: 'ERR_FILE_NOT_FOUND',
        error: `SRT file specified but not found: ${resolvedSrt}`,
      };
    }
  }

  const scriptPath = path.resolve(process.cwd(), 'scripts', 'audio_beat_analyzer.py');

  const args: string[] = ['--audio', resolvedAudio, '--fps', String(fps), '--min-scene-duration', String(minSceneDuration)];

  if (resolvedSrt) {
    args.push('--srt', resolvedSrt);
  }

  if (outputPath) {
    const resolvedOutput = path.resolve(outputPath);
    args.push('--output', resolvedOutput);
  }

  logger.info(`Invoking audio_beat_analyzer.py for ${resolvedAudio}...`);

  const pyResult = await runPythonScript<AudioAnalysisResult>({
    scriptPath,
    args,
    timeoutMs,
  });

  if (!pyResult.success || !pyResult.data) {
    return {
      success: false,
      code: 'ERR_PYTHON_EXECUTION',
      errorCode: 'ERR_PYTHON_EXECUTION',
      error: pyResult.error || pyResult.stderr || 'Audio analysis failed.',
      details: pyResult.stderr,
    };
  }

  return pyResult.data;
}
