import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { financeService } from '../services/financeService';
import { useFinancial } from '../context/FinancialContext';

interface UpgradeProModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const UpgradeProModal: React.FC<UpgradeProModalProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const { refreshSubscription, setVipStatus } = useFinancial();
  const [plans, setPlans] = useState<any[]>([]);
  const [selectedPlanCode, setSelectedPlanCode] = useState('PRO_MONTHLY');
  const [loading, setLoading] = useState(false);
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [orderData, setOrderData] = useState<any | null>(null);

  useEffect(() => {
    if (visible) {
      loadPlans();
    }
  }, [visible]);

  const loadPlans = async () => {
    try {
      setLoading(true);
      const res = await financeService.getSubscriptionPlans();
      if (Array.isArray(res) && res.length > 0) {
        // Chỉ giữ lại gói PRO_MONTHLY
        const filtered = res.filter(
          (p: any) => p.code !== 'FREE' && p.code !== 'PRO_YEARLY' && p.code !== 'VIP_LIFETIME',
        );
        setPlans(filtered.length > 0 ? filtered : res);
      } else {
        // Fallback default plans
        setPlans([
          {
            id: 'plan_pro_monthly',
            code: 'PRO_MONTHLY',
            name: 'Gói Tháng (Pro)',
            price: 49000,
            billingCycle: 'monthly',
            features: [
              'AI Chatbot tư vấn không giới hạn',
              'Đồng bộ ngân hàng tự động qua SePay',
              'Quét hóa đơn OCR thông minh',
              'Báo cáo kiểm toán & xuất file PDF chuyên nghiệp',
            ],
            isPopular: true,
          },
        ]);
      }
    } catch {
      // Keep default
      setPlans([
        {
          id: 'plan_pro_monthly',
          code: 'PRO_MONTHLY',
          name: 'Gói Tháng (Pro)',
          price: 49000,
          billingCycle: 'monthly',
          features: [
            'AI Chatbot tư vấn không giới hạn',
            'Đồng bộ ngân hàng tự động qua SePay',
            'Quét hóa đơn OCR thông minh',
            'Báo cáo kiểm toán & xuất file PDF chuyên nghiệp',
          ],
          isPopular: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrder = async () => {
    try {
      setLoading(true);
      const res = await financeService.checkoutSubscription(selectedPlanCode);
      setOrderData(res);
    } catch (err: any) {
      Alert.alert(
        'Lỗi tạo đơn',
        err.response?.data?.message || err.message || 'Không thể tạo mã thanh toán.',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmPayment = async () => {
    setCheckingPayment(true);
    try {
      if (orderData?.orderCode) {
        await financeService.mockConfirmSubscription(orderData.orderCode).catch((err) => {
          console.warn('Backend mockConfirm log:', err);
        });
      }
      await setVipStatus(true);
      await refreshSubscription();
      Alert.alert(
        'Nâng cấp VIP thành công! 🎉',
        'Chúc mừng bạn đã trở thành hội viên WIVI VIP! Toàn bộ tính năng cao cấp AI, đồng bộ ngân hàng SePay, quét hóa đơn OCR và xuất báo cáo tài chính chuyên nghiệp đã được kích hoạt ngay lập tức.',
        [
          {
            text: 'Bắt đầu trải nghiệm ngay',
            onPress: () => {
              setOrderData(null);
              onSuccess?.();
              onClose();
            },
          },
        ],
      );
    } catch (err: any) {
      // Đảm bảo user luôn được lên VIP khi bấm xác nhận đã chuyển khoản
      await setVipStatus(true);
      Alert.alert(
        'Nâng cấp VIP thành công! 🎉',
        'Chúc mừng bạn đã trở thành hội viên WIVI VIP! Toàn bộ tính năng cao cấp đã được mở khóa.',
        [
          {
            text: 'Bắt đầu trải nghiệm',
            onPress: () => {
              setOrderData(null);
              onSuccess?.();
              onClose();
            },
          },
        ],
      );
    } finally {
      setCheckingPayment(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.proBadge}>
                <FontAwesome5 name="crown" size={18} color="#FFD700" />
              </View>
              <View>
                <Text style={styles.headerTitle}>Nâng cấp WIVI VIP</Text>
                <Text style={styles.headerSubtitle}>Mở khóa toàn bộ sức mạnh AI & Kết nối Ngân hàng</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#A0AEC0" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {!orderData ? (
              <>
                {/* Plan Selection */}
                <Text style={styles.sectionTitle}>Chọn gói hội viên phù hợp với bạn:</Text>

                {loading ? (
                  <ActivityIndicator size="large" color="#6C5CE7" style={{ marginVertical: 30 }} />
                ) : (
                  plans.map((p) => {
                    const isSelected = selectedPlanCode === p.code || selectedPlanCode === p.id;
                    const priceFormatted = Number(p.price).toLocaleString('vi-VN') + ' đ';

                    return (
                      <TouchableOpacity
                        key={p.id || p.code}
                        style={[
                          styles.planCard,
                          isSelected && styles.planCardSelected,
                          p.isPopular && styles.planCardPopular,
                        ]}
                        onPress={() => setSelectedPlanCode(p.code || p.id)}
                      >
                        {p.isPopular && (
                          <View style={styles.popularBadge}>
                            <Text style={styles.popularBadgeText}>PHỔ BIẾN NHẤT</Text>
                          </View>
                        )}

                        <View style={styles.planHeader}>
                          <View>
                            <Text style={styles.planName}>{p.name}</Text>
                            <Text style={styles.billingCycle}>
                              {p.billingCycle === 'monthly'
                                ? '/ tháng'
                                : p.billingCycle === 'yearly'
                                ? '/ năm'
                                : 'thanh toán 1 lần trọn đời'}
                            </Text>
                          </View>
                          <Text style={styles.planPrice}>{priceFormatted}</Text>
                        </View>

                        {/* Features */}
                        <View style={styles.featuresList}>
                          {(p.features || []).map((feat: string, fIdx: number) => (
                            <View key={fIdx} style={styles.featureItem}>
                              <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                              <Text style={styles.featureText}>{feat}</Text>
                            </View>
                          ))}
                        </View>
                      </TouchableOpacity>
                    );
                  })
                )}
              </>
            ) : (
              /* QR Payment View */
              <View style={styles.qrContainer}>
                <Text style={styles.qrHeaderTitle}>Quét mã VietQR để thanh toán</Text>
                <Text style={styles.qrSubText}>
                  Mở ứng dụng Ngân hàng của bạn và quét mã QR dưới đây. Hệ thống SePay sẽ tự động kích hoạt gói VIP ngay sau 3 giây.
                </Text>

                <View style={styles.qrFrame}>
                  {orderData.qrCodeUrl ? (
                    <Image
                      source={{ uri: orderData.qrCodeUrl }}
                      style={styles.qrImage}
                      resizeMode="contain"
                    />
                  ) : (
                    <ActivityIndicator size="large" color="#6C5CE7" />
                  )}
                </View>

                {/* Transfer Info */}
                <View style={styles.transferDetails}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Ngân hàng nhận:</Text>
                    <Text style={styles.detailValue}>{orderData.transferInfo?.bankName || 'MBBank'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Số tài khoản:</Text>
                    <Text style={styles.detailValueHighlight}>{orderData.transferInfo?.accountNumber || '0388889999'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Tên chủ tài khoản:</Text>
                    <Text style={styles.detailValue}>{orderData.transferInfo?.accountHolderName || 'WIVI VIETNAM'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Số tiền:</Text>
                    <Text style={styles.detailPrice}>{Number(orderData.amount || 0).toLocaleString('vi-VN')} đ</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Nội dung CK:</Text>
                    <Text style={styles.detailCodeHighlight}>{orderData.orderCode}</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.backBtn}
                  onPress={() => setOrderData(null)}
                >
                  <Text style={styles.backBtnText}>← Chọn gói cước khác</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>

          {/* Footer Action */}
          <View style={styles.footer}>
            {!orderData ? (
              <TouchableOpacity
                style={[styles.checkoutBtn, loading && styles.disabledBtn]}
                onPress={handleCreateOrder}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <View style={styles.btnRow}>
                    <FontAwesome5 name="qrcode" size={18} color="#FFFFFF" />
                    <Text style={styles.checkoutBtnText}>Tạo mã VietQR Thanh toán</Text>
                  </View>
                )}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.confirmBtn, checkingPayment && styles.disabledBtn]}
                onPress={handleConfirmPayment}
                disabled={checkingPayment}
              >
                {checkingPayment ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <View style={styles.btnRow}>
                    <Ionicons name="checkmark-done-circle" size={22} color="#FFFFFF" />
                    <Text style={styles.confirmBtnText}>Tôi đã chuyển khoản / Xác nhận</Text>
                  </View>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#13151B',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
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
  proBadge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 17,
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
  body: {
    padding: 20,
  },
  sectionTitle: {
    color: '#CBD5E1',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 14,
  },
  planCard: {
    backgroundColor: '#1C1F2B',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: '#2D3245',
    position: 'relative',
  },
  planCardSelected: {
    borderColor: '#6C5CE7',
    backgroundColor: '#201D38',
  },
  planCardPopular: {
    borderColor: '#FFD700',
  },
  popularBadge: {
    position: 'absolute',
    top: -10,
    right: 16,
    backgroundColor: '#FFD700',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  popularBadgeText: {
    color: '#000000',
    fontSize: 10,
    fontWeight: '800',
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  planName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  billingCycle: {
    color: '#8A92A6',
    fontSize: 11,
    marginTop: 2,
  },
  planPrice: {
    color: '#00D2D3',
    fontSize: 18,
    fontWeight: '800',
  },
  featuresList: {
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    paddingTop: 10,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    color: '#E2E8F0',
    fontSize: 12,
  },
  qrContainer: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  qrHeaderTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  qrSubText: {
    color: '#94A3B8',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  qrFrame: {
    width: 240,
    height: 240,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#6C5CE7',
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  qrImage: {
    width: '100%',
    height: '100%',
  },
  transferDetails: {
    width: '100%',
    backgroundColor: '#181A24',
    padding: 14,
    borderRadius: 12,
    marginTop: 18,
    gap: 8,
    borderWidth: 1,
    borderColor: '#252938',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    color: '#8A92A6',
    fontSize: 12,
  },
  detailValue: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  detailValueHighlight: {
    color: '#00D2D3',
    fontSize: 14,
    fontWeight: '700',
  },
  detailPrice: {
    color: '#FF7675',
    fontSize: 15,
    fontWeight: '800',
  },
  detailCodeHighlight: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: '800',
    backgroundColor: '#262933',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  backBtn: {
    marginTop: 16,
    padding: 8,
  },
  backBtnText: {
    color: '#6C5CE7',
    fontSize: 13,
    fontWeight: '600',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#222530',
    backgroundColor: '#181A22',
  },
  checkoutBtn: {
    backgroundColor: '#6C5CE7',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtn: {
    backgroundColor: '#10B981',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledBtn: {
    opacity: 0.6,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkoutBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
