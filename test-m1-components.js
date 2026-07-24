import React from 'react';
import { ProgressBar, BeforeAfterSlider, TrustBadge } from './dist/index.js';

console.log('Testing M1 Marketing UI Components imports and React elements...');

try {
  // Test ProgressBar instantiation
  const pb1 = React.createElement(ProgressBar, { progress: 0.5, showLabel: true, position: 'bottom', glow: true });
  const pb2 = React.createElement(ProgressBar, { startFrame: 0, endFrame: 100, labelPosition: 'top-left', showLabel: true });
  console.log('✓ ProgressBar element creation passed');

  // Test BeforeAfterSlider instantiation
  const bas1 = React.createElement(BeforeAfterSlider, { beforeImage: 'before.png', afterImage: 'after.png', sliderPosition: 40 });
  const bas2 = React.createElement(BeforeAfterSlider, { animationType: 'ping-pong', showLabels: true, labelPosition: 'bottom' });
  console.log('✓ BeforeAfterSlider element creation passed');

  // Test TrustBadge instantiation
  const tb1 = React.createElement(TrustBadge, { rating: 4.8, reviewCount: '2,500+ happy customers', position: 'top-right' });
  const tb2 = React.createElement(TrustBadge, { icon: 'shield', badgeText: 'Verified Secure', animationType: 'slide-in' });
  console.log('✓ TrustBadge element creation passed');

  console.log('ALL M1 TEMPLATE COMPONENT TESTS PASSED CLEANLY!');
} catch (err) {
  console.error('❌ M1 Template Component Test Failed:', err);
  process.exit(1);
}
