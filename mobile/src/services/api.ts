import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  AuthResponse,
  Categoria,
  Gasto,
  Hogar,
  HogarDetalle,
  ItemCompra,
  MiembroParticipacion,
  ProgresoDia,
  RolMiembro,
  Tarea,
  Usuario,
} from '../types';

const TOKEN_KEY = '@neathogar/token';
const BASE_URL_KEY = '@neathogar/base_url';

const DEFAULT_BASE_URL = Platform.select({
  android: 'http://10.0.2.2:3000',
  ios: 'http://localhost:3000',
  default: 'http://localhost:3000',
});

let currentBaseUrl = DEFAULT_BASE_URL;
let currentToken: string | null = null;

export async function initApi() {
  try {
    const [savedToken, savedUrl] = await Promise.all([
      AsyncStorage.getItem(TOKEN_KEY),
      AsyncStorage.getItem(BASE_URL_KEY),
    ]);
    if (savedToken) currentToken = savedToken;
    if (savedUrl) currentBaseUrl = savedUrl;
  } catch {
    // Silencioso al iniciar
  }
}

export function setApiToken(token: string | null) {
  currentToken = token;
  if (token) {
    AsyncStorage.setItem(TOKEN_KEY, token).catch(() => undefined);
  } else {
    AsyncStorage.removeItem(TOKEN_KEY).catch(() => undefined);
  }
}

export function getApiToken() {
  return currentToken;
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

  const url = `${currentBaseUrl}${path.startsWith('/') ? path : `/${path}`}`;

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
    throw new Error(mensaje);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

export const api = {
  // Auth
  async registro(data: {
    nombre: string;
    email: string;
    password: string;
    disponibilidad?: string;
    descripcion_carga?: string;
    tema_preferido?: string;
  }): Promise<AuthResponse> {
    const res = await request<AuthResponse>('/auth/registro', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    setApiToken(res.token);
    return res;
  },

  async login(data: { email: string; password: string }): Promise<AuthResponse> {
    const res = await request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    setApiToken(res.token);
    return res;
  },

  // Perfil Usuario
  async getPerfil(): Promise<{ usuario: Usuario; hogar: Hogar | null; rol: RolMiembro | null }> {
    return request('/usuarios/me');
  },

  async updatePerfil(data: Partial<Usuario>): Promise<Usuario> {
    return request('/usuarios/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  // Hogares
  async crearHogar(data: { nombre: string }): Promise<HogarDetalle> {
    return request('/hogares', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async unirseHogar(data: { codigo_invitacion: string }): Promise<HogarDetalle> {
    return request('/hogares/unirse', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getHogarActual(): Promise<HogarDetalle> {
    return request('/hogares/actual');
  },

  async invitarMiembro(data: { email?: string; rol?: RolMiembro }): Promise<{ codigo_invitacion: string; email?: string }> {
    return request('/hogares/actual/invitaciones', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async regenerarCodigo(): Promise<{ codigo_invitacion: string }> {
    return request('/hogares/actual/codigo', {
      method: 'POST',
    });
  },

  async cambiarRolMiembro(id_miembro: number, rol: RolMiembro) {
    return request(`/hogares/actual/miembros/${id_miembro}/rol`, {
      method: 'PATCH',
      body: JSON.stringify({ rol }),
    });
  },

  async eliminarMiembro(id_miembro: number) {
    return request(`/hogares/actual/miembros/${id_miembro}`, {
      method: 'DELETE',
    });
  },

  async salirHogar() {
    return request('/hogares/actual/salir', {
      method: 'POST',
    });
  },

  // Tareas
  async getTareas(filtros?: { estado?: string; id_asignado?: number; id_categoria?: number }): Promise<Tarea[]> {
    const params = new URLSearchParams();
    if (filtros?.estado) params.append('estado', filtros.estado);
    if (filtros?.id_asignado) params.append('id_asignado', String(filtros.id_asignado));
    if (filtros?.id_categoria) params.append('id_categoria', String(filtros.id_categoria));
    const qs = params.toString();
    return request(`/tareas${qs ? `?${qs}` : ''}`);
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

  async reabrirTarea(id_tarea: number): Promise<Tarea> {
    return request(`/tareas/${id_tarea}/reabrir`, {
      method: 'PATCH',
    });
  },

  async eliminarTarea(id_tarea: number): Promise<{ mensaje: string }> {
    return request(`/tareas/${id_tarea}`, {
      method: 'DELETE',
    });
  },

  // Compras
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

  async eliminarCompra(id_item: number): Promise<{ mensaje: string }> {
    return request(`/compras/${id_item}`, {
      method: 'DELETE',
    });
  },

  async limpiarComprasCompradas(): Promise<{ count: number }> {
    return request('/compras/comprados', {
      method: 'DELETE',
    });
  },

  // Categorías
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

  // Gastos
  async getGastos(filtros?: { limite?: number }): Promise<Gasto[]> {
    const qs = filtros?.limite ? `?limite=${filtros.limite}` : '';
    return request(`/gastos${qs}`);
  },

  async crearGasto(data: { concepto: string; monto: number }): Promise<Gasto> {
    return request('/gastos', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async eliminarGasto(id_gasto: number): Promise<{ mensaje: string }> {
    return request(`/gastos/${id_gasto}`, {
      method: 'DELETE',
    });
  },

  // Estadísticas
  async getParticipacion(): Promise<MiembroParticipacion[]> {
    return request('/estadisticas/participacion');
  },

  async getProgreso(dias = 7): Promise<ProgresoDia[]> {
    const tz = -new Date().getTimezoneOffset();
    return request(`/estadisticas/progreso?dias=${dias}&tz=${tz}`);
  },
};
