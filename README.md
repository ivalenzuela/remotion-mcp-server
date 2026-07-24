# Remotion Video Production MCP Server

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![MCP Protocol](https://img.shields.io/badge/MCP-Model%20Context%20Protocol-blue.svg)](https://modelcontextprotocol.io/)

A world-class Model Context Protocol (MCP) server that acts as an intelligent bridge for AI agents to analyze audio beats, synthesize voices with Google Gemini TTS, and programmatically construct and render professional videos using **Remotion (v4.0+)** and **React**.

---

## 🚀 Key Features

* 🎬 **Programmatic Scaffolding**: Create zero-config React/Remotion video projects with built-in aspect ratios: TikTok/Reels (`tiktok-916`), YouTube (`youtube-169`), and Social (`social-11`).
* 🎙️ **Gemini 3.1 Flash TTS integration**: Generate high-fidelity voiced scene dialogues with regional accents, and produce word-level timecodes for kinetic subtitles.
* 🎵 **Librosa Audio Beat Sync**: Analyze background music to extract BPM, beat boundaries, RMS energy drops/rises, and recommend frame-accurate scene cuts.
* 📸 **Visual Preview Snapshots**: Instantly render frame snapshots (PNG/JPEG/WebP) at any frame index for AI visual verification.
* ⚡ **Headless Rendering**: Programmatically compile high-quality MP4/WebM videos with multi-core concurrency control and progress tracking.

---

## 🛠️ Prerequisites

To run this MCP server and render videos, the host environment requires:

1. **Node.js** (v18.0.0 or higher) and **npm**.
2. **Python 3** (v3.10+ recommended) with the following packages installed:
   ```bash
   pip install librosa numpy scipy google-genai
   ```
3. **Remotion Browser Dependencies**: Launching Chrome headless requires Chromium. Install it via CLI:
   ```bash
   npx remotion browser ensure
   ```

---

## 📦 Instant One-Command Setup (Recommended)

Copy and paste a single command into your terminal. **If Git, Node.js, npm, or Python are missing, the script will automatically install them for you!**

### 🍎 macOS / Linux (Terminal)
```bash
curl -fsSL https://raw.githubusercontent.com/ivalenzuela/remotion-mcp-server/main/autoinstall.sh | bash
```

### 🪟 Windows (PowerShell)
```powershell
iwr -useb https://raw.githubusercontent.com/ivalenzuela/remotion-mcp-server/main/autoinstall.ps1 | iex
```

> **Zero Manual Intervention**: The script automatically detects missing prerequisites (Git, Node.js, npm, Python 3) and installs them via Homebrew / Winget / Chocolatey. It then scans all Antigravity (`.gemini/`, `.antigravity-ide/`, `.antigravity/`), Claude Desktop, and system paths, installs Python audio dependencies, ensures Chromium is ready, and links the SKILL and MCP server seamlessly.

---

### 🛠️ Manual Installation (Alternative)

1. **Compile the Server**:
   ```bash
   git clone https://github.com/ivalenzuela/remotion-mcp-server.git
   cd remotion-mcp-server
   node install.js
   ```

### 2. Register with your AI Client
Add the server configuration to your MCP settings file (e.g. `claude_desktop_config.json`, `antigravity.json`, or `.mcp.json`):

```json
{
  "mcpServers": {
    "remotion": {
      "command": "node",
      "args": ["/path/to/remotion-mcp-server/dist/index.js"],
      "env": {
        "GEMINI_API_KEY": "YOUR_GEMINI_API_KEY_HERE"
      }
    }
  }
}
```

---

## 🤖 Available MCP Tools

### 1. `remotion_scaffold_project`
Scaffolds a complete React/Remotion project with prebuilt templates, standard layout components, and automatically installs npm dependencies.
* **Arguments**:
  * `projectName` (string, required): Folder name of the target project.
  * `template` (enum: `tiktok-916`, `youtube-169`, `social-11`, required): Aspect ratio.
  * `targetDir` (string, required): Parent directory path.

### 2. `remotion_analyze_audio`
Performs signal processing on audio files using Python Librosa to return BPM, beat frames, energy profiles, recommended scene cut frame numbers, and aligns SRT subtitles.
* **Arguments**:
  * `audioPath` (string, required): Path to input audio track.
  * `srtPath` (string, optional): Path to SRT subtitles file.
  * `outputPath` (string, optional): Path to save the output JSON analysis.
  * `fps` (number, default `30`): Target composition frame rate.
  * `minSceneDuration` (number, default `3.5`): Minimum seconds between scene cuts.

### 3. `remotion_generate_tts`
Synthesizes speech using Google Gemini 3.1 Flash TTS (`gemini-3.1-flash-tts-preview`) and outputs character-weighted word timecodes. Automatically falls back to clean synthetic audio if `GEMINI_API_KEY` is not present.
* **Arguments**:
  * `text` (string, required): Dialogue text to synthesize.
  * `outputPath` (string, required): Path to save generated `.wav` file.
  * `voice` (string, default `"Puck"`): Gemini prebuilt voice name.
  * `accent` (string, optional): Optional regional accent instruction.
  * `fps` (number, default `30`): Frame rate.

### 4. `remotion_preview_frame`
Renders a still snapshot image (PNG/JPEG/WebP) of a specific frame in the composition using Remotion's CLI.
* **Arguments**:
  * `projectDir` (string, required): Path to Remotion project.
  * `compositionId` (string, required): Target Composition ID.
  * `frame` (number, default `0`): Frame index to capture.
  * `imageFormat` (enum: `png`, `jpeg`, `webp`, default `png`): Format.
  * `props` (object, optional): Input React props.

### 5. `remotion_render_video`
Compiles a composition into a production-grade video (MP4/WebM).
* **Arguments**:
  * `projectDir` (string, required): Path to Remotion project.
  * `compositionId` (string, required): Target Composition ID.
  * `outputPath` (string, optional): Output video path.
  * `concurrency` (number/string, default `"auto"`): CPU threads to utilize.
  * `codec` (string, default `"h264"`): Target codec.
  * `props` (object, optional): Input React props.

---

## 🎨 Prebuilt React Components

Scaffolded projects include these production-ready layout components:
1. **`SubtitleOverlay`**: Word-by-word active scaling and custom text shadow glows ("Efecto Lupa PRO") for dual-language subtitles.
2. **`KenBurnsImage`**: Clean interpolation-based image scaling and translation without CSS animations.
3. **`AudioSpectrum`**: Sound frequency spectrum visualizer bars reactively synchronized with the soundtrack.
4. **`LowerThird`**: Elegant lower-third pop-ups for social media profiles or name cards.

---

## 🧪 Testing & Verification

Run the full E2E test suite to verify tool execution, path resolution, and CLI rendering:
```bash
npm test
```

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
