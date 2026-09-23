import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';

interface OtpVerificationScreenProps {
  email: string;
  username?: string;
  password?: string;
  onNavigateBack: () => void;
  onSuccess?: () => void;
}

export const OtpVerificationScreen: React.FC<OtpVerificationScreenProps> = ({
  email,
  username,
  password,
  onNavigateBack,
  onSuccess,
}) => {
  const { verifyOtp, sendOtp, registerWithEmail, loginWithGoogle, isLoading } = useAuth();

  const [otpCode, setOtpCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);

  // Đếm ngược thời gian gửi lại mã OTP
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    } else {
      setCanResend(true);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const notifyUser = (title: string, msg: string) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}: ${msg}`);
    } else {
      Alert.alert(title, msg);
    }
  };

  const handleVerify = async () => {
    if (!otpCode.trim() || otpCode.trim().length < 6) {
      notifyUser('Thông báo', 'Vui lòng nhập đủ 6 chữ số mã OTP.');
      return;
    }

    setIsSubmitting(true);
    const res = await verifyOtp(email, otpCode);

    if (!res.success) {
      setIsSubmitting(false);
      notifyUser('Xác minh thất bại', res.message || 'Mã OTP không hợp lệ hoặc đã hết hạn.');
      return;
    }

    // Nếu là luồng đăng ký tài khoản mới: tạo tài khoản trong DB với registrationToken
    if (username && password) {
      const regRes = await registerWithEmail(
        email,
        password,
        username,
        res.registrationToken,
      );
      setIsSubmitting(false);

      if (regRes.success) {
        notifyUser('Chúc mừng 🎉', 'Tài khoản của bạn đã được đăng ký và xác thực thành công!');
        onSuccess?.();
      } else {
        notifyUser('Lỗi tạo tài khoản', regRes.message || 'Đăng ký thất bại.');
      }
    } else {
      // Đăng nhập qua OTP Google: Đăng nhập và tạo session
      const googleRes = await loginWithGoogle(email, username);
      setIsSubmitting(false);

      if (googleRes.success) {
        onSuccess?.();
      } else {
        notifyUser('Lỗi đăng nhập', googleRes.message || 'Đăng nhập không thành công.');
      }
    }
  };

  const handleResendOtp = async () => {
    if (!canResend) return;

    setIsSubmitting(true);
    const res = await sendOtp(email);
    setIsSubmitting(false);

    if (res.success) {
      Alert.alert('Thành công', 'Đã gửi lại mã OTP mới qua Email.');
      setResendTimer(60);
      setCanResend(false);
    } else {
      Alert.alert('Thất bại', res.message);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.container}>
        {/* Back Button */}
        <TouchableOpacity style={styles.backButton} onPress={onNavigateBack}>
          <Ionicons name="arrow-back" size={24} color="#1d1d1f" />
        </TouchableOpacity>

        <View style={styles.content}>
          <View style={styles.iconCircle}>
            <Ionicons name="shield-checkmark-sharp" size={40} color="#0066cc" />
          </View>

          <Text style={styles.title}>Nhập Mã Xác Minh OTP</Text>
          <Text style={styles.subtitle}>
            Mã xác minh 6 chữ số đã được gửi đến:{'\n'}
            <Text style={styles.emailHighlight}>{email}</Text>
            {'\n'}
            <Text style={{ fontSize: 13, color: '#f59e0b', fontWeight: '500' }}>
              ⏱️ Mã có hiệu lực trong vòng 1 phút (60 giây)
            </Text>
          </Text>


          {/* Card */}
          <View style={styles.card}>
            <Text style={styles.label}>Mã Xác Minh (6 chữ số)</Text>
            
            <TextInput
              style={styles.otpInput}
              placeholder="000000"
              placeholderTextColor="#c7c7cc"
              keyboardType="number-pad"
              maxLength={6}
              value={otpCode}
              onChangeText={setOtpCode}
              autoFocus
            />

            <TouchableOpacity
              style={styles.verifyButton}
              onPress={handleVerify}
              disabled={isSubmitting || isLoading}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.verifyButtonText}>Xác Minh & Đăng Nhập</Text>
              )}
            </TouchableOpacity>

            {/* Resend Link */}
            <View style={styles.resendRow}>
              {canResend ? (
                <TouchableOpacity onPress={handleResendOtp}>
                  <Text style={styles.resendActiveText}>Gửi lại mã OTP qua Email</Text>
                </TouchableOpacity>
              ) : (
                <Text style={styles.resendDisabledText}>
                  Gửi lại mã sau <Text style={styles.timerBold}>{resendTimer}s</Text>
                </Text>
              )}
            </View>
          </View>

          {/* Quick OTP Hint */}
          <TouchableOpacity
            style={styles.hintBox}
            onPress={() => setOtpCode('123456')}
          >
            <Ionicons name="key-outline" size={16} color="#0066cc" />
            <Text style={styles.hintText}>Điền nhanh OTP test (123456)</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f7',
    paddingHorizontal: 20,
    paddingTop: 50,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -40,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#e6f0fa',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1d1d1f',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#7a7a7a',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 28,
  },
  emailHighlight: {
    color: '#0066cc',
    fontWeight: '600',
  },
  card: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 12,
    textAlign: 'center',
  },
  otpInput: {
    backgroundColor: '#fafafc',
    borderWidth: 1.5,
    borderColor: '#0066cc',
    borderRadius: 16,
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 10,
    textAlign: 'center',
    height: 60,
    color: '#1d1d1f',
    marginBottom: 20,
  },
  verifyButton: {
    backgroundColor: '#0066cc',
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0066cc',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  verifyButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  resendRow: {
    alignItems: 'center',
    marginTop: 18,
  },
  resendActiveText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0066cc',
  },
  resendDisabledText: {
    fontSize: 14,
    color: '#8e8e93',
  },
  timerBold: {
    fontWeight: '600',
    color: '#1d1d1f',
  },
  hintBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eef5fc',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 20,
    gap: 8,
  },
  hintText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0066cc',
  },
});
