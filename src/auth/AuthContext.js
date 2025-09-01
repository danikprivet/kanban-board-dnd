import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { api } from '../api';

const AuthContext = createContext({
  user: null,
  token: null,
  login: async () => {},
  logout: () => {},
  refreshUser: async () => {},
  updateUser: () => {},
  isAuthenticated: false,
  isLoading: false,
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [refreshToken, setRefreshToken] = useState(() => localStorage.getItem('refreshToken'));
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  });
  const [isLoading, setIsLoading] = useState(false);

  // Update localStorage when tokens change
  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }, [token]);

  useEffect(() => {
    if (refreshToken) {
      localStorage.setItem('refreshToken', refreshToken);
    } else {
      localStorage.removeItem('refreshToken');
    }
  }, [refreshToken]);

  useEffect(() => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('user');
    }
  }, [user]);

  // Auto-refresh user data when token changes
  useEffect(() => {
    if (token && !user) {
      refreshUser();
    }
  }, [token, user]);

  async function login(email, password) {
    setIsLoading(true);
    
    try {
      const response = await api.post('/auth/login', { email, password });
      
      if (response.success) {
        const { token: newToken, user: userData } = response.data;
        
        // Store tokens
        console.log('Setting token:', newToken.substring(0, 20) + '...');
        setToken(newToken);
        setUser(userData);
        
        // Store refresh token if provided
        if (response.data.refreshToken) {
          setRefreshToken(response.data.refreshToken);
        }
        
        // Update theme immediately
        if (userData.theme) {
          document.documentElement.setAttribute('data-theme', userData.theme);
          localStorage.setItem('theme', userData.theme);
        }
        
        return userData;
      } else {
        throw new Error(response.error || 'Ошибка входа');
      }
    } catch (error) {
      // Handle different error formats
      let errorMessage = 'Ошибка входа';
      
      if (error.message) {
        errorMessage = error.message;
      } else if (error.error) {
        errorMessage = error.error;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      // Log error details for debugging
      console.error('Login error:', error);
      
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }

  function logout() {
    setToken(null);
    setRefreshToken(null);
    setUser(null);
    
    // Clear theme
    document.documentElement.removeAttribute('data-theme');
    localStorage.removeItem('theme');
  }

  const refreshUser = useCallback(async () => {
    if (!token) return;
    
    try {
      const response = await api.get('/auth/me');
      
      if (response.success) {
        const userData = response.data;
        setUser(userData);
        
        // Update theme if changed
        if (userData.theme) {
          document.documentElement.setAttribute('data-theme', userData.theme);
          localStorage.setItem('theme', userData.theme);
        }
        
        return userData;
      } else {
        // If refresh fails, logout user
        logout();
        throw new Error(response.error || 'Failed to refresh user');
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
      
      // If it's an authentication error, logout user
      if (error.status === 401) {
        logout();
      }
      
      throw error;
    }
  }, [token]);

  const updateUser = useCallback((updates) => {
    setUser(prevUser => {
      if (!prevUser) return prevUser;
      const updatedUser = { ...prevUser, ...updates };
      
      // Update theme immediately if changed
      if (updates.theme && updates.theme !== prevUser.theme) {
        document.documentElement.setAttribute('data-theme', updates.theme);
        localStorage.setItem('theme', updates.theme);
      }
      
      return updatedUser;
    });
  }, []);

  // Check if user is authenticated
  const isAuthenticated = useMemo(() => {
    return !!(token && user);
  }, [token, user]);

  const value = useMemo(() => ({ 
    token, 
    user, 
    login, 
    logout, 
    refreshUser, 
    updateUser,
    isAuthenticated,
    isLoading
  }), [token, user, refreshUser, updateUser, isAuthenticated, isLoading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function ProtectedRoute({ children, allowRoles, fallback = null }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  
  // Show loading state
  if (isLoading) {
    return fallback || <div>Loading...</div>;
  }
  
  // Check authentication
  if (!isAuthenticated || !user) {
    return fallback || <div>Please log in to access this page.</div>;
  }
  
  // Check role permissions
  if (allowRoles && !allowRoles.includes(user.role)) {
    return fallback || <div>Access denied. Insufficient permissions.</div>;
  }
  
  return children;
}

// Hook for role-based access control
export function useRole(requiredRole) {
  const { user } = useAuth();
  return user?.role === requiredRole;
}

// Hook for checking if user has any of the required roles
export function useRoles(requiredRoles) {
  const { user } = useAuth();
  return requiredRoles.includes(user?.role);
}
