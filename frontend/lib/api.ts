import axios from "axios";
import { useAuthStore } from "../store/authStore";

const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8000",
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = useAuthStore.getState().refreshToken;
      if (!refreshToken) {
        useAuthStore.getState().clearAuth();
        return Promise.reject(error);
      }
      try {
        const res = await axios.post(
          `${api.defaults.baseURL}/api/auth/refresh`,
          { refresh_token: refreshToken }
        );
        const { access_token, refresh_token } = res.data;
        const store = useAuthStore.getState();
        store.setAuth(store.user!, access_token, refresh_token);
        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return api(originalRequest);
      } catch {
        useAuthStore.getState().clearAuth();
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  }
);

export default api;
