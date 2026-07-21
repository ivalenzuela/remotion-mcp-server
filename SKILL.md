---
name: remotion-mcp-server
description: Project skill and tool reference for the Remotion MCP Server project, detailing transport setup, all 5 registered MCP tools, parameters, error contracts, build scripts, and test verification.
---

# Remotion MCP Server — Project & Tool Reference

This document provides complete operational guides, tool specifications, parameter schemas, and error contracts for the **Remotion MCP Server**.

---

## 1. Project Overview & Transport

The Remotion MCP Server enables AI agents to programmatically scaffold, preview, render, analyze, and synthesize Remotion videos via the Model Context Protocol (MCP).

- **Transport**: `StdioServerTransport` (Standard Input / Output stream JSON-RPC).
- **Entry Point**: `dist/index.js`
- **Build Command**: `npm run build` (uses `tsup` to bundle TypeScript into ES modules and TypeScript declarations).
- **Test Command**: `npm test` (executes `node test-e2e-all.js`).

---

## 2. The 5 Registered MCP Tools

### 1. `remotion_scaffold_project`
Scaffolds a complete Remotion project directory with TypeScript compositions, React components, aspect ratio templates, and dependencies.

- **Inputs**:
  - `projectName` (string, required): Name of the new project directory.
  - `template` (enum: `'tiktok-916' | 'youtube-169' | 'social-11'`, required): Aspect ratio preset.
  - `targetDir` (string, required): Directory where project folder will be created.
- **Output**:
  - `success`: boolean
  - `projectPath`: string
  - `message`: string

### 2. `remotion_generate_tts`
Generates natural AI voiceovers using Google Gemini 3.1 Flash TTS (`gemini-3.1-flash-tts-preview`) and outputs character-weighted word timecodes for kinetic captions. Automatically falls back to synthetic WAV generation when offline or missing API keys.

- **Inputs**:
  - `text` (string, required): Spoken script text.
  - `outputPath` (string, required): Destination WAV audio file path.
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
Performs Librosa audio beat/tempo detection, RMS energy profiling, scene cut frame calculation, and aligns SRT subtitle blocks with video frames.

- **Inputs**:
  - `audioPath` (string, required): Input audio file path (WAV, MP3, etc.).
  - `srtPath` (string, optional): Input SRT subtitle file path.
  - `outputPath` (string, optional): Output JSON analysis file path.
  - `fps` (number, optional, default: `30`): Target video frame rate.
  - `minSceneDuration` (number, optional, default: `3.5`): Min scene duration in seconds.
  - `timeoutMs` (number, optional, default: `60000`): Timeout in ms.
- **Output**:
  - `success`: boolean
  - `bpm`: number
  - `beats`: number[]
  - `beatTimestamps`: number[]
  - `sceneCutFrames`: number[]
  - `energyProfile`: `Array<{ frame: number; timestamp: number; rms: number }>`
  - `srtAlignments`: `Array<{ id: number, fromFrame: number, toFrame: number, durationInFrames: number, text: string }>`

### 4. `remotion_preview_frame`
Renders a snapshot image (PNG, JPEG, WebP) from a Remotion composition.

- **Inputs**:
  - `projectDir` (string, required): Path to scaffolded Remotion project.
  - `compositionId` (string, required): Remotion composition ID (e.g. `'MainComposition'`).
  - `frame` (number, optional, default: `0`): Frame index to capture.
  - `outputPath` (string, optional): Output frame image path.
  - `imageFormat` (enum: `'png' | 'jpeg' | 'webp'`, optional, default: `'png'`): Image format.
  - `scale` (number, optional, default: `1`): Render scale factor.
  - `props` (object, optional): Input props passed to composition.
  - `timeoutMs` (number, optional, default: `45000`): Render timeout in ms.
- **Output**:
  - `success`: boolean
  - `frameImagePath`: string
  - `frame`: number
  - `compositionId`: string
  - `renderTimeMs`: number

### 5. `remotion_render_video`
Renders a full video (MP4/WebM) from a Remotion composition.

- **Inputs**:
  - `projectDir` (string, required): Path to scaffolded Remotion project.
  - `compositionId` (string, required): Remotion composition ID (e.g. `'MainComposition'`).
  - `outputPath` (string, optional): Output video file path.
  - `concurrency` (number | string, optional): Render thread count.
  - `codec` (string, optional, default: `'h264'`): Video codec.
  - `crf` (number, optional): Constant Rate Factor.
  - `pixelFormat` (string, optional, default: `'yuv420p'`): Pixel format.
  - `audioBitrate` (string, optional): Audio bitrate (e.g. `'320k'`).
  - `gl` (string, optional): OpenGL backend.
  - `props` (object, optional): Dynamic props passed to composition.
  - `timeoutMs` (number, optional, default: `300000`): Timeout limit in ms.
- **Output**:
  - `success`: boolean
  - `videoPath`: string
  - `compositionId`: string
  - `renderTimeMs`: number
  - `fileSizeBytes`: number

---

## 3. Standard Error Codes & Response Contracts

All tool error responses (`success: false`) return BOTH `code` AND `errorCode` properties alongside human-readable `error` messages:
`{ success: false, code: "ERR_...", errorCode: "ERR_...", error: "..." }`

Standard error codes:
- `ERR_INVALID_INPUT`: Schema validation error.
- `ERR_PROJECT_NOT_FOUND`: Directory or package.json missing.
- `ERR_COMPOSITION_NOT_FOUND`: Composition ID not defined in project.
- `ERR_PUPPETEER_CHROMIUM`: Chromium failed to launch (run `npx remotion browser ensure`).
- `ERR_RENDER_TIMEOUT`: Timeout exceeded.
- `ERR_CLI_EXECUTION`: Remotion CLI command error.
- `ERR_FILE_NOT_FOUND`: File not found on disk.
- `ERR_SCRIPT_NOT_FOUND`: Python script missing.
- `ERR_PYTHON_EXECUTION`: Python execution failure.
- `ERR_NPM_INSTALL_FAILED`: Dependency installation failure during project scaffolding.
- `ERR_UNKNOWN_TOOL`: Unknown tool name or top-level server error.

---

## 4. Build & Verification Commands

```bash
# Build TypeScript source to dist/
npm run build

# Run full end-to-end integration test suite
npm test
```
