# Remotion Creative Mastery Reference Guide

This reference guide provides production-grade, architectural explanations, installation instructions, type definitions, and copy-pasteable React/TypeScript components for 5 advanced creative video domains in Remotion.

---

## Table of Contents
1. [Domain 1: @remotion/three — 3D Floating Logos & Product Reveals](#domain-1-remotionthree--3d-floating-logos--product-reveals)
2. [Domain 2: @remotion/lottie — Animated Icons & Vector Checkmarks](#domain-2-remotionlottie--animated-icons--vector-checkmarks)
3. [Domain 3: Data Visualization — Bar Chart Race & SVG Line Drawing](#domain-3-data-visualization--bar-chart-race--svg-line-drawing)
4. [Domain 4: @remotion/noise — Procedural Canvas Background Shaders](#domain-4-remotionnoise--procedural-canvas-background-shaders)
5. [Domain 5: Multi-Track Audio Intelligence & Audio Ducking Algorithm](#domain-5-multi-track-audio-intelligence--audio-ducking-algorithm)

---

## Domain 1: @remotion/three — 3D Floating Logos & Product Reveals

### Architectural Overview
Standard web-based Three.js applications rely on `requestAnimationFrame()` for continuous rendering loops driven by browser refresh rates. In a video production framework like Remotion, continuous loops cause non-deterministic frame skips, temporal jitter, or audio/video desynchronization during multi-threaded server-side rendering.

The `@remotion/three` package replaces the default WebGL canvas loop with `ThreeCanvas`. It binds the 3D scene evaluation directly to Remotion's frame clock (`useCurrentFrame()`). On every discrete video frame:
1. `useCurrentFrame()` provides the integer frame index $f$.
2. Scene transforms (rotation, position, scale) are calculated deterministically as functions of $f$.
3. `ThreeCanvas` executes a single synchronous WebGL render call into the frame buffer.

### Installation & Dependencies
Install `@remotion/three` alongside Three.js and its TypeScript declarations:

```bash
npm install @remotion/three three
npm install --save-dev @types/three
```

### Component Code: `FloatingLogo3D.tsx`

```tsx
import React, { useMemo } from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import * as THREE from 'three';

export interface FloatingLogo3DProps {
  /** Geometry shape for the 3D mesh logo (default: 'torusKnot') */
  shape?: 'box' | 'torusKnot' | 'sphere' | 'cylinder';
  /** Color of the mesh material in hex format (default: '#38bdf8') */
  meshColor?: string;
  /** Metalness factor (0.0 to 1.0, default: 0.8) */
  metalness?: number;
  /** Roughness factor (0.0 to 1.0, default: 0.2) */
  roughness?: number;
  /** Amplitude of vertical floating oscillation in Three.js world units (default: 0.4) */
  floatAmplitude?: number;
  /** Speed frequency of vertical floating oscillation (default: 0.05) */
  floatSpeed?: number;
  /** Continuous Y-axis rotation speed in radians per frame (default: 0.02) */
  rotationSpeed?: number;
  /** Entrance animation start frame (default: 0) */
  startFrame?: number;
  /** Directional light intensity (default: 2.5) */
  lightIntensity?: number;
  /** Canvas background color (default: 'transparent') */
  backgroundColor?: string;
  /** Custom wrapper style overrides */
  style?: React.CSSProperties;
}

/**
 * Inner Three.js Scene component executed within ThreeCanvas context.
 * Directly consumes Remotion hooks to drive frame-synchronized 3D transforms.
 */
const SceneContent: React.FC<Omit<FloatingLogo3DProps, 'style' | 'backgroundColor'>> = ({
  shape = 'torusKnot',
  meshColor = '#38bdf8',
  metalness = 0.8,
  roughness = 0.2,
  floatAmplitude = 0.4,
  floatSpeed = 0.05,
  rotationSpeed = 0.02,
  startFrame = 0,
  lightIntensity = 2.5,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Clamp frame to zero to prevent negative values before startFrame
  const localFrame = Math.max(0, frame - startFrame);

  // Entrance spring physics scale animation (0 -> 1)
  const scaleSpring = spring({
    frame: localFrame,
    fps,
    config: { damping: 12, mass: 0.6, stiffness: 100 },
  });

  // Calculate 3D position & rotation offsets
  const yPosition = Math.sin(localFrame * floatSpeed) * floatAmplitude;
  const rotationY = localFrame * rotationSpeed + interpolate(scaleSpring, [0, 1], [Math.PI * 2, 0]);
  const rotationX = Math.cos(localFrame * floatSpeed * 0.5) * 0.15;

  // Memoize geometry creation to avoid re-allocating memory on every frame
  const geometry = useMemo(() => {
    switch (shape) {
      case 'box':
        return new THREE.BoxGeometry(2.2, 2.2, 2.2);
      case 'sphere':
        return new THREE.SphereGeometry(1.6, 64, 64);
      case 'cylinder':
        return new THREE.CylinderGeometry(1.4, 1.4, 2.4, 32);
      case 'torusKnot':
      default:
        return new THREE.TorusKnotGeometry(1.2, 0.4, 128, 32);
    }
  }, [shape]);

  return (
    <>
      {/* Lighting environment */}
      <ambientLight intensity={0.6} />
      <directionalLight position={[6, 10, 8]} intensity={lightIntensity} />
      <pointLight position={[-6, -6, -4]} intensity={1.2} color="#818cf8" />

      {/* 3D Animated Mesh */}
      <mesh
        geometry={geometry}
        position={[0, yPosition, 0]}
        rotation={[rotationX, rotationY, 0]}
        scale={[scaleSpring, scaleSpring, scaleSpring]}
      >
        <meshStandardMaterial
          color={meshColor}
          metalness={metalness}
          roughness={roughness}
        />
      </mesh>
    </>
  );
};

/**
 * FloatingLogo3D Component
 * Renders a full 3D floating object with lighting and animation frame synchronization.
 */
export const FloatingLogo3D: React.FC<FloatingLogo3DProps> = ({
  backgroundColor = 'transparent',
  style,
  ...sceneProps
}) => {
  const { width, height } = useVideoConfig();

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        backgroundColor,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...style,
      }}
    >
      <ThreeCanvas camera={{ position: [0, 0, 7], fov: 45 }} width={width} height={height}>
        <SceneContent {...sceneProps} />
      </ThreeCanvas>
    </div>
  );
};
```

### Mathematical & Physical Mechanics
1. **Sinusoidal Float Oscillation**:
   $$y(f) = \sin(f \cdot \omega_{\text{float}}) \cdot A_{\text{float}}$$
   where $f$ is `localFrame`, $\omega_{\text{float}}$ is `floatSpeed`, and $A_{\text{float}}$ is `floatAmplitude`.
2. **Rotation Integration**:
   $$\theta_y(f) = (f \cdot \omega_{\text{rot}}) + \text{interpolate}(S(f), [0, 1], [2\pi, 0])$$
   Combining linear angular velocity with spring entrance spin guarantees a smooth spin into resting rotation.
3. **Geometry Allocation**: `useMemo` pins Three.js buffer geometries to React's component lifecycle, preventing garbage collection spikes on 60 FPS renders.

---

## Domain 2: @remotion/lottie — Animated Icons & Vector Checkmarks

### Architectural Overview
Lottie exports After Effects vector animations to JSON. `@remotion/lottie` parses this JSON structure and maps vector keyframe properties directly to Remotion's frame clock.

When loading Lottie files asynchronously over HTTP or via `staticFile()`, background rendering threads must lock execution until the JSON payload is fully loaded. Remotion handles asset synchronization using `delayRender()` and `continueRender()` handles.

### Installation & Dependencies
```bash
npm install @remotion/lottie
```

### Component Code: `LottieIcon.tsx`

```tsx
import React, { useEffect, useState } from 'react';
import {
  continueRender,
  delayRender,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { Lottie, LottieAnimationData } from '@remotion/lottie';

export interface LottieIconProps {
  /** Pre-loaded Lottie animation JSON object */
  animationData?: LottieAnimationData | object;
  /** Relative path to Lottie JSON file inside public/ folder or remote URL */
  jsonPath?: string;
  /** Playback speed multiplier (default: 1.0) */
  speed?: number;
  /** Frame when Lottie playback begins (default: 0) */
  startFrame?: number;
  /** Whether to loop playback continuously (default: false) */
  loop?: boolean;
  /** Container width in pixels or percentage (default: 200) */
  width?: number | string;
  /** Container height in pixels or percentage (default: 200) */
  height?: number | string;
  /** Enable spring scale pop-in animation on entrance (default: true) */
  enableSpringEntrance?: boolean;
  /** Custom wrapper style overrides */
  style?: React.CSSProperties;
}

export const LottieIcon: React.FC<LottieIconProps> = ({
  animationData: directAnimationData,
  jsonPath,
  speed = 1.0,
  startFrame = 0,
  loop = false,
  width = 200,
  height = 200,
  enableSpringEntrance = true,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const [loadedData, setLoadedData] = useState<LottieAnimationData | null>(
    (directAnimationData as LottieAnimationData) || null
  );

  // Asynchronous JSON fetching with Remotion render locking
  useEffect(() => {
    if (directAnimationData) {
      setLoadedData(directAnimationData as LottieAnimationData);
      return;
    }

    if (!jsonPath) return;

    const handle = delayRender(`Loading Lottie JSON: ${jsonPath}`);
    const resolvedUrl = jsonPath.startsWith('http') ? jsonPath : staticFile(jsonPath);

    fetch(resolvedUrl)
      .then((res) => res.json())
      .then((data) => {
        setLoadedData(data as LottieAnimationData);
        continueRender(handle);
      })
      .catch((err) => {
        console.error(`Failed to load Lottie JSON asset at ${resolvedUrl}:`, err);
        continueRender(handle);
      });
  }, [directAnimationData, jsonPath]);

  // Compute timing math
  const localFrame = Math.max(0, frame - startFrame);

  // Entrance spring scale (0 -> 1)
  const scaleSpring = enableSpringEntrance
    ? spring({ frame: localFrame, fps, config: { damping: 10, mass: 0.5, stiffness: 120 } })
    : 1;

  if (!loadedData) {
    return <div style={{ width, height, ...style }} />;
  }

  // Calculate total Lottie animation duration in frames
  const lottieTotalFrames = (loadedData as any).op ? (loadedData as any).op - (loadedData as any).ip : 60;
  
  // Determine current frame index inside Lottie timeline
  let lottieFrame = localFrame * speed;
  if (loop && lottieTotalFrames > 0) {
    lottieFrame = lottieFrame % lottieTotalFrames;
  } else {
    lottieFrame = Math.min(lottieFrame, lottieTotalFrames - 1);
  }

  return (
    <div
      style={{
        width,
        height,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transform: `scale(${scaleSpring})`,
        ...style,
      }}
    >
      <Lottie
        animationData={loadedData}
        {...({ frame: lottieFrame } as any)}
        playbackRate={speed}
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
};
```

### Frame Mapping & Async Mechanics
1. **Render Lock Protocol**: `delayRender()` generates a blocking token. Remotion halts Chromium frame capture until `continueRender(token)` is invoked following fetch resolution.
2. **Timeline Quantization**: Lottie frames are calculated deterministically:
   $$f_{\text{lottie}} = \begin{cases} 
   (f_{\text{local}} \cdot s) \pmod{f_{\text{max}}}, & \text{if } \text{loop} \\
   \min(f_{\text{local}} \cdot s, f_{\text{max}} - 1), & \text{otherwise}
   \end{cases}$$

---

## Domain 3: Data Visualization — Bar Chart Race & SVG Line Drawing

### Architectural Overview
Data visualizations in video production require smooth keyframe interpolation between discrete data points. 

This domain contains two core primitives:
1. **Horizontal Bar Chart Race (`BarChartRace.tsx`)**: Ranks entries dynamically, interpolates numeric values between time keyframes, and applies smooth Y-axis transform transitions (`translateY`) to swap bar positions without layout reflows.
2. **SVG Line Chart Drawing (`AnimatedLineChart.tsx`)**: Scales data coordinates to SVG viewBox space and uses stroke path geometry (`strokeDasharray` and `strokeDashoffset`) to draw smooth curves with staggered spring data dots.

### Installation & Dependencies
No external chart libraries required; builds on native SVG and React primitives.

---

### Component 1 Code: `BarChartRace.tsx`

```tsx
import React, { useMemo } from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

export interface BarChartItem {
  id: string;
  label: string;
  color: string;
  /** Array of numeric values matching timeSteps */
  values: number[];
}

export interface BarChartRaceProps {
  /** Dataset containing entities with keyframed value series */
  data: BarChartItem[];
  /** Labels for time steps (e.g. ['2020', '2021', '2022']) */
  timeSteps?: string[];
  /** Duration in frames spent transitioning between each time step (default: 45) */
  stepDurationInFrames?: number;
  /** Max number of top-ranked items to display (default: 5) */
  topN?: number;
  /** Bar height in pixels (default: 44) */
  barHeight?: number;
  /** Spacing between vertical bars in pixels (default: 14) */
  barGap?: number;
  /** Total chart area width in pixels (default: 900) */
  chartWidth?: number;
  /** Entrance animation start frame (default: 0) */
  startFrame?: number;
  /** Custom wrapper style overrides */
  style?: React.CSSProperties;
}

export const BarChartRace: React.FC<BarChartRaceProps> = ({
  data,
  timeSteps = [],
  stepDurationInFrames = 45,
  topN = 5,
  barHeight = 44,
  barGap = 14,
  chartWidth = 900,
  startFrame = 0,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const localFrame = Math.max(0, frame - startFrame);

  // Compute current keyframe step index and fractional progress
  const totalSteps = Math.max(1, (data[0]?.values.length || 1) - 1);
  const currentStepProgress = localFrame / stepDurationInFrames;
  const stepIndex = Math.min(totalSteps - 1, Math.floor(currentStepProgress));
  const stepFraction = currentStepProgress - stepIndex;

  // Interpolate current values for each item
  const processedItems = useMemo(() => {
    if (!data || data.length === 0) return [];

    const computed = data.map((item) => {
      const valStart = item.values[stepIndex] ?? 0;
      const valEnd = item.values[Math.min(totalSteps, stepIndex + 1)] ?? valStart;
      const currentValue = interpolate(stepFraction, [0, 1], [valStart, valEnd], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      });
      return { ...item, currentValue };
    });

    // Sort descending by current value
    computed.sort((a, b) => b.currentValue - a.currentValue);

    // Assign rank positions
    return computed.map((item, rank) => ({ ...item, rank }));
  }, [data, stepIndex, stepFraction, totalSteps]);

  // Max value in current frame for proportional width calculation
  const maxCurrentValue = Math.max(1, ...processedItems.map((i) => i.currentValue));

  const visibleItems = processedItems.slice(0, topN);

  return (
    <div
      style={{
        position: 'relative',
        width: chartWidth,
        height: topN * (barHeight + barGap),
        fontFamily: 'system-ui, sans-serif',
        ...style,
      }}
    >
      {visibleItems.map((item) => {
        // Calculate Y position based on rank index
        const targetY = item.rank * (barHeight + barGap);

        // Calculate horizontal width percentage
        const widthPercentage = Math.min(100, (item.currentValue / maxCurrentValue) * 80);

        return (
          <div
            key={item.id}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: barHeight,
              transform: `translateY(${targetY}px)`,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            {/* Label */}
            <div
              style={{
                width: 140,
                textAlign: 'right',
                fontWeight: 700,
                fontSize: 14,
                color: '#ffffff',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {item.label}
            </div>

            {/* Bar Track & Fill */}
            <div
              style={{
                flex: 1,
                height: '100%',
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                borderRadius: 6,
                overflow: 'hidden',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${widthPercentage}%`,
                  backgroundColor: item.color,
                  borderRadius: 6,
                  boxShadow: `0 0 10px ${item.color}88`,
                }}
              />

              {/* Value Text */}
              <span
                style={{
                  position: 'absolute',
                  left: `calc(${widthPercentage}% + 10px)`,
                  fontSize: 13,
                  fontWeight: 800,
                  color: '#ffffff',
                }}
              >
                {Math.round(item.currentValue).toLocaleString()}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
```

---

### Component 2 Code: `AnimatedLineChart.tsx`

```tsx
import React, { useMemo } from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

export interface LineChartPoint {
  x: number;
  y: number;
}

export interface AnimatedLineChartProps {
  /** Array of data points {x, y} */
  data: LineChartPoint[];
  /** SVG Canvas width in pixels (default: 800) */
  width?: number;
  /** SVG Canvas height in pixels (default: 400) */
  height?: number;
  /** Line stroke color (default: '#38bdf8') */
  lineColor?: string;
  /** Line stroke width in pixels (default: 4) */
  lineWidth?: number;
  /** Whether to render translucent gradient area fill below line (default: true) */
  showAreaFill?: boolean;
  /** Entrance animation start frame (default: 0) */
  startFrame?: number;
  /** Duration in frames for complete path drawing reveal (default: 90) */
  durationInFrames?: number;
  /** Show data point highlight dots (default: true) */
  showDots?: boolean;
  /** Radius of highlight dots in pixels (default: 6) */
  dotRadius?: number;
  /** Custom wrapper style overrides */
  style?: React.CSSProperties;
}

export const AnimatedLineChart: React.FC<AnimatedLineChartProps> = ({
  data,
  width = 800,
  height = 400,
  lineColor = '#38bdf8',
  lineWidth = 4,
  showAreaFill = true,
  startFrame = 0,
  durationInFrames = 90,
  showDots = true,
  dotRadius = 6,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const localFrame = Math.max(0, frame - startFrame);

  // Compute line drawing progress (0 -> 1)
  const drawProgress = interpolate(localFrame, [0, durationInFrames], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Calculate SVG path commands and path geometry math
  const { pathD, areaD, totalLength, scaledPoints, pointLengths } = useMemo(() => {
    if (!data || data.length < 2) {
      return { pathD: '', areaD: '', totalLength: 1, scaledPoints: [], pointLengths: [] };
    }

    const padding = 40;
    const minX = Math.min(...data.map((p) => p.x));
    const maxX = Math.max(...data.map((p) => p.x));
    const minY = Math.min(...data.map((p) => p.y));
    const maxY = Math.max(...data.map((p) => p.y));

    const rangeX = maxX - minX || 1;
    const rangeY = maxY - minY || 1;

    // Scale data points to SVG coordinate space
    const points = data.map((p) => ({
      x: padding + ((p.x - minX) / rangeX) * (width - padding * 2),
      y: height - padding - ((p.y - minY) / rangeY) * (height - padding * 2),
    }));

    // Construct smooth path using line commands and cumulative arc lengths
    let path = `M ${points[0].x} ${points[0].y}`;
    let length = 0;
    const lengths: number[] = [0];

    for (let i = 1; i < points.length; i++) {
      path += ` L ${points[i].x} ${points[i].y}`;
      const dx = points[i].x - points[i - 1].x;
      const dy = points[i].y - points[i - 1].y;
      length += Math.sqrt(dx * dx + dy * dy);
      lengths.push(length);
    }

    const area = `${path} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

    return { pathD: path, areaD: area, totalLength: length, scaledPoints: points, pointLengths: lengths };
  }, [data, width, height]);

  const strokeDashoffset = totalLength * (1 - drawProgress);

  return (
    <div style={{ width, height, position: 'relative', ...style }}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <defs>
          <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={lineColor} />
            <stop offset="100%" stopColor="#818cf8" />
          </linearGradient>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={lineColor} stopOpacity={0.35} />
            <stop offset="100%" stopColor={lineColor} stopOpacity={0.0} />
          </linearGradient>
          <clipPath id="areaClip">
            <rect x="0" y="0" width={width * drawProgress} height={height} />
          </clipPath>
        </defs>

        {/* Gradient Area Fill - Synchronized with line drawing progress */}
        {showAreaFill && areaD && (
          <path
            d={areaD}
            fill="url(#areaGrad)"
            clipPath="url(#areaClip)"
            opacity={drawProgress}
          />
        )}

        {/* Animated Stroke Path */}
        <path
          d={pathD}
          fill="none"
          stroke="url(#lineGrad)"
          strokeWidth={lineWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={totalLength}
          strokeDashoffset={strokeDashoffset}
        />

        {/* Data Point Dots - Synchronized to line draw progress */}
        {showDots &&
          scaledPoints.map((pt, i) => {
            const pointProgressRatio = (pointLengths[i] ?? 0) / (totalLength || 1);
            const isVisible = drawProgress >= pointProgressRatio;
            const dotFrame = Math.max(0, localFrame - pointProgressRatio * durationInFrames);
            const dotSpring = isVisible
              ? spring({
                  frame: dotFrame,
                  fps,
                  config: { damping: 10 },
                })
              : 0;

            return (
              <circle
                key={i}
                cx={pt.x}
                cy={pt.y}
                r={dotRadius * dotSpring}
                fill={lineColor}
                stroke="#ffffff"
                strokeWidth={2}
              />
            );
          })}
      </svg>
    </div>
  );
};
```

### Mathematical Formulas
1. **Total Arc Length**:
   $$L = \sum_{i=1}^{n-1} \sqrt{(x_i - x_{i-1})^2 + (y_i - y_{i-1})^2}$$
2. **Stroke Dash Offset**:
   $$\text{offset}(f) = L \cdot (1 - P(f))$$
   where $P(f) \in [0, 1]$ represents normalized drawing progress over `durationInFrames`.

---

## Domain 4: @remotion/noise — Procedural Canvas Background Shaders

### Architectural Overview
`@remotion/noise` generates multi-dimensional Simplex noise fields (`noise2D`, `noise3D`). In video backgrounds, procedurally generated noise offers infinite, non-repeating, organic fluid motion.

To maintain fast rendering times (30–60 FPS) without overwhelming WebGL or CPU contexts:
1. Low-resolution canvas buffers are rendered (e.g. `resolutionScale = 0.25`).
2. Per-pixel RGB values are generated in a single loop step using 3D Simplex noise: $N(x, y, z)$.
3. Time step $z = f \cdot \text{speed}$ advances the noise field frame-by-frame.
4. CSS `filter: blur()` and hardware-accelerated upscaling stretch the canvas buffer cleanly to full video resolution.

### Installation & Dependencies
```bash
npm install @remotion/noise
```

### Component Code: `ProceduralNoiseBackground.tsx`

```tsx
import React, { useEffect, useMemo, useRef } from 'react';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { noise3D } from '@remotion/noise';

export interface ProceduralNoiseBackgroundProps {
  /** Seed string or number for procedural generator (default: 'remotion-noise-seed') */
  seed?: string | number;
  /** Spatial frequency scale of noise field (default: 0.003) */
  noiseScale?: number;
  /** Movement speed of Z-axis time offset per frame (default: 0.015) */
  speed?: number;
  /** Hex color stop A (default: '#0f172a') */
  colorA?: string;
  /** Hex color stop B (default: '#38bdf8') */
  colorB?: string;
  /** Hex color stop C (default: '#818cf8') */
  colorC?: string;
  /** Canvas downscaling resolution multiplier for optimal rendering performance (default: 0.25) */
  resolutionScale?: number;
  /** Custom wrapper style overrides */
  style?: React.CSSProperties;
}

/** Helper to parse Hex color string to RGB triplet */
function hexToRgb(hex: string): [number, number, number] {
  const cleanHex = hex.replace('#', '');
  const bigint = parseInt(cleanHex, 16);
  return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
}

export const ProceduralNoiseBackground: React.FC<ProceduralNoiseBackgroundProps> = ({
  seed = 'remotion-noise-seed',
  noiseScale = 0.003,
  speed = 0.015,
  colorA = '#0f172a',
  colorB = '#38bdf8',
  colorC = '#818cf8',
  resolutionScale = 0.25,
  style,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const rgbA = useMemo(() => hexToRgb(colorA), [colorA]);
  const rgbB = useMemo(() => hexToRgb(colorB), [colorB]);
  const rgbC = useMemo(() => hexToRgb(colorC), [colorC]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const renderWidth = Math.floor(width * resolutionScale);
    const renderHeight = Math.floor(height * resolutionScale);

    if (canvas.width !== renderWidth || canvas.height !== renderHeight) {
      canvas.width = renderWidth;
      canvas.height = renderHeight;
    }

    const imgData = ctx.createImageData(renderWidth, renderHeight);
    const data = imgData.data;

    const zTime = frame * speed;

    for (let y = 0; y < renderHeight; y++) {
      for (let x = 0; x < renderWidth; x++) {
        // Sample 3D Simplex noise value between -1.0 and 1.0
        const rawNoise = noise3D(seed, (x / resolutionScale) * noiseScale, (y / resolutionScale) * noiseScale, zTime);
        const n = (rawNoise + 1) / 2; // Normalize to 0.0 -> 1.0

        let r: number, g: number, b: number;

        if (n < 0.5) {
          const t = n * 2; // 0 -> 1 between color A and B
          r = rgbA[0] + t * (rgbB[0] - rgbA[0]);
          g = rgbA[1] + t * (rgbB[1] - rgbA[1]);
          b = rgbA[2] + t * (rgbB[2] - rgbA[2]);
        } else {
          const t = (n - 0.5) * 2; // 0 -> 1 between color B and C
          r = rgbB[0] + t * (rgbC[0] - rgbB[0]);
          g = rgbB[1] + t * (rgbC[1] - rgbB[1]);
          b = rgbB[2] + t * (rgbC[2] - rgbB[2]);
        }

        const index = (y * renderWidth + x) * 4;
        data[index] = Math.min(255, Math.max(0, r));
        data[index + 1] = Math.min(255, Math.max(0, g));
        data[index + 2] = Math.min(255, Math.max(0, b));
        data[index + 3] = 255; // Alpha channel
      }
    }

    ctx.putImageData(imgData, 0, 0);
  }, [frame, width, height, resolutionScale, noiseScale, speed, seed, rgbA, rgbB, rgbC]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        filter: 'blur(20px)',
        transform: 'scale(1.1)', // Slight scale to conceal blur edge artifacts
        ...style,
      }}
    />
  );
};
```

### Shader & Gradient Mechanics
1. **3D Simplex Noise Field**:
   $$N(x, y, z) = \text{noise3D}\left(\text{seed}, \frac{x}{s_{\text{res}}} \cdot s_{\text{noise}}, \frac{y}{s_{\text{res}}} \cdot s_{\text{noise}}, f \cdot v_{\text{speed}}\right)$$
2. **Normalized Value Remapping**:
   $$n = \frac{N(x, y, z) + 1.0}{2.0} \in [0.0, 1.0]$$
3. **Piecewise RGB Color Interpolation**:
   $$\mathbf{C}(n) = \begin{cases}
   (1 - 2n)\mathbf{C}_A + (2n)\mathbf{C}_B, & n < 0.5 \\
   (2 - 2n)\mathbf{C}_B + (2n - 1)\mathbf{C}_C, & n \ge 0.5
   \end{cases}$$

---

## Domain 5: Multi-Track Audio Intelligence & Audio Ducking Algorithm

### Architectural Overview
Audio Ducking automatically lowers the volume of background music when spoken voiceover or dialogue is active.

In Remotion, dynamic volume control is declared using frame-indexed functions:
```tsx
<Audio src={bgMusic} volume={(frame) => computeDuckedVolume(frame)} />
```

`AudioDuckingComposition` computes the volume envelope by evaluating all active speech intervals (`VoiceoverSegment[]`). It handles:
- **Attack Phase**: Volume drops linearly before speech starts.
- **Ducked Speech Phase**: Volume stays suppressed during active dialogue.
- **Release Phase**: Volume fades smoothly back up to nominal levels after speech ends.
- **Overlapping Segments**: Calculates maximum ducking strength across overlapping speech segments to avoid volume dips or spikes.

### Installation & Dependencies
Native Remotion feature (`remotion`). No third-party dependencies required.

### Component Code: `AudioDuckingComposition.tsx`

```tsx
import React, { useCallback } from 'react';
import { Audio, interpolate, staticFile, useCurrentFrame } from 'remotion';

export interface VoiceoverSegment {
  /** Start frame index of spoken segment */
  startFrame: number;
  /** End frame index of spoken segment */
  endFrame: number;
  /** Optional segment transcript label */
  label?: string;
}

export interface AudioDuckingCompositionProps {
  /** Relative asset path or URL for voiceover audio file */
  voiceoverSrc: string;
  /** Relative asset path or URL for background music audio file */
  backgroundMusicSrc: string;
  /** List of timestamp intervals where voiceover speech is active */
  voiceoverSegments: VoiceoverSegment[];
  /** Nominal background music volume level when voice is silent (0.0 to 1.0, default: 0.8) */
  nominalMusicVolume?: number;
  /** Reduced background music volume level during speech (0.0 to 1.0, default: 0.15) */
  duckedMusicVolume?: number;
  /** Duration in frames for volume fade down (default: 10) */
  attackFrames?: number;
  /** Duration in frames for volume fade back up (default: 15) */
  releaseFrames?: number;
  /** Master volume multiplier for voiceover audio (default: 1.0) */
  voiceoverVolume?: number;
}

export const AudioDuckingComposition: React.FC<AudioDuckingCompositionProps> = ({
  voiceoverSrc,
  backgroundMusicSrc,
  voiceoverSegments = [],
  nominalMusicVolume = 0.8,
  duckedMusicVolume = 0.15,
  attackFrames = 10,
  releaseFrames = 15,
  voiceoverVolume = 1.0,
}) => {
  const resolveAudioUrl = (src: string) =>
    src.startsWith('http') || src.startsWith('data:') ? src : staticFile(src);

  /**
   * Calculates the exact dynamic volume level for background music at any given frame.
   */
  const computeDuckedMusicVolume = useCallback(
    (frame: number): number => {
      if (!voiceoverSegments || voiceoverSegments.length === 0) {
        return nominalMusicVolume;
      }

      // Calculate maximum ducking strength across all voiceover segments
      let maxDuckingStrength = 0;

      for (const segment of voiceoverSegments) {
        const attackStart = segment.startFrame - attackFrames;
        const attackEnd = segment.startFrame;
        const releaseStart = segment.endFrame;
        const releaseEnd = segment.endFrame + releaseFrames;

        if (frame < attackStart || frame > releaseEnd) {
          continue; // Outside segment ducking window
        }

        let segmentStrength = 0;

        if (frame >= attackStart && frame < attackEnd) {
          // Attack phase: fade down background music
          segmentStrength = interpolate(frame, [attackStart, attackEnd], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });
        } else if (frame >= attackEnd && frame <= releaseStart) {
          // Full ducking active during speech
          segmentStrength = 1.0;
        } else if (frame > releaseStart && frame <= releaseEnd) {
          // Release phase: fade back up background music
          segmentStrength = interpolate(frame, [releaseStart, releaseEnd], [1, 0], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });
        }

        maxDuckingStrength = Math.max(maxDuckingStrength, segmentStrength);
      }

      // Scale volume envelope between nominal and ducked volume
      const targetVolume =
        nominalMusicVolume - maxDuckingStrength * (nominalMusicVolume - duckedMusicVolume);

      return Math.min(1.0, Math.max(0.0, targetVolume));
    },
    [voiceoverSegments, nominalMusicVolume, duckedMusicVolume, attackFrames, releaseFrames]
  );

  return (
    <>
      {/* Voiceover Track */}
      <Audio src={resolveAudioUrl(voiceoverSrc)} volume={voiceoverVolume} />

      {/* Dynamic Ducked Background Music Track */}
      <Audio
        src={resolveAudioUrl(backgroundMusicSrc)}
        volume={(frame) => computeDuckedMusicVolume(frame)}
      />
    </>
  );
};
```

### Volume Envelope Math
1. **Ducking Attenuation Strength**:
   $$S_i(f) = \begin{cases}
   \frac{f - (f_{\text{start}} - t_{\text{attack}})}{t_{\text{attack}}}, & f_{\text{start}} - t_{\text{attack}} \le f < f_{\text{start}} \\[6pt]
   1.0, & f_{\text{start}} \le f \le f_{\text{end}} \\[6pt]
   \frac{(f_{\text{end}} + t_{\text{release}}) - f}{t_{\text{release}}}, & f_{\text{end}} < f \le f_{\text{end}} + t_{\text{release}} \\[6pt]
   0.0, & \text{otherwise}
   \end{cases}$$
2. **Composite Envelope**:
   $$S_{\text{max}}(f) = \max_{i} S_i(f)$$
3. **Background Music Volume Output**:
   $$V_{\text{music}}(f) = V_{\text{nominal}} - S_{\text{max}}(f) \cdot (V_{\text{nominal}} - V_{\text{ducked}})$$

---
