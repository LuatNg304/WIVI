import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Dimensions,
  StatusBar,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path, Defs, ClipPath, Rect } from 'react-native-svg';

const { width, height } = Dimensions.get('window');
const bannerHeight = height * 0.32;

// Topographic Wave Header SVG component matching WIVI Design System
const TopographicHeader: React.FC<{ heightVal: number }> = ({ heightVal }) => {
  return (
    <View style={[styles.svgHeaderContainer, { height: heightVal }]}>
      <Svg width="100%" height={heightVal} viewBox={`0 0 ${width} ${heightVal}`} style={styles.svgHeader}>
        <Defs>
          <ClipPath id="loginWaveClip">
            <Path
              d={`M-10,0 L-10,${heightVal * 0.78} Q${width * 0.3},${heightVal * 1.1} ${width * 0.7},${heightVal * 0.72} T${width + 10},${heightVal * 0.82} L${width + 10},0 Z`}
            />
          </ClipPath>
        </Defs>

        {/* Base Blue Background */}
        <Rect x="-10" y="0" width={width + 20} height={heightVal} fill="#3A55B4" clipPath="url(#loginWaveClip)" />

        {/* Topographic Lines inside the clipped area */}
        <Path
          d={`M-50,${heightVal * 0.25} C${width * 0.2},${heightVal * 0.05} ${width * 0.4},${heightVal * 0.45} ${width * 0.7},${heightVal * 0.2} C${width * 0.9},${heightVal * 0.05} ${width * 1.1},${heightVal * 0.3} ${width * 1.3},${heightVal * 0.2}`}
          fill="none"
          stroke="rgba(255, 255, 255, 0.14)"
          strokeWidth="2"
          clipPath="url(#loginWaveClip)"
        />
        <Path
          d={`M-40,${heightVal * 0.4} C${width * 0.2},${heightVal * 0.2} ${width * 0.4},${heightVal * 0.6} ${width * 0.7},${heightVal * 0.35} C${width * 0.9},${heightVal * 0.2} ${width * 1.1},${heightVal * 0.45} ${width * 1.3},${heightVal * 0.35}`}
          fill="none"
          stroke="rgba(255, 255, 255, 0.12)"
          strokeWidth="1.8"
          clipPath="url(#loginWaveClip)"
        />
        <Path
          d={`M-30,${heightVal * 0.55} C${width * 0.2},${heightVal * 0.35} ${width * 0.4},${heightVal * 0.75} ${width * 0.7},${heightVal * 0.5} C${width * 0.9},${heightVal * 0.35} ${width * 1.1},${heightVal * 0.6} ${width * 1.3},${heightVal * 0.5}`}
          fill="none"
          stroke="rgba(255, 255, 255, 0.08)"
          strokeWidth="1.5"
          clipPath="url(#loginWaveClip)"
        />
        <Path
          d={`M-20,${heightVal * 0.7} C${width * 0.2},${heightVal * 0.5} ${width * 0.4},${heightVal * 0.9} ${width * 0.7},${heightVal * 0.65} C${width * 0.9},${heightVal * 0.5} ${width * 1.1},${heightVal * 0.75} ${width * 1.3},${heightVal * 0.65}`}
          fill="none"
          stroke="rgba(255, 255, 255, 0.06)"
          strokeWidth="1.5"
          clipPath="url(#loginWaveClip)"
        />
      </Svg>
    </View>
  );
};

interface LoginScreenProps {
  onNavigateToRegister: () => void;
  onNavigateToOtp: (email: string) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onNavigateToRegister,
  onNavigateToOtp,
}) => {
  const { loginWithEmail, loginWithGoogle, sendOtp, isLoading } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginMode, setLoginMode] = useState<'password' | 'otp'>('password');

  const handlePasswordLogin = async () => {
    if (!email.trim()) {
      Alert.alert('Thông báo', 'Vui lòng nhập địa chỉ Email của bạn.');
      return;
    }
    if (!password) {
      Alert.alert('Thông báo', 'Vui lòng nhập mật khẩu.');
      return;
    }

    setIsSubmitting(true);
    const res = await loginWithEmail(email, password);
    setIsSubmitting(false);

    if (!res.success) {
      Alert.alert('Đăng nhập thất bại', res.message);
    }
  };

  const handleSendOtpLogin = async () => {
    if (!email.trim()) {
      Alert.alert('Thông báo', 'Vui lòng nhập địa chỉ Email để nhận mã OTP.');
      return;
    }

    setIsSubmitting(true);
    const res = await sendOtp(email);
    setIsSubmitting(false);

    if (res.success) {
      onNavigateToOtp(email);
    } else {
      Alert.alert('Thông báo', res.message);
    }
  };

  const handleGoogleLogin = async () => {
    setIsSubmitting(true);
    const res = await loginWithGoogle();
    setIsSubmitting(false);

    if (!res.success) {
      Alert.alert('Google Sign-In', res.message);
    }
  };

  // Nút hỗ trợ đăng nhập Admin nhanh cho mục đích kiểm thử
  const fillAdminAccount = () => {
    setEmail('admin@wivi.com');
    setPassword('admin123');
    setLoginMode('password');
  };

  return (
    <View style={styles.rootContainer}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      {/* Topographic Wave Header */}
      <TopographicHeader heightVal={bannerHeight} />

      {/* Header Brand Content */}
      <View style={styles.headerContentArea}>
        <View style={styles.logoBadge}>
          <Ionicons name="wallet-sharp" size={32} color="#ffffff" />
        </View>
        <Text style={styles.brandTitle}>WIVI</Text>
        <Text style={styles.brandSubtitle}>Tự do tài chính & Quản lý thông minh</Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Form Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Chào mừng trở lại</Text>

            {/* Mode Switcher */}
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[styles.tabButton, loginMode === 'password' && styles.tabButtonActive]}
                onPress={() => setLoginMode('password')}
              >
                <Text style={[styles.tabText, loginMode === 'password' && styles.tabTextActive]}>
                  Mật khẩu
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tabButton, loginMode === 'otp' && styles.tabButtonActive]}
                onPress={() => setLoginMode('otp')}
              >
                <Text style={[styles.tabText, loginMode === 'otp' && styles.tabTextActive]}>
                  Mã Email OTP
                </Text>
              </TouchableOpacity>
            </View>

            {/* Email Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Địa chỉ Email</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={20} color="#7a7a7a" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="vd: user@domain.com"
                  placeholderTextColor="#a0a0a0"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                />
              </View>
            </View>

            {/* Password Input (nếu chế độ password) */}
            {loginMode === 'password' && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Mật khẩu</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="lock-closed-outline" size={20} color="#7a7a7a" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Nhập mật khẩu"
                    placeholderTextColor="#a0a0a0"
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={setPassword}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color="#7a7a7a"
                    />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Action Button */}
            {loginMode === 'password' ? (
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handlePasswordLogin}
                disabled={isSubmitting || isLoading}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.primaryButtonText}>Đăng Nhập</Text>
                )}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleSendOtpLogin}
                disabled={isSubmitting || isLoading}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.primaryButtonText}>Gửi Mã OTP Qua Email</Text>
                )}
              </TouchableOpacity>
            )}

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>Hoặc tiếp tục với</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Google Sign In Button */}
            <TouchableOpacity
              style={styles.googleButton}
              onPress={handleGoogleLogin}
              disabled={isSubmitting || isLoading}
            >
              <Ionicons name="logo-google" size={20} color="#ea4335" style={{ marginRight: 10 }} />
              <Text style={styles.googleButtonText}>Đăng nhập bằng Gmail / Google</Text>
            </TouchableOpacity>

            {/* Quick Admin Fill Helper */}
            <TouchableOpacity style={styles.adminQuickBtn} onPress={fillAdminAccount}>
              <Ionicons name="shield-checkmark" size={16} color="#ff3b30" />
              <Text style={styles.adminQuickText}>Dùng tài khoản Admin (admin@wivi.com)</Text>
            </TouchableOpacity>

            {/* Footer Register Link */}
            <View style={styles.footerRow}>
              <Text style={styles.footerText}>Chưa có tài khoản?</Text>
              <TouchableOpacity onPress={onNavigateToRegister}>
                <Text style={styles.registerLink}>Đăng ký ngay</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: '#f5f5f7',
  },
  svgHeaderContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
  },
  svgHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  headerContentArea: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 54 : 40,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 2,
  },
  logoBadge: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  brandTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 2,
    fontWeight: '500',
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: bannerHeight - 20,
    paddingBottom: 40,
    zIndex: 3,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1d1d1f',
    marginBottom: 18,
    textAlign: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f2',
    borderRadius: 12,
    padding: 4,
    marginBottom: 18,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabButtonActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#7a7a7a',
  },
  tabTextActive: {
    color: '#0066cc',
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fafafc',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 50,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#1d1d1f',
  },
  eyeIcon: {
    padding: 6,
  },
  primaryButton: {
    backgroundColor: '#0066cc',
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#0066cc',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e5e5ea',
  },
  dividerText: {
    fontSize: 12,
    color: '#8e8e93',
    paddingHorizontal: 12,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d1d6',
    height: 50,
    borderRadius: 14,
  },
  googleButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1d1d1f',
  },
  adminQuickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff2f2',
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 14,
    gap: 6,
  },
  adminQuickText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ff3b30',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
    gap: 6,
  },
  footerText: {
    fontSize: 14,
    color: '#7a7a7a',
  },
  registerLink: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0066cc',
  },
});
