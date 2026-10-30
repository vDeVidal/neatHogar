import React from 'react';
import { Image, ImageSourcePropType, ImageStyle, StyleProp } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { ThemeId } from '../theme/themes';

export const THEME_LOGOS: Record<ThemeId, ImageSourcePropType> = {
  noche_indigo: require('../../assets/logo_noche_indigo.png'),
  bosque_nocturno: require('../../assets/logo_bosque_nocturno.png'),
  brisa_nordica: require('../../assets/logo_brisa_nordica.png'),
  hogar_calido: require('../../assets/logo_hogar_calido.png'),
};

interface ThemedLogoProps {
  /** Si se omite, usa automáticamente el `themeId` activo en `ThemeContext`. */
  overrideThemeId?: ThemeId;
  size?: number;
  borderRadius?: number;
  style?: StyleProp<ImageStyle>;
}

/**
 * Renderiza el logo oficial de NeatHogar adaptando sus colores dinámicamente
 * a cualquiera de los 4 temas visuales de la aplicación.
 */
export function ThemedLogo({
  overrideThemeId,
  size = 40,
  borderRadius,
  style,
}: ThemedLogoProps) {
  const { themeId } = useTheme();
  const activeId = overrideThemeId ?? themeId;
  const source = THEME_LOGOS[activeId] ?? THEME_LOGOS.noche_indigo;

  return (
    <Image
      source={source}
      fadeDuration={0}
      resizeMode="contain"
      style={[
        {
          width: size,
          height: size,
          borderRadius: borderRadius ?? Math.round(size * 0.25),
        },
        style,
      ]}
    />
  );
}
