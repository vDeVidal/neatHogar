import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
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
import { useAuth } from '../context/AuthContext';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../theme/ThemeContext';
import { fonts, radius, shadow, spacing } from '../theme/tokens';
import { NivelDisponibilidad, TipoHogar } from '../types';
import { AppButton } from './AppButton';
import { AppInput } from './AppInput';
import { ThemedLogo } from './ThemedLogo';
import { ThemeSelectorModal } from './ThemeSelectorModal';

export function HomeHeaderBar() {
  const { colors, theme } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const {
    usuario,
    hogar,
    misHogares,
    esJefeDeHogar,
    esHogarConJefe,
    validacionesPendientesCount,
    seleccionarHogar,
    crearHogar,
    unirseHogar,
    salirHogarActual,
    actualizarDisponibilidad,
    actualizarPinPerfil,
    logout,
  } = useAuth();

  const [themeModalVisible, setThemeModalVisible] = useState(false);
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [homesModalVisible, setHomesModalVisible] = useState(false);
  const [addMode, setAddMode] = useState<'none' | 'crear' | 'unirse'>('none');

  // Estados para crear / unirse a otra casa rápido desde el Header
  const [nombreNuevoHogar, setNombreNuevoHogar] = useState('');
  const [tipoNuevoHogar, setTipoNuevoHogar] = useState<TipoHogar>('COLABORATIVO');
  const [codigoUnirse, setCodigoUnirse] = useState('');
  const [nuevoPin, setNuevoPin] = useState('');
  const [switchingId, setSwitchingId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const iniciales = (usuario?.nombre ?? 'U')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const handleSelectHome = async (idHogar: number) => {
    if (idHogar === hogar?.id_hogar) {
      setHomesModalVisible(false);
      return;
    }
    setSwitchingId(idHogar);
    try {
      await seleccionarHogar(idHogar);
      setHomesModalVisible(false);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'No se pudo cambiar de hogar');
    } finally {
      setSwitchingId(null);
    }
  };

  const handleCrearOtraCasa = async () => {
    if (!nombreNuevoHogar.trim()) {
      setErrorMsg('Ingresa un nombre para el nuevo hogar');
      return;
    }
    setSubmitting(true);
    setErrorMsg('');
    try {
      await crearHogar({
        nombreHogar: nombreNuevoHogar.trim(),
        tipoHogar: tipoNuevoHogar,
      });
      setNombreNuevoHogar('');
      setAddMode('none');
      setHomesModalVisible(false);
    } catch (e: any) {
      setErrorMsg(e?.message || 'No se pudo crear la casa');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnirseOtraCasa = async () => {
    if (!codigoUnirse.trim()) {
      setErrorMsg('Ingresa el código de invitación');
      return;
    }
    setSubmitting(true);
    setErrorMsg('');
    try {
      await unirseHogar({ codigo: codigoUnirse.trim() });
      setCodigoUnirse('');
      setAddMode('none');
      setHomesModalVisible(false);
    } catch (e: any) {
      setErrorMsg(e?.message || 'Código inválido o no encontrado');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGuardarNuevoPin = async () => {
    if (!/^\d{4,6}$/.test(nuevoPin.trim())) {
      Alert.alert('PIN inválido', 'El PIN debe contener entre 4 y 6 dígitos numéricos.');
      return;
    }
    setSubmitting(true);
    try {
      await actualizarPinPerfil(nuevoPin.trim());
      setNuevoPin('');
      Alert.alert('PIN actualizado', 'Ya puedes usar tu nuevo PIN junto con tu nombre para ingresar.');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'No se pudo actualizar el PIN');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[
        styles.safeHeader,
        {
          backgroundColor: colors.surface,
          borderBottomColor: colors.border,
          ...shadow(theme.isDark, 4),
        },
      ]}
    >
      {/* Fila Principal del Header */}
      <View style={styles.topRow}>
        <Pressable
          onPress={() => {
            setAddMode('none');
            setErrorMsg('');
            setHomesModalVisible(true);
          }}
          style={({ pressed }) => [styles.brandSelector, pressed && { opacity: 0.8 }]}
        >
          <ThemedLogo size={36} borderRadius={10} />
          <View style={styles.titleCol}>
            <View style={styles.homeNameRow}>
              <Text numberOfLines={1} style={[styles.homeName, { color: colors.textPrimary }]}>
                {hogar?.nombre ?? 'Mi Hogar'}
              </Text>
              <Ionicons name="chevron-down" size={16} color={colors.primary} />
              {esJefeDeHogar && validacionesPendientesCount > 0 && (
                <View style={[styles.pendingDot, { backgroundColor: colors.warning }]}>
                  <Text style={styles.pendingDotText}>{validacionesPendientesCount}</Text>
                </View>
              )}
            </View>
            <View style={styles.roleMetaRow}>
              <Ionicons
                name={esHogarConJefe ? 'shield-checkmark' : 'people'}
                size={12}
                color={esHogarConJefe ? colors.warning : colors.secondary}
              />
              <Text numberOfLines={1} style={[styles.roleMetaText, { color: colors.textSecondary }]}>
                {esHogarConJefe ? 'Jefe de Hogar' : 'Colaborativo'} •{' '}
                {esJefeDeHogar ? 'Eres Jefe' : 'Integrante'}
              </Text>
            </View>
          </View>
        </Pressable>

        <View style={styles.actionsRow}>
          {/* Ir a Pantalla de Inicio (Acceso Rápido / Vinculación) */}
          <Pressable
            onPress={() => navigation.navigate('InicioHogares')}
            style={[styles.iconBtn, { backgroundColor: colors.softBg, borderColor: colors.border }]}
          >
            <Ionicons name="apps-outline" size={18} color={colors.primary} />
          </Pressable>

          {/* Selector de Temas */}
          <Pressable
            onPress={() => setThemeModalVisible(true)}
            style={[styles.iconBtn, { backgroundColor: colors.softBg, borderColor: colors.border }]}
          >
            <Ionicons name="color-palette-outline" size={18} color={colors.primary} />
          </Pressable>

          {/* Perfil y Cerrar Sesión */}
          <Pressable
            onPress={() => setProfileModalVisible(true)}
            style={[styles.avatarBtn, { backgroundColor: colors.primary }]}
          >
            <Text style={[styles.avatarBtnText, { color: colors.onPrimary ?? '#FFFFFF' }]}>{iniciales}</Text>
          </Pressable>
        </View>
      </View>

      {/* Barra de Acceso Rápido de Casas en el Header */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.quickHomesStrip}
      >
        {misHogares.map((item) => {
          const isActive = item.id_hogar === hogar?.id_hogar;
          const isSwitching = switchingId === item.id_hogar;
          const isJefeType = item.tipo_hogar === 'JEFE_DE_HOGAR';

          return (
            <Pressable
              key={item.id_hogar}
              onPress={() => handleSelectHome(item.id_hogar)}
              style={[
                styles.homePill,
                {
                  backgroundColor: isActive ? colors.primary : colors.softBg,
                  borderColor: isActive ? colors.primary : colors.border,
                },
              ]}
            >
              {isSwitching ? (
                <ActivityIndicator size="small" color={isActive ? '#FFFFFF' : colors.primary} />
              ) : (
                <Ionicons
                  name={isJefeType ? 'shield-checkmark-outline' : 'home-outline'}
                  size={13}
                  color={isActive ? (colors.onPrimary ?? '#FFFFFF') : colors.primary}
                />
              )}
              <Text
                numberOfLines={1}
                style={[
                  styles.homePillText,
                  { color: isActive ? (colors.onPrimary ?? '#FFFFFF') : colors.textPrimary },
                ]}
              >
                {item.nombre}
              </Text>
              {item.mi_rol === 'ADMINISTRADOR' && item.validaciones_pendientes > 0 && (
                <View
                  style={[
                    styles.miniBadge,
                    { backgroundColor: isActive ? '#FFFFFF' : colors.warning },
                  ]}
                >
                  <Text
                    style={[
                      styles.miniBadgeText,
                      { color: isActive ? colors.primary : '#FFFFFF' },
                    ]}
                  >
                    {item.validaciones_pendientes}
                  </Text>
                </View>
              )}
            </Pressable>
          );
        })}

        <Pressable
          onPress={() => {
            setAddMode('crear');
            setErrorMsg('');
            setHomesModalVisible(true);
          }}
          style={[styles.addHomePill, { borderColor: colors.primary, backgroundColor: colors.background }]}
        >
          <Ionicons name="add" size={14} color={colors.primary} />
          <Text style={[styles.addHomePillText, { color: colors.primary }]}>Otra Casa</Text>
        </Pressable>
      </ScrollView>

      {/* Modal de Temas */}
      <ThemeSelectorModal visible={themeModalVisible} onClose={() => setThemeModalVisible(false)} />

      {/* Modal Gestión / Cambio Rápido de Casas */}
      <Modal
        visible={homesModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setHomesModalVisible(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Mis Casas ({misHogares.length})</Text>
              <Pressable
                onPress={() => setHomesModalVisible(false)}
                style={[styles.closeBtn, { backgroundColor: colors.softBg }]}
              >
                <Ionicons name="close" size={20} color={colors.textPrimary} />
              </Pressable>
            </View>

            <ScrollView style={{ maxHeight: 440 }} showsVerticalScrollIndicator={false}>
              {misHogares.map((h) => {
                const active = h.id_hogar === hogar?.id_hogar;
                return (
                  <Pressable
                    key={h.id_hogar}
                    onPress={() => handleSelectHome(h.id_hogar)}
                    style={[
                      styles.homeListCard,
                      {
                        backgroundColor: active ? colors.primary + '18' : colors.card,
                        borderColor: active ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <View style={styles.homeListLeft}>
                      <View
                        style={[
                          styles.homeListIcon,
                          { backgroundColor: active ? colors.primary : colors.softBg },
                        ]}
                      >
                        <Ionicons
                          name={h.tipo_hogar === 'JEFE_DE_HOGAR' ? 'shield-checkmark' : 'people'}
                          size={18}
                          color={active ? '#FFFFFF' : colors.primary}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.homeListTitle, { color: colors.textPrimary }]}>{h.nombre}</Text>
                        <Text style={[styles.homeListSub, { color: colors.textSecondary }]}>
                          {h.tipo_hogar === 'JEFE_DE_HOGAR' ? 'Con Jefe de Hogar' : 'Colaborativo'} •{' '}
                          {h.mi_rol === 'ADMINISTRADOR' ? 'Jefe de Hogar' : 'Integrante'} • Cód: {h.codigo_invitacion}
                        </Text>
                      </View>
                    </View>
                    {active ? (
                      <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                    ) : (
                      <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                    )}
                  </Pressable>
                );
              })}

              {/* Botones para sumar otra casa */}
              <View style={styles.addHomeBtnsRow}>
                <Pressable
                  onPress={() => {
                    setAddMode(addMode === 'crear' ? 'none' : 'crear');
                    setErrorMsg('');
                  }}
                  style={[
                    styles.modeTabBtn,
                    {
                      backgroundColor: addMode === 'crear' ? colors.primary : colors.softBg,
                      borderColor: addMode === 'crear' ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Ionicons
                    name="add-circle-outline"
                    size={16}
                    color={addMode === 'crear' ? '#FFFFFF' : colors.primary}
                  />
                  <Text
                    style={[
                      styles.modeTabText,
                      { color: addMode === 'crear' ? '#FFFFFF' : colors.textPrimary },
                    ]}
                  >
                    Crear Casa
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => {
                    setAddMode(addMode === 'unirse' ? 'none' : 'unirse');
                    setErrorMsg('');
                  }}
                  style={[
                    styles.modeTabBtn,
                    {
                      backgroundColor: addMode === 'unirse' ? colors.primary : colors.softBg,
                      borderColor: addMode === 'unirse' ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Ionicons
                    name="link-outline"
                    size={16}
                    color={addMode === 'unirse' ? '#FFFFFF' : colors.primary}
                  />
                  <Text
                    style={[
                      styles.modeTabText,
                      { color: addMode === 'unirse' ? '#FFFFFF' : colors.textPrimary },
                    ]}
                  >
                    Unirme con Código
                  </Text>
                </Pressable>
              </View>

              {addMode === 'crear' && (
                <View style={[styles.subForm, { backgroundColor: colors.softBg, borderColor: colors.border }]}>
                  <AppInput
                    label="Nombre de la Nueva Casa"
                    placeholder="Ej: Casa de Verano, Familia Moya"
                    value={nombreNuevoHogar}
                    onChangeText={setNombreNuevoHogar}
                    icon="home-outline"
                  />
                  <Text style={[styles.typeLabel, { color: colors.textSecondary }]}>Tipo de Hogar:</Text>
                  <View style={styles.typeRow}>
                    <Pressable
                      onPress={() => setTipoNuevoHogar('COLABORATIVO')}
                      style={[
                        styles.typeCard,
                        {
                          backgroundColor:
                            tipoNuevoHogar === 'COLABORATIVO' ? colors.primary : colors.surface,
                          borderColor:
                            tipoNuevoHogar === 'COLABORATIVO' ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      <Ionicons
                        name="people-outline"
                        size={18}
                        color={tipoNuevoHogar === 'COLABORATIVO' ? '#FFFFFF' : colors.primary}
                      />
                      <Text
                        style={[
                          styles.typeCardTitle,
                          { color: tipoNuevoHogar === 'COLABORATIVO' ? '#FFFFFF' : colors.textPrimary },
                        ]}
                      >
                        Colaborativo
                      </Text>
                      <Text
                        style={[
                          styles.typeCardDesc,
                          {
                            color:
                              tipoNuevoHogar === 'COLABORATIVO' ? '#FFFFFFCC' : colors.textSecondary,
                          },
                        ]}
                      >
                        Todos anotan y validan
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={() => setTipoNuevoHogar('JEFE_DE_HOGAR')}
                      style={[
                        styles.typeCard,
                        {
                          backgroundColor:
                            tipoNuevoHogar === 'JEFE_DE_HOGAR' ? colors.primary : colors.surface,
                          borderColor:
                            tipoNuevoHogar === 'JEFE_DE_HOGAR' ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      <Ionicons
                        name="shield-checkmark-outline"
                        size={18}
                        color={tipoNuevoHogar === 'JEFE_DE_HOGAR' ? '#FFFFFF' : colors.warning}
                      />
                      <Text
                        style={[
                          styles.typeCardTitle,
                          { color: tipoNuevoHogar === 'JEFE_DE_HOGAR' ? '#FFFFFF' : colors.textPrimary },
                        ]}
                      >
                        Jefe de Hogar
                      </Text>
                      <Text
                        style={[
                          styles.typeCardDesc,
                          {
                            color:
                              tipoNuevoHogar === 'JEFE_DE_HOGAR' ? '#FFFFFFCC' : colors.textSecondary,
                          },
                        ]}
                      >
                        Jefe valida acciones
                      </Text>
                    </Pressable>
                  </View>
                  {errorMsg ? <Text style={[styles.errText, { color: colors.danger }]}>{errorMsg}</Text> : null}
                  <AppButton title="Crear y Entrar" onPress={handleCrearOtraCasa} loading={submitting} />
                </View>
              )}

              {addMode === 'unirse' && (
                <View style={[styles.subForm, { backgroundColor: colors.softBg, borderColor: colors.border }]}>
                  <AppInput
                    label="Código de Invitación"
                    placeholder="Ej: DEMO01 o FAMI01"
                    value={codigoUnirse}
                    onChangeText={(t) => setCodigoUnirse(t.toUpperCase())}
                    autoCapitalize="characters"
                    icon="key-outline"
                  />
                  {errorMsg ? <Text style={[styles.errText, { color: colors.danger }]}>{errorMsg}</Text> : null}
                  <AppButton title="Unirme a esta Casa" onPress={handleUnirseOtraCasa} loading={submitting} />
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal de Perfil, PIN, Disponibilidad y Cerrar Sesión */}
      <Modal
        visible={profileModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setProfileModalVisible(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Mi Cuenta</Text>
              <Pressable
                onPress={() => setProfileModalVisible(false)}
                style={[styles.closeBtn, { backgroundColor: colors.softBg }]}
              >
                <Ionicons name="close" size={20} color={colors.textPrimary} />
              </Pressable>
            </View>

            <View style={[styles.userCardBox, { backgroundColor: colors.softBg, borderColor: colors.border }]}>
              <View style={[styles.bigAvatar, { backgroundColor: colors.primary }]}>
                <Text style={styles.bigAvatarText}>{iniciales}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.userTitle, { color: colors.textPrimary }]}>{usuario?.nombre}</Text>
                <Text style={[styles.userHint, { color: colors.textSecondary }]}>
                  Ingresa en cualquier dispositivo con tu nombre "{usuario?.nombre}" y tu PIN
                </Text>
              </View>
            </View>

            <Text style={[styles.sectionSmallTitle, { color: colors.textPrimary }]}>Disponibilidad semanal:</Text>
            <View style={styles.dispOptions}>
              {(['ALTA', 'MEDIA', 'BAJA'] as NivelDisponibilidad[]).map((d) => {
                const isSelected = usuario?.disponibilidad === d;
                return (
                  <Pressable
                    key={d}
                    onPress={() => actualizarDisponibilidad(d)}
                    style={[
                      styles.dispBtn,
                      {
                        backgroundColor: isSelected ? colors.primary : colors.card,
                        borderColor: isSelected ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.dispBtnText,
                        { color: isSelected ? (colors.onPrimary ?? '#FFFFFF') : colors.textPrimary },
                      ]}
                    >
                      {d}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Cambiar o Configurar PIN */}
            <Text style={[styles.sectionSmallTitle, { color: colors.textPrimary }]}>
              Actualizar PIN de acceso (4-6 dígitos):
            </Text>
            <View style={styles.pinUpdateRow}>
              <View style={{ flex: 1 }}>
                <AppInput
                  placeholder="Nuevo PIN (ej. 1234)"
                  value={nuevoPin}
                  onChangeText={(t) => setNuevoPin(t.replace(/\D/g, '').slice(0, 6))}
                  keyboardType="number-pad"
                  secureTextEntry
                  icon="keypad-outline"
                  containerStyle={{ marginBottom: 0 }}
                />
              </View>
              <AppButton
                title="Guardar"
                onPress={handleGuardarNuevoPin}
                loading={submitting}
                disabled={nuevoPin.length < 4}
                style={{ paddingHorizontal: 16 }}
              />
            </View>

            <View style={styles.bottomModalBtns}>
              {hogar && (
                <AppButton
                  title="Abandonar este hogar"
                  variant="ghost"
                  icon="exit-outline"
                  onPress={() => {
                    Alert.alert(
                      'Salir del hogar',
                      `¿Seguro que deseas dejar "${hogar.nombre}"?`,
                      [
                        { text: 'Cancelar', style: 'cancel' },
                        {
                          text: 'Salir',
                          style: 'destructive',
                          onPress: async () => {
                            setProfileModalVisible(false);
                            try {
                              await salirHogarActual();
                            } catch (e: any) {
                              Alert.alert('Aviso', e?.message || 'No se pudo abandonar el hogar');
                            }
                          },
                        },
                      ],
                    );
                  }}
                />
              )}

              <AppButton
                title="Cerrar Sesión en este Dispositivo"
                variant="danger"
                icon="log-out-outline"
                onPress={async () => {
                  setProfileModalVisible(false);
                  await logout();
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
  safeHeader: {
    borderBottomWidth: 1,
    paddingHorizontal: spacing.md,
    paddingBottom: 8,
    paddingTop: 4,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  brandSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  logo: {
    width: 36,
    height: 36,
    borderRadius: 10,
  },
  titleCol: {
    flex: 1,
  },
  homeNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  homeName: {
    fontFamily: fonts.bold,
    fontSize: 16,
    flexShrink: 1,
  },
  pendingDot: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingDotText: {
    fontFamily: fonts.bold,
    fontSize: 10,
    color: '#FFFFFF',
  },
  roleMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 1,
  },
  roleMetaText: {
    fontFamily: fonts.medium,
    fontSize: 11,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarBtnText: {
    fontFamily: fonts.bold,
    fontSize: 12,
  },
  quickHomesStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 8,
  },
  homePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    borderWidth: 1,
    maxWidth: 165,
  },
  homePillText: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    flexShrink: 1,
  },
  miniBadge: {
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniBadgeText: {
    fontFamily: fonts.bold,
    fontSize: 10,
  },
  addHomePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  addHomePillText: {
    fontFamily: fonts.semibold,
    fontSize: 12,
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
    padding: spacing.lg,
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
  homeListCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.2,
    marginBottom: spacing.sm,
  },
  homeListLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    paddingRight: 8,
  },
  homeListIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeListTitle: {
    fontFamily: fonts.bold,
    fontSize: 15,
  },
  homeListSub: {
    fontFamily: fonts.regular,
    fontSize: 11,
    marginTop: 2,
  },
  addHomeBtnsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  modeTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  modeTabText: {
    fontFamily: fonts.semibold,
    fontSize: 13,
  },
  subForm: {
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginTop: 4,
  },
  typeLabel: {
    fontFamily: fonts.medium,
    fontSize: 12,
    marginBottom: 6,
  },
  typeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  typeCard: {
    flex: 1,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1.2,
    alignItems: 'center',
  },
  typeCardTitle: {
    fontFamily: fonts.bold,
    fontSize: 13,
    marginTop: 4,
  },
  typeCardDesc: {
    fontFamily: fonts.regular,
    fontSize: 10,
    textAlign: 'center',
    marginTop: 2,
  },
  errText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    marginBottom: spacing.sm,
  },
  userCardBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  bigAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bigAvatarText: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: '#FFFFFF',
  },
  userTitle: {
    fontFamily: fonts.bold,
    fontSize: 16,
  },
  userHint: {
    fontFamily: fonts.regular,
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  sectionSmallTitle: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    marginBottom: 6,
  },
  dispOptions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  dispBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
  },
  dispBtnText: {
    fontFamily: fonts.bold,
    fontSize: 12,
  },
  pinUpdateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  bottomModalBtns: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
});
