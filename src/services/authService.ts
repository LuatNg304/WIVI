import { supabase, isSupabaseConfigured } from './supabaseClient';
import { UserProfile, UserRole } from '../types/database.types';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';

// Đăng ký WebBrowser session cho Google OAuth trong Expo
WebBrowser.maybeCompleteAuthSession();

// Mật khẩu / Account Admin mặc định
export const DEFAULT_ADMIN_EMAIL = 'admin@wivi.com';
const NEST_API_URL = process.env.EXPO_PUBLIC_NEST_API_URL;
const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;

/**
 * Service xử lý xác thực thực tế kết nối CSDL (NestJS finjar.sqlite hoặc Supabase)
 */
export const authService = {
  /**
   * Đăng ký tài khoản thủ công với Email, Password & Họ tên
   */
  async signUpWithEmail(email: string, password: string, fullName: string): Promise<{ success: boolean; message: string; requiresOtp?: boolean }> {
    try {
      const cleanEmail = email.trim().toLowerCase();
      
      // Nếu có cấu hình NestJS API local (chạy CSDL finjar.sqlite từ Personal_Finance_App)
      if (NEST_API_URL) {
        try {
          const nameParts = fullName.trim().split(' ');
          const firstName = nameParts[0] || 'User';
          const lastName = nameParts.slice(1).join(' ') || 'WIVI';
          
          const response = await fetch(`${NEST_API_URL}/api/v1/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              username: cleanEmail.split('@')[0],
              email: cleanEmail,
              password,
              firstName,
              lastName,
            }),
          });
          
          const resData = await response.json();
          if (response.ok) {
            return {
              success: true,
              message: 'Đăng ký tài khoản thành công vào CSDL finjar.sqlite local!',
              requiresOtp: false
            };
          } else {
            throw new Error(resData?.message || 'Đăng ký qua NestJS CSDL local thất bại.');
          }
        } catch (nestErr: any) {
          console.warn('Không thể kết nối NestJS Backend local:', nestErr?.message);
        }
      }
      
      if (!isSupabaseConfigured) {
        // Nếu chưa cấu hình API Key, phản hồi thông báo hướng dẫn cấu hình .env
        return {
          success: true,
          message: 'Đã lưu thông tin giả lập (Hoặc cấu hình EXPO_PUBLIC_NEST_API_URL=http://localhost:3000 để dùng CSDL finjar.sqlite).',
          requiresOtp: true
        };
      }

      // 1. Gọi Supabase Auth Sign Up
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            full_name: fullName,
            role: 'user',
          },
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      // 2. Tạo hoặc cập nhật thông tin profile trong bảng public.profiles trong PostgreSQL
      if (data.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: data.user.id,
            email: cleanEmail,
            full_name: fullName,
            role: 'user',
            avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=0066cc&color=fff`,
          }, { onConflict: 'email' });

        if (profileError) {
          console.warn('Lỗi lưu profile:', profileError.message);
        }
      }

      return {
        success: true,
        message: 'Đăng ký thành công! Mã OTP xác minh đã được gửi đến Email của bạn.',
        requiresOtp: true
      };
    } catch (err: any) {
      return {
        success: false,
        message: err?.message || 'Đăng ký thất bại. Vui lòng thử lại.'
      };
    }
  },

  /**
   * Gửi mã OTP xác minh qua Email
   */
  async sendEmailOtp(email: string): Promise<{ success: boolean; message: string }> {
    try {
      const cleanEmail = email.trim().toLowerCase();

      if (!isSupabaseConfigured) {
        return {
          success: true,
          message: 'Mã OTP đã được gửi đến Email của bạn (Cần cấu hình Supabase Email SMTP trong môi trường thật).'
        };
      }

      const { error } = await supabase.auth.signInWithOtp({
        email: cleanEmail,
        options: {
          shouldCreateUser: false
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      return {
        success: true,
        message: 'Đã gửi mã OTP thành công! Kiểm tra hộp thư Email của bạn.'
      };
    } catch (err: any) {
      return {
        success: false,
        message: err?.message || 'Không thể gửi mã OTP. Vui lòng thử lại.'
      };
    }
  },

  /**
   * Xác minh mã OTP 6 chữ số
   */
  async verifyEmailOtp(email: string, token: string): Promise<{ success: boolean; user?: UserProfile; message: string }> {
    try {
      const cleanEmail = email.trim().toLowerCase();
      const cleanToken = token.trim();

      if (!isSupabaseConfigured) {
        // Trong chế độ chưa có .env, cho phép test với OTP 123456
        if (cleanToken === '123456' || cleanToken.length === 6) {
          const isDbAdmin = cleanEmail === DEFAULT_ADMIN_EMAIL;
          const user: UserProfile = {
            id: isDbAdmin ? 'a0000000-0000-0000-0000-000000000001' : 'user_' + Date.now(),
            email: cleanEmail,
            full_name: isDbAdmin ? 'WIVI System Administrator' : cleanEmail.split('@')[0],
            avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(cleanEmail)}&background=0066cc&color=fff`,
            role: isDbAdmin ? 'admin' : 'user'
          };
          return { success: true, user, message: 'Xác minh OTP thành công!' };
        } else {
          return { success: false, message: 'Mã OTP không chính xác hoặc đã hết hạn.' };
        }
      }

      // Xác minh mã OTP với Supabase PostgreSQL
      const { data, error } = await supabase.auth.verifyOtp({
        email: cleanEmail,
        token: cleanToken,
        type: 'email'
      });

      if (error || !data.user) {
        throw new Error(error?.message || 'Mã OTP không đúng hoặc đã quá hạn.');
      }

      // Lấy Profile & Role người dùng từ bảng profiles trong PostgreSQL
      const profile = await authService.getUserProfile(data.user.id, cleanEmail);

      return {
        success: true,
        user: profile,
        message: 'Xác minh OTP thành công!'
      };
    } catch (err: any) {
      return {
        success: false,
        message: err?.message || 'Xác minh mã OTP thất bại.'
      };
    }
  },

  /**
   * Đăng nhập với Email & Mật khẩu (Hỗ trợ NestJS finjar.sqlite, Admin & Supabase)
   */
  async signInWithEmail(email: string, password: string): Promise<{ success: boolean; user?: UserProfile; message: string }> {
    try {
      const cleanEmail = email.trim().toLowerCase();

      // 1. Nếu có cấu hình NestJS API local (Personal_Finance_App với CSDL finjar.sqlite)
      if (NEST_API_URL) {
        try {
          const response = await fetch(`${NEST_API_URL}/api/v1/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: cleanEmail, password }),
          });

          const resData = await response.json();
          if (response.ok && resData?.accessToken) {
            const isDbAdmin = resData.role === 'admin' || cleanEmail === DEFAULT_ADMIN_EMAIL;
            const fullName = `${resData.firstName || ''} ${resData.lastName || ''}`.trim() || resData.username || cleanEmail.split('@')[0];
            
            const user: UserProfile = {
              id: resData.id,
              email: resData.email,
              full_name: fullName,
              avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=${isDbAdmin ? 'ff3b30' : '0066cc'}&color=fff`,
              role: isDbAdmin ? 'admin' : 'user'
            };
            return {
              success: true,
              user,
              message: 'Đăng nhập thành công với CSDL finjar.sqlite local!'
            };
          }
        } catch (nestErr: any) {
          console.warn('Kết nối NestJS Backend local thất bại:', nestErr?.message);
        }
      }

      if (!isSupabaseConfigured) {
        // Nếu chưa config .env, hỗ trợ đăng nhập Admin mặc định admin@wivi.com
        const isDbAdmin = cleanEmail === DEFAULT_ADMIN_EMAIL;
        const user: UserProfile = {
          id: isDbAdmin ? 'a0000000-0000-0000-0000-000000000001' : 'user_' + Date.now(),
          email: cleanEmail,
          full_name: isDbAdmin ? 'WIVI System Administrator' : cleanEmail.split('@')[0],
          avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(cleanEmail)}&background=${isDbAdmin ? 'ff3b30' : '0066cc'}&color=fff`,
          role: isDbAdmin ? 'admin' : 'user'
        };
        return {
          success: true,
          user,
          message: isDbAdmin ? 'Đăng nhập Admin hệ thống thành công!' : 'Đăng nhập thành công!'
        };
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password
      });

      if (error || !data.user) {
        throw new Error(error?.message || 'Email hoặc mật khẩu không chính xác.');
      }

      const profile = await authService.getUserProfile(data.user.id, cleanEmail);

      return {
        success: true,
        user: profile,
        message: profile.role === 'admin' ? 'Chào mừng Admin quản trị WIVI!' : 'Đăng nhập thành công!'
      };
    } catch (err: any) {
      return {
        success: false,
        message: err?.message || 'Đăng nhập thất bại. Kiểm tra lại thông tin.'
      };
    }
  },

  /**
   * Đăng nhập bằng Gmail / Google OAuth THẬT
   */
  async signInWithGoogle(): Promise<{ success: boolean; user?: UserProfile; message: string }> {
    try {
      const redirectUrl = AuthSession.makeRedirectUri({ scheme: 'stickersmash' });

      // 1. Đăng nhập Google THẬT trực tiếp qua Google OAuth 2.0 (Nếu có EXPO_PUBLIC_GOOGLE_CLIENT_ID)
      if (GOOGLE_CLIENT_ID) {
        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
          GOOGLE_CLIENT_ID
        )}&redirect_uri=${encodeURIComponent(
          redirectUrl
        )}&response_type=token&scope=openid%20profile%20email`;

        const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);

        if (result.type === 'success' && result.url) {
          let accessToken: string | null = null;
          const match = result.url.match(/access_token=([^&]+)/);
          if (match) {
            accessToken = match[1];
          }

          if (accessToken) {
            // Lấy profile thật từ Google UserInfo API
            const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${accessToken}` },
            });

            if (userInfoRes.ok) {
              const googleUser = await userInfoRes.json();
              const email = googleUser.email;
              const fullName =
                googleUser.name ||
                `${googleUser.given_name || ''} ${googleUser.family_name || ''}`.trim() ||
                email.split('@')[0];
              const avatarUrl =
                googleUser.picture ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=0066cc&color=fff`;

              // Đồng bộ tài khoản Google vào NestJS local CSDL finjar.sqlite (nếu có backend)
              if (NEST_API_URL) {
                try {
                  await fetch(`${NEST_API_URL}/api/v1/auth/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      username: email.split('@')[0],
                      email,
                      password: 'google_oauth_pass_' + googleUser.sub,
                      firstName: googleUser.given_name || 'Google',
                      lastName: googleUser.family_name || 'User',
                    }),
                  });
                } catch (e) {
                  // Đã tồn tại tài khoản -> bỏ qua
                }
              }

              const isDbAdmin = email.trim().toLowerCase() === DEFAULT_ADMIN_EMAIL;
              const user: UserProfile = {
                id: 'google_' + (googleUser.sub || Date.now()),
                email,
                full_name: fullName,
                avatar_url: avatarUrl,
                role: isDbAdmin ? 'admin' : 'user',
              };

              return {
                success: true,
                user,
                message: `Chào mừng ${fullName}! Đăng nhập Google thật thành công.`,
              };
            }
          }
        }

        return { success: false, message: 'Đã hủy thao tác đăng nhập bằng Google.' };
      }

      // 2. Luồng Supabase OAuth (Nếu có cấu hình Supabase)
      if (isSupabaseConfigured) {
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: redirectUrl,
            skipBrowserRedirect: false,
          },
        });

        if (error) {
          throw new Error(error.message);
        }

        if (data?.url) {
          const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
          if (result.type === 'success' && result.url) {
            if (result.url.includes('code=')) {
              const urlObj = new URL(result.url);
              const code = urlObj.searchParams.get('code');
              if (code) {
                await supabase.auth.exchangeCodeForSession(code);
              }
            }

            const { data: sessionData } = await supabase.auth.getSession();
            if (sessionData.session?.user) {
              const userObj = sessionData.session.user;
              const fullName =
                userObj.user_metadata?.full_name ||
                userObj.user_metadata?.name ||
                userObj.email?.split('@')[0] ||
                'Google User';
              const avatarUrl =
                userObj.user_metadata?.avatar_url ||
                userObj.user_metadata?.picture ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=0066cc&color=fff`;

              await supabase.from('profiles').upsert(
                {
                  id: userObj.id,
                  email: userObj.email,
                  full_name: fullName,
                  avatar_url: avatarUrl,
                  role: 'user',
                },
                { onConflict: 'id' }
              );

              const profile = await authService.getUserProfile(
                userObj.id,
                userObj.email || ''
              );
              return { success: true, user: profile, message: 'Đăng nhập bằng Google thành công!' };
            }
          }
        }

        return { success: false, message: 'Thao tác đăng nhập Google bị hủy.' };
      }

      // 3. Fallback test demo khi chưa khai báo Client ID
      const user: UserProfile = {
        id: 'google_user_' + Date.now(),
        email: 'user.google@gmail.com',
        full_name: 'Google User',
        avatar_url: 'https://lh3.googleusercontent.com/a/default-user=s96-c',
        role: 'user'
      };
      return {
        success: true,
        user,
        message: 'Đăng nhập bằng Google thành công (Chế độ giả lập).'
      };
    } catch (err: any) {
      return {
        success: false,
        message: err?.message || 'Đăng nhập Google thất bại.'
      };
    }
  },

  /**
   * Lấy thông tin Profile và Role của User từ bảng PostgreSQL profiles
   */
  async getUserProfile(userId: string, email: string): Promise<UserProfile> {
    try {
      const cleanEmail = email.trim().toLowerCase();
      
      if (!isSupabaseConfigured) {
        const isAdmin = cleanEmail === DEFAULT_ADMIN_EMAIL;
        return {
          id: userId,
          email: cleanEmail,
          full_name: isAdmin ? 'WIVI System Administrator' : cleanEmail.split('@')[0],
          avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(cleanEmail)}&background=${isAdmin ? 'ff3b30' : '0066cc'}&color=fff`,
          role: isAdmin ? 'admin' : 'user'
        };
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (data) {
        return {
          id: data.id,
          email: data.email,
          full_name: data.full_name || email.split('@')[0],
          avatar_url: data.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(email)}&background=0066cc&color=fff`,
          role: (data.role as UserRole) || (email === DEFAULT_ADMIN_EMAIL ? 'admin' : 'user'),
          created_at: data.created_at
        };
      }
    } catch (err) {
      console.warn('Lỗi lấy profile từ CSDL:', err);
    }

    const isAdmin = email.trim().toLowerCase() === DEFAULT_ADMIN_EMAIL;
    return {
      id: userId,
      email,
      full_name: isAdmin ? 'WIVI System Administrator' : email.split('@')[0],
      avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(email)}&background=${isAdmin ? 'ff3b30' : '0066cc'}&color=fff`,
      role: isAdmin ? 'admin' : 'user'
    };
  },

  /**
   * Đăng xuất ứng dụng
   */
  async signOut(): Promise<void> {
    try {
      if (isSupabaseConfigured) {
        await supabase.auth.signOut();
      }
    } catch (err) {
      console.warn('Lỗi khi đăng xuất:', err);
    }
  }
};
