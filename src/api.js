// API configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000';

// API response wrapper
class ApiResponse {
  constructor(success, data, error = null) {
    this.success = success;
    this.data = data;
    this.error = error;
  }

  static success(data) {
    return new ApiResponse(true, data);
  }

  static error(error) {
    return new ApiResponse(false, null, error);
  }
}

// Enhanced API client with error handling and response formatting
export async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('token');
  const refreshToken = localStorage.getItem('refreshToken');
  
  const url = path.startsWith('http') ? path : `${API_BASE_URL}${path}`;
  
  const headers = { ...(options.headers || {}) };
  
  // Не устанавливаем Content-Type для FormData, браузер сам установит
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  
  if (token) {
    headers.Authorization = `Bearer ${token}`;
    console.log('API Request with token:', path, token.substring(0, 20) + '...');
  } else {
    console.log('API Request without token:', path);
  }
  
  try {
    const response = await fetch(url, { 
      ...options, 
      headers,
      credentials: 'include'
    });
    
    // Handle token refresh if needed
    if (response.status === 401 && refreshToken) {
      const refreshed = await refreshAccessToken(refreshToken);
      if (refreshed) {
        // Retry the original request with new token
        headers.Authorization = `Bearer ${localStorage.getItem('token')}`;
        const retryResponse = await fetch(url, { ...options, headers });
        return await handleResponse(retryResponse);
      }
    }
    
    return await handleResponse(response);
  } catch (error) {
    console.error('API request failed:', error);
    return ApiResponse.error(error.message || 'Network error');
  }
}

// Handle API response and format it consistently
async function handleResponse(response) {
  try {
    const data = await response.json();
    
    if (!response.ok) {
      // Handle different error formats from new backend
      const errorMessage = data.error || data.message || `HTTP ${response.status}`;
      const error = new Error(errorMessage);
      error.status = response.status;
      error.details = data.details || data;
      
      // Log error details in development
      if (process.env.NODE_ENV === 'development') {
        console.error('API Error:', {
          status: response.status,
          message: errorMessage,
          details: data
        });
      }
      
      return ApiResponse.error(error);
    }
    
    // Handle new response format: { success: boolean, data: any }
    if (data.hasOwnProperty('success') && data.hasOwnProperty('data')) {
      return data.success ? ApiResponse.success(data.data) : ApiResponse.error(data.error || 'Request failed');
    }
    
    // Handle legacy response format (backward compatibility)
    return ApiResponse.success(data);
  } catch (parseError) {
    console.error('Failed to parse API response:', parseError);
    return ApiResponse.error('Invalid response format');
  }
}

// Refresh access token using refresh token
async function refreshAccessToken(refreshToken) {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
      credentials: 'include'
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.success && data.data) {
        localStorage.setItem('token', data.data.token);
        if (data.data.refreshToken) {
          localStorage.setItem('refreshToken', data.data.refreshToken);
        }
        return true;
      }
    }
    
    // Clear invalid tokens
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    return false;
  } catch (error) {
    console.error('Token refresh failed:', error);
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    return false;
  }
}

// Convenience methods for common HTTP operations
export const api = {
  // GET request
  get: (path, options = {}) => apiFetch(path, { ...options, method: 'GET' }),
  
  // POST request
  post: (path, data, options = {}) => {
    // Если data уже FormData, не преобразуем в JSON
    const body = data instanceof FormData ? data : JSON.stringify(data);
    return apiFetch(path, {
      ...options,
      method: 'POST',
      body
    });
  },
  
  // PUT request
  put: (path, data, options = {}) => apiFetch(path, {
    ...options,
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  
  // DELETE request
  delete: (path, options = {}) => apiFetch(path, { ...options, method: 'DELETE' }),
  
  // PATCH request
  patch: (path, data, options = {}) => apiFetch(path, {
    ...options,
    method: 'PATCH',
    body: JSON.stringify(data)
  })
};

// Legacy compatibility - maintain old function signature
export { apiFetch as default };