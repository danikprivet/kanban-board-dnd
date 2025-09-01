import { THEME_CONFIG, STORAGE_KEYS } from '../constants';

export const getSystemTheme = () => {
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return THEME_CONFIG.DARK;
  }
  return THEME_CONFIG.LIGHT;
};

export const getStoredTheme = () => {
  return localStorage.getItem(STORAGE_KEYS.THEME);
};

export const getInitialTheme = () => {
  const savedTheme = getStoredTheme();
  if (savedTheme) {
    return savedTheme;
  }
  return getSystemTheme();
};

export const applyTheme = (theme) => {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(STORAGE_KEYS.THEME, theme);
};

export const toggleTheme = (currentTheme) => {
  const newTheme = currentTheme === THEME_CONFIG.LIGHT 
    ? THEME_CONFIG.DARK 
    : THEME_CONFIG.LIGHT;
  return newTheme;
};

export const isDarkTheme = (theme) => theme === THEME_CONFIG.DARK;
export const isLightTheme = (theme) => theme === THEME_CONFIG.LIGHT;
