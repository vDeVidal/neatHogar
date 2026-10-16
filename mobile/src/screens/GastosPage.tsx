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
import { AppButton } from '../components/AppButton';
import { AppCard } from '../components/AppCard';
import { AppInput } from '../components/AppInput';
import { SegmentedControl } from '../components/SegmentedControl';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme/ThemeContext';
import { fonts, radius, shadow, spacing } from '../theme/tokens';
import { Gasto, MiembroParticipacion, NivelDisponibilidad } from '../types';

type VistaGastos = 'participacion' | 'gastos';

export function GastosPage() {
  const { colors, theme } = useTheme();
  const { gastos, participacion, agregarGasto, eliminarGasto } = useAuth();

  const [vista, setVista] = useState<VistaGastos>('gastos');
  const [modalGastoVisible, setModalGastoVisible] = useState(false);
  const [concepto, setConcepto] = useState('');
  const [monto, setMonto] = useState('');
  const [loading, setLoading] = useState(false);

  // Formateador de moneda en pesos chilenos (CLP)
  const formatearCLP = (valor: number) => {
    return '$' + valor.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const totalGastosMes = gastos.reduce((acc, g) => acc + g.monto, 0);
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

  const getIniciales = (nombre: string) => {
    return nombre
      .split(' ')
      .map((p) => p[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

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
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={styles.container}>
        {/* Header */}
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

        {/* Selector de Vista: "Gastos Generales" vs "Participación / Puntos" */}
        <SegmentedControl
          values={[
            { key: 'gastos', label: 'Gastos Generales' },
            { key: 'participacion', label: 'Participación / Puntos' },
          ]}
          selected={vista}
          onChange={setVista}
        />

        {vista === 'gastos' ? (
          /* Vista: Gastos Generales (Mockup Pantalla 7) */
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Tarjeta de Resumen Total */}
            <AppCard style={styles.heroCard}>
              <View style={styles.heroRow}>
                <View>
                  <Text style={[styles.heroLabel, { color: colors.textSecondary }]}>Total Gastos del Mes</Text>
                  <Text style={[styles.heroAmount, { color: colors.textPrimary }]}>
                    {formatearCLP(totalGastosMes)}
                  </Text>
                  <Text style={[styles.heroSub, { color: colors.secondary }]}>
                    {gastos.length} registros en el núcleo
                  </Text>
                </View>
                <View style={[styles.heroIconBadge, { backgroundColor: colors.primary }]}>
                  <Ionicons name="wallet-outline" size={32} color={colors.onPrimary ?? '#FFFFFF'} />
                </View>
              </View>
            </AppCard>

            {/* Botón Ingresar Gasto Destacado */}
            <View style={styles.actionRow}>
              <AppButton
                title="Ingresar Gasto"
                icon="cash-outline"
                onPress={() => setModalGastoVisible(true)}
                variant="primary"
                style={{ width: '100%' }}
              />
            </View>

            {/* Lista de Gastos */}
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Historial de Gastos</Text>

            {gastos.map((g) => {
              const fechaStr = new Date(g.fecha).toLocaleDateString('es-CL', {
                day: '2-digit',
                month: 'short',
              });

              return (
                <AppCard key={g.id_gasto} style={styles.gastoCard}>
                  <View style={styles.gastoRow}>
                    <View style={[styles.gastoIcon, { backgroundColor: colors.softBg }]}>
                      <Ionicons name="receipt-outline" size={22} color={colors.primary} />
                    </View>

                    <View style={styles.gastoInfo}>
                      <Text style={[styles.gastoConcepto, { color: colors.textPrimary }]}>
                        {g.concepto}
                      </Text>
                      <Text style={[styles.gastoMeta, { color: colors.textSecondary }]}>
                        {fechaStr} • Pagado por {g.registrador?.nombre ?? 'Miembro'}
                      </Text>
                    </View>

                    <View style={styles.gastoRight}>
                      <Text style={[styles.gastoMonto, { color: colors.textPrimary }]}>
                        {formatearCLP(g.monto)}
                      </Text>
                      <Pressable onPress={() => eliminarGasto(g.id_gasto)} style={styles.gastoDelete}>
                        <Ionicons name="trash-outline" size={16} color={colors.textSecondary} />
                      </Pressable>
                    </View>
                  </View>
                </AppCard>
              );
            })}
          </ScrollView>
        ) : (
          /* Vista: Participación y Puntos (Alcance Funcional y Ponderación por Disponibilidad) */
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Tarjeta Hero de Puntos Acumulados */}
            <AppCard style={styles.heroCard}>
              <View style={styles.heroRow}>
                <View>
                  <Text style={[styles.heroLabel, { color: colors.textSecondary }]}>Puntos Totales de la Casa</Text>
                  <Text style={[styles.heroAmount, { color: colors.textPrimary }]}>
                    {totalPuntosHogar} pts
                  </Text>
                  <Text style={[styles.heroSub, { color: colors.secondary }]}>
                    Ponderado por disponibilidad semanal
                  </Text>
                </View>
                <View style={[styles.heroIconBadge, { backgroundColor: colors.secondary }]}>
                  <Ionicons name="trophy-outline" size={30} color={colors.onHighlight ?? colors.textPrimary} />
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
                        <Text style={[styles.avatarText, { color: colors.onPrimary ?? '#FFFFFF' }]}>
                          {getIniciales(p.nombre)}
                        </Text>
                      </View>
                      <View>
                        <Text style={[styles.partName, { color: colors.textPrimary }]}>{p.nombre}</Text>
                        <View style={styles.dispRow}>
                          <View style={[styles.dot, { backgroundColor: dispColor }]} />
                          <Text style={[styles.dispLabel, { color: colors.textSecondary }]}>
                            {p.disponibilidad} {p.descripcion_carga ? `• ${p.descripcion_carga}` : ''}
                          </Text>
                        </View>
                      </View>
                    </View>

                    <View style={styles.partRight}>
                      <Text style={[styles.pointsValue, { color: colors.primary }]}>
                        {p.puntos} pts
                      </Text>
                      <Text style={[styles.tasksValue, { color: colors.textSecondary }]}>
                        {p.tareasCompletadas} tareas
                      </Text>
                    </View>
                  </View>

                  {/* Barra de progreso de participación */}
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

      {/* Modal Ingresar Gasto */}
      <Modal
        visible={modalGastoVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalGastoVisible(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Ingresar Gasto del Hogar</Text>
              <Pressable
                onPress={() => setModalGastoVisible(false)}
                style={[styles.modalClose, { backgroundColor: colors.softBg }]}
              >
                <Ionicons name="close" size={20} color={colors.textPrimary} />
              </Pressable>
            </View>

            <AppInput
              label="Concepto del Gasto"
              placeholder="Ej: Arriendo, Supermercado, Luz, Agua"
              value={concepto}
              onChangeText={setConcepto}
              icon="receipt-outline"
            />

            <AppInput
              label="Monto en pesos (CLP)"
              placeholder="Ej: 45000"
              value={monto}
              onChangeText={setMonto}
              keyboardType="numeric"
              icon="cash-outline"
            />

            <View style={styles.modalActions}>
              <AppButton
                title="Registrar Gasto"
                onPress={handleCrearGasto}
                loading={loading}
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
    fontSize: 24,
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
    width: 60,
    height: 60,
    borderRadius: 30,
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
    width: 44,
    height: 44,
    borderRadius: 22,
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
  gastoRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  gastoMonto: {
    fontFamily: fonts.bold,
    fontSize: 15,
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
  modalActions: {
    marginTop: spacing.md,
  },
});
