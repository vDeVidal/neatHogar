import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, getApiToken, initApi, setApiToken } from '../services/api';
import {
  MOCK_CATEGORIAS,
  MOCK_GASTOS,
  MOCK_HOGAR,
  MOCK_ITEMS_COMPRA,
  MOCK_PARTICIPACION,
  MOCK_PROGRESO_DIAS,
  MOCK_TAREAS,
  MOCK_USUARIOS,
} from '../services/mockData';
import { useTheme } from '../theme/ThemeContext';
import {
  AuthResponse,
  Categoria,
  Gasto,
  HogarDetalle,
  ItemCompra,
  MiembroParticipacion,
  ProgresoDia,
  RolMiembro,
  Tarea,
  Usuario,
} from '../types';

interface AuthContextValue {
  usuario: Usuario | null;
  hogar: HogarDetalle | null;
  rol: RolMiembro | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isDemoMode: boolean;

  // Colecciones reactivas
  tareas: Tarea[];
  compras: ItemCompra[];
  gastos: Gasto[];
  categorias: Categoria[];
  participacion: MiembroParticipacion[];
  progreso: ProgresoDia[];

  // Acciones de autenticación y vinculación
  login: (email: string, password: string) => Promise<void>;
  registro: (nombre: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  crearHogar: (nombre: string) => Promise<void>;
  unirseHogar: (codigo: string) => Promise<void>;
  activarModoDemo: () => void;
  recargarDatos: () => Promise<void>;

  // Acciones en vivo
  toggleTarea: (id_tarea: number) => Promise<void>;
  agregarTarea: (dto: { titulo: string; descripcion?: string; id_asignado?: number | null; id_categoria?: number | null; puntos?: number }) => Promise<void>;
  eliminarTarea: (id_tarea: number) => Promise<void>;

  toggleCompra: (id_item: number) => Promise<void>;
  agregarCompra: (dto: { nombre: string; cantidad?: string; id_categoria?: number | null }) => Promise<void>;
  eliminarCompra: (id_item: number) => Promise<void>;
  limpiarComprados: () => Promise<void>;

  agregarGasto: (dto: { concepto: string; monto: number }) => Promise<void>;
  eliminarGasto: (id_gasto: number) => Promise<void>;

  actualizarDisponibilidad: (disp: 'ALTA' | 'MEDIA' | 'BAJA', desc?: string) => Promise<void>;
  invitarMiembro: (rol: RolMiembro) => Promise<{ codigo_invitacion: string }>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { applyRemoteTheme, registerSync } = useTheme();

  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [hogar, setHogar] = useState<HogarDetalle | null>(null);
  const [rol, setRol] = useState<RolMiembro | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(false);

  // Estados reactivos locales
  const [tareas, setTareas] = useState<Tarea[]>(MOCK_TAREAS);
  const [compras, setCompras] = useState<ItemCompra[]>(MOCK_ITEMS_COMPRA);
  const [gastos, setGastos] = useState<Gasto[]>(MOCK_GASTOS);
  const [categorias, setCategorias] = useState<Categoria[]>(MOCK_CATEGORIAS);
  const [participacion, setParticipacion] = useState<MiembroParticipacion[]>(MOCK_PARTICIPACION);
  const [progreso, setProgreso] = useState<ProgresoDia[]>(MOCK_PROGRESO_DIAS);

  // Registrar sincronización de tema con el backend
  useEffect(() => {
    registerSync(async (temaId) => {
      if (getApiToken() && !isDemoMode) {
        try {
          await api.updatePerfil({ tema_preferido: temaId });
        } catch {
          // Si falla, se mantiene en memoria local
        }
      }
    });
    return () => registerSync(null);
  }, [registerSync, isDemoMode]);

  const recargarDatos = useCallback(async () => {
    if (!getApiToken() || isDemoMode) return;
    try {
      const [perfilRes, tareasRes, comprasRes, gastosRes, catRes, partRes, progRes] = await Promise.allSettled([
        api.getPerfil(),
        api.getTareas(),
        api.getCompras(),
        api.getGastos(),
        api.getCategorias(),
        api.getParticipacion(),
        api.getProgreso(7),
      ]);

      if (perfilRes.status === 'fulfilled') {
        setUsuario(perfilRes.value.usuario);
        setRol(perfilRes.value.rol);
        if (perfilRes.value.hogar) {
          try {
            const hDetalle = await api.getHogarActual();
            setHogar(hDetalle);
          } catch {
            setHogar(perfilRes.value.hogar as HogarDetalle);
          }
        } else {
          setHogar(null);
        }
      }
      if (tareasRes.status === 'fulfilled') setTareas(tareasRes.value);
      if (comprasRes.status === 'fulfilled') setCompras(comprasRes.value);
      if (gastosRes.status === 'fulfilled') setGastos(gastosRes.value);
      if (catRes.status === 'fulfilled') setCategorias(catRes.value);
      if (partRes.status === 'fulfilled') setParticipacion(partRes.value);
      if (progRes.status === 'fulfilled') setProgreso(progRes.value);
    } catch {
      // Usar datos en memoria
    }
  }, [isDemoMode]);

  // Al iniciar la app: verificar token guardado o inicializar
  useEffect(() => {
    (async () => {
      try {
        await initApi();
        const token = getApiToken();
        if (token) {
          const perfil = await api.getPerfil();
          setUsuario(perfil.usuario);
          setRol(perfil.rol);
          if (perfil.usuario.tema_preferido) {
            applyRemoteTheme(perfil.usuario.tema_preferido);
          }
          if (perfil.hogar) {
            try {
              const hDetalle = await api.getHogarActual();
              setHogar(hDetalle);
            } catch {
              setHogar(perfil.hogar as HogarDetalle);
            }
          }
          await recargarDatos();
        }
      } catch {
        // En caso de que no haya conexión con el backend, no bloquear la app
      } finally {
        setIsLoading(false);
      }
    })();
  }, [applyRemoteTheme, recargarDatos]);

  const login = useCallback(
    async (email: string, password: string) => {
      setIsLoading(true);
      try {
        const res = await api.login({ email, password });
        setUsuario(res.usuario);
        setRol(res.rol);
        setIsDemoMode(false);
        if (res.usuario.tema_preferido) {
          applyRemoteTheme(res.usuario.tema_preferido);
        }
        if (res.hogar) {
          try {
            const h = await api.getHogarActual();
            setHogar(h);
          } catch {
            setHogar(res.hogar as HogarDetalle);
          }
        } else {
          setHogar(null);
        }
        await recargarDatos();
      } finally {
        setIsLoading(false);
      }
    },
    [applyRemoteTheme, recargarDatos],
  );

  const registro = useCallback(
    async (nombre: string, email: string, password: string) => {
      setIsLoading(true);
      try {
        const res = await api.registro({ nombre, email, password });
        setUsuario(res.usuario);
        setRol(res.rol);
        setIsDemoMode(false);
        setHogar(null);
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const activarModoDemo = useCallback(() => {
    setIsDemoMode(true);
    setUsuario(MOCK_USUARIOS[0]);
    setHogar(MOCK_HOGAR);
    setRol('ADMINISTRADOR');
    setTareas(MOCK_TAREAS);
    setCompras(MOCK_ITEMS_COMPRA);
    setGastos(MOCK_GASTOS);
    setCategorias(MOCK_CATEGORIAS);
    setParticipacion(MOCK_PARTICIPACION);
    setProgreso(MOCK_PROGRESO_DIAS);
    applyRemoteTheme('noche_indigo');
  }, [applyRemoteTheme]);

  const logout = useCallback(async () => {
    setApiToken(null);
    setUsuario(null);
    setHogar(null);
    setRol(null);
    setIsDemoMode(false);
  }, []);

  const crearHogar = useCallback(
    async (nombre: string) => {
      if (isDemoMode || !usuario) {
        const nuevoHogar: HogarDetalle = {
          id_hogar: Date.now(),
          nombre,
          codigo_invitacion: `NH-${Math.floor(1000 + Math.random() * 9000)}`,
          fecha_creacion: new Date().toISOString(),
          miembros: [
            {
              id_miembro: 1,
              id_usuario: usuario?.id_usuario ?? 1,
              id_hogar: Date.now(),
              rol: 'ADMINISTRADOR',
              puntos_acumulados: 0,
              fecha_ingreso: new Date().toISOString(),
              usuario: usuario ?? MOCK_USUARIOS[0],
            },
          ],
        };
        setHogar(nuevoHogar);
        setRol('ADMINISTRADOR');
        return;
      }
      const nuevo = await api.crearHogar({ nombre });
      setHogar(nuevo);
      setRol('ADMINISTRADOR');
      await recargarDatos();
    },
    [isDemoMode, usuario, recargarDatos],
  );

  const unirseHogar = useCallback(
    async (codigo: string) => {
      if (isDemoMode || !usuario) {
        setHogar({ ...MOCK_HOGAR, codigo_invitacion: codigo.toUpperCase() });
        setRol('MIEMBRO');
        return;
      }
      const unido = await api.unirseHogar({ codigo_invitacion: codigo });
      setHogar(unido);
      setRol('MIEMBRO');
      await recargarDatos();
    },
    [isDemoMode, usuario, recargarDatos],
  );

  // Manipulación de tareas
  const toggleTarea = useCallback(
    async (id_tarea: number) => {
      const actual = tareas.find((t) => t.id_tarea === id_tarea);
      if (!actual) return;
      const completada = actual.estado === 'PENDIENTE';

      // Actualización optimista
      setTareas((prev) =>
        prev.map((t) =>
          t.id_tarea === id_tarea
            ? {
                ...t,
                estado: completada ? 'COMPLETADA' : 'PENDIENTE',
                fecha_completada: completada ? new Date().toISOString() : null,
              }
            : t,
        ),
      );

      // Actualizar puntos de participación optimista
      setParticipacion((prev) =>
        prev.map((m) =>
          m.id_usuario === actual.id_asignado
            ? {
                ...m,
                puntos: completada ? m.puntos + actual.puntos : Math.max(0, m.puntos - actual.puntos),
                tareasCompletadas: completada ? m.tareasCompletadas + 1 : Math.max(0, m.tareasCompletadas - 1),
              }
            : m,
        ),
      );

      if (!isDemoMode && getApiToken()) {
        try {
          if (completada) {
            await api.completarTarea(id_tarea);
          } else {
            await api.reabrirTarea(id_tarea);
          }
        } catch {
          // Si falla en backend, se puede revertir o sincronizar en recarga
        }
      }
    },
    [tareas, isDemoMode],
  );

  const agregarTarea = useCallback(
    async (dto: { titulo: string; descripcion?: string; id_asignado?: number | null; id_categoria?: number | null; puntos?: number }) => {
      if (!isDemoMode && getApiToken()) {
        try {
          const nueva = await api.crearTarea(dto);
          setTareas((prev) => [nueva, ...prev]);
          return;
        } catch {
          // Fallback a local
        }
      }

      const asignadoObj = MOCK_USUARIOS.find((u) => u.id_usuario === dto.id_asignado) ?? usuario;
      const catObj = categorias.find((c) => c.id_categoria === dto.id_categoria) ?? null;

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
        asignado: asignadoObj,
        creador: usuario ?? MOCK_USUARIOS[0],
        categoria: catObj,
      };
      setTareas((prev) => [nuevaLocal, ...prev]);
    },
    [isDemoMode, usuario, hogar, categorias],
  );

  const eliminarTarea = useCallback(
    async (id_tarea: number) => {
      setTareas((prev) => prev.filter((t) => t.id_tarea !== id_tarea));
      if (!isDemoMode && getApiToken()) {
        try {
          await api.eliminarTarea(id_tarea);
        } catch {
          // Ignorar
        }
      }
    },
    [isDemoMode],
  );

  // Manipulación de compras
  const toggleCompra = useCallback(
    async (id_item: number) => {
      setCompras((prev) =>
        prev.map((item) =>
          item.id_item === id_item
            ? {
                ...item,
                comprado: !item.comprado,
                fecha_compra: !item.comprado ? new Date().toISOString() : null,
                comprador: !item.comprado ? usuario ?? MOCK_USUARIOS[0] : null,
              }
            : item,
        ),
      );
      if (!isDemoMode && getApiToken()) {
        try {
          await api.alternarCompra(id_item);
        } catch {
          // Ignorar
        }
      }
    },
    [usuario, isDemoMode],
  );

  const agregarCompra = useCallback(
    async (dto: { nombre: string; cantidad?: string; id_categoria?: number | null }) => {
      if (!isDemoMode && getApiToken()) {
        try {
          const nueva = await api.crearCompra(dto);
          setCompras((prev) => [nueva, ...prev]);
          return;
        } catch {
          // Fallback a local
        }
      }

      const catObj = categorias.find((c) => c.id_categoria === dto.id_categoria) ?? null;
      const nuevoItem: ItemCompra = {
        id_item: Date.now(),
        id_hogar: hogar?.id_hogar ?? 1,
        id_creador: usuario?.id_usuario ?? 1,
        id_comprador: null,
        id_categoria: dto.id_categoria ?? null,
        nombre: dto.nombre,
        cantidad: dto.cantidad || '1',
        comprado: false,
        fecha_creacion: new Date().toISOString(),
        creador: usuario ?? MOCK_USUARIOS[0],
        categoria: catObj,
      };
      setCompras((prev) => [nuevoItem, ...prev]);
    },
    [isDemoMode, usuario, hogar, categorias],
  );

  const eliminarCompra = useCallback(
    async (id_item: number) => {
      setCompras((prev) => prev.filter((i) => i.id_item !== id_item));
      if (!isDemoMode && getApiToken()) {
        try {
          await api.eliminarCompra(id_item);
        } catch {
          // Ignorar
        }
      }
    },
    [isDemoMode],
  );

  const limpiarComprados = useCallback(async () => {
    setCompras((prev) => prev.filter((i) => !i.comprado));
    if (!isDemoMode && getApiToken()) {
      try {
        await api.limpiarComprasCompradas();
      } catch {
        // Ignorar
      }
    }
  }, [isDemoMode]);

  // Manipulación de gastos
  const agregarGasto = useCallback(
    async (dto: { concepto: string; monto: number }) => {
      if (!isDemoMode && getApiToken()) {
        try {
          const nuevo = await api.crearGasto(dto);
          setGastos((prev) => [nuevo, ...prev]);
          return;
        } catch {
          // Fallback a local
        }
      }
      const nuevoGasto: Gasto = {
        id_gasto: Date.now(),
        id_hogar: hogar?.id_hogar ?? 1,
        id_registrador: usuario?.id_usuario ?? 1,
        concepto: dto.concepto,
        monto: dto.monto,
        fecha: new Date().toISOString(),
        registrador: usuario ?? MOCK_USUARIOS[0],
      };
      setGastos((prev) => [nuevoGasto, ...prev]);
    },
    [isDemoMode, usuario, hogar],
  );

  const eliminarGasto = useCallback(
    async (id_gasto: number) => {
      setGastos((prev) => prev.filter((g) => g.id_gasto !== id_gasto));
      if (!isDemoMode && getApiToken()) {
        try {
          await api.eliminarGasto(id_gasto);
        } catch {
          // Ignorar
        }
      }
    },
    [isDemoMode],
  );

  // Actualizar disponibilidad
  const actualizarDisponibilidad = useCallback(
    async (disp: 'ALTA' | 'MEDIA' | 'BAJA', desc?: string) => {
      if (usuario) {
        setUsuario({ ...usuario, disponibilidad: disp, descripcion_carga: desc ?? usuario.descripcion_carga });
      }
      if (!isDemoMode && getApiToken()) {
        try {
          await api.updatePerfil({ disponibilidad: disp, descripcion_carga: desc });
        } catch {
          // Ignorar
        }
      }
    },
    [usuario, isDemoMode],
  );

  // Invitar miembro
  const invitarMiembro = useCallback(
    async (rolAsignado: RolMiembro) => {
      if (!isDemoMode && getApiToken()) {
        try {
          return await api.invitarMiembro({ rol: rolAsignado });
        } catch {
          // Fallback
        }
      }
      return { codigo_invitacion: hogar?.codigo_invitacion ?? 'NH-7824' };
    },
    [isDemoMode, hogar],
  );

  const value: AuthContextValue = {
    usuario,
    hogar,
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
    login,
    registro,
    logout,
    crearHogar,
    unirseHogar,
    activarModoDemo,
    recargarDatos,
    toggleTarea,
    agregarTarea,
    eliminarTarea,
    toggleCompra,
    agregarCompra,
    eliminarCompra,
    limpiarComprados,
    agregarGasto,
    eliminarGasto,
    actualizarDisponibilidad,
    invitarMiembro,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
