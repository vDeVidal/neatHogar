import React, { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { AppButton } from '../components/AppButton';
import { AppCard } from '../components/AppCard';
import { AppInput } from '../components/AppInput';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { useTheme } from '../theme/ThemeContext';
import { fonts, radius, shadow, spacing } from '../theme/tokens';
import { RolMiembro } from '../types';

export function AddMemberPage() {
  const { colors, theme } = useTheme();
  const navigation = useNavigation();
  const { hogar, esHogarConJefe, invitarMiembro, generarCodigoInvitacionTemporal } = useAuth();

  const [tipoMiembro, setTipoMiembro] = useState<RolMiembro>('MIEMBRO');
  const [nombreInvitado, setNombreInvitado] = useState('');
  const [permisoValidarTareas, setPermisoValidarTareas] = useState(!esHogarConJefe);
  const [permisoCrearTareas, setPermisoCrearTareas] = useState(!esHogarConJefe);
  const [permisoCompras, setPermisoCompras] = useState(!esHogarConJefe);
  const [loading, setLoading] = useState(false);
  const [generatingCode, setGeneratingCode] = useState(false);

  // Estado del código dinámico efímero (TTL 5 minutos = 300s)
  const [codigoTemporal, setCodigoTemporal] = useState<string | null>(
    hogar?.invitacion_temporal?.codigo ?? null,
  );
  const [expiraEnMs, setExpiraEnMs] = useState<number | null>(
    hogar?.invitacion_temporal?.expira_en
      ? new Date(hogar.invitacion_temporal.expira_en).getTime()
      : null,
  );
  const [segundosRestantes, setSegundosRestantes] = useState<number>(
    hogar?.invitacion_temporal?.segundos_restantes ?? 0,
  );

  // Consultar al abrir si hay un código temporal activo en el servidor
  useEffect(() => {
    let mounted = true;
    api
      .getInvitacionActiva()
      .then((res) => {
        if (!mounted) return;
        if (res.activa && res.codigo && res.expira_en) {
          setCodigoTemporal(res.codigo);
          setExpiraEnMs(new Date(res.expira_en).getTime());
          setSegundosRestantes(res.segundos_restantes);
        }
      })
      .catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, []);

  // Temporizador en cuenta regresiva en vivo (04:59, 04:58...)
  useEffect(() => {
    if (!expiraEnMs) return;
    const tick = () => {
      const diff = Math.max(0, Math.ceil((expiraEnMs - Date.now()) / 1000));
      setSegundosRestantes(diff);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [expiraEnMs]);

  const formatearCountdown = (totalSeg: number) => {
    const min = Math.floor(totalSeg / 60);
    const seg = totalSeg % 60;
    return `${String(min).padStart(2, '0')}:${String(seg).padStart(2, '0')}`;
  };

  const seleccionarRol = (rol: RolMiembro) => {
    setTipoMiembro(rol);
    if (rol === 'ADMINISTRADOR') {
      setPermisoValidarTareas(true);
      setPermisoCrearTareas(true);
      setPermisoCompras(true);
    } else {
      const porDefecto = !esHogarConJefe;
      setPermisoValidarTareas(porDefecto);
      setPermisoCrearTareas(porDefecto);
      setPermisoCompras(porDefecto);
    }
  };

  const handleGenerarCodigo5Min = async () => {
    setGeneratingCode(true);
    try {
      const inv = await generarCodigoInvitacionTemporal({
        rol: tipoMiembro,
        puede_validar_tareas: tipoMiembro === 'ADMINISTRADOR' ? true : permisoValidarTareas,
        puede_crear_tareas: tipoMiembro === 'ADMINISTRADOR' ? true : permisoCrearTareas,
        puede_gestionar_compras: tipoMiembro === 'ADMINISTRADOR' ? true : permisoCompras,
      });
      setCodigoTemporal(inv.codigo);
      setExpiraEnMs(new Date(inv.expira_en).getTime());
      setSegundosRestantes(inv.segundos_restantes ?? 300);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'No se pudo generar el código temporal');
    } finally {
      setGeneratingCode(false);
    }
  };

  const handleCopiarCodigo = async () => {
    const code = codigoTemporal || hogar?.codigo_invitacion;
    if (!code) return;
    await Clipboard.setStringAsync(code);
    Alert.alert('Código copiado', `El código "${code}" se copió al portapapeles.`);
  };

  const handleCompartirCodigo = async () => {
    const code = codigoTemporal || hogar?.codigo_invitacion;
    if (!code) return;
    try {
      await Share.share({
        message: `Únete a nuestro hogar "${hogar?.nombre ?? 'NeatHogar'}" con el código temporal ${code} (válido por 5 minutos en NeatHogar).`,
      });
    } catch {
      // Ignorar cancelación de Share
    }
  };

  const handleVincularDirecto = async () => {
    if (!nombreInvitado.trim()) {
      await handleGenerarCodigo5Min();
      return;
    }
    setLoading(true);
    try {
      await invitarMiembro(tipoMiembro, {
        puede_validar_tareas: tipoMiembro === 'ADMINISTRADOR' ? true : permisoValidarTareas,
        puede_crear_tareas: tipoMiembro === 'ADMINISTRADOR' ? true : permisoCrearTareas,
        puede_gestionar_compras: tipoMiembro === 'ADMINISTRADOR' ? true : permisoCompras,
        nombre: nombreInvitado.trim(),
      });
      Alert.alert(
        '¡Integrante Vinculado!',
        `Se vinculó a "${nombreInvitado.trim()}" directamente al hogar "${hogar?.nombre}".`,
        [{ text: 'Entendido', onPress: () => navigation.goBack() }],
      );
    } catch (e: any) {
      Alert.alert('Aviso', e?.message || 'No se encontró ese usuario. Genera el código de 5 minutos.');
    } finally {
      setLoading(false);
    }
  };

  const codigoExpirado = Boolean(codigoTemporal && segundosRestantes <= 0);
  const codigoVigente = Boolean(codigoTemporal && segundosRestantes > 0);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
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
        <Text style={[styles.title, { color: colors.textPrimary }]}>Invitar al Hogar</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* SECCIÓN DESTACADA INCREMENTO V2: CÓDIGO TEMPORAL EFÍMERO (TTL 5 MINUTOS) */}
        <View
          style={[
            styles.ephemeralCard,
            {
              backgroundColor: colors.card,
              borderColor: codigoExpirado
                ? colors.danger
                : codigoVigente
                ? colors.success
                : colors.primary,
              ...shadow(theme.isDark, 4),
            },
          ]}
        >
          <View style={styles.ephemeralTopRow}>
            <View style={[styles.ephemeralBadge, { backgroundColor: colors.primary + '22' }]}>
              <Ionicons name="timer-outline" size={16} color={colors.primary} />
              <Text style={[styles.ephemeralBadgeText, { color: colors.primary }]}>
                INVITACIÓN DINÁMICA (TTL 5 MIN)
              </Text>
            </View>

            {codigoVigente && (
              <View
                style={[
                  styles.countdownPill,
                  {
                    backgroundColor:
                      segundosRestantes <= 60 ? colors.danger + '22' : colors.success + '22',
                  },
                ]}
              >
                <Ionicons
                  name="time"
                  size={14}
                  color={segundosRestantes <= 60 ? colors.danger : colors.success}
                />
                <Text
                  style={[
                    styles.countdownText,
                    { color: segundosRestantes <= 60 ? colors.danger : colors.success },
                  ]}
                >
                  {formatearCountdown(segundosRestantes)}
                </Text>
              </View>
            )}
          </View>

          {codigoTemporal ? (
            <>
              <Text
                style={[
                  styles.codeBoxValue,
                  {
                    color: codigoExpirado ? colors.danger : colors.primary,
                    textDecorationLine: codigoExpirado ? 'line-through' : 'none',
                  },
                ]}
              >
                {codigoTemporal}
              </Text>

              {codigoExpirado ? (
                <View style={[styles.expiredBanner, { backgroundColor: colors.danger + '18' }]}>
                  <Ionicons name="alert-circle" size={18} color={colors.danger} />
                  <Text style={[styles.expiredText, { color: colors.danger }]}>
                    El código de 5 minutos ha expirado (00:00). Genera uno nuevo con un toque.
                  </Text>
                </View>
              ) : (
                <Text style={[styles.codeBoxHelp, { color: colors.textSecondary }]}>
                  Comparte este código ahora. Vencerá automáticamente en{' '}
                  <Text style={{ fontFamily: fonts.bold, color: colors.textPrimary }}>
                    {formatearCountdown(segundosRestantes)}
                  </Text>
                  .
                </Text>
              )}

              <View style={styles.shareActionsRow}>
                <Pressable
                  onPress={handleCopiarCodigo}
                  disabled={codigoExpirado}
                  style={[
                    styles.shareChipBtn,
                    {
                      backgroundColor: colors.softBg,
                      borderColor: colors.border,
                      opacity: codigoExpirado ? 0.5 : 1,
                    },
                  ]}
                >
                  <Ionicons name="copy-outline" size={16} color={colors.primary} />
                  <Text style={[styles.shareChipText, { color: colors.textPrimary }]}>
                    Copiar Código
                  </Text>
                </Pressable>

                <Pressable
                  onPress={handleCompartirCodigo}
                  disabled={codigoExpirado}
                  style={[
                    styles.shareChipBtn,
                    {
                      backgroundColor: colors.softBg,
                      borderColor: colors.border,
                      opacity: codigoExpirado ? 0.5 : 1,
                    },
                  ]}
                >
                  <Ionicons name="share-social-outline" size={16} color={colors.secondary} />
                  <Text style={[styles.shareChipText, { color: colors.textPrimary }]}>
                    Compartir
                  </Text>
                </Pressable>
              </View>
            </>
          ) : (
            <Text style={[styles.codeBoxHelp, { color: colors.textSecondary, marginVertical: 10 }]}>
              Genera un código efímero de 6 caracteres con vigencia exacta de 5 minutos para que tus familiares se unan de forma segura.
            </Text>
          )}

          <AppButton
            title={
              codigoVigente
                ? 'Regenerar Nuevo Código (5 min)'
                : 'Generar Código de Invitación (5 min)'
            }
            icon="key-outline"
            onPress={handleGenerarCodigo5Min}
            loading={generatingCode}
            style={{ marginTop: spacing.sm }}
          />
        </View>

        {/* Configuración del Rol y Permisos que recibirá el invitado */}
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          Rol Asignado al Invitado
        </Text>
        <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
          El código generado otorgará este rol y permisos al unirse
        </Text>

        <View style={styles.roleSelector}>
          <Pressable
            onPress={() => seleccionarRol('MIEMBRO')}
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
              color={tipoMiembro === 'MIEMBRO' ? '#FFFFFF' : colors.textPrimary}
            />
            <Text
              style={[
                styles.roleText,
                { color: tipoMiembro === 'MIEMBRO' ? '#FFFFFF' : colors.textPrimary },
              ]}
            >
              Integrante
            </Text>
            <Text
              style={[
                styles.roleSub,
                { color: tipoMiembro === 'MIEMBRO' ? '#FFFFFFCC' : colors.textSecondary },
              ]}
            >
              {esHogarConJefe ? 'Hijo / Supervisado' : 'Colaborador par'}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => seleccionarRol('ADMINISTRADOR')}
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
              color={tipoMiembro === 'ADMINISTRADOR' ? '#FFFFFF' : colors.textPrimary}
            />
            <Text
              style={[
                styles.roleText,
                { color: tipoMiembro === 'ADMINISTRADOR' ? '#FFFFFF' : colors.textPrimary },
              ]}
            >
              Jefe de Hogar
            </Text>
            <Text
              style={[
                styles.roleSub,
                { color: tipoMiembro === 'ADMINISTRADOR' ? '#FFFFFFCC' : colors.textSecondary },
              ]}
            >
              Valida y administra todo
            </Text>
          </Pressable>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          Permisos del Integrante
        </Text>

        <AppCard style={styles.switchContainer}>
          <View style={styles.switchRow}>
            <View style={styles.switchTextCol}>
              <Text style={[styles.switchTitle, { color: colors.textPrimary }]}>
                Validar tareas sin revisión
              </Text>
              <Text style={[styles.switchSub, { color: colors.textSecondary }]}>
                Si se desactiva, sus tareas hechas pasan a revisión con foto
              </Text>
            </View>
            <Switch
              value={tipoMiembro === 'ADMINISTRADOR' ? true : permisoValidarTareas}
              disabled={tipoMiembro === 'ADMINISTRADOR'}
              onValueChange={setPermisoValidarTareas}
              trackColor={{ false: colors.softBg, true: colors.secondary }}
              thumbColor={permisoValidarTareas ? colors.primary : '#FFFFFF'}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.switchRow}>
            <View style={styles.switchTextCol}>
              <Text style={[styles.switchTitle, { color: colors.textPrimary }]}>
                Crear tareas sin aprobación
              </Text>
              <Text style={[styles.switchSub, { color: colors.textSecondary }]}>
                Si se desactiva, podrá proponer tareas para que el Jefe las apruebe
              </Text>
            </View>
            <Switch
              value={tipoMiembro === 'ADMINISTRADOR' ? true : permisoCrearTareas}
              disabled={tipoMiembro === 'ADMINISTRADOR'}
              onValueChange={setPermisoCrearTareas}
              trackColor={{ false: colors.softBg, true: colors.secondary }}
              thumbColor={permisoCrearTareas ? colors.primary : '#FFFFFF'}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.switchRow}>
            <View style={styles.switchTextCol}>
              <Text style={[styles.switchTitle, { color: colors.textPrimary }]}>
                Gestionar lista de compras directo
              </Text>
              <Text style={[styles.switchSub, { color: colors.textSecondary }]}>
                Si se desactiva, sus productos y compras requerirán validación
              </Text>
            </View>
            <Switch
              value={tipoMiembro === 'ADMINISTRADOR' ? true : permisoCompras}
              disabled={tipoMiembro === 'ADMINISTRADOR'}
              onValueChange={setPermisoCompras}
              trackColor={{ false: colors.softBg, true: colors.secondary }}
              thumbColor={permisoCompras ? colors.primary : '#FFFFFF'}
            />
          </View>
        </AppCard>

        {/* Opción alternativa: Vincular directo por @identificador_unico o nombre */}
        <AppInput
          label="Vincular directo por @identificador o Nombre (Opcional)"
          placeholder="Ej: @sofia.vidal o Sofía Vidal"
          value={nombreInvitado}
          onChangeText={setNombreInvitado}
          icon="at-outline"
        />

        {nombreInvitado.trim() ? (
          <View style={styles.footerBtn}>
            <AppButton
              title={`Vincular a ${nombreInvitado.trim()}`}
              icon="person-add-outline"
              onPress={handleVincularDirecto}
              loading={loading}
              variant="secondary"
            />
          </View>
        ) : null}
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
  ephemeralCard: {
    padding: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: 1.8,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  ephemeralTopRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  ephemeralBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  ephemeralBadgeText: {
    fontFamily: fonts.bold,
    fontSize: 11,
    letterSpacing: 0.4,
  },
  countdownPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  countdownText: {
    fontFamily: fonts.bold,
    fontSize: 13,
  },
  codeBoxValue: {
    fontFamily: fonts.bold,
    fontSize: 34,
    letterSpacing: 4,
    marginVertical: 8,
  },
  codeBoxHelp: {
    fontFamily: fonts.regular,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  expiredBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
    borderRadius: radius.md,
    marginVertical: 4,
  },
  expiredText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    flex: 1,
  },
  shareActionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    width: '100%',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  shareChipBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  shareChipText: {
    fontFamily: fonts.semibold,
    fontSize: 13,
  },
  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: 16,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 12,
    marginBottom: spacing.md,
    lineHeight: 17,
  },
  roleSelector: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  roleCard: {
    flex: 1,
    padding: spacing.md,
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
    paddingVertical: spacing.xs,
  },
  switchTextCol: {
    flex: 1,
    paddingRight: spacing.md,
  },
  switchTitle: {
    fontFamily: fonts.semibold,
    fontSize: 13,
  },
  switchSub: {
    fontFamily: fonts.regular,
    fontSize: 11,
    marginTop: 2,
  },
  divider: {
    height: 1,
    marginVertical: spacing.sm,
  },
  footerBtn: {
    marginTop: spacing.xs,
  },
});
