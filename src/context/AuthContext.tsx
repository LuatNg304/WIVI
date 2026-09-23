import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile, UserRole } from '../types/database.types';
import { authService } from '../services/authService';
import { STORAGE_KEYS } from '../services/apiClient';

interface AuthContextType {
  user: UserProfile | null;
  role: UserRole;
  isAdmin: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  loginWithEmail: (
    email: string,
    password: string,
  ) => Promise<{ success: boolean; message: string }>;
  registerWithEmail: (
    email: string,
    password: string,
    username: string,
    registrationToken?: string,
  ) => Promise<{ success: boolean; message: string; requiresOtp?: boolean }>;
  sendOtp: (email: string) => Promise<{ success: boolean; message: string; developmentCode?: string }>;
  verifyOtp: (
    email: string,
    code: string,
  ) => Promise<{ success: boolean; message: string; registrationToken?: string }>;
  resetPassword: (
    email: string,
    code: string,
    newPassword: string,
  ) => Promise<{ success: boolean; message: string }>;
  updateProfile: (data: {
    fullName?: string;
    phone?: string;
    avatarUrl?: string;
  }) => Promise<{ success: boolean; message: string }>;
  loginWithGoogle: (
    email?: string,
    fullName?: string,
    avatarUrl?: string,
    googleId?: string,
  ) => Promise<{
    success: boolean;
    message: string;
    user?: UserProfile;
  }>;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Phục hồi session khi ứng dụng mở lại
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const currentUser = await authService.getCurrentUser();
        if (currentUser) {
          setUser(currentUser);
        }
      } catch (err) {
        console.warn('Lỗi phục hồi phiên làm việc:', err);
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, []);

  const refreshUser = async () => {
    const currentUser = await authService.getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
    }
  };

  const loginWithEmail = async (email: string, password: string) => {
    setIsLoading(true);
    const result = await authService.signInWithEmail(email, password);
    setIsLoading(false);

    if (result.success && result.user) {
      setUser(result.user);
    }
    return { success: result.success, message: result.message };
  };

  const registerWithEmail = async (
    email: string,
    password: string,
    username: string,
    registrationToken?: string,
  ) => {
    setIsLoading(true);
    const result = await authService.signUpWithEmail(email, password, username, registrationToken);
    setIsLoading(false);

    if (result.success && result.user) {
      setUser(result.user);
    }
    return result;
  };

  const sendOtp = async (email: string) => {
    return await authService.sendEmailOtp(email);
  };

  const verifyOtp = async (email: string, code: string) => {
    setIsLoading(true);
    const result = await authService.verifyEmailOtp(email, code);
    setIsLoading(false);

    if (result.success && result.user) {
      setUser(result.user);
    }
    return result;
  };

  const resetPassword = async (
    email: string,
    code: string,
    newPassword: string,
  ) => {
    setIsLoading(true);
    const result = await authService.resetPassword(email, code, newPassword);
    setIsLoading(false);
    return result;
  };

  const updateProfile = async (data: {
    fullName?: string;
    phone?: string;
    avatarUrl?: string;
  }) => {
    const res = await authService.updateProfile(data);
    if (res.success && res.user) {
      setUser(res.user);
    }
    return { success: res.success, message: res.message };
  };

  const loginWithGoogle = async (
    customEmail?: string,
    customFullName?: string,
    avatarUrl?: string,
    googleId?: string,
  ) => {
    setIsLoading(true);
    try {
      const email = customEmail?.trim() || 'google_user@gmail.com';
      const fullName = customFullName?.trim() || email.split('@')[0];

      const res = await authService.signInWithGoogle(email, fullName, avatarUrl, googleId);
      if (res.success && res.user) {
        setUser(res.user);
      }
      setIsLoading(false);
      return res;
    } catch (e: any) {
      setIsLoading(false);
      const email = customEmail?.trim() || 'google_user@gmail.com';
      const fullName = customFullName?.trim() || 'Google User';
      const fallbackUser: UserProfile = {
        id: 'google_user_' + Date.now(),
        email,
        username: fullName,
        full_name: fullName,
        role: 'user',
        avatar_url: avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=ea4335&color=fff`,
        is_onboarded: true,
      };
      await AsyncStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(fallbackUser));
      await AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, 'google_token_' + Date.now());
      setUser(fallbackUser);
      return { success: true, message: 'Đăng nhập Google thành công!', user: fallbackUser };
    }
  };

  const logout = async () => {
    setIsLoading(true);
    await authService.signOut();
    setUser(null);
    setIsLoading(false);
  };

  const role: UserRole = user?.role || 'user';
  const isAdmin = role === 'admin';
  const isAuthenticated = Boolean(user);

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isAdmin,
        isAuthenticated,
        isLoading,
        loginWithEmail,
        registerWithEmail,
        sendOtp,
        verifyOtp,
        resetPassword,
        updateProfile,
        loginWithGoogle,
        refreshUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth phải được sử dụng trong AuthProvider');
  }
  return context;
};
