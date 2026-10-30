import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME_LIST, ThemeId } from '../theme/themes';
import { useTheme } from '../theme/ThemeContext';
import { fonts, radius, shadow, spacing } from '../theme/tokens';
import { AppButton } from './AppButton';
import { ThemedLogo } from './ThemedLogo';

interface ThemeSelectorModalProps {
  visible: boolean;
  onClose: () => void;
}

export function ThemeSelectorModal({ visible, onClose }: ThemeSelectorModalProps) {
  const { colors, themeId, setTheme } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
        <View style={[styles.content, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.header}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={[styles.title, { color: colors.textPrimary }]}>Personaliza tu App</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                El tema cambia tanto los colores de la interfaz como el logo oficial
              </Text>
            </View>
            <Pressable onPress={onClose} style={[styles.closeBtn, { backgroundColor: colors.softBg }]}>
              <Ionicons name="close" size={20} color={colors.textPrimary} />
            </Pressable>
          </View>

          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            {THEME_LIST.map((t) => {
              const isSelected = t.id === themeId;

              return (
                <Pressable
                  key={t.id}
                  onPress={() => setTheme(t.id as ThemeId)}
                  style={({ pressed }) => [
                    styles.themeCard,
                    {
                      backgroundColor: t.colors.card,
                      borderColor: isSelected ? t.colors.primary : t.colors.border,
                      borderWidth: isSelected ? 2.5 : 1,
                      ...shadow(t.isDark, isSelected ? 5 : 2),
                    },
                    pressed && { opacity: 0.85, transform: [{ scale: 0.985 }] },
                  ]}
                >
                  <View style={styles.cardHeader}>
                    <View style={styles.titleRow}>
                      <ThemedLogo overrideThemeId={t.id} size={42} borderRadius={11} />
                      <View>
                        <Text style={[styles.themeName, { color: t.colors.textPrimary }]}>
                          {t.emoji} {t.nombre}
                        </Text>
                        <Text style={[styles.themeType, { color: t.colors.textSecondary }]}>
                          {t.isDark ? 'Tema Oscuro' : 'Tema Claro'}
                        </Text>
                      </View>
                    </View>
                    {isSelected && (
                      <View style={[styles.selectedBadge, { backgroundColor: t.colors.primary }]}>
                        <Ionicons name="checkmark" size={16} color={t.colors.onPrimary ?? '#FFFFFF'} />
                      </View>
                    )}
                  </View>

                  <Text style={[styles.themeDesc, { color: t.colors.textSecondary }]}>{t.descripcion}</Text>

                  {/* Muestras de color en vivo */}
                  <View style={styles.swatches}>
                    <View style={[styles.swatch, { backgroundColor: t.colors.background }]} />
                    <View style={[styles.swatch, { backgroundColor: t.colors.primary }]} />
                    <View style={[styles.swatch, { backgroundColor: t.colors.secondary }]} />
                    <View style={[styles.swatch, { backgroundColor: t.colors.success }]} />
                    <View style={[styles.swatch, { backgroundColor: t.colors.warning }]} />
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={styles.footer}>
            <AppButton title="Aplicar y Cerrar" onPress={onClose} variant="primary" />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  content: {
    width: '100%',
    maxHeight: '85%',
    borderRadius: radius.xl,
    padding: spacing.xl,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 20,
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 12,
    marginTop: 3,
    lineHeight: 16,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    marginVertical: spacing.sm,
  },
  themeCard: {
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  themeName: {
    fontFamily: fonts.bold,
    fontSize: 16,
  },
  themeType: {
    fontFamily: fonts.regular,
    fontSize: 12,
    marginTop: 1,
  },
  selectedBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeDesc: {
    fontFamily: fonts.regular,
    fontSize: 13,
    marginTop: 8,
    marginBottom: 10,
  },
  swatches: {
    flexDirection: 'row',
    gap: 8,
  },
  swatch: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  footer: {
    marginTop: spacing.md,
  },
});
