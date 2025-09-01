import { STORAGE_KEYS } from '../constants';

class StorageManager {
  constructor() {
    this.isAvailable = this.checkAvailability();
  }

  checkAvailability() {
    try {
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (e) {
      return false;
    }
  }

  setItem(key, value) {
    if (!this.isAvailable) {
      console.warn('localStorage is not available');
      return false;
    }

    try {
      const serializedValue = typeof value === 'object' 
        ? JSON.stringify(value) 
        : String(value);
      localStorage.setItem(key, serializedValue);
      return true;
    } catch (error) {
      console.error('Error saving to localStorage:', error);
      return false;
    }
  }

  getItem(key, defaultValue = null) {
    if (!this.isAvailable) {
      return defaultValue;
    }

    try {
      const item = localStorage.getItem(key);
      if (item === null) {
        return defaultValue;
      }

      // Try to parse as JSON, fallback to string
      try {
        return JSON.parse(item);
      } catch {
        return item;
      }
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return defaultValue;
    }
  }

  removeItem(key) {
    if (!this.isAvailable) {
      return false;
    }

    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error('Error removing from localStorage:', error);
      return false;
    }
  }

  clear() {
    if (!this.isAvailable) {
      return false;
    }

    try {
      localStorage.clear();
      return true;
    } catch (error) {
      console.error('Error clearing localStorage:', error);
      return false;
    }
  }

  // Convenience methods for common operations
  getToken() {
    return this.getItem(STORAGE_KEYS.TOKEN);
  }

  setToken(token) {
    return this.setItem(STORAGE_KEYS.TOKEN, token);
  }

  removeToken() {
    return this.removeItem(STORAGE_KEYS.TOKEN);
  }

  getUser() {
    return this.getItem(STORAGE_KEYS.USER);
  }

  setUser(user) {
    return this.setItem(STORAGE_KEYS.USER, user);
  }

  removeUser() {
    return this.removeItem(STORAGE_KEYS.USER);
  }

  getTheme() {
    return this.getItem(STORAGE_KEYS.THEME);
  }

  setTheme(theme) {
    return this.setItem(STORAGE_KEYS.THEME, theme);
  }
}

export const storage = new StorageManager();
