import { NativeModules, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  AuthResponse,
  Categoria,
  Gasto,
  HogarDetalle,
  HogarResumen,
  InvitacionTemporal,
  ItemCompra,
  MiembroParticipacion,
  ProgresoDia,
  RegistroSuministro,
  ResumenSuministros,
  RolMiembro,
  Tarea,
  TipoHogar,
  TipoSuministro,
  Usuario,
} from '../types';

const TOKEN_KEY = '@neathogar/token';
const ACTIVE_HOGAR_KEY = '@neathogar/active_hogar_id';
const LEGACY_SAVED_HOMES_KEY = '@neathogar/saved_homes';
const BASE_URL_KEY = '@neathogar/base_url';

const LAN_FALLBACK_IP = '192.168.18.6';

/**
 * Detecta dinámicamente la IP del PC desde la URL del bundle de Metro en Expo Go.
 * Así funciona tanto en un celular físico por Wi-Fi (ej. 192.168.18.6) como en emuladores (10.0.2.2 / localhost).
 */
function detectMetroHostIp(): string | null {
  try {
    const scriptURL: string | undefined = NativeModules?.SourceCode?.scriptURL;
    if (scriptURL) {
      const match = scriptURL.match(/^(?:https?|exp):\/\/([^/:]+)(?::\d+)?/i);
      if (match?.[1] && match[1] !== 'localhost' && match[1] !== '127.0.0.1') {
        return match[1];
      }
    }
  } catch {
    // Ignorar si no está disponible
  }
  return null;
}

function getCandidateBaseUrls(customUrl?: string | null): string[] {
  const candidates: string[] = [];
  const pushUnique = (u?: string | null) => {
    if (!u) return;
    const clean = u.trim().replace(/\/+$/, '');
    const withApi = clean.endsWith('/api') ? clean : `${clean}/api`;
    if (!candidates.includes(withApi)) {
      candidates.push(withApi);
    }
  };

  if (customUrl) {
    pushUnique(customUrl);
  }

  const metroHost = detectMetroHostIp();
  if (metroHost) {
    pushUnique(`http://${metroHost}:3000/api`);
  }

  // IP LAN detectada del PC (para celular físico en la misma red Wi-Fi)
  pushUnique(`http://${LAN_FALLBACK_IP}:3000/api`);

  // Fallbacks para Emulador Android y simulador local
  if (Platform.OS === 'android') {
    pushUnique('http://10.0.2.2:3000/api');
  }
  pushUnique('http://localhost:3000/api');
  pushUnique('http://127.0.0.1:3000/api');

  return candidates;
}

const DEFAULT_BASE_URL = getCandidateBaseUrls()[0];

let currentBaseUrl = DEFAULT_BASE_URL;
let customSavedUrl: string | null = null;
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
    if (savedUrl && !savedUrl.includes('10.0.2.2')) {
      customSavedUrl = savedUrl;
      currentBaseUrl = savedUrl;
    } else {
      currentBaseUrl = getCandidateBaseUrls()[0];
    }
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
  const clean = url.trim().replace(/\/+$/, '');
  const formatted = clean ? (clean.endsWith('/api') ? clean : `${clean}/api`) : getCandidateBaseUrls()[0];
  customSavedUrl = clean ? formatted : null;
  currentBaseUrl = formatted;
  if (clean) {
    await AsyncStorage.setItem(BASE_URL_KEY, formatted).catch(() => undefined);
  } else {
    await AsyncStorage.removeItem(BASE_URL_KEY).catch(() => undefined);
  }
}

export function getApiBaseUrl() {
  return currentBaseUrl;
}

/** Convierte una ruta relativa como `/uploads/evidencias/foto.jpg` en URL absoluta hacia el backend activo. */
export function resolveMediaUrl(relativeOrFullUrl?: string | null): string | null {
  if (!relativeOrFullUrl) return null;
  if (
    relativeOrFullUrl.startsWith('http://') ||
    relativeOrFullUrl.startsWith('https://') ||
    relativeOrFullUrl.startsWith('file://') ||
    relativeOrFullUrl.startsWith('content://') ||
    relativeOrFullUrl.startsWith('data:')
  ) {
    return relativeOrFullUrl;
  }
  const rawBase = (currentBaseUrl || DEFAULT_BASE_URL).trim().replace(/\/+$/, '');
  const origin = rawBase.replace(/\/api$/, '');
  const path = relativeOrFullUrl.startsWith('/') ? relativeOrFullUrl : `/${relativeOrFullUrl}`;
  return `${origin}${path}`;
}

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 4500): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const headers: Record<string, string> = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers as Record<string, string>),
  };

  if (currentToken) {
    headers.Authorization = `Bearer ${currentToken}`;
  }
  if (currentHogarId) {
    headers['x-hogar-id'] = String(currentHogarId);
  }

  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const candidates = getCandidateBaseUrls(customSavedUrl || currentBaseUrl);

  let response: Response | null = null;
  let lastNetworkError: any = null;

  for (const candidateBase of candidates) {
    const url = `${candidateBase}${cleanPath}`;
    try {
      response = await fetchWithTimeout(url, { ...options, headers }, 5000);
      if (currentBaseUrl !== candidateBase) {
        currentBaseUrl = candidateBase;
      }
      break;
    } catch (netErr: any) {
      lastNetworkError = netErr;
    }
  }

  if (!response) {
    throw new Error(
      `No se pudo conectar al servidor (${currentBaseUrl}). Verifica que tu celular y tu PC estén en la misma red Wi-Fi (${LAN_FALLBACK_IP}:3000). Detalle: ${lastNetworkError?.message || 'Sin respuesta'}`,
    );
  }

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
  // ───────────── Auth (Nombre/@identificador + PIN y Email/@identificador + Password) ─────────────
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
    identificador_unico?: string;
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
    identificador_unico?: string;
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
    identificador_unico?: string;
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

  async login(data: {
    email?: string;
    identificador_unico?: string;
    password: string;
  }): Promise<AuthResponse> {
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

  // ───────────── Hogares & Invitaciones Dinámicas (TTL 5 min) ─────────────
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

  async generarCodigoTemporal(
    id_hogar?: number,
    opciones?: {
      rol?: RolMiembro;
      puede_validar_tareas?: boolean;
      puede_crear_tareas?: boolean;
      puede_gestionar_compras?: boolean;
    },
  ): Promise<InvitacionTemporal> {
    const endpoint = id_hogar
      ? `/hogares/${id_hogar}/invitaciones`
      : '/hogares/actual/invitaciones-temporales';
    return request<InvitacionTemporal>(endpoint, {
      method: 'POST',
      body: JSON.stringify(opciones ?? {}),
    });
  },

  async getInvitacionActiva(): Promise<InvitacionTemporal & { activa: boolean }> {
    return request('/hogares/actual/invitacion-activa');
  },

  async invitarMiembro(data: {
    email?: string;
    nombre?: string;
    rol?: RolMiembro;
    puede_validar_tareas?: boolean;
    puede_crear_tareas?: boolean;
    puede_gestionar_compras?: boolean;
  }): Promise<HogarDetalle & { codigo_temporal?: InvitacionTemporal }> {
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

  // ───────────── Tareas (con Evidencia Fotográfica y Validación) ─────────────
  async getTareas(): Promise<Tarea[]> {
    return request('/tareas');
  },

  async crearTarea(data: {
    titulo: string;
    descripcion?: string;
    id_asignado?: number | null;
    id_categoria?: number | null;
    puntos?: number;
    requiere_foto?: boolean;
    fecha_limite?: string;
  }): Promise<Tarea> {
    return request('/tareas', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async completarTareaConEvidencia(
    id_tarea: number,
    payload: { foto_base64?: string; uri?: string },
  ): Promise<Tarea> {
    if (payload.foto_base64) {
      return request(`/tareas/${id_tarea}/completar-con-evidencia`, {
        method: 'POST',
        body: JSON.stringify({ foto_base64: payload.foto_base64 }),
      });
    }

    if (payload.uri) {
      const form = new FormData();
      const filename = payload.uri.split('/').pop() || `evidencia_${id_tarea}.jpg`;
      form.append('foto', {
        uri: payload.uri,
        name: filename,
        type: 'image/jpeg',
      } as any);
      return request(`/tareas/${id_tarea}/completar-con-evidencia`, {
        method: 'POST',
        body: form,
      });
    }

    throw new Error('Debes capturar o seleccionar una fotografía de evidencia');
  },

  async completarTarea(id_tarea: number): Promise<Tarea> {
    return request(`/tareas/${id_tarea}/completar`, {
      method: 'PATCH',
    });
  },

  async validarTarea(
    id_tarea: number,
    dto?: { aprobado?: boolean; comentario_revision?: string },
  ): Promise<Tarea> {
    return request(`/tareas/${id_tarea}/validar`, {
      method: 'PATCH',
      body: JSON.stringify(dto ?? { aprobado: true }),
    });
  },

  async rechazarTarea(
    id_tarea: number,
    comentario_revision?: string,
  ): Promise<Tarea | { ok: boolean; eliminada?: boolean; id_tarea?: number }> {
    return request(`/tareas/${id_tarea}/rechazar`, {
      method: 'PATCH',
      body: JSON.stringify({ aprobado: false, comentario_revision }),
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

  // ───────────── Suministros, Despensa y Monitor Exclusivo de Gas ─────────────
  async getSuministros(id_hogar?: number): Promise<ResumenSuministros> {
    const path = id_hogar ? `/hogares/${id_hogar}/suministros` : '/suministros';
    return request(path);
  },

  async crearSuministro(
    data: {
      tipo: TipoSuministro;
      nombre: string;
      fecha_compra?: string;
      dias_alerta_inicial?: number;
      dias_alerta_critica?: number;
      notas?: string;
    },
    id_hogar?: number,
  ): Promise<RegistroSuministro> {
    const path = id_hogar ? `/hogares/${id_hogar}/suministros` : '/suministros';
    return request(path, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async eliminarSuministro(id_suministro: number, id_hogar?: number): Promise<{ ok: boolean }> {
    const path = id_hogar
      ? `/hogares/${id_hogar}/suministros/${id_suministro}`
      : `/suministros/${id_suministro}`;
    return request(path, {
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
