// src/api/client.js
import axios from 'axios';

// Configuration - FIXED: Now uses VITE_API_BASE instead of VITE_API_BASE_URL
const API_BASE_URL = import.meta.env.VITE_API_BASE || '/api';
const isDebugMode = /(?:^|[?&])debug=1(?:&|$)/.test(window.location.search);

// Utility functions
function getCookie(name) {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function getAccessToken() {
  return localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
}

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 20000,
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest'
  }
});

// Request interceptor
apiClient.interceptors.request.use((config) => {
  config.headers = config.headers || {};
  
  // Add CSRF token
  const csrfToken = getCookie('csrftoken') || getCookie('XSRF-TOKEN');
  if (csrfToken) {
    config.headers['X-CSRFToken'] = csrfToken;
  }
  
  // Add authorization token
  const accessToken = getAccessToken();
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  
  // Debug logging
  if (isDebugMode) {
    console.debug('[API] →', config.method?.toUpperCase(), config.url);
  }
  
  return config;
});

// Response interceptor
apiClient.interceptors.response.use(
  (response) => {
    if (isDebugMode) {
      console.debug('[API] ←', response.status, response.config.url);
    }
    return response;
  },
  (error) => {
    if (isDebugMode) {
      console.debug('[API] ✖', error.config?.url, error.message);
    }
    
    // Handle specific error cases
    if (error.response?.status === 404 && error.config.url.includes('/api/')) {
      console.error('API endpoint not found. Check your Netlify redirects configuration.');
    }
    
    return Promise.reject(error);
  }
);

// Auth API functions
export const authAPI = {
  signUp: (userData) => apiClient.post('/auth/signup', userData),
  login: (credentials) => apiClient.post('/auth/login', credentials),
  loginForm: (username, password) => {
    const formData = new URLSearchParams();
    formData.set('username', username);
    formData.set('password', password);
    return apiClient.post('/auth/login-form', formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
  },
  verifySession: () => apiClient.get('/auth/me'),
  // Additional utility method for checking API health
  healthCheck: () => apiClient.get('/health', { timeout: 5000 })
};

// Utility function for handling API errors consistently
export function handleApiError(error) {
  if (error.response) {
    // Server responded with error status
    const { status, data } = error.response;
    
    switch (status) {
      case 400:
        return data.detail || 'Bad request. Please check your input.';
      case 401:
        return 'Unauthorized. Please login again.';
      case 403:
        return 'Forbidden. You do not have permission.';
      case 404:
        return 'Resource not found.';
      case 409:
        return 'Conflict. Resource already exists.';
      case 422:
        return 'Validation error. Please check your input.';
      case 500:
        return 'Server error. Please try again later.';
      default:
        return data.detail || data.message || `Error: ${status}`;
    }
  } else if (error.request) {
    // Request was made but no response received
    return 'Network error. Please check your connection.';
  } else {
    // Something else happened
    return error.message || 'An unexpected error occurred.';
  }
}

export default apiClient;
