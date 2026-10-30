import React, { useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppButton } from '../components/AppButton';
import { AppCard } from '../components/AppCard';
import { ChartProgress } from '../components/ChartProgress';
import { useAuth } from '../context/AuthContext';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../theme/ThemeContext';
import { fonts, radius, spacing } from '../theme/tokens';
import { MiembroHogar, NivelDisponibilidad, RolMiembro } from '../types';

export function DashboardPage() {
  const { colors } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const {
    hogar,
    usuario,
    misHogares,
    progreso,
    tareas,
    compras,
    gastos,
    esJefeDeHogar,
    esHogarConJefe,
    validacionesPendientesCount,
    seleccionarHogar,
    cambiarTipoHogar,
    cambiarPermisosMiembro,
    eliminarMiembroHogar,
    validarTarea,
    rechazarTarea,
    validarCompra,
    rechazarCompra,
    validarGasto,
    rechazarGasto,
    recargarDatos,
  } = useAuth();

  const [refreshing, setRefreshing] = useState(false);
  const [memberToEdit, setMemberToEdit] = useState<MiembroHogar | null>(null);
  const [editRol, setEditRol] = useState<RolMiembro>('MIEMBRO');
  const [editPuedeValidar, setEditPuedeValidar] = useState(true);
  const [editPuedeCrearTareas, setEditPuedeCrearTareas] = useState(true);
  const [editPuedeCompras, setEditPuedeCompras] = useState(true);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await recargarDatos();
    } finally {
      setRefreshing(false);
    }
  };

  const getDisponibilidadBadge = (disp: NivelDisponibilidad) => {
    switch (disp) {
      case 'ALTA':
        return { label: 'Disponibilidad Alta', bg: colors.success + '22', text: colors.success };
      case 'MEDIA':
        return { label: 'Disponibilidad Media', bg: colors.warning + '22', text: colors.warning };
      case 'BAJA':
      default:
        return { label: 'Disponibilidad Baja', bg: colors.danger + '22', text: colors.danger };
    }
  };

  const getIniciales = (nombre: string) =>
    nombre
      .split(' ')
      .map((p) => p[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();

  const formatearCLP = (valor: number) =>
    '$' + valor.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  const miembros = hogar?.miembros ?? [];

  const tareasPorValidar = tareas.filter(
    (t) => t.estado === 'POR_VALIDAR' || t.estado === 'PROPUESTA',
  );
  const comprasPorValidar = compras.filter(
    (c) =>
      c.estado_validacion === 'PENDIENTE_APROBACION' ||
      c.estado_validacion === 'COMPRA_POR_VALIDAR',
  );
  const gastosPorValidar = gastos.filter(
    (g) => g.estado_validacion === 'PENDIENTE_APROBACION',
  );

  const handleToggleTipoHogar = () => {
    if (!esJefeDeHogar || !hogar) return;
    const nuevoTipo = hogar.tipo_hogar === 'JEFE_DE_HOGAR' ? 'COLABORATIVO' : 'JEFE_DE_HOGAR';
    Alert.alert(
      'Cambiar Modo del Hogar',
      nuevoTipo === 'JEFE_DE_HOGAR'
        ? '¿Cambiar a modo "Con Jefe de Hogar"? Los integrantes deberán enviar sus tareas, compras y gastos para que tú los valides.'
        : '¿Cambiar a modo "Colaborativo"? Todos los integrantes tendrán permisos directos para anotar y completar.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cambiar Modo',
          onPress: async () => {
            try {
              await cambiarTipoHogar(nuevoTipo);
            } catch (e: any) {
              Alert.alert('Error', e?.message || 'No se pudo cambiar el tipo de hogar');
            }
          },
        },
      ],
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
      >
        {/* Encabezado de Sección + Código */}
        <View style={styles.sectionTopRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.homeTag, { color: colors.secondary }]}>
              {esHogarConJefe ? 'MODO JEFE DE HOGAR' : 'MODO COLABORATIVO'}
            </Text>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Diario Mural</Text>
          </View>

          {hogar?.codigo_invitacion && (
            <View style={[styles.codePill, { backgroundColor: colors.softBg, borderColor: colors.border }]}>
              <Ionicons name="key-outline" size={15} color={colors.primary} />
              <Text style={[styles.codeText, { color: colors.primary }]}>{hogar.codigo_invitacion}</Text>
            </View>
          )}
        </View>

        {/* Tarjeta Informativa del Tipo de Hogar y Rol Actual */}
        <View
          style={[
            styles.modeBanner,
            {
              backgroundColor: esHogarConJefe ? colors.warning + '16' : colors.primary + '14',
              borderColor: esHogarConJefe ? colors.warning + '66' : colors.primary + '55',
            },
          ]}
        >
          <Ionicons
            name={esHogarConJefe ? 'shield-checkmark' : 'people'}
            size={22}
            color={esHogarConJefe ? colors.warning : colors.primary}
          />
          <View style={{ flex: 1 }}>
            <Text style={[styles.modeBannerTitle, { color: colors.textPrimary }]}>
              {esHogarConJefe
                ? esJefeDeHogar
                  ? 'Eres el Jefe de Hogar'
                  : 'Hogar supervisado por Jefe de Hogar'
                : 'Hogar Colaborativo (Permisos iguales)'}
            </Text>
            <Text style={[styles.modeBannerSub, { color: colors.textSecondary }]}>
              {esHogarConJefe
                ? esJefeDeHogar
                  ? 'Aprueba o rechaza lo que registran y completan los demás integrantes.'
                  : 'Tus tareas hechas, compras y gastos quedan sujetos a validación del Jefe de Hogar.'
                : 'Todos los miembros pueden anotar tareas, compras, gastos y completar directo.'}
            </Text>
          </View>
          {esJefeDeHogar && (
            <Pressable
              onPress={handleToggleTipoHogar}
              style={[styles.modeSwitchBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <Ionicons name="swap-horizontal" size={14} color={colors.primary} />
              <Text style={[styles.modeSwitchText, { color: colors.primary }]}>Modo</Text>
            </Pressable>
          )}
        </View>

        {/* ACCESO RÁPIDO A MIS CASAS EN LA PANTALLA DE INICIO */}
        {misHogares.length > 0 && (
          <View style={styles.quickAccessBlock}>
            <View style={styles.quickAccessHeader}>
              <Text style={[styles.quickAccessTitle, { color: colors.textPrimary }]}>
                Acceso Rápido a tus Casas ({misHogares.length})
              </Text>
              <Pressable onPress={() => navigation.navigate('InicioHogares')}>
                <Text style={[styles.quickAccessLink, { color: colors.primary }]}>Ver todas / + Casa</Text>
              </Pressable>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.quickCardsRow}
            >
              {misHogares.map((c) => {
                const activa = c.id_hogar === hogar?.id_hogar;
                return (
                  <Pressable
                    key={c.id_hogar}
                    onPress={() => {
                      if (!activa) seleccionarHogar(c.id_hogar);
                    }}
                    style={[
                      styles.quickCasaCard,
                      {
                        backgroundColor: activa ? colors.primary : colors.card,
                        borderColor: activa ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <View style={styles.quickCasaTop}>
                      <Ionicons
                        name={c.tipo_hogar === 'JEFE_DE_HOGAR' ? 'shield-checkmark' : 'home'}
                        size={16}
                        color={activa ? '#FFFFFF' : colors.primary}
                      />
                      <Text
                        style={[
                          styles.quickCasaCode,
                          { color: activa ? '#FFFFFFCC' : colors.textSecondary },
                        ]}
                      >
                        {c.codigo_invitacion}
                      </Text>
                    </View>
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.quickCasaName,
                        { color: activa ? '#FFFFFF' : colors.textPrimary },
                      ]}
                    >
                      {c.nombre}
                    </Text>
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.quickCasaRole,
                        { color: activa ? '#FFFFFFDD' : colors.textSecondary },
                      ]}
                    >
                      {c.mi_rol === 'ADMINISTRADOR' ? 'Jefe de Hogar' : 'Integrante'}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* CENTRO DE VALIDACIONES DEL JEFE DE HOGAR */}
        {validacionesPendientesCount > 0 && (
          <AppCard
            style={{
              ...styles.validationCenterCard,
              borderColor: colors.warning,
              borderWidth: 1.5,
            }}
          >
            <View style={styles.valHeaderRow}>
              <View style={[styles.valBadgeIcon, { backgroundColor: colors.warning + '25' }]}>
                <Ionicons name="checkmark-done-circle" size={22} color={colors.warning} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.valTitle, { color: colors.textPrimary }]}>
                  {esJefeDeHogar
                    ? `Por Validar (${validacionesPendientesCount})`
                    : `Pendientes del Jefe de Hogar (${validacionesPendientesCount})`}
                </Text>
                <Text style={[styles.valSubtitle, { color: colors.textSecondary }]}>
                  {esJefeDeHogar
                    ? 'Revisa y aprueba las acciones realizadas por los integrantes'
                    : 'El Jefe de Hogar revisará estos registros pronto'}
                </Text>
              </View>
            </View>

            {/* Tareas por validar / propuestas */}
            {tareasPorValidar.map((t) => (
              <View key={`t-${t.id_tarea}`} style={[styles.valItemRow, { borderTopColor: colors.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.valItemLabel, { color: colors.primary }]}>
                    {t.estado === 'PROPUESTA' ? 'TAREA PROPUESTA' : `TAREA HECHA (+${t.puntos} pts)`}
                  </Text>
                  <Text style={[styles.valItemTitle, { color: colors.textPrimary }]}>{t.titulo}</Text>
                  <Text style={[styles.valItemMeta, { color: colors.textSecondary }]}>
                    {t.estado === 'PROPUESTA'
                      ? `Propuesta por ${t.creador?.nombre ?? 'Integrante'}`
                      : `Realizada por ${t.completador?.nombre ?? t.asignado?.nombre ?? 'Integrante'}`}
                  </Text>
                </View>
                {esJefeDeHogar && (
                  <View style={styles.valBtns}>
                    <Pressable
                      onPress={() => validarTarea(t.id_tarea)}
                      style={[styles.approveMiniBtn, { backgroundColor: colors.success }]}
                    >
                      <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                    </Pressable>
                    <Pressable
                      onPress={() => rechazarTarea(t.id_tarea)}
                      style={[styles.rejectMiniBtn, { backgroundColor: colors.danger + '20' }]}
                    >
                      <Ionicons name="close" size={16} color={colors.danger} />
                    </Pressable>
                  </View>
                )}
              </View>
            ))}

            {/* Compras por validar */}
            {comprasPorValidar.map((c) => (
              <View key={`c-${c.id_item}`} style={[styles.valItemRow, { borderTopColor: colors.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.valItemLabel, { color: colors.secondary }]}>
                    {c.estado_validacion === 'PENDIENTE_APROBACION'
                      ? 'SOLICITUD DE COMPRA'
                      : 'COMPRA REALIZADA'}
                  </Text>
                  <Text style={[styles.valItemTitle, { color: colors.textPrimary }]}>
                    {c.nombre} ({c.cantidad})
                  </Text>
                  <Text style={[styles.valItemMeta, { color: colors.textSecondary }]}>
                    Por {c.comprador?.nombre ?? c.creador?.nombre ?? 'Integrante'}
                  </Text>
                </View>
                {esJefeDeHogar && (
                  <View style={styles.valBtns}>
                    <Pressable
                      onPress={() => validarCompra(c.id_item)}
                      style={[styles.approveMiniBtn, { backgroundColor: colors.success }]}
                    >
                      <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                    </Pressable>
                    <Pressable
                      onPress={() => rechazarCompra(c.id_item)}
                      style={[styles.rejectMiniBtn, { backgroundColor: colors.danger + '20' }]}
                    >
                      <Ionicons name="close" size={16} color={colors.danger} />
                    </Pressable>
                  </View>
                )}
              </View>
            ))}

            {/* Gastos por validar */}
            {gastosPorValidar.map((g) => (
              <View key={`g-${g.id_gasto}`} style={[styles.valItemRow, { borderTopColor: colors.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.valItemLabel, { color: colors.warning }]}>
                    GASTO POR VALIDAR • {formatearCLP(g.monto)}
                  </Text>
                  <Text style={[styles.valItemTitle, { color: colors.textPrimary }]}>{g.concepto}</Text>
                  <Text style={[styles.valItemMeta, { color: colors.textSecondary }]}>
                    Registrado por {g.registrador?.nombre ?? 'Integrante'}
                  </Text>
                </View>
                {esJefeDeHogar && (
                  <View style={styles.valBtns}>
                    <Pressable
                      onPress={() => validarGasto(g.id_gasto)}
                      style={[styles.approveMiniBtn, { backgroundColor: colors.success }]}
                    >
                      <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                    </Pressable>
                    <Pressable
                      onPress={() => rechazarGasto(g.id_gasto)}
                      style={[styles.rejectMiniBtn, { backgroundColor: colors.danger + '20' }]}
                    >
                      <Ionicons name="close" size={16} color={colors.danger} />
                    </Pressable>
                  </View>
                )}
              </View>
            ))}
          </AppCard>
        )}

        {/* Gráfica Central de Progreso */}
        <ChartProgress data={progreso} />

        {/* Lista de Miembros de la Casa */}
        <View style={styles.membersSection}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Integrantes de la Casa
            </Text>
            <Text style={[styles.memberCount, { color: colors.textSecondary }]}>
              {miembros.length} miembros
            </Text>
          </View>

          <FlatList
            data={miembros}
            keyExtractor={(item) => String(item.id_miembro)}
            scrollEnabled={false}
            renderItem={({ item }) => {
              const badge = getDisponibilidadBadge(item.usuario.disponibilidad);
              const isAdmin = item.rol === 'ADMINISTRADOR';
              const validaEfectivo = !esHogarConJefe || isAdmin || item.puede_validar_tareas === true;
              const creaEfectivo = !esHogarConJefe || isAdmin || item.puede_crear_tareas === true;

              return (
                <AppCard style={styles.memberCard}>
                  <View style={styles.memberRow}>
                    <View
                      style={[
                        styles.avatar,
                        { backgroundColor: isAdmin ? colors.primary : colors.secondary },
                      ]}
                    >
                      <Text style={[styles.avatarText, { color: '#FFFFFF' }]}>
                        {getIniciales(item.usuario.nombre)}
                      </Text>
                    </View>

                    <View style={styles.memberInfo}>
                      <View style={styles.nameRow}>
                        <Text style={[styles.memberName, { color: colors.textPrimary }]}>
                          {item.usuario.nombre}
                          {item.id_usuario === usuario?.id_usuario ? ' (Tú)' : ''}
                        </Text>
                        <View
                          style={[
                            styles.rolePill,
                            {
                              backgroundColor: isAdmin ? colors.primary + '22' : colors.softBg,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.rolePillText,
                              { color: isAdmin ? colors.primary : colors.textSecondary },
                            ]}
                          >
                            {isAdmin ? 'Jefe de Hogar' : 'Integrante'}
                          </Text>
                        </View>
                      </View>

                      <Text style={[styles.memberRole, { color: colors.textSecondary }]}>
                        {item.puntos_acumulados} pts acumulados
                      </Text>

                      <View style={[styles.dispBadge, { backgroundColor: badge.bg }]}>
                        <View style={[styles.dispDot, { backgroundColor: badge.text }]} />
                        <Text style={[styles.dispText, { color: badge.text }]}>
                          {badge.label}
                          {item.usuario.descripcion_carga ? ` (${item.usuario.descripcion_carga})` : ''}
                        </Text>
                      </View>

                      {/* Permisos diferenciados */}
                      <View style={styles.permRow}>
                        <View
                          style={[
                            styles.permBadge,
                            {
                              backgroundColor: validaEfectivo
                                ? colors.success + '20'
                                : colors.warning + '22',
                            },
                          ]}
                        >
                          <Ionicons
                            name={validaEfectivo ? 'checkmark-circle' : 'shield-outline'}
                            size={12}
                            color={validaEfectivo ? colors.success : colors.warning}
                          />
                          <Text
                            style={[
                              styles.permText,
                              { color: validaEfectivo ? colors.success : colors.warning },
                            ]}
                          >
                            {validaEfectivo ? 'Valida directo' : 'Requiere Jefe'}
                          </Text>
                        </View>

                        <View
                          style={[
                            styles.permBadge,
                            {
                              backgroundColor: creaEfectivo
                                ? colors.primary + '18'
                                : colors.softBg,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.permText,
                              { color: creaEfectivo ? colors.primary : colors.textSecondary },
                            ]}
                          >
                            {creaEfectivo ? 'Anota directo' : 'Propone'}
                          </Text>
                        </View>

                        {esJefeDeHogar && (
                          <Pressable
                            onPress={() => {
                              setMemberToEdit(item);
                              setEditRol(item.rol);
                              setEditPuedeValidar(item.puede_validar_tareas !== false);
                              setEditPuedeCrearTareas(item.puede_crear_tareas !== false);
                              setEditPuedeCompras(item.puede_gestionar_compras !== false);
                            }}
                            style={[styles.editPermBtn, { backgroundColor: colors.softBg }]}
                          >
                            <Ionicons name="options-outline" size={12} color={colors.primary} />
                            <Text style={[styles.editPermText, { color: colors.primary }]}>Permisos</Text>
                          </Pressable>
                        )}
                      </View>
                    </View>
                  </View>
                </AppCard>
              );
            }}
          />
        </View>

        {/* Botón Inferior: Añadir / Invitar Miembro */}
        {esJefeDeHogar && (
          <View style={styles.footer}>
            <AppButton
              title="Añadir / Configurar Invitación"
              icon="person-add-outline"
              onPress={() => navigation.navigate('AddMember')}
              variant="primary"
            />
          </View>
        )}
      </ScrollView>

      {/* Modal Editar Permisos y Rol de Integrante */}
      <Modal
        visible={memberToEdit !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setMemberToEdit(null)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                Permisos: {memberToEdit?.usuario.nombre}
              </Text>
              <Pressable
                onPress={() => setMemberToEdit(null)}
                style={[styles.closeBtn, { backgroundColor: colors.softBg }]}
              >
                <Ionicons name="close" size={20} color={colors.textPrimary} />
              </Pressable>
            </View>

            <Text style={[styles.dispTitle, { color: colors.textPrimary }]}>Rol en el Hogar:</Text>
            <View style={styles.roleRow}>
              <Pressable
                onPress={() => {
                  setEditRol('MIEMBRO');
                  if (esHogarConJefe) {
                    setEditPuedeValidar(false);
                    setEditPuedeCrearTareas(false);
                    setEditPuedeCompras(false);
                  }
                }}
                style={[
                  styles.roleOption,
                  {
                    backgroundColor: editRol === 'MIEMBRO' ? colors.primary : colors.card,
                    borderColor: editRol === 'MIEMBRO' ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.roleOptionText,
                    { color: editRol === 'MIEMBRO' ? '#FFFFFF' : colors.textPrimary },
                  ]}
                >
                  Integrante (Hijo/Miembro)
                </Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  setEditRol('ADMINISTRADOR');
                  setEditPuedeValidar(true);
                  setEditPuedeCrearTareas(true);
                  setEditPuedeCompras(true);
                }}
                style={[
                  styles.roleOption,
                  {
                    backgroundColor: editRol === 'ADMINISTRADOR' ? colors.primary : colors.card,
                    borderColor: editRol === 'ADMINISTRADOR' ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.roleOptionText,
                    { color: editRol === 'ADMINISTRADOR' ? '#FFFFFF' : colors.textPrimary },
                  ]}
                >
                  Jefe de Hogar
                </Text>
              </Pressable>
            </View>

            <View style={{ marginTop: spacing.md }}>
              <View style={[styles.editSwitchRow, { borderColor: colors.border, backgroundColor: colors.softBg }]}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={[styles.switchTitle, { color: colors.textPrimary }]}>Validar tareas sin revisión</Text>
                  <Text style={[styles.switchSub, { color: colors.textSecondary }]}>
                    Completar tareas y sumar puntos inmediatamente
                  </Text>
                </View>
                <Switch
                  value={editRol === 'ADMINISTRADOR' ? true : editPuedeValidar}
                  disabled={editRol === 'ADMINISTRADOR'}
                  onValueChange={setEditPuedeValidar}
                  trackColor={{ false: colors.softBg, true: colors.secondary }}
                  thumbColor={editPuedeValidar ? colors.primary : '#FFFFFF'}
                />
              </View>

              <View style={[styles.editSwitchRow, { borderColor: colors.border, backgroundColor: colors.softBg }]}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={[styles.switchTitle, { color: colors.textPrimary }]}>Crear tareas directo</Text>
                  <Text style={[styles.switchSub, { color: colors.textSecondary }]}>
                    Si se desactiva, sus tareas entran como propuestas
                  </Text>
                </View>
                <Switch
                  value={editRol === 'ADMINISTRADOR' ? true : editPuedeCrearTareas}
                  disabled={editRol === 'ADMINISTRADOR'}
                  onValueChange={setEditPuedeCrearTareas}
                  trackColor={{ false: colors.softBg, true: colors.secondary }}
                  thumbColor={editPuedeCrearTareas ? colors.primary : '#FFFFFF'}
                />
              </View>

              <View style={[styles.editSwitchRow, { borderColor: colors.border, backgroundColor: colors.softBg }]}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={[styles.switchTitle, { color: colors.textPrimary }]}>Gestionar compras directo</Text>
                  <Text style={[styles.switchSub, { color: colors.textSecondary }]}>
                    Anotar y marcar compras sin esperar aprobación
                  </Text>
                </View>
                <Switch
                  value={editRol === 'ADMINISTRADOR' ? true : editPuedeCompras}
                  disabled={editRol === 'ADMINISTRADOR'}
                  onValueChange={setEditPuedeCompras}
                  trackColor={{ false: colors.softBg, true: colors.secondary }}
                  thumbColor={editPuedeCompras ? colors.primary : '#FFFFFF'}
                />
              </View>
            </View>

            <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
              <AppButton
                title="Guardar Permisos"
                icon="checkmark-outline"
                onPress={async () => {
                  if (memberToEdit) {
                    await cambiarPermisosMiembro(memberToEdit.id_miembro, {
                      rol: editRol,
                      puede_validar_tareas: editRol === 'ADMINISTRADOR' ? true : editPuedeValidar,
                      puede_crear_tareas: editRol === 'ADMINISTRADOR' ? true : editPuedeCrearTareas,
                      puede_gestionar_compras: editRol === 'ADMINISTRADOR' ? true : editPuedeCompras,
                    });
                    setMemberToEdit(null);
                  }
                }}
              />

              {memberToEdit && memberToEdit.id_usuario !== usuario?.id_usuario && (
                <AppButton
                  title="Quitar del Hogar"
                  variant="ghost"
                  icon="person-remove-outline"
                  onPress={() => {
                    const target = memberToEdit;
                    Alert.alert(
                      'Quitar integrante',
                      `¿Quitar a ${target.usuario.nombre} de este hogar?`,
                      [
                        { text: 'Cancelar', style: 'cancel' },
                        {
                          text: 'Quitar',
                          style: 'destructive',
                          onPress: async () => {
                            setMemberToEdit(null);
                            await eliminarMiembroHogar(target.id_miembro);
                          },
                        },
                      ],
                    );
                  }}
                />
              )}
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
    padding: spacing.lg,
    paddingBottom: 36,
  },
  sectionTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  homeTag: {
    fontFamily: fonts.bold,
    fontSize: 11,
    letterSpacing: 0.8,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 22,
    marginTop: 1,
  },
  codePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  codeText: {
    fontFamily: fonts.bold,
    fontSize: 13,
    letterSpacing: 1,
  },
  modeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  modeBannerTitle: {
    fontFamily: fonts.bold,
    fontSize: 13,
  },
  modeBannerSub: {
    fontFamily: fonts.regular,
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  modeSwitchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  modeSwitchText: {
    fontFamily: fonts.semibold,
    fontSize: 11,
  },
  quickAccessBlock: {
    marginBottom: spacing.md,
  },
  quickAccessHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickAccessTitle: {
    fontFamily: fonts.bold,
    fontSize: 14,
  },
  quickAccessLink: {
    fontFamily: fonts.semibold,
    fontSize: 12,
  },
  quickCardsRow: {
    gap: 10,
  },
  quickCasaCard: {
    width: 148,
    padding: 10,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  quickCasaTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  quickCasaCode: {
    fontFamily: fonts.bold,
    fontSize: 10,
  },
  quickCasaName: {
    fontFamily: fonts.bold,
    fontSize: 13,
  },
  quickCasaRole: {
    fontFamily: fonts.regular,
    fontSize: 11,
    marginTop: 2,
  },
  validationCenterCard: {
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  valHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  valBadgeIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valTitle: {
    fontFamily: fonts.bold,
    fontSize: 15,
  },
  valSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 11,
  },
  valItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    marginTop: 8,
    borderTopWidth: 1,
    gap: 10,
  },
  valItemLabel: {
    fontFamily: fonts.bold,
    fontSize: 10,
    letterSpacing: 0.4,
  },
  valItemTitle: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    marginTop: 1,
  },
  valItemMeta: {
    fontFamily: fonts.regular,
    fontSize: 11,
  },
  valBtns: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  approveMiniBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectMiniBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  membersSection: {
    marginTop: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: 17,
  },
  memberCount: {
    fontFamily: fonts.regular,
    fontSize: 13,
  },
  memberCard: {
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  avatarText: {
    fontFamily: fonts.bold,
    fontSize: 15,
  },
  memberInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  memberName: {
    fontFamily: fonts.semibold,
    fontSize: 15,
  },
  rolePill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  rolePillText: {
    fontFamily: fonts.bold,
    fontSize: 10,
  },
  memberRole: {
    fontFamily: fonts.regular,
    fontSize: 12,
    marginTop: 2,
  },
  dispBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    marginTop: 6,
  },
  dispDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dispText: {
    fontFamily: fonts.medium,
    fontSize: 11,
  },
  permRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  permBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  permText: {
    fontFamily: fonts.medium,
    fontSize: 11,
  },
  editPermBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  editPermText: {
    fontFamily: fonts.semibold,
    fontSize: 11,
  },
  footer: {
    marginTop: spacing.md,
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
    fontSize: 17,
    flex: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dispTitle: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    marginBottom: 6,
  },
  roleRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  roleOption: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
  },
  roleOptionText: {
    fontFamily: fonts.bold,
    fontSize: 12,
    textAlign: 'center',
  },
  editSwitchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  switchTitle: {
    fontFamily: fonts.semibold,
    fontSize: 13,
  },
  switchSub: {
    fontFamily: fonts.regular,
    fontSize: 11,
    marginTop: 1,
  },
});
