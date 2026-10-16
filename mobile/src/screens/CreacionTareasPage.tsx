import React, { useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { AppButton } from '../components/AppButton';
import { AppCard } from '../components/AppCard';
import { AppInput } from '../components/AppInput';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme/ThemeContext';
import { fonts, radius, shadow, spacing } from '../theme/tokens';

export function CreacionTareasPage() {
  const { colors, theme } = useTheme();
  const navigation = useNavigation();
  const { hogar, categorias, agregarTarea } = useAuth();

  const miembros = hogar?.miembros ?? [];
  const categoriasTarea = categorias.filter((c) => c.tipo === 'TAREA');

  const [titulo, setTitulo] = useState('');
  const [detalles, setDetalles] = useState('');
  const [idAsignado, setIdAsignado] = useState<number | null>(miembros[0]?.id_usuario ?? null);
  const [idCategoria, setIdCategoria] = useState<number | null>(categoriasTarea[0]?.id_categoria ?? null);
  const [puntos, setPuntos] = useState(15);
  const [recordatorio, setRecordatorio] = useState(true);
  const [tareaRecurrente, setTareaRecurrente] = useState(false);
  const [loading, setLoading] = useState(false);

  // Modal para seleccionar miembro
  const [pickerMiembroVisible, setPickerMiembroVisible] = useState(false);

  const miembroSeleccionado = miembros.find((m) => m.id_usuario === idAsignado);

  const opcionesPuntos = [
    { label: 'Fácil (5 pts)', valor: 5 },
    { label: 'Media (15 pts)', valor: 15 },
    { label: 'Difícil (25 pts)', valor: 25 },
    { label: 'Pesada (40 pts)', valor: 40 },
  ];

  const handleConfirmar = async () => {
    if (!titulo.trim()) {
      Alert.alert('Falta información', 'Por favor ingresa un título para la tarea.');
      return;
    }
    setLoading(true);
    try {
      await agregarTarea({
        titulo: titulo.trim(),
        descripcion: detalles.trim() || undefined,
        id_asignado: idAsignado,
        id_categoria: idCategoria,
        puntos,
      });
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'No se pudo crear la tarea');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      {/* Header: Flecha atrás y título "Creación de Tareas" */}
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
        <Text style={[styles.title, { color: colors.textPrimary }]}>Creación de Tareas</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Título de la tarea */}
        <AppInput
          label="Título de la Tarea"
          placeholder="Ej: Desinfectar refrigerador, Sacar basura"
          value={titulo}
          onChangeText={setTitulo}
          icon="checkbox-outline"
        />

        {/* Selector Desplegable: Nombre del Miembro Asignado */}
        <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Miembro Asignado</Text>
        <Pressable
          onPress={() => setPickerMiembroVisible(true)}
          style={[
            styles.dropdownBtn,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <View style={styles.dropdownLeft}>
            <Ionicons name="person-outline" size={18} color={colors.primary} />
            <Text style={[styles.dropdownText, { color: colors.textPrimary }]}>
              {miembroSeleccionado?.usuario.nombre ?? 'Seleccionar integrante'}
            </Text>
          </View>
          <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
        </Pressable>

        {/* Selector de Categoría */}
        <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: spacing.md }]}>
          Categoría
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
          {categoriasTarea.map((cat) => {
            const isSelected = idCategoria === cat.id_categoria;
            return (
              <Pressable
                key={cat.id_categoria}
                onPress={() => setIdCategoria(cat.id_categoria)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: isSelected ? colors.primary : colors.surface,
                    borderColor: isSelected ? colors.primary : colors.border,
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
        </ScrollView>

        {/* Dificultad / Puntos */}
        <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: spacing.md }]}>
          Nivel de Esfuerzo (Puntos)
        </Text>
        <View style={styles.puntosRow}>
          {opcionesPuntos.map((opt) => {
            const isSelected = puntos === opt.valor;
            return (
              <Pressable
                key={opt.valor}
                onPress={() => setPuntos(opt.valor)}
                style={[
                  styles.puntosChip,
                  {
                    backgroundColor: isSelected ? colors.secondary : colors.surface,
                    borderColor: isSelected ? colors.secondary : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.puntosText,
                    { color: isSelected ? (colors.onHighlight ?? colors.textPrimary) : colors.textPrimary },
                  ]}
                >
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Campo Multilínea: "Detalles de la Tarea" */}
        <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: spacing.md }]}>
          Detalles de la Tarea
        </Text>
        <View
          style={[
            styles.textAreaWrapper,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <TextInput
            multiline
            numberOfLines={4}
            placeholder="Escriba aquí..."
            placeholderTextColor={colors.textSecondary + '80'}
            value={detalles}
            onChangeText={setDetalles}
            style={[styles.textArea, { color: colors.textPrimary }]}
          />
        </View>

        {/* Opciones Adicionales con <Switch> */}
        <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: spacing.lg }]}>
          Opciones Adicionales
        </Text>
        <AppCard style={styles.switchesCard}>
          <View style={styles.switchRow}>
            <View style={styles.switchLabelCol}>
              <Text style={[styles.switchTitle, { color: colors.textPrimary }]}>Recordatorio automático</Text>
              <Text style={[styles.switchSub, { color: colors.textSecondary }]}>Notificar el día límite</Text>
            </View>
            <Switch
              value={recordatorio}
              onValueChange={setRecordatorio}
              trackColor={{ false: colors.softBg, true: colors.secondary }}
              thumbColor={recordatorio ? colors.primary : '#FFFFFF'}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.switchRow}>
            <View style={styles.switchLabelCol}>
              <Text style={[styles.switchTitle, { color: colors.textPrimary }]}>Repetir cada semana</Text>
              <Text style={[styles.switchSub, { color: colors.textSecondary }]}>Reasignar automáticamente</Text>
            </View>
            <Switch
              value={tareaRecurrente}
              onValueChange={setTareaRecurrente}
              trackColor={{ false: colors.softBg, true: colors.secondary }}
              thumbColor={tareaRecurrente ? colors.primary : '#FFFFFF'}
            />
          </View>
        </AppCard>

        {/* Botón Cuadrado Inferior "Confirmar" con icono de check (✓) */}
        <View style={styles.footerBtn}>
          <AppButton
            title="Confirmar"
            icon="checkmark"
            onPress={handleConfirmar}
            loading={loading}
            style={styles.confirmBtn}
          />
        </View>
      </ScrollView>

      {/* Modal Selector de Miembros */}
      <Modal
        visible={pickerMiembroVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerMiembroVisible(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Asignar a un Integrante</Text>
            {miembros.map((m) => {
              const isSelected = m.id_usuario === idAsignado;
              return (
                <Pressable
                  key={m.id_usuario}
                  onPress={() => {
                    setIdAsignado(m.id_usuario);
                    setPickerMiembroVisible(false);
                  }}
                  style={[
                    styles.pickerRow,
                    {
                      backgroundColor: isSelected ? colors.primary : 'transparent',
                      borderRadius: radius.md,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.pickerText,
                      { color: isSelected ? (colors.onPrimary ?? '#FFFFFF') : colors.textPrimary },
                    ]}
                  >
                    {m.usuario.nombre} ({m.rol === 'ADMINISTRADOR' ? 'Admin' : 'Miembro'})
                  </Text>
                  {isSelected && <Ionicons name="checkmark" size={18} color="#FFFFFF" />}
                </Pressable>
              );
            })}
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
    paddingBottom: 40,
  },
  fieldLabel: {
    fontFamily: fonts.medium,
    fontSize: 13,
    marginBottom: 6,
  },
  dropdownBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1.2,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  dropdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dropdownText: {
    fontFamily: fonts.semibold,
    fontSize: 14,
  },
  chipsRow: {
    gap: 8,
    paddingVertical: 4,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  chipText: {
    fontFamily: fonts.medium,
    fontSize: 13,
  },
  puntosRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  puntosChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  puntosText: {
    fontFamily: fonts.semibold,
    fontSize: 12,
  },
  textAreaWrapper: {
    borderWidth: 1.2,
    borderRadius: radius.md,
    padding: spacing.md,
    minHeight: 100,
  },
  textArea: {
    fontFamily: fonts.regular,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  switchesCard: {
    padding: spacing.md,
    marginTop: 4,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  switchLabelCol: {
    flex: 1,
    paddingRight: spacing.md,
  },
  switchTitle: {
    fontFamily: fonts.semibold,
    fontSize: 14,
  },
  switchSub: {
    fontFamily: fonts.regular,
    fontSize: 12,
    marginTop: 2,
  },
  divider: {
    height: 1,
    marginVertical: spacing.sm,
  },
  footerBtn: {
    marginTop: spacing.xl,
  },
  confirmBtn: {
    borderRadius: radius.lg,
    paddingVertical: 16,
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
  modalTitle: {
    fontFamily: fonts.bold,
    fontSize: 17,
    marginBottom: spacing.md,
  },
  pickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    marginVertical: 3,
  },
  pickerText: {
    fontFamily: fonts.medium,
    fontSize: 14,
  },
});
