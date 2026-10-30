import React, { useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppButton } from '../components/AppButton';
import { AppCard } from '../components/AppCard';
import { AppInput } from '../components/AppInput';
import { SegmentedControl } from '../components/SegmentedControl';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme/ThemeContext';
import { fonts, radius, shadow, spacing } from '../theme/tokens';
import { NivelDisponibilidad } from '../types';

type VistaGastos = 'participacion' | 'gastos';

export function GastosPage() {
  const { colors, theme } = useTheme();
  const {
    gastos,
    participacion,
    usuario,
    esJefeDeHogar,
    esHogarConJefe,
    agregarGasto,
    validarGasto,
    rechazarGasto,
    eliminarGasto,
    recargarDatos,
  } = useAuth();

  const [vista, setVista] = useState<VistaGastos>('gastos');
  const [modalGastoVisible, setModalGastoVisible] = useState(false);
  const [concepto, setConcepto] = useState('');
  const [monto, setMonto] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await recargarDatos();
    } finally {
      setRefreshing(false);
    }
  };

  const formatearCLP = (valor: number) =>
    '$' + valor.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  const gastosAprobados = gastos.filter(
    (g) => g.estado_validacion !== 'PENDIENTE_APROBACION',
  );
  const gastosPendientes = gastos.filter(
    (g) => g.estado_validacion === 'PENDIENTE_APROBACION',
  );

  const totalGastosMes = gastosAprobados.reduce((acc, g) => acc + g.monto, 0);
  const totalPuntosHogar = participacion.reduce((acc, p) => acc + p.puntos, 0);

  const getDisponibilidadColor = (disp: NivelDisponibilidad) => {
    switch (disp) {
      case 'ALTA':
        return colors.success;
      case 'MEDIA':
        return colors.warning;
      case 'BAJA':
      default:
        return colors.danger;
    }
  };

  const getIniciales = (nombre: string) =>
    nombre
      .split(' ')
      .map((p) => p[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();

  const handleCrearGasto = async () => {
    if (!concepto.trim() || !monto.trim()) return;
    const montoNum = parseInt(monto.replace(/\D/g, ''), 10);
    if (isNaN(montoNum) || montoNum <= 0) return;

    setLoading(true);
    try {
      await agregarGasto({
        concepto: concepto.trim(),
        monto: montoNum,
      });
      setConcepto('');
      setMonto('');
      setModalGastoVisible(false);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'No se pudo registrar el gasto');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={[styles.subTag, { color: colors.secondary }]}>Métricas & Finanzas</Text>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              {vista === 'gastos' ? 'Gastos Generales' : 'Participación y Puntos'}
            </Text>
          </View>

          {vista === 'gastos' && (
            <Pressable
              onPress={() => setModalGastoVisible(true)}
              style={({ pressed }) => [
                styles.addBtn,
                { backgroundColor: colors.primary, ...shadow(theme.isDark, 3) },
                pressed && { opacity: 0.8 },
              ]}
            >
              <Ionicons name="add" size={24} color={colors.onPrimary ?? '#FFFFFF'} />
            </Pressable>
          )}
        </View>

        <SegmentedControl
          values={[
            { key: 'gastos', label: 'Gastos Generales' },
            { key: 'participacion', label: 'Participación / Puntos' },
          ]}
          selected={vista}
          onChange={setVista}
        />

        {vista === 'gastos' ? (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
            }
          >
            <AppCard style={styles.heroCard}>
              <View style={styles.heroRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.heroLabel, { color: colors.textSecondary }]}>
                    Total Gastos Validados del Mes
                  </Text>
                  <Text style={[styles.heroAmount, { color: colors.textPrimary }]}>
                    {formatearCLP(totalGastosMes)}
                  </Text>
                  <Text style={[styles.heroSub, { color: colors.secondary }]}>
                    {gastosAprobados.length} confirmados
                    {gastosPendientes.length > 0
                      ? ` • ${gastosPendientes.length} por validar`
                      : ''}
                  </Text>
                </View>
                <View style={[styles.heroIconBadge, { backgroundColor: colors.primary }]}>
                  <Ionicons name="wallet-outline" size={32} color={colors.onPrimary ?? '#FFFFFF'} />
                </View>
              </View>
            </AppCard>

            <View style={styles.actionRow}>
              <AppButton
                title={
                  esHogarConJefe && !esJefeDeHogar
                    ? 'Informar Gasto al Jefe de Hogar'
                    : 'Ingresar Gasto'
                }
                icon="cash-outline"
                onPress={() => setModalGastoVisible(true)}
                variant="primary"
                style={{ width: '100%' }}
              />
            </View>

            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Historial de Gastos
            </Text>

            {gastos.length === 0 ? (
              <AppCard style={styles.emptyCard}>
                <Ionicons name="receipt-outline" size={36} color={colors.textSecondary + '70'} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  Aún no hay gastos registrados este mes
                </Text>
              </AppCard>
            ) : (
              gastos.map((g) => {
                const fechaStr = new Date(g.fecha).toLocaleDateString('es-CL', {
                  day: '2-digit',
                  month: 'short',
                });
                const isPendiente = g.estado_validacion === 'PENDIENTE_APROBACION';
                const puedeBorrar =
                  !esHogarConJefe ||
                  esJefeDeHogar ||
                  (isPendiente && g.id_registrador === usuario?.id_usuario);

                return (
                  <AppCard
                    key={g.id_gasto}
                    style={{
                      ...styles.gastoCard,
                      borderColor: isPendiente ? colors.warning : colors.border,
                      borderWidth: isPendiente ? 1.3 : 1,
                    }}
                  >
                    <View style={styles.gastoRow}>
                      <View
                        style={[
                          styles.gastoIcon,
                          {
                            backgroundColor: isPendiente
                              ? colors.warning + '22'
                              : colors.softBg,
                          },
                        ]}
                      >
                        <Ionicons
                          name={isPendiente ? 'hourglass-outline' : 'receipt-outline'}
                          size={21}
                          color={isPendiente ? colors.warning : colors.primary}
                        />
                      </View>

                      <View style={styles.gastoInfo}>
                        <Text style={[styles.gastoConcepto, { color: colors.textPrimary }]}>
                          {g.concepto}
                        </Text>
                        <Text style={[styles.gastoMeta, { color: colors.textSecondary }]}>
                          {fechaStr} • Por {g.registrador?.nombre ?? 'Integrante'}
                        </Text>
                        {isPendiente && (
                          <Text style={[styles.pendingTagText, { color: colors.warning }]}>
                            Pendiente de validación del Jefe de Hogar
                          </Text>
                        )}
                      </View>

                      <View style={styles.gastoRight}>
                        <Text style={[styles.gastoMonto, { color: colors.textPrimary }]}>
                          {formatearCLP(g.monto)}
                        </Text>

                        {isPendiente && esJefeDeHogar ? (
                          <View style={styles.valBtnsRow}>
                            <Pressable
                              onPress={() => validarGasto(g.id_gasto)}
                              style={[styles.valCircleBtn, { backgroundColor: colors.success }]}
                            >
                              <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                            </Pressable>
                            <Pressable
                              onPress={() => rechazarGasto(g.id_gasto)}
                              style={[styles.valCircleBtn, { backgroundColor: colors.danger + '22' }]}
                            >
                              <Ionicons name="close" size={14} color={colors.danger} />
                            </Pressable>
                          </View>
                        ) : puedeBorrar ? (
                          <Pressable
                            onPress={() => eliminarGasto(g.id_gasto)}
                            style={styles.gastoDelete}
                          >
                            <Ionicons name="trash-outline" size={16} color={colors.textSecondary} />
                          </Pressable>
                        ) : null}
                      </View>
                    </View>
                  </AppCard>
                );
              })
            )}
          </ScrollView>
        ) : (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
            }
          >
            <AppCard style={styles.heroCard}>
              <View style={styles.heroRow}>
                <View>
                  <Text style={[styles.heroLabel, { color: colors.textSecondary }]}>
                    Puntos Totales Validados
                  </Text>
                  <Text style={[styles.heroAmount, { color: colors.textPrimary }]}>
                    {totalPuntosHogar} pts
                  </Text>
                  <Text style={[styles.heroSub, { color: colors.secondary }]}>
                    Ponderado por disponibilidad semanal
                  </Text>
                </View>
                <View style={[styles.heroIconBadge, { backgroundColor: colors.secondary }]}>
                  <Ionicons
                    name="trophy-outline"
                    size={30}
                    color={colors.onHighlight ?? colors.textPrimary}
                  />
                </View>
              </View>
            </AppCard>

            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Distribución de Responsabilidades
            </Text>

            {participacion.map((p) => {
              const dispColor = getDisponibilidadColor(p.disponibilidad);
              return (
                <AppCard key={p.id_usuario} style={styles.partCard}>
                  <View style={styles.partTop}>
                    <View style={styles.partLeft}>
                      <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                        <Text style={[styles.avatarText, { color: '#FFFFFF' }]}>
                          {getIniciales(p.nombre)}
                        </Text>
                      </View>
                      <View>
                        <Text style={[styles.partName, { color: colors.textPrimary }]}>
                          {p.nombre}
                        </Text>
                        <View style={styles.dispRow}>
                          <View style={[styles.dot, { backgroundColor: dispColor }]} />
                          <Text style={[styles.dispLabel, { color: colors.textSecondary }]}>
                            {p.disponibilidad}
                            {p.descripcion_carga ? ` • ${p.descripcion_carga}` : ''}
                          </Text>
                        </View>
                      </View>
                    </View>

                    <View style={styles.partRight}>
                      <Text style={[styles.pointsValue, { color: colors.primary }]}>
                        {p.puntos} pts
                      </Text>
                      <Text style={[styles.tasksValue, { color: colors.textSecondary }]}>
                        {p.tareasCompletadas} validadas
                      </Text>
                    </View>
                  </View>

                  <View style={styles.progressContainer}>
                    <View style={[styles.progressBarBg, { backgroundColor: colors.softBg }]}>
                      <View
                        style={[
                          styles.progressBarFill,
                          {
                            width: `${Math.min(p.porcentaje, 100)}%`,
                            backgroundColor: colors.primary,
                          },
                        ]}
                      />
                    </View>
                    <Text style={[styles.percentageText, { color: colors.textSecondary }]}>
                      {p.porcentaje}% del esfuerzo del hogar
                    </Text>
                  </View>
                </AppCard>
              );
            })}
          </ScrollView>
        )}
      </View>

      <Modal
        visible={modalGastoVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalGastoVisible(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                {esHogarConJefe && !esJefeDeHogar
                  ? 'Informar Gasto (Para Validar)'
                  : 'Ingresar Gasto del Hogar'}
              </Text>
              <Pressable
                onPress={() => setModalGastoVisible(false)}
                style={[styles.modalClose, { backgroundColor: colors.softBg }]}
              >
                <Ionicons name="close" size={20} color={colors.textPrimary} />
              </Pressable>
            </View>

            {esHogarConJefe && !esJefeDeHogar && (
              <Text style={[styles.modalNotice, { color: colors.warning }]}>
                El Jefe de Hogar recibirá este registro para aprobarlo en el total mensual.
              </Text>
            )}

            <AppInput
              label="Concepto del Gasto"
              placeholder="Ej: Panadería, Supermercado, Luz, Agua"
              value={concepto}
              onChangeText={setConcepto}
              icon="receipt-outline"
            />

            <AppInput
              label="Monto en pesos (CLP)"
              placeholder="Ej: 15000"
              value={monto}
              onChangeText={setMonto}
              keyboardType="numeric"
              icon="cash-outline"
            />

            <View style={styles.modalActions}>
              <AppButton
                title={esHogarConJefe && !esJefeDeHogar ? 'Enviar a Validar' : 'Registrar Gasto'}
                onPress={handleCrearGasto}
                loading={loading}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  subTag: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 22,
    marginTop: 2,
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingBottom: 36,
  },
  heroCard: {
    padding: spacing.lg,
    borderRadius: radius.xl,
    marginBottom: spacing.md,
  },
  heroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroLabel: {
    fontFamily: fonts.medium,
    fontSize: 13,
  },
  heroAmount: {
    fontFamily: fonts.bold,
    fontSize: 28,
    marginVertical: 4,
  },
  heroSub: {
    fontFamily: fonts.semibold,
    fontSize: 12,
  },
  heroIconBadge: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionRow: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: 17,
    marginBottom: spacing.md,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 30,
    gap: 8,
  },
  emptyText: {
    fontFamily: fonts.regular,
    fontSize: 13,
  },
  gastoCard: {
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  gastoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  gastoIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gastoInfo: {
    flex: 1,
  },
  gastoConcepto: {
    fontFamily: fonts.semibold,
    fontSize: 15,
  },
  gastoMeta: {
    fontFamily: fonts.regular,
    fontSize: 12,
    marginTop: 2,
  },
  pendingTagText: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    marginTop: 3,
  },
  gastoRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  gastoMonto: {
    fontFamily: fonts.bold,
    fontSize: 15,
  },
  valBtnsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  valCircleBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gastoDelete: {
    padding: 2,
  },
  partCard: {
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  partTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  partLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: fonts.bold,
    fontSize: 15,
  },
  partName: {
    fontFamily: fonts.bold,
    fontSize: 15,
  },
  dispRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  dispLabel: {
    fontFamily: fonts.regular,
    fontSize: 12,
  },
  partRight: {
    alignItems: 'flex-end',
  },
  pointsValue: {
    fontFamily: fonts.bold,
    fontSize: 16,
  },
  tasksValue: {
    fontFamily: fonts.regular,
    fontSize: 12,
  },
  progressContainer: {
    marginTop: 4,
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  percentageText: {
    fontFamily: fonts.regular,
    fontSize: 11,
    textAlign: 'right',
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
    marginBottom: spacing.sm,
  },
  modalTitle: {
    fontFamily: fonts.bold,
    fontSize: 17,
    flex: 1,
  },
  modalClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalNotice: {
    fontFamily: fonts.medium,
    fontSize: 12,
    marginBottom: spacing.md,
    lineHeight: 17,
  },
  modalActions: {
    marginTop: spacing.md,
  },
});
