---
name: remotion-mcp-server
description: Project skill and tool reference for the Remotion MCP Server project, detailing transport setup, all 5 registered MCP tools, parameters, error contracts, motion UI/UX design systems, video marketing frameworks, template component specs, and creative mastery reference guide.
---

# Remotion MCP Server & Creative Video Master Reference

This document provides operational guides, tool specifications, design system standards, storytelling frameworks, template component documentation, and reference guide summaries for the **Remotion MCP Server** and creative video production framework.

---

## 1. Project Overview & Transport Architecture

The Remotion MCP Server enables AI agents to programmatically scaffold, preview, render, analyze audio, and synthesize voiceovers for Remotion video compositions via the Model Context Protocol (MCP).

- **Transport Protocol**: `StdioServerTransport` (Standard Input / Output stream JSON-RPC).
- **Entry Point**: `dist/index.js`
- **Build System**: `npm run build` (bundles TypeScript via `tsup` into ES modules and TypeScript declarations).
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

---

## 5. Motion UI/UX Rules & Safe Zone Standards

### 8px Grid Alignment System
All component positioning, layout spacing, paddings, margins, and container bounds must strictly adhere to an **8px grid increment system** (8px, 16px, 24px, 32px, 48px, 64px, 80px, 120px, 200px).
- Container gaps: `gap: 16px` or `gap: 24px`.
- Card padding: `padding: 12px 20px` or `padding: 16px 24px`.
- Border radii: `borderRadius: 8px`, `12px`, or `16px`.

### Safe Zone Margins per Aspect Ratio

| Aspect Ratio | Resolution | Top Safe Margin | Bottom Safe Margin | Left/Right Safe Margin | Platform Target & Rationale |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **9:16 (Vertical)** | 1080 x 1920 | **120px** | **200px** | **40px** | TikTok, IG Reels, YT Shorts. Prevents visual collision with platform native icons (like button, comment button, share icon), audio handles, and captions. |
| **16:9 (Landscape)**| 1920 x 1080 | **5%** (54px) | **10%** (108px) | **5%** / **10%** | YouTube, Desktop video. Adheres to broadcast standards: 5% Title Safe margin and 10% Action Safe margin. |
| **1:1 (Square)** | 1080 x 1080 | **32px** | **32px** | **32px** | Instagram Feed, LinkedIn, Twitter/X. Uniform safe padding around all 4 edges. |

---

## 6. Color Theory & Glassmorphism Design System

### Contrast Standards (WCAG AAA)
Text overlays on top of dynamic, moving video backdrops must achieve **WCAG AAA contrast ratios ($\ge 7:1$)**.
- Place frosted glass cards (`backdrop-filter`) or dark gradient scrims behind body copy.
- Enforce high-contrast text colors (`#ffffff` on dark fills).
- Apply text drop shadows (`text-shadow: 0 2px 8px rgba(0, 0, 0, 0.8)`) when captions hover directly over raw video background elements.

### Glassmorphism Design Tokens

```scss
// 3-Tier Backdrop Blur Hierarchy
$blur-sm: blur(8px);   // Secondary tags, sub-labels, minor overlays
$blur-md: blur(16px);  // Default cards, trust badges, lower thirds
$blur-lg: blur(24px);  // Hero modal dialogs, focal overlays

// Translucent Background Fills
$fill-translucent-light: rgba(255, 255, 255, 0.10);
$fill-translucent-dark:  rgba(15, 23, 42, 0.75);
$fill-translucent-heavy: rgba(15, 23, 42, 0.88);

// Subtle Glass Border Highlight
$border-glass: 1px solid rgba(255, 255, 255, 0.20);
```

### Multi-Stop Gradient Palettes & Glow Shadows

1. **Neon Cyan / Purple (Tech & SaaS)**:
   - Palette: `linear-gradient(135deg, #38bdf8 0%, #818cf8 50%, #c084fc 100%)`
   - Ambient Glow Shadow: `box-shadow: 0 8px 32px rgba(56, 189, 248, 0.37)`
2. **Warm Sunset Orange / Pink (E-commerce & Lifestyle)**:
   - Palette: `linear-gradient(135deg, #f97316 0%, #fb7185 50%, #e11d48 100%)`
   - Ambient Glow Shadow: `box-shadow: 0 8px 32px rgba(249, 115, 22, 0.37)`
3. **Obsidian Dark Mode (Premium Corporate)**:
   - Palette: `linear-gradient(135deg, #1e293b 0%, #0f172a 100%)`
   - Ambient Glow Shadow: `box-shadow: 0 8px 32px rgba(0, 0, 0, 0.45)`

---

## 7. Typography & Kinetic Text Animation Guidelines

### Strategic Font Pairings & Typographic Scale

- **Display Header Fonts**: Montserrat, Inter (Bold/ExtraBold 800-900 weight).
- **Body & Subtitle Fonts**: Inter, System UI, Roboto (Medium/SemiBold 500-600 weight).

| Typographic Scale | Size (px) | Line Height | Letter Spacing | Use Case |
| :--- | :--- | :--- | :--- | :--- |
| **Hero Title** | 64px | 1.1 (70px) | -0.02em (-1.28px) | Hook headlines, 0-3s pattern interrupts |
| **H1** | 48px | 1.15 (55px)| -0.01em (-0.48px) | Major scene section headers |
| **H2** | 36px | 1.2 (43px) | 0.00em (0px) | Callout card titles, feature labels |
| **Body** | 24px | 1.4 (34px) | 0.01em (0.24px) | Subtitles, descriptive copy |
| **Caption** | 18px | 1.3 (23px) | 0.02em (0.36px) | Fine print, metadata, timestamp badges |

### Kinetic Text Animation Guidelines

Kinetic captions drive high viewer retention by revealing words in sync with speech using spring physics:

```tsx
import { spring, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';

// Spring-based Word Reveal Pattern
const frame = useCurrentFrame();
const { fps } = useVideoConfig();

const wordSpring = spring({
  frame: Math.max(0, frame - wordStartFrame),
  fps,
  config: { damping: 12, mass: 0.5 },
});

const scale = interpolate(wordSpring, [0, 1], [0.6, 1.0]);
const opacity = interpolate(wordSpring, [0, 1], [0, 1]);
const translateY = interpolate(wordSpring, [0, 1], [20, 0]);

const wordStyle: React.CSSProperties = {
  transform: `translateY(${translateY}px) scale(${scale})`,
  opacity,
  display: 'inline-block',
  color: isHighlighted ? '#38bdf8' : '#ffffff',
  textShadow: isHighlighted ? '0 0 16px rgba(56, 189, 248, 0.6)' : undefined,
};
```

---

## 8. Video Marketing & Storytelling Frameworks

### Marketing Framework Timelines

```
AIDA Framework (60s Short-Form Video / Ad)
[0s ----- 3s] Attention  : Pattern Interrupt Hook (Bold kinetic text, dynamic spring entrance)
[3s ---- 15s] Interest   : Introduce core problem & visual intrigue
[15s --- 45s] Desire     : Transformation reveal (Before/After slider, feature showcase, proof)
[45s --- 60s] Action     : Strong Call To Action (CTA button, website domain, offer code)

PAS Framework (60s Problem-Agitate-Solve)
[0s ----- 5s] Problem    : Relatable pain point headline & hook
[5s ---- 15s] Agitate    : Amplify pain point with dynamic visual cuts & stats
[15s --- 60s] Solve      : Present product as solution + trust badges & social proof
```

### 0-3s Pattern Interrupt Hooks
1. **Visual Contrast Jumps**: Rapid transition from dark backdrop to vibrant neon highlight color pop.
2. **Bold Kinetic Caption Pop**: Immediate spring-animated target keyword scaling up to 64px on frame 0.
3. **Split-Screen Reveals**: Immediate comparison divider sweep across the canvas.
4. **Dynamic Spring Entry**: Main subject or logo springs in with low damping (`damping: 10`) for punchy bounce.

---

## 9. Visual Retention Devices & Pacing Mechanics

Visual retention mechanics prevent scroll-away drop-off in feed-based social video:

1. **Top/Bottom Progress Bars (`ProgressBar`)**: Gives viewers continuous visual feedback on remaining video duration.
2. **Lower Thirds Callouts (`LowerThird`)**: Introduces speakers, credentials, or context tags with frosted glass cards.
3. **Trust Badges (`TrustBadge`)**: Displays review scores, star ratings, and user avatar stacks during the Desire stage.
4. **Comparison Sliders (`BeforeAfterSlider`)**: Interactively sweeps between state A and state B using spring physics.
5. **Audio Spectrum & Sound Cues (`AudioSpectrum`)**: Binds visual equalizer bars to audio frequencies and triggers audio SFX during key text reveals.

---

## 10. Documentation of Built-in Template Components

The project includes production-grade React components in `src/templates/`:

### 1. `ProgressBar`

Renders an animated horizontal progress indicator supporting time-based auto progress or explicit values, glassmorphism styling, percentage labels, position presets, and neon glow effects.

#### Props Specification

| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `progress` | `number` | `undefined` | Explicit progress value (0 to 1 or 0 to 100). Overrides time-based auto-progress if provided. |
| `startFrame` | `number` | `0` | Frame index when progress animation starts. |
| `endFrame` | `number` | `undefined` | Frame index when progress reaches 100%. Defaults to `startFrame + durationInFrames` or composition duration. |
| `durationInFrames` | `number` | `undefined` | Duration in frames for progress fill animation. |
| `color` | `string` | `'#38bdf8'` | Solid fill color for active progress bar. |
| `gradient` | `string` | `undefined` | Custom CSS gradient string (e.g. `'linear-gradient(90deg, #38bdf8, #818cf8)'`). |
| `backgroundColor` | `string` | `'rgba(255, 255, 255, 0.15)'` | Track background color. |
| `height` | `number \| string` | `8` | Height of progress bar in pixels or CSS unit. |
| `borderRadius` | `number \| string` | `4` | Corner border radius in pixels. |
| `showLabel` | `boolean` | `false` | Whether to display percentage text label. |
| `labelPosition` | `enum` | `'outside-right'` | Placement of label: `'inside' \| 'outside-right' \| 'top-right' \| 'top-left' \| 'bottom-right' \| 'bottom-left'`. |
| `labelFormat` | `function` | `(p) => '${Math.round(p * 100)}%'` | Formatter function converting 0..1 progress float to string. |
| `position` | `enum` | `'bottom'` | Position preset: `'top' \| 'bottom' \| 'custom'`. |
| `positionOffset` | `number \| string` | `20` | Offset distance from top or bottom edge in pixels. |
| `glow` | `boolean` | `false` | Enables neon drop shadow behind active progress fill. |
| `glowColor` | `string` | `undefined` | Custom color for neon drop shadow (defaults to `color`). |
| `style` | `React.CSSProperties` | `undefined` | Custom container CSS overrides. |

#### Timing Patterns & Usage Example

```tsx
import { ProgressBar } from './templates/ProgressBar';

export const CompositionWithProgress = () => (
  <>
    {/* Main video scene content */}
    <ProgressBar
      position="bottom"
      positionOffset={24}
      height={10}
      gradient="linear-gradient(90deg, #38bdf8 0%, #c084fc 100%)"
      glow={true}
      showLabel={true}
      labelPosition="top-right"
    />
  </>
);
```

---

### 2. `BeforeAfterSlider`

Renders a split-screen comparison slider between two images or custom JSX nodes, driven by spring physics, linear sweeps, or hold-and-reveal timing.

#### Props Specification

| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `beforeImage` | `string` | `undefined` | Image URL or relative static file path for "Before" state. |
| `afterImage` | `string` | `undefined` | Image URL or relative static file path for "After" state. |
| `beforeContent` | `React.ReactNode` | `undefined` | Custom JSX node for "Before" pane. |
| `afterContent` | `React.ReactNode` | `undefined` | Custom JSX node for "After" pane. |
| `sliderPosition` | `number` | `undefined` | Explicit slider position percentage (0 to 100). Overrides auto-animation. |
| `startPosition` | `number` | `10` | Starting position percentage for animation sweep. |
| `endPosition` | `number` | `90` | Target ending position percentage for animation sweep. |
| `animationType` | `enum` | `'spring'` | Sweep movement profile: `'spring' \| 'linear' \| 'ping-pong' \| 'hold-and-reveal'`. |
| `startFrame` | `number` | `0` | Frame index when sweep animation begins. |
| `durationInFrames` | `number` | `150` | Duration in frames for linear or ping-pong sweep. |
| `handleColor` | `string` | `'#ffffff'` | Color of vertical divider line and handle container. |
| `handleAccentColor` | `string` | `'#38bdf8'` | Border and double chevron arrow color for handle. |
| `dividerWidth` | `number` | `4` | Width of vertical divider bar in pixels. |
| `showLabels` | `boolean` | `true` | Enables frosted glass labels on before/after panes. |
| `labels` | `object` | `{ before: 'BEFORE', after: 'AFTER' }` | Text strings for pane badges. |
| `labelPosition` | `enum` | `'top'` | Placement of badges: `'top' \| 'bottom'`. |
| `width` | `number \| string` | `'100%'` | Width of container wrapper. |
| `height` | `number \| string` | `'100%'` | Height of container wrapper. |
| `style` | `React.CSSProperties` | `undefined` | Custom wrapper CSS overrides. |

#### Clip-Path Mechanics & Spring Physics
The component renders the **After** pane as a full-size background layer, and clips the **Before** pane using CSS `clipPath`:
```tsx
clipPath: `inset(0 ${100 - currentPos}% 0 0)`
```
When `animationType === 'spring'`, `currentPos` is computed via Remotion spring physics:
```tsx
const spr = spring({ frame: localFrame, fps, config: { damping: 16, mass: 0.8 } });
const currentPos = interpolate(spr, [0, 1], [startPosition, endPosition]);
```

#### Usage Example

```tsx
import { BeforeAfterSlider } from './templates/BeforeAfterSlider';

export const ProductComparisonScene = () => (
  <BeforeAfterSlider
    beforeImage="images/raw_photo.png"
    afterImage="images/retouched_photo.png"
    animationType="spring"
    labels={{ before: 'UNEDITED', after: 'AI ENHANCED' }}
    handleAccentColor="#f59e0b"
  />
);
```

---

### 3. `TrustBadge`

Renders a social proof badge card featuring numerical star ratings, half-star SVG gradients, built-in or custom icons, stacked user avatars, and spring entrance / exit animations.

#### Props Specification

| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `rating` | `number` | `5.0` | Numerical score (e.g. `4.8`, `5.0`). |
| `maxRating` | `number` | `5` | Total number of star icons to render. |
| `reviewCount` | `string \| number` | `undefined` | Review count or happy customer label (e.g. `'2,500+ happy users'`, `500`). |
| `badgeText` | `string` | `'Rated 5 Stars by Top Brands'` | Primary headline badge string. |
| `subtitle` | `string` | `undefined` | Subtitle text override beneath badge text. |
| `avatarUrls` | `string[]` | `[]` | Array of avatar image paths/URLs for social proof stack. |
| `maxAvatars` | `number` | `4` | Max visible avatars before rendering `+N` indicator. |
| `icon` | `enum` | `'star'` | Built-in icon type: `'star' \| 'shield' \| 'check' \| 'heart' \| 'trophy' \| 'custom'`. |
| `customIcon` | `React.ReactNode` | `undefined` | Custom SVG element when `icon === 'custom'`. |
| `glassmorphism` | `boolean` | `true` | Enables `backdropFilter: blur(14px)` frosted background card. |
| `backgroundColor` | `string` | `'rgba(15, 23, 42, 0.88)'` | Card background fill color. |
| `textColor` | `string` | `'#ffffff'` | Headline and rating text color. |
| `accentColor` | `string` | `'#f59e0b'` | Star rating color and accent highlight. |
| `position` | `enum` | `'top-left'` | Position preset: `'top-left' \| 'top-right' \| 'bottom-left' \| 'bottom-right' \| 'top-center' \| 'bottom-center' \| 'custom'`. |
| `animationType` | `enum` | `'pop-in'` | Entrance animation: `'pop-in' \| 'slide-in' \| 'fade-in' \| 'bounce'`. |
| `startFrame` | `number` | `0` | Frame index when card enters timeline. |
| `durationInFrames` | `number` | `150` | Total card duration in frames before exit animation. |
| `enableExitAnimation` | `boolean` | `true` | Enables automatic spring exit shrink during final 15 frames. |
| `style` | `React.CSSProperties` | `undefined` | Custom wrapper CSS overrides. |

#### Glassmorphism Layout & Half-Star SVG Gradients
For half-star scores (e.g. `4.5`), `TrustBadge` generates dynamic SVG linear gradients with hard 50% color stops:
```tsx
<linearGradient id={`trustBadgeHalfGrad-${i}`}>
  <stop offset="50%" stopColor={accentColor} />
  <stop offset="50%" stopColor={accentColor} stopOpacity={0} />
</linearGradient>
```

#### Usage Example

```tsx
import { TrustBadge } from './templates/TrustBadge';

export const ProofOverlay = () => (
  <TrustBadge
    rating={4.9}
    reviewCount="2,500+ verified buyers"
    badgeText="Top Rated Video Editor"
    avatarUrls={['avatars/u1.png', 'avatars/u2.png', 'avatars/u3.png', 'avatars/u4.png', 'avatars/u5.png']}
    position="top-right"
    animationType="bounce"
    accentColor="#f59e0b"
  />
);
```

---

### Additional Templates Overview

4. **`LowerThird`**: Displays speaker names, titles, and social handle callout cards with frosted glass backgrounds.
5. **`SubtitleOverlay`**: Renders word-by-word kinetic text overlays with active word scaling, glow highlights, and SRT timecode synchronization.
6. **`AudioSpectrum`**: Visualizes live audio waveforms as dynamic vertical EQ bars driven by frequency energy.
7. **`KenBurnsImage`**: Applies smooth pan-and-zoom keyframe movement to still photos.

---

## 11. Documentation of `references/remotion_creative_mastery.md`

Comprehensive documentation of `references/remotion_creative_mastery.md`, covering 5 advanced video engineering domains:

### Domain 1: `@remotion/three` — 3D Floating Logos & Product Reveals
- **Architectural Principle**: WebGL rendering in standard Web applications uses `requestAnimationFrame()`, causing non-deterministic frame skips server-side. `@remotion/three` replaces the canvas loop with `ThreeCanvas`, binding WebGL rendering directly to Remotion's frame clock (`useCurrentFrame()`).
- **Key Components**: `FloatingLogo3D.tsx` managing lights (`ambientLight`, `directionalLight`, `pointLight`), materials (`meshStandardMaterial`), and geometries (`TorusKnotGeometry`, `BoxGeometry`, `SphereGeometry`, `CylinderGeometry`).
- **Optimization**: Uses `useMemo()` for 3D geometry buffer allocation to eliminate garbage collection pauses during renders.

### Domain 2: `@remotion/lottie` — Animated Icons & Render Locking
- **Architectural Principle**: Renders After Effects vector animations exported to JSON.
- **Render Locking**: Utilizes Remotion's async handles `delayRender()` and `continueRender()` when loading Lottie JSON files asynchronously over HTTP or from disk. This locks Chromium frame rendering until the asset payload is completely loaded.
- **Key Components**: `LottieIcon.tsx` calculating frame index mapping:
  $$f_{\text{lottie}} = (f_{\text{local}} \cdot s) \pmod{f_{\text{max}}}$$

### Domain 3: Data Visualization — Bar Chart Race & SVG Line Drawing
- **Horizontal Bar Chart Race (`BarChartRace.tsx`)**: Keyframes values across time steps, ranks items dynamically per frame, and applies fluid vertical transitions via CSS `translateY` without triggering DOM reflows.
- **SVG Line Chart Drawing (`AnimatedLineChart.tsx`)**: Maps raw dataset points into SVG viewBox coordinates, uses stroke dash offsets (`strokeDasharray` and `strokeDashoffset`) for smooth line drawing, and animates data dots with staggered spring physics.

### Domain 4: `@remotion/noise` — Procedural Canvas Background Shaders
- **Architectural Principle**: Generates multi-dimensional Simplex noise fields (`noise3D`).
- **Performance Optimization**: Renders to a low-resolution canvas buffer (`resolutionScale = 0.25`), evaluating per-pixel RGB values mapped from $N(x, y, z)$. CSS `filter: blur(20px)` and hardware upscaling stretch the canvas cleanly to full video resolution without WebGL GPU bottlenecks.

### Domain 5: Multi-Track Audio Intelligence & Audio Ducking Algorithm
- **Architectural Principle**: Automatically suppresses background music volume whenever spoken dialogue or voiceovers are active.
- **Key Components**: `AudioDuckingComposition.tsx` evaluating active voiceover timestamps (`VoiceoverSegment[]`).
- **Volume Envelope Algorithm**: Computes 3 phases per speech interval:
  1. **Attack Phase**: Attenuates background music before speech starts over `attackFrames`.
  2. **Ducked Phase**: Holds music at `duckedMusicVolume` during active dialogue.
  3. **Release Phase**: Restores music to `nominalMusicVolume` over `releaseFrames`.
- Overlapping segments evaluate composite maximum ducking strength:
  $$S_{\text{max}}(f) = \max_i S_i(f)$$

---

## 12. Remotion Dependency & Zod Version Guidelines

To prevent `Version mismatch` runtime warnings or errors during `remotion studio`, `remotion render`, or `remotion still`:

1. **Remove Carets (`^`)**: Always pin Remotion dependencies to exact version numbers without the `^` prefix:
   ```json
   "dependencies": {
     "remotion": "4.0.496",
     "@remotion/cli": "4.0.496",
     "@remotion/transitions": "4.0.496",
     "@remotion/media": "4.0.496",
     "@remotion/media-utils": "4.0.496"
   }
   ```
2. **Exact Zod Pinning**: Pin Zod to exact version `"zod": "4.3.6"` as expected by Remotion v4:
   ```json
   "dependencies": {
     "zod": "4.3.6"
   }
   ```
3. **Automated Fix Command**: If a mismatch occurs in any sub-project, execute `npx remotion add zod` or update `package.json` to lock `"zod": "4.3.6"`.

