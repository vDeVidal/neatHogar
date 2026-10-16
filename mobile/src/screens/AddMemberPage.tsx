import React, { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { AppButton } from '../components/AppButton';
import { AppCard } from '../components/AppCard';
import { AppInput } from '../components/AppInput';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme/ThemeContext';
import { fonts, radius, shadow, spacing } from '../theme/tokens';
import { RolMiembro } from '../types';

export function AddMemberPage() {
  const { colors, theme } = useTheme();
  const navigation = useNavigation();
  const { hogar, invitarMiembro } = useAuth();

  const [tipoMiembro, setTipoMiembro] = useState<RolMiembro>('MIEMBRO');
  const [emailInvitado, setEmailInvitado] = useState('');
  const [permisoCrearTareas, setPermisoCrearTareas] = useState(true);
  const [permisoCompras, setPermisoCompras] = useState(true);
  const [permisoNotificaciones, setPermisoNotificaciones] = useState(true);
  const [loading, setLoading] = useState(false);
  const [invitacionEnviada, setInvitacionEnviada] = useState(false);

  const handleEnviar = async () => {
    setLoading(true);
    try {
      await invitarMiembro(tipoMiembro);
      setInvitacionEnviada(true);
      Alert.alert(
        '¡Invitación Generada!',
        `Se ha habilitado el acceso con rol ${tipoMiembro}. Puedes compartir el código ${hogar?.codigo_invitacion} directamente.`,
        [{ text: 'Entendido', onPress: () => navigation.goBack() }],
      );
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'No se pudo generar la invitación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      {/* Header: Flecha atrás y título "Añadir Miembro" */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [
            styles.backBtn,
            { backgroundColor: colors.surface },
            pressed && { opacity: 0.7 },
          ]}
        >
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Añadir Miembro</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Selector de Tipo de Miembro */}
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Tipo de Miembro</Text>
        <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
          Define el rol y nivel de responsabilidad dentro del hogar
        </Text>

        <View style={styles.roleSelector}>
          <Pressable
            onPress={() => setTipoMiembro('MIEMBRO')}
            style={[
              styles.roleCard,
              {
                backgroundColor: tipoMiembro === 'MIEMBRO' ? colors.primary : colors.card,
                borderColor: tipoMiembro === 'MIEMBRO' ? colors.primary : colors.border,
                ...shadow(theme.isDark, tipoMiembro === 'MIEMBRO' ? 3 : 1),
              },
            ]}
          >
            <Ionicons
              name="person-outline"
              size={24}
              color={tipoMiembro === 'MIEMBRO' ? (colors.onPrimary ?? '#FFFFFF') : colors.textPrimary}
            />
            <Text
              style={[
                styles.roleText,
                { color: tipoMiembro === 'MIEMBRO' ? (colors.onPrimary ?? '#FFFFFF') : colors.textPrimary },
              ]}
            >
              Miembro
            </Text>
            <Text
              style={[
                styles.roleSub,
                { color: tipoMiembro === 'MIEMBRO' ? (colors.onPrimary ?? '#FFFFFF') + 'cc' : colors.textSecondary },
              ]}
            >
              Realiza tareas y compras
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setTipoMiembro('ADMINISTRADOR')}
            style={[
              styles.roleCard,
              {
                backgroundColor: tipoMiembro === 'ADMINISTRADOR' ? colors.primary : colors.card,
                borderColor: tipoMiembro === 'ADMINISTRADOR' ? colors.primary : colors.border,
                ...shadow(theme.isDark, tipoMiembro === 'ADMINISTRADOR' ? 3 : 1),
              },
            ]}
          >
            <Ionicons
              name="shield-checkmark-outline"
              size={24}
              color={tipoMiembro === 'ADMINISTRADOR' ? (colors.onPrimary ?? '#FFFFFF') : colors.textPrimary}
            />
            <Text
              style={[
                styles.roleText,
                { color: tipoMiembro === 'ADMINISTRADOR' ? (colors.onPrimary ?? '#FFFFFF') : colors.textPrimary },
              ]}
            >
              Administrador
            </Text>
            <Text
              style={[
                styles.roleSub,
                {
                  color:
                    tipoMiembro === 'ADMINISTRADOR'
                      ? (colors.onPrimary ?? '#FFFFFF') + 'cc'
                      : colors.textSecondary,
                },
              ]}
            >
              Gestiona núcleo y miembros
            </Text>
          </Pressable>
        </View>

        {/* Input Opcional de Email */}
        <AppInput
          label="Correo Electrónico (Opcional)"
          placeholder="ejemplo@correo.cl"
          value={emailInvitado}
          onChangeText={setEmailInvitado}
          keyboardType="email-address"
          icon="mail-outline"
        />

        {/* Lista de Opciones Configurables con <Switch> */}
        <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginTop: spacing.md }]}>
          Permisos y Opciones
        </Text>

        <AppCard style={styles.switchContainer}>
          <View style={styles.switchRow}>
            <View style={styles.switchTextCol}>
              <Text style={[styles.switchTitle, { color: colors.textPrimary }]}>Opción 1: Crear y asignar tareas</Text>
              <Text style={[styles.switchSub, { color: colors.textSecondary }]}>
                Permite programar nuevas responsabilidades en el mural
              </Text>
            </View>
            <Switch
              value={permisoCrearTareas}
              onValueChange={setPermisoCrearTareas}
              trackColor={{ false: colors.softBg, true: colors.secondary }}
              thumbColor={permisoCrearTareas ? colors.primary : '#FFFFFF'}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.switchRow}>
            <View style={styles.switchTextCol}>
              <Text style={[styles.switchTitle, { color: colors.textPrimary }]}>Opción 2: Editar lista de compras</Text>
              <Text style={[styles.switchSub, { color: colors.textSecondary }]}>
                Permite agregar y tachar artículos del supermercado
              </Text>
            </View>
            <Switch
              value={permisoCompras}
              onValueChange={setPermisoCompras}
              trackColor={{ false: colors.softBg, true: colors.secondary }}
              thumbColor={permisoCompras ? colors.primary : '#FFFFFF'}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.switchRow}>
            <View style={styles.switchTextCol}>
              <Text style={[styles.switchTitle, { color: colors.textPrimary }]}>Opción 3: Notificaciones de progreso</Text>
              <Text style={[styles.switchSub, { color: colors.textSecondary }]}>
                Enviar resumen de cumplimiento semanal
              </Text>
            </View>
            <Switch
              value={permisoNotificaciones}
              onValueChange={setPermisoNotificaciones}
              trackColor={{ false: colors.softBg, true: colors.secondary }}
              thumbColor={permisoNotificaciones ? colors.primary : '#FFFFFF'}
            />
          </View>
        </AppCard>

        {/* Código de Vinculación Destacado */}
        <View style={[styles.codeBox, { backgroundColor: colors.softBg, borderColor: colors.border }]}>
          <Text style={[styles.codeBoxTitle, { color: colors.textSecondary }]}>
            Código de vinculación para compartir:
          </Text>
          <Text style={[styles.codeBoxValue, { color: colors.primary }]}>
            {hogar?.codigo_invitacion ?? 'NH-7824'}
          </Text>
          <Text style={[styles.codeBoxHelp, { color: colors.textSecondary }]}>
            El invitado solo debe abrir la app y presionar "Unirse a un Núcleo Familiar".
          </Text>
        </View>

        {/* Botón Inferior: "Enviar Invitación" con icono de avión de papel */}
        <View style={styles.footerBtn}>
          <AppButton
            title="Enviar Invitación"
            icon="paper-plane-outline"
            onPress={handleEnviar}
            loading={loading}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 18,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: 36,
  },
  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: 16,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 13,
    marginBottom: spacing.md,
  },
  roleSelector: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  roleCard: {
    flex: 1,
    padding: spacing.lg,
    borderRadius: radius.lg,
    alignItems: 'center',
    borderWidth: 1.5,
  },
  roleText: {
    fontFamily: fonts.bold,
    fontSize: 15,
    marginTop: 8,
  },
  roleSub: {
    fontFamily: fonts.regular,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 2,
  },
  switchContainer: {
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  switchTextCol: {
    flex: 1,
    paddingRight: spacing.md,
  },
  switchTitle: {
    fontFamily: fonts.semibold,
    fontSize: 14,
  },
  switchSub: {
    fontFamily: fonts.regular,
    fontSize: 12,
    marginTop: 2,
  },
  divider: {
    height: 1,
    marginVertical: spacing.sm,
  },
  codeBox: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  codeBoxTitle: {
    fontFamily: fonts.regular,
    fontSize: 12,
  },
  codeBoxValue: {
    fontFamily: fonts.bold,
    fontSize: 28,
    letterSpacing: 2,
    marginVertical: 6,
  },
  codeBoxHelp: {
    fontFamily: fonts.regular,
    fontSize: 12,
    textAlign: 'center',
  },
  footerBtn: {
    marginTop: spacing.sm,
  },
});
