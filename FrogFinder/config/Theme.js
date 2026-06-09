/*
 * Purpose: Design-system tokens — colour palette, spacing scale, typography
 *          presets, border radii, and shadow definitions for the app.
 * Inputs:  None.
 * Outputs: Exported Theme constants object imported by screen and component files.
 */
export const Theme = {
  colors: {
    primary: '#007AFF',
    secondary: '#5AC8FA',
    background: '#F5F5F5',
    surface: '#FFFFFF',
    error: '#FF3B30',
    warning: '#FF9500',
    success: '#34C759',
    text: '#000000',
    textSecondary: '#666666',
    border: '#E5E5EA',
    disabled: '#C7C7CC',
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },

  typography: {
    h1: {
      fontSize: 28,
      fontWeight: 'bold',
      lineHeight: 34,
    },
    h2: {
      fontSize: 24,
      fontWeight: 'bold',
      lineHeight: 30,
    },
    h3: {
      fontSize: 20,
      fontWeight: '600',
      lineHeight: 26,
    },
    body: {
      fontSize: 16,
      fontWeight: '400',
      lineHeight: 22,
    },
    caption: {
      fontSize: 12,
      fontWeight: '400',
      lineHeight: 16,
    },
  },

  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    full: 999,
  },

  shadows: {
    light: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    medium: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 4,
    },
    heavy: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.2,
      shadowRadius: 16,
      elevation: 8,
    },
  },
};
