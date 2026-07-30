/**
 * InternTracker AI – Design Token System
 *
 * Centralised theme values used across all screens and components.
 * Any change here propagates throughout the app automatically.
 */

export const Colors = {
  // ── Background ────────────────────────────────────────────────────────────
  background: {
    primary: '#0f0f1a',    // Deep navy-black — main app background
    secondary: '#16162a',  // Slightly lighter card background
    tertiary: '#1e1e3a',   // Elevated surface (modals, drawers)
  },

  // ── Brand Gradient Stops ──────────────────────────────────────────────────
  brand: {
    purple: '#7c3aed',     // Vibrant violet
    purpleLight: '#a78bfa', // Lighter violet
    pink: '#ec4899',       // Accent pink
    cyan: '#06b6d4',       // Teal accent
  },

  // ── Text ──────────────────────────────────────────────────────────────────
  text: {
    primary: '#f0f0ff',    // Almost white with a purple tint
    secondary: '#a0a0c0',  // Muted lavender-grey
    muted: '#6060a0',      // Dimmed labels
    inverse: '#0f0f1a',    // Text on light backgrounds
  },

  // ── Semantic ─────────────────────────────────────────────────────────────
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',

  // ── Borders & Dividers ───────────────────────────────────────────────────
  border: {
    subtle: '#2a2a4a',
    default: '#3a3a6a',
  },

  // ── Glass Effect ─────────────────────────────────────────────────────────
  glass: {
    surface: 'rgba(124, 58, 237, 0.08)',
    border: 'rgba(167, 139, 250, 0.2)',
  },

  // ── Transparent ──────────────────────────────────────────────────────────
  transparent: 'transparent',
  white: '#ffffff',
  black: '#000000',
} as const;

export const Typography = {
  fontFamily: {
    // React Native uses system fonts; these map to the closest system equivalent
    regular: undefined,  // System default
    medium: undefined,
    bold: undefined,
  },

  fontSize: {
    xs: 11,
    sm: 13,
    base: 15,
    md: 17,
    lg: 20,
    xl: 24,
    '2xl': 30,
    '3xl': 36,
    '4xl': 48,
  },

  fontWeight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
  },

  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  '3xl': 64,
} as const;

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

export const Shadows = {
  glow: {
    purple: {
      shadowColor: Colors.brand.purple,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.6,
      shadowRadius: 20,
      elevation: 10,
    },
    cyan: {
      shadowColor: Colors.brand.cyan,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.4,
      shadowRadius: 15,
      elevation: 8,
    },
  },
} as const;

const theme = {
  Colors,
  Typography,
  Spacing,
  BorderRadius,
  Shadows,
} as const;

export default theme;
