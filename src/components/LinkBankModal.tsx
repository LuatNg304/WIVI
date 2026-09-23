import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { financeService } from '../services/financeService';

interface LinkBankModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const POPULAR_BANKS = [
  { code: 'MB', name: 'MBBank (Quân Đội)', short: 'MB' },
  { code: 'VCB', name: 'Vietcombank', short: 'VCB' },
  { code: 'TCB', name: 'Techcombank', short: 'TCB' },
  { code: 'ACB', name: 'Ngân hàng Á Châu', short: 'ACB' },
  { code: 'VPB', name: 'VPBank', short: 'VPB' },
  { code: 'TPB', name: 'TPBank', short: 'TPB' },
  { code: 'BIDV', name: 'BIDV', short: 'BIDV' },
  { code: 'CTG', name: 'VietinBank', short: 'CTG' },
  { code: 'STB', name: 'Sacombank', short: 'STB' },
  { code: 'VIB', name: 'VIB', short: 'VIB' },
];

export const LinkBankModal: React.FC<LinkBankModalProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const [selectedBank, setSelectedBank] = useState(POPULAR_BANKS[0].code);
  const [accountNumber, setAccountNumber] = useState('');
  const [accountHolderName, setAccountHolderName] = useState('');
  const [loading, setLoading] = useState(false);
  const [syncSuccessData, setSyncSuccessData] = useState<any | null>(null);

  const handleLinkBank = async () => {
    if (!accountNumber.trim() || !accountHolderName.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập Số tài khoản và Tên chủ tài khoản.');
      return;
    }

    setLoading(true);
    try {
      const res = await financeService.linkBankAccount({
        bankCode: selectedBank,
        accountNumber: accountNumber.trim(),
        accountHolderName: accountHolderName.trim().toUpperCase(),
      });

      setSyncSuccessData(res);
      Alert.alert(
        'Liên kết thành công!',
        `Tài khoản ngân hàng ${selectedBank} của bạn đã được kết nối với FinJar WIVI. Biến động số dư thật sẽ được đồng bộ tự động.`,
        [
          {
            text: 'Tuyệt vời',
            onPress: () => {
              onSuccess?.();
              onClose();
            },
          },
        ],
      );
    } catch (err: any) {
      const errMsg =
        err.response?.data?.message ||
        err.message ||
        'Không thể kết nối với ngân hàng lúc này. Vui lòng thử lại.';
      Alert.alert('Lỗi liên kết', errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.bankIconGlow}>
                <MaterialCommunityIcons name="bank" size={22} color="#00D2D3" />
              </View>
              <View>
                <Text style={styles.headerTitle}>Liên kết Ngân hàng Thật</Text>
                <Text style={styles.headerSubtitle}>Tự động nhận biến động số dư qua SePay / VietQR</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#A0AEC0" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formContainer} keyboardShouldPersistTaps="handled">
            {/* Bank Selector */}
            <Text style={styles.label}>1. Chọn Ngân hàng</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.bankList}>
              {POPULAR_BANKS.map((bank) => {
                const isSelected = selectedBank === bank.code;
                return (
                  <TouchableOpacity
                    key={bank.code}
                    style={[styles.bankCard, isSelected && styles.bankCardSelected]}
                    onPress={() => setSelectedBank(bank.code)}
                  >
                    <Text style={[styles.bankShort, isSelected && styles.bankShortSelected]}>
                      {bank.short}
                    </Text>
                    <Text style={[styles.bankFullName, isSelected && styles.bankFullNameSelected]}>
                      {bank.name.split(' ')[0]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Account Number */}
            <Text style={styles.label}>2. Số tài khoản ngân hàng</Text>
            <TextInput
              style={styles.input}
              placeholder="VD: 0388889999"
              placeholderTextColor="#64748B"
              keyboardType="number-pad"
              value={accountNumber}
              onChangeText={setAccountNumber}
            />

            {/* Account Holder Name */}
            <Text style={styles.label}>3. Tên chủ tài khoản (In hoa không dấu)</Text>
            <TextInput
              style={styles.input}
              placeholder="VD: NGUYEN VAN A"
              placeholderTextColor="#64748B"
              autoCapitalize="characters"
              value={accountHolderName}
              onChangeText={setAccountHolderName}
            />

            {/* Security Banner */}
            <View style={styles.securityBanner}>
              <MaterialCommunityIcons name="shield-check" size={20} color="#10B981" />
              <View style={{ flex: 1 }}>
                <Text style={styles.securityTitle}>Bảo mật an toàn 100%</Text>
                <Text style={styles.securityDesc}>
                  WIVI không yêu cầu mật khẩu hay mã OTP ngân hàng. Dữ liệu giao dịch được đồng bộ thông qua chuẩn Webhook SePay VietQR bảo mật cấp ngân hàng.
                </Text>
              </View>
            </View>

            {/* How it works */}
            <View style={styles.infoBox}>
              <Text style={styles.infoTitle}>⚡ Cơ chế hoạt động tự động:</Text>
              <Text style={styles.infoStep}>• Bước 1: Bạn nhập thông tin STK nhận tiền.</Text>
              <Text style={styles.infoStep}>• Bước 2: Khi có ai đó chuyển khoản hoặc bạn chi tiêu qua tài khoản này, SePay Webhook tự động bắn thông báo về WIVI.</Text>
              <Text style={styles.infoStep}>• Bước 3: WIVI tự động phân bổ thu nhập vào 6 Hũ và cập nhật số dư tức thì.</Text>
            </View>
          </ScrollView>

          {/* Action Button */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
              onPress={handleLinkBank}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <View style={styles.btnRow}>
                  <MaterialCommunityIcons name="link-variant" size={20} color="#FFFFFF" />
                  <Text style={styles.submitBtnText}>Xác nhận liên kết</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#13151B',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: '#262933',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#222530',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bankIconGlow: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(0, 210, 211, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#00D2D3',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: '#8A92A6',
    fontSize: 11,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: '#222530',
  },
  formContainer: {
    padding: 20,
  },
  label: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 10,
  },
  bankList: {
    gap: 8,
    paddingBottom: 10,
  },
  bankCard: {
    width: 80,
    height: 60,
    borderRadius: 12,
    backgroundColor: '#1E2230',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#2D3245',
  },
  bankCardSelected: {
    backgroundColor: 'rgba(0, 210, 211, 0.12)',
    borderColor: '#00D2D3',
  },
  bankShort: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '700',
  },
  bankShortSelected: {
    color: '#00D2D3',
  },
  bankFullName: {
    color: '#64748B',
    fontSize: 10,
    marginTop: 2,
  },
  bankFullNameSelected: {
    color: '#E2E8F0',
  },
  input: {
    backgroundColor: '#1C1F2B',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2D3245',
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 10,
  },
  securityBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    padding: 12,
    borderRadius: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    marginTop: 8,
  },
  securityTitle: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
  },
  securityDesc: {
    color: '#94A3B8',
    fontSize: 11,
    lineHeight: 16,
  },
  infoBox: {
    backgroundColor: '#181A24',
    padding: 14,
    borderRadius: 12,
    marginTop: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#252938',
  },
  infoTitle: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  infoStep: {
    color: '#94A3B8',
    fontSize: 11,
    lineHeight: 18,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#222530',
    backgroundColor: '#181A22',
  },
  submitBtn: {
    backgroundColor: '#00B894',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
