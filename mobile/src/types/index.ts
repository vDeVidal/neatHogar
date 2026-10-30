export type RolMiembro = 'ADMINISTRADOR' | 'MIEMBRO';
export type TipoHogar = 'COLABORATIVO' | 'JEFE_DE_HOGAR';
export type EstadoTarea = 'PROPUESTA' | 'PENDIENTE' | 'POR_VALIDAR' | 'COMPLETADA';
export type EstadoValidacion = 'APROBADO' | 'PENDIENTE_APROBACION' | 'COMPRA_POR_VALIDAR';
export type TipoCategoria = 'TAREA' | 'COMPRA';
export type NivelDisponibilidad = 'ALTA' | 'MEDIA' | 'BAJA';

export interface Usuario {
  id_usuario: number;
  nombre: string;
  nombre_login?: string | null;
  email: string;
  avatar_url?: string | null;
  disponibilidad: NivelDisponibilidad;
  descripcion_carga?: string | null;
  tema_preferido: string;
  id_hogar_activo?: number | null;
  fecha_registro: string;
}

export interface Hogar {
  id_hogar: number;
  nombre: string;
  tipo_hogar: TipoHogar;
  codigo_invitacion: string;
  fecha_creacion: string;
}

export interface HogarResumen extends Hogar {
  mi_rol: RolMiembro;
  puntos_acumulados: number;
  puede_validar_tareas: boolean;
  puede_crear_tareas: boolean;
  puede_gestionar_compras: boolean;
  total_miembros: number;
  validaciones_pendientes: number;
}

export interface MiembroHogar {
  id_miembro: number;
  id_usuario: number;
  id_hogar: number;
  rol: RolMiembro;
  puntos_acumulados: number;
  fecha_ingreso: string;
  puede_validar_tareas?: boolean;
  puede_crear_tareas?: boolean;
  puede_gestionar_compras?: boolean;
  tareas_pendientes?: number;
  usuario: Usuario;
}

export interface HogarDetalle extends Hogar {
  mi_rol?: RolMiembro | null;
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
  id_completador?: number | null;
  id_categoria: number | null;
  titulo: string;
  descripcion?: string | null;
  puntos: number;
  estado: EstadoTarea;
  fecha_limite?: string | null;
  fecha_creacion: string;
  fecha_completada?: string | null;
  asignado?: Usuario | null;
  creador?: Pick<Usuario, 'id_usuario' | 'nombre'> | Usuario;
  completador?: Pick<Usuario, 'id_usuario' | 'nombre'> | null;
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
  estado_validacion?: EstadoValidacion;
  fecha_creacion: string;
  fecha_compra?: string | null;
  creador?: Pick<Usuario, 'id_usuario' | 'nombre'> | Usuario;
  comprador?: Pick<Usuario, 'id_usuario' | 'nombre'> | Usuario | null;
  categoria?: Categoria | null;
}

export interface Gasto {
  id_gasto: number;
  id_hogar: number;
  id_registrador: number;
  concepto: string;
  monto: number;
  estado_validacion?: EstadoValidacion;
  fecha: string;
  registrador?: Pick<Usuario, 'id_usuario' | 'nombre'> | Usuario;
}

export interface MiembroParticipacion {
  id_miembro?: number;
  id_usuario: number;
  nombre: string;
  avatar_url?: string | null;
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
  hogar: HogarDetalle | null;
  rol: RolMiembro | null;
  hogares?: HogarResumen[];
}
