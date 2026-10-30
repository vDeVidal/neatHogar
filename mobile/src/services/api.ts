import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  AuthResponse,
  Categoria,
  Gasto,
  HogarDetalle,
  HogarResumen,
  ItemCompra,
  MiembroParticipacion,
  ProgresoDia,
  RolMiembro,
  Tarea,
  TipoHogar,
  Usuario,
} from '../types';

const TOKEN_KEY = '@neathogar/token';
const ACTIVE_HOGAR_KEY = '@neathogar/active_hogar_id';
const LEGACY_SAVED_HOMES_KEY = '@neathogar/saved_homes';
const BASE_URL_KEY = '@neathogar/base_url';

const DEFAULT_BASE_URL = Platform.select({
  android: 'http://10.0.2.2:3000/api',
  ios: 'http://localhost:3000/api',
  default: 'http://localhost:3000/api',
});

let currentBaseUrl = DEFAULT_BASE_URL;
let currentToken: string | null = null;
let currentHogarId: number | null = null;

export async function initApi() {
  try {
    const [savedToken, savedHogarId, savedUrl] = await Promise.all([
      AsyncStorage.getItem(TOKEN_KEY),
      AsyncStorage.getItem(ACTIVE_HOGAR_KEY),
      AsyncStorage.getItem(BASE_URL_KEY),
    ]);
    currentToken = savedToken || null;
    const parsedHogar = savedHogarId ? parseInt(savedHogarId, 10) : NaN;
    currentHogarId = Number.isFinite(parsedHogar) && parsedHogar > 0 ? parsedHogar : null;
    if (savedUrl) currentBaseUrl = savedUrl;
  } catch {
    currentToken = null;
    currentHogarId = null;
  }
}

export async function setApiToken(token: string | null) {
  currentToken = token;
  try {
    if (token) {
      await AsyncStorage.setItem(TOKEN_KEY, token);
    } else {
      await AsyncStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    // Ignorar error de almacenamiento
  }
}

export function getApiToken() {
  return currentToken;
}

export async function setActiveHogarId(idHogar: number | null) {
  currentHogarId = idHogar;
  try {
    if (idHogar && idHogar > 0) {
      await AsyncStorage.setItem(ACTIVE_HOGAR_KEY, String(idHogar));
    } else {
      await AsyncStorage.removeItem(ACTIVE_HOGAR_KEY);
    }
  } catch {
    // Ignorar error de almacenamiento
  }
}

export function getActiveHogarId() {
  return currentHogarId;
}

/** Limpia por completo cualquier rastro de sesión en memoria y en AsyncStorage. */
export async function clearApiSession() {
  currentToken = null;
  currentHogarId = null;
  try {
    await AsyncStorage.multiRemove([TOKEN_KEY, ACTIVE_HOGAR_KEY, LEGACY_SAVED_HOMES_KEY]);
  } catch {
    await AsyncStorage.removeItem(TOKEN_KEY).catch(() => undefined);
    await AsyncStorage.removeItem(ACTIVE_HOGAR_KEY).catch(() => undefined);
    await AsyncStorage.removeItem(LEGACY_SAVED_HOMES_KEY).catch(() => undefined);
  }
}

export async function setApiBaseUrl(url: string) {
  currentBaseUrl = url.trim();
  await AsyncStorage.setItem(BASE_URL_KEY, currentBaseUrl).catch(() => undefined);
}

export function getApiBaseUrl() {
  return currentBaseUrl;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (currentToken) {
    headers.Authorization = `Bearer ${currentToken}`;
  }
  if (currentHogarId) {
    headers['x-hogar-id'] = String(currentHogarId);
  }

  const rawBase = (currentBaseUrl || DEFAULT_BASE_URL).trim().replace(/\/+$/, '');
  const baseUrl = rawBase.endsWith('/api') ? rawBase : `${rawBase}/api`;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${baseUrl}${cleanPath}`;

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let mensaje = `Error HTTP ${response.status}`;
    try {
      const errJson = await response.json();
      if (errJson?.message) {
        mensaje = Array.isArray(errJson.message) ? errJson.message.join(', ') : errJson.message;
      }
    } catch {
      // Ignorar fallback
    }
    const err = new Error(mensaje) as Error & { status?: number };
    err.status = response.status;
    throw err;
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

export const api = {
  // ───────────── Auth (Nombre + PIN y Email) ─────────────
  async loginConPin(data: {
    nombre: string;
    pin: string;
    codigo_invitacion?: string;
  }): Promise<AuthResponse> {
    const payload: Record<string, string> = {
      nombre: data.nombre.trim(),
      pin: data.pin.trim(),
    };
    if (data.codigo_invitacion?.trim()) {
      payload.codigo_invitacion = data.codigo_invitacion.trim().toUpperCase();
    }
    const res = await request<AuthResponse>('/auth/pin/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    await setApiToken(res.token);
    if (res.hogar?.id_hogar) {
      await setActiveHogarId(res.hogar.id_hogar);
    }
    return res;
  },

  async registroConPin(data: {
    nombre: string;
    pin: string;
    disponibilidad?: string;
    descripcion_carga?: string;
    tema_preferido?: string;
  }): Promise<AuthResponse> {
    const res = await request<AuthResponse>('/auth/pin/registro', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    await setApiToken(res.token);
    return res;
  },

  async accesoConPin(data: {
    nombre: string;
    pin: string;
    tema_preferido?: string;
  }): Promise<AuthResponse> {
    const res = await request<AuthResponse>('/auth/pin/acceso', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    await setApiToken(res.token);
    if (res.hogar?.id_hogar) {
      await setActiveHogarId(res.hogar.id_hogar);
    }
    return res;
  },

  async registro(data: {
    nombre: string;
    email: string;
    password: string;
    pin?: string;
    disponibilidad?: string;
    descripcion_carga?: string;
    tema_preferido?: string;
  }): Promise<AuthResponse> {
    const res = await request<AuthResponse>('/auth/registro', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    await setApiToken(res.token);
    return res;
  },

  async login(data: { email: string; password: string }): Promise<AuthResponse> {
    const res = await request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    await setApiToken(res.token);
    if (res.hogar?.id_hogar) {
      await setActiveHogarId(res.hogar.id_hogar);
    }
    return res;
  },

  // ───────────── Perfil Usuario ─────────────
  async getPerfil(): Promise<{
    usuario: Usuario;
    hogar: HogarDetalle | null;
    rol: RolMiembro | null;
    hogares: HogarResumen[];
  }> {
    return request('/usuarios/me');
  },

  async updatePerfil(data: Partial<Usuario> & { pin?: string }): Promise<Usuario> {
    return request('/usuarios/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  // ───────────── Hogares (Multi-Hogar + Tipos) ─────────────
  async getMisHogares(): Promise<HogarResumen[]> {
    return request('/hogares');
  },

  async activarHogar(id_hogar: number): Promise<HogarDetalle> {
    await setActiveHogarId(id_hogar);
    return request(`/hogares/${id_hogar}/activar`, {
      method: 'POST',
    });
  },

  async crearHogar(data: { nombre: string; tipo_hogar?: TipoHogar }): Promise<HogarDetalle> {
    const res = await request<HogarDetalle>('/hogares', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    await setActiveHogarId(res.id_hogar);
    return res;
  },

  async unirseHogar(data: { codigo_invitacion?: string; codigo?: string }): Promise<HogarDetalle> {
    const code = (data.codigo_invitacion || data.codigo || '').trim().toUpperCase();
    const res = await request<HogarDetalle>('/hogares/unirse', {
      method: 'POST',
      body: JSON.stringify({ codigo: code, codigo_invitacion: code }),
    });
    await setActiveHogarId(res.id_hogar);
    return res;
  },

  async getHogarActual(): Promise<HogarDetalle> {
    return request('/hogares/actual');
  },

  async actualizarTipoHogar(tipo_hogar: TipoHogar): Promise<HogarDetalle> {
    return request('/hogares/actual/tipo', {
      method: 'PATCH',
      body: JSON.stringify({ tipo_hogar }),
    });
  },

  async invitarMiembro(data: {
    email?: string;
    nombre?: string;
    rol?: RolMiembro;
    puede_validar_tareas?: boolean;
    puede_crear_tareas?: boolean;
    puede_gestionar_compras?: boolean;
  }): Promise<HogarDetalle> {
    const payload: Record<string, unknown> = {};
    if (data.email?.trim()) payload.email = data.email.trim();
    if (data.nombre?.trim()) payload.nombre = data.nombre.trim();
    if (data.rol !== undefined) payload.rol = data.rol;
    if (data.puede_validar_tareas !== undefined) payload.puede_validar_tareas = data.puede_validar_tareas;
    if (data.puede_crear_tareas !== undefined) payload.puede_crear_tareas = data.puede_crear_tareas;
    if (data.puede_gestionar_compras !== undefined) payload.puede_gestionar_compras = data.puede_gestionar_compras;

    return request('/hogares/actual/invitaciones', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async regenerarCodigo(): Promise<HogarDetalle> {
    return request('/hogares/actual/codigo', {
      method: 'POST',
    });
  },

  async cambiarPermisosMiembro(
    id_miembro: number,
    data: {
      rol?: RolMiembro;
      puede_validar_tareas?: boolean;
      puede_crear_tareas?: boolean;
      puede_gestionar_compras?: boolean;
    },
  ): Promise<HogarDetalle> {
    return request(`/hogares/actual/miembros/${id_miembro}/rol`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async eliminarMiembro(id_miembro: number): Promise<HogarDetalle> {
    return request(`/hogares/actual/miembros/${id_miembro}`, {
      method: 'DELETE',
    });
  },

  async salirHogar(): Promise<{ ok: boolean; nuevo_hogar_activo: number | null }> {
    return request('/hogares/actual/salir', {
      method: 'POST',
    });
  },

  // ───────────── Tareas ─────────────
  async getTareas(): Promise<Tarea[]> {
    return request('/tareas');
  },

  async crearTarea(data: {
    titulo: string;
    descripcion?: string;
    id_asignado?: number | null;
    id_categoria?: number | null;
    puntos?: number;
    fecha_limite?: string;
  }): Promise<Tarea> {
    return request('/tareas', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async completarTarea(id_tarea: number): Promise<Tarea> {
    return request(`/tareas/${id_tarea}/completar`, {
      method: 'PATCH',
    });
  },

  async validarTarea(id_tarea: number): Promise<Tarea> {
    return request(`/tareas/${id_tarea}/validar`, {
      method: 'PATCH',
    });
  },

  async rechazarTarea(id_tarea: number): Promise<Tarea | { ok: boolean; eliminada?: boolean; id_tarea?: number }> {
    return request(`/tareas/${id_tarea}/rechazar`, {
      method: 'PATCH',
    });
  },

  async reabrirTarea(id_tarea: number): Promise<Tarea> {
    return request(`/tareas/${id_tarea}/reabrir`, {
      method: 'PATCH',
    });
  },

  async eliminarTarea(id_tarea: number): Promise<{ ok: boolean }> {
    return request(`/tareas/${id_tarea}`, {
      method: 'DELETE',
    });
  },

  // ───────────── Compras ─────────────
  async getCompras(filtros?: { comprado?: boolean; id_categoria?: number }): Promise<ItemCompra[]> {
    const params = new URLSearchParams();
    if (filtros?.comprado !== undefined) params.append('comprado', String(filtros.comprado));
    if (filtros?.id_categoria) params.append('id_categoria', String(filtros.id_categoria));
    const qs = params.toString();
    return request(`/compras${qs ? `?${qs}` : ''}`);
  },

  async crearCompra(data: {
    nombre: string;
    cantidad?: string;
    id_categoria?: number | null;
  }): Promise<ItemCompra> {
    return request('/compras', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async alternarCompra(id_item: number): Promise<ItemCompra> {
    return request(`/compras/${id_item}/alternar`, {
      method: 'PATCH',
    });
  },

  async validarCompra(id_item: number): Promise<ItemCompra> {
    return request(`/compras/${id_item}/validar`, {
      method: 'PATCH',
    });
  },

  async rechazarCompra(id_item: number): Promise<ItemCompra | { ok: boolean; eliminado?: boolean; id_item?: number }> {
    return request(`/compras/${id_item}/rechazar`, {
      method: 'PATCH',
    });
  },

  async eliminarCompra(id_item: number): Promise<{ ok: boolean }> {
    return request(`/compras/${id_item}`, {
      method: 'DELETE',
    });
  },

  async limpiarComprasCompradas(): Promise<{ ok: boolean; eliminados: number }> {
    return request('/compras/comprados', {
      method: 'DELETE',
    });
  },

  // ───────────── Categorías ─────────────
  async getCategorias(tipo?: 'TAREA' | 'COMPRA'): Promise<Categoria[]> {
    const qs = tipo ? `?tipo=${tipo}` : '';
    return request(`/categorias${qs}`);
  },

  async crearCategoria(data: { nombre: string; tipo: 'TAREA' | 'COMPRA' }): Promise<Categoria> {
    return request('/categorias', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // ───────────── Gastos ─────────────
  async getGastos(): Promise<Gasto[]> {
    const raw: any = await request('/gastos');
    if (Array.isArray(raw)) return raw;
    return Array.isArray(raw?.items) ? raw.items : [];
  },

  async crearGasto(data: { concepto: string; monto: number }): Promise<Gasto> {
    return request('/gastos', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async validarGasto(id_gasto: number): Promise<Gasto> {
    return request(`/gastos/${id_gasto}/validar`, {
      method: 'PATCH',
    });
  },

  async rechazarGasto(id_gasto: number): Promise<{ ok: boolean }> {
    return request(`/gastos/${id_gasto}/rechazar`, {
      method: 'PATCH',
    });
  },

  async eliminarGasto(id_gasto: number): Promise<{ ok: boolean }> {
    return request(`/gastos/${id_gasto}`, {
      method: 'DELETE',
    });
  },

  // ───────────── Estadísticas ─────────────
  async getParticipacion(): Promise<MiembroParticipacion[]> {
    const raw: any = await request('/estadisticas/participacion');
    const items = Array.isArray(raw) ? raw : raw?.miembros || raw?.participacion || [];
    return items.map((m: any) => ({
      id_miembro: m.id_miembro ?? m.id_usuario ?? 0,
      id_usuario: m.id_usuario ?? 0,
      nombre: m.nombre ?? m.usuario?.nombre ?? 'Miembro',
      avatar_url: m.avatar_url ?? m.usuario?.avatar_url,
      rol: m.rol ?? 'MIEMBRO',
      disponibilidad: m.disponibilidad ?? m.usuario?.disponibilidad ?? 'MEDIA',
      descripcion_carga: m.descripcion_carga ?? m.usuario?.descripcion_carga,
      puntos: Number(m.puntos ?? m.puntos_acumulados ?? 0),
      tareasCompletadas: Number(m.tareasCompletadas ?? m.completadas ?? 0),
      porcentaje: Number(m.porcentaje ?? m.porcentaje_real ?? 0),
    }));
  },

  async getProgreso(dias = 7): Promise<ProgresoDia[]> {
    const tz = new Date().getTimezoneOffset();
    const raw: any = await request(`/estadisticas/progreso?dias=${dias}&tz=${tz}`);
    const items = Array.isArray(raw) ? raw : [];
    return items.map((item: any) => ({
      fecha: item.fecha ?? '',
      dia: item.dia ?? item.etiqueta ?? '',
      completadas: Number(item.completadas ?? 0),
      creadas: Number(item.creadas ?? item.programadas ?? 0),
    }));
  },
};
