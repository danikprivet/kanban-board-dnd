import { useState, useEffect, useCallback } from 'react';
import { THEME_CONFIG } from '../constants';
import { getInitialTheme, applyTheme, toggleTheme } from '../utils/theme';
import { storage } from '../utils/storage';

export const useTheme = () => {
  const [theme, setThemeState] = useState(getInitialTheme);

  useEffect(() => {
    applyTheme(theme);
    storage.setTheme(theme);
  }, [theme]);

  const setTheme = useCallback((newTheme) => {
    if (newTheme === THEME_CONFIG.LIGHT || newTheme === THEME_CONFIG.DARK) {
      setThemeState(newTheme);
    }
  }, []);

  const switchTheme = useCallback(() => {
    setThemeState(prevTheme => toggleTheme(prevTheme));
  }, []);

  const isDark = theme === THEME_CONFIG.DARK;
  const isLight = theme === THEME_CONFIG.LIGHT;

  return {
    theme,
    setTheme,
    switchTheme,
    isDark,
    isLight,
  };
};
