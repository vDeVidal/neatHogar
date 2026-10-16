import React, { useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppButton } from '../components/AppButton';
import { AppCard } from '../components/AppCard';
import { AppInput } from '../components/AppInput';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme/ThemeContext';
import { fonts, radius, shadow, spacing } from '../theme/tokens';
import { ItemCompra } from '../types';

export function ComprasCompartidasPage() {
  const { colors, theme } = useTheme();
  const { compras, categorias, toggleCompra, agregarCompra, eliminarCompra, limpiarComprados } = useAuth();

  const [categoriaFiltro, setCategoriaFiltro] = useState<number | 'TODAS'>('TODAS');
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevaCantidad, setNuevaCantidad] = useState('1');
  const [addCatModalVisible, setAddCatModalVisible] = useState(false);
  const [nombreNuevaCat, setNombreNuevaCat] = useState('');

  // Filtrar categorías de compras
  const categoriasCompra = categorias.filter((c) => c.tipo === 'COMPRA');

  // Filtrar items
  const itemsFiltrados = compras.filter((item) => {
    if (categoriaFiltro === 'TODAS') return true;
    return item.id_categoria === categoriaFiltro;
  });

  const pendientesCount = compras.filter((i) => !i.comprado).length;
  const compradosCount = compras.filter((i) => i.comprado).length;

  const handleAgregarItem = () => {
    if (!nuevoNombre.trim()) return;
    const catId = typeof categoriaFiltro === 'number' ? categoriaFiltro : (categoriasCompra[0]?.id_categoria ?? null);
    agregarCompra({
      nombre: nuevoNombre.trim(),
      cantidad: nuevaCantidad.trim() || '1',
      id_categoria: catId,
    });
    setNuevoNombre('');
    setNuevaCantidad('1');
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={styles.container}>
        {/* Header: Título "Listas de Compras" */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.subtitle, { color: colors.secondary }]}>
              {pendientesCount} pendientes • {compradosCount} comprados
            </Text>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Listas de Compras</Text>
          </View>

          {compradosCount > 0 && (
            <Pressable
              onPress={limpiarComprados}
              style={[styles.cleanBtn, { backgroundColor: colors.softBg, borderColor: colors.border }]}
            >
              <Ionicons name="trash-outline" size={16} color={colors.textSecondary} />
              <Text style={[styles.cleanText, { color: colors.textSecondary }]}>Limpiar</Text>
            </Pressable>
          )}
        </View>

        {/* Filtros Superiores: Chips Horizontales + Botón circular con icono de lápiz */}
        <View style={styles.chipsRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
            {/* Chip "Todas" */}
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
                  { color: categoriaFiltro === 'TODAS' ? (colors.onPrimary ?? '#FFFFFF') : colors.textPrimary },
                ]}
              >
                Todas
              </Text>
            </Pressable>

            {/* Chips por Categoría */}
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
                      { color: isSelected ? (colors.onPrimary ?? '#FFFFFF') : colors.textPrimary },
                    ]}
                  >
                    {cat.nombre}
                  </Text>
                </Pressable>
              );
            })}

            {/* Botón circular con icono de lápiz / agregar categoría */}
            <Pressable
              onPress={() => setAddCatModalVisible(true)}
              style={[styles.pencilBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <Ionicons name="pencil-outline" size={16} color={colors.primary} />
            </Pressable>
          </ScrollView>
        </View>

        {/* Barra de Entrada Rápida de Nuevos Productos */}
        <View style={[styles.quickAddBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TextInput
            placeholder="¿Qué falta comprar hoy?"
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
              name="add"
              size={22}
              color={nuevoNombre.trim() ? (colors.onPrimary ?? '#FFFFFF') : colors.textSecondary}
            />
          </Pressable>
        </View>

        {/* Lista de Ítems */}
        <FlatList
          data={itemsFiltrados}
          keyExtractor={(item) => String(item.id_item)}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="cart-outline" size={48} color={colors.textSecondary + '60'} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No hay productos en esta lista
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            return (
              <AppCard
                onPress={() => toggleCompra(item.id_item)}
                style={{
                  ...styles.itemCard,
                  opacity: item.comprado ? 0.65 : 1,
                  backgroundColor: item.comprado ? colors.softBg : colors.card,
                }}
              >
                <View style={styles.itemRow}>
                  {/* Izquierda: Nombre del producto y detalles */}
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
                        {item.comprado ? `Comprado por ${item.comprador?.nombre ?? 'miembro'}` : `Agregado por ${item.creador?.nombre ?? 'miembro'}`}
                      </Text>
                    </View>
                  </View>

                  {/* Derecha: Cantidad y Checkbox */}
                  <View style={styles.itemRight}>
                    <View style={[styles.qtyBadge, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <Text style={[styles.qtyText, { color: colors.textPrimary }]}>{item.cantidad}</Text>
                    </View>

                    <Pressable
                      onPress={() => toggleCompra(item.id_item)}
                      style={[
                        styles.checkbox,
                        {
                          borderColor: item.comprado ? colors.success : colors.border,
                          backgroundColor: item.comprado ? colors.success : 'transparent',
                        },
                      ]}
                    >
                      {item.comprado && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
                    </Pressable>

                    <Pressable
                      onPress={() => eliminarCompra(item.id_item)}
                      style={styles.deleteBtn}
                    >
                      <Ionicons name="close" size={18} color={colors.textSecondary} />
                    </Pressable>
                  </View>
                </View>
              </AppCard>
            );
          }}
        />
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
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Nueva Categoría de Compra</Text>
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
              <AppButton
                title="Crear"
                onPress={() => {
                  if (nombreNuevaCat.trim()) {
                    setAddCatModalVisible(false);
                    setNombreNuevaCat('');
                  }
                }}
                style={{ flex: 1 }}
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
    fontSize: 24,
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
    width: 60,
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
  itemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
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
