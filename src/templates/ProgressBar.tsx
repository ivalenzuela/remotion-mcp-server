import React from 'react';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';

export interface ProgressBarProps {
  /** Explicit progress value (0 to 1 or 0 to 100). Overrides time-based auto-progress if provided. */
  progress?: number;
  /** Frame when progress animation starts (default: 0) */
  startFrame?: number;
  /** Frame when progress animation completes (default: video duration or startFrame + durationInFrames) */
  endFrame?: number;
  /** Duration in frames for progress fill (used if endFrame is omitted) */
  durationInFrames?: number;
  /** Solid fill color (default: '#38bdf8') */
  color?: string;
  /** Custom CSS gradient fill (e.g. 'linear-gradient(90deg, #38bdf8 0%, #818cf8 100%)') */
  gradient?: string;
  /** Track background color (default: 'rgba(255, 255, 255, 0.15)') */
  backgroundColor?: string;
  /** Bar height in pixels or CSS unit (default: 8) */
  height?: number | string;
  /** Corner border radius (default: 4) */
  borderRadius?: number | string;
  /** Whether to render percentage or formatted progress label (default: false) */
  showLabel?: boolean;
  /** Placement of label relative to progress bar (default: 'outside-right') */
  labelPosition?: 'inside' | 'outside-right' | 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  /** Formatter function for label string (default: (p) => `${Math.round(p * 100)}%`) */
  labelFormat?: (progress: number) => string;
  /** Position preset for overlay (default: 'bottom') */
  position?: 'top' | 'bottom' | 'custom';
  /** Offset distance from edge in px or string (default: 20) */
  positionOffset?: number | string;
  /** Enable neon glow drop shadow behind active bar (default: false) */
  glow?: boolean;
  /** Custom color for neon glow shadow */
  glowColor?: string;
  /** Custom wrapper style overrides */
  style?: React.CSSProperties;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress: explicitProgress,
  startFrame = 0,
  endFrame,
  durationInFrames: customDuration,
  color = '#38bdf8',
  gradient,
  backgroundColor = 'rgba(255, 255, 255, 0.15)',
  height = 8,
  borderRadius = 4,
  showLabel = false,
  labelPosition = 'outside-right',
  labelFormat = (p: number) => `${Math.round(p * 100)}%`,
  position = 'bottom',
  positionOffset = 20,
  glow = false,
  glowColor,
  style,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames: configDuration } = useVideoConfig();

  // Determine effective progress 0..1
  let currentProgress = 0;
  if (explicitProgress !== undefined) {
    currentProgress = explicitProgress > 1 ? explicitProgress / 100 : explicitProgress;
  } else {
    const effectiveEnd = endFrame ?? (customDuration ? startFrame + customDuration : configDuration);
    currentProgress = interpolate(
      frame,
      [startFrame, Math.max(startFrame + 1, effectiveEnd)],
      [0, 1],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );
  }
  const clampedProgress = Math.min(1, Math.max(0, currentProgress));

  // Compute container position style based on position preset
  const offsetValue = typeof positionOffset === 'number' ? `${positionOffset}px` : positionOffset;

  const getContainerPositionStyle = (): React.CSSProperties => {
    if (position === 'top') {
      return {
        position: 'absolute',
        top: offsetValue,
        left: offsetValue,
        right: offsetValue,
        zIndex: 80,
      };
    }
    if (position === 'bottom') {
      return {
        position: 'absolute',
        bottom: offsetValue,
        left: offsetValue,
        right: offsetValue,
        zIndex: 80,
      };
    }
    return {
      position: 'relative',
      width: '100%',
      zIndex: 80,
    };
  };

  const effectiveGlowColor = glowColor || color;
  const labelText = labelFormat(clampedProgress);

  const labelSpan = (
    <span
      style={{
        color: '#ffffff',
        fontSize: 14,
        fontWeight: 700,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        lineHeight: 1,
      }}
    >
      {labelText}
    </span>
  );

  const barTrack = (
    <div
      style={{
        flex: 1,
        width: '100%',
        backgroundColor,
        height,
        borderRadius,
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <div
        style={{
          height: '100%',
          width: `${clampedProgress * 100}%`,
          background: gradient || color,
          borderRadius,
          boxShadow: glow ? `0 0 12px ${effectiveGlowColor}` : undefined,
        }}
      />
      {showLabel && labelPosition === 'inside' && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: typeof height === 'number' ? Math.max(10, height - 2) : 11,
            fontWeight: 700,
            color: '#ffffff',
            pointerEvents: 'none',
          }}
        >
          {labelText}
        </div>
      )}
    </div>
  );

  // Layout based on label position
  const isTopLabel = labelPosition === 'top-left' || labelPosition === 'top-right';
  const isBottomLabel = labelPosition === 'bottom-left' || labelPosition === 'bottom-right';

  if (showLabel && (isTopLabel || isBottomLabel)) {
    const justifyLabel =
      labelPosition === 'top-right' || labelPosition === 'bottom-right' ? 'flex-end' : 'flex-start';

    return (
      <div
        style={{
          ...getContainerPositionStyle(),
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          pointerEvents: 'none',
          ...style,
        }}
      >
        {isTopLabel && <div style={{ display: 'flex', justifyContent: justifyLabel }}>{labelSpan}</div>}
        {barTrack}
        {isBottomLabel && <div style={{ display: 'flex', justifyContent: justifyLabel }}>{labelSpan}</div>}
      </div>
    );
  }

  return (
    <div
      style={{
        ...getContainerPositionStyle(),
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        pointerEvents: 'none',
        ...style,
      }}
    >
      {barTrack}
      {showLabel && labelPosition === 'outside-right' && labelSpan}
    </div>
  );
};
