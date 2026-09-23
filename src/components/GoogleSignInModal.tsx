/**
 * GoogleSignInButton & GoogleSignInModal
 * Luồng đăng nhập Google kết hợp xác thực mã OTP:
 * 1. Chọn / Nhập tài khoản Gmail.
 * 2. Hệ thống gửi mã OTP 6 số về hòm thư Gmail của tài khoản.
 * 3. Chuyển thẳng sang Màn hình nhập OTP (Step 7) để xác nhận và vào app.
 */
import React, { useState } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
  Modal,
  TextInput,
  Platform,
  Alert,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';

interface GoogleSignInButtonProps {
  onSuccess?: () => void;
  onNavigateToOtp?: (email: string) => void;
  style?: 'standalone' | 'inline';
  disabled?: boolean;
}

export const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({
  onSuccess,
  onNavigateToOtp,
  style = 'inline',
  disabled = false,
}) => {
  const { sendOtp } = useAuth();
  const [modalVisible, setModalVisible] = useState(false);
  const [googleEmail, setGoogleEmail] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);

  const notifyUser = (title: string, msg: string) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}: ${msg}`);
    } else {
      Alert.alert(title, msg);
    }
  };

  const handleSendGoogleOtp = async (emailToSend?: string) => {
    const targetEmail = (emailToSend || googleEmail).trim();
    if (!targetEmail || !targetEmail.includes('@')) {
      notifyUser('Thông báo', 'Vui lòng nhập địa chỉ Gmail hợp lệ.');
      return;
    }

    setIsSendingOtp(true);
    try {
      const res = await sendOtp(targetEmail);
      setIsSendingOtp(false);

      if (res && res.success === false) {
        notifyUser('Lỗi gửi OTP', res.message || 'Không thể gửi mã OTP về Gmail này.');
        return;
      }

      setModalVisible(false);
      notifyUser('Đã gửi mã OTP 📩', `Mã xác thực 6 số đã được gửi tới ${targetEmail}. Vui lòng kiểm tra hòm thư.`);
      
      if (onNavigateToOtp) {
        onNavigateToOtp(targetEmail);
      } else if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      setIsSendingOtp(false);
      notifyUser('Lỗi gửi OTP', err?.message || 'Không thể kết nối đến máy chủ OTP.');
    }
  };

  return (
    <>
      <TouchableOpacity
        style={[inlineStyles.btn, disabled && inlineStyles.btnDisabled]}
        onPress={() => setModalVisible(true)}
        disabled={disabled}
        activeOpacity={0.85}
      >
        <Ionicons name="logo-google" size={18} color="#EA4335" style={{ marginRight: 8 }} />
        <Text style={inlineStyles.text}>Sign in with Google</Text>
      </TouchableOpacity>

      {/* Modal Chọn / Nhập tài khoản Google nhận OTP */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
          <View style={modalStyles.overlay}>
            <TouchableWithoutFeedback>
              <View style={modalStyles.container}>
                {/* Header */}
                <View style={modalStyles.header}>
                  <View style={modalStyles.googleIconCircle}>
                    <Ionicons name="logo-google" size={24} color="#EA4335" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={modalStyles.title}>Đăng nhập bằng Google</Text>
                    <Text style={modalStyles.subTitle}>Nhận mã xác thực OTP qua Gmail</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setModalVisible(false)}
                    style={modalStyles.closeBtn}
                  >
                    <Feather name="x" size={18} color="#64748B" />
                  </TouchableOpacity>
                </View>

                {/* Account Suggestion (Quick Pick) */}
                <View style={modalStyles.presetContainer}>
                  <Text style={modalStyles.sectionLabel}>Tài khoản đề xuất nhanh:</Text>
                  <TouchableOpacity
                    style={modalStyles.presetItem}
                    activeOpacity={0.7}
                    onPress={() => {
                      setGoogleEmail('chien01656822826@gmail.com');
                      handleSendGoogleOtp('chien01656822826@gmail.com');
                    }}
                  >
                    <View style={modalStyles.avatarMini}>
                      <Text style={modalStyles.avatarMiniText}>C</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={modalStyles.presetEmailText}>chien01656822826@gmail.com</Text>
                      <Text style={modalStyles.presetSubText}>Chạm để nhận OTP ngay</Text>
                    </View>
                    <Ionicons name="send" size={16} color="#3B82F6" />
                  </TouchableOpacity>
                </View>

                {/* Custom Gmail Input */}
                <View style={modalStyles.inputSection}>
                  <Text style={modalStyles.sectionLabel}>Hoặc nhập tài khoản Gmail khác:</Text>
                  <View style={modalStyles.inputRow}>
                    <Ionicons name="mail-outline" size={18} color="#94A3B8" style={{ marginRight: 8 }} />
                    <TextInput
                      style={modalStyles.input}
                      placeholder="vidu@gmail.com"
                      placeholderTextColor="#94A3B8"
                      value={googleEmail}
                      onChangeText={setGoogleEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                </View>

                {/* Submit Button */}
                <TouchableOpacity
                  style={[modalStyles.submitBtn, isSendingOtp && { opacity: 0.7 }]}
                  activeOpacity={0.85}
                  disabled={isSendingOtp}
                  onPress={() => handleSendGoogleOtp()}
                >
                  <LinearGradient
                    colors={['#3B82F6', '#1D4ED8']}
                    style={modalStyles.submitGradient}
                  >
                    {isSendingOtp ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <View style={modalStyles.submitContent}>
                        <Text style={modalStyles.submitText}>Gửi mã OTP & Đăng nhập</Text>
                        <Feather name="arrow-right" size={18} color="#FFFFFF" />
                      </View>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────

const inlineStyles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    height: 48,
    borderRadius: 24,
    marginTop: 10,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  text: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },
});

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  googleIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  subTitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  presetContainer: {
    marginBottom: 14,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 6,
  },
  presetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1.5,
    borderColor: '#BBF7D0',
    borderRadius: 14,
    padding: 12,
    gap: 10,
  },
  avatarMini: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#16A34A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarMiniText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  presetEmailText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#15803D',
  },
  presetSubText: {
    fontSize: 11,
    color: '#16A34A',
    marginTop: 1,
  },
  inputSection: {
    marginBottom: 18,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 46,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
  },
  submitBtn: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  submitGradient: {
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  submitText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
