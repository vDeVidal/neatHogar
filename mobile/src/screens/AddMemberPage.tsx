import React, { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
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
import { RolMiembro } from '../types';

export function AddMemberPage() {
  const { colors, theme } = useTheme();
  const navigation = useNavigation();
  const { hogar, esHogarConJefe, invitarMiembro } = useAuth();

  const [tipoMiembro, setTipoMiembro] = useState<RolMiembro>('MIEMBRO');
  const [nombreInvitado, setNombreInvitado] = useState('');
  const [permisoValidarTareas, setPermisoValidarTareas] = useState(!esHogarConJefe);
  const [permisoCrearTareas, setPermisoCrearTareas] = useState(!esHogarConJefe);
  const [permisoCompras, setPermisoCompras] = useState(!esHogarConJefe);
  const [loading, setLoading] = useState(false);

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

  const handleEnviar = async () => {
    setLoading(true);
    try {
      const res = await invitarMiembro(tipoMiembro, {
        puede_validar_tareas: tipoMiembro === 'ADMINISTRADOR' ? true : permisoValidarTareas,
        puede_crear_tareas: tipoMiembro === 'ADMINISTRADOR' ? true : permisoCrearTareas,
        puede_gestionar_compras: tipoMiembro === 'ADMINISTRADOR' ? true : permisoCompras,
        nombre: nombreInvitado.trim() || undefined,
      });
      Alert.alert(
        '¡Acceso Listo!',
        nombreInvitado.trim()
          ? `Si "${nombreInvitado.trim()}" ya tenía cuenta se vinculó con sus permisos; si es nuevo, dile que abra NeatHogar, elija "Unirse a un Núcleo" e ingrese el código ${res.codigo_invitacion} junto con su Nombre y PIN.`
          : `Comparte el código ${res.codigo_invitacion}. El integrante solo debe elegir "Unirse a un Núcleo" e ingresar su Nombre y PIN.`,
        [{ text: 'Entendido', onPress: () => navigation.goBack() }],
      );
    } catch (e: any) {
      Alert.alert('Aviso', e?.message || 'No se pudo procesar la invitación');
    } finally {
      setLoading(false);
    }
  };

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
        <Text style={[styles.title, { color: colors.textPrimary }]}>Añadir Miembro</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.codeBox, { backgroundColor: colors.softBg, borderColor: colors.primary }]}>
          <Text style={[styles.codeBoxTitle, { color: colors.textSecondary }]}>
            Código de vinculación de "{hogar?.nombre}"
          </Text>
          <Text style={[styles.codeBoxValue, { color: colors.primary }]}>
            {hogar?.codigo_invitacion ?? 'DEMO01'}
          </Text>
          <Text style={[styles.codeBoxHelp, { color: colors.textSecondary }]}>
            El otro emulador/dispositivo puede entrar con este código usando solo su Nombre y un PIN de 4-6 dígitos.
          </Text>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Rol en este Hogar</Text>
        <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
          {esHogarConJefe
            ? 'Este hogar funciona con Jefe de Hogar: los Integrantes requieren tu validación.'
            : 'Este hogar es Colaborativo: por defecto todos tienen permisos directos.'}
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

        <AppInput
          label="Nombre de Cuenta Existente (Opcional — vinculación directa)"
          placeholder="Ej: Sofía Vidal"
          value={nombreInvitado}
          onChangeText={setNombreInvitado}
          icon="person-add-outline"
        />

        <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginTop: spacing.sm }]}>
          Permisos del Integrante
        </Text>

        <AppCard style={styles.switchContainer}>
          <View style={styles.switchRow}>
            <View style={styles.switchTextCol}>
              <Text style={[styles.switchTitle, { color: colors.textPrimary }]}>
                Validar y completar tareas directo
              </Text>
              <Text style={[styles.switchSub, { color: colors.textSecondary }]}>
                Si se desactiva, sus tareas hechas pasan a revisión del Jefe de Hogar
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

        <View style={styles.footerBtn}>
          <AppButton
            title={nombreInvitado.trim() ? 'Vincular / Guardar Invitación' : 'Confirmar Código de Invitación'}
            icon="paper-plane-outline"
            onPress={handleEnviar}
            loading={loading}
          />
        </View>
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
  codeBox: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  codeBoxTitle: {
    fontFamily: fonts.semibold,
    fontSize: 12,
  },
  codeBoxValue: {
    fontFamily: fonts.bold,
    fontSize: 30,
    letterSpacing: 3,
    marginVertical: 6,
  },
  codeBoxHelp: {
    fontFamily: fonts.regular,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 17,
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
