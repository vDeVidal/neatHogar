import React, { useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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

type SubVistaCompras = 'lista' | 'suministros';

export function ComprasCompartidasPage() {
  const { colors, theme } = useTheme();
  const {
    compras,
    suministros,
    categorias,
    usuario,
    esJefeDeHogar,
    puedeGestionarComprasDirecto,
    toggleCompra,
    validarCompra,
    rechazarCompra,
    agregarCompra,
    eliminarCompra,
    limpiarComprados,
    agregarCategoriaCompra,
    agregarSuministro,
    eliminarSuministro,
    recargarDatos,
  } = useAuth();

  const [subVista, setSubVista] = useState<SubVistaCompras>('lista');
  const [categoriaFiltro, setCategoriaFiltro] = useState<number | 'TODAS'>('TODAS');
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevaCantidad, setNuevaCantidad] = useState('1');
  const [addCatModalVisible, setAddCatModalVisible] = useState(false);
  const [nombreNuevaCat, setNombreNuevaCat] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Estados Monitor Exclusivo de Gas y Control de Despensa (Incremento v2)
  const [gasModalVisible, setGasModalVisible] = useState(false);
  const [despensaModalVisible, setDespensaModalVisible] = useState(false);
  const [historialGasAbierto, setHistorialGasAbierto] = useState(false);

  const [nombreGas, setNombreGas] = useState('Balón de Gas 15kg');
  const [fechaCompraGas, setFechaCompraGas] = useState(new Date().toISOString().slice(0, 10));
  const [notasGas, setNotasGas] = useState('');

  const [nombreDespensa, setNombreDespensa] = useState('');
  const [fechaCompraDespensa, setFechaCompraDespensa] = useState(new Date().toISOString().slice(0, 10));
  const [diasAlertaDespensa, setDiasAlertaDespensa] = useState('15');
  const [savingSuministro, setSavingSuministro] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await recargarDatos();
    } finally {
      setRefreshing(false);
    }
  };

  const formatearFechaLarga = (iso?: string | null) => {
    if (!iso) return 'Sin registro';
    const d = new Date(iso);
    return d.toLocaleDateString('es-CL', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const fechaPreset = (diasAtras: number) => {
    const d = new Date();
    d.setDate(d.getDate() - diasAtras);
    return d.toISOString().slice(0, 10);
  };

  const handleRegistrarGas = async () => {
    if (!nombreGas.trim()) return;
    setSavingSuministro(true);
    try {
      await agregarSuministro({
        tipo: 'GAS',
        nombre: nombreGas.trim(),
        fecha_compra: new Date(`${fechaCompraGas}T12:00:00`).toISOString(),
        dias_alerta_inicial: 14,
        dias_alerta_critica: 21,
        notas: notasGas.trim() || undefined,
      });
      setGasModalVisible(false);
      setNotasGas('');
      Alert.alert(
        '🔥 Compra de Gas Registrada',
        'Se actualizaron las métricas del cilindro y se programaron las notificaciones preventivas para la 2ª semana (14 días), 3ª semana (21 días) y 4ª semana.',
      );
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'No se pudo registrar la compra de gas');
    } finally {
      setSavingSuministro(false);
    }
  };

  const handleRegistrarDespensa = async () => {
    if (!nombreDespensa.trim()) {
      Alert.alert('Falta nombre', 'Ingresa el nombre del insumo o producto de despensa.');
      return;
    }
    const diasUmbral = Math.max(1, parseInt(diasAlertaDespensa, 10) || 14);
    setSavingSuministro(true);
    try {
      await agregarSuministro({
        tipo: 'DESPENSA',
        nombre: nombreDespensa.trim(),
        fecha_compra: new Date(`${fechaCompraDespensa}T12:00:00`).toISOString(),
        dias_alerta_inicial: diasUmbral,
        dias_alerta_critica: diasUmbral + 7,
      });
      setNombreDespensa('');
      setDespensaModalVisible(false);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'No se pudo registrar en despensa');
    } finally {
      setSavingSuministro(false);
    }
  };

  const categoriasCompra = categorias.filter((c) => c.tipo === 'COMPRA');

  const itemsFiltrados = compras.filter((item) => {
    if (categoriaFiltro === 'TODAS') return true;
    return item.id_categoria === categoriaFiltro;
  });

  const pendientesCount = compras.filter((i) => !i.comprado).length;
  const compradosCount = compras.filter((i) => i.comprado).length;

  const handleAgregarItem = () => {
    if (!nuevoNombre.trim()) return;
    const catId =
      typeof categoriaFiltro === 'number'
        ? categoriaFiltro
        : categoriasCompra[0]?.id_categoria ?? null;
    agregarCompra({
      nombre: nuevoNombre.trim(),
      cantidad: nuevaCantidad.trim() || '1',
      id_categoria: catId,
    });
    setNuevoNombre('');
    setNuevaCantidad('1');
  };

  const handleCrearCategoria = async () => {
    if (!nombreNuevaCat.trim()) return;
    try {
      await agregarCategoriaCompra(nombreNuevaCat.trim());
      setAddCatModalVisible(false);
      setNombreNuevaCat('');
    } catch (e: any) {
      Alert.alert('Aviso', e?.message || 'No se pudo crear la categoría');
    }
  };

  const gasActivo = suministros.gas_activo;
  const gasSemaphore =
    !gasActivo || gasActivo.nivel_alerta === 'NORMAL'
      ? {
          color: colors.success,
          bg: colors.success + '20',
          label: 'Nivel óptimo (0 a 13 días)',
          msg: '✅ El cilindro de gas se encuentra dentro del rango normal de uso.',
          pct: Math.min(100, Math.round(((gasActivo?.dias_transcurridos ?? 0) / 21) * 100)),
        }
      : gasActivo.nivel_alerta === 'ADVERTENCIA_2_SEMANAS'
      ? {
          color: colors.warning,
          bg: colors.warning + '22',
          label: 'Advertencia Preventiva (2 Semanas)',
          msg: '⚠️ Han pasado 2 semanas desde la última compra. Verifica el nivel del gas.',
          pct: Math.min(100, Math.round((gasActivo.dias_transcurridos / 21) * 100)),
        }
      : {
          color: colors.danger,
          bg: colors.danger + '22',
          label: 'Alerta Crítica (3+ Semanas)',
          msg: '🚨 ¡3 semanas o más! Es muy probable que el gas esté por acabarse.',
          pct: 100,
        };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={[styles.subtitle, { color: colors.secondary }]}>
              {subVista === 'lista'
                ? `${pendientesCount} pendientes • ${compradosCount} comprados`
                : 'Abastecimiento & Alertas Preventivas'}
            </Text>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              {subVista === 'lista' ? 'Listas de Compras' : 'Despensa y Monitor de Gas'}
            </Text>
          </View>

          {subVista === 'lista' && compradosCount > 0 && puedeGestionarComprasDirecto && (
            <Pressable
              onPress={limpiarComprados}
              style={[styles.cleanBtn, { backgroundColor: colors.softBg, borderColor: colors.border }]}
            >
              <Ionicons name="trash-outline" size={16} color={colors.textSecondary} />
              <Text style={[styles.cleanText, { color: colors.textSecondary }]}>Limpiar</Text>
            </Pressable>
          )}
        </View>

        {/* Segmented Control (Sección 4.4 Especificación Incremento v2) */}
        <SegmentedControl
          values={[
            { key: 'lista', label: 'Lista por Comprar' },
            { key: 'suministros', label: 'Despensa y Gas 🔥' },
          ]}
          selected={subVista}
          onChange={setSubVista}
        />

        {subVista === 'lista' ? (
          <>
            <View style={styles.chipsRow}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipsScroll}
              >
                <Pressable
                  onPress={() => setCategoriaFiltro('TODAS')}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: categoriaFiltro === 'TODAS' ? colors.primary : colors.surface,
                      borderColor: categoriaFiltro === 'TODAS' ? colors.primary : colors.border,
                      ...shadow(theme.isDark, categoriaFiltro === 'TODAS' ? 2 : 1),
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      {
                        color:
                          categoriaFiltro === 'TODAS'
                            ? (colors.onPrimary ?? '#FFFFFF')
                            : colors.textPrimary,
                      },
                    ]}
                  >
                    Todas
                  </Text>
                </Pressable>

                {categoriasCompra.map((cat) => {
                  const isSelected = categoriaFiltro === cat.id_categoria;
                  return (
                    <Pressable
                      key={cat.id_categoria}
                      onPress={() => setCategoriaFiltro(cat.id_categoria)}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: isSelected ? colors.primary : colors.surface,
                          borderColor: isSelected ? colors.primary : colors.border,
                          ...shadow(theme.isDark, isSelected ? 2 : 1),
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          {
                            color: isSelected
                              ? (colors.onPrimary ?? '#FFFFFF')
                              : colors.textPrimary,
                          },
                        ]}
                      >
                        {cat.nombre}
                      </Text>
                    </Pressable>
                  );
                })}

                {puedeGestionarComprasDirecto && (
                  <Pressable
                    onPress={() => setAddCatModalVisible(true)}
                    style={[
                      styles.pencilBtn,
                      { backgroundColor: colors.surface, borderColor: colors.border },
                    ]}
                  >
                    <Ionicons name="pencil-outline" size={16} color={colors.primary} />
                  </Pressable>
                )}
              </ScrollView>
            </View>

            <View style={[styles.quickAddBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <TextInput
                placeholder={
                  puedeGestionarComprasDirecto
                    ? '¿Qué falta comprar hoy?'
                    : 'Solicitar producto al Jefe de Hogar...'
                }
                placeholderTextColor={colors.textSecondary + '80'}
                value={nuevoNombre}
                onChangeText={setNuevoNombre}
                style={[styles.quickInput, { color: colors.textPrimary }]}
              />
              <TextInput
                placeholder="Cant."
                placeholderTextColor={colors.textSecondary + '80'}
                value={nuevaCantidad}
                onChangeText={setNuevaCantidad}
                style={[styles.qtyInput, { color: colors.textPrimary, borderColor: colors.border }]}
              />
              <Pressable
                onPress={handleAgregarItem}
                disabled={!nuevoNombre.trim()}
                style={[
                  styles.addBtn,
                  { backgroundColor: nuevoNombre.trim() ? colors.primary : colors.softBg },
                ]}
              >
                <Ionicons
                  name={puedeGestionarComprasDirecto ? 'add' : 'paper-plane-outline'}
                  size={20}
                  color={nuevoNombre.trim() ? (colors.onPrimary ?? '#FFFFFF') : colors.textSecondary}
                />
              </Pressable>
            </View>

            <FlatList
              data={itemsFiltrados}
              keyExtractor={(item) => String(item.id_item)}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
              }
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="cart-outline" size={48} color={colors.textSecondary + '60'} />
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                    No hay productos en esta lista
                  </Text>
                </View>
              }
              renderItem={({ item }) => {
                const isPendienteAprob = item.estado_validacion === 'PENDIENTE_APROBACION';
                const isCompraPorValidar = item.estado_validacion === 'COMPRA_POR_VALIDAR';
                const necesitaValidacion = isPendienteAprob || isCompraPorValidar;
                const puedeEliminarEste =
                  puedeGestionarComprasDirecto ||
                  (isPendienteAprob && item.id_creador === usuario?.id_usuario);

                return (
                  <AppCard
                    onPress={() => {
                      if (!isPendienteAprob) {
                        toggleCompra(item.id_item);
                      }
                    }}
                    style={{
                      ...styles.itemCard,
                      opacity: item.comprado ? 0.68 : 1,
                      backgroundColor: item.comprado ? colors.softBg : colors.card,
                      borderColor: necesitaValidacion ? colors.warning : colors.border,
                      borderWidth: necesitaValidacion ? 1.3 : 1,
                    }}
                  >
                    <View style={styles.itemRow}>
                      <View style={styles.itemLeft}>
                        <Text
                          style={[
                            styles.itemTitle,
                            {
                              color: colors.textPrimary,
                              textDecorationLine: item.comprado ? 'line-through' : 'none',
                            },
                          ]}
                        >
                          {item.nombre}
                        </Text>

                        <View style={styles.itemMeta}>
                          {item.categoria && (
                            <Text style={[styles.itemCategory, { color: colors.secondary }]}>
                              {item.categoria.nombre} •
                            </Text>
                          )}
                          <Text style={[styles.itemAuthor, { color: colors.textSecondary }]}>
                            {item.comprado
                              ? `Comprado por ${item.comprador?.nombre ?? 'integrante'}`
                              : isCompraPorValidar
                              ? `Marcado comprado por ${item.comprador?.nombre ?? 'integrante'}`
                              : `Por ${item.creador?.nombre ?? 'integrante'}`}
                          </Text>
                        </View>

                        {necesitaValidacion && (
                          <View
                            style={[
                              styles.valStatePill,
                              { backgroundColor: colors.warning + '22' },
                            ]}
                          >
                            <Ionicons name="shield-outline" size={12} color={colors.warning} />
                            <Text style={[styles.valStateText, { color: colors.warning }]}>
                              {isPendienteAprob
                                ? 'Solicitud pendiente del Jefe de Hogar'
                                : 'Compra por validar por Jefe de Hogar'}
                            </Text>
                          </View>
                        )}
                      </View>

                      <View style={styles.itemRight}>
                        <View
                          style={[
                            styles.qtyBadge,
                            { backgroundColor: colors.surface, borderColor: colors.border },
                          ]}
                        >
                          <Text style={[styles.qtyText, { color: colors.textPrimary }]}>
                            {item.cantidad}
                          </Text>
                        </View>

                        {necesitaValidacion && (esJefeDeHogar || puedeGestionarComprasDirecto) ? (
                          <View style={styles.valBtnsRow}>
                            <Pressable
                              onPress={() => validarCompra(item.id_item)}
                              style={[styles.valCircleBtn, { backgroundColor: colors.success }]}
                            >
                              <Ionicons name="checkmark" size={15} color="#FFFFFF" />
                            </Pressable>
                            <Pressable
                              onPress={() => rechazarCompra(item.id_item)}
                              style={[styles.valCircleBtn, { backgroundColor: colors.danger + '22' }]}
                            >
                              <Ionicons name="close" size={15} color={colors.danger} />
                            </Pressable>
                          </View>
                        ) : !isPendienteAprob ? (
                          <Pressable
                            onPress={() => toggleCompra(item.id_item)}
                            style={[
                              styles.checkbox,
                              {
                                borderColor: item.comprado
                                  ? colors.success
                                  : isCompraPorValidar
                                  ? colors.warning
                                  : colors.border,
                                backgroundColor: item.comprado
                                  ? colors.success
                                  : isCompraPorValidar
                                  ? colors.warning
                                  : 'transparent',
                              },
                            ]}
                          >
                            {(item.comprado || isCompraPorValidar) && (
                              <Ionicons
                                name={item.comprado ? 'checkmark' : 'hourglass-outline'}
                                size={15}
                                color="#FFFFFF"
                              />
                            )}
                          </Pressable>
                        ) : null}

                        {puedeEliminarEste && (
                          <Pressable
                            onPress={() => eliminarCompra(item.id_item)}
                            style={styles.deleteBtn}
                          >
                            <Ionicons name="close" size={18} color={colors.textSecondary} />
                          </Pressable>
                        )}
                      </View>
                    </View>
                  </AppCard>
                );
              }}
            />
          </>
        ) : (
          /* APARTADO INCREMENTO V2: MONITOR EXCLUSIVO DE GAS Y CONTROL DE DESPENSA */
          <ScrollView
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
            }
          >
            {/* 1. TARJETA HERO EXCLUSIVA: CONTROL DEL GAS DEL HOGAR 🔥 */}
            <AppCard
              style={{
                ...styles.gasHeroCard,
                borderColor: gasSemaphore.color,
                borderWidth: 1.8,
              }}
            >
              <View style={styles.gasHeaderRow}>
                <View style={[styles.gasFlameCircle, { backgroundColor: gasSemaphore.bg }]}>
                  <Ionicons name="flame" size={26} color={gasSemaphore.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.gasHeroTag, { color: gasSemaphore.color }]}>
                    MONITOR EXCLUSIVO DE GAS 🔥
                  </Text>
                  <Text style={[styles.gasHeroTitle, { color: colors.textPrimary }]}>
                    {gasActivo ? gasActivo.nombre : 'Control del Gas del Hogar'}
                  </Text>
                </View>
              </View>

              {gasActivo ? (
                <>
                  <View style={[styles.gasStatsBox, { backgroundColor: colors.softBg }]}>
                    <View style={styles.gasStatCol}>
                      <Text style={[styles.gasStatLabel, { color: colors.textSecondary }]}>
                        Fecha última compra
                      </Text>
                      <Text style={[styles.gasStatValue, { color: colors.textPrimary }]}>
                        Comprado el {formatearFechaLarga(gasActivo.fecha_compra)}
                      </Text>
                    </View>
                    <View style={styles.gasStatCol}>
                      <Text style={[styles.gasStatLabel, { color: colors.textSecondary }]}>
                        Tiempo transcurrido
                      </Text>
                      <Text style={[styles.gasStatValue, { color: gasSemaphore.color }]}>
                        Han pasado {gasActivo.dias_transcurridos} días ({gasActivo.semanas_transcurridas} semanas)
                      </Text>
                    </View>
                  </View>

                  {/* Barra de estado / Semáforo dinámico */}
                  <View style={styles.semaphoreBlock}>
                    <View style={styles.semaphoreLabelsRow}>
                      <Text style={[styles.semaphoreStateText, { color: gasSemaphore.color }]}>
                        {gasSemaphore.label}
                      </Text>
                      <Text style={[styles.semaphoreDaysHint, { color: colors.textSecondary }]}>
                        2 sem (14d) • 3 sem (21d)
                      </Text>
                    </View>
                    <View style={[styles.progressTrack, { backgroundColor: colors.softBg }]}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width: `${Math.max(8, gasSemaphore.pct)}%`,
                            backgroundColor: gasSemaphore.color,
                          },
                        ]}
                      />
                    </View>
                    <View style={[styles.alertMessageBox, { backgroundColor: gasSemaphore.bg }]}>
                      <Text style={[styles.alertMessageText, { color: colors.textPrimary }]}>
                        {gasSemaphore.msg}
                      </Text>
                    </View>
                  </View>
                </>
              ) : (
                <Text style={[styles.noGasText, { color: colors.textSecondary }]}>
                  Aún no se ha registrado la compra actual del balón de gas en este hogar.
                </Text>
              )}

              <AppButton
                title="Registrar Nueva Compra de Gas"
                icon="flame-outline"
                onPress={() => {
                  setFechaCompraGas(new Date().toISOString().slice(0, 10));
                  setGasModalVisible(true);
                }}
                style={{ marginTop: spacing.sm }}
              />

              {/* Historial desplegable de compras anteriores de gas */}
              {suministros.historial_gas.length > 0 && (
                <View style={[styles.historySection, { borderTopColor: colors.border }]}>
                  <Pressable
                    onPress={() => setHistorialGasAbierto(!historialGasAbierto)}
                    style={styles.historyToggleRow}
                  >
                    <Text style={[styles.historyToggleText, { color: colors.primary }]}>
                      Historial de Recargas ({suministros.historial_gas.length})
                      {suministros.promedio_duracion_dias
                        ? ` • Promedio: ${suministros.promedio_duracion_dias} días`
                        : ''}
                    </Text>
                    <Ionicons
                      name={historialGasAbierto ? 'chevron-up' : 'chevron-down'}
                      size={16}
                      color={colors.primary}
                    />
                  </Pressable>

                  {historialGasAbierto &&
                    suministros.historial_gas.map((h) => (
                      <View key={h.id_suministro} style={styles.historyItemRow}>
                        <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
                        <Text style={[styles.historyItemText, { color: colors.textSecondary }]}>
                          {formatearFechaLarga(h.fecha_compra)} — {h.nombre}
                          {h.notas ? ` (${h.notas})` : ''}
                        </Text>
                      </View>
                    ))}
                </View>
              )}
            </AppCard>

            {/* 2. SECCIÓN INFERIOR: CONTROL DE DESPENSA E INSUMOS */}
            <View style={styles.despensaHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.despensaTitle, { color: colors.textPrimary }]}>
                  Control de Despensa e Insumos
                </Text>
                <Text style={[styles.despensaSub, { color: colors.textSecondary }]}>
                  Compras recurrentes con alerta automática por antigüedad
                </Text>
              </View>
              <Pressable
                onPress={() => {
                  setFechaCompraDespensa(new Date().toISOString().slice(0, 10));
                  setDespensaModalVisible(true);
                }}
                style={[styles.addDespensaBtn, { backgroundColor: colors.primary }]}
              >
                <Ionicons name="add" size={18} color="#FFFFFF" />
                <Text style={styles.addDespensaBtnText}>Registrar</Text>
              </Pressable>
            </View>

            {suministros.despensa.length === 0 ? (
              <AppCard style={styles.emptyContainer}>
                <Ionicons name="cube-outline" size={40} color={colors.textSecondary + '70'} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  Registra insumos como Detergente, Aceite o Arroz para monitorear su duración.
                </Text>
              </AppCard>
            ) : (
              suministros.despensa.map((item) => {
                const superoUmbral = item.dias_transcurridos >= item.dias_alerta_inicial;
                const esCritico = item.dias_transcurridos >= item.dias_alerta_critica;
                const badgeColor = esCritico
                  ? colors.danger
                  : superoUmbral
                  ? colors.warning
                  : colors.success;

                return (
                  <AppCard
                    key={item.id_suministro}
                    style={{
                      ...styles.itemCard,
                      borderColor: superoUmbral ? badgeColor : colors.border,
                      borderWidth: superoUmbral ? 1.4 : 1,
                    }}
                  >
                    <View style={styles.itemRow}>
                      <View style={styles.itemLeft}>
                        <Text style={[styles.itemTitle, { color: colors.textPrimary }]}>
                          {item.nombre}
                        </Text>
                        <Text style={[styles.itemAuthor, { color: colors.textSecondary, marginTop: 2 }]}>
                          Comprado el {formatearFechaLarga(item.fecha_compra)} • Hace{' '}
                          <Text style={{ fontFamily: fonts.bold, color: badgeColor }}>
                            {item.dias_transcurridos} días
                          </Text>
                        </Text>
                        <View
                          style={[
                            styles.valStatePill,
                            { backgroundColor: badgeColor + '20' },
                          ]}
                        >
                          <Ionicons
                            name={superoUmbral ? 'warning-outline' : 'checkmark-circle-outline'}
                            size={12}
                            color={badgeColor}
                          />
                          <Text style={[styles.valStateText, { color: badgeColor }]}>
                            {superoUmbral
                              ? `Superó umbral de ${item.dias_alerta_inicial} días — Revisar stock`
                              : `En stock (alerta a los ${item.dias_alerta_inicial} días)`}
                          </Text>
                        </View>
                      </View>

                      <Pressable
                        onPress={() => eliminarSuministro(item.id_suministro)}
                        style={styles.deleteBtn}
                      >
                        <Ionicons name="trash-outline" size={18} color={colors.textSecondary} />
                      </Pressable>
                    </View>
                  </AppCard>
                );
              })
            )}
          </ScrollView>
        )}
      </View>

      {/* Modal para agregar categoría */}
      <Modal
        visible={addCatModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAddCatModalVisible(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
              Nueva Categoría de Compra
            </Text>
            <AppInput
              label="Nombre de Categoría"
              placeholder="Ej: Verdulería, Panadería, Mascotas"
              value={nombreNuevaCat}
              onChangeText={setNombreNuevaCat}
              icon="bookmark-outline"
            />
            <View style={styles.modalBtns}>
              <AppButton
                title="Cancelar"
                variant="ghost"
                onPress={() => setAddCatModalVisible(false)}
                style={{ flex: 1 }}
              />
              <AppButton title="Crear" onPress={handleCrearCategoria} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL REGISTRAR NUEVA COMPRA DE GAS */}
      <Modal
        visible={gasModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setGasModalVisible(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
              🔥 Registrar Compra de Gas
            </Text>

            <Text style={[styles.presetLabel, { color: colors.textSecondary }]}>
              Formato del Cilindro:
            </Text>
            <View style={styles.presetRow}>
              {['Balón de Gas 15kg', 'Balón de Gas 11kg', 'Balón de Gas 45kg', 'Balón de Gas 5kg'].map(
                (tipo) => {
                  const sel = nombreGas === tipo;
                  return (
                    <Pressable
                      key={tipo}
                      onPress={() => setNombreGas(tipo)}
                      style={[
                        styles.presetChip,
                        {
                          backgroundColor: sel ? colors.primary : colors.softBg,
                          borderColor: sel ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.presetChipText,
                          { color: sel ? '#FFFFFF' : colors.textPrimary },
                        ]}
                      >
                        {tipo.replace('Balón de ', '')}
                      </Text>
                    </Pressable>
                  );
                },
              )}
            </View>

            <Text style={[styles.presetLabel, { color: colors.textSecondary }]}>
               Selección Rápida de Fecha:
            </Text>
            <View style={styles.presetRow}>
              {[
                { label: 'Hoy', val: fechaPreset(0) },
                { label: 'Hace 2 sem (14d)', val: fechaPreset(14) },
                { label: 'Hace 3 sem (21d)', val: fechaPreset(21) },
                { label: '20 de Octubre', val: '2026-10-20' },
              ].map((p) => {
                const sel = fechaCompraGas === p.val;
                return (
                  <Pressable
                    key={p.label}
                    onPress={() => setFechaCompraGas(p.val)}
                    style={[
                      styles.presetChip,
                      {
                        backgroundColor: sel ? colors.warning : colors.softBg,
                        borderColor: sel ? colors.warning : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.presetChipText,
                        { color: sel ? '#FFFFFF' : colors.textPrimary },
                      ]}
                    >
                      {p.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <AppInput
              label="Fecha de Compra (YYYY-MM-DD)"
              placeholder="2026-10-20"
              value={fechaCompraGas}
              onChangeText={setFechaCompraGas}
              icon="calendar-outline"
            />

            <AppInput
              label="Notas (Opcional)"
              placeholder="Ej: Cilindro cocina / calefont"
              value={notasGas}
              onChangeText={setNotasGas}
              icon="document-text-outline"
            />

            <View style={styles.modalBtns}>
              <AppButton
                title="Cancelar"
                variant="ghost"
                onPress={() => setGasModalVisible(false)}
                style={{ flex: 1 }}
              />
              <AppButton
                title="Guardar y Activar Alertas"
                onPress={handleRegistrarGas}
                loading={savingSuministro}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL REGISTRAR INSUMO EN DESPENSA */}
      <Modal
        visible={despensaModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDespensaModalVisible(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
              📦 Registrar Compra en Despensa
            </Text>

            <AppInput
              label="Producto / Insumo"
              placeholder="Ej: Detergente 3L, Aceite, Arroz 5kg"
              value={nombreDespensa}
              onChangeText={setNombreDespensa}
              icon="cube-outline"
            />

            <AppInput
              label="Fecha de Compra (YYYY-MM-DD)"
              placeholder="2026-11-18"
              value={fechaCompraDespensa}
              onChangeText={setFechaCompraDespensa}
              icon="calendar-outline"
            />

            <Text style={[styles.presetLabel, { color: colors.textSecondary }]}>
              Avisarme para revisar stock después de:
            </Text>
            <View style={styles.presetRow}>
              {['7', '14', '15', '21', '30'].map((d) => {
                const sel = diasAlertaDespensa === d;
                return (
                  <Pressable
                    key={d}
                    onPress={() => setDiasAlertaDespensa(d)}
                    style={[
                      styles.presetChip,
                      {
                        backgroundColor: sel ? colors.primary : colors.softBg,
                        borderColor: sel ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.presetChipText,
                        { color: sel ? '#FFFFFF' : colors.textPrimary },
                      ]}
                    >
                      {d} días
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.modalBtns}>
              <AppButton
                title="Cancelar"
                variant="ghost"
                onPress={() => setDespensaModalVisible(false)}
                style={{ flex: 1 }}
              />
              <AppButton
                title="Registrar"
                onPress={handleRegistrarDespensa}
                loading={savingSuministro}
                style={{ flex: 1 }}
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
    alignItems: 'flex-end',
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontFamily: fonts.medium,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 22,
    marginTop: 2,
  },
  cleanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  cleanText: {
    fontFamily: fonts.medium,
    fontSize: 12,
  },
  chipsRow: {
    marginBottom: spacing.md,
  },
  chipsScroll: {
    alignItems: 'center',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  chipText: {
    fontFamily: fonts.semibold,
    fontSize: 13,
  },
  pencilBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  quickAddBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 6,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: spacing.md,
    gap: 8,
  },
  quickInput: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 14,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
  },
  qtyInput: {
    width: 58,
    fontFamily: fonts.medium,
    fontSize: 13,
    borderLeftWidth: 1,
    paddingHorizontal: spacing.xs,
    textAlign: 'center',
  },
  addBtn: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingBottom: 28,
  },
  itemCard: {
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemLeft: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  itemTitle: {
    fontFamily: fonts.semibold,
    fontSize: 15,
  },
  itemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 4,
  },
  itemCategory: {
    fontFamily: fonts.medium,
    fontSize: 11,
  },
  itemAuthor: {
    fontFamily: fonts.regular,
    fontSize: 11,
  },
  valStatePill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    marginTop: 6,
  },
  valStateText: {
    fontFamily: fonts.semibold,
    fontSize: 10,
  },
  itemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  qtyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  qtyText: {
    fontFamily: fonts.medium,
    fontSize: 12,
  },
  valBtnsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  valCircleBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtn: {
    padding: 4,
  },
  gasHeroCard: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  gasHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: spacing.md,
  },
  gasFlameCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gasHeroTag: {
    fontFamily: fonts.bold,
    fontSize: 11,
    letterSpacing: 0.6,
  },
  gasHeroTitle: {
    fontFamily: fonts.bold,
    fontSize: 18,
  },
  gasStatsBox: {
    padding: spacing.md,
    borderRadius: radius.lg,
    gap: 8,
    marginBottom: spacing.md,
  },
  gasStatCol: {
    gap: 2,
  },
  gasStatLabel: {
    fontFamily: fonts.regular,
    fontSize: 11,
  },
  gasStatValue: {
    fontFamily: fonts.bold,
    fontSize: 14,
  },
  semaphoreBlock: {
    marginBottom: spacing.sm,
  },
  semaphoreLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  semaphoreStateText: {
    fontFamily: fonts.bold,
    fontSize: 12,
  },
  semaphoreDaysHint: {
    fontFamily: fonts.regular,
    fontSize: 11,
  },
  progressTrack: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressFill: {
    height: '100%',
    borderRadius: 5,
  },
  alertMessageBox: {
    padding: spacing.sm,
    borderRadius: radius.md,
  },
  alertMessageText: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    lineHeight: 17,
  },
  noGasText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    marginBottom: spacing.md,
  },
  historySection: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
  },
  historyToggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  historyToggleText: {
    fontFamily: fonts.semibold,
    fontSize: 12,
  },
  historyItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  historyItemText: {
    fontFamily: fonts.regular,
    fontSize: 12,
    flex: 1,
  },
  despensaHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  despensaTitle: {
    fontFamily: fonts.bold,
    fontSize: 17,
  },
  despensaSub: {
    fontFamily: fonts.regular,
    fontSize: 12,
  },
  addDespensaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
  },
  addDespensaBtnText: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: '#FFFFFF',
  },
  presetLabel: {
    fontFamily: fonts.medium,
    fontSize: 12,
    marginBottom: 6,
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: spacing.md,
  },
  presetChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  presetChipText: {
    fontFamily: fonts.semibold,
    fontSize: 11,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    gap: 8,
  },
  emptyText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    textAlign: 'center',
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
  modalTitle: {
    fontFamily: fonts.bold,
    fontSize: 18,
    marginBottom: spacing.md,
  },
  modalBtns: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
});
