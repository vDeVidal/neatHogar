import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppButton } from '../components/AppButton';
import { AppCard } from '../components/AppCard';
import { AppInput } from '../components/AppInput';
import { ThemedLogo } from '../components/ThemedLogo';
import { ThemeSelectorModal } from '../components/ThemeSelectorModal';
import { useAuth } from '../context/AuthContext';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../theme/ThemeContext';
import { fonts, radius, shadow, spacing } from '../theme/tokens';
import { TipoHogar } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Vinculacion' | 'InicioHogares'>;

export function VinculacionPage({ navigation, route }: Props) {
  const { colors, theme } = useTheme();
  const {
    usuario,
    hogar,
    misHogares,
    crearHogar,
    unirseHogar,
    seleccionarHogar,
    loginConPin,
    registroConPin,
    login,
    logout,
    activarModoDemo,
  } = useAuth();

  const isFromInsideApp = route.name === 'InicioHogares';

  const [themeModalVisible, setThemeModalVisible] = useState(false);
  const [modalType, setModalType] = useState<
    'pin_login' | 'pin_registro' | 'crear' | 'unirse' | 'email_login' | null
  >(null);

  // Campos de formulario
  const [nombreUsuario, setNombreUsuario] = useState('');
  const [pinUsuario, setPinUsuario] = useState('');
  const [nombreHogar, setNombreHogar] = useState('');
  const [tipoHogar, setTipoHogar] = useState<TipoHogar>('COLABORATIVO');
  const [codigoInvitacion, setCodigoInvitacion] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [switchingHomeId, setSwitchingHomeId] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const abrirModal = (tipo: typeof modalType) => {
    setErrorMsg('');
    setModalType(tipo);
  };

  const irAlHogarSiCorresponde = () => {
    if (isFromInsideApp) {
      navigation.navigate('MainTabs');
    }
  };

  const handleSeleccionarCasaRapida = async (idHogar: number) => {
    if (hogar?.id_hogar === idHogar && isFromInsideApp) {
      navigation.navigate('MainTabs');
      return;
    }
    setSwitchingHomeId(idHogar);
    try {
      await seleccionarHogar(idHogar);
      irAlHogarSiCorresponde();
    } catch (e: any) {
      setErrorMsg(e?.message || 'No se pudo abrir esta casa');
    } finally {
      setSwitchingHomeId(null);
    }
  };

  const handlePinLogin = async () => {
    if (!nombreUsuario.trim()) {
      setErrorMsg('Ingresa tu nombre');
      return;
    }
    if (!/^\d{4,6}$/.test(pinUsuario.trim())) {
      setErrorMsg('Ingresa tu PIN numérico de 4 a 6 dígitos');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    try {
      await loginConPin(
        nombreUsuario.trim(),
        pinUsuario.trim(),
        codigoInvitacion.trim() || undefined,
      );
      setPinUsuario('');
      setCodigoInvitacion('');
      setModalType(null);
      irAlHogarSiCorresponde();
    } catch (e: any) {
      setErrorMsg(e?.message || 'Nombre o PIN incorrecto');
    } finally {
      setLoading(false);
    }
  };

  const handlePinRegistro = async () => {
    if (!nombreUsuario.trim()) {
      setErrorMsg('Ingresa tu nombre para crear tu cuenta');
      return;
    }
    if (!/^\d{4,6}$/.test(pinUsuario.trim())) {
      setErrorMsg('Elige un PIN numérico de 4 a 6 dígitos');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    try {
      await registroConPin(nombreUsuario.trim(), pinUsuario.trim());
      setPinUsuario('');
      setModalType(null);
    } catch (e: any) {
      setErrorMsg(e?.message || 'Ese nombre ya está registrado. Usa "Entrar con Nombre y PIN".');
    } finally {
      setLoading(false);
    }
  };

  const handleCrearHogar = async () => {
    if (!usuario) {
      if (!nombreUsuario.trim()) {
        setErrorMsg('Ingresa tu nombre para crear tu cuenta');
        return;
      }
      if (!/^\d{4,6}$/.test(pinUsuario.trim())) {
        setErrorMsg('Define un PIN numérico de 4 a 6 dígitos para poder relogearte');
        return;
      }
    }
    if (!nombreHogar.trim()) {
      setErrorMsg('Ingresa un nombre para tu hogar');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      await crearHogar({
        nombreHogar: nombreHogar.trim(),
        tipoHogar,
        nombreCreador: usuario ? undefined : nombreUsuario.trim(),
        pinCreador: usuario ? undefined : pinUsuario.trim(),
      });
      setNombreHogar('');
      setPinUsuario('');
      setModalType(null);
      irAlHogarSiCorresponde();
    } catch (e: any) {
      setErrorMsg(e?.message || 'Error al crear el hogar');
    } finally {
      setLoading(false);
    }
  };

  const handleUnirseHogar = async () => {
    if (!codigoInvitacion.trim()) {
      setErrorMsg('Ingresa el código de invitación del hogar (ej. DEMO01)');
      return;
    }
    if (!usuario) {
      if (!nombreUsuario.trim()) {
        setErrorMsg('Ingresa tu nombre para identificarte en la casa');
        return;
      }
      if (!/^\d{4,6}$/.test(pinUsuario.trim())) {
        setErrorMsg('Ingresa tu PIN de 4 a 6 dígitos (se creará tu cuenta si eres nuevo)');
        return;
      }
    }

    setLoading(true);
    setErrorMsg('');
    try {
      await unirseHogar({
        codigo: codigoInvitacion.trim().toUpperCase(),
        nombreMiembro: usuario ? undefined : nombreUsuario.trim(),
        pinMiembro: usuario ? undefined : pinUsuario.trim(),
      });
      setCodigoInvitacion('');
      setPinUsuario('');
      setModalType(null);
      irAlHogarSiCorresponde();
    } catch (e: any) {
      setErrorMsg(e?.message || 'Código inválido o PIN incorrecto');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async () => {
    if (!email.trim() || !password) {
      setErrorMsg('Ingresa tu correo y contraseña');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    try {
      await login(email.trim(), password);
      setPassword('');
      setModalType(null);
      irAlHogarSiCorresponde();
    } catch (e: any) {
      setErrorMsg(e?.message || 'Credenciales inválidas');
    } finally {
      setLoading(false);
    }
  };

  const handleDemo = () => {
    activarModoDemo();
    irAlHogarSiCorresponde();
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Barra Superior de Sesión si el usuario ya está identificado */}
        {usuario && (
          <View style={[styles.accountTopBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.accountLeft}>
              <View style={[styles.accountAvatar, { backgroundColor: colors.primary }]}>
                <Text style={styles.accountAvatarText}>
                  {usuario.nombre
                    .split(' ')
                    .map((p) => p[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text numberOfLines={1} style={[styles.accountGreeting, { color: colors.textPrimary }]}>
                  Hola, {usuario.nombre}
                </Text>
                <Text style={[styles.accountSub, { color: colors.textSecondary }]}>
                  {misHogares.length === 1
                    ? '1 casa registrada'
                    : `${misHogares.length} casas registradas`}
                </Text>
              </View>
            </View>

            <View style={styles.accountBtns}>
              {hogar && isFromInsideApp && (
                <Pressable
                  onPress={() => navigation.navigate('MainTabs')}
                  style={[styles.smallTopBtn, { backgroundColor: colors.primary }]}
                >
                  <Ionicons name="arrow-back" size={14} color="#FFFFFF" />
                  <Text style={[styles.smallTopBtnText, { color: '#FFFFFF' }]}>Volver</Text>
                </Pressable>
              )}
              <Pressable
                onPress={async () => {
                  await logout();
                }}
                style={[styles.smallTopBtn, { backgroundColor: colors.danger + '18', borderColor: colors.danger, borderWidth: 1 }]}
              >
                <Ionicons name="log-out-outline" size={15} color={colors.danger} />
                <Text style={[styles.smallTopBtnText, { color: colors.danger }]}>Salir</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Encabezado Principal con Logo */}
        <View style={[styles.header, usuario && { marginTop: spacing.md, marginBottom: spacing.lg }]}>
          <ThemedLogo size={72} borderRadius={18} style={styles.logoImage} />
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {usuario ? 'Tus Hogares en NeatHogar' : 'Bienvenido a NeatHogar'}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {usuario
              ? 'Selecciona una de tus casas para entrar de inmediato o vincula un nuevo hogar.'
              : 'Ingresa con tu Nombre y PIN o crea un hogar colaborativo o con Jefe de Hogar.'}
          </Text>
        </View>

        {/* ACCESO RÁPIDO A CASAS REGISTRADAS (cuando el usuario tiene sesión y casas) */}
        {usuario && misHogares.length > 0 && (
          <View style={styles.quickHomesSection}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="flash" size={18} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                Acceso Rápido — Mis Casas ({misHogares.length})
              </Text>
            </View>

            {misHogares.map((casa) => {
              const esActiva = hogar?.id_hogar === casa.id_hogar;
              const esConJefe = casa.tipo_hogar === 'JEFE_DE_HOGAR';
              const esAdminCasa = casa.mi_rol === 'ADMINISTRADOR';
              const cargandoEsta = switchingHomeId === casa.id_hogar;

              return (
                <AppCard
                  key={casa.id_hogar}
                  onPress={() => handleSeleccionarCasaRapida(casa.id_hogar)}
                  style={{
                    ...styles.quickHomeCard,
                    borderColor: esActiva ? colors.primary : colors.border,
                    borderWidth: esActiva ? 1.8 : 1,
                  }}
                >
                  <View style={styles.quickHomeRow}>
                    <View
                      style={[
                        styles.quickHomeIcon,
                        { backgroundColor: esConJefe ? colors.warning + '22' : colors.primary + '20' },
                      ]}
                    >
                      <Ionicons
                        name={esConJefe ? 'shield-checkmark' : 'people'}
                        size={22}
                        color={esConJefe ? colors.warning : colors.primary}
                      />
                    </View>

                    <View style={{ flex: 1 }}>
                      <View style={styles.quickHomeTitleRow}>
                        <Text numberOfLines={1} style={[styles.quickHomeName, { color: colors.textPrimary }]}>
                          {casa.nombre}
                        </Text>
                        {esActiva && (
                          <View style={[styles.activeTag, { backgroundColor: colors.primary }]}>
                            <Text style={styles.activeTagText}>Activa</Text>
                          </View>
                        )}
                      </View>

                      <Text style={[styles.quickHomeMeta, { color: colors.textSecondary }]}>
                        {esConJefe ? 'Con Jefe de Hogar' : 'Colaborativo'} •{' '}
                        {esAdminCasa ? 'Jefe de Hogar' : 'Integrante'} • {casa.total_miembros} miembros
                      </Text>

                      <View style={styles.quickHomeBadges}>
                        <View style={[styles.codeMiniPill, { backgroundColor: colors.softBg }]}>
                          <Ionicons name="key-outline" size={11} color={colors.primary} />
                          <Text style={[styles.codeMiniText, { color: colors.primary }]}>
                            {casa.codigo_invitacion}
                          </Text>
                        </View>

                        {esAdminCasa && casa.validaciones_pendientes > 0 && (
                          <View style={[styles.pendingPill, { backgroundColor: colors.warning + '24' }]}>
                            <Ionicons name="time-outline" size={12} color={colors.warning} />
                            <Text style={[styles.pendingPillText, { color: colors.warning }]}>
                              {casa.validaciones_pendientes} por validar
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>

                    {cargandoEsta ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <Ionicons name="chevron-forward-circle" size={26} color={colors.primary} />
                    )}
                  </View>
                </AppCard>
              );
            })}
          </View>
        )}

        {/* ACCESO RÁPIDO CON NOMBRE Y PIN (cuando NO hay sesión activa) */}
        {!usuario && (
          <Pressable
            onPress={() => abrirModal('pin_login')}
            style={({ pressed }) => [
              styles.pinLoginBanner,
              {
                backgroundColor: colors.primary,
                ...shadow(theme.isDark, 5),
              },
              pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] },
            ]}
          >
            <View style={styles.pinBannerLeft}>
              <View style={styles.pinIconWrap}>
                <Ionicons name="keypad" size={24} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.pinBannerTitle, { color: colors.onPrimary ?? '#FFFFFF' }]}>
                  Entrar con Nombre y PIN
                </Text>
                <Text style={[styles.pinBannerSub, { color: (colors.onPrimary ?? '#FFFFFF') + 'DD' }]}>
                  Relogéate rápido y recupera todas tus casas registradas
                </Text>
              </View>
            </View>
            <Ionicons name="arrow-forward-circle" size={28} color={colors.onPrimary ?? '#FFFFFF'} />
          </Pressable>
        )}

        {/* Dos tarjetas cuadradas lado a lado: Crear Casa / Unirse a Casa */}
        <View style={styles.cardsRow}>
          <Pressable
            onPress={() => abrirModal('crear')}
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
              <Ionicons name="home" size={28} color={colors.onPrimary ?? '#FFFFFF'} />
            </View>
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
              {usuario ? 'Crear Otra Casa' : 'Crear Núcleo Familiar'}
            </Text>
            <Text style={[styles.cardSub, { color: colors.textSecondary }]}>
              Elige modo Colaborativo o con Jefe de Hogar
            </Text>
          </Pressable>

          <Pressable
            onPress={() => abrirModal('unirse')}
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
              <Ionicons name="link" size={28} color={colors.onHighlight ?? colors.textPrimary} />
            </View>
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
              {usuario ? 'Unirme a Otra Casa' : 'Unirse a un Núcleo'}
            </Text>
            <Text style={[styles.cardSub, { color: colors.textSecondary }]}>
              Ingresa el código que te compartieron
            </Text>
          </Pressable>
        </View>

        {/* Acceso Rápido Modo Demo (solo si no está autenticado) */}
        {!usuario && (
          <Pressable
            onPress={handleDemo}
            style={[styles.demoBanner, { backgroundColor: colors.softBg, borderColor: colors.border }]}
          >
            <Ionicons name="sparkles" size={18} color={colors.warning} />
            <Text style={[styles.demoText, { color: colors.textPrimary }]}>
              ¿Probar códigos reales? Usa{' '}
              <Text style={{ color: colors.primary, fontFamily: fonts.bold }}>DEMO01</Text> o{' '}
              <Text style={{ color: colors.primary, fontFamily: fonts.bold }}>FAMI01</Text> (PIN 1234) o{' '}
              <Text style={{ color: colors.secondary, fontFamily: fonts.bold }}>Modo Demo</Text>
            </Text>
          </Pressable>
        )}

        {/* Botones Inferiores */}
        <View style={styles.footerButtons}>
          {!usuario && (
            <AppButton
              title="Crear Cuenta Sencilla (Nombre + PIN)"
              icon="person-add-outline"
              onPress={() => abrirModal('pin_registro')}
              variant="outline"
              style={styles.fullWidthButton}
            />
          )}
          <AppButton
            title="Personaliza tu App (Temas)"
            icon="color-palette-outline"
            onPress={() => setThemeModalVisible(true)}
            variant="secondary"
            style={styles.fullWidthButton}
          />
        </View>
      </ScrollView>

      {/* Modal Selector de Temas */}
      <ThemeSelectorModal visible={themeModalVisible} onClose={() => setThemeModalVisible(false)} />

      {/* Modal Formularios */}
      <Modal
        visible={modalType !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setModalType(null)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                {modalType === 'pin_login' && 'Entrar con Nombre y PIN'}
                {modalType === 'pin_registro' && 'Crear Cuenta con PIN'}
                {modalType === 'crear' && (usuario ? 'Crear Nueva Casa' : 'Crear Núcleo Familiar')}
                {modalType === 'unirse' && (usuario ? 'Unirme a Otra Casa' : 'Unirse a un Hogar')}
                {modalType === 'email_login' && 'Ingresar con Correo'}
              </Text>
              <Pressable
                onPress={() => setModalType(null)}
                style={[styles.modalClose, { backgroundColor: colors.softBg }]}
              >
                <Ionicons name="close" size={20} color={colors.textPrimary} />
              </Pressable>
            </View>

            <ScrollView style={{ maxHeight: 480 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* 1. LOGIN CON NOMBRE Y PIN */}
              {modalType === 'pin_login' && (
                <View>
                  <Text style={[styles.modalPrompt, { color: colors.textSecondary }]}>
                    Ingresa tu nombre y tu PIN de 4 a 6 dígitos para abrir tu sesión y tus casas:
                  </Text>
                  <AppInput
                    label="Tu Nombre"
                    placeholder="Ej: Benjamín Vidal"
                    value={nombreUsuario}
                    onChangeText={setNombreUsuario}
                    icon="person-outline"
                  />
                  <AppInput
                    label="Tu PIN (4 a 6 dígitos)"
                    placeholder="Ej: 1234"
                    value={pinUsuario}
                    onChangeText={(t) => setPinUsuario(t.replace(/\D/g, '').slice(0, 6))}
                    keyboardType="number-pad"
                    secureTextEntry
                    icon="keypad-outline"
                  />
                  <AppInput
                    label="Código de Hogar (Opcional — para entrar directo)"
                    placeholder="Ej: DEMO01 o FAMI01"
                    value={codigoInvitacion}
                    onChangeText={(t) => setCodigoInvitacion(t.toUpperCase())}
                    autoCapitalize="characters"
                    icon="key-outline"
                  />
                  {errorMsg ? <Text style={[styles.error, { color: colors.danger }]}>{errorMsg}</Text> : null}
                  <AppButton title="Ingresar a mi Cuenta" onPress={handlePinLogin} loading={loading} icon="log-in-outline" />

                  <View style={styles.switchLinksRow}>
                    <Pressable onPress={() => abrirModal('pin_registro')} style={styles.switchAuth}>
                      <Text style={[styles.switchAuthText, { color: colors.primary }]}>
                        ¿Primera vez? Crea tu PIN
                      </Text>
                    </Pressable>
                    <Pressable onPress={() => abrirModal('email_login')} style={styles.switchAuth}>
                      <Text style={[styles.switchAuthText, { color: colors.textSecondary }]}>
                        Usar correo
                      </Text>
                    </Pressable>
                  </View>
                </View>
              )}

              {/* 2. REGISTRO DE CUENTA SENCILLA CON PIN */}
              {modalType === 'pin_registro' && (
                <View>
                  <Text style={[styles.modalPrompt, { color: colors.textSecondary }]}>
                    Crea tu cuenta rápida solo con tu nombre y un PIN numérico fácil de recordar:
                  </Text>
                  <AppInput
                    label="Tu Nombre"
                    placeholder="Ej: Lucas Moya"
                    value={nombreUsuario}
                    onChangeText={setNombreUsuario}
                    icon="person-outline"
                  />
                  <AppInput
                    label="Elige un PIN (4 a 6 dígitos)"
                    placeholder="Ej: 2580"
                    value={pinUsuario}
                    onChangeText={(t) => setPinUsuario(t.replace(/\D/g, '').slice(0, 6))}
                    keyboardType="number-pad"
                    secureTextEntry
                    icon="keypad-outline"
                  />
                  {errorMsg ? <Text style={[styles.error, { color: colors.danger }]}>{errorMsg}</Text> : null}
                  <AppButton title="Registrarme" onPress={handlePinRegistro} loading={loading} icon="checkmark-circle-outline" />
                  <Pressable onPress={() => abrirModal('pin_login')} style={styles.switchAuth}>
                    <Text style={[styles.switchAuthText, { color: colors.primary }]}>
                      ¿Ya tienes PIN? Entra aquí
                    </Text>
                  </Pressable>
                </View>
              )}

              {/* 3. CREAR HOGAR (CON SELECTOR DE 2 TIPOS DE HOGAR) */}
              {modalType === 'crear' && (
                <View>
                  {!usuario && (
                    <>
                      <Text style={[styles.modalPrompt, { color: colors.textSecondary }]}>
                        Identifícate con tu nombre y un PIN para poder volver a entrar cuando quieras:
                      </Text>
                      <AppInput
                        label="Tu Nombre"
                        placeholder="Ej: Benjamín Vidal"
                        value={nombreUsuario}
                        onChangeText={setNombreUsuario}
                        icon="person-outline"
                      />
                      <AppInput
                        label="Tu PIN de Acceso (4 a 6 dígitos)"
                        placeholder="Ej: 1234"
                        value={pinUsuario}
                        onChangeText={(t) => setPinUsuario(t.replace(/\D/g, '').slice(0, 6))}
                        keyboardType="number-pad"
                        secureTextEntry
                        icon="keypad-outline"
                      />
                    </>
                  )}

                  <AppInput
                    label="Nombre de la Casa / Hogar"
                    placeholder="Ej: Casa Familiar, Depto Centro"
                    value={nombreHogar}
                    onChangeText={setNombreHogar}
                    icon="home-outline"
                  />

                  <Text style={[styles.typeSectionLabel, { color: colors.textPrimary }]}>
                    Tipo de Organización del Hogar:
                  </Text>

                  {/* Opción 1: Colaborativo */}
                  <Pressable
                    onPress={() => setTipoHogar('COLABORATIVO')}
                    style={[
                      styles.homeTypeOption,
                      {
                        backgroundColor:
                          tipoHogar === 'COLABORATIVO' ? colors.primary + '16' : colors.softBg,
                        borderColor: tipoHogar === 'COLABORATIVO' ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.homeTypeIcon,
                        { backgroundColor: tipoHogar === 'COLABORATIVO' ? colors.primary : colors.surface },
                      ]}
                    >
                      <Ionicons
                        name="people"
                        size={20}
                        color={tipoHogar === 'COLABORATIVO' ? '#FFFFFF' : colors.primary}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.homeTypeTitle, { color: colors.textPrimary }]}>
                        Hogar Colaborativo (Todos iguales)
                      </Text>
                      <Text style={[styles.homeTypeDesc, { color: colors.textSecondary }]}>
                        Todos tienen permiso directo para anotar tareas, compras, gastos y marcar completadas.
                      </Text>
                    </View>
                    <Ionicons
                      name={tipoHogar === 'COLABORATIVO' ? 'radio-button-on' : 'radio-button-off'}
                      size={20}
                      color={tipoHogar === 'COLABORATIVO' ? colors.primary : colors.textSecondary}
                    />
                  </Pressable>

                  {/* Opción 2: Con Jefe de Hogar */}
                  <Pressable
                    onPress={() => setTipoHogar('JEFE_DE_HOGAR')}
                    style={[
                      styles.homeTypeOption,
                      {
                        backgroundColor:
                          tipoHogar === 'JEFE_DE_HOGAR' ? colors.warning + '18' : colors.softBg,
                        borderColor: tipoHogar === 'JEFE_DE_HOGAR' ? colors.warning : colors.border,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.homeTypeIcon,
                        { backgroundColor: tipoHogar === 'JEFE_DE_HOGAR' ? colors.warning : colors.surface },
                      ]}
                    >
                      <Ionicons
                        name="shield-checkmark"
                        size={20}
                        color={tipoHogar === 'JEFE_DE_HOGAR' ? '#FFFFFF' : colors.warning}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.homeTypeTitle, { color: colors.textPrimary }]}>
                        Con Jefe de Hogar (Padres / Hijos)
                      </Text>
                      <Text style={[styles.homeTypeDesc, { color: colors.textSecondary }]}>
                        Tú serás el Jefe de Hogar y deberás validar las tareas, compras y gastos que realicen los demás integrantes.
                      </Text>
                    </View>
                    <Ionicons
                      name={tipoHogar === 'JEFE_DE_HOGAR' ? 'radio-button-on' : 'radio-button-off'}
                      size={20}
                      color={tipoHogar === 'JEFE_DE_HOGAR' ? colors.warning : colors.textSecondary}
                    />
                  </Pressable>

                  {errorMsg ? <Text style={[styles.error, { color: colors.danger }]}>{errorMsg}</Text> : null}
                  <AppButton title="Crear Hogar y Entrar" onPress={handleCrearHogar} loading={loading} icon="checkmark" />
                </View>
              )}

              {/* 4. UNIRSE A UN HOGAR CON CÓDIGO */}
              {modalType === 'unirse' && (
                <View>
                  <Text style={[styles.modalPrompt, { color: colors.textSecondary }]}>
                    Ingresa el código de 6 caracteres compartido por el creador del hogar:
                  </Text>
                  <AppInput
                    label="Código de Invitación"
                    placeholder="Ej: DEMO01 o FAMI01"
                    value={codigoInvitacion}
                    onChangeText={(t) => setCodigoInvitacion(t.toUpperCase())}
                    autoCapitalize="characters"
                    icon="key-outline"
                  />

                  {!usuario && (
                    <>
                      <AppInput
                        label="Tu Nombre"
                        placeholder="Ej: Sofía Vidal"
                        value={nombreUsuario}
                        onChangeText={setNombreUsuario}
                        icon="person-outline"
                      />
                      <AppInput
                        label="Tu PIN (4 a 6 dígitos)"
                        placeholder="Si ya tienes cuenta usa tu PIN; si no, se creará"
                        value={pinUsuario}
                        onChangeText={(t) => setPinUsuario(t.replace(/\D/g, '').slice(0, 6))}
                        keyboardType="number-pad"
                        secureTextEntry
                        icon="keypad-outline"
                      />
                    </>
                  )}

                  {errorMsg ? <Text style={[styles.error, { color: colors.danger }]}>{errorMsg}</Text> : null}
                  <AppButton title="Validar y Unirme" onPress={handleUnirseHogar} loading={loading} icon="enter-outline" />
                </View>
              )}

              {/* 5. LOGIN SECUNDARIO CON EMAIL */}
              {modalType === 'email_login' && (
                <View>
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
                  <AppButton title="Iniciar Sesión" onPress={handleEmailLogin} loading={loading} />
                  <Pressable onPress={() => abrirModal('pin_login')} style={styles.switchAuth}>
                    <Text style={[styles.switchAuthText, { color: colors.primary }]}>
                      Volver a ingreso rápido con Nombre y PIN
                    </Text>
                  </Pressable>
                </View>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
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
    paddingBottom: 36,
    flexGrow: 1,
  },
  accountTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: 8,
  },
  accountLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  accountAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountAvatarText: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: '#FFFFFF',
  },
  accountGreeting: {
    fontFamily: fonts.bold,
    fontSize: 15,
  },
  accountSub: {
    fontFamily: fonts.regular,
    fontSize: 12,
  },
  accountBtns: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  smallTopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  smallTopBtnText: {
    fontFamily: fonts.semibold,
    fontSize: 12,
  },
  header: {
    alignItems: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  logoImage: {
    width: 72,
    height: 72,
    borderRadius: 18,
    marginBottom: spacing.sm,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 25,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: spacing.md,
    lineHeight: 19,
  },
  quickHomesSection: {
    marginBottom: spacing.lg,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: 16,
  },
  quickHomeCard: {
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  quickHomeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  quickHomeIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickHomeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quickHomeName: {
    fontFamily: fonts.bold,
    fontSize: 16,
    flexShrink: 1,
  },
  activeTag: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  activeTagText: {
    fontFamily: fonts.bold,
    fontSize: 10,
    color: '#FFFFFF',
  },
  quickHomeMeta: {
    fontFamily: fonts.regular,
    fontSize: 12,
    marginTop: 2,
  },
  quickHomeBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  codeMiniPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  codeMiniText: {
    fontFamily: fonts.bold,
    fontSize: 11,
    letterSpacing: 0.6,
  },
  pendingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  pendingPillText: {
    fontFamily: fonts.semibold,
    fontSize: 11,
  },
  pinLoginBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: radius.xl,
    marginBottom: spacing.lg,
    gap: 10,
  },
  pinBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  pinIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinBannerTitle: {
    fontFamily: fonts.bold,
    fontSize: 16,
  },
  pinBannerSub: {
    fontFamily: fonts.regular,
    fontSize: 12,
    marginTop: 2,
  },
  cardsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  squareCard: {
    flex: 1,
    minHeight: 160,
    borderRadius: radius.xl,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  cardTitle: {
    fontFamily: fonts.bold,
    fontSize: 14,
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
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: spacing.lg,
  },
  demoText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    flex: 1,
  },
  footerButtons: {
    gap: spacing.sm,
    marginTop: 'auto',
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
    flex: 1,
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
  typeSectionLabel: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    marginBottom: spacing.sm,
  },
  homeTypeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    marginBottom: spacing.sm,
  },
  homeTypeIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeTypeTitle: {
    fontFamily: fonts.bold,
    fontSize: 13,
  },
  homeTypeDesc: {
    fontFamily: fonts.regular,
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  error: {
    fontFamily: fonts.medium,
    fontSize: 12,
    marginBottom: spacing.sm,
  },
  switchLinksRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  switchAuth: {
    marginTop: spacing.sm,
    alignItems: 'center',
  },
  switchAuthText: {
    fontFamily: fonts.semibold,
    fontSize: 13,
  },
});
