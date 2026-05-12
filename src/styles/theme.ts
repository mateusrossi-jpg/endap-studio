export const colors = {
  background: '#020817', // fundo principal
  secondaryBackground: '#0B1220', // cards, painéis
  text: '#F8FAFC', // texto claro
  primary: '#0ED8F4', // destaque teal/cyan
  danger: '#FF6B6B', // vermelho para perigo
  success: '#4ADE80', // verde
  warning: '#FACC15', // amarelo/âmbar
  cardShadow: 'rgba(0, 0, 0, 0.4)',
};

export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
};

export const typography = {
  fontFamily: "'Inter', sans-serif",
  baseSize: '0.95rem',
  lineHeight: 1.5,
};

// Export CSS custom properties for easy use in CSS modules
export const cssVariables = `
:root {
  --color-background: ${colors.background};
  --color-secondary-bg: ${colors.secondaryBackground};
  --color-text: ${colors.text};
  --color-primary: ${colors.primary};
  --color-danger: ${colors.danger};
  --color-success: ${colors.success};
  --color-warning: ${colors.warning};
  --color-card-shadow: ${colors.cardShadow};
  --spacing-xs: ${spacing.xs};
  --spacing-sm: ${spacing.sm};
  --spacing-md: ${spacing.md};
  --spacing-lg: ${spacing.lg};
  --spacing-xl: ${spacing.xl};
  --font-family: ${typography.fontFamily};
  --font-size-base: ${typography.baseSize};
  --line-height-base: ${typography.lineHeight};
}`;
