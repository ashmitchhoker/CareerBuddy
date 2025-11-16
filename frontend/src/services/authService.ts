// src/services/authService.ts
import apiClient from './api';

export const authService = {
  setup: async (userData: {
    username: string;
    password: string;
    name: string;
    grade: string;
    age?: string;
    email?: string;
    phone?: string;
  }) => {
    const response = await apiClient.post('/auth/setup', userData);
    const { access, refresh, user } = response.data;
    localStorage.setItem('access_token', access);
    localStorage.setItem('refresh_token', refresh);
    return user;
  },
  
  login: async (credentials: { username: string; password: string }) => {
    const response = await apiClient.post('/auth/login', credentials);
    const { access, refresh, user } = response.data;
    localStorage.setItem('access_token', access);
    localStorage.setItem('refresh_token', refresh);
    return user;
  },
  
  logout: async () => {
    try {
      const refresh = localStorage.getItem('refresh_token');
      if (refresh) {
        await apiClient.post('/auth/logout', { refresh });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    }
  },
  
  isAuthenticated: (): boolean => {
    return !!localStorage.getItem('access_token');
  },
  
  getToken: (): string | null => {
    return localStorage.getItem('access_token');
  },
};

