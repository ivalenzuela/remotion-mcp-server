import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

export interface WordTimecode {
  word: string;
  startFrame: number;
  endFrame: number;
}

export interface SubtitleItem {
  id?: number;
  fromFrame: number;
  toFrame: number;
  durationInFrames?: number;
  textEn?: string;
  textEs?: string;
  text?: string;
  words?: WordTimecode[];
}

export interface SubtitleOverlayProps {
  /** Array of word timecodes from TTS or alignment generator */
  wordTimecodes?: WordTimecode[];
  /** Subtitles array (accepts WordTimecode[] or SubtitleItem[]) */
  subtitles?: WordTimecode[] | SubtitleItem[];
  /** Subtitle container vertical alignment / position */
  position?: 'lower-center' | 'center';
  /** Vertical distance from bottom (px) when positionBottom is explicitly passed */
  positionBottom?: number;
  /** Base font size in px */
  fontSize?: number;
  /** Font size ratio relative to minimum screen dimension (default: 0.045) */
  fontSizeRatio?: number;
  /** Highlight color for active word (default: '#ffe600') */
  activeColor?: string;
  /** Color for non-active or upcoming words */
  inactiveColor?: string;
  /** Yellow glow shadow color (default: '#ffe600') */
  glowColor?: string;
  /** Custom font family string */
  fontFamily?: string;
}

export const SubtitleOverlay: React.FC<SubtitleOverlayProps> = ({
  wordTimecodes,
  subtitles,
  position = 'lower-center',
  positionBottom,
  fontSize: customFontSize,
  fontSizeRatio = 0.045,
  activeColor = '#ffe600',
  inactiveColor = 'rgba(255, 255, 255, 0.5)',
  glowColor = '#ffe600',
  fontFamily = 'system-ui, -apple-system, sans-serif',
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const fontSize = customFontSize || Math.min(width, height) * fontSizeRatio;

  // Resolve wordTimecodes input
  let effectiveWordTimecodes: WordTimecode[] | undefined = wordTimecodes;

  if (!effectiveWordTimecodes && Array.isArray(subtitles)) {
    if (subtitles.length > 0 && 'word' in subtitles[0]) {
      effectiveWordTimecodes = subtitles as WordTimecode[];
    }
  }

  // MODE 1: Precision Word Timecodes ("Efecto Lupa PRO")
  if (effectiveWordTimecodes && effectiveWordTimecodes.length > 0) {
    const activeWordIndex = effectiveWordTimecodes.findIndex(
      (w) => frame >= w.startFrame && frame <= w.endFrame
    );

    // If no word active at frame 0 or gaps, display active or nearest window
    const activeIdx = activeWordIndex !== -1 ? activeWordIndex : 0;
    const windowSize = 6;
    const windowStart = Math.floor(activeIdx / windowSize) * windowSize;
    const visibleWords = effectiveWordTimecodes.slice(windowStart, windowStart + windowSize);

    const firstWordInWindow = visibleWords[0];
    const localFrame = Math.max(0, frame - (firstWordInWindow?.startFrame ?? 0));

    const containerSpring = spring({
      frame: localFrame,
      fps,
      config: { damping: 14, mass: 0.4 },
    });

    const opacity = interpolate(containerSpring, [0, 1], [0, 1]);
    const translateY = interpolate(containerSpring, [0, 1], [15, 0]);

    const positionStyle: React.CSSProperties = positionBottom !== undefined
      ? { bottom: positionBottom, left: 0, right: 0 }
      : position === 'lower-center'
      ? { bottom: '18%', left: '50%', transform: `translateX(-50%) translateY(${translateY}px)` }
      : { top: '50%', left: '50%', transform: `translate(-50%, -50%) translateY(${translateY}px)` };

    return (
      <div
        style={{
          position: 'absolute',
          ...positionStyle,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '0 40px',
          opacity,
          zIndex: 100,
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            fontSize,
            fontWeight: 900,
            fontFamily,
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: '10px 14px',
            textAlign: 'center',
          }}
        >
          {visibleWords.map((wt, idx) => {
            const isCurrent = frame >= wt.startFrame && frame <= wt.endFrame;
            const isPast = frame > wt.endFrame;

            const wordLocalFrame = Math.max(0, frame - wt.startFrame);
            const wordSpring = spring({
              frame: wordLocalFrame,
              fps,
              config: { damping: 12, mass: 0.3 },
            });

            // 1.35x spring scale on active word
            const scale = isCurrent ? interpolate(wordSpring, [0, 1], [1.0, 1.35]) : 1.0;
            const color = isCurrent ? activeColor : isPast ? '#ffffff' : inactiveColor;

            return (
              <span
                key={`${wt.word}-${idx}`}
                style={{
                  color,
                  transform: `scale(${scale})`,
                  textShadow: isCurrent
                    ? `0 0 25px ${glowColor}, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000`
                    : '0 2px 8px rgba(0,0,0,0.9), -2px -2px 0 #000, 2px -2px 0 #000',
                  display: 'inline-block',
                }}
              >
                {wt.word}
              </span>
            );
          })}
        </div>
      </div>
    );
  }

  // MODE 2: Phrase-level SubtitleItem fallback
  if (!subtitles || subtitles.length === 0) return null;

  const phraseSubtitles = subtitles as SubtitleItem[];
  const activeSub = phraseSubtitles.find(
    (sub) => frame >= sub.fromFrame && frame <= sub.toFrame
  );

  if (!activeSub) return null;

  const currentFrameInSub = frame - activeSub.fromFrame;
  const subDuration = activeSub.durationInFrames || Math.max(1, activeSub.toFrame - activeSub.fromFrame);

  const containerSpr = spring({
    frame: currentFrameInSub,
    fps,
    config: { damping: 14, mass: 0.4 },
  });

  const opacity = interpolate(
    currentFrameInSub,
    [0, 4, Math.max(5, subDuration - 4), subDuration],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  const translateY = interpolate(containerSpr, [0, 1], [20, 0]);
  const progress = Math.min(1, Math.max(0, currentFrameInSub / subDuration));
  const words = (activeSub.textEs || activeSub.textEn || activeSub.text || '').split(' ');
  const activeWordIdx = Math.min(words.length - 1, Math.floor(progress * words.length));

  return (
    <div
      style={{
        position: 'absolute',
        bottom: positionBottom !== undefined ? positionBottom : '18%',
        left: 0,
        right: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        opacity,
        transform: `translateY(${translateY}px)`,
        padding: '0 40px',
        zIndex: 100,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          fontSize,
          fontWeight: 900,
          fontFamily,
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: '8px 12px',
          textAlign: 'center',
        }}
      >
        {words.map((word, i) => {
          const isCurrent = i === activeWordIdx;
          const isHighlighted = i <= activeWordIdx;
          const scale = isCurrent ? 1.35 : 1.0;
          const color = isHighlighted ? activeColor : inactiveColor;

          return (
            <span
              key={i}
              style={{
                color,
                transform: `scale(${scale})`,
                textShadow: isCurrent
                  ? `0 0 25px ${glowColor}, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000`
                  : '0 2px 8px rgba(0,0,0,0.9), -2px -2px 0 #000, 2px -2px 0 #000',
                display: 'inline-block',
              }}
            >
              {word}
            </span>
          );
        })}
      </div>
    </div>
  );
};
