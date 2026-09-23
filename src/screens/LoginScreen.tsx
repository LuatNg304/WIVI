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
import { Feather, Ionicons } from '@expo/vector-icons';
import Svg, { Path, Defs, ClipPath, Rect } from 'react-native-svg';
import { GoogleSignInButton } from '../components/GoogleSignInModal';

const { width, height } = Dimensions.get('window');
const bannerHeight = height * 0.20;

// Topographic Wave Header SVG Component
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

        {/* Topographic Lines inside clipped area */}
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

export interface LoginScreenProps {
  onNavigateToRegister?: () => void;
  onNavigateToForgotPassword?: () => void;
  onNavigateToOtp?: (email: string) => void;
  onLoginSuccess?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onNavigateToRegister,
  onNavigateToForgotPassword,
  onNavigateToOtp,
  onLoginSuccess,
}) => {
  const { loginWithEmail, isLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const notifyUser = (title: string, msg: string) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}: ${msg}`);
    } else {
      Alert.alert(title, msg);
    }
  };

  const handleLogin = async () => {
    if (!email.trim()) {
      notifyUser('Thông báo', 'Vui lòng nhập địa chỉ Email.');
      return;
    }
    if (!password.trim()) {
      notifyUser('Thông báo', 'Vui lòng nhập mật khẩu.');
      return;
    }

    setIsSubmitting(true);
    const res = await loginWithEmail(email, password);
    setIsSubmitting(false);

    if (res.success) {
      if (onLoginSuccess) onLoginSuccess();
    } else {
      notifyUser('Lỗi đăng nhập', res.message || 'Email hoặc mật khẩu không chính xác.');
    }
  };



  return (
    <View style={styles.rootContainer}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Topographic Wave Header Banner */}
      <TopographicHeader heightVal={bannerHeight} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.cardBlock}>
            <View style={styles.titleContainer}>
              <Text style={styles.authTitle}>Sign in</Text>
              <View style={styles.titleUnderline} />
            </View>

            {/* Email Input */}
            <Text style={styles.mockupLabel}>Email</Text>
            <View style={[styles.mockupInputRow, focusedField === 'email' && styles.mockupInputRowActive]}>
              <Feather name="mail" size={16} color="#64748B" style={styles.mockupIcon} />
              <View style={styles.mockupDivider} />
              <TextInput
                style={styles.mockupTextInput}
                placeholder="demo@email.com"
                placeholderTextColor="#CBD5E1"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
              />
            </View>

            {/* Password Input */}
            <Text style={styles.mockupLabel}>Password</Text>
            <View style={[styles.mockupInputRow, focusedField === 'password' && styles.mockupInputRowActive]}>
              <Feather name="lock" size={16} color="#64748B" style={styles.mockupIcon} />
              <View style={styles.mockupDivider} />
              <TextInput
                style={styles.mockupTextInput}
                placeholder="enter your password"
                placeholderTextColor="#CBD5E1"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                <Feather name={showPassword ? 'eye' : 'eye-off'} size={16} color="#CBD5E1" />
              </TouchableOpacity>
            </View>

            {/* Remember Me and Forgot Password */}
            <View style={styles.authOptRow}>
              <TouchableOpacity
                style={styles.checkboxRowMin}
                activeOpacity={0.8}
                onPress={() => setRememberMe(!rememberMe)}
              >
                <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                  {rememberMe && <Ionicons name="checkmark" size={11} color="#ffffff" />}
                </View>
                <Text style={styles.authOptText}>Remember Me</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => onNavigateToForgotPassword && onNavigateToForgotPassword()}>
                <Text style={styles.forgotPwdText}>Forgot Password?</Text>
              </TouchableOpacity>
            </View>

            {/* Action Buttons */}
            <TouchableOpacity
              style={styles.mockupButton}
              onPress={handleLogin}
              disabled={isSubmitting || isLoading}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.mockupButtonText}>Login</Text>
              )}
            </TouchableOpacity>

            {/* Google Sign In Button – Real Google with OTP verification */}
            <GoogleSignInButton
              onSuccess={() => {
                if (onLoginSuccess) onLoginSuccess();
              }}
              onNavigateToOtp={(email: string) => {
                if (onNavigateToOtp) onNavigateToOtp(email);
              }}
              disabled={isSubmitting || isLoading}
            />

            {/* Switch to Register link */}
            {onNavigateToRegister && (
              <TouchableOpacity style={styles.switchScreenBtn} onPress={onNavigateToRegister}>
                <Text style={styles.switchScreenText}>
                  {"Don't"} have an Account ? <Text style={styles.switchScreenHighlight}>Sign up</Text>
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>


    </View>
  );
};

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
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
    top: bannerHeight * 0.18,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 2,
  },
  logoBadge: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  brandTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 1.5,
  },
  brandSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 2,
    fontWeight: '400',
  },
  scrollContainer: {
    flexGrow: 1,
    paddingTop: bannerHeight * 0.95,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  cardBlock: {
    paddingHorizontal: 4,
  },
  titleContainer: {
    alignSelf: 'flex-start',
    marginBottom: 20,
  },
  authTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
  },
  titleUnderline: {
    height: 3,
    width: 24,
    backgroundColor: '#0066cc',
    borderRadius: 2,
    marginTop: 4,
  },
  mockupLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 6,
    marginTop: 10,
  },
  mockupInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
  },
  mockupInputRowActive: {
    borderColor: '#0066cc',
    backgroundColor: '#ffffff',
  },
  mockupIcon: {
    marginRight: 8,
  },
  mockupDivider: {
    width: 1,
    height: 18,
    backgroundColor: '#CBD5E1',
    marginRight: 10,
  },
  mockupTextInput: {
    flex: 1,
    height: '100%',
    fontSize: 14,
    color: '#0F172A',
  },
  eyeBtn: {
    padding: 4,
  },
  authOptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    marginBottom: 18,
  },
  checkboxRowMin: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    backgroundColor: '#ffffff',
  },
  checkboxChecked: {
    backgroundColor: '#0066cc',
    borderColor: '#0066cc',
  },
  authOptText: {
    fontSize: 13,
    color: '#64748B',
  },
  forgotPwdText: {
    fontSize: 13,
    color: '#0066cc',
    fontWeight: '600',
  },
  mockupButton: {
    height: 50,
    backgroundColor: '#0066cc',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
    shadowColor: '#0066cc',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  mockupButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  googleMockupButton: {
    flexDirection: 'row',
    height: 48,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  googleMockupButtonText: {
    color: '#334155',
    fontSize: 14,
    fontWeight: '600',
  },
  switchScreenBtn: {
    alignItems: 'center',
    marginTop: 20,
    paddingVertical: 4,
  },
  switchScreenText: {
    fontSize: 13,
    color: '#64748B',
  },
  switchScreenHighlight: {
    color: '#0066cc',
    fontWeight: '700',
  },
});
