import axios from 'axios';

// Configure the base URL for the admin API
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

export const adminClient = axios.create({
  baseURL: API_URL,
  withCredentials: true, // Send cookies (if using cookie-based auth)
});

// Interceptor to attach JWT token if stored in localStorage
adminClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

adminClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      // Clear token and force re-login if unauthorized/forbidden
      localStorage.removeItem('admin_token');
      // A full app reload is a simple way to clear state and hit the login guard
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
