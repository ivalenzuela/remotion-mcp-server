import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

export interface LowerThirdProps {
  /** Main title / presenter name */
  title: string;
  /** Subtitle / designation / callout */
  subtitle?: string;
  /** Social handle (e.g. '@remotion_app') */
  handle?: string;
  /** Optional avatar image path */
  avatarUrl?: string;
  /** Accent brand color */
  brandColor?: string;
  /** Alias for brandColor */
  accentColor?: string;
  /** Frame when lower third begins entrance (default: 0) */
  startFrame?: number;
  /** Total duration in frames before exit animation (default: 150) */
  durationInFrames?: number;
}

export const LowerThird: React.FC<LowerThirdProps> = ({
  title,
  subtitle,
  handle,
  avatarUrl,
  brandColor,
  accentColor = '#38bdf8',
  startFrame = 0,
  durationInFrames = 150,
}) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();

  const effectiveAccent = brandColor || accentColor;

  const localFrame = frame - startFrame;
  if (localFrame < 0) return null;

  // Entrance spring animation
  const entranceSpr = spring({
    frame: localFrame,
    fps,
    config: { damping: 14, mass: 0.5 },
  });

  // Exit spring animation (triggers during final 15 frames)
  const exitStart = Math.max(0, durationInFrames - 15);
  const exitFrame = Math.max(0, localFrame - exitStart);
  const exitSpr = localFrame >= exitStart
    ? spring({ frame: exitFrame, fps, config: { damping: 15, mass: 0.5 } })
    : 0;

  const opacity = interpolate(entranceSpr, [0, 1], [0, 1]) - interpolate(exitSpr, [0, 1], [0, 1]);
  const translateX = interpolate(entranceSpr, [0, 1], [-120, 0]) + interpolate(exitSpr, [0, 1], [0, -120]);

  // Staggered title/subtitle entry
  const textSpr = spring({
    frame: Math.max(0, localFrame - 3),
    fps,
    config: { damping: 12, mass: 0.4 },
  });
  const textOpacity = interpolate(textSpr, [0, 1], [0, 1]);

  return (
    <div
      style={{
        position: 'absolute',
        bottom: '12%',
        left: '5%',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '16px 28px',
        backgroundColor: 'rgba(15, 23, 42, 0.92)',
        backdropFilter: 'blur(14px)',
        borderLeft: `5px solid ${effectiveAccent}`,
        borderRadius: '0 16px 16px 0',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
        opacity: Math.max(0, opacity),
        transform: `translateX(${translateX}px)`,
        zIndex: 90,
        pointerEvents: 'none',
      }}
    >
      {avatarUrl && (
        <img
          src={avatarUrl}
          alt={title}
          style={{
            width: 52,
            height: 52,
            borderRadius: '50%',
            objectFit: 'cover',
            border: `2px solid ${effectiveAccent}`,
          }}
        />
      )}
      <div style={{ display: 'flex', flexDirection: 'column', opacity: textOpacity }}>
        <div
          style={{
            fontSize: width * 0.022,
            fontWeight: 800,
            color: '#ffffff',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            letterSpacing: '-0.02em',
          }}
        >
          {title}
        </div>
        {(subtitle || handle) && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              fontSize: width * 0.014,
              fontWeight: 500,
              color: 'rgba(255, 255, 255, 0.85)',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              marginTop: 4,
            }}
          >
            {subtitle && <span>{subtitle}</span>}
            {handle && (
              <span
                style={{
                  backgroundColor: effectiveAccent,
                  color: '#000000',
                  fontSize: 13,
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 4,
                }}
              >
                {handle}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
