import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppButton } from '../components/AppButton';
import { AppCard } from '../components/AppCard';
import { AppInput } from '../components/AppInput';
import { SegmentedControl } from '../components/SegmentedControl';
import { useAuth } from '../context/AuthContext';
import { RootStackParamList } from '../navigation/types';
import { resolveMediaUrl } from '../services/api';
import { useTheme } from '../theme/ThemeContext';
import { fonts, radius, shadow, spacing } from '../theme/tokens';
import { Tarea } from '../types';

type VistaTareas = 'persona' | 'calendario';

// Mini-imagen PNG válida en base64 (para fallback instantáneo en simulador sin cámara configurada)
const DEMO_EVIDENCIA_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAIAAAAlC+aJAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAZ0lEQVR4nO3PAQkAMAwDsf7/s7t4K0gpOJ6Z2dk7cMH1AuoF1AuoF1AvoF5AvYB6AfUC6gXUC6gXUC+gXkC9gHoB9QLqBdQLqBdQL6BeQL2AegH1AuoF1AuoF1AvoF5AvYB6D31rAfd57/M4AAAAAElFTkSuQmCC';

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
    completarTareaConEvidencia,
    validarTarea,
    rechazarTarea,
    eliminarTarea,
    recargarDatos,
  } = useAuth();

  const [vista, setVista] = useState<VistaTareas>('persona');
  const [diaSeleccionadoIndex, setDiaSeleccionadoIndex] = useState(1);
  const [refreshing, setRefreshing] = useState(false);

  // Estados para Captura de Evidencia Fotográfica (Incremento v2)
  const [tareaParaEvidencia, setTareaParaEvidencia] = useState<Tarea | null>(null);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [previewBase64, setPreviewBase64] = useState<string | null>(null);
  const [subiendoFoto, setSubiendoFoto] = useState(false);

  // Estados para Visor de Foto Ampliada y Modal de Rechazo con Motivo
  const [fotoZoomUrl, setFotoZoomUrl] = useState<string | null>(null);
  const [tareaParaRechazar, setTareaParaRechazar] = useState<Tarea | null>(null);
  const [motivoRechazo, setMotivoRechazo] = useState('');
  const [procesandoRevision, setProcesandoRevision] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await recargarDatos();
    } finally {
      setRefreshing(false);
    }
  };

  const abrirModalEvidencia = (tarea: Tarea) => {
    setTareaParaEvidencia(tarea);
    setPreviewUri(null);
    setPreviewBase64(null);
  };

  const handleTomarFotoCamara = async () => {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permiso requerido', 'Habilita el acceso a la cámara o elige desde la galería.');
        return;
      }
      const res = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.45,
        base64: true,
        allowsEditing: true,
      });
      if (!res.canceled && res.assets?.[0]) {
        setPreviewUri(res.assets[0].uri);
        setPreviewBase64(res.assets[0].base64 ?? null);
      }
    } catch {
      Alert.alert(
        'Cámara no disponible en emulador',
        'Puedes elegir una imagen de la galería o usar la captura rápida de simulador.',
      );
    }
  };

  const handleElegirGaleria = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permiso requerido', 'Permite el acceso a tus fotos para adjuntar evidencia.');
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.45,
        base64: true,
        allowsEditing: true,
      });
      if (!res.canceled && res.assets?.[0]) {
        setPreviewUri(res.assets[0].uri);
        setPreviewBase64(res.assets[0].base64 ?? null);
      }
    } catch (e: any) {
      Alert.alert('Aviso', e?.message || 'No se pudo abrir la galería');
    }
  };

  const handleUsarEvidenciaSimulador = () => {
    setPreviewBase64(DEMO_EVIDENCIA_BASE64);
    setPreviewUri(`data:image/png;base64,${DEMO_EVIDENCIA_BASE64}`);
  };

  const handleEnviarEvidencia = async () => {
    if (!tareaParaEvidencia) return;
    if (!previewBase64 && !previewUri) {
      Alert.alert('Falta fotografía', 'Toma una foto con la cámara o selecciona una de la galería.');
      return;
    }
    setSubiendoFoto(true);
    try {
      await completarTareaConEvidencia(tareaParaEvidencia.id_tarea, {
        foto_base64: previewBase64 ?? undefined,
        uri: previewUri ?? undefined,
      });
      setTareaParaEvidencia(null);
      setPreviewUri(null);
      setPreviewBase64(null);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'No se pudo subir la evidencia fotográfica');
    } finally {
      setSubiendoFoto(false);
    }
  };

  const handleConfirmarRechazo = async () => {
    if (!tareaParaRechazar) return;
    setProcesandoRevision(true);
    try {
      await rechazarTarea(
        tareaParaRechazar.id_tarea,
        motivoRechazo.trim() || 'Evidencia insuficiente. Por favor vuelve a subir una foto clara.',
      );
      setTareaParaRechazar(null);
      setMotivoRechazo('');
    } finally {
      setProcesandoRevision(false);
    }
  };

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

  const tareasEnRevision = useMemo(
    () =>
      tareas.filter(
        (t) =>
          t.estado === 'EN_REVISION' ||
          t.estado === 'POR_VALIDAR' ||
          t.estado === 'PROPUESTA',
      ),
    [tareas],
  );

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
  const revisionCount = tareasEnRevision.length;

  const renderMiniaturaEvidencia = (tarea: Tarea) => {
    const url = resolveMediaUrl(tarea.evidencia_foto_url);
    if (!url) return null;
    return (
      <Pressable
        onPress={() => setFotoZoomUrl(url)}
        style={[styles.photoThumbWrap, { borderColor: colors.warning, backgroundColor: colors.softBg }]}
      >
        <Image source={{ uri: url }} style={styles.photoThumb} resizeMode="cover" />
        <View style={[styles.photoZoomBadge, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
          <Ionicons name="expand-outline" size={11} color="#FFFFFF" />
          <Text style={styles.photoZoomText}>Ver evidencia</Text>
        </View>
      </Pressable>
    );
  };

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

    if (tarea.estado === 'EN_REVISION' || tarea.estado === 'POR_VALIDAR') {
      if (puedeValidarTareas) {
        return (
          <View style={styles.dualBtnRow}>
            <Pressable
              onPress={() => validarTarea(tarea.id_tarea)}
              style={[styles.actionBtn, { backgroundColor: colors.success }]}
            >
              <Ionicons name="checkmark-circle" size={14} color="#FFFFFF" />
              <Text style={styles.actionBtnText}>✓ Aprobar</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setTareaParaRechazar(tarea);
                setMotivoRechazo('');
              }}
              style={[styles.actionBtn, { backgroundColor: colors.danger }]}
            >
              <Text style={styles.actionBtnText}>✕ Rechazar</Text>
            </Pressable>
          </View>
        );
      }

      const fuiYo = tarea.id_completador === usuario?.id_usuario;
      return (
        <Pressable
          disabled={!fuiYo}
          onPress={() => abrirModalEvidencia(tarea)}
          style={[styles.waitingPill, { backgroundColor: colors.warning + '22' }]}
        >
          <Ionicons name="camera-outline" size={13} color={colors.warning} />
          <Text style={[styles.waitingText, { color: colors.warning }]}>
            {fuiYo ? 'En Revisión (Cambiar foto)' : 'En Revisión del Jefe'}
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

    // PENDIENTE -> permite capturar evidencia fotográfica (o completar directo si es Jefe/Colaborativo)
    return (
      <View style={styles.dualBtnRow}>
        <Pressable
          onPress={() => abrirModalEvidencia(tarea)}
          style={[styles.actionBtn, { backgroundColor: colors.primary }]}
        >
          <Ionicons name="camera-outline" size={15} color="#FFFFFF" />
          <Text style={styles.actionBtnText}>
            {puedeValidarTareas ? 'Foto / Evidencia' : 'Completar con Foto'}
          </Text>
        </Pressable>

        {puedeValidarTareas && (
          <Pressable
            onPress={() => toggleTarea(tarea.id_tarea)}
            style={[styles.iconRejectBtn, { backgroundColor: colors.success + '22' }]}
          >
            <Ionicons name="checkmark" size={16} color={colors.success} />
          </Pressable>
        )}
      </View>
    );
  };

  const renderTarjetaCuadrada = (tarea: Tarea) => {
    const isDone = tarea.estado === 'COMPLETADA';
    const isEnRevision = tarea.estado === 'EN_REVISION' || tarea.estado === 'POR_VALIDAR';
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
              : isEnRevision || isPropuesta
              ? colors.warning
              : tarea.comentario_revision
              ? colors.danger
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
            {isEnRevision && (
              <View style={[styles.revPill, { backgroundColor: colors.warning + '25' }]}>
                <Text style={[styles.revPillText, { color: colors.warning }]}>En Revisión</Text>
              </View>
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

        {isEnRevision && (
          <Text numberOfLines={1} style={[styles.stateInfoText, { color: colors.warning }]}>
            Enviada por {tarea.completador?.nombre ?? tarea.asignado?.nombre ?? 'integrante'}
          </Text>
        )}

        {/* Miniatura de Evidencia Fotográfica directamente en la tarjeta */}
        {renderMiniaturaEvidencia(tarea)}

        {/* Motivo de rechazo si el Padre/Admin devolvió la tarea a PENDIENTE */}
        {tarea.comentario_revision && tarea.estado === 'PENDIENTE' && (
          <View style={[styles.rejectNoteBox, { backgroundColor: colors.danger + '18' }]}>
            <Ionicons name="alert-circle-outline" size={13} color={colors.danger} />
            <Text numberOfLines={2} style={[styles.rejectNoteText, { color: colors.danger }]}>
              Rechazada: {tarea.comentario_revision}
            </Text>
          </View>
        )}

        {tarea.descripcion && !tarea.evidencia_foto_url ? (
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
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.subTag, { color: colors.secondary }]}>
              {pendientesCount} pendientes
              {revisionCount > 0 ? ` • ${revisionCount} en revisión` : ''}
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
            {/* Destacado superior: Tareas en Revisión con Evidencia Fotográfica */}
            {tareasEnRevision.length > 0 && (
              <View style={styles.memberSection}>
                <View style={styles.memberHeader}>
                  <View style={[styles.avatar, { backgroundColor: colors.warning }]}>
                    <Ionicons name="camera" size={18} color="#FFFFFF" />
                  </View>
                  <View style={styles.memberTextCol}>
                    <Text style={[styles.memberName, { color: colors.textPrimary }]}>
                      En Revisión con Evidencia ({tareasEnRevision.length})
                    </Text>
                    <Text style={[styles.memberRole, { color: colors.textSecondary }]}>
                      {puedeValidarTareas
                        ? 'Revisa la foto y aprueba (+pts) o rechaza con motivo'
                        : 'Esperando aprobación del Jefe de Hogar'}
                    </Text>
                  </View>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.horizontalTasks}
                >
                  {tareasEnRevision.map((t) => renderTarjetaCuadrada(t))}
                </ScrollView>
              </View>
            )}

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
                    : tarea.estado === 'EN_REVISION' || tarea.estado === 'POR_VALIDAR'
                    ? { label: 'En Revisión', bg: colors.warning + '24', fg: colors.warning }
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

                    {renderMiniaturaEvidencia(tarea)}

                    {tarea.comentario_revision && tarea.estado === 'PENDIENTE' && (
                      <View style={[styles.rejectNoteBox, { backgroundColor: colors.danger + '18', marginBottom: 8 }]}>
                        <Ionicons name="alert-circle-outline" size={14} color={colors.danger} />
                        <Text style={[styles.rejectNoteText, { color: colors.danger }]}>
                          Motivo de rechazo: {tarea.comentario_revision}
                        </Text>
                      </View>
                    )}

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

      {/* MODAL 1: CAPTURAR / SUBIR EVIDENCIA FOTOGRÁFICA */}
      <Modal
        visible={tareaParaEvidencia !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setTareaParaEvidencia(null)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                Evidencia Fotográfica
              </Text>
              <Pressable
                onPress={() => setTareaParaEvidencia(null)}
                style={[styles.closeBtn, { backgroundColor: colors.softBg }]}
              >
                <Ionicons name="close" size={20} color={colors.textPrimary} />
              </Pressable>
            </View>

            <Text style={[styles.modalSub, { color: colors.textSecondary }]}>
              Tarea: <Text style={{ fontFamily: fonts.bold, color: colors.textPrimary }}>{tareaParaEvidencia?.titulo}</Text> (+{tareaParaEvidencia?.puntos} pts)
            </Text>
            <Text style={[styles.modalHint, { color: colors.textSecondary }]}>
              Toma una foto del resultado para que el Administrador/Padre valide la tarea y acredite tus puntos.
            </Text>

            {previewUri ? (
              <View style={[styles.previewBox, { borderColor: colors.primary }]}>
                <Image source={{ uri: previewUri }} style={styles.previewImg} resizeMode="cover" />
              </View>
            ) : (
              <View style={[styles.emptyPreviewBox, { backgroundColor: colors.softBg, borderColor: colors.border }]}>
                <Ionicons name="camera-outline" size={40} color={colors.primary} />
                <Text style={[styles.emptyPreviewText, { color: colors.textSecondary }]}>
                  Aún no has capturado la fotografía
                </Text>
              </View>
            )}

            <View style={styles.cameraBtnsRow}>
              <Pressable
                onPress={handleTomarFotoCamara}
                style={[styles.camOptionBtn, { backgroundColor: colors.primary }]}
              >
                <Ionicons name="camera" size={18} color="#FFFFFF" />
                <Text style={styles.camOptionText}>Cámara</Text>
              </Pressable>

              <Pressable
                onPress={handleElegirGaleria}
                style={[styles.camOptionBtn, { backgroundColor: colors.secondary }]}
              >
                <Ionicons name="images" size={18} color="#FFFFFF" />
                <Text style={styles.camOptionText}>Galería</Text>
              </Pressable>
            </View>

            <Pressable
              onPress={handleUsarEvidenciaSimulador}
              style={[styles.simPhotoBtn, { backgroundColor: colors.softBg, borderColor: colors.border }]}
            >
              <Ionicons name="sparkles-outline" size={15} color={colors.primary} />
              <Text style={[styles.simPhotoText, { color: colors.primary }]}>
                Usar foto instantánea de prueba (Emulador)
              </Text>
            </Pressable>

            <AppButton
              title="Subir Evidencia y Enviar a Revisión"
              icon="cloud-upload-outline"
              onPress={handleEnviarEvidencia}
              loading={subiendoFoto}
              disabled={!previewUri && !previewBase64}
            />
          </View>
        </View>
      </Modal>

      {/* MODAL 2: RECHAZAR TAREA CON MOTIVO (PADRE / ADMIN) */}
      <Modal
        visible={tareaParaRechazar !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setTareaParaRechazar(null)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                Rechazar Evidencia
              </Text>
              <Pressable
                onPress={() => setTareaParaRechazar(null)}
                style={[styles.closeBtn, { backgroundColor: colors.softBg }]}
              >
                <Ionicons name="close" size={20} color={colors.textPrimary} />
              </Pressable>
            </View>

            <Text style={[styles.modalHint, { color: colors.textSecondary }]}>
              La tarea "{tareaParaRechazar?.titulo}" volverá a estado PENDIENTE para que el integrante corrija y suba una nueva foto.
            </Text>

            <AppInput
              label="Motivo del Rechazo (visible para el integrante)"
              placeholder="Ej: Falta barrer debajo de la mesa..."
              value={motivoRechazo}
              onChangeText={setMotivoRechazo}
              icon="chatbox-ellipses-outline"
            />

            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <AppButton
                title="Cancelar"
                variant="ghost"
                onPress={() => setTareaParaRechazar(null)}
                style={{ flex: 1 }}
              />
              <AppButton
                title="Devolver Tarea"
                variant="danger"
                onPress={handleConfirmarRechazo}
                loading={procesandoRevision}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL 3: VISOR DE FOTO AMPLIADA */}
      <Modal
        visible={fotoZoomUrl !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setFotoZoomUrl(null)}
      >
        <Pressable
          onPress={() => setFotoZoomUrl(null)}
          style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.88)' }]}
        >
          {fotoZoomUrl && (
            <Image
              source={{ uri: fotoZoomUrl }}
              style={{ width: '94%', height: '65%', borderRadius: radius.lg }}
              resizeMode="contain"
            />
          )}
          <Text style={{ fontFamily: fonts.semibold, fontSize: 13, color: '#FFFFFF', marginTop: 14 }}>
            Toca en cualquier parte para cerrar
          </Text>
        </Pressable>
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
    width: 242,
    minHeight: 195,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1.4,
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
  revPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  revPillText: {
    fontFamily: fonts.bold,
    fontSize: 10,
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
  photoThumbWrap: {
    width: '100%',
    height: 92,
    borderRadius: radius.md,
    borderWidth: 1,
    overflow: 'hidden',
    marginVertical: 6,
  },
  photoThumb: {
    width: '100%',
    height: '100%',
  },
  photoZoomBadge: {
    position: 'absolute',
    bottom: 5,
    right: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  photoZoomText: {
    fontFamily: fonts.semibold,
    fontSize: 10,
    color: '#FFFFFF',
  },
  rejectNoteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    padding: 6,
    borderRadius: radius.sm,
    marginVertical: 4,
  },
  rejectNoteText: {
    fontFamily: fonts.medium,
    fontSize: 11,
    flex: 1,
  },
  taskDesc: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 16,
    flex: 1,
  },
  cardBottom: {
    marginTop: 8,
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
    fontSize: 11,
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
    marginBottom: 10,
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
    marginBottom: spacing.xs,
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
  modalSub: {
    fontFamily: fonts.regular,
    fontSize: 13,
    marginBottom: 4,
  },
  modalHint: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 17,
    marginBottom: spacing.md,
  },
  previewBox: {
    width: '100%',
    height: 180,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  previewImg: {
    width: '100%',
    height: '100%',
  },
  emptyPreviewBox: {
    width: '100%',
    height: 150,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: spacing.md,
  },
  emptyPreviewText: {
    fontFamily: fonts.regular,
    fontSize: 12,
  },
  cameraBtnsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  camOptionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: radius.md,
  },
  camOptionText: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: '#FFFFFF',
  },
  simPhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  simPhotoText: {
    fontFamily: fonts.semibold,
    fontSize: 12,
  },
});
