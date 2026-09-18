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

const { width, height } = Dimensions.get('window');
const bannerHeight = height * 0.20;

// Topographic Wave Header SVG Component
const TopographicHeader: React.FC<{ heightVal: number }> = ({ heightVal }) => {
  return (
    <View style={[styles.svgHeaderContainer, { height: heightVal }]}>
      <Svg width="100%" height={heightVal} viewBox={`0 0 ${width} ${heightVal}`} style={styles.svgHeader}>
        <Defs>
          <ClipPath id="forgotWaveClip">
            <Path
              d={`M-10,0 L-10,${heightVal * 0.78} Q${width * 0.3},${heightVal * 1.1} ${width * 0.7},${heightVal * 0.72} T${width + 10},${heightVal * 0.82} L${width + 10},0 Z`}
            />
          </ClipPath>
        </Defs>

        {/* Base Blue Background */}
        <Rect x="-10" y="0" width={width + 20} height={heightVal} fill="#3A55B4" clipPath="url(#forgotWaveClip)" />

        {/* Topographic Lines inside clipped area */}
        <Path
          d={`M-50,${heightVal * 0.25} C${width * 0.2},${heightVal * 0.05} ${width * 0.4},${heightVal * 0.45} ${width * 0.7},${heightVal * 0.2} C${width * 0.9},${heightVal * 0.05} ${width * 1.1},${heightVal * 0.3} ${width * 1.3},${heightVal * 0.2}`}
          fill="none"
          stroke="rgba(255, 255, 255, 0.14)"
          strokeWidth="2"
          clipPath="url(#forgotWaveClip)"
        />
        <Path
          d={`M-40,${heightVal * 0.4} C${width * 0.2},${heightVal * 0.2} ${width * 0.4},${heightVal * 0.6} ${width * 0.7},${heightVal * 0.35} C${width * 0.9},${heightVal * 0.2} ${width * 1.1},${heightVal * 0.45} ${width * 1.3},${heightVal * 0.35}`}
          fill="none"
          stroke="rgba(255, 255, 255, 0.12)"
          strokeWidth="1.8"
          clipPath="url(#forgotWaveClip)"
        />
        <Path
          d={`M-30,${heightVal * 0.55} C${width * 0.2},${heightVal * 0.35} ${width * 0.4},${heightVal * 0.75} ${width * 0.7},${heightVal * 0.5} C${width * 0.9},${heightVal * 0.35} ${width * 1.1},${heightVal * 0.6} ${width * 1.3},${heightVal * 0.5}`}
          fill="none"
          stroke="rgba(255, 255, 255, 0.08)"
          strokeWidth="1.5"
          clipPath="url(#forgotWaveClip)"
        />
      </Svg>
    </View>
  );
};

export interface ForgotPasswordScreenProps {
  onNavigateToLogin?: () => void;
}

export const ForgotPasswordScreen: React.FC<ForgotPasswordScreenProps> = ({
  onNavigateToLogin,
}) => {
  const { sendOtp, resetPassword, isLoading } = useAuth();

  const [step, setStep] = useState<1 | 2>(1); // 1: Send OTP, 2: Enter OTP & New Password
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const handleSendOtp = async () => {
    if (!email.trim() || !email.includes('@')) {
      Alert.alert('Thông báo', 'Vui lòng nhập địa chỉ Email hợp lệ.');
      return;
    }

    setIsSubmitting(true);
    const res = await sendOtp(email.trim());
    setIsSubmitting(false);

    if (res.success) {
      setStep(2);
    } else {
      Alert.alert('Lỗi', res.message || 'Không thể gửi mã OTP. Vui lòng thử lại.');
    }
  };

  const handleResetPassword = async () => {
    if (!otpCode.trim() || otpCode.trim().length !== 6) {
      Alert.alert('Thông báo', 'Vui lòng nhập mã OTP gồm 6 chữ số.');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      Alert.alert('Thông báo', 'Mật khẩu mới phải có ít nhất 6 ký tự.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Thông báo', 'Mật khẩu xác nhận không khớp.');
      return;
    }

    setIsSubmitting(true);
    const res = await resetPassword(email.trim(), otpCode.trim(), newPassword);
    setIsSubmitting(false);

    if (res.success) {
      Alert.alert('Thành công', 'Đặt lại mật khẩu thành công! Vui lòng đăng nhập với mật khẩu mới.', [
        {
          text: 'Đăng nhập',
          onPress: () => {
            if (onNavigateToLogin) onNavigateToLogin();
          },
        },
      ]);
    } else {
      Alert.alert('Lỗi đặt lại mật khẩu', res.message || 'Đặt lại mật khẩu thất bại.');
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
              <Text style={styles.authTitle}>Forgot Password</Text>
              <View style={styles.titleUnderline} />
            </View>

            <Text style={styles.subDescription}>
              {step === 1
                ? 'Nhập địa chỉ Email tài khoản của bạn để nhận mã OTP khôi phục mật khẩu.'
                : `Nhập mã OTP vừa gửi tới ${email} và thiết lập mật khẩu mới.`}
            </Text>

            {step === 1 ? (
              /* STEP 1: Email Input */
              <View style={{ marginTop: 10 }}>
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

                <TouchableOpacity
                  style={styles.mockupButton}
                  onPress={handleSendOtp}
                  disabled={isSubmitting || isLoading}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={styles.mockupButtonText}>Gửi mã OTP</Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              /* STEP 2: OTP Code & New Password */
              <View style={{ marginTop: 10 }}>
                {/* OTP Code Input */}
                <Text style={styles.mockupLabel}>Mã OTP (6 chữ số)</Text>
                <View style={[styles.mockupInputRow, focusedField === 'otp' && styles.mockupInputRowActive]}>
                  <Feather name="key" size={16} color="#64748B" style={styles.mockupIcon} />
                  <View style={styles.mockupDivider} />
                  <TextInput
                    style={styles.mockupTextInput}
                    placeholder="123456"
                    placeholderTextColor="#CBD5E1"
                    keyboardType="number-pad"
                    maxLength={6}
                    value={otpCode}
                    onChangeText={setOtpCode}
                    onFocus={() => setFocusedField('otp')}
                    onBlur={() => setFocusedField(null)}
                  />
                </View>

                {/* New Password Input */}
                <Text style={styles.mockupLabel}>Mật khẩu mới</Text>
                <View style={[styles.mockupInputRow, focusedField === 'newPassword' && styles.mockupInputRowActive]}>
                  <Feather name="lock" size={16} color="#64748B" style={styles.mockupIcon} />
                  <View style={styles.mockupDivider} />
                  <TextInput
                    style={styles.mockupTextInput}
                    placeholder="Nhập mật khẩu mới"
                    placeholderTextColor="#CBD5E1"
                    secureTextEntry={!showNewPassword}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    onFocus={() => setFocusedField('newPassword')}
                    onBlur={() => setFocusedField(null)}
                  />
                  <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)} style={styles.eyeBtn}>
                    <Feather name={showNewPassword ? 'eye' : 'eye-off'} size={16} color="#CBD5E1" />
                  </TouchableOpacity>
                </View>

                {/* Confirm Password Input */}
                <Text style={styles.mockupLabel}>Xác nhận mật khẩu mới</Text>
                <View style={[styles.mockupInputRow, focusedField === 'confirmPassword' && styles.mockupInputRowActive]}>
                  <Feather name="lock" size={16} color="#64748B" style={styles.mockupIcon} />
                  <View style={styles.mockupDivider} />
                  <TextInput
                    style={styles.mockupTextInput}
                    placeholder="Xác nhận mật khẩu mới"
                    placeholderTextColor="#CBD5E1"
                    secureTextEntry={!showConfirmPassword}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    onFocus={() => setFocusedField('confirmPassword')}
                    onBlur={() => setFocusedField(null)}
                  />
                  <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeBtn}>
                    <Feather name={showConfirmPassword ? 'eye' : 'eye-off'} size={16} color="#CBD5E1" />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={styles.mockupButton}
                  onPress={handleResetPassword}
                  disabled={isSubmitting || isLoading}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={styles.mockupButtonText}>Đặt lại mật khẩu</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity style={styles.resendBtn} onPress={handleSendOtp} disabled={isSubmitting}>
                  <Text style={styles.resendBtnText}>Chưa nhận được mã? <Text style={styles.switchScreenHighlight}>Gửi lại OTP</Text></Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Back to Login link */}
            {onNavigateToLogin && (
              <TouchableOpacity style={styles.switchScreenBtn} onPress={onNavigateToLogin}>
                <Text style={styles.switchScreenText}>
                  Remember your Password? <Text style={styles.switchScreenHighlight}>Sign in</Text>
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
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  cardBlock: {
    paddingHorizontal: 4,
  },
  titleContainer: {
    alignSelf: 'flex-start',
    marginBottom: 8,
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
  subDescription: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 10,
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
  mockupButton: {
    height: 50,
    backgroundColor: '#0066cc',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
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
  resendBtn: {
    alignItems: 'center',
    marginTop: 14,
  },
  resendBtnText: {
    fontSize: 13,
    color: '#64748B',
  },
  switchScreenBtn: {
    alignItems: 'center',
    marginTop: 24,
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
