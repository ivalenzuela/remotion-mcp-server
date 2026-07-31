import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { useAudioData, visualizeAudio } from '@remotion/media-utils';

export interface AudioSpectrumProps {
  /** Optional path or URL to audio asset */
  audioSrc?: string;
  /** Number of reactive bars to render (default: 24) */
  barCount?: number;
  /** Width of each bar in pixels */
  barWidth?: number;
  /** Gap distance between bars in pixels (default: 6) */
  barGap?: number;
  /** Maximum bar height in pixels (default: 120) */
  height?: number;
  /** Primary bar fill color */
  barColor?: string;
  /** Alias for barColor */
  accentColor?: string;
  /** Neon glow shadow color */
  glowColor?: string;
  /** Visual arrangement mode ('bars' | 'mirror' | 'wave') */
  mode?: 'bars' | 'mirror' | 'wave';
}

const RealAudioSpectrum: React.FC<AudioSpectrumProps & { audioSrc: string }> = ({
  audioSrc,
  barCount = 24,
  barWidth,
  barGap = 6,
  height = 80,
  barColor,
  accentColor = '#ffffff',
  glowColor,
  mode = 'bars',
}) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();

  const effectiveColor = barColor || accentColor;
  const computedBarWidth = barWidth || Math.max(4, Math.floor(width / (barCount * 3)));

  const audioData = useAudioData(audioSrc);
  let samples: number[] = [];

  if (audioData) {
    try {
      const visualization = visualizeAudio({
        fps,
        frame,
        audioData,
        numberOfSamples: barCount,
      });
      samples = visualization.map((v) => Math.max(0.05, v));
    } catch {
      samples = [];
    }
  }

  if (samples.length === 0) {
    samples = Array.from({ length: barCount }).map((_, i) => {
      const val = Math.abs(
        Math.sin(frame * 0.15 + i * 0.4) * 0.7 + Math.cos(frame * 0.08 - i * 0.25) * 0.3
      );
      return Math.max(0.08, val);
    });
  }

  return (
    <div
      style={{
        position: 'absolute',
        bottom: '8%',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: barGap,
        alignItems: mode === 'mirror' ? 'center' : 'flex-end',
        height,
        padding: '0 20px',
        zIndex: 40,
        pointerEvents: 'none',
      }}
    >
      {samples.map((v, i) => (
        <div
          key={i}
          style={{
            width: computedBarWidth,
            height: Math.max(6, v * height),
            backgroundColor: effectiveColor,
            borderRadius: computedBarWidth / 2,
            boxShadow: glowColor ? `0 0 10px ${glowColor}` : undefined,
            transition: 'height 0.05s ease-out',
          }}
        />
      ))}
    </div>
  );
};

export const AudioSpectrum: React.FC<AudioSpectrumProps> = (props) => {
  const {
    audioSrc,
    barCount = 24,
    barWidth,
    barGap = 6,
    height = 80,
    barColor,
    accentColor = '#ffffff',
    glowColor,
    mode = 'bars',
  } = props;

  const frame = useCurrentFrame();
  const { width } = useVideoConfig();

  if (audioSrc && audioSrc.trim().length > 0) {
    return <RealAudioSpectrum {...props} audioSrc={audioSrc} />;
  }

  const effectiveColor = barColor || accentColor;
  const computedBarWidth = barWidth || Math.max(4, Math.floor(width / (barCount * 3)));

  const samples = Array.from({ length: barCount }).map((_, i) => {
    const val = Math.abs(
      Math.sin(frame * 0.15 + i * 0.4) * 0.7 + Math.cos(frame * 0.08 - i * 0.25) * 0.3
    );
    return Math.max(0.08, val);
  });

  return (
    <div
      style={{
        position: 'absolute',
        bottom: '8%',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: barGap,
        alignItems: mode === 'mirror' ? 'center' : 'flex-end',
        height,
        padding: '0 20px',
        zIndex: 40,
        pointerEvents: 'none',
      }}
    >
      {samples.map((v, i) => (
        <div
          key={i}
          style={{
            width: computedBarWidth,
            height: Math.max(6, v * height),
            backgroundColor: effectiveColor,
            borderRadius: computedBarWidth / 2,
            boxShadow: glowColor ? `0 0 10px ${glowColor}` : undefined,
            transition: 'height 0.05s ease-out',
          }}
        />
      ))}
    </div>
  );
};
