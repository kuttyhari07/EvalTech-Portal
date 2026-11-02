import axios from 'axios';

// Support VITE_API_URL environment variable from Vercel / Production, or fallback to /api
const rawApiUrl = (import.meta as any).env?.VITE_API_URL;
const baseURL = rawApiUrl
  ? rawApiUrl.endsWith('/api')
    ? rawApiUrl
    : `${rawApiUrl.replace(/\/$/, '')}/api`
  : '/api';

export const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Extract standardized server error message
    const message =
      error.response?.data?.message ||
      error.response?.data?.errors?.[0]?.message ||
      error.message ||
      'An unexpected error occurred';
    
    return Promise.reject(new Error(message));
  }
);
