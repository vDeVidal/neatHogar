import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Alert, AppState } from 'react-native';
import {
  api,
  clearApiSession,
  getApiToken,
  initApi,
  setActiveHogarId,
} from '../services/api';
import {
  MOCK_CATEGORIAS,
  MOCK_GASTOS,
  MOCK_HOGAR,
  MOCK_ITEMS_COMPRA,
  MOCK_MIS_HOGARES,
  MOCK_PARTICIPACION,
  MOCK_PROGRESO_DIAS,
  MOCK_TAREAS,
  MOCK_USUARIOS,
} from '../services/mockData';
import { useTheme } from '../theme/ThemeContext';
import {
  Categoria,
  Gasto,
  HogarDetalle,
  HogarResumen,
  ItemCompra,
  MiembroHogar,
  MiembroParticipacion,
  ProgresoDia,
  RolMiembro,
  Tarea,
  TipoHogar,
  Usuario,
} from '../types';

interface AuthContextValue {
  usuario: Usuario | null;
  hogar: HogarDetalle | null;
  misHogares: HogarResumen[];
  rol: RolMiembro | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isDemoMode: boolean;

  // Colecciones reactivas del hogar activo
  tareas: Tarea[];
  compras: ItemCompra[];
  gastos: Gasto[];
  categorias: Categoria[];
  participacion: MiembroParticipacion[];
  progreso: ProgresoDia[];

  // Rol y permisos diferenciados según Tipo de Hogar
  miembroActual: MiembroHogar | null;
  esJefeDeHogar: boolean;
  esHogarConJefe: boolean;
  puedeValidarTareas: boolean;
  puedeCrearTareasDirecto: boolean;
  puedeGestionarComprasDirecto: boolean;
  validacionesPendientesCount: number;

  // Acciones de cuentas sencillas (Nombre + PIN) y tradicionales
  loginConPin: (nombre: string, pin: string, codigoInvitacion?: string) => Promise<void>;
  registroConPin: (nombre: string, pin: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  registro: (nombre: string, email: string, password: string, pin?: string) => Promise<void>;
  logout: () => Promise<void>;

  // Multi-Hogar
  crearHogar: (params: {
    nombreHogar: string;
    tipoHogar: TipoHogar;
    nombreCreador?: string;
    pinCreador?: string;
  }) => Promise<void>;
  unirseHogar: (params: {
    codigo: string;
    nombreMiembro?: string;
    pinMiembro?: string;
  }) => Promise<void>;
  seleccionarHogar: (id_hogar: number) => Promise<void>;
  salirHogarActual: () => Promise<void>;
  cambiarTipoHogar: (tipo: TipoHogar) => Promise<void>;
  activarModoDemo: () => void;
  recargarDatos: () => Promise<void>;

  // Acciones Tareas (con flujo de validación Jefe de Hogar)
  toggleTarea: (id_tarea: number) => Promise<void>;
  validarTarea: (id_tarea: number) => Promise<void>;
  rechazarTarea: (id_tarea: number) => Promise<void>;
  agregarTarea: (dto: {
    titulo: string;
    descripcion?: string;
    id_asignado?: number | null;
    id_categoria?: number | null;
    puntos?: number;
    fecha_limite?: string;
  }) => Promise<Tarea | void>;
  eliminarTarea: (id_tarea: number) => Promise<void>;

  // Acciones Compras (con flujo de validación Jefe de Hogar)
  toggleCompra: (id_item: number) => Promise<void>;
  validarCompra: (id_item: number) => Promise<void>;
  rechazarCompra: (id_item: number) => Promise<void>;
  agregarCompra: (dto: { nombre: string; cantidad?: string; id_categoria?: number | null }) => Promise<void>;
  eliminarCompra: (id_item: number) => Promise<void>;
  limpiarComprados: () => Promise<void>;
  agregarCategoriaCompra: (nombre: string) => Promise<void>;

  // Acciones Gastos (con flujo de validación Jefe de Hogar)
  agregarGasto: (dto: { concepto: string; monto: number }) => Promise<void>;
  validarGasto: (id_gasto: number) => Promise<void>;
  rechazarGasto: (id_gasto: number) => Promise<void>;
  eliminarGasto: (id_gasto: number) => Promise<void>;

  // Perfil y Gestión de Miembros
  actualizarDisponibilidad: (disp: 'ALTA' | 'MEDIA' | 'BAJA', desc?: string) => Promise<void>;
  actualizarPinPerfil: (nuevoPin: string) => Promise<void>;
  invitarMiembro: (
    rol: RolMiembro,
    opciones?: {
      puede_validar_tareas?: boolean;
      puede_crear_tareas?: boolean;
      puede_gestionar_compras?: boolean;
      email?: string;
      nombre?: string;
    },
  ) => Promise<{ codigo_invitacion: string }>;
  cambiarPermisosMiembro: (
    id_miembro: number,
    permisos: {
      rol?: RolMiembro;
      puede_validar_tareas?: boolean;
      puede_crear_tareas?: boolean;
      puede_gestionar_compras?: boolean;
    },
  ) => Promise<void>;
  eliminarMiembroHogar: (id_miembro: number) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { applyRemoteTheme, registerSync } = useTheme();

  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [hogar, setHogar] = useState<HogarDetalle | null>(null);
  const [misHogares, setMisHogares] = useState<HogarResumen[]>([]);
  const [rol, setRol] = useState<RolMiembro | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(false);

  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [compras, setCompras] = useState<ItemCompra[]>([]);
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>(MOCK_CATEGORIAS);
  const [participacion, setParticipacion] = useState<MiembroParticipacion[]>([]);
  const [progreso, setProgreso] = useState<ProgresoDia[]>([]);

  // Sincronización de tema con backend
  useEffect(() => {
    registerSync(async (temaId) => {
      if (getApiToken() && !isDemoMode) {
        try {
          await api.updatePerfil({ tema_preferido: temaId });
        } catch {
          // Mantener tema local
        }
      }
    });
    return () => registerSync(null);
  }, [registerSync, isDemoMode]);

  const limpiarEstadoLocal = useCallback(() => {
    setUsuario(null);
    setHogar(null);
    setMisHogares([]);
    setRol(null);
    setIsDemoMode(false);
    setTareas([]);
    setCompras([]);
    setGastos([]);
    setParticipacion([]);
    setProgreso([]);
  }, []);

  const cargarColeccionesHogar = useCallback(async () => {
    if (!getApiToken() || isDemoMode) return;
    const [tareasRes, comprasRes, gastosRes, catRes, partRes, progRes] = await Promise.allSettled([
      api.getTareas(),
      api.getCompras(),
      api.getGastos(),
      api.getCategorias(),
      api.getParticipacion(),
      api.getProgreso(7),
    ]);

    if (tareasRes.status === 'fulfilled') setTareas(tareasRes.value);
    if (comprasRes.status === 'fulfilled') setCompras(comprasRes.value);
    if (gastosRes.status === 'fulfilled') setGastos(gastosRes.value);
    if (catRes.status === 'fulfilled') setCategorias(catRes.value);
    if (partRes.status === 'fulfilled') setParticipacion(partRes.value);
    if (progRes.status === 'fulfilled') setProgreso(progRes.value);
  }, [isDemoMode]);

  const recargarDatos = useCallback(async () => {
    if (!getApiToken() || isDemoMode) return;
    try {
      const perfil = await api.getPerfil();
      setUsuario(perfil.usuario);
      setMisHogares(perfil.hogares ?? []);

      if (perfil.hogar) {
        await setActiveHogarId(perfil.hogar.id_hogar);
        setHogar(perfil.hogar);
        setRol(perfil.hogar.mi_rol ?? perfil.rol);
        await cargarColeccionesHogar();
      } else {
        await setActiveHogarId(null);
        setHogar(null);
        setRol(null);
        setTareas([]);
        setCompras([]);
        setGastos([]);
        setParticipacion([]);
        setProgreso([]);
      }
    } catch (e: any) {
      if (e?.status === 401) {
        await clearApiSession();
        limpiarEstadoLocal();
      }
    }
  }, [isDemoMode, cargarColeccionesHogar, limpiarEstadoLocal]);

  // Inicialización al arrancar la app
  useEffect(() => {
    (async () => {
      try {
        await initApi();
        const token = getApiToken();
        if (token) {
          const perfil = await api.getPerfil();
          setUsuario(perfil.usuario);
          setMisHogares(perfil.hogares ?? []);
          if (perfil.usuario.tema_preferido) {
            applyRemoteTheme(perfil.usuario.tema_preferido);
          }
          if (perfil.hogar) {
            await setActiveHogarId(perfil.hogar.id_hogar);
            setHogar(perfil.hogar);
            setRol(perfil.hogar.mi_rol ?? perfil.rol);
            await cargarColeccionesHogar();
          } else {
            await setActiveHogarId(null);
            setHogar(null);
            setRol(null);
          }
        }
      } catch {
        // Si el token guardado ya no es válido o el usuario no existe, limpiar sesión
        await clearApiSession();
        limpiarEstadoLocal();
      } finally {
        setIsLoading(false);
      }
    })();
  }, [applyRemoteTheme, cargarColeccionesHogar, limpiarEstadoLocal]);

  // Auto-sincronización periódica para mantener 2 o más dispositivos/emuladores al día en vivo
  useEffect(() => {
    if (!usuario || isDemoMode || !getApiToken()) return;
    const interval = setInterval(() => {
      if (AppState.currentState === 'active') {
        recargarDatos().catch(() => undefined);
      }
    }, 4500);
    return () => clearInterval(interval);
  }, [usuario?.id_usuario, hogar?.id_hogar, isDemoMode, recargarDatos]);

  const aplicarRespuestaAuth = useCallback(
    async (res: {
      usuario: Usuario;
      hogar: HogarDetalle | null;
      rol: RolMiembro | null;
      hogares?: HogarResumen[];
    }) => {
      setIsDemoMode(false);
      setUsuario(res.usuario);
      if (res.usuario.tema_preferido) {
        applyRemoteTheme(res.usuario.tema_preferido);
      }
      const lista = res.hogares ?? (await api.getMisHogares().catch(() => []));
      setMisHogares(lista);

      if (res.hogar) {
        await setActiveHogarId(res.hogar.id_hogar);
        setHogar(res.hogar);
        setRol(res.hogar.mi_rol ?? res.rol);
        await cargarColeccionesHogar();
      } else {
        await setActiveHogarId(null);
        setHogar(null);
        setRol(null);
        setTareas([]);
        setCompras([]);
        setGastos([]);
        setParticipacion([]);
        setProgreso([]);
      }
    },
    [applyRemoteTheme, cargarColeccionesHogar],
  );

  // ───────────── Autenticación ─────────────

  const loginConPin = useCallback(
    async (nombre: string, pin: string, codigoInvitacion?: string) => {
      const res = await api.loginConPin({
        nombre: nombre.trim(),
        pin: pin.trim(),
        codigo_invitacion: codigoInvitacion?.trim() || undefined,
      });
      await aplicarRespuestaAuth(res);
    },
    [aplicarRespuestaAuth],
  );

  const registroConPin = useCallback(
    async (nombre: string, pin: string) => {
      const res = await api.registroConPin({
        nombre: nombre.trim(),
        pin: pin.trim(),
      });
      await aplicarRespuestaAuth(res);
    },
    [aplicarRespuestaAuth],
  );

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await api.login({ email: email.trim(), password });
      await aplicarRespuestaAuth(res);
    },
    [aplicarRespuestaAuth],
  );

  const registro = useCallback(
    async (nombre: string, email: string, password: string, pin?: string) => {
      const res = await api.registro({
        nombre: nombre.trim(),
        email: email.trim(),
        password,
        pin: pin?.trim() || undefined,
      });
      await aplicarRespuestaAuth(res);
    },
    [aplicarRespuestaAuth],
  );

  const logout = useCallback(async () => {
    await clearApiSession();
    limpiarEstadoLocal();
  }, [limpiarEstadoLocal]);

  const activarModoDemo = useCallback(() => {
    setIsDemoMode(true);
    setUsuario(MOCK_USUARIOS[0]);
    setHogar(MOCK_HOGAR);
    setMisHogares(MOCK_MIS_HOGARES);
    setRol('ADMINISTRADOR');
    setTareas(MOCK_TAREAS);
    setCompras(MOCK_ITEMS_COMPRA);
    setGastos(MOCK_GASTOS);
    setCategorias(MOCK_CATEGORIAS);
    setParticipacion(MOCK_PARTICIPACION);
    setProgreso(MOCK_PROGRESO_DIAS);
    applyRemoteTheme('noche_indigo');
  }, [applyRemoteTheme]);

  // ───────────── Multi-Hogar ─────────────

  const crearHogar = useCallback(
    async (params: {
      nombreHogar: string;
      tipoHogar: TipoHogar;
      nombreCreador?: string;
      pinCreador?: string;
    }) => {
      if (!usuario || !getApiToken() || isDemoMode) {
        if (!params.nombreCreador?.trim() || !params.pinCreador?.trim()) {
          throw new Error('Ingresa tu nombre y un PIN de 4 a 6 dígitos para crear tu cuenta.');
        }
        const resAuth = await api.accesoConPin({
          nombre: params.nombreCreador.trim(),
          pin: params.pinCreador.trim(),
        });
        setUsuario(resAuth.usuario);
        setIsDemoMode(false);
      }

      const nuevo = await api.crearHogar({
        nombre: params.nombreHogar.trim(),
        tipo_hogar: params.tipoHogar,
      });
      setHogar(nuevo);
      setRol('ADMINISTRADOR');
      const lista = await api.getMisHogares();
      setMisHogares(lista);
      await cargarColeccionesHogar();
    },
    [usuario, isDemoMode, cargarColeccionesHogar],
  );

  const unirseHogar = useCallback(
    async (params: { codigo: string; nombreMiembro?: string; pinMiembro?: string }) => {
      const codeClean = params.codigo.trim().toUpperCase();
      if (!usuario || !getApiToken() || isDemoMode) {
        if (!params.nombreMiembro?.trim() || !params.pinMiembro?.trim()) {
          throw new Error('Ingresa tu nombre y un PIN de 4 a 6 dígitos para identificarte.');
        }
        const resAuth = await api.accesoConPin({
          nombre: params.nombreMiembro.trim(),
          pin: params.pinMiembro.trim(),
        });
        setUsuario(resAuth.usuario);
        setIsDemoMode(false);
      }

      const unido = await api.unirseHogar({ codigo: codeClean, codigo_invitacion: codeClean });
      setHogar(unido);
      const miMembresia = unido.miembros.find((m) => m.id_usuario === (usuario?.id_usuario ?? unido.miembros[unido.miembros.length - 1]?.id_usuario));
      setRol(unido.mi_rol ?? miMembresia?.rol ?? 'MIEMBRO');
      const lista = await api.getMisHogares();
      setMisHogares(lista);
      await cargarColeccionesHogar();
    },
    [usuario, isDemoMode, cargarColeccionesHogar],
  );

  const seleccionarHogar = useCallback(
    async (id_hogar: number) => {
      if (isDemoMode) return;
      const detalle = await api.activarHogar(id_hogar);
      setHogar(detalle);
      setRol(detalle.mi_rol ?? 'MIEMBRO');
      const lista = await api.getMisHogares();
      setMisHogares(lista);
      await cargarColeccionesHogar();
    },
    [isDemoMode, cargarColeccionesHogar],
  );

  const salirHogarActual = useCallback(async () => {
    if (isDemoMode) {
      await logout();
      return;
    }
    await api.salirHogar();
    await recargarDatos();
  }, [isDemoMode, logout, recargarDatos]);

  const cambiarTipoHogar = useCallback(
    async (tipo: TipoHogar) => {
      if (isDemoMode) {
        setHogar((prev) => (prev ? { ...prev, tipo_hogar: tipo } : null));
        return;
      }
      const detalle = await api.actualizarTipoHogar(tipo);
      setHogar(detalle);
      const lista = await api.getMisHogares();
      setMisHogares(lista);
    },
    [isDemoMode],
  );

  // ───────────── Tareas ─────────────

  const toggleTarea = useCallback(
    async (id_tarea: number) => {
      const actual = tareas.find((t) => t.id_tarea === id_tarea);
      if (!actual) return;

      if (isDemoMode) {
        setTareas((prev) =>
          prev.map((t) =>
            t.id_tarea === id_tarea
              ? { ...t, estado: t.estado === 'COMPLETADA' ? 'PENDIENTE' : 'COMPLETADA' }
              : t,
          ),
        );
        return;
      }

      try {
        if (actual.estado === 'COMPLETADA' || actual.estado === 'POR_VALIDAR') {
          const esJefe = rol === 'ADMINISTRADOR' || hogar?.tipo_hogar === 'COLABORATIVO';
          if (actual.estado === 'POR_VALIDAR' && esJefe) {
            await api.validarTarea(id_tarea);
          } else {
            await api.reabrirTarea(id_tarea);
          }
        } else {
          await api.completarTarea(id_tarea);
        }
        await recargarDatos();
      } catch (e: any) {
        Alert.alert('Aviso', e?.message || 'No se pudo actualizar la tarea');
      }
    },
    [tareas, isDemoMode, rol, hogar?.tipo_hogar, recargarDatos],
  );

  const validarTarea = useCallback(
    async (id_tarea: number) => {
      if (isDemoMode) return;
      try {
        await api.validarTarea(id_tarea);
        await recargarDatos();
      } catch (e: any) {
        Alert.alert('Error', e?.message || 'No se pudo validar la tarea');
      }
    },
    [isDemoMode, recargarDatos],
  );

  const rechazarTarea = useCallback(
    async (id_tarea: number) => {
      if (isDemoMode) return;
      try {
        await api.rechazarTarea(id_tarea);
        await recargarDatos();
      } catch (e: any) {
        Alert.alert('Error', e?.message || 'No se pudo rechazar la tarea');
      }
    },
    [isDemoMode, recargarDatos],
  );

  const agregarTarea = useCallback(
    async (dto: {
      titulo: string;
      descripcion?: string;
      id_asignado?: number | null;
      id_categoria?: number | null;
      puntos?: number;
      fecha_limite?: string;
    }) => {
      if (isDemoMode) {
        const nuevaLocal: Tarea = {
          id_tarea: Date.now(),
          id_hogar: hogar?.id_hogar ?? 1,
          id_creador: usuario?.id_usuario ?? 1,
          id_asignado: dto.id_asignado ?? null,
          id_categoria: dto.id_categoria ?? null,
          titulo: dto.titulo,
          descripcion: dto.descripcion,
          puntos: dto.puntos ?? 10,
          estado: 'PENDIENTE',
          fecha_creacion: new Date().toISOString(),
          asignado: hogar?.miembros.find((m) => m.id_usuario === dto.id_asignado)?.usuario ?? null,
          creador: usuario ?? MOCK_USUARIOS[0],
          categoria: categorias.find((c) => c.id_categoria === dto.id_categoria) ?? null,
        };
        setTareas((prev) => [nuevaLocal, ...prev]);
        return nuevaLocal;
      }

      const nueva = await api.crearTarea(dto);
      await recargarDatos();
      return nueva;
    },
    [isDemoMode, hogar, usuario, categorias, recargarDatos],
  );

  const eliminarTarea = useCallback(
    async (id_tarea: number) => {
      if (isDemoMode) {
        setTareas((prev) => prev.filter((t) => t.id_tarea !== id_tarea));
        return;
      }
      try {
        await api.eliminarTarea(id_tarea);
        await recargarDatos();
      } catch (e: any) {
        Alert.alert('Error', e?.message || 'No se pudo eliminar la tarea');
      }
    },
    [isDemoMode, recargarDatos],
  );

  // ───────────── Compras ─────────────

  const toggleCompra = useCallback(
    async (id_item: number) => {
      if (isDemoMode) {
        setCompras((prev) =>
          prev.map((item) => (item.id_item === id_item ? { ...item, comprado: !item.comprado } : item)),
        );
        return;
      }
      try {
        await api.alternarCompra(id_item);
        await recargarDatos();
      } catch (e: any) {
        Alert.alert('Aviso', e?.message || 'No se pudo actualizar el producto');
      }
    },
    [isDemoMode, recargarDatos],
  );

  const validarCompra = useCallback(
    async (id_item: number) => {
      if (isDemoMode) return;
      try {
        await api.validarCompra(id_item);
        await recargarDatos();
      } catch (e: any) {
        Alert.alert('Error', e?.message || 'No se pudo validar el producto');
      }
    },
    [isDemoMode, recargarDatos],
  );

  const rechazarCompra = useCallback(
    async (id_item: number) => {
      if (isDemoMode) return;
      try {
        await api.rechazarCompra(id_item);
        await recargarDatos();
      } catch (e: any) {
        Alert.alert('Error', e?.message || 'No se pudo rechazar el producto');
      }
    },
    [isDemoMode, recargarDatos],
  );

  const agregarCompra = useCallback(
    async (dto: { nombre: string; cantidad?: string; id_categoria?: number | null }) => {
      if (isDemoMode) {
        const nuevoItem: ItemCompra = {
          id_item: Date.now(),
          id_hogar: hogar?.id_hogar ?? 1,
          id_creador: usuario?.id_usuario ?? 1,
          id_comprador: null,
          id_categoria: dto.id_categoria ?? null,
          nombre: dto.nombre,
          cantidad: dto.cantidad || '1',
          comprado: false,
          estado_validacion: 'APROBADO',
          fecha_creacion: new Date().toISOString(),
          creador: usuario ?? MOCK_USUARIOS[0],
          categoria: categorias.find((c) => c.id_categoria === dto.id_categoria) ?? null,
        };
        setCompras((prev) => [nuevoItem, ...prev]);
        return;
      }
      try {
        await api.crearCompra(dto);
        await recargarDatos();
      } catch (e: any) {
        Alert.alert('Error', e?.message || 'No se pudo agregar el producto');
      }
    },
    [isDemoMode, hogar, usuario, categorias, recargarDatos],
  );

  const eliminarCompra = useCallback(
    async (id_item: number) => {
      if (isDemoMode) {
        setCompras((prev) => prev.filter((i) => i.id_item !== id_item));
        return;
      }
      try {
        await api.eliminarCompra(id_item);
        await recargarDatos();
      } catch (e: any) {
        Alert.alert('Aviso', e?.message || 'No se pudo eliminar el producto');
      }
    },
    [isDemoMode, recargarDatos],
  );

  const limpiarComprados = useCallback(async () => {
    if (isDemoMode) {
      setCompras((prev) => prev.filter((i) => !i.comprado));
      return;
    }
    try {
      await api.limpiarComprasCompradas();
      await recargarDatos();
    } catch (e: any) {
      Alert.alert('Aviso', e?.message || 'No se pudo limpiar la lista');
    }
  }, [isDemoMode, recargarDatos]);

  const agregarCategoriaCompra = useCallback(
    async (nombre: string) => {
      if (isDemoMode) {
        setCategorias((prev) => [...prev, { id_categoria: Date.now(), nombre, tipo: 'COMPRA' }]);
        return;
      }
      const cat = await api.crearCategoria({ nombre, tipo: 'COMPRA' });
      setCategorias((prev) => (prev.some((c) => c.id_categoria === cat.id_categoria) ? prev : [...prev, cat]));
    },
    [isDemoMode],
  );

  // ───────────── Gastos ─────────────

  const agregarGasto = useCallback(
    async (dto: { concepto: string; monto: number }) => {
      if (isDemoMode) {
        const nuevoGasto: Gasto = {
          id_gasto: Date.now(),
          id_hogar: hogar?.id_hogar ?? 1,
          id_registrador: usuario?.id_usuario ?? 1,
          concepto: dto.concepto,
          monto: dto.monto,
          estado_validacion: 'APROBADO',
          fecha: new Date().toISOString(),
          registrador: usuario ?? MOCK_USUARIOS[0],
        };
        setGastos((prev) => [nuevoGasto, ...prev]);
        return;
      }
      await api.crearGasto(dto);
      await recargarDatos();
    },
    [isDemoMode, hogar, usuario, recargarDatos],
  );

  const validarGasto = useCallback(
    async (id_gasto: number) => {
      if (isDemoMode) return;
      try {
        await api.validarGasto(id_gasto);
        await recargarDatos();
      } catch (e: any) {
        Alert.alert('Error', e?.message || 'No se pudo validar el gasto');
      }
    },
    [isDemoMode, recargarDatos],
  );

  const rechazarGasto = useCallback(
    async (id_gasto: number) => {
      if (isDemoMode) return;
      try {
        await api.rechazarGasto(id_gasto);
        await recargarDatos();
      } catch (e: any) {
        Alert.alert('Error', e?.message || 'No se pudo rechazar el gasto');
      }
    },
    [isDemoMode, recargarDatos],
  );

  const eliminarGasto = useCallback(
    async (id_gasto: number) => {
      if (isDemoMode) {
        setGastos((prev) => prev.filter((g) => g.id_gasto !== id_gasto));
        return;
      }
      try {
        await api.eliminarGasto(id_gasto);
        await recargarDatos();
      } catch (e: any) {
        Alert.alert('Aviso', e?.message || 'No se pudo eliminar el gasto');
      }
    },
    [isDemoMode, recargarDatos],
  );

  // ───────────── Perfil y Miembros ─────────────

  const actualizarDisponibilidad = useCallback(
    async (disp: 'ALTA' | 'MEDIA' | 'BAJA', desc?: string) => {
      if (usuario) {
        setUsuario({ ...usuario, disponibilidad: disp, descripcion_carga: desc ?? usuario.descripcion_carga });
      }
      if (!isDemoMode && getApiToken()) {
        await api.updatePerfil({ disponibilidad: disp, descripcion_carga: desc }).catch(() => undefined);
        await recargarDatos();
      }
    },
    [usuario, isDemoMode, recargarDatos],
  );

  const actualizarPinPerfil = useCallback(
    async (nuevoPin: string) => {
      if (isDemoMode) return;
      await api.updatePerfil({ pin: nuevoPin.trim() });
    },
    [isDemoMode],
  );

  const invitarMiembro = useCallback(
    async (
      rolAsignado: RolMiembro,
      opciones?: {
        puede_validar_tareas?: boolean;
        puede_crear_tareas?: boolean;
        puede_gestionar_compras?: boolean;
        email?: string;
        nombre?: string;
      },
    ) => {
      if (!isDemoMode && getApiToken()) {
        const actualizado = await api.invitarMiembro({
          rol: rolAsignado,
          puede_validar_tareas: opciones?.puede_validar_tareas,
          puede_crear_tareas: opciones?.puede_crear_tareas,
          puede_gestionar_compras: opciones?.puede_gestionar_compras,
          email: opciones?.email,
          nombre: opciones?.nombre,
        });
        setHogar(actualizado);
        await recargarDatos();
        return { codigo_invitacion: actualizado.codigo_invitacion };
      }
      return { codigo_invitacion: hogar?.codigo_invitacion ?? 'DEMO01' };
    },
    [isDemoMode, hogar, recargarDatos],
  );

  const cambiarPermisosMiembro = useCallback(
    async (
      id_miembro: number,
      permisos: {
        rol?: RolMiembro;
        puede_validar_tareas?: boolean;
        puede_crear_tareas?: boolean;
        puede_gestionar_compras?: boolean;
      },
    ) => {
      if (!isDemoMode && getApiToken()) {
        const actualizado = await api.cambiarPermisosMiembro(id_miembro, permisos);
        setHogar(actualizado);
        await recargarDatos();
        return;
      }
      setHogar((prev) =>
        prev
          ? {
              ...prev,
              miembros: prev.miembros.map((m) => (m.id_miembro === id_miembro ? { ...m, ...permisos } : m)),
            }
          : null,
      );
    },
    [isDemoMode, recargarDatos],
  );

  const eliminarMiembroHogar = useCallback(
    async (id_miembro: number) => {
      if (!isDemoMode && getApiToken()) {
        const actualizado = await api.eliminarMiembro(id_miembro);
        setHogar(actualizado);
        await recargarDatos();
      }
    },
    [isDemoMode, recargarDatos],
  );

  // ───────────── Permisos derivados ─────────────

  const miembroActual = useMemo(
    () => hogar?.miembros.find((m) => m.id_usuario === usuario?.id_usuario) ?? null,
    [hogar, usuario],
  );

  const esJefeDeHogar = rol === 'ADMINISTRADOR' || miembroActual?.rol === 'ADMINISTRADOR';
  const esHogarConJefe = hogar?.tipo_hogar === 'JEFE_DE_HOGAR';

  const puedeValidarTareas = Boolean(
    !esHogarConJefe || esJefeDeHogar || miembroActual?.puede_validar_tareas === true,
  );
  const puedeCrearTareasDirecto = Boolean(
    !esHogarConJefe || esJefeDeHogar || miembroActual?.puede_crear_tareas === true,
  );
  const puedeGestionarComprasDirecto = Boolean(
    !esHogarConJefe || esJefeDeHogar || miembroActual?.puede_gestionar_compras === true,
  );

  const validacionesPendientesCount = useMemo(() => {
    const tCount = tareas.filter((t) => t.estado === 'POR_VALIDAR' || t.estado === 'PROPUESTA').length;
    const cCount = compras.filter(
      (c) => c.estado_validacion === 'PENDIENTE_APROBACION' || c.estado_validacion === 'COMPRA_POR_VALIDAR',
    ).length;
    const gCount = gastos.filter((g) => g.estado_validacion === 'PENDIENTE_APROBACION').length;
    return tCount + cCount + gCount;
  }, [tareas, compras, gastos]);

  const value: AuthContextValue = {
    usuario,
    hogar,
    misHogares,
    rol,
    isAuthenticated: Boolean(usuario),
    isLoading,
    isDemoMode,
    tareas,
    compras,
    gastos,
    categorias,
    participacion,
    progreso,
    miembroActual,
    esJefeDeHogar,
    esHogarConJefe,
    puedeValidarTareas,
    puedeCrearTareasDirecto,
    puedeGestionarComprasDirecto,
    validacionesPendientesCount,
    loginConPin,
    registroConPin,
    login,
    registro,
    logout,
    crearHogar,
    unirseHogar,
    seleccionarHogar,
    salirHogarActual,
    cambiarTipoHogar,
    activarModoDemo,
    recargarDatos,
    toggleTarea,
    validarTarea,
    rechazarTarea,
    agregarTarea,
    eliminarTarea,
    toggleCompra,
    validarCompra,
    rechazarCompra,
    agregarCompra,
    eliminarCompra,
    limpiarComprados,
    agregarCategoriaCompra,
    agregarGasto,
    validarGasto,
    rechazarGasto,
    eliminarGasto,
    actualizarDisponibilidad,
    actualizarPinPerfil,
    invitarMiembro,
    cambiarPermisosMiembro,
    eliminarMiembroHogar,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
