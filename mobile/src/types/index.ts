export type RolMiembro = 'ADMINISTRADOR' | 'MIEMBRO';
export type EstadoTarea = 'PENDIENTE' | 'COMPLETADA';
export type TipoCategoria = 'TAREA' | 'COMPRA';
export type NivelDisponibilidad = 'ALTA' | 'MEDIA' | 'BAJA';

export interface Usuario {
  id_usuario: number;
  nombre: string;
  email: string;
  avatar_url?: string | null;
  disponibilidad: NivelDisponibilidad;
  descripcion_carga?: string | null;
  tema_preferido: string;
  fecha_registro: string;
}

export interface Hogar {
  id_hogar: number;
  nombre: string;
  codigo_invitacion: string;
  fecha_creacion: string;
}

export interface MiembroHogar {
  id_miembro: number;
  id_usuario: number;
  id_hogar: number;
  rol: RolMiembro;
  puntos_acumulados: number;
  fecha_ingreso: string;
  usuario: Usuario;
}

export interface HogarDetalle extends Hogar {
  miembros: MiembroHogar[];
  total_tareas_pendientes?: number;
  total_items_pendientes?: number;
}

export interface Categoria {
  id_categoria: number;
  nombre: string;
  tipo: TipoCategoria;
}

export interface Tarea {
  id_tarea: number;
  id_hogar: number;
  id_creador: number;
  id_asignado: number | null;
  id_categoria: number | null;
  titulo: string;
  descripcion?: string | null;
  puntos: number;
  estado: EstadoTarea;
  fecha_limite?: string | null;
  fecha_creacion: string;
  fecha_completada?: string | null;
  asignado?: Usuario | null;
  creador?: Usuario;
  categoria?: Categoria | null;
}

export interface ItemCompra {
  id_item: number;
  id_hogar: number;
  id_creador: number;
  id_comprador: number | null;
  id_categoria: number | null;
  nombre: string;
  cantidad: string;
  comprado: boolean;
  fecha_creacion: string;
  fecha_compra?: string | null;
  creador?: Usuario;
  comprador?: Usuario | null;
  categoria?: Categoria | null;
}

export interface Gasto {
  id_gasto: number;
  id_hogar: number;
  id_registrador: number;
  concepto: string;
  monto: number;
  fecha: string;
  registrador?: Usuario;
}

export interface MiembroParticipacion {
  id_usuario: number;
  nombre: string;
  rol: RolMiembro;
  disponibilidad: NivelDisponibilidad;
  descripcion_carga?: string | null;
  puntos: number;
  tareasCompletadas: number;
  porcentaje: number;
}

export interface ProgresoDia {
  fecha: string;
  dia: string;
  completadas: number;
  creadas: number;
}

export interface AuthResponse {
  token: string;
  usuario: Usuario;
  hogar: Hogar | null;
  rol: RolMiembro | null;
}
