import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile, UserRole } from '../types/database.types';
import { authService } from '../services/authService';

const AUTH_STORAGE_KEY = '@wivi_user_session';

interface AuthContextType {
  user: UserProfile | null;
  role: UserRole;
  isAdmin: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  loginWithEmail: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
  registerWithEmail: (email: string, password: string, fullName: string) => Promise<{ success: boolean; message: string; requiresOtp?: boolean }>;
  sendOtp: (email: string) => Promise<{ success: boolean; message: string }>;
  verifyOtp: (email: string, code: string) => Promise<{ success: boolean; message: string }>;
  loginWithGoogle: () => Promise<{ success: boolean; message: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Phục hồi session khi ứng dụng mở lại
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const storedUserJson = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
        if (storedUserJson) {
          const parsedUser: UserProfile = JSON.parse(storedUserJson);
          setUser(parsedUser);
        }
      } catch (err) {
        console.warn('Lỗi phục hồi phiên làm việc:', err);
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, []);

  // Lưu User Session
  const saveUserSession = async (userProfile: UserProfile) => {
    setUser(userProfile);
    try {
      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(userProfile));
    } catch (err) {
      console.warn('Lỗi lưu phiên làm việc:', err);
    }
  };

  // Đăng nhập Email
  const loginWithEmail = async (email: string, password: string) => {
    setIsLoading(true);
    const result = await authService.signInWithEmail(email, password);
    setIsLoading(false);

    if (result.success && result.user) {
      await saveUserSession(result.user);
    }
    return { success: result.success, message: result.message };
  };

  // Đăng ký Email
  const registerWithEmail = async (email: string, password: string, fullName: string) => {
    return await authService.signUpWithEmail(email, password, fullName);
  };

  // Gửi OTP
  const sendOtp = async (email: string) => {
    return await authService.sendEmailOtp(email);
  };

  // Xác minh OTP
  const verifyOtp = async (email: string, code: string) => {
    setIsLoading(true);
    const result = await authService.verifyEmailOtp(email, code);
    setIsLoading(false);

    if (result.success && result.user) {
      await saveUserSession(result.user);
    }
    return { success: result.success, message: result.message };
  };

  // Đăng nhập Google
  const loginWithGoogle = async () => {
    setIsLoading(true);
    const result = await authService.signInWithGoogle();
    setIsLoading(false);

    if (result.success && result.user) {
      await saveUserSession(result.user);
    }
    return { success: result.success, message: result.message };
  };

  // Đăng xuất
  const logout = async () => {
    setIsLoading(true);
    await authService.signOut();
    setUser(null);
    try {
      await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
    } catch (err) {
      console.warn('Lỗi xóa kho session:', err);
    } finally {
      setIsLoading(false);
    }
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
        loginWithGoogle,
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
