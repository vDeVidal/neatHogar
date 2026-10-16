import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppTheme, DEFAULT_THEME_ID, isThemeId, THEMES, ThemeId } from './themes';

const STORAGE_KEY = '@neathogar/tema';

type SyncFn = (id: ThemeId) => Promise<unknown> | void;

interface ThemeContextValue {
  theme: AppTheme;
  colors: AppTheme['colors'];
  themeId: ThemeId;
  ready: boolean;
  /** Cambia el tema, lo persiste en AsyncStorage y (si hay sesión) lo sincroniza con el perfil. */
  setTheme: (id: ThemeId) => void;
  /** Aplica un tema sin re-sincronizarlo con el backend (p. ej. el que viene del perfil al iniciar sesión). */
  applyRemoteTheme: (id: string | null | undefined) => void;
  /** Registra la función que sincroniza el tema con el backend (la provee SessionContext). */
  registerSync: (fn: SyncFn | null) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeId, setThemeId] = useState<ThemeId>(DEFAULT_THEME_ID);
  const [ready, setReady] = useState(false);
  const syncRef = useRef<SyncFn | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((guardado) => {
        if (isThemeId(guardado)) setThemeId(guardado);
      })
      .finally(() => setReady(true));
  }, []);

  const persist = useCallback((id: ThemeId) => {
    setThemeId(id);
    AsyncStorage.setItem(STORAGE_KEY, id).catch(() => undefined);
  }, []);

  const setTheme = useCallback(
    (id: ThemeId) => {
      persist(id);
      Promise.resolve(syncRef.current?.(id)).catch(() => undefined);
    },
    [persist],
  );

  const applyRemoteTheme = useCallback(
    (id: string | null | undefined) => {
      if (isThemeId(id)) persist(id);
    },
    [persist],
  );

  const registerSync = useCallback((fn: SyncFn | null) => {
    syncRef.current = fn;
  }, []);

  const value = useMemo<ThemeContextValue>(() => {
    const theme = THEMES[themeId];
    return { theme, colors: theme.colors, themeId, ready, setTheme, applyRemoteTheme, registerSync };
  }, [themeId, ready, setTheme, applyRemoteTheme, registerSync]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme debe usarse dentro de <ThemeProvider>');
  return ctx;
}

/** Helper para crear estilos dependientes del tema con memoización. */
export function useThemedStyles<T>(factory: (theme: AppTheme) => T): T {
  const { theme } = useTheme();
  return useMemo(() => factory(theme), [theme, factory]);
}
