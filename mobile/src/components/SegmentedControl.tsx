import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { fonts, radius, shadow, spacing } from '../theme/tokens';

interface SegmentedControlProps<T extends string> {
  values: { key: T; label: string; icon?: string }[];
  selected: T;
  onChange: (key: T) => void;
}

export function SegmentedControl<T extends string>({
  values,
  selected,
  onChange,
}: SegmentedControlProps<T>) {
  const { colors, theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {values.map((item) => {
        const isSelected = item.key === selected;
        return (
          <Pressable
            key={item.key}
            onPress={() => onChange(item.key)}
            style={[
              styles.segment,
              isSelected && [
                styles.segmentSelected,
                {
                  backgroundColor: colors.primary,
                  ...shadow(theme.isDark, 2),
                },
              ],
            ]}
          >
            <Text
              style={[
                styles.text,
                {
                  color: isSelected ? (colors.onPrimary ?? '#FFFFFF') : colors.textSecondary,
                  fontFamily: isSelected ? fonts.semibold : fonts.medium,
                },
              ]}
            >
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: radius.pill,
    padding: 4,
    borderWidth: 1,
    marginVertical: spacing.md,
  },
  segment: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
  segmentSelected: {
    borderRadius: radius.pill,
  },
  text: {
    fontSize: 14,
  },
});
