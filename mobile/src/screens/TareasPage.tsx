import React, { useMemo, useState } from 'react';
import {
  FlatList,
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
  const { tareas, hogar, toggleTarea } = useAuth();

  const [vista, setVista] = useState<VistaTareas>('persona');
  const [diaSeleccionadoIndex, setDiaSeleccionadoIndex] = useState(0);

  // Generar 7 días para la vista de calendario
  const diasSemana = useMemo(() => {
    const hoy = new Date();
    const nombresDias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(hoy);
      d.setDate(hoy.getDate() + (i - 1)); // de ayer a 5 días adelante
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

  // Agrupar tareas por miembro asignado para la Vista 5.1
  const miembrosConTareas = useMemo(() => {
    const miembros = hogar?.miembros ?? [];
    return miembros.map((m) => {
      const tareasAsignadas = tareas.filter((t) => t.id_asignado === m.id_usuario);
      return {
        miembro: m,
        tareas: tareasAsignadas,
      };
    });
  }, [hogar, tareas]);

  // Tareas para el día seleccionado en el Calendario
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

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={styles.container}>
        {/* Header: Título "Lista de Tareas" y botón "+" */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.subTag, { color: colors.secondary }]}>
              {tareas.filter((t) => t.estado === 'PENDIENTE').length} pendientes
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
            <Ionicons name="add" size={26} color={colors.onPrimary ?? '#FFFFFF'} />
          </Pressable>
        </View>

        {/* Segmented Control: "Por Persona" y "Calendario" */}
        <SegmentedControl
          values={[
            { key: 'persona', label: 'Por Persona' },
            { key: 'calendario', label: 'Calendario' },
          ]}
          selected={vista}
          onChange={setVista}
        />

        {/* Vista 5.1: Por Persona */}
        {vista === 'persona' ? (
          <ScrollView contentContainerStyle={styles.scrollList} showsVerticalScrollIndicator={false}>
            {miembrosConTareas.map(({ miembro, tareas: listaTareas }) => {
              const isAdmin = miembro.rol === 'ADMINISTRADOR';

              return (
                <View key={miembro.id_miembro} style={styles.memberSection}>
                  {/* Fila del integrante */}
                  <View style={styles.memberHeader}>
                    <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                      <Text style={[styles.avatarText, { color: colors.onPrimary ?? '#FFFFFF' }]}>
                        {getIniciales(miembro.usuario.nombre)}
                      </Text>
                    </View>
                    <View style={styles.memberTextCol}>
                      <Text style={[styles.memberName, { color: colors.textPrimary }]}>
                        {miembro.usuario.nombre}
                      </Text>
                      <Text style={[styles.memberRole, { color: colors.textSecondary }]}>
                        {isAdmin ? 'Administrador' : 'Miembro'} • {listaTareas.length} tareas asignadas
                      </Text>
                    </View>
                  </View>

                  {/* Tarjetas cuadradas horizontales con puntaje y botón para completar */}
                  {listaTareas.length === 0 ? (
                    <View style={[styles.emptyTaskBox, { backgroundColor: colors.softBg, borderColor: colors.border }]}>
                      <Text style={[styles.emptyTaskText, { color: colors.textSecondary }]}>
                        Sin tareas pendientes asignadas
                      </Text>
                    </View>
                  ) : (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalTasks}>
                      {listaTareas.map((tarea) => {
                        const isDone = tarea.estado === 'COMPLETADA';

                        return (
                          <View
                            key={tarea.id_tarea}
                            style={[
                              styles.squareTaskCard,
                              {
                                backgroundColor: isDone ? colors.softBg : colors.card,
                                borderColor: isDone ? colors.success : colors.border,
                                ...shadow(theme.isDark, isDone ? 1 : 2),
                              },
                            ]}
                          >
                            <View style={styles.cardTop}>
                              <View style={[styles.scoreBadge, { backgroundColor: colors.secondary + '25' }]}>
                                <Text style={[styles.scoreText, { color: colors.primary }]}>
                                  +{tarea.puntos} pts
                                </Text>
                              </View>
                              {tarea.categoria && (
                                <Text style={[styles.catTag, { color: colors.textSecondary }]}>
                                  {tarea.categoria.nombre}
                                </Text>
                              )}
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

                            {tarea.descripcion ? (
                              <Text numberOfLines={2} style={[styles.taskDesc, { color: colors.textSecondary }]}>
                                {tarea.descripcion}
                              </Text>
                            ) : null}

                            <View style={styles.cardBottom}>
                              <Pressable
                                onPress={() => toggleTarea(tarea.id_tarea)}
                                style={[
                                  styles.actionBtn,
                                  {
                                    backgroundColor: isDone ? colors.success : colors.primary,
                                  },
                                ]}
                              >
                                <Ionicons
                                  name={isDone ? 'checkmark-circle' : 'checkmark-outline'}
                                  size={16}
                                  color="#FFFFFF"
                                />
                                <Text style={styles.actionBtnText}>
                                  {isDone ? 'Lista' : 'Completar'}
                                </Text>
                              </Pressable>
                            </View>
                          </View>
                        );
                      })}
                    </ScrollView>
                  )}
                </View>
              );
            })}
          </ScrollView>
        ) : (
          /* Vista 5.2: Calendario */
          <ScrollView contentContainerStyle={styles.scrollCalendar} showsVerticalScrollIndicator={false}>
            {/* Grilla de calendario semanal */}
            <View style={[styles.calendarGrid, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.calendarRow}>
                {diasSemana.map((dia) => {
                  const isSelected = dia.index === diaSeleccionadoIndex;
                  const tareasEnEsteDia = tareas.filter((t) => {
                    if (!t.fecha_limite) return dia.esHoy;
                    return t.fecha_limite.startsWith(dia.isoDateStr);
                  });
                  const tienePendientes = tareasEnEsteDia.some((t) => t.estado === 'PENDIENTE');

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
                          { color: isSelected ? (colors.onPrimary ?? '#FFFFFF') : colors.textSecondary },
                        ]}
                      >
                        {dia.diaNombre}
                      </Text>
                      <Text
                        style={[
                          styles.dayNum,
                          { color: isSelected ? (colors.onPrimary ?? '#FFFFFF') : colors.textPrimary },
                        ]}
                      >
                        {dia.numero}
                      </Text>

                      {/* Bloque / Punto de tareas coloreado */}
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

            {/* Tarjeta Inferior de "Detalles" del día seleccionado */}
            <View style={styles.detailsHeader}>
              <Text style={[styles.detailsSectionTitle, { color: colors.textPrimary }]}>
                Detalles del Día ({diasSemana[diaSeleccionadoIndex]?.diaNombre}{' '}
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
                return (
                  <AppCard key={tarea.id_tarea} style={styles.detailCard}>
                    <View style={styles.detailTop}>
                      {/* Miembro Responsable */}
                      <View style={styles.responsibleRow}>
                        <View style={[styles.miniAvatar, { backgroundColor: colors.primary }]}>
                          <Text style={[styles.miniAvatarText, { color: colors.onPrimary ?? '#FFFFFF' }]}>
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

                    {/* Información Tarea */}
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
                      <View style={[styles.statusBadge, { backgroundColor: isDone ? colors.success + '22' : colors.warning + '22' }]}>
                        <Text style={[styles.statusText, { color: isDone ? colors.success : colors.warning }]}>
                          {isDone ? 'Completada' : 'Pendiente'}
                        </Text>
                      </View>

                      <Pressable
                        onPress={() => toggleTarea(tarea.id_tarea)}
                        style={[
                          styles.toggleBtn,
                          { backgroundColor: isDone ? colors.softBg : colors.primary },
                        ]}
                      >
                        <Ionicons
                          name={isDone ? 'refresh-outline' : 'checkmark-outline'}
                          size={16}
                          color={isDone ? colors.textPrimary : '#FFFFFF'}
                        />
                        <Text
                          style={[
                            styles.toggleBtnText,
                            { color: isDone ? colors.textPrimary : '#FFFFFF' },
                          ]}
                        >
                          {isDone ? 'Reabrir' : 'Completar'}
                        </Text>
                      </Pressable>
                    </View>
                  </AppCard>
                );
              })
            )}
          </ScrollView>
        )}
      </View>
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
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: fonts.bold,
    fontSize: 15,
  },
  memberTextCol: {
    flex: 1,
  },
  memberName: {
    fontFamily: fonts.bold,
    fontSize: 16,
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
    width: 210,
    minHeight: 165,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1.2,
    justifyContent: 'space-between',
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
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
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  actionBtnText: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: '#FFFFFF',
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
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
  },
  toggleBtnText: {
    fontFamily: fonts.semibold,
    fontSize: 13,
  },
});
