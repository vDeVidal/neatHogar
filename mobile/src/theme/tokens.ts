import { Platform } from 'react-native';

/** Familias tipográficas (Outfit, cargadas en App.tsx). */
export const fonts = {
  regular: 'Outfit_400Regular',
  medium: 'Outfit_500Medium',
  semibold: 'Outfit_600SemiBold',
  bold: 'Outfit_700Bold',
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 } as const;

export const radius = { sm: 10, md: 14, lg: 20, xl: 28, pill: 999 } as const;

export const fontSize = { xs: 11, sm: 13, md: 15, lg: 17, xl: 20, xxl: 26, display: 32 } as const;

/** Sombra suave multiplataforma. */
export function shadow(isDark: boolean, elevation = 4) {
  return Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOpacity: isDark ? 0.35 : 0.08,
      shadowRadius: elevation * 2,
      shadowOffset: { width: 0, height: elevation / 2 },
    },
    android: { elevation: isDark ? elevation : Math.max(1, elevation - 1) },
    default: {},
  });
}
