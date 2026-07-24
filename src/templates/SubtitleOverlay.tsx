import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

export interface WordTimecode {
  word?: string;
  text?: string;
  startFrame?: number;
  endFrame?: number;
  startTimeInSeconds?: number;
  endTimeInSeconds?: number;
  fromFrame?: number;
  toFrame?: number;
  durationInFrames?: number;
}

export interface SubtitleItem {
  id?: number;
  fromFrame: number;
  toFrame: number;
  durationInFrames?: number;
  startTimeInSeconds?: number;
  endTimeInSeconds?: number;
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
  /** Base font size in px for primary subtitle */
  fontSize?: number;
  /** Font size ratio relative to minimum screen dimension (default: 0.045) */
  fontSizeRatio?: number;
  /** Highlight color for active word (default: '#ffe600') */
  activeColor?: string;
  /** Color for spoken/past words (default: '#ffffff') */
  spokenColor?: string;
  /** Color for non-active or upcoming words (default: 'rgba(255, 255, 255, 0.4)') */
  inactiveColor?: string;
  /** Glow shadow color for active word (default: '#ffe600') */
  glowColor?: string;
  /** Custom font family string */
  fontFamily?: string;
  /** Enable Google Fonts injection (Outfit & Montserrat) */
  injectFonts?: boolean;
}

export const SubtitleOverlay: React.FC<SubtitleOverlayProps> = ({
  wordTimecodes,
  subtitles,
  position = 'lower-center',
  positionBottom,
  fontSize: customFontSize,
  fontSizeRatio = 0.045,
  activeColor = '#ffe600',
  spokenColor = '#ffffff',
  inactiveColor = 'rgba(255, 255, 255, 0.4)',
  glowColor = '#ffe600',
  fontFamily = "'Outfit', 'Montserrat', 'system-ui', -apple-system, sans-serif",
  injectFonts = true,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const fontSize = customFontSize || Math.min(width, height) * fontSizeRatio;
  const secondaryFontSize = Math.max(14, Math.round(fontSize * 0.6));

  // 1. Resolve inputs
  let effectiveWordTimecodes: WordTimecode[] | undefined = wordTimecodes;
  if (!effectiveWordTimecodes && Array.isArray(subtitles)) {
    if (subtitles.length > 0 && ('word' in subtitles[0] || 'text' in subtitles[0]) && !('fromFrame' in subtitles[0])) {
      effectiveWordTimecodes = subtitles as WordTimecode[];
    }
  }

  // MODE 1: Precision Word Timecodes ("Efecto Lupa PRO")
  if (effectiveWordTimecodes && effectiveWordTimecodes.length > 0) {
    const activeWordIndex = effectiveWordTimecodes.findIndex((w) => {
      const s = w.startFrame ?? w.fromFrame ?? 0;
      const e = w.endFrame ?? w.toFrame ?? 0;
      return frame >= s && frame <= e;
    });

    const activeIdx = activeWordIndex !== -1 ? activeWordIndex : 0;
    const windowSize = 6;
    const windowStart = Math.floor(activeIdx / windowSize) * windowSize;
    const visibleWords = effectiveWordTimecodes.slice(windowStart, windowStart + windowSize);

    const firstWordInWindow = visibleWords[0];
    const windowStartFrame = firstWordInWindow?.startFrame ?? firstWordInWindow?.fromFrame ?? 0;
    const localFrame = Math.max(0, frame - windowStartFrame);

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
      ? { bottom: 45, left: 0, right: 0 }
      : { top: '50%', left: '50%', transform: `translate(-50%, -50%) translateY(${translateY}px)` };

    return (
      <div
        className="font-pro-master"
        style={{
          position: 'absolute',
          ...positionStyle,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 40px',
          opacity,
          transform: position === 'lower-center' || positionBottom !== undefined ? `translateY(${translateY}px)` : undefined,
          zIndex: 100,
          pointerEvents: 'none',
          width: '100%',
        }}
      >
        {injectFonts && (
          <style>
            {`
              @import url('https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,100..900;1,100..900&family=Outfit:wght@100..900&display=swap');
              .font-pro-master {
                font-family: ${fontFamily} !important;
              }
            `}
          </style>
        )}

        <div
          style={{
            fontSize,
            fontWeight: 900,
            fontFamily,
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '6px 12px',
            textAlign: 'center',
            width: '100%',
            maxWidth: '95%',
            lineHeight: 1.4,
            letterSpacing: '-0.3px',
          }}
        >
          {visibleWords.map((wt, idx) => {
            const s = wt.startFrame ?? wt.fromFrame ?? 0;
            const e = wt.endFrame ?? wt.toFrame ?? 0;
            const wordText = wt.word || wt.text || '';
            const isCurrent = frame >= s && frame <= e;
            const isPast = frame > e;

            const wordLocalFrame = Math.max(0, frame - s);
            const wordSpring = spring({
              frame: wordLocalFrame,
              fps,
              config: { damping: 18, mass: 0.4, stiffness: 120 },
            });

            const scale = isCurrent ? interpolate(wordSpring, [0, 1], [1.0, 1.12]) : 1.0;
            const yOffset = isCurrent ? interpolate(wordSpring, [0, 1], [0, -3]) : 0;
            const color = isCurrent ? activeColor : isPast ? spokenColor : inactiveColor;

            return (
              <span
                key={`${wordText}-${idx}`}
                style={{
                  color,
                  transform: `scale(${scale}) translateY(${yOffset}px)`,
                  textShadow: isCurrent
                    ? `0 0 20px ${glowColor}, 0 2px 6px rgba(0,0,0,1), -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000`
                    : '0 2px 6px rgba(0,0,0,1), -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000',
                  display: 'inline-block',
                  padding: '0 2px',
                  fontWeight: 900,
                  transition: 'color 0.15s ease-out, transform 0.15s ease-out',
                }}
              >
                {wordText}
              </span>
            );
          })}
        </div>
      </div>
    );
  }

  // MODE 2: Bilingual / Phrase Subtitle Overlay (Matching Sony Vegas Video Remotion Architecture)
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

  const translateY = interpolate(containerSpr, [0, 1], [15, 0]);
  const progress = Math.min(1, Math.max(0, currentFrameInSub / subDuration));

  // Determine English vs Spanish text & words
  const textEn = activeSub.textEn || activeSub.text || '';
  const textEs = activeSub.textEs || activeSub.text || '';
  const wordsEn = activeSub.words;
  const wordsEs = textEs.split(' ');

  // Calculate active word index in English (timecode-based or proportional fallback)
  let activeWordIdxEn = 0;
  if (wordsEn && wordsEn.length > 0) {
    const firstWordStart = wordsEn[0].fromFrame ?? wordsEn[0].startFrame ?? activeSub.fromFrame;
    if (frame < firstWordStart) {
      activeWordIdxEn = 0;
    } else {
      activeWordIdxEn = wordsEn.findIndex((w) => {
        const s = w.fromFrame ?? w.startFrame ?? 0;
        const e = w.toFrame ?? w.endFrame ?? 0;
        return frame >= s && frame <= e;
      });
      if (activeWordIdxEn === -1) {
        const lastSpoken = wordsEn.filter((w) => frame > (w.toFrame ?? w.endFrame ?? 0)).length;
        activeWordIdxEn = Math.min(wordsEn.length - 1, lastSpoken);
      }
    }
  } else {
    const wordsEnFallback = textEn.split(' ');
    activeWordIdxEn = Math.min(wordsEnFallback.length - 1, Math.floor(progress * wordsEnFallback.length));
  }

  // Cross-language proportional mapping for Spanish words
  const totalEnCount = wordsEn ? wordsEn.length : textEn.split(' ').length;
  const activeWordIdxEs = totalEnCount > 1
    ? Math.min(wordsEs.length - 1, Math.floor((activeWordIdxEn / (totalEnCount - 1)) * wordsEs.length))
    : 0;

  const hasDualLanguage = Boolean(activeSub.textEn && activeSub.textEs && activeSub.textEn !== activeSub.textEs);

  return (
    <div
      className="font-pro-master"
      style={{
        position: 'absolute',
        bottom: positionBottom !== undefined ? positionBottom : 45,
        left: 0,
        right: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        pointerEvents: 'none',
        padding: '0 40px',
        opacity,
        transform: `translateY(${translateY}px)`,
        width: '100%',
      }}
    >
      {injectFonts && (
        <style>
          {`
            @import url('https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,100..900;1,100..900&family=Outfit:wght@100..900&display=swap');
            .font-pro-master {
              font-family: ${fontFamily} !important;
            }
          `}
        </style>
      )}

      {/* 1. Secondary Subtitle (English - Fixed / Flat Overlay) */}
      {hasDualLanguage && (
        <div
          style={{
            fontSize: secondaryFontSize,
            fontWeight: 700,
            marginBottom: 10,
            color: 'rgba(255, 255, 255, 0.75)',
            textShadow: '0 2px 6px rgba(0,0,0,0.9), -1.5px -1.5px 0 #000, 1.5px -1.5px 0 #000, -1.5px 1.5px 0 #000, 1.5px 1.5px 0 #000',
            maxWidth: '90%',
            textAlign: 'center',
            lineHeight: 1.3,
            letterSpacing: '0.4px',
          }}
        >
          {textEn}
        </div>
      )}

      {/* 2. Primary Subtitle (Spanish - Proportional Word Karaoke Highlighting) */}
      <div
        style={{
          fontSize,
          fontWeight: 900,
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          alignItems: 'center',
          lineHeight: 1.4,
          letterSpacing: '-0.3px',
          width: '100%',
          maxWidth: '95%',
          textAlign: 'center',
          gap: '4px 10px',
        }}
      >
        {wordsEs.map((word, i) => {
          const isHighlighted = i <= activeWordIdxEs;
          const isCurrent = i === activeWordIdxEs;

          const esStartFrame = wordsEn && wordsEn[activeWordIdxEn]
            ? (wordsEn[activeWordIdxEn].fromFrame ?? wordsEn[activeWordIdxEn].startFrame ?? activeSub.fromFrame)
            : activeSub.fromFrame;

          let scale = 1.0;
          let yOffset = 0;

          if (isCurrent) {
            const sprEs = spring({
              frame: frame - esStartFrame,
              fps,
              config: { damping: 18, mass: 0.4, stiffness: 120 },
            });
            scale = interpolate(sprEs, [0, 1], [1.0, 1.10]);
            yOffset = interpolate(sprEs, [0, 1], [0, -3]);
          }

          const color = isCurrent
            ? activeColor
            : isHighlighted
              ? spokenColor
              : inactiveColor;

          return (
            <span
              key={i}
              style={{
                color,
                textShadow: isCurrent
                  ? `0 0 20px ${glowColor}, 0 2px 6px rgba(0,0,0,1), -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000`
                  : '0 2px 6px rgba(0,0,0,1), -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000',
                transform: `scale(${scale}) translateY(${yOffset}px)`,
                display: 'inline-block',
                padding: '0 2px',
                fontWeight: 900,
                transition: 'color 0.15s ease-out, transform 0.15s ease-out',
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
