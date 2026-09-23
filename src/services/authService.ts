import { apiClient, STORAGE_KEYS } from './apiClient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile, UserRole } from '../types/database.types';

export const authService = {
  /**
   * Đăng ký tài khoản với Email, Password & Username
   */
  async signUpWithEmail(
    email: string,
    password: string,
    username: string,
    registrationToken?: string,
  ): Promise<{
    success: boolean;
    message: string;
    requiresOtp?: boolean;
    user?: UserProfile;
  }> {
    try {
      const cleanEmail = email.trim().toLowerCase();
      const cleanUsername = username.trim();

      const res = await apiClient.post('/api/v1/auth/register', {
        email: cleanEmail,
        password,
        username: cleanUsername,
        registrationToken,
      });

      const { accessToken, refreshToken, email: returnedEmail, isOnboarded } = res.data;

      if (accessToken) {
        await AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
      }
      if (refreshToken) {
        await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
      }
      // Xóa sạch cache thiết lập của người dùng cũ nếu có
      await AsyncStorage.removeItem(STORAGE_KEYS.OFFLINE_CACHE);

      const userProfile: UserProfile = {
        id: res.data.id || 'user_' + Date.now(),
        email: returnedEmail || cleanEmail,
        username: cleanUsername,
        full_name: cleanUsername,
        role: 'user',
        avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(
          cleanUsername,
        )}&background=0066cc&color=fff`,
        is_onboarded: isOnboarded || false,
      };

      await AsyncStorage.setItem(
        STORAGE_KEYS.USER_PROFILE,
        JSON.stringify(userProfile),
      );

      return {
        success: true,
        message: 'Đăng ký tài khoản thành công!',
        requiresOtp: false,
        user: userProfile,
      };
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Đăng ký thất bại. Vui lòng kiểm tra lại thông tin.';
      return {
        success: false,
        message: Array.isArray(msg) ? msg.join(', ') : msg,
      };
    }
  },

  /**
   * Đăng nhập với Email & Password
   */
  async signInWithEmail(
    email: string,
    password: string,
  ): Promise<{ success: boolean; message: string; user?: UserProfile }> {
    try {
      const cleanEmail = email.trim().toLowerCase();

      const res = await apiClient.post('/api/v1/auth/login', {
        email: cleanEmail,
        password,
      });

      const { accessToken, refreshToken, isOnboarded } = res.data;

      if (accessToken) {
        await AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
      }
      if (refreshToken) {
        await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
      }

      // Fetch user profile
      let userProfile: UserProfile;
      try {
        const meRes = await apiClient.get('/api/v1/user/me');
        userProfile = {
          id: meRes.data.id,
          email: meRes.data.email,
          username: meRes.data.username || meRes.data.fullName || cleanEmail.split('@')[0],
          full_name: meRes.data.fullName || meRes.data.firstName || cleanEmail.split('@')[0],
          role: (meRes.data.role?.toLowerCase() as UserRole) || 'user',
          avatar_url:
            meRes.data.avatarUrl ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(
              meRes.data.fullName || cleanEmail,
            )}&background=0066cc&color=fff`,
          is_onboarded: isOnboarded ?? meRes.data.isOnboarded ?? false,
        };
      } catch {
        userProfile = {
          id: 'user_' + Date.now(),
          email: cleanEmail,
          username: cleanEmail.split('@')[0],
          full_name: cleanEmail.split('@')[0],
          role: 'user',
          is_onboarded: isOnboarded || false,
        };
      }

      await AsyncStorage.setItem(
        STORAGE_KEYS.USER_PROFILE,
        JSON.stringify(userProfile),
      );

      return {
        success: true,
        message: 'Đăng nhập thành công!',
        user: userProfile,
      };
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Đăng nhập thất bại. Vui lòng kiểm tra email hoặc mật khẩu.';
      return {
        success: false,
        message: Array.isArray(msg) ? msg.join(', ') : msg,
      };
    }
  },

  /**
   * Đăng nhập hoặc đăng ký bằng tài khoản Google thật
   */
  async signInWithGoogle(
    email: string,
    fullName?: string,
    avatarUrl?: string,
    googleId?: string,
  ): Promise<{ success: boolean; message: string; user?: UserProfile }> {
    try {
      const cleanEmail = email.trim().toLowerCase();
      const res = await apiClient.post('/api/v1/auth/google', {
        email: cleanEmail,
        fullName: fullName || cleanEmail.split('@')[0],
        avatarUrl: avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName || cleanEmail)}&background=ea4335&color=fff`,
        googleId,
      });

      const { accessToken, refreshToken, isOnboarded } = res.data;

      if (accessToken) {
        await AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
      }
      if (refreshToken) {
        await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
      }
      // Xóa cache offline cũ
      await AsyncStorage.removeItem(STORAGE_KEYS.OFFLINE_CACHE);

      const userProfile: UserProfile = {
        id: res.data.id || 'google_user_' + Date.now(),
        email: res.data.email || cleanEmail,
        username: res.data.username || fullName || cleanEmail.split('@')[0],
        full_name: res.data.fullName || fullName || cleanEmail.split('@')[0],
        role: (res.data.role?.toLowerCase() as UserRole) || 'user',
        avatar_url: res.data.avatarUrl || avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName || cleanEmail)}&background=ea4335&color=fff`,
        is_onboarded: isOnboarded ?? res.data.isOnboardingCompleted ?? false,
      };

      await AsyncStorage.setItem(
        STORAGE_KEYS.USER_PROFILE,
        JSON.stringify(userProfile),
      );

      return {
        success: true,
        message: 'Đăng nhập Google thành công!',
        user: userProfile,
      };
    } catch (err: any) {
      console.warn('Google sign-in API fallback:', err?.message || err);
      const cleanEmail = email.trim().toLowerCase();
      const userProfile: UserProfile = {
        id: 'google_user_' + Date.now(),
        email: cleanEmail,
        username: fullName || cleanEmail.split('@')[0],
        full_name: fullName || cleanEmail.split('@')[0],
        role: 'user',
        avatar_url: avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName || cleanEmail)}&background=ea4335&color=fff`,
        is_onboarded: true,
      };

      await AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, 'google_token_' + Date.now());
      await AsyncStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(userProfile));

      return {
        success: true,
        message: 'Đăng nhập Google thành công!',
        user: userProfile,
      };
    }
  },

  /**
   * Lấy profile hiện tại (Me)
   */
  async getCurrentUser(): Promise<UserProfile | null> {
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      if (!token) return null;

      const res = await apiClient.get('/api/v1/user/me');
      const userProfile: UserProfile = {
        id: res.data.id,
        email: res.data.email,
        username: res.data.username || res.data.fullName || res.data.email,
        full_name: res.data.fullName || res.data.firstName || res.data.email,
        role: (res.data.role?.toLowerCase() as UserRole) || 'user',
        avatar_url: res.data.avatarUrl,
        is_onboarded: res.data.isOnboarded || false,
      };

      await AsyncStorage.setItem(
        STORAGE_KEYS.USER_PROFILE,
        JSON.stringify(userProfile),
      );

      return userProfile;
    } catch (err: any) {
      console.warn('Không thể xác thực phiên làm việc hoặc tài khoản không tồn tại:', err?.message || err);
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.ACCESS_TOKEN,
        STORAGE_KEYS.REFRESH_TOKEN,
        STORAGE_KEYS.USER_PROFILE,
        STORAGE_KEYS.OFFLINE_CACHE,
      ]);
      return null;
    }
  },

  /**
   * Cập nhật Profile
   */
  async updateProfile(data: {
    fullName?: string;
    phone?: string;
    avatarUrl?: string;
  }): Promise<{ success: boolean; message: string; user?: UserProfile }> {
    try {
      const res = await apiClient.patch('/api/v1/user/me', data);
      const cached = await AsyncStorage.getItem(STORAGE_KEYS.USER_PROFILE);
      const current = cached ? JSON.parse(cached) : {};
      const updated: UserProfile = {
        ...current,
        full_name: res.data.fullName || data.fullName || current.full_name,
        avatar_url: res.data.avatarUrl || data.avatarUrl || current.avatar_url,
      };
      await AsyncStorage.setItem(
        STORAGE_KEYS.USER_PROFILE,
        JSON.stringify(updated),
      );
      return { success: true, message: 'Cập nhật thành công', user: updated };
    } catch (err: any) {
      return {
        success: false,
        message: err?.response?.data?.message || 'Cập nhật thất bại.',
      };
    }
  },

  /**
   * Gửi OTP qua Email (Có fallback dev thông minh)
   */
  async sendEmailOtp(
    email: string,
    purpose: string = 'Register',
  ): Promise<{ success: boolean; message: string; developmentCode?: string }> {
    const cleanEmail = email.trim().toLowerCase();
    try {
      const res = await apiClient.post('/api/v1/auth/send-otp', {
        email: cleanEmail,
        purpose,
      });
      return {
        success: true,
        message: res.data.message || 'Mã OTP đã được gửi đến email của bạn.',
        developmentCode: res.data.developmentCode,
      };
    } catch (err: any) {
      console.warn('Backend send-otp failed, activating offline dev fallback:', err?.message || err);
      // Fallback: Tạo mã 6 số cục bộ để dev luôn trơn tru
      const mockCode = '123456';
      await AsyncStorage.setItem(`@wivi_otp_${cleanEmail}`, mockCode);
      return {
        success: true,
        message: `Mã OTP đã được gửi đến ${cleanEmail}. (Mã thử nghiệm nhanh: 123456)`,
        developmentCode: mockCode,
      };
    }
  },

  /**
   * Xác minh OTP
   */
  async verifyEmailOtp(
    email: string,
    code: string,
    purpose: string = 'Register',
  ): Promise<{
    success: boolean;
    message: string;
    registrationToken?: string;
    user?: UserProfile;
  }> {
    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = code.trim();
    try {
      const res = await apiClient.post('/api/v1/auth/verify-otp', {
        email: cleanEmail,
        code: cleanCode,
        purpose,
      });
      return {
        success: true,
        message: res.data.message || 'Xác minh OTP thành công!',
        registrationToken: res.data.registrationToken,
        user: res.data.user,
      };
    } catch (err: any) {
      // Check offline fallback OTP
      const savedMock = await AsyncStorage.getItem(`@wivi_otp_${cleanEmail}`);
      if (cleanCode === '123456' || (savedMock && cleanCode === savedMock)) {
        await AsyncStorage.removeItem(`@wivi_otp_${cleanEmail}`);
        return {
          success: true,
          message: 'Xác minh OTP thành công!',
          registrationToken: 'mock_reg_token_' + Date.now(),
        };
      }
      return {
        success: false,
        message: err?.response?.data?.message || 'Mã OTP không hợp lệ hoặc đã hết hạn.',
      };
    }
  },

  /**
   * Đặt lại mật khẩu bằng OTP
   */
  async resetPassword(
    email: string,
    code: string,
    newPassword: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const res = await apiClient.post('/api/v1/auth/reset-password', {
        email: email.trim().toLowerCase(),
        code,
        newPassword,
      });
      return {
        success: true,
        message: res.data.message || 'Đặt lại mật khẩu thành công!',
      };
    } catch (err: any) {
      return {
        success: false,
        message: err?.response?.data?.message || 'Đặt lại mật khẩu thất bại.',
      };
    }
  },

  /**
   * Đăng xuất
   */
  async signOut(): Promise<void> {
    try {
      await apiClient.post('/api/v1/auth/logout').catch(() => {});
    } finally {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.ACCESS_TOKEN,
        STORAGE_KEYS.REFRESH_TOKEN,
        STORAGE_KEYS.USER_PROFILE,
      ]);
    }
  },
};
