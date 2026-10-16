import React, { useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppButton } from '../components/AppButton';
import { AppInput } from '../components/AppInput';
import { ThemeSelectorModal } from '../components/ThemeSelectorModal';
import { useAuth } from '../context/AuthContext';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../theme/ThemeContext';
import { fonts, radius, shadow, spacing } from '../theme/tokens';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Vinculacion'>;
};

export function VinculacionPage({ navigation }: Props) {
  const { colors, theme } = useTheme();
  const { crearHogar, unirseHogar, login, registro, activarModoDemo } = useAuth();

  const [themeModalVisible, setThemeModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'crear' | 'unirse' | 'login' | 'registro' | null>(null);

  // Form states
  const [nombreHogar, setNombreHogar] = useState('');
  const [codigoInvitacion, setCodigoInvitacion] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombreUsuario, setNombreUsuario] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleCrear = async () => {
    if (!nombreHogar.trim()) {
      setErrorMsg('Ingresa un nombre para tu hogar');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    try {
      await crearHogar(nombreHogar.trim());
      setModalType(null);
      navigation.replace('MainTabs');
    } catch (e: any) {
      setErrorMsg(e?.message || 'Error al crear el núcleo');
    } finally {
      setLoading(false);
    }
  };

  const handleUnirse = async () => {
    if (!codigoInvitacion.trim()) {
      setErrorMsg('Ingresa el código de invitación (ej. NH-7824)');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    try {
      await unirseHogar(codigoInvitacion.trim());
      setModalType(null);
      navigation.replace('MainTabs');
    } catch (e: any) {
      setErrorMsg(e?.message || 'Código inválido');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setErrorMsg('Ingresa tu email y contraseña');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    try {
      await login(email.trim(), password);
      setModalType(null);
      navigation.replace('MainTabs');
    } catch (e: any) {
      setErrorMsg(e?.message || 'Credenciales incorrectas');
    } finally {
      setLoading(false);
    }
  };

  const handleRegistro = async () => {
    if (!nombreUsuario.trim() || !email.trim() || !password) {
      setErrorMsg('Completa todos los campos');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    try {
      await registro(nombreUsuario.trim(), email.trim(), password);
      setModalType('crear');
    } catch (e: any) {
      setErrorMsg(e?.message || 'Error al registrar cuenta');
    } finally {
      setLoading(false);
    }
  };

  const handleDemo = () => {
    activarModoDemo();
    navigation.replace('MainTabs');
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header Superior */}
        <View style={styles.header}>
          <View style={[styles.badgeLogo, { backgroundColor: colors.softBg, borderColor: colors.border }]}>
            <Ionicons name="home" size={28} color={colors.primary} />
          </View>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Bienvenido a NeatHogar</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Organización colaborativa, tareas justas y armonía en tu hogar.
          </Text>
        </View>

        {/* Centro: Dos tarjetas cuadradas lado a lado */}
        <View style={styles.cardsRow}>
          {/* Tarjeta 1: Crear Núcleo Familiar */}
          <Pressable
            onPress={() => setModalType('crear')}
            style={({ pressed }) => [
              styles.squareCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                ...shadow(theme.isDark, 4),
              },
              pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
            ]}
          >
            <View style={[styles.iconCircle, { backgroundColor: colors.primary }]}>
              <Ionicons name="people" size={32} color={colors.onPrimary ?? '#FFFFFF'} />
            </View>
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Crear Núcleo Familiar</Text>
            <Text style={[styles.cardSub, { color: colors.textSecondary }]}>
              Inicia un nuevo grupo y genera invitaciones
            </Text>
          </Pressable>

          {/* Tarjeta 2: Unirse a un Núcleo Familiar */}
          <Pressable
            onPress={() => setModalType('unirse')}
            style={({ pressed }) => [
              styles.squareCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                ...shadow(theme.isDark, 4),
              },
              pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
            ]}
          >
            <View style={[styles.iconCircle, { backgroundColor: colors.secondary }]}>
              <Ionicons name="link" size={32} color={colors.onHighlight ?? colors.textPrimary} />
            </View>
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Unirse a un Núcleo</Text>
            <Text style={[styles.cardSub, { color: colors.textSecondary }]}>
              Ingresa el código que te compartieron
            </Text>
          </Pressable>
        </View>

        {/* Acceso Rápido Modo Demo */}
        <Pressable
          onPress={handleDemo}
          style={[styles.demoBanner, { backgroundColor: colors.softBg, borderColor: colors.border }]}
        >
          <Ionicons name="sparkles" size={18} color={colors.warning} />
          <Text style={[styles.demoText, { color: colors.textPrimary }]}>
            ¿Quieres probar la app de inmediato? <Text style={{ color: colors.primary, fontFamily: fonts.bold }}>Entrar a Modo Demo</Text>
          </Text>
        </Pressable>

        {/* Parte Inferior: Dos botones horizontales anchos */}
        <View style={styles.footerButtons}>
          <AppButton
            title="Importe sus Datos"
            icon="cloud-download-outline"
            onPress={() => setModalType('login')}
            variant="outline"
            style={styles.fullWidthButton}
          />
          <AppButton
            title="Personaliza tu App"
            icon="color-palette-outline"
            onPress={() => setThemeModalVisible(true)}
            variant="secondary"
            style={styles.fullWidthButton}
          />
        </View>
      </ScrollView>

      {/* Modal Selector de Temas */}
      <ThemeSelectorModal
        visible={themeModalVisible}
        onClose={() => setThemeModalVisible(false)}
      />

      {/* Modal de Formularios (Crear / Unirse / Login / Registro) */}
      <Modal
        visible={modalType !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setModalType(null)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                {modalType === 'crear' && 'Crear Núcleo Familiar'}
                {modalType === 'unirse' && 'Unirse a un Hogar'}
                {modalType === 'login' && 'Importe sus Datos (Login)'}
                {modalType === 'registro' && 'Crear Cuenta'}
              </Text>
              <Pressable onPress={() => setModalType(null)} style={[styles.modalClose, { backgroundColor: colors.softBg }]}>
                <Ionicons name="close" size={20} color={colors.textPrimary} />
              </Pressable>
            </View>

            {modalType === 'crear' && (
              <View>
                <Text style={[styles.modalPrompt, { color: colors.textSecondary }]}>
                  Asígnale un nombre a tu nuevo hogar colaborativo (ej. "Casa Central", "Depto 402"):
                </Text>
                <AppInput
                  label="Nombre del Núcleo"
                  placeholder="Ej: Depto Los Leones"
                  value={nombreHogar}
                  onChangeText={setNombreHogar}
                  icon="home-outline"
                />
                {errorMsg ? <Text style={[styles.error, { color: colors.danger }]}>{errorMsg}</Text> : null}
                <AppButton title="Crear Hogar y Entrar" onPress={handleCrear} loading={loading} />
              </View>
            )}

            {modalType === 'unirse' && (
              <View>
                <Text style={[styles.modalPrompt, { color: colors.textSecondary }]}>
                  Pídele al administrador de tu casa el código de vinculación:
                </Text>
                <AppInput
                  label="Código de Invitación"
                  placeholder="Ej: NH-7824"
                  value={codigoInvitacion}
                  onChangeText={(t) => setCodigoInvitacion(t.toUpperCase())}
                  autoCapitalize="characters"
                  icon="key-outline"
                />
                {errorMsg ? <Text style={[styles.error, { color: colors.danger }]}>{errorMsg}</Text> : null}
                <AppButton title="Validar y Unirme" onPress={handleUnirse} loading={loading} />
              </View>
            )}

            {modalType === 'login' && (
              <View>
                <Text style={[styles.modalPrompt, { color: colors.textSecondary }]}>
                  Ingresa con tu cuenta previa para recuperar tus hogares y temas:
                </Text>
                <AppInput
                  label="Correo Electrónico"
                  placeholder="tu@email.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                  icon="mail-outline"
                />
                <AppInput
                  label="Contraseña"
                  placeholder="••••••••"
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                  icon="lock-closed-outline"
                />
                {errorMsg ? <Text style={[styles.error, { color: colors.danger }]}>{errorMsg}</Text> : null}
                <AppButton title="Iniciar Sesión" onPress={handleLogin} loading={loading} />
                <Pressable onPress={() => setModalType('registro')} style={styles.switchAuth}>
                  <Text style={[styles.switchAuthText, { color: colors.primary }]}>
                    ¿No tienes cuenta? Regístrate aquí
                  </Text>
                </Pressable>
              </View>
            )}

            {modalType === 'registro' && (
              <View>
                <AppInput
                  label="Nombre y Apellido"
                  placeholder="Benjamín Vidal"
                  value={nombreUsuario}
                  onChangeText={setNombreUsuario}
                  icon="person-outline"
                />
                <AppInput
                  label="Correo Electrónico"
                  placeholder="tu@email.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                  icon="mail-outline"
                />
                <AppInput
                  label="Contraseña (mínimo 6 caracteres)"
                  placeholder="••••••••"
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                  icon="lock-closed-outline"
                />
                {errorMsg ? <Text style={[styles.error, { color: colors.danger }]}>{errorMsg}</Text> : null}
                <AppButton title="Registrarse" onPress={handleRegistro} loading={loading} />
                <Pressable onPress={() => setModalType('login')} style={styles.switchAuth}>
                  <Text style={[styles.switchAuthText, { color: colors.primary }]}>
                    ¿Ya tienes cuenta? Inicia sesión
                  </Text>
                </Pressable>
              </View>
            )}
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
    padding: spacing.xl,
    flexGrow: 1,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.xxl,
  },
  badgeLogo: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 28,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: spacing.lg,
    lineHeight: 20,
  },
  cardsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  squareCard: {
    flex: 1,
    aspectRatio: 0.95,
    borderRadius: radius.xl,
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  iconCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  cardTitle: {
    fontFamily: fonts.bold,
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 4,
  },
  cardSub: {
    fontFamily: fonts.regular,
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 15,
  },
  demoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    borderWidth: 1,
    marginBottom: spacing.xl,
  },
  demoText: {
    fontFamily: fonts.medium,
    fontSize: 13,
  },
  footerButtons: {
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  fullWidthButton: {
    width: '100%',
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
  modalClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalPrompt: {
    fontFamily: fonts.regular,
    fontSize: 13,
    marginBottom: spacing.md,
    lineHeight: 18,
  },
  error: {
    fontFamily: fonts.medium,
    fontSize: 12,
    marginBottom: spacing.sm,
  },
  switchAuth: {
    marginTop: spacing.md,
    alignItems: 'center',
  },
  switchAuthText: {
    fontFamily: fonts.semibold,
    fontSize: 13,
  },
});
