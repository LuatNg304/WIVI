import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

export const getBaseUrl = (): string => {
  const envUrl = process.env.EXPO_PUBLIC_NEST_API_URL;
  if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
    return envUrl;
  }

  // Khi chạy trên điện thoại thật (iOS / Android qua Expo Go)
  if (Platform.OS !== 'web') {
    const hostUri =
      Constants.expoConfig?.hostUri ||
      (Constants as any).manifest?.debuggerHost ||
      (Constants as any).manifest2?.extra?.expoClient?.hostUri;
    if (hostUri) {
      const ip = hostUri.split(':')[0];
      return `http://${ip}:3000`;
    }
  }

  return 'http://localhost:3000';
};

export const API_BASE_URL = getBaseUrl();

export const STORAGE_KEYS = {
  ACCESS_TOKEN: '@wivi_access_token',
  REFRESH_TOKEN: '@wivi_refresh_token',
  USER_PROFILE: '@wivi_user_profile',
  OFFLINE_CACHE: '@wivi_offline_cache',
};

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Request Interceptor: Attach Access Token
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      console.warn('Error retrieving token from storage:', e);
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response Interceptor: Auto Refresh Token on 401
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/login') &&
      !originalRequest.url?.includes('/auth/register') &&
      !originalRequest.url?.includes('/auth/refresh')
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = await AsyncStorage.getItem(
          STORAGE_KEYS.REFRESH_TOKEN,
        );
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        const refreshRes = await axios.post(
          `${API_BASE_URL}/api/v1/auth/refresh`,
          { refreshToken },
        );

        const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
          refreshRes.data;

        await AsyncStorage.setItem(
          STORAGE_KEYS.ACCESS_TOKEN,
          newAccessToken,
        );
        if (newRefreshToken) {
          await AsyncStorage.setItem(
            STORAGE_KEYS.REFRESH_TOKEN,
            newRefreshToken,
          );
        }

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        }

        processQueue(null, newAccessToken);
        return apiClient(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr as Error, null);
        // Clear session on unrecoverable auth error
        await AsyncStorage.multiRemove([
          STORAGE_KEYS.ACCESS_TOKEN,
          STORAGE_KEYS.REFRESH_TOKEN,
          STORAGE_KEYS.USER_PROFILE,
        ]);
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);
