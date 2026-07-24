import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig, Img, staticFile } from 'remotion';

export interface TrustBadgeProps {
  /** Numerical score (default: 5.0) */
  rating?: number;
  /** Max rating scale (default: 5) */
  maxRating?: number;
  /** Review count or customer count label (e.g. '1,000+ happy users') */
  reviewCount?: string | number;
  /** Primary headline badge text (default: 'Rated 5 Stars by Top Brands') */
  badgeText?: string;
  /** Secondary subtitle string */
  subtitle?: string;
  /** Array of avatar image URLs for social proof stack */
  avatarUrls?: string[];
  /** Maximum number of stacked avatars to render (default: 4) */
  maxAvatars?: number;
  /** Built-in trust icon type (default: 'star') */
  icon?: 'star' | 'shield' | 'check' | 'heart' | 'trophy' | 'custom';
  /** Custom SVG node if icon is 'custom' */
  customIcon?: React.ReactNode;
  /** Enable glassmorphism frosted background (default: true) */
  glassmorphism?: boolean;
  /** Background color (default: 'rgba(15, 23, 42, 0.88)') */
  backgroundColor?: string;
  /** Text color (default: '#ffffff') */
  textColor?: string;
  /** Star rating & highlight accent color (default: '#f59e0b') */
  accentColor?: string;
  /** Position preset on video canvas (default: 'top-left') */
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top-center' | 'bottom-center' | 'custom';
  /** Entrance animation style (default: 'pop-in') */
  animationType?: 'pop-in' | 'slide-in' | 'fade-in' | 'bounce';
  /** Frame when badge enters (default: 0) */
  startFrame?: number;
  /** Total duration in frames before exit animation (default: 150) */
  durationInFrames?: number;
  /** Enable automatic spring exit animation during final 15 frames (default: true) */
  enableExitAnimation?: boolean;
  /** Custom wrapper style overrides */
  style?: React.CSSProperties;
}

export const TrustBadge: React.FC<TrustBadgeProps> = ({
  rating = 5.0,
  maxRating = 5,
  reviewCount,
  badgeText = 'Rated 5 Stars by Top Brands',
  subtitle,
  avatarUrls = [],
  maxAvatars = 4,
  icon = 'star',
  customIcon,
  glassmorphism = true,
  backgroundColor = 'rgba(15, 23, 42, 0.88)',
  textColor = '#ffffff',
  accentColor = '#f59e0b',
  position = 'top-left',
  animationType = 'pop-in',
  startFrame = 0,
  durationInFrames = 150,
  enableExitAnimation = true,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const localFrame = frame - startFrame;
  if (localFrame < 0) return null;

  // Entrance spring animation
  const entranceSpr = spring({
    frame: localFrame,
    fps,
    config: animationType === 'bounce' ? { damping: 8, mass: 0.5 } : { damping: 14, mass: 0.5 },
  });

  // Exit spring animation
  const exitStart = Math.max(0, durationInFrames - 15);
  const exitFrame = Math.max(0, localFrame - exitStart);
  const exitSpr =
    enableExitAnimation && localFrame >= exitStart
      ? spring({ frame: exitFrame, fps, config: { damping: 14, mass: 0.5 } })
      : 0;

  const opacity = interpolate(entranceSpr, [0, 1], [0, 1]) - interpolate(exitSpr, [0, 1], [0, 1]);

  let transformStr = '';
  if (animationType === 'pop-in' || animationType === 'bounce') {
    const scale = interpolate(entranceSpr, [0, 1], [0.7, 1.0]) - interpolate(exitSpr, [0, 1], [0, 0.2]);
    transformStr = `scale(${Math.max(0, scale)})`;
  } else if (animationType === 'slide-in') {
    const translateY = interpolate(entranceSpr, [0, 1], [-30, 0]) + interpolate(exitSpr, [0, 1], [0, -30]);
    transformStr = `translateY(${translateY}px)`;
  } else {
    transformStr = 'scale(1)';
  }

  // Position presets
  const getPositionStyle = (): React.CSSProperties => {
    switch (position) {
      case 'top-left':
        return { position: 'absolute', top: '6%', left: '5%' };
      case 'top-right':
        return { position: 'absolute', top: '6%', right: '5%' };
      case 'bottom-left':
        return { position: 'absolute', bottom: '6%', left: '5%' };
      case 'bottom-right':
        return { position: 'absolute', bottom: '6%', right: '5%' };
      case 'top-center':
        return { position: 'absolute', top: '6%', left: '50%' };
      case 'bottom-center':
        return { position: 'absolute', bottom: '6%', left: '50%' };
      default:
        return { position: 'relative' };
    }
  };

  const isCentered = position === 'top-center' || position === 'bottom-center';
  const finalTransform = isCentered ? `translateX(-50%) ${transformStr}` : transformStr;

  const resolvePath = (src: string) => {
    return src.startsWith('http://') || src.startsWith('https://') || src.startsWith('data:')
      ? src
      : staticFile(src);
  };

  const renderStars = () => {
    const stars = [];
    for (let i = 1; i <= maxRating; i++) {
      const isFilled = rating >= i;
      const isHalf = !isFilled && rating >= i - 0.5;
      stars.push(
        <svg
          key={i}
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill={isFilled ? accentColor : isHalf ? `url(#trustBadgeHalfGrad-${i})` : 'none'}
          stroke={accentColor}
          strokeWidth="2"
        >
          {isHalf && (
            <defs>
              <linearGradient id={`trustBadgeHalfGrad-${i}`}>
                <stop offset="50%" stopColor={accentColor} />
                <stop offset="50%" stopColor={accentColor} stopOpacity={0} />
              </linearGradient>
            </defs>
          )}
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      );
    }
    return stars;
  };

  const renderHeaderIcon = () => {
    if (icon === 'custom' && customIcon) return customIcon;
    if (icon === 'shield') {
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      );
    }
    if (icon === 'check') {
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      );
    }
    if (icon === 'heart') {
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill={accentColor} stroke={accentColor} strokeWidth="2">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l8.78-8.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      );
    }
    if (icon === 'trophy') {
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
          <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
          <path d="M4 22h16" />
          <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
          <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
          <path d="M18 2H6v7a6 6 0 0 0 12 0V2z" />
        </svg>
      );
    }
    return null;
  };

  const visibleAvatars = avatarUrls.slice(0, maxAvatars);
  const remainingAvatars = avatarUrls.length - maxAvatars;

  return (
    <div
      style={{
        ...getPositionStyle(),
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '12px 20px',
        backgroundColor,
        backdropFilter: glassmorphism ? 'blur(14px)' : undefined,
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: 16,
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.45)',
        opacity: Math.max(0, opacity),
        transform: finalTransform,
        zIndex: 90,
        pointerEvents: 'none',
        ...style,
      }}
    >
      {/* Avatar Stack */}
      {visibleAvatars.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {visibleAvatars.map((url, i) => (
            <Img
              key={i}
              src={resolvePath(url)}
              alt="User Avatar"
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                objectFit: 'cover',
                border: `2px solid ${backgroundColor}`,
                marginLeft: i > 0 ? -10 : 0,
              }}
            />
          ))}
          {remainingAvatars > 0 && (
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                backgroundColor: accentColor,
                color: '#000000',
                fontSize: 12,
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginLeft: -10,
                border: `2px solid ${backgroundColor}`,
              }}
            >
              +{remainingAvatars}
            </div>
          )}
        </div>
      )}

      {/* Non-star header icon if specified */}
      {icon !== 'star' && renderHeaderIcon()}

      {/* Content Column */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {icon === 'star' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 15, fontWeight: 900, color: textColor, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
              {rating.toFixed(1)}
            </span>
            <div style={{ display: 'flex', gap: 2 }}>{renderStars()}</div>
          </div>
        )}
        <div style={{ fontSize: 13, fontWeight: 700, color: textColor, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
          {badgeText}
        </div>
        {(reviewCount !== undefined || subtitle) && (
          <div style={{ fontSize: 11, fontWeight: 500, color: 'rgba(255, 255, 255, 0.7)', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
            {subtitle || (typeof reviewCount === 'number' ? `${reviewCount.toLocaleString()} reviews` : `${reviewCount}`)}
          </div>
        )}
      </div>
    </div>
  );
};
