import { useState, useCallback } from 'react';
import { useAuthStore } from '../store/authStore';
import { API_BASE_URL } from '../config/supabase';
import toast from 'react-hot-toast';

interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: any;
  requireAuth?: boolean;
}

export const useApi = () => {
  const [loading, setLoading] = useState(false);
  const { token, logout } = useAuthStore();

  const request = useCallback(async (
    endpoint: string,
    options: ApiOptions = {}
  ) => {
    const {
      method = 'GET',
      body,
      requireAuth = true
    } = options;

    setLoading(true);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (requireAuth && token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method,
        headers,
        ...(body && { body: JSON.stringify(body) }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          logout();
          toast.error('Session expired. Please login again.');
          return;
        }
        throw new Error(data.error || 'Request failed');
      }

      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [token, logout]);

  return { request, loading };
};