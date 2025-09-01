import React from 'react';
import { useTheme } from '../hooks/useTheme';
import { THEME_CONFIG } from '../constants';
import './ThemeToggle.css';

export const ThemeToggle = ({ className = '', size = 'medium' }) => {
  const { theme, switchTheme, isDark } = useTheme();

  return (
    <button
      className={`theme-toggle theme-toggle--${size} ${className}`}
      onClick={switchTheme}
      aria-label={`Switch to ${isDark ? THEME_CONFIG.LIGHT : THEME_CONFIG.DARK} theme`}
      title={`Switch to ${isDark ? THEME_CONFIG.LIGHT : THEME_CONFIG.DARK} theme`}
    >
      <span className="theme-toggle__icon">
        {isDark ? '☀️' : '🌙'}
      </span>
      <span className="theme-toggle__text">
        {isDark ? 'Light' : 'Dark'} theme
      </span>
    </button>
  );
};
