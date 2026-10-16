import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { fonts, radius, shadow, spacing } from '../theme/tokens';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type IoniconsName = keyof typeof Ionicons.glyphMap;

interface AppButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  icon?: IoniconsName;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

export function AppButton({
  title,
  onPress,
  variant = 'primary',
  icon,
  iconPosition = 'left',
  loading = false,
  disabled = false,
  style,
}: AppButtonProps) {
  const { colors, theme } = useTheme();

  const getButtonStyles = (): ViewStyle => {
    switch (variant) {
      case 'secondary':
        return {
          backgroundColor: colors.secondary,
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          borderWidth: 1.5,
          borderColor: colors.primary,
        };
      case 'ghost':
        return {
          backgroundColor: colors.softBg,
        };
      case 'danger':
        return {
          backgroundColor: colors.danger,
        };
      case 'primary':
      default:
        return {
          backgroundColor: colors.primary,
          ...shadow(theme.isDark, 3),
        };
    }
  };

  const getTextColor = (): string => {
    if (disabled) return colors.textSecondary;
    switch (variant) {
      case 'secondary':
        return colors.onHighlight ?? colors.textPrimary;
      case 'outline':
        return colors.primary;
      case 'ghost':
        return colors.textPrimary;
      case 'danger':
        return '#FFFFFF';
      case 'primary':
      default:
        return colors.onPrimary ?? '#FFFFFF';
    }
  };

  const textColor = getTextColor();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        getButtonStyles(),
        disabled && { opacity: 0.5 },
        pressed && !disabled && { opacity: 0.82, transform: [{ scale: 0.985 }] },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <>
          {icon && iconPosition === 'left' && (
            <Ionicons name={icon} size={18} color={textColor} style={{ marginRight: spacing.sm }} />
          )}
          <Text style={[styles.text, { color: textColor }]}>{title}</Text>
          {icon && iconPosition === 'right' && (
            <Ionicons name={icon} size={18} color={textColor} style={{ marginLeft: spacing.sm }} />
          )}
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
  },
  text: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    textAlign: 'center',
  },
});
