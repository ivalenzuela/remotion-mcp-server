---
name: remotion-mcp-server
description: Model Context Protocol (MCP) Server for Remotion video production. Details all 5 registered MCP tools, parameters, output types, error codes, and build commands.
---

# Remotion MCP Server Function Reference

This document provides the complete reference for all Model Context Protocol (MCP) tools registered by the **Remotion MCP Server**.

---

## 1. Registered MCP Tools

### 1. `remotion_scaffold_project`
Scaffolds a complete Remotion video project directory with TypeScript compositions, React components, aspect ratio templates, and npm dependencies.

- **Inputs**:
  - `projectName` (string, required): Name of the new project directory.
  - `template` (enum: `'tiktok-916' | 'youtube-169' | 'social-11'`, required): Aspect ratio preset.
  - `targetDir` (string, required): Parent directory path where project folder will be created.
- **Output**:
  - `success`: boolean
  - `projectPath`: string
  - `message`: string

### 2. `remotion_generate_tts`
Generates AI voiceovers using Google Gemini TTS (`gemini-3.1-flash-tts-preview`) and outputs character-weighted word timecodes for kinetic captions. Automatically falls back to synthetic WAV generation when offline or missing API key.

- **Inputs**:
  - `text` (string, required): Spoken script text.
  - `outputPath` (string, required): Target WAV audio file path.
  - `voice` (string, optional, default: `'Puck'`): Prebuilt Gemini voice name.
  - `accent` (string, optional): Regional accent description.
  - `fps` (number, optional, default: `30`): Target video frame rate.
  - `timeoutMs` (number, optional, default: `60000`): Timeout limit in ms.
- **Output**:
  - `success`: boolean
  - `audioPath`: string
  - `durationSeconds`: number
  - `totalFrames`: number
  - `fps`: number
  - `isMock`: boolean
  - `wordTimecodes`: `Array<{ word: string, startSeconds: number, endSeconds: number, startFrame: number, endFrame: number, durationInFrames: number }>`

### 3. `remotion_analyze_audio`
Performs Librosa signal analysis on audio files to extract BPM, beat frame timestamps, RMS energy profiles, scene cut recommendations, and aligns SRT subtitles with video frames.

- **Inputs**:
  - `audioPath` (string, required): Input audio file path (WAV, MP3, etc.).
  - `srtPath` (string, optional): Input SRT subtitle file path.
  - `outputPath` (string, optional): Output JSON analysis file path.
  - `fps` (number, optional, default: `30`): Target video frame rate.
  - `minSceneDuration` (number, optional, default: `3.5`): Minimum scene duration in seconds.
  - `timeoutMs` (number, optional, default: `60000`): Timeout limit in ms.
- **Output**:
  - `success`: boolean
  - `bpm`: number
  - `beats`: number[]
  - `beatTimestamps`: number[]
  - `sceneCutFrames`: number[]
  - `energyProfile`: `Array<{ frame: number; timestamp: number; rms: number }>`
  - `srtAlignments`: `Array<{ id: number, fromFrame: number, toFrame: number, durationInFrames: number, text: string }>`

### 4. `remotion_preview_frame`
Renders a single frame image snapshot (PNG, JPEG, WebP) from a Remotion composition for visual preview and AI verification.

- **Inputs**:
  - `projectDir` (string, required): Path to scaffolded Remotion project.
  - `compositionId` (string, required): Remotion composition ID (e.g. `'MainComposition'`).
  - `frame` (number, optional, default: `0`): Frame index to capture.
  - `outputPath` (string, optional): Destination image file path.
  - `imageFormat` (enum: `'png' | 'jpeg' | 'webp'`, optional, default: `'png'`): Image format.
  - `scale` (number, optional, default: `1`): Render scale factor.
  - `props` (object, optional): Dynamic React props passed to the composition.
  - `timeoutMs` (number, optional, default: `45000`): Timeout limit in ms.
- **Output**:
  - `success`: boolean
  - `frameImagePath`: string
  - `frame`: number
  - `compositionId`: string
  - `renderTimeMs`: number

### 5. `remotion_render_video`
Renders a complete MP4 or WebM video file from a Remotion composition.

- **Inputs**:
  - `projectDir` (string, required): Path to scaffolded Remotion project.
  - `compositionId` (string, required): Remotion composition ID (e.g. `'MainComposition'`).
  - `outputPath` (string, optional): Destination video file path.
  - `concurrency` (number | string, optional): Render thread count.
  - `codec` (string, optional, default: `'h264'`): Video codec.
  - `crf` (number, optional): Constant Rate Factor quality setting.
  - `pixelFormat` (string, optional, default: `'yuv420p'`): Pixel format.
  - `audioBitrate` (string, optional): Audio bitrate (e.g. `'320k'`).
  - `gl` (string, optional): OpenGL rendering backend.
  - `props` (object, optional): Dynamic React props passed to composition.
  - `timeoutMs` (number, optional, default: `300000`): Timeout limit in ms.
- **Output**:
  - `success`: boolean
  - `videoPath`: string
  - `compositionId`: string
  - `renderTimeMs`: number
  - `fileSizeBytes`: number

---

## 2. Standard Error Response Contract

All failed tool executions (`success: false`) return standard error JSON payloads containing both `code` and `errorCode`:

```json
{
  "success": false,
  "code": "ERR_COMPOSITION_NOT_FOUND",
  "errorCode": "ERR_COMPOSITION_NOT_FOUND",
  "error": "Composition 'Main' was not found in project."
}
```

### Standard Error Codes:
- `ERR_INVALID_INPUT`: Schema validation error.
- `ERR_PROJECT_NOT_FOUND`: Project directory or package.json missing.
- `ERR_COMPOSITION_NOT_FOUND`: Composition ID not defined in project.
- `ERR_PUPPETEER_CHROMIUM`: Headless Chromium launch failure.
- `ERR_RENDER_TIMEOUT`: Operation timed out.
- `ERR_CLI_EXECUTION`: Remotion CLI command execution failure.
- `ERR_FILE_NOT_FOUND`: Specified file missing from disk.
- `ERR_SCRIPT_NOT_FOUND`: Python script missing.
- `ERR_PYTHON_EXECUTION`: Python execution error.
- `ERR_NPM_INSTALL_FAILED`: Dependency installation failure.
- `ERR_UNKNOWN_TOOL`: Unknown tool name or server error.

---

## 3. Build & Verification Commands

```bash
# Build TypeScript source code to dist/
npm run build

# Execute full end-to-end integration test suite
npm test
```
