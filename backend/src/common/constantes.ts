/** Identificadores de los 4 temas predefinidos (deben coincidir con mobile/src/theme). */
export const TEMAS_VALIDOS = ['noche_indigo', 'bosque_nocturno', 'brisa_nordica', 'hogar_calido'];

/** Peso de cada nivel de disponibilidad para ponderar la carga esperada. */
export const PESO_DISPONIBILIDAD = { ALTA: 3, MEDIA: 2, BAJA: 1 } as const;

/** Campos públicos del usuario (nunca exponer password_hash). */
export const SELECT_USUARIO_PUBLICO = {
  id_usuario: true,
  nombre: true,
  email: true,
  avatar_url: true,
  disponibilidad: true,
  descripcion_carga: true,
  tema_preferido: true,
  fecha_registro: true,
} as const;
