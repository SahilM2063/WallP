export type ThemePreference = 'system' | 'light' | 'dark';
export const themes = {
  light: {
    bg: '#FFFFFF',
    surface: '#FFFFFF',
    text: '#0B0B0C',
    muted: '#8A8A8E',
    border: '#ECECEE',
    accent: '#0B0B0C',
    accentText: '#FFFFFF',
    soft: '#F3F3F5',
    nav: '#FFFFFF',
    navText: '#0B0B0C',
    press: 'rgba(0,0,0,0.07)',
  },
  dark: {
    bg: '#000000',
    surface: '#0E0E0F',
    text: '#F5F5F7',
    muted: '#8E8E93',
    border: '#1F1F21',
    accent: '#FFFFFF',
    accentText: '#0B0B0C',
    soft: '#161618',
    nav: '#000000',
    navText: '#FFFFFF',
    press: 'rgba(255,255,255,0.14)',
  },
};
export const fonts = {
  heading: 'Figtree_600SemiBold',
  bold: 'Figtree_700Bold',
  body: 'Figtree_400Regular',
  medium: 'Figtree_500Medium',
};
export type Theme = typeof themes.light;
