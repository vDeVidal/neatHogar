/**
 * Las 4 paletas predefinidas de NeatHogar.
 * Los colores base provienen literalmente de la especificación; los tokens
 * "derivados" (border, highlight, softBg, etc.) se ajustan para garantizar
 * contraste y coherencia visual en cada tema.
 */

export type ThemeId = 'noche_indigo' | 'bosque_nocturno' | 'brisa_nordica' | 'hogar_calido';

export interface ThemeColors {
  // ── Base (especificación) ──
  background: string;
  surface: string;
  card: string;
  primary: string;
  secondary: string;
  textPrimary: string;
  textSecondary: string;
  success: string;
  warning: string;
  danger: string;
  // ── Derivados ──
  /** Texto/íconos sobre `primary`. */
  onPrimary: string;
  /** Color de acento para estados activos (switches, chips seleccionados, bordes destacados). */
  highlight: string;
  /** Texto/íconos sobre `highlight`. */
  onHighlight: string;
  /** Fondo suave para chips/inputs no seleccionados. */
  softBg: string;
  border: string;
  /** Fondo semitransparente detrás de modales. */
  overlay: string;
  /** Degradado para tarjetas destacadas (hero). */
  gradient: [string, string];
  /** Paleta para avatares y series de gráficos. */
  chart: string[];
}

export interface AppTheme {
  id: ThemeId;
  nombre: string;
  descripcion: string;
  emoji: string;
  isDark: boolean;
  colors: ThemeColors;
}

export const THEMES: Record<ThemeId, AppTheme> = {
  noche_indigo: {
    id: 'noche_indigo',
    nombre: 'Noche Índigo',
    descripcion: 'El clásico de NeatHogar. Púrpura profundo y lavanda.',
    emoji: '🌙',
    isDark: true,
    colors: {
      background: '#433878',
      surface: '#1F193D',
      card: '#1F193D',
      primary: '#7E60BF',
      secondary: '#A594F9',
      textPrimary: '#FFFFFF',
      textSecondary: '#D1C4E9',
      success: '#66BB6A',
      warning: '#FFA726',
      danger: '#EF5350',
      onPrimary: '#FFFFFF',
      highlight: '#A594F9',
      onHighlight: '#1F193D',
      softBg: 'rgba(255,255,255,0.08)',
      border: 'rgba(165,148,249,0.28)',
      overlay: 'rgba(15,10,35,0.72)',
      gradient: ['#7E60BF', '#A594F9'],
      chart: ['#A594F9', '#66BB6A', '#FFA726', '#4FC3F7', '#F06292', '#FFD54F'],
    },
  },
  bosque_nocturno: {
    id: 'bosque_nocturno',
    nombre: 'Bosque Nocturno',
    descripcion: 'Pizarra oscura con esmeralda. Descanso visual.',
    emoji: '🌲',
    isDark: true,
    colors: {
      background: '#0F172A',
      surface: '#1E293B',
      card: '#1E293B',
      primary: '#10B981',
      secondary: '#38BDF8',
      textPrimary: '#F8FAFC',
      textSecondary: '#94A3B8',
      success: '#22C55E',
      warning: '#F59E0B',
      danger: '#EF4444',
      onPrimary: '#04261A',
      highlight: '#38BDF8',
      onHighlight: '#0F172A',
      softBg: 'rgba(148,163,184,0.12)',
      border: 'rgba(148,163,184,0.2)',
      overlay: 'rgba(2,6,23,0.75)',
      gradient: ['#10B981', '#38BDF8'],
      chart: ['#10B981', '#38BDF8', '#F59E0B', '#A78BFA', '#F472B6', '#FACC15'],
    },
  },
  brisa_nordica: {
    id: 'brisa_nordica',
    nombre: 'Brisa Nórdica',
    descripcion: 'Limpio y luminoso. Lavanda suave a la luz del día.',
    emoji: '❄️',
    isDark: false,
    colors: {
      background: '#F8FAFC',
      surface: '#FFFFFF',
      card: '#FFFFFF',
      primary: '#6366F1',
      secondary: '#E0E7FF',
      textPrimary: '#1E293B',
      textSecondary: '#64748B',
      success: '#16A34A',
      warning: '#D97706',
      danger: '#DC2626',
      onPrimary: '#FFFFFF',
      highlight: '#6366F1',
      onHighlight: '#FFFFFF',
      softBg: '#E0E7FF',
      border: '#E2E8F0',
      overlay: 'rgba(15,23,42,0.45)',
      gradient: ['#6366F1', '#8B5CF6'],
      chart: ['#6366F1', '#16A34A', '#D97706', '#0EA5E9', '#DB2777', '#CA8A04'],
    },
  },
  hogar_calido: {
    id: 'hogar_calido',
    nombre: 'Hogar Cálido',
    descripcion: 'Terracota y crema. Acogedor como en casa.',
    emoji: '🏡',
    isDark: false,
    colors: {
      background: '#FDFBF7',
      surface: '#F4EFE6',
      card: '#F4EFE6',
      primary: '#E07A5F',
      secondary: '#81B29A',
      textPrimary: '#3D405B',
      textSecondary: '#6B705C',
      success: '#52B788',
      warning: '#F4A261',
      danger: '#E63946',
      onPrimary: '#FFFFFF',
      highlight: '#81B29A',
      onHighlight: '#FFFFFF',
      softBg: '#EFE6D8',
      border: '#E6DCCB',
      overlay: 'rgba(61,64,91,0.45)',
      gradient: ['#E07A5F', '#F2CC8F'],
      chart: ['#E07A5F', '#81B29A', '#F2CC8F', '#3D405B', '#C97B84', '#6D98BA'],
    },
  },
};

export const THEME_LIST: AppTheme[] = Object.values(THEMES);
export const DEFAULT_THEME_ID: ThemeId = 'noche_indigo';

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === 'string' && value in THEMES;
}
