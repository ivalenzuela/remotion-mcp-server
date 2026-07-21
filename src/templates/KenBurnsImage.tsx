import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig, Img, staticFile } from 'remotion';

export type PanDirection =
  | 'top-left-to-bottom-right'
  | 'bottom-right-to-top-left'
  | 'top-right-to-bottom-left'
  | 'bottom-left-to-top-right'
  | 'center-zoom-in'
  | 'center-zoom-out'
  | 'pan-left'
  | 'pan-right'
  | 'pan-up'
  | 'pan-down'
  | 'in'
  | 'out';

export interface KenBurnsImageProps {
  /** Image source URL or static path inside public/ directory */
  src?: string;
  /** Alias for src */
  imageSrc?: string;
  /** Total duration in frames for progress normalization */
  durationInFrames: number;
  /** Initial scale factor (default: 1.0) */
  startScale?: number;
  /** Target scale factor (default: 1.18) */
  endScale?: number;
  /** Movement pan vector / direction */
  direction?: PanDirection;
  /** Offset distance in pixels for pan movements (default: 30) */
  panDistance?: number;
  /** Enable natural spring easing for progress acceleration */
  enableSpringEasing?: boolean;
  /** Optional background overlay color string (e.g. 'rgba(0,0,0,0.4)') */
  overlayColor?: string;
  /** Optional background overlay opacity decimal (0.0 to 1.0) */
  overlayOpacity?: number;
  /** Image alt accessibility description */
  alt?: string;
  /** Custom wrapper CSS properties */
  style?: React.CSSProperties;
}

export const KenBurnsImage: React.FC<KenBurnsImageProps> = ({
  src,
  imageSrc,
  durationInFrames,
  startScale = 1.0,
  endScale = 1.18,
  direction = 'in',
  panDistance = 30,
  enableSpringEasing = false,
  overlayColor,
  overlayOpacity,
  alt = 'Ken Burns Image',
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const effectiveSrc = src || imageSrc;

  let progress: number;
  if (enableSpringEasing) {
    progress = spring({
      frame,
      fps,
      config: { damping: 18, mass: 0.8 },
    });
  } else {
    progress = interpolate(frame, [0, Math.max(1, durationInFrames)], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
  }

  let scale = 1;
  let startX = 0;
  let endX = 0;
  let startY = 0;
  let endY = 0;

  if (direction === 'in' || direction === 'center-zoom-in') {
    scale = interpolate(progress, [0, 1], [startScale, endScale]);
  } else if (direction === 'out' || direction === 'center-zoom-out') {
    scale = interpolate(progress, [0, 1], [endScale, startScale]);
  } else if (direction === 'top-left-to-bottom-right') {
    scale = interpolate(progress, [0, 1], [startScale, endScale]);
    startX = -panDistance;
    endX = panDistance;
    startY = -panDistance;
    endY = panDistance;
  } else if (direction === 'bottom-right-to-top-left') {
    scale = interpolate(progress, [0, 1], [startScale, endScale]);
    startX = panDistance;
    endX = -panDistance;
    startY = panDistance;
    endY = -panDistance;
  } else if (direction === 'top-right-to-bottom-left') {
    scale = interpolate(progress, [0, 1], [startScale, endScale]);
    startX = panDistance;
    endX = -panDistance;
    startY = -panDistance;
    endY = panDistance;
  } else if (direction === 'bottom-left-to-top-right') {
    scale = interpolate(progress, [0, 1], [startScale, endScale]);
    startX = -panDistance;
    endX = panDistance;
    startY = panDistance;
    endY = -panDistance;
  } else if (direction === 'pan-left') {
    scale = endScale;
    startX = panDistance;
    endX = -panDistance;
  } else if (direction === 'pan-right') {
    scale = endScale;
    startX = -panDistance;
    endX = panDistance;
  } else if (direction === 'pan-up') {
    scale = endScale;
    startY = panDistance;
    endY = -panDistance;
  } else if (direction === 'pan-down') {
    scale = endScale;
    startY = -panDistance;
    endY = panDistance;
  } else {
    scale = interpolate(progress, [0, 1], [startScale, endScale]);
  }

  const translateX = interpolate(progress, [0, 1], [startX, endX]);
  const translateY = interpolate(progress, [0, 1], [startY, endY]);

  const resolvedSrc = effectiveSrc
    ? effectiveSrc.startsWith('http://') || effectiveSrc.startsWith('https://') || effectiveSrc.startsWith('data:')
      ? effectiveSrc
      : staticFile(effectiveSrc)
    : null;

  const bgOverlay = overlayColor
    ? overlayColor
    : overlayOpacity !== undefined
    ? `rgba(0, 0, 0, ${overlayOpacity})`
    : undefined;

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        position: 'relative',
        backgroundColor: '#090d16',
        ...style,
      }}
    >
      {resolvedSrc ? (
        <Img
          src={resolvedSrc}
          alt={alt}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: `translate3d(${translateX}px, ${translateY}px, 0px) scale(${scale})`,
            willChange: 'transform',
          }}
        />
      ) : (
        <div
          style={{
            width: '100%',
            height: '100%',
            background: 'radial-gradient(circle at 50% 40%, #1e293b 0%, #0f172a 70%, #020617 100%)',
            transform: `translate3d(${translateX}px, ${translateY}px, 0px) scale(${scale})`,
          }}
        />
      )}
      {bgOverlay && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: bgOverlay,
            pointerEvents: 'none',
          }}
        />
      )}
    </div>
  );
};
