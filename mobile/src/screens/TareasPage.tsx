import React, { useMemo, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppCard } from '../components/AppCard';
import { SegmentedControl } from '../components/SegmentedControl';
import { useAuth } from '../context/AuthContext';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../theme/ThemeContext';
import { fonts, radius, shadow, spacing } from '../theme/tokens';
import { Tarea } from '../types';

type VistaTareas = 'persona' | 'calendario';

export function TareasPage() {
  const { colors, theme } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const {
    tareas,
    hogar,
    usuario,
    esJefeDeHogar,
    esHogarConJefe,
    puedeValidarTareas,
    puedeCrearTareasDirecto,
    toggleTarea,
    validarTarea,
    rechazarTarea,
    eliminarTarea,
    recargarDatos,
  } = useAuth();

  const [vista, setVista] = useState<VistaTareas>('persona');
  const [diaSeleccionadoIndex, setDiaSeleccionadoIndex] = useState(1);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await recargarDatos();
    } finally {
      setRefreshing(false);
    }
  };

  // Generar 7 días (ayer, hoy y 5 días adelante)
  const diasSemana = useMemo(() => {
    const hoy = new Date();
    const nombresDias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(hoy);
      d.setDate(hoy.getDate() + (i - 1));
      return {
        index: i,
        fecha: d,
        diaNombre: nombresDias[d.getDay()],
        numero: d.getDate(),
        esHoy: i === 1,
        isoDateStr: d.toISOString().split('T')[0],
      };
    });
  }, []);

  const miembrosConTareas = useMemo(() => {
    const miembros = hogar?.miembros ?? [];
    return miembros.map((m) => ({
      miembro: m,
      tareas: tareas.filter((t) => t.id_asignado === m.id_usuario),
    }));
  }, [hogar, tareas]);

  const tareasSinAsignar = useMemo(
    () => tareas.filter((t) => !t.id_asignado),
    [tareas],
  );

  const tareasDelDia = useMemo(() => {
    const diaActual = diasSemana[diaSeleccionadoIndex];
    if (!diaActual) return [];
    return tareas.filter((t) => {
      if (!t.fecha_limite) return diaActual.esHoy;
      return t.fecha_limite.startsWith(diaActual.isoDateStr);
    });
  }, [diasSemana, diaSeleccionadoIndex, tareas]);

  const getIniciales = (nombre?: string | null) => {
    if (!nombre) return 'NH';
    return nombre
      .split(' ')
      .map((p) => p[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const pendientesCount = tareas.filter((t) => t.estado === 'PENDIENTE').length;
  const revisionCount = tareas.filter(
    (t) => t.estado === 'POR_VALIDAR' || t.estado === 'PROPUESTA',
  ).length;

  const renderControlesTarea = (tarea: Tarea, compact = false) => {
    if (tarea.estado === 'PROPUESTA') {
      if (puedeValidarTareas) {
        return (
          <View style={styles.dualBtnRow}>
            <Pressable
              onPress={() => validarTarea(tarea.id_tarea)}
              style={[styles.actionBtn, { backgroundColor: colors.success }]}
            >
              <Ionicons name="checkmark" size={14} color="#FFFFFF" />
              <Text style={styles.actionBtnText}>Aprobar</Text>
            </Pressable>
            <Pressable
              onPress={() => rechazarTarea(tarea.id_tarea)}
              style={[styles.iconRejectBtn, { backgroundColor: colors.danger + '22' }]}
            >
              <Ionicons name="close" size={15} color={colors.danger} />
            </Pressable>
          </View>
        );
      }
      return (
        <View style={[styles.waitingPill, { backgroundColor: colors.warning + '20' }]}>
          <Ionicons name="time-outline" size={13} color={colors.warning} />
          <Text style={[styles.waitingText, { color: colors.warning }]}>Propuesta enviada</Text>
        </View>
      );
    }

    if (tarea.estado === 'POR_VALIDAR') {
      if (puedeValidarTareas) {
        return (
          <View style={styles.dualBtnRow}>
            <Pressable
              onPress={() => validarTarea(tarea.id_tarea)}
              style={[styles.actionBtn, { backgroundColor: colors.warning }]}
            >
              <Ionicons name="shield-checkmark" size={14} color="#FFFFFF" />
              <Text style={styles.actionBtnText}>Validar</Text>
            </Pressable>
            <Pressable
              onPress={() => rechazarTarea(tarea.id_tarea)}
              style={[styles.iconRejectBtn, { backgroundColor: colors.danger + '22' }]}
            >
              <Ionicons name="arrow-undo" size={14} color={colors.danger} />
            </Pressable>
          </View>
        );
      }

      const fuiYo = tarea.id_completador === usuario?.id_usuario;
      return (
        <Pressable
          disabled={!fuiYo}
          onPress={() => toggleTarea(tarea.id_tarea)}
          style={[styles.waitingPill, { backgroundColor: colors.warning + '22' }]}
        >
          <Ionicons name="hourglass-outline" size={13} color={colors.warning} />
          <Text style={[styles.waitingText, { color: colors.warning }]}>
            {fuiYo ? 'Por validar (Cancelar)' : 'Esperando al Jefe'}
          </Text>
        </Pressable>
      );
    }

    if (tarea.estado === 'COMPLETADA') {
      return (
        <Pressable
          disabled={!puedeValidarTareas}
          onPress={() => toggleTarea(tarea.id_tarea)}
          style={[styles.actionBtn, { backgroundColor: colors.success }]}
        >
          <Ionicons name="checkmark-circle" size={15} color="#FFFFFF" />
          <Text style={styles.actionBtnText}>
            {compact ? 'Validada' : puedeValidarTareas ? 'Validada (Reabrir)' : 'Validada'}
          </Text>
        </Pressable>
      );
    }

    // PENDIENTE
    return (
      <Pressable
        onPress={() => toggleTarea(tarea.id_tarea)}
        style={[
          styles.actionBtn,
          { backgroundColor: puedeValidarTareas ? colors.primary : colors.secondary },
        ]}
      >
        <Ionicons
          name={puedeValidarTareas ? 'checkmark-outline' : 'paper-plane-outline'}
          size={15}
          color="#FFFFFF"
        />
        <Text style={styles.actionBtnText}>
          {puedeValidarTareas ? 'Completar' : 'Enviar a Validar'}
        </Text>
      </Pressable>
    );
  };

  const renderTarjetaCuadrada = (tarea: Tarea) => {
    const isDone = tarea.estado === 'COMPLETADA';
    const isPorValidar = tarea.estado === 'POR_VALIDAR';
    const isPropuesta = tarea.estado === 'PROPUESTA';
    const puedeBorrar = esJefeDeHogar || (!esHogarConJefe && tarea.id_creador === usuario?.id_usuario);

    return (
      <View
        key={tarea.id_tarea}
        style={[
          styles.squareTaskCard,
          {
            backgroundColor: isDone ? colors.softBg : colors.card,
            borderColor: isDone
              ? colors.success
              : isPorValidar || isPropuesta
              ? colors.warning
              : colors.border,
            ...shadow(theme.isDark, isDone ? 1 : 2),
          },
        ]}
      >
        <View style={styles.cardTop}>
          <View style={[styles.scoreBadge, { backgroundColor: colors.secondary + '25' }]}>
            <Text style={[styles.scoreText, { color: colors.primary }]}>+{tarea.puntos} pts</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {tarea.categoria && (
              <Text style={[styles.catTag, { color: colors.textSecondary }]}>
                {tarea.categoria.nombre}
              </Text>
            )}
            {puedeBorrar && (
              <Pressable onPress={() => eliminarTarea(tarea.id_tarea)} hitSlop={6}>
                <Ionicons name="trash-outline" size={14} color={colors.textSecondary} />
              </Pressable>
            )}
          </View>
        </View>

        <Text
          numberOfLines={2}
          style={[
            styles.taskTitle,
            {
              color: colors.textPrimary,
              textDecorationLine: isDone ? 'line-through' : 'none',
            },
          ]}
        >
          {tarea.titulo}
        </Text>

        {isPorValidar && (
          <Text numberOfLines={1} style={[styles.stateInfoText, { color: colors.warning }]}>
            Hecha por {tarea.completador?.nombre ?? 'integrante'} • Falta Jefe
          </Text>
        )}
        {isPropuesta && (
          <Text numberOfLines={1} style={[styles.stateInfoText, { color: colors.secondary }]}>
            Propuesta por {tarea.creador?.nombre ?? 'integrante'}
          </Text>
        )}

        {tarea.descripcion ? (
          <Text numberOfLines={2} style={[styles.taskDesc, { color: colors.textSecondary }]}>
            {tarea.descripcion}
          </Text>
        ) : null}

        <View style={styles.cardBottom}>{renderControlesTarea(tarea, true)}</View>
      </View>
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.subTag, { color: colors.secondary }]}>
              {pendientesCount} pendientes
              {revisionCount > 0 ? ` • ${revisionCount} por validar` : ''}
            </Text>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Lista de Tareas</Text>
          </View>

          <Pressable
            onPress={() => navigation.navigate('CreacionTareas')}
            style={({ pressed }) => [
              styles.addBtn,
              {
                backgroundColor: colors.primary,
                ...shadow(theme.isDark, 3),
              },
              pressed && { opacity: 0.8, transform: [{ scale: 0.95 }] },
            ]}
          >
            <Ionicons
              name={puedeCrearTareasDirecto ? 'add' : 'bulb-outline'}
              size={24}
              color={colors.onPrimary ?? '#FFFFFF'}
            />
          </Pressable>
        </View>

        <SegmentedControl
          values={[
            { key: 'persona', label: 'Por Persona' },
            { key: 'calendario', label: 'Calendario' },
          ]}
          selected={vista}
          onChange={setVista}
        />

        {vista === 'persona' ? (
          <ScrollView
            contentContainerStyle={styles.scrollList}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
            }
          >
            {tareasSinAsignar.length > 0 && (
              <View style={styles.memberSection}>
                <View style={styles.memberHeader}>
                  <View style={[styles.avatar, { backgroundColor: colors.secondary }]}>
                    <Ionicons name="people" size={18} color="#FFFFFF" />
                  </View>
                  <View style={styles.memberTextCol}>
                    <Text style={[styles.memberName, { color: colors.textPrimary }]}>
                       Abiertas / Propuestas del Hogar
                    </Text>
                    <Text style={[styles.memberRole, { color: colors.textSecondary }]}>
                      {tareasSinAsignar.length} tareas sin integrante fijo
                    </Text>
                  </View>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.horizontalTasks}
                >
                  {tareasSinAsignar.map((t) => renderTarjetaCuadrada(t))}
                </ScrollView>
              </View>
            )}

            {miembrosConTareas.map(({ miembro, tareas: listaTareas }) => {
              const isAdmin = miembro.rol === 'ADMINISTRADOR';
              return (
                <View key={miembro.id_miembro} style={styles.memberSection}>
                  <View style={styles.memberHeader}>
                    <View
                      style={[
                        styles.avatar,
                        { backgroundColor: isAdmin ? colors.primary : colors.secondary },
                      ]}
                    >
                      <Text style={[styles.avatarText, { color: '#FFFFFF' }]}>
                        {getIniciales(miembro.usuario.nombre)}
                      </Text>
                    </View>
                    <View style={styles.memberTextCol}>
                      <Text style={[styles.memberName, { color: colors.textPrimary }]}>
                        {miembro.usuario.nombre}
                      </Text>
                      <Text style={[styles.memberRole, { color: colors.textSecondary }]}>
                        {isAdmin ? 'Jefe de Hogar' : 'Integrante'} • {listaTareas.length} tareas
                      </Text>
                    </View>
                  </View>

                  {listaTareas.length === 0 ? (
                    <View
                      style={[
                        styles.emptyTaskBox,
                        { backgroundColor: colors.softBg, borderColor: colors.border },
                      ]}
                    >
                      <Text style={[styles.emptyTaskText, { color: colors.textSecondary }]}>
                        Sin tareas asignadas actualmente
                      </Text>
                    </View>
                  ) : (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.horizontalTasks}
                    >
                      {listaTareas.map((t) => renderTarjetaCuadrada(t))}
                    </ScrollView>
                  )}
                </View>
              );
            })}
          </ScrollView>
        ) : (
          <ScrollView
            contentContainerStyle={styles.scrollCalendar}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
            }
          >
            <View style={[styles.calendarGrid, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.calendarRow}>
                {diasSemana.map((dia) => {
                  const isSelected = dia.index === diaSeleccionadoIndex;
                  const tareasEnEsteDia = tareas.filter((t) => {
                    if (!t.fecha_limite) return dia.esHoy;
                    return t.fecha_limite.startsWith(dia.isoDateStr);
                  });
                  const tienePendientes = tareasEnEsteDia.some((t) => t.estado !== 'COMPLETADA');

                  return (
                    <Pressable
                      key={dia.index}
                      onPress={() => setDiaSeleccionadoIndex(dia.index)}
                      style={[
                        styles.dayBox,
                        {
                          backgroundColor: isSelected ? colors.primary : colors.surface,
                          borderColor: isSelected ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.dayName,
                          { color: isSelected ? '#FFFFFF' : colors.textSecondary },
                        ]}
                      >
                        {dia.diaNombre}
                      </Text>
                      <Text
                        style={[
                          styles.dayNum,
                          { color: isSelected ? '#FFFFFF' : colors.textPrimary },
                        ]}
                      >
                        {dia.numero}
                      </Text>
                      <View style={styles.dotsRow}>
                        {tareasEnEsteDia.slice(0, 3).map((_, i) => (
                          <View
                            key={i}
                            style={[
                              styles.calendarDot,
                              {
                                backgroundColor: isSelected
                                  ? '#FFFFFF'
                                  : tienePendientes
                                  ? colors.warning
                                  : colors.success,
                              },
                            ]}
                          />
                        ))}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.detailsHeader}>
              <Text style={[styles.detailsSectionTitle, { color: colors.textPrimary }]}>
                Detalles ({diasSemana[diaSeleccionadoIndex]?.diaNombre}{' '}
                {diasSemana[diaSeleccionadoIndex]?.numero})
              </Text>
              <Text style={[styles.detailsCount, { color: colors.textSecondary }]}>
                {tareasDelDia.length} tareas
              </Text>
            </View>

            {tareasDelDia.length === 0 ? (
              <AppCard style={styles.emptyDetailsCard}>
                <Ionicons name="calendar-outline" size={36} color={colors.textSecondary + '70'} />
                <Text style={[styles.emptyDetailsText, { color: colors.textSecondary }]}>
                  No hay tareas programadas para este día
                </Text>
              </AppCard>
            ) : (
              tareasDelDia.map((tarea) => {
                const isDone = tarea.estado === 'COMPLETADA';
                const statusBadgeConfig =
                  tarea.estado === 'COMPLETADA'
                    ? { label: 'Validada', bg: colors.success + '22', fg: colors.success }
                    : tarea.estado === 'POR_VALIDAR'
                    ? { label: 'Por Validar (Jefe)', bg: colors.warning + '24', fg: colors.warning }
                    : tarea.estado === 'PROPUESTA'
                    ? { label: 'Propuesta', bg: colors.secondary + '24', fg: colors.secondary }
                    : { label: 'Pendiente', bg: colors.primary + '18', fg: colors.primary };

                return (
                  <AppCard key={tarea.id_tarea} style={styles.detailCard}>
                    <View style={styles.detailTop}>
                      <View style={styles.responsibleRow}>
                        <View style={[styles.miniAvatar, { backgroundColor: colors.primary }]}>
                          <Text style={[styles.miniAvatarText, { color: '#FFFFFF' }]}>
                            {getIniciales(tarea.asignado?.nombre)}
                          </Text>
                        </View>
                        <View>
                          <Text style={[styles.respName, { color: colors.textPrimary }]}>
                            {tarea.asignado?.nombre ?? 'Sin asignar'}
                          </Text>
                          <Text style={[styles.respLabel, { color: colors.textSecondary }]}>
                            Responsable
                          </Text>
                        </View>
                      </View>

                      <View style={[styles.scoreBadge, { backgroundColor: colors.secondary + '25' }]}>
                        <Text style={[styles.scoreText, { color: colors.primary }]}>
                          +{tarea.puntos} pts
                        </Text>
                      </View>
                    </View>

                    <Text
                      style={[
                        styles.detailTitle,
                        {
                          color: colors.textPrimary,
                          textDecorationLine: isDone ? 'line-through' : 'none',
                        },
                      ]}
                    >
                      {tarea.titulo}
                    </Text>

                    {tarea.descripcion ? (
                      <Text style={[styles.detailDesc, { color: colors.textSecondary }]}>
                        {tarea.descripcion}
                      </Text>
                    ) : null}

                    <View style={styles.detailBottom}>
                      <View style={[styles.statusBadge, { backgroundColor: statusBadgeConfig.bg }]}>
                        <Text style={[styles.statusText, { color: statusBadgeConfig.fg }]}>
                          {statusBadgeConfig.label}
                        </Text>
                      </View>

                      {renderControlesTarea(tarea, false)}
                    </View>
                  </AppCard>
                );
              })
            )}
          </ScrollView>
        )}
      </View>
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
  scrollList: {
    paddingBottom: 32,
  },
  memberSection: {
    marginBottom: spacing.xl,
  },
  memberHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: spacing.sm,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: fonts.bold,
    fontSize: 14,
  },
  memberTextCol: {
    flex: 1,
  },
  memberName: {
    fontFamily: fonts.bold,
    fontSize: 15,
  },
  memberRole: {
    fontFamily: fonts.regular,
    fontSize: 12,
  },
  emptyTaskBox: {
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  emptyTaskText: {
    fontFamily: fonts.regular,
    fontSize: 13,
  },
  horizontalTasks: {
    gap: spacing.md,
    paddingVertical: 4,
  },
  squareTaskCard: {
    width: 220,
    minHeight: 175,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1.3,
    justifyContent: 'space-between',
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  scoreBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  scoreText: {
    fontFamily: fonts.bold,
    fontSize: 12,
  },
  catTag: {
    fontFamily: fonts.medium,
    fontSize: 11,
  },
  taskTitle: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    lineHeight: 18,
    marginBottom: 4,
  },
  stateInfoText: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    marginBottom: 4,
  },
  taskDesc: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 16,
    flex: 1,
  },
  cardBottom: {
    marginTop: 10,
    alignItems: 'flex-end',
  },
  dualBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  actionBtnText: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: '#FFFFFF',
  },
  iconRejectBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waitingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  waitingText: {
    fontFamily: fonts.semibold,
    fontSize: 11,
  },
  scrollCalendar: {
    paddingBottom: 32,
  },
  calendarGrid: {
    padding: spacing.md,
    borderRadius: radius.xl,
    borderWidth: 1,
    marginBottom: spacing.lg,
  },
  calendarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayBox: {
    flex: 1,
    marginHorizontal: 3,
    paddingVertical: 10,
    borderRadius: radius.md,
    alignItems: 'center',
    borderWidth: 1,
  },
  dayName: {
    fontFamily: fonts.regular,
    fontSize: 11,
  },
  dayNum: {
    fontFamily: fonts.bold,
    fontSize: 16,
    marginTop: 2,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 3,
    marginTop: 6,
    minHeight: 6,
  },
  calendarDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  detailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  detailsSectionTitle: {
    fontFamily: fonts.bold,
    fontSize: 17,
  },
  detailsCount: {
    fontFamily: fonts.regular,
    fontSize: 13,
  },
  emptyDetailsCard: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  emptyDetailsText: {
    fontFamily: fonts.regular,
    fontSize: 13,
  },
  detailCard: {
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  detailTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  responsibleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  miniAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniAvatarText: {
    fontFamily: fonts.bold,
    fontSize: 12,
  },
  respName: {
    fontFamily: fonts.semibold,
    fontSize: 13,
  },
  respLabel: {
    fontFamily: fonts.regular,
    fontSize: 11,
  },
  detailTitle: {
    fontFamily: fonts.bold,
    fontSize: 16,
    marginBottom: 4,
  },
  detailDesc: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  detailBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  statusText: {
    fontFamily: fonts.semibold,
    fontSize: 12,
  },
});
