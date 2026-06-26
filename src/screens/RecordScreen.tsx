import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert
} from 'react-native';
import { useFinancial } from '../context/FinancialContext';
import { Feather, Ionicons } from '@expo/vector-icons';

type InputMode = 'manual' | 'ocr' | 'bank';

interface MockReceipt {
  id: string;
  merchant: string;
  amount: number;
  preview: string;
}

const MOCK_RECEIPTS: MockReceipt[] = [
  { id: 'rec1', merchant: 'Co.opmart Siêu Thị', amount: 320000, preview: 'Hóa đơn thực phẩm gia đình' },
  { id: 'rec2', merchant: 'Highlands Coffee', amount: 85000, preview: 'Thanh toán nước uống' },
  { id: 'rec3', merchant: 'Nhà Sách Fahasa', amount: 250000, preview: 'Mua sách giáo trình AI' },
  { id: 'rec4', merchant: 'Apple Store Vietnam', amount: 15000000, preview: 'Mua phụ kiện & thiết bị' }, // Low confidence, goes to pending!
];

export const RecordScreen: React.FC = () => {
  const {
    jars,
    addTransaction,
    runOCRBillScan,
    runBankSync
  } = useFinancial();

  const [mode, setMode] = useState<InputMode>('manual');

  // Manual Input State
  const spendJars = jars.filter(j => j.type === 'spend');
  const [manualAmount, setManualAmount] = useState('');
  const [manualDesc, setManualDesc] = useState('');
  const [manualType, setManualType] = useState<'income' | 'expense'>('expense');
  const [selectedJarId, setSelectedJarId] = useState(spendJars[0]?.id || '1');

  // OCR Scan State
  const [selectedReceipt, setSelectedReceipt] = useState<MockReceipt>(MOCK_RECEIPTS[0]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any | null>(null);

  // Bank Sync State
  const [selectedBank, setSelectedBank] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncCount, setSyncCount] = useState<number | null>(null);

  // Handlers
  const handleSaveManual = () => {
    const val = parseFloat(manualAmount.replace(/[^0-9]/g, '')) || 0;
    if (val <= 0) {
      Alert.alert('Lỗi', 'Vui lòng nhập số tiền giao dịch hợp lệ.');
      return;
    }
    if (!manualDesc.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập nội dung giao dịch.');
      return;
    }

    addTransaction(val, manualType, manualDesc, selectedJarId);
    
    // Clear inputs
    setManualAmount('');
    setManualDesc('');
    
    Alert.alert('Thành công', 'Đã lưu giao dịch vào hệ thống.');
  };

  const handleStartOCRScan = async () => {
    setIsScanning(true);
    setScanResult(null);

    try {
      const tx = await runOCRBillScan(selectedReceipt.merchant, selectedReceipt.amount);
      setIsScanning(false);
      setScanResult(tx);
    } catch (e) {
      setIsScanning(false);
      Alert.alert('Lỗi', 'Quét hóa đơn thất bại. Vui lòng thử lại.');
    }
  };

  const handleStartBankSync = async () => {
    if (!selectedBank) {
      Alert.alert('Thông báo', 'Vui lòng chọn ngân hàng cần kết nối.');
      return;
    }
    setIsSyncing(true);
    setSyncCount(null);

    try {
      const count = await runBankSync();
      setIsSyncing(false);
      setSyncCount(count);
    } catch (e) {
      setIsSyncing(false);
      Alert.alert('Lỗi', 'Đồng bộ ngân hàng thất bại. Vui lòng kiểm tra lại kết nối.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.screenTitle}>Ghi nhận Giao dịch</Text>

      {/* SEGMENTED CONTROL */}
      <View style={styles.segmentedContainer}>
        {(['manual', 'ocr', 'bank'] as InputMode[]).map((m) => {
          const label = m === 'manual' ? 'Nhập tay' : m === 'ocr' ? 'Quét hóa đơn' : 'Đồng bộ Bank';
          const icon = m === 'manual' ? 'edit-2' : m === 'ocr' ? 'camera' : 'refresh-cw';

          return (
            <TouchableOpacity
              key={m}
              style={[styles.segmentTab, mode === m && styles.activeSegmentTab]}
              onPress={() => {
                setMode(m);
                setScanResult(null);
                setSyncCount(null);
              }}
            >
              <Feather
                name={icon as any}
                size={14}
                color={mode === m ? '#ffffff' : '#1d1d1f'}
                style={styles.tabIcon}
              />
              <Text style={[styles.segmentLabel, mode === m && styles.activeSegmentLabel]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 1. MANUAL INPUT FORM */}
        {mode === 'manual' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Nhập giao dịch thủ công</Text>

            {/* Type selector */}
            <View style={styles.typeSelector}>
              <TouchableOpacity
                style={[styles.typeBtn, manualType === 'expense' && styles.typeBtnExpense]}
                onPress={() => setManualType('expense')}
              >
                <Text style={[styles.typeText, manualType === 'expense' && styles.activeTypeText]}>
                  Chi tiêu (Chi ra)
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeBtn, manualType === 'income' && styles.typeBtnIncome]}
                onPress={() => setManualType('income')}
              >
                <Text style={[styles.typeText, manualType === 'income' && styles.activeTypeText]}>
                  Thu nhập (Cộng tiền)
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Số tiền (VND)</Text>
              <TextInput
                style={styles.amountInput}
                keyboardType="numeric"
                placeholder="0"
                value={manualAmount ? parseFloat(manualAmount).toLocaleString('vi-VN') : ''}
                onChangeText={(text) => setManualAmount(text.replace(/[^0-9]/g, ''))}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Mô tả chi tiết</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Ví dụ: Mua sắm siêu thị, Ăn trưa..."
                value={manualDesc}
                onChangeText={setManualDesc}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Chọn hũ phân loại</Text>
              <View style={styles.jarsContainer}>
                {spendJars.map((j) => (
                  <TouchableOpacity
                    key={j.id}
                    style={[
                      styles.jarChip,
                      { borderColor: j.color },
                      selectedJarId === j.id && { backgroundColor: j.color }
                    ]}
                    onPress={() => setSelectedJarId(j.id)}
                  >
                    <Text style={[
                      styles.jarChipText,
                      selectedJarId === j.id ? styles.activeJarText : { color: j.color }
                    ]}>
                      {j.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity style={styles.submitBtn} onPress={handleSaveManual}>
              <Text style={styles.submitBtnText}>Ghi nhận Giao dịch</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 2. OCR RECEIPT SCANNER */}
        {mode === 'ocr' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Máy quét hóa đơn thông minh (OCR)</Text>
            <Text style={styles.cardSubtitle}>
              Trí tuệ nhân tạo (AI) sẽ tự động phân tích hóa đơn và đề xuất hũ tài chính tương thích.
            </Text>

            {/* Select Receipt Template */}
            <Text style={styles.inputLabel}>Chọn hóa đơn mẫu để quét thử:</Text>
            <View style={styles.receiptGrid}>
              {MOCK_RECEIPTS.map((r) => (
                <TouchableOpacity
                  key={r.id}
                  style={[
                    styles.receiptCard,
                    selectedReceipt.id === r.id && styles.selectedReceiptCard
                  ]}
                  onPress={() => {
                    setSelectedReceipt(r);
                    setScanResult(null);
                  }}
                >
                  <Text style={styles.receiptMerchant}>{r.merchant}</Text>
                  <Text style={styles.receiptAmount}>{r.amount.toLocaleString('vi-VN')} đ</Text>
                  <Text style={styles.receiptPreview}>{r.preview}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Scan Action */}
            <TouchableOpacity
              style={styles.scanBtn}
              onPress={handleStartOCRScan}
              disabled={isScanning}
            >
              {isScanning ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <>
                  <Feather name="aperture" size={18} color="#ffffff" style={{ marginRight: 6 }} />
                  <Text style={styles.submitBtnText}>Chụp & Quét hóa đơn mẫu</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Scan animation or loader status */}
            {isScanning && (
              <View style={styles.scanningFrame}>
                <View style={styles.laserLine} />
                <Text style={styles.scanningText}>AI đang phân tích hóa đơn...</Text>
              </View>
            )}

            {/* OCR Success Output */}
            {scanResult && !isScanning && (
              <View style={[
                styles.ocrResultContainer,
                scanResult.isPending ? styles.ocrPendingBorder : styles.ocrSuccessBorder
              ]}>
                <View style={styles.resultTitleRow}>
                  <Ionicons
                    name={scanResult.isPending ? 'warning' : 'checkmark-circle'}
                    size={20}
                    color={scanResult.isPending ? '#ffb83d' : '#2ecc71'}
                  />
                  <Text style={styles.resultMainTitle}>
                    {scanResult.isPending ? 'Đã xếp vào Chờ Duyệt (AI)' : 'Quét thành công & Đã Lưu'}
                  </Text>
                </View>

                <View style={styles.resultDetails}>
                  <Text style={styles.resultDetailText}>• Tiền mặt trích: {scanResult.amount.toLocaleString('vi-VN')} VND</Text>
                  <Text style={styles.resultDetailText}>• Cửa hàng: {scanResult.description.replace('Quét hóa đơn: ', '')}</Text>
                  <Text style={styles.resultDetailText}>
                    • Hũ đề xuất: {jars.find(j => j.id === scanResult.jarId)?.name} 
                    {scanResult.isPending ? ' (Cần bạn xác nhận lại ở tab Lịch sử)' : ' (Độ tin cậy >90%)'}
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* 3. BANK SYNCHRONIZATION */}
        {mode === 'bank' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Đồng bộ Tài khoản Ngân hàng</Text>
            <Text style={styles.cardSubtitle}>
              Kết nối trực tiếp tài khoản ngân hàng của bạn để tự động nhập giao dịch trong thời gian thực.
            </Text>

            <View style={styles.banksGrid}>
              {[
                { name: 'Vietcombank', logo: 'credit-card', color: '#1b5e20' },
                { name: 'Techcombank', logo: 'credit-card', color: '#b71c1c' },
                { name: 'BIDV', logo: 'credit-card', color: '#0d47a1' },
                { name: 'VPBank', logo: 'credit-card', color: '#006064' }
              ].map((bank) => (
                <TouchableOpacity
                  key={bank.name}
                  style={[
                    styles.bankCard,
                    selectedBank === bank.name && styles.selectedBankCard
                  ]}
                  onPress={() => {
                    setSelectedBank(bank.name);
                    setSyncCount(null);
                  }}
                >
                  <Ionicons name="card" size={24} color={bank.color} />
                  <Text style={styles.bankName}>{bank.name}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.syncBtn, !selectedBank && styles.disabledBtn]}
              onPress={handleStartBankSync}
              disabled={isSyncing || !selectedBank}
            >
              {isSyncing ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <>
                  <Feather name="refresh-cw" size={16} color="#ffffff" style={{ marginRight: 6 }} />
                  <Text style={styles.submitBtnText}>Kết nối & Đồng bộ giao dịch</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Sync Completed Feedback */}
            {syncCount !== null && !isSyncing && (
              <View style={styles.syncFeedbackCard}>
                <Ionicons name="cloud-done" size={32} color="#2ecc71" />
                <Text style={styles.syncFeedbackTitle}>Đồng bộ hoàn tất!</Text>
                <Text style={styles.syncFeedbackDesc}>
                  WIBI đã đồng bộ thành công và ghi nhận thêm {syncCount} giao dịch mới vào hũ tài chính của bạn từ tài khoản {selectedBank}.
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Space at bottom for floating nav */}
        <View style={{ height: 90 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC', // Crisp slate off-white
    paddingTop: 60,
  },
  screenTitle: {
    fontSize: 28,
    fontFamily: 'SF Pro Display, system-ui, -apple-system, sans-serif',
    fontWeight: '800',
    color: '#0F172A', // Slate 900
    paddingHorizontal: 20,
    marginBottom: 16,
    letterSpacing: -0.6,
  },
  segmentedContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9', // Slate 100
    borderRadius: 20,
    padding: 3,
    marginHorizontal: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0', // Slate 200
  },
  segmentTab: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 17,
  },
  activeSegmentTab: {
    backgroundColor: '#3B82F6', // Modern accent blue
  },
  tabIcon: {
    marginRight: 4,
  },
  segmentLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B', // Slate 500
  },
  activeSegmentLabel: {
    color: '#ffffff',
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#f1f5f9', // Slate border
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.02,
    shadowRadius: 16,
    elevation: 1,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1d1d1f',
    marginBottom: 6,
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#7a7a7a',
    lineHeight: 18,
    marginBottom: 20,
  },
  typeSelector: {
    flexDirection: 'row',
    borderRadius: 10,
    backgroundColor: '#f5f5f7',
    padding: 3,
    marginBottom: 16,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  typeBtnExpense: {
    backgroundColor: '#ffffff',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  typeBtnIncome: {
    backgroundColor: '#ffffff',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  typeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7a7a7a',
  },
  activeTypeText: {
    color: '#1d1d1f',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1d1d1f',
    marginBottom: 8,
  },
  amountInput: {
    backgroundColor: '#f5f5f7',
    height: 52,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 22,
    fontWeight: '700',
    color: '#1d1d1f',
    borderWidth: 1,
    borderColor: '#e5e5ea',
  },
  textInput: {
    backgroundColor: '#f5f5f7',
    height: 44,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#1d1d1f',
    borderWidth: 1,
    borderColor: '#e5e5ea',
  },
  jarsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  jarChip: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#ffffff',
  },
  jarChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  activeJarText: {
    color: '#ffffff',
  },
  submitBtn: {
    backgroundColor: '#0066cc',
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  // OCR styles
  receiptGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  receiptCard: {
    width: '48%',
    backgroundColor: '#f5f5f7',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  selectedReceiptCard: {
    backgroundColor: '#ffffff',
    borderColor: '#0066cc',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  receiptMerchant: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1d1d1f',
  },
  receiptAmount: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ff5c5c',
    marginVertical: 4,
  },
  receiptPreview: {
    fontSize: 10,
    color: '#7a7a7a',
  },
  scanBtn: {
    backgroundColor: '#0066cc',
    height: 48,
    borderRadius: 24,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  scanningFrame: {
    height: 100,
    borderWidth: 1.5,
    borderColor: '#0066cc',
    borderStyle: 'dashed',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: 'rgba(0, 102, 204, 0.02)',
  },
  laserLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#0066cc',
    top: '50%',
    shadowColor: '#0066cc',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  scanningText: {
    fontSize: 12,
    color: '#0066cc',
    fontWeight: '600',
    marginTop: 8,
  },
  ocrResultContainer: {
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  ocrSuccessBorder: {
    backgroundColor: 'rgba(46, 204, 113, 0.05)',
    borderColor: 'rgba(46, 204, 113, 0.2)',
  },
  ocrPendingBorder: {
    backgroundColor: 'rgba(255, 184, 61, 0.05)',
    borderColor: 'rgba(255, 184, 61, 0.2)',
  },
  resultTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  resultMainTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1d1d1f',
  },
  resultDetails: {
    gap: 4,
  },
  resultDetailText: {
    fontSize: 13,
    color: '#333333',
  },
  // Bank sync styles
  banksGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  bankCard: {
    width: '47%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#f5f5f7',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'transparent',
    gap: 8,
  },
  selectedBankCard: {
    backgroundColor: '#ffffff',
    borderColor: '#0066cc',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  bankName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1d1d1f',
  },
  syncBtn: {
    backgroundColor: '#0066cc',
    height: 48,
    borderRadius: 24,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledBtn: {
    backgroundColor: '#a3cbff',
  },
  syncFeedbackCard: {
    marginTop: 20,
    backgroundColor: 'rgba(46, 204, 113, 0.05)',
    borderColor: 'rgba(46, 204, 113, 0.2)',
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    gap: 6,
  },
  syncFeedbackTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2ecc71',
    marginTop: 4,
  },
  syncFeedbackDesc: {
    fontSize: 13,
    color: '#333333',
    textAlign: 'center',
    lineHeight: 18,
  },
});
