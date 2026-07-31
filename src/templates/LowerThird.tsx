import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig, Img, staticFile } from 'remotion';

export interface LowerThirdProps {
  /** Main title / presenter name */
  title: string;
  /** Subtitle / designation / callout */
  subtitle?: string;
  /** Social handle (e.g. '@remotion_app') */
  handle?: string;
  /** Optional avatar image path */
  avatarUrl?: string;
  /** Accent color (default: '#ffffff') */
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
  accentColor = '#ffffff',
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
    config: { damping: 16, mass: 0.6 },
  });

  // Exit spring animation (triggers during final 15 frames)
  const exitStart = Math.max(0, durationInFrames - 15);
  const exitFrame = Math.max(0, localFrame - exitStart);
  const exitSpr = localFrame >= exitStart
    ? spring({ frame: exitFrame, fps, config: { damping: 16, mass: 0.6 } })
    : 0;

  const opacity = interpolate(entranceSpr, [0, 1], [0, 1]) - interpolate(exitSpr, [0, 1], [0, 1]);
  const translateY = interpolate(entranceSpr, [0, 1], [20, 0]) + interpolate(exitSpr, [0, 1], [0, 20]);

  // Staggered title/subtitle entry
  const textSpr = spring({
    frame: Math.max(0, localFrame - 3),
    fps,
    config: { damping: 14, mass: 0.4 },
  });
  const textOpacity = interpolate(textSpr, [0, 1], [0, 1]);

  const resolvePath = (src?: string) => {
    if (!src) return null;
    return src.startsWith('http://') || src.startsWith('https://') || src.startsWith('data:')
      ? src
      : staticFile(src);
  };

  const avatarSrc = resolvePath(avatarUrl);

  return (
    <div
      style={{
        position: 'absolute',
        bottom: '10%',
        left: '6%',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '12px 20px',
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(12px)',
        borderRadius: 12,
        opacity: Math.max(0, opacity),
        transform: `translateY(${translateY}px)`,
        zIndex: 90,
        pointerEvents: 'none',
      }}
    >
      {avatarSrc && (
        <Img
          src={avatarSrc}
          alt={title}
          style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            objectFit: 'cover',
            border: '1px solid rgba(255, 255, 255, 0.3)',
          }}
        />
      )}
      <div style={{ display: 'flex', flexDirection: 'column', opacity: textOpacity }}>
        <div
          style={{
            fontSize: Math.max(18, Math.round(width * 0.02)),
            fontWeight: 700,
            color: '#ffffff',
            fontFamily: "'Outfit', 'Montserrat', 'system-ui', -apple-system, sans-serif",
            letterSpacing: '-0.01em',
            textShadow: '0 2px 8px rgba(0, 0, 0, 0.8)',
          }}
        >
          {title}
        </div>
        {(subtitle || handle) && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              fontSize: Math.max(13, Math.round(width * 0.013)),
              fontWeight: 400,
              color: 'rgba(255, 255, 255, 0.85)',
              fontFamily: "'Outfit', 'Montserrat', 'system-ui', -apple-system, sans-serif",
              marginTop: 2,
              textShadow: '0 1px 4px rgba(0, 0, 0, 0.8)',
            }}
          >
            {subtitle && <span>{subtitle}</span>}
            {handle && (
              <span
                style={{
                  color: 'rgba(255, 255, 255, 0.7)',
                  fontWeight: 500,
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

