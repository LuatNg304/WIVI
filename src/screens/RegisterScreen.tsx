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
          <ClipPath id="registerWaveClip">
            <Path
              d={`M-10,0 L-10,${heightVal * 0.78} Q${width * 0.3},${heightVal * 1.1} ${width * 0.7},${heightVal * 0.72} T${width + 10},${heightVal * 0.82} L${width + 10},0 Z`}
            />
          </ClipPath>
        </Defs>

        {/* Base Blue Background */}
        <Rect x="-10" y="0" width={width + 20} height={heightVal} fill="#3A55B4" clipPath="url(#registerWaveClip)" />

        {/* Topographic Lines inside clipped area */}
        <Path
          d={`M-50,${heightVal * 0.25} C${width * 0.2},${heightVal * 0.05} ${width * 0.4},${heightVal * 0.45} ${width * 0.7},${heightVal * 0.2} C${width * 0.9},${heightVal * 0.05} ${width * 1.1},${heightVal * 0.3} ${width * 1.3},${heightVal * 0.2}`}
          fill="none"
          stroke="rgba(255, 255, 255, 0.14)"
          strokeWidth="2"
          clipPath="url(#registerWaveClip)"
        />
        <Path
          d={`M-40,${heightVal * 0.4} C${width * 0.2},${heightVal * 0.2} ${width * 0.4},${heightVal * 0.6} ${width * 0.7},${heightVal * 0.35} C${width * 0.9},${heightVal * 0.2} ${width * 1.1},${heightVal * 0.45} ${width * 1.3},${heightVal * 0.35}`}
          fill="none"
          stroke="rgba(255, 255, 255, 0.12)"
          strokeWidth="1.8"
          clipPath="url(#registerWaveClip)"
        />
        <Path
          d={`M-30,${heightVal * 0.55} C${width * 0.2},${heightVal * 0.35} ${width * 0.4},${heightVal * 0.75} ${width * 0.7},${heightVal * 0.5} C${width * 0.9},${heightVal * 0.35} ${width * 1.1},${heightVal * 0.6} ${width * 1.3},${heightVal * 0.5}`}
          fill="none"
          stroke="rgba(255, 255, 255, 0.08)"
          strokeWidth="1.5"
          clipPath="url(#registerWaveClip)"
        />
      </Svg>
    </View>
  );
};

export interface RegisterScreenProps {
  onNavigateToLogin?: () => void;
  onNavigateToOtp?: (email: string, username?: string, password?: string) => void;
  onRegisterSuccess?: () => void;
}

export const RegisterScreen: React.FC<RegisterScreenProps> = ({
  onNavigateToLogin,
  onNavigateToOtp,
  onRegisterSuccess,
}) => {
  const { sendOtp, isLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const notifyUser = (title: string, msg: string) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}: ${msg}`);
    } else {
      Alert.alert(title, msg);
    }
  };

  const handleRegister = async () => {
    if (!email.trim() || !username.trim() || !password || !confirmPassword) {
      notifyUser('Thông báo', 'Vui lòng điền đầy đủ các thông tin đăng ký.');
      return;
    }
    if (!email.includes('@')) {
      notifyUser('Thông báo', 'Địa chỉ Email không hợp lệ.');
      return;
    }
    if (password.length < 6) {
      notifyUser('Thông báo', 'Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }
    if (password !== confirmPassword) {
      notifyUser('Thông báo', 'Mật khẩu xác nhận không khớp.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await sendOtp(email.trim());
      if (res && res.success === false) {
        notifyUser('Lỗi gửi OTP', res.message || 'Không thể gửi mã OTP.');
        setIsSubmitting(false);
        return;
      }
    } catch (e: any) {
      console.warn('Lỗi gửi OTP:', e);
      notifyUser('Lỗi gửi OTP', e?.message || 'Không thể gửi mã OTP.');
      setIsSubmitting(false);
      return;
    } finally {
      setIsSubmitting(false);
    }

    if (onNavigateToOtp) {
      onNavigateToOtp(email.trim(), username.trim(), password);
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
              <Text style={styles.authTitle}>Sign up</Text>
              <View style={styles.titleUnderline} />
            </View>

            {/* Email Input */}
            <Text style={styles.mockupLabel}>Email</Text>
            <View style={[styles.mockupInputRow, focusedField === 'email' && styles.mockupInputRowActive]}>
              <Feather name="mail" size={15} color="#64748B" style={styles.mockupIcon} />
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

            {/* Username Input */}
            <Text style={styles.mockupLabel}>Username</Text>
            <View style={[styles.mockupInputRow, focusedField === 'username' && styles.mockupInputRowActive]}>
              <Feather name="user" size={15} color="#64748B" style={styles.mockupIcon} />
              <View style={styles.mockupDivider} />
              <TextInput
                style={styles.mockupTextInput}
                placeholder="nguyenvana"
                placeholderTextColor="#CBD5E1"
                autoCapitalize="none"
                value={username}
                onChangeText={setUsername}
                onFocus={() => setFocusedField('username')}
                onBlur={() => setFocusedField(null)}
              />
            </View>

            {/* Password Input */}
            <Text style={styles.mockupLabel}>Password</Text>
            <View style={[styles.mockupInputRow, focusedField === 'password' && styles.mockupInputRowActive]}>
              <Feather name="lock" size={15} color="#64748B" style={styles.mockupIcon} />
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
                <Feather name={showPassword ? 'eye' : 'eye-off'} size={15} color="#CBD5E1" />
              </TouchableOpacity>
            </View>

            {/* Confirm Password Input */}
            <Text style={styles.mockupLabel}>Confirm Password</Text>
            <View style={[styles.mockupInputRow, focusedField === 'confirmPassword' && styles.mockupInputRowActive]}>
              <Feather name="lock" size={15} color="#64748B" style={styles.mockupIcon} />
              <View style={styles.mockupDivider} />
              <TextInput
                style={styles.mockupTextInput}
                placeholder="confirm your password"
                placeholderTextColor="#CBD5E1"
                secureTextEntry={!showConfirmPassword}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                onFocus={() => setFocusedField('confirmPassword')}
                onBlur={() => setFocusedField(null)}
              />
              <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeBtn}>
                <Feather name={showConfirmPassword ? 'eye' : 'eye-off'} size={15} color="#CBD5E1" />
              </TouchableOpacity>
            </View>

            {/* Terms checkbox */}
            <TouchableOpacity
              style={styles.checkboxRow}
              activeOpacity={0.8}
              onPress={() => setAgreeTerms(!agreeTerms)}
            >
              <View style={[styles.checkbox, agreeTerms && styles.checkboxChecked]}>
                {agreeTerms && <Ionicons name="checkmark" size={11} color="#ffffff" />}
              </View>
              <Text style={styles.checkboxText}>
                Tôi đồng ý với các <Text style={styles.hyperlinkText}>Điều khoản</Text> & <Text style={styles.hyperlinkText}>Bảo mật</Text> của WIVI.
              </Text>
            </TouchableOpacity>

            {/* Action Buttons */}
            <TouchableOpacity
              style={styles.mockupButton}
              onPress={handleRegister}
              disabled={isSubmitting || isLoading}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.mockupButtonText}>Create Account</Text>
              )}
            </TouchableOpacity>

            {/* Google Sign Up Button – Real Google with OTP verification */}
            <GoogleSignInButton
              onSuccess={() => {
                if (onRegisterSuccess) onRegisterSuccess();
              }}
              onNavigateToOtp={(email: string) => {
                if (onNavigateToOtp) onNavigateToOtp(email);
              }}
              disabled={isSubmitting || isLoading}
            />

            {/* Switch to Login link */}
            {onNavigateToLogin && (
              <TouchableOpacity style={styles.switchScreenBtn} onPress={onNavigateToLogin}>
                <Text style={styles.switchScreenText}>
                  Already have an Account! <Text style={styles.switchScreenHighlight}>Login</Text>
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
  scrollContainer: {
    flexGrow: 1,
    paddingTop: bannerHeight * 0.95,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  cardBlock: {
    paddingHorizontal: 4,
  },
  titleContainer: {
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  authTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
  },
  titleUnderline: {
    height: 3,
    width: 22,
    backgroundColor: '#0066cc',
    borderRadius: 2,
    marginTop: 3,
  },
  mockupLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 3,
    marginTop: 6,
  },
  mockupInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 42,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
  },
  mockupInputRowActive: {
    borderColor: '#0066cc',
    backgroundColor: '#ffffff',
  },
  mockupIcon: {
    marginRight: 6,
  },
  mockupDivider: {
    width: 1,
    height: 16,
    backgroundColor: '#CBD5E1',
    marginRight: 8,
  },
  mockupTextInput: {
    flex: 1,
    height: '100%',
    fontSize: 13,
    color: '#0F172A',
  },
  eyeBtn: {
    padding: 4,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 10,
  },
  checkbox: {
    width: 16,
    height: 16,
    borderRadius: 4,
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
  checkboxText: {
    fontSize: 11.5,
    color: '#64748B',
    flex: 1,
  },
  hyperlinkText: {
    color: '#0066cc',
    fontWeight: '600',
  },
  mockupButton: {
    height: 44,
    backgroundColor: '#0066cc',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
    shadowColor: '#0066cc',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  mockupButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  googleMockupButton: {
    flexDirection: 'row',
    height: 42,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  googleMockupButtonText: {
    color: '#334155',
    fontSize: 13.5,
    fontWeight: '600',
  },
  switchScreenBtn: {
    alignItems: 'center',
    marginTop: 12,
    paddingVertical: 2,
  },
  switchScreenText: {
    fontSize: 12.5,
    color: '#64748B',
  },
  switchScreenHighlight: {
    color: '#0066cc',
    fontWeight: '700',
  },
});
