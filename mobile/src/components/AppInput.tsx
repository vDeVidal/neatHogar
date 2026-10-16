import React from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { fonts, radius, spacing } from '../theme/tokens';

type IoniconsName = keyof typeof Ionicons.glyphMap;

interface AppInputProps extends TextInputProps {
  label?: string;
  icon?: IoniconsName;
  error?: string;
  containerStyle?: ViewStyle;
}

export function AppInput({
  label,
  icon,
  error,
  containerStyle,
  style,
  ...props
}: AppInputProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? (
        <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      ) : null}
      <View
        style={[
          styles.inputWrapper,
          {
            backgroundColor: colors.surface,
            borderColor: error ? colors.danger : colors.border,
          },
        ]}
      >
        {icon && (
          <Ionicons
            name={icon}
            size={18}
            color={colors.textSecondary}
            style={styles.icon}
          />
        )}
        <TextInput
          placeholderTextColor={colors.textSecondary + '80'}
          style={[
            styles.input,
            {
              color: colors.textPrimary,
            },
            style,
          ]}
          {...props}
        />
      </View>
      {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    fontFamily: fonts.medium,
    fontSize: 13,
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.2,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    minHeight: 48,
  },
  icon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 15,
    paddingVertical: 10,
  },
  error: {
    fontFamily: fonts.regular,
    fontSize: 12,
    marginTop: 4,
  },
});
