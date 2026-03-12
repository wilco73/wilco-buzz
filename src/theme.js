export const T = {
  bg: '#0a0a0f',
  surface: '#12121a',
  surfaceHover: '#1a1a26',
  border: '#252535',
  accent: '#ff3366',
  accentDim: '#cc2952',
  accentGlow: 'rgba(255, 51, 102, 0.3)',
  green: '#00e676',
  greenDim: '#00b85e',
  greenGlow: 'rgba(0, 230, 118, 0.3)',
  yellow: '#ffd600',
  orange: '#ff9100',
  text: '#e8e8f0',
  textDim: '#7a7a90',
  textMuted: '#4a4a5e',
  danger: '#ff1744',
  dangerGlow: 'rgba(255, 23, 68, 0.2)',
};

export const AVATARS = [
  '🎮','🎯','🎪','🎨','🎵','🎸','🎹','🎺','🎻','🎲',
  '🃏','🏆','🥇','🦊','🐱','🐶','🐸','🦁','🐧','🐼',
  '🐨','🦄','🐙','🦋','🐢','🦜','🐝','🦈','🐬','🐺',
];

export const formatTime = (ms) => {
  if (!ms || ms < 0) return '0.000s';
  return (ms / 1000).toFixed(3) + 's';
};
