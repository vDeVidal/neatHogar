/** Identificadores de los 4 temas predefinidos (deben coincidir con mobile/src/theme). */
export const TEMAS_VALIDOS = ['noche_indigo', 'bosque_nocturno', 'brisa_nordica', 'hogar_calido'];

/** Peso de cada nivel de disponibilidad para ponderar la carga esperada. */
export const PESO_DISPONIBILIDAD = { ALTA: 3, MEDIA: 2, BAJA: 1 } as const;

/** Campos públicos del usuario (nunca exponer password_hash ni pin_hash). */
export const SELECT_USUARIO_PUBLICO = {
  id_usuario: true,
  nombre: true,
  nombre_login: true,
  email: true,
  avatar_url: true,
  disponibilidad: true,
  descripcion_carga: true,
  tema_preferido: true,
  id_hogar_activo: true,
  fecha_registro: true,
} as const;

/** Normaliza un nombre de usuario para login/búsqueda única sin distinguir mayúsculas, tildes ni espacios múltiples. */
export function normalizarNombreLogin(nombre: string): string {
  return nombre
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}
