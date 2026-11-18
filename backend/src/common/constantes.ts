/** Identificadores de los 4 temas predefinidos (deben coincidir con mobile/src/theme). */
export const TEMAS_VALIDOS = ['noche_indigo', 'bosque_nocturno', 'brisa_nordica', 'hogar_calido'];

/** Peso de cada nivel de disponibilidad para ponderar la carga esperada. */
export const PESO_DISPONIBILIDAD = { ALTA: 3, MEDIA: 2, BAJA: 1 } as const;

/** Campos públicos del usuario (nunca exponer password_hash ni pin_hash). */
export const SELECT_USUARIO_PUBLICO = {
  id_usuario: true,
  identificador_unico: true,
  nombre: true,
  nombre_login: true,
  email: true,
  avatar_url: true,
  disponibilidad: true,
  descripcion_carga: true,
  tema_preferido: true,
  expo_push_token: true,
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

/** Normaliza un identificador único (@username) en formato limpio en minúsculas con prefijo @. */
export function normalizarIdentificadorUnico(raw: string): string {
  const limpio = raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/^@+/, '')
    .replace(/[^a-z0-9._#-]+/g, '.')
    .replace(/\.{2,}/g, '.')
    .replace(/^\.|\.$/g, '');
  return `@${limpio || 'usuario'}`;
}

/** Genera un identificador único legible a partir del nombre del usuario (ej: "@benjamin.vidal"). */
export function generarIdentificadorDesdeNombre(nombre: string, sufijo?: string | number): string {
  const base = normalizarIdentificadorUnico(nombre);
  return sufijo !== undefined ? `${base}.${sufijo}` : base;
}
