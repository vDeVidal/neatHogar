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
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme/ThemeContext';
import { fonts, radius, shadow, spacing } from '../theme/tokens';

export function ComprasCompartidasPage() {
  const { colors, theme } = useTheme();
  const {
    compras,
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
    recargarDatos,
  } = useAuth();

  const [categoriaFiltro, setCategoriaFiltro] = useState<number | 'TODAS'>('TODAS');
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevaCantidad, setNuevaCantidad] = useState('1');
  const [addCatModalVisible, setAddCatModalVisible] = useState(false);
  const [nombreNuevaCat, setNombreNuevaCat] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await recargarDatos();
    } finally {
      setRefreshing(false);
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

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={[styles.subtitle, { color: colors.secondary }]}>
              {pendientesCount} pendientes • {compradosCount} comprados
            </Text>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Listas de Compras</Text>
          </View>

          {compradosCount > 0 && puedeGestionarComprasDirecto && (
            <Pressable
              onPress={limpiarComprados}
              style={[styles.cleanBtn, { backgroundColor: colors.softBg, borderColor: colors.border }]}
            >
              <Ionicons name="trash-outline" size={16} color={colors.textSecondary} />
              <Text style={[styles.cleanText, { color: colors.textSecondary }]}>Limpiar</Text>
            </Pressable>
          )}
        </View>

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

        {/* Barra de Entrada Rápida */}
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
      </View>

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
    marginBottom: spacing.md,
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
    paddingBottom: 24,
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
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 8,
  },
  emptyText: {
    fontFamily: fonts.regular,
    fontSize: 14,
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
