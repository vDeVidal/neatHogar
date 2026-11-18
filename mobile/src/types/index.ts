export type RolMiembro = 'ADMINISTRADOR' | 'MIEMBRO';
export type TipoHogar = 'COLABORATIVO' | 'JEFE_DE_HOGAR';
export type EstadoTarea =
  | 'PROPUESTA'
  | 'PENDIENTE'
  | 'EN_REVISION'
  | 'POR_VALIDAR'
  | 'COMPLETADA'
  | 'RECHAZADA';
export type EstadoValidacion = 'APROBADO' | 'PENDIENTE_APROBACION' | 'COMPRA_POR_VALIDAR';
export type TipoCategoria = 'TAREA' | 'COMPRA';
export type TipoSuministro = 'GAS' | 'DESPENSA';
export type NivelAlertaSuministro = 'NORMAL' | 'ADVERTENCIA_2_SEMANAS' | 'CRITICO_3_SEMANAS';
export type NivelDisponibilidad = 'ALTA' | 'MEDIA' | 'BAJA';

export interface Usuario {
  id_usuario: number;
  identificador_unico?: string | null;
  nombre: string;
  nombre_login?: string | null;
  email: string;
  avatar_url?: string | null;
  disponibilidad: NivelDisponibilidad;
  descripcion_carga?: string | null;
  tema_preferido: string;
  expo_push_token?: string | null;
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

export interface InvitacionTemporal {
  id_codigo: number;
  codigo: string;
  rol_asignado: RolMiembro;
  creado_en?: string;
  expira_en: string;
  segundos_restantes: number;
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
  invitacion_temporal?: InvitacionTemporal | null;
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
  id_validador?: number | null;
  id_categoria: number | null;
  titulo: string;
  descripcion?: string | null;
  puntos: number;
  estado: EstadoTarea;
  requiere_foto?: boolean;
  evidencia_foto_url?: string | null;
  comentario_revision?: string | null;
  fecha_limite?: string | null;
  fecha_creacion: string;
  fecha_completada?: string | null;
  fecha_validacion?: string | null;
  asignado?: Usuario | null;
  creador?: Pick<Usuario, 'id_usuario' | 'nombre' | 'identificador_unico'> | Usuario;
  completador?: Pick<Usuario, 'id_usuario' | 'nombre' | 'identificador_unico'> | null;
  validador?: Pick<Usuario, 'id_usuario' | 'nombre' | 'identificador_unico'> | null;
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

export interface RegistroSuministro {
  id_suministro: number;
  id_hogar: number;
  id_comprador: number;
  tipo: TipoSuministro;
  nombre: string;
  fecha_compra: string;
  dias_alerta_inicial: number;
  dias_alerta_critica: number;
  activo: boolean;
  notas?: string | null;
  dias_transcurridos: number;
  semanas_transcurridas: number;
  nivel_alerta: NivelAlertaSuministro;
  comprador?: Pick<Usuario, 'id_usuario' | 'nombre' | 'identificador_unico'>;
}

export interface ResumenSuministros {
  gas_activo: RegistroSuministro | null;
  historial_gas: RegistroSuministro[];
  promedio_duracion_dias: number | null;
  despensa: RegistroSuministro[];
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
