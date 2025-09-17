# Unda faili mpya yenye code sahihi
@'
// src/api/client.js
import axios from "axios";

// Configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";
const isDebugMode = /(?:^|[?&])debug=1(?:&|$)/.test(window.location.search);

// Utility functions
function getCookie(name) {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function getAccessToken() {
  return localStorage.getItem("access_token") || sessionStorage.getItem("access_token");
}

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 20000,
  headers: {
    "Accept": "application/json",
    "Content-Type": "application/json",
    "X-Requested-With": "XMLHttpRequest"
  }
});

// Request interceptor
apiClient.interceptors.request.use((config) => {
  config.headers = config.headers || {};
  
  // Add CSRF token
  const csrfToken = getCookie("csrftoken") || getCookie("XSRF-TOKEN");
  if (csrfToken) {
    config.headers["X-CSRFToken"] = csrfToken;
  }
  
  // Add authorization token
  const accessToken = getAccessToken();
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  
  // Debug logging
  if (isDebugMode) {
    console.debug("[API] →", config.method?.toUpperCase(), config.url);
  }
  
  return config;
});

// Response interceptor
apiClient.interceptors.response.use(
  (response) => {
    if (isDebugMode) {
      console.debug("[API] ←", response.status, response.config.url);
    }
    return response;
  },
  (error) => {
    if (isDebugMode) {
      console.debug("[API] ✖", error.config?.url, error.message);
    }
    return Promise.reject(error);
  }
);

// Auth API functions
export const authAPI = {
  signUp: (userData) => apiClient.post("/auth/signup", userData),
  login: (credentials) => apiClient.post("/auth/login", credentials),
  loginForm: (username, password) => {
    const formData = new URLSearchParams();
    formData.set("username", username);
    formData.set("password", password);
    return apiClient.post("/auth/login-form", formData, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" }
    });
  },
  verifySession: () => apiClient.get("/auth/me")
};

export default apiClient;
'@ | Out-File -FilePath "client.js" -Encoding UTF8

Write-Host "✅ Faili mpya ya API client imeundwa kwa syntax sahihi" -ForegroundColor Green
