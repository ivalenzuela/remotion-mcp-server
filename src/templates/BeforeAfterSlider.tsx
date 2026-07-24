import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig, Img, staticFile } from 'remotion';

export interface BeforeAfterSliderProps {
  /** Before state image URL or path */
  beforeImage?: string;
  /** After state image URL or path */
  afterImage?: string;
  /** Custom JSX node for Before pane */
  beforeContent?: React.ReactNode;
  /** Custom JSX node for After pane */
  afterContent?: React.ReactNode;
  /** Explicit slider position percentage (0 to 100). Overrides auto-animation. */
  sliderPosition?: number;
  /** Starting position percentage for animation (default: 10) */
  startPosition?: number;
  /** Target ending position percentage for animation (default: 90) */
  endPosition?: number;
  /** Motion style for slider movement (default: 'spring') */
  animationType?: 'linear' | 'spring' | 'ping-pong' | 'hold-and-reveal';
  /** Frame when slider motion starts (default: 0) */
  startFrame?: number;
  /** Duration in frames for slider sweep animation (default: 150) */
  durationInFrames?: number;
  /** Primary handle color (default: '#ffffff') */
  handleColor?: string;
  /** Divider line and handle arrow accent color (default: '#38bdf8') */
  handleAccentColor?: string;
  /** Width of divider line in pixels (default: 4) */
  dividerWidth?: number;
  /** Show text labels on panes (default: true) */
  showLabels?: boolean;
  /** Custom labels for Before and After (default: { before: 'BEFORE', after: 'AFTER' }) */
  labels?: { before?: string; after?: string };
  /** Position of labels (default: 'top') */
  labelPosition?: 'top' | 'bottom';
  /** Custom label badge styling overrides */
  labelStyle?: React.CSSProperties;
  /** Width of wrapper element (default: '100%') */
  width?: number | string;
  /** Height of wrapper element (default: '100%') */
  height?: number | string;
  /** Custom wrapper style overrides */
  style?: React.CSSProperties;
}

export const BeforeAfterSlider: React.FC<BeforeAfterSliderProps> = ({
  beforeImage,
  afterImage,
  beforeContent,
  afterContent,
  sliderPosition: explicitSliderPos,
  startPosition = 10,
  endPosition = 90,
  animationType = 'spring',
  startFrame = 0,
  durationInFrames = 150,
  handleColor = '#ffffff',
  handleAccentColor = '#38bdf8',
  dividerWidth = 4,
  showLabels = true,
  labels = { before: 'BEFORE', after: 'AFTER' },
  labelPosition = 'top',
  labelStyle,
  width = '100%',
  height = '100%',
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const localFrame = Math.max(0, frame - startFrame);

  // Compute slider position (0..100)
  let rawPos = startPosition;
  if (explicitSliderPos !== undefined) {
    rawPos = explicitSliderPos;
  } else if (animationType === 'spring') {
    const spr = spring({ frame: localFrame, fps, config: { damping: 16, mass: 0.8 } });
    rawPos = interpolate(spr, [0, 1], [startPosition, endPosition]);
  } else if (animationType === 'linear') {
    rawPos = interpolate(localFrame, [0, Math.max(1, durationInFrames)], [startPosition, endPosition], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
  } else if (animationType === 'ping-pong') {
    const norm = Math.sin((localFrame / Math.max(1, durationInFrames)) * Math.PI * 2) * 0.5 + 0.5;
    rawPos = interpolate(norm, [0, 1], [startPosition, endPosition]);
  } else if (animationType === 'hold-and-reveal') {
    const moveFrame = Math.max(0, localFrame - 15);
    const spr = spring({ frame: moveFrame, fps, config: { damping: 14, mass: 0.6 } });
    rawPos = interpolate(spr, [0, 1], [startPosition, endPosition]);
  }

  const currentPos = Math.min(100, Math.max(0, rawPos));

  const resolvePath = (src?: string) => {
    if (!src) return null;
    return src.startsWith('http://') || src.startsWith('https://') || src.startsWith('data:')
      ? src
      : staticFile(src);
  };

  const beforeSrc = resolvePath(beforeImage);
  const afterSrc = resolvePath(afterImage);

  const labelBefore = labels?.before ?? 'BEFORE';
  const labelAfter = labels?.after ?? 'AFTER';

  return (
    <div style={{ position: 'relative', width, height, overflow: 'hidden', backgroundColor: '#0f172a', ...style }}>
      {/* AFTER Pane (Full Width Background) */}
      <div style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
        {afterContent ? (
          afterContent
        ) : afterSrc ? (
          <Img src={afterSrc} alt="After" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)' }} />
        )}
      </div>

      {/* BEFORE Pane (Clipped Split Screen) */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          clipPath: `inset(0 ${100 - currentPos}% 0 0)`,
        }}
      >
        {beforeContent ? (
          beforeContent
        ) : beforeSrc ? (
          <Img src={beforeSrc} alt="Before" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #020617 0%, #1e1b4b 100%)' }} />
        )}
      </div>

      {/* Pane Labels */}
      {showLabels && (
        <>
          <div
            style={{
              position: 'absolute',
              left: 24,
              ...(labelPosition === 'top' ? { top: 24 } : { bottom: 24 }),
              padding: '6px 14px',
              backgroundColor: 'rgba(15, 23, 42, 0.85)',
              backdropFilter: 'blur(8px)',
              border: `1px solid ${handleAccentColor}`,
              borderRadius: 6,
              color: '#ffffff',
              fontSize: 13,
              fontWeight: 800,
              letterSpacing: '0.05em',
              zIndex: 70,
              pointerEvents: 'none',
              ...labelStyle,
            }}
          >
            {labelBefore}
          </div>
          <div
            style={{
              position: 'absolute',
              right: 24,
              ...(labelPosition === 'top' ? { top: 24 } : { bottom: 24 }),
              padding: '6px 14px',
              backgroundColor: 'rgba(15, 23, 42, 0.85)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: 6,
              color: '#ffffff',
              fontSize: 13,
              fontWeight: 800,
              letterSpacing: '0.05em',
              zIndex: 70,
              pointerEvents: 'none',
              ...labelStyle,
            }}
          >
            {labelAfter}
          </div>
        </>
      )}

      {/* Divider Bar & Handle */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: `${currentPos}%`,
          width: dividerWidth,
          backgroundColor: handleColor,
          transform: 'translateX(-50%)',
          boxShadow: '0 0 12px rgba(0, 0, 0, 0.6)',
          zIndex: 80,
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 44,
            height: 44,
            borderRadius: '50%',
            backgroundColor: handleColor,
            border: `3px solid ${handleAccentColor}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.4)',
          }}
        >
          {/* Double Chevron Horizontal Arrows SVG */}
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke={handleAccentColor}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="9 18 4 12 9 6" />
            <polyline points="15 18 20 12 15 6" />
          </svg>
        </div>
      </div>
    </div>
  );
};
