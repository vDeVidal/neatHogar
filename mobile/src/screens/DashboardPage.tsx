import React, { useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppButton } from '../components/AppButton';
import { AppCard } from '../components/AppCard';
import { ChartProgress } from '../components/ChartProgress';
import { ThemeSelectorModal } from '../components/ThemeSelectorModal';
import { useAuth } from '../context/AuthContext';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../theme/ThemeContext';
import { fonts, radius, shadow, spacing } from '../theme/tokens';
import { MiembroHogar, NivelDisponibilidad } from '../types';

export function DashboardPage() {
  const { colors, theme } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { hogar, usuario, rol, progreso, actualizarDisponibilidad, logout } = useAuth();

  const [themeModalVisible, setThemeModalVisible] = useState(false);
  const [profileModalVisible, setProfileModalVisible] = useState(false);

  const getDisponibilidadBadge = (disp: NivelDisponibilidad) => {
    switch (disp) {
      case 'ALTA':
        return { label: 'Disponibilidad Alta', bg: colors.success + '22', text: colors.success };
      case 'MEDIA':
        return { label: 'Disponibilidad Media', bg: colors.warning + '22', text: colors.warning };
      case 'BAJA':
      default:
        return { label: 'Disponibilidad Baja', bg: colors.danger + '22', text: colors.danger };
    }
  };

  const getIniciales = (nombre: string) => {
    return nombre
      .split(' ')
      .map((p) => p[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const miembros = hogar?.miembros ?? [];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header: Título "Diario Mural de la Casa" + Botón Cambio de Tema & Perfil */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.homeTag, { color: colors.secondary }]}>
              {hogar?.nombre ?? 'Mi Hogar'}
            </Text>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Diario Mural de la Casa</Text>
          </View>

          <View style={styles.headerActions}>
            {/* Botón Selector de Temas */}
            <Pressable
              onPress={() => setThemeModalVisible(true)}
              style={({ pressed }) => [
                styles.iconButton,
                { backgroundColor: colors.surface, borderColor: colors.border },
                pressed && { opacity: 0.7 },
              ]}
            >
              <Ionicons name="color-palette-outline" size={20} color={colors.primary} />
            </Pressable>

            {/* Botón Ajustes / Perfil */}
            <Pressable
              onPress={() => setProfileModalVisible(true)}
              style={({ pressed }) => [
                styles.iconButton,
                { backgroundColor: colors.surface, borderColor: colors.border },
                pressed && { opacity: 0.7 },
              ]}
            >
              <Ionicons name="person-circle-outline" size={24} color={colors.textPrimary} />
            </Pressable>
          </View>
        </View>

        {/* Tarjeta de Código de Invitación Rápido */}
        {hogar?.codigo_invitacion && (
          <View style={[styles.codeCard, { backgroundColor: colors.softBg, borderColor: colors.border }]}>
            <View style={styles.codeLeft}>
              <Ionicons name="key-outline" size={18} color={colors.primary} />
              <Text style={[styles.codeLabel, { color: colors.textSecondary }]}>Código de vinculación:</Text>
            </View>
            <View style={[styles.codeBadge, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.codeText, { color: colors.primary }]}>{hogar.codigo_invitacion}</Text>
            </View>
          </View>
        )}

        {/* Gráfica Central: barras y línea (react-native-svg) */}
        <ChartProgress data={progreso} />

        {/* Sección: Lista de Miembros de la Casa */}
        <View style={styles.membersSection}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Lista de Miembros de la Casa
            </Text>
            <Text style={[styles.memberCount, { color: colors.textSecondary }]}>
              {miembros.length} integrantes
            </Text>
          </View>

          <FlatList
            data={miembros}
            keyExtractor={(item) => String(item.id_miembro)}
            scrollEnabled={false}
            renderItem={({ item }) => {
              const badge = getDisponibilidadBadge(item.usuario.disponibilidad);
              const isAdmin = item.rol === 'ADMINISTRADOR';

              return (
                <AppCard style={styles.memberCard}>
                  <View style={styles.memberRow}>
                    {/* Avatar */}
                    <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                      <Text style={[styles.avatarText, { color: colors.onPrimary ?? '#FFFFFF' }]}>
                        {getIniciales(item.usuario.nombre)}
                      </Text>
                    </View>

                    {/* Info */}
                    <View style={styles.memberInfo}>
                      <View style={styles.nameRow}>
                        <Text style={[styles.memberName, { color: colors.textPrimary }]}>
                          {item.usuario.nombre}
                        </Text>
                        {isAdmin && (
                          <View style={[styles.adminBadge, { backgroundColor: colors.secondary + '33' }]}>
                            <Text style={[styles.adminText, { color: colors.primary }]}>Admin</Text>
                          </View>
                        )}
                      </View>

                      <Text style={[styles.memberRole, { color: colors.textSecondary }]}>
                        {isAdmin ? 'Jefe de hogar' : 'Miembro'} • {item.puntos_acumulados} pts
                      </Text>

                      {/* Badge de Disponibilidad */}
                      <View style={[styles.dispBadge, { backgroundColor: badge.bg }]}>
                        <View style={[styles.dispDot, { backgroundColor: badge.text }]} />
                        <Text style={[styles.dispText, { color: badge.text }]}>
                          {badge.label}
                          {item.usuario.descripcion_carga ? ` (${item.usuario.descripcion_carga})` : ''}
                        </Text>
                      </View>
                    </View>
                  </View>
                </AppCard>
              );
            }}
          />
        </View>

        {/* Botón Inferior: "Añadir Miembro" */}
        <View style={styles.footer}>
          <AppButton
            title="Añadir Miembro"
            icon="person-add-outline"
            onPress={() => navigation.navigate('AddMember')}
            variant="primary"
          />
        </View>
      </ScrollView>

      {/* Modal Selector de Temas */}
      <ThemeSelectorModal
        visible={themeModalVisible}
        onClose={() => setThemeModalVisible(false)}
      />

      {/* Modal Ajustes de Perfil y Disponibilidad */}
      <Modal
        visible={profileModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setProfileModalVisible(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Mi Perfil & Disponibilidad</Text>
              <Pressable onPress={() => setProfileModalVisible(false)} style={[styles.closeBtn, { backgroundColor: colors.softBg }]}>
                <Ionicons name="close" size={20} color={colors.textPrimary} />
              </Pressable>
            </View>

            <Text style={[styles.profileName, { color: colors.textPrimary }]}>{usuario?.nombre ?? 'Usuario'}</Text>
            <Text style={[styles.profileEmail, { color: colors.textSecondary }]}>{usuario?.email}</Text>

            <Text style={[styles.dispTitle, { color: colors.textPrimary }]}>Tu nivel de disponibilidad actual:</Text>
            <Text style={[styles.dispSubtitle, { color: colors.textSecondary }]}>
              Ayuda a balancear la asignación equitativa de tareas domésticas.
            </Text>

            <View style={styles.dispOptions}>
              {(['ALTA', 'MEDIA', 'BAJA'] as NivelDisponibilidad[]).map((d) => {
                const isSelected = usuario?.disponibilidad === d;
                const b = getDisponibilidadBadge(d);
                return (
                  <Pressable
                    key={d}
                    onPress={() => actualizarDisponibilidad(d)}
                    style={[
                      styles.dispOptionBtn,
                      {
                        backgroundColor: isSelected ? colors.primary : colors.card,
                        borderColor: isSelected ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.dispOptionText,
                        { color: isSelected ? (colors.onPrimary ?? '#FFFFFF') : colors.textPrimary },
                      ]}
                    >
                      {d}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.modalActions}>
              <AppButton
                title="Cerrar Sesión"
                variant="outline"
                icon="log-out-outline"
                onPress={async () => {
                  setProfileModalVisible(false);
                  await logout();
                  navigation.reset({ index: 0, routes: [{ name: 'Vinculacion' }] });
                }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    padding: spacing.lg,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  homeTag: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 22,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  codeCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  codeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  codeLabel: {
    fontFamily: fonts.regular,
    fontSize: 13,
  },
  codeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  codeText: {
    fontFamily: fonts.bold,
    fontSize: 13,
    letterSpacing: 1,
  },
  membersSection: {
    marginTop: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: 18,
  },
  memberCount: {
    fontFamily: fonts.regular,
    fontSize: 13,
  },
  memberCard: {
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: fonts.bold,
    fontSize: 16,
  },
  memberInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  memberName: {
    fontFamily: fonts.semibold,
    fontSize: 15,
  },
  adminBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  adminText: {
    fontFamily: fonts.bold,
    fontSize: 11,
  },
  memberRole: {
    fontFamily: fonts.regular,
    fontSize: 12,
    marginTop: 1,
  },
  dispBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    marginTop: 6,
  },
  dispDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dispText: {
    fontFamily: fonts.medium,
    fontSize: 11,
  },
  footer: {
    marginTop: spacing.lg,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    width: '100%',
    borderRadius: radius.xl,
    padding: spacing.xl,
    borderWidth: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontFamily: fonts.bold,
    fontSize: 18,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileName: {
    fontFamily: fonts.bold,
    fontSize: 17,
  },
  profileEmail: {
    fontFamily: fonts.regular,
    fontSize: 13,
    marginBottom: spacing.lg,
  },
  dispTitle: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    marginBottom: 4,
  },
  dispSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 12,
    marginBottom: spacing.md,
  },
  dispOptions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  dispOptionBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
  },
  dispOptionText: {
    fontFamily: fonts.bold,
    fontSize: 13,
  },
  modalActions: {
    marginTop: spacing.sm,
  },
});
