import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Platform,
  Alert,
  TouchableWithoutFeedback,
  Dimensions,
} from 'react-native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { useFinancial } from '../context/FinancialContext';

const { width } = Dimensions.get('window');

interface AvatarDropdownModalProps {
  visible: boolean;
  onClose: () => void;
  onNavigateToSettings?: () => void;
  onNavigateToHistory?: () => void;
  onOpenVipModal?: () => void;
}

export const AvatarDropdownModal: React.FC<AvatarDropdownModalProps> = ({
  visible,
  onClose,
  onNavigateToSettings,
  onNavigateToHistory,
  onOpenVipModal,
}) => {
  const { user, logout, isAdmin } = useAuth();
  const { isVip, userName, resetSetup } = useFinancial();

  const displayName = user?.full_name || userName || user?.username || 'Người dùng WIVI';
  const displayEmail = user?.email || 'user@wivi.app';
  const initialLetter = (displayName[0] || 'W').toUpperCase();

  const handleResetSetup = () => {
    const performReset = async () => {
      onClose();
      try {
        await resetSetup();
      } catch (err) {
        console.warn('Reset setup error:', err);
      }
    };

    if (Platform.OS === 'web') {
      const confirmed = window.confirm(
        'Bạn có chắc chắn muốn thiết lập lại từ đầu? Toàn bộ lịch sử giao dịch, mục tiêu, các hũ và cấu hình sẽ được xóa sạch và đặt lại về Bước 1.'
      );
      if (confirmed) {
        performReset();
      }
      return;
    }

    Alert.alert(
      'Thiết lập lại từ đầu',
      'Bạn có chắc chắn muốn xóa sạch toàn bộ lịch sử giao dịch, các hũ, mục tiêu và thiết lập lại tài chính từ Bước 1?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Thiết lập lại',
          style: 'destructive',
          onPress: performReset,
        },
      ]
    );
  };

  const handleLogout = () => {
    const performLogout = async () => {
      onClose();
      try {
        await logout();
      } catch (err) {
        console.warn('Logout error:', err);
      }
    };

    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Bạn có chắc chắn muốn đăng xuất khỏi WIVI?');
      if (confirmed) {
        performLogout();
      }
      return;
    }

    Alert.alert(
      'Đăng xuất',
      'Bạn có chắc chắn muốn đăng xuất khỏi tài khoản WIVI?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Đăng xuất',
          style: 'destructive',
          onPress: performLogout,
        },
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <View style={styles.dropdownContainer}>
              {/* Profile Card Header */}
              <View style={styles.profileHeader}>
                <LinearGradient
                  colors={['#3B82F6', '#1D4ED8']}
                  style={styles.avatarGradient}
                >
                  <Text style={styles.avatarLetter}>{initialLetter}</Text>
                </LinearGradient>
                <View style={styles.profileInfo}>
                  <Text style={styles.profileName} numberOfLines={1}>
                    {displayName}
                  </Text>
                  <Text style={styles.profileEmail} numberOfLines={1}>
                    {displayEmail}
                  </Text>
                  <View style={styles.badgeRow}>
                    {isAdmin && (
                      <View style={styles.adminBadge}>
                        <Text style={styles.adminBadgeText}>ADMIN</Text>
                      </View>
                    )}
                    <View style={[styles.vipBadge, isVip ? styles.vipActive : styles.vipFree]}>
                      <Ionicons
                        name={isVip ? 'star' : 'person-outline'}
                        size={11}
                        color={isVip ? '#D97706' : '#64748B'}
                      />
                      <Text style={[styles.vipBadgeText, isVip ? styles.vipActiveText : styles.vipFreeText]}>
                        {isVip ? 'VIP Member' : 'Gói Miễn phí'}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              <View style={styles.divider} />

              {/* Menu List */}
              <View style={styles.menuList}>
                {!isVip && onOpenVipModal && (
                  <TouchableOpacity
                    style={styles.vipPromoItem}
                    activeOpacity={0.8}
                    onPress={() => {
                      onClose();
                      onOpenVipModal();
                    }}
                  >
                    <View style={styles.vipPromoIcon}>
                      <Ionicons name="sparkles" size={16} color="#D97706" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.vipPromoTitle}>Nâng cấp VIP PRO</Text>
                      <Text style={styles.vipPromoSub}>Mở khóa AI & tính năng nâng cao</Text>
                    </View>
                    <Feather name="chevron-right" size={16} color="#94A3B8" />
                  </TouchableOpacity>
                )}

                {onNavigateToSettings && (
                  <TouchableOpacity
                    style={styles.menuItem}
                    activeOpacity={0.7}
                    onPress={() => {
                      onClose();
                      onNavigateToSettings();
                    }}
                  >
                    <View style={[styles.menuIconBox, { backgroundColor: '#EFF6FF' }]}>
                      <MaterialCommunityIcons name="wallet-outline" size={18} color="#2563EB" />
                    </View>
                    <Text style={styles.menuItemText}>Hũ tài chính & Ngân sách</Text>
                    <Feather name="chevron-right" size={16} color="#CBD5E1" />
                  </TouchableOpacity>
                )}

                {onNavigateToHistory && (
                  <TouchableOpacity
                    style={styles.menuItem}
                    activeOpacity={0.7}
                    onPress={() => {
                      onClose();
                      onNavigateToHistory();
                    }}
                  >
                    <View style={[styles.menuIconBox, { backgroundColor: '#F0FDF4' }]}>
                      <Feather name="clock" size={16} color="#16A34A" />
                    </View>
                    <Text style={styles.menuItemText}>Lịch sử thu chi & Hóa đơn</Text>
                    <Feather name="chevron-right" size={16} color="#CBD5E1" />
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.divider} />

              {/* Action Buttons Section */}
              <View style={styles.actionSection}>
                {/* Logout Button */}
                <TouchableOpacity
                  style={styles.logoutBtn}
                  activeOpacity={0.8}
                  onPress={handleLogout}
                >
                  <View style={styles.logoutIconBox}>
                    <Ionicons name="log-out-outline" size={18} color="#EF4444" />
                  </View>
                  <Text style={styles.logoutText}>Đăng xuất tài khoản</Text>
                </TouchableOpacity>

                {/* Reset Setup / Start From Step 1 Button */}
                <TouchableOpacity
                  style={styles.resetBtn}
                  activeOpacity={0.8}
                  onPress={handleResetSetup}
                >
                  <View style={styles.resetIconBox}>
                    <Feather name="refresh-cw" size={16} color="#D97706" />
                  </View>
                  <View style={styles.resetTextContainer}>
                    <Text style={styles.resetText}>Thiết lập lại từ đầu</Text>
                    <Text style={styles.resetSubText}>Đặt lại mục tiêu & hũ từ bước 1</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    paddingTop: Platform.OS === 'ios' ? 95 : 75,
    paddingLeft: 16,
  },
  dropdownContainer: {
    width: Math.min(width - 32, 310),
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarGradient: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLetter: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  profileEmail: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  vipBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  vipBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#B45309',
  },
  freeBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  freeBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
  },
  adminBadge: {
    backgroundColor: '#818CF8',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  adminBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12,
  },
  menuSection: {
    gap: 4,
  },
  vipPromoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    padding: 10,
    borderRadius: 14,
    gap: 10,
    marginBottom: 4,
  },
  vipPromoIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  vipPromoTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#92400E',
  },
  vipPromoSub: {
    fontSize: 11,
    color: '#B45309',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 12,
    gap: 10,
  },
  menuIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuItemText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 12,
    gap: 10,
    backgroundColor: '#FEF2F2',
  },
  logoutIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#DC2626',
  },
  actionSection: {
    gap: 8,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 12,
    gap: 10,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  resetIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resetTextContainer: {
    flex: 1,
  },
  resetText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#B45309',
  },
  resetSubText: {
    fontSize: 10.5,
    fontWeight: '500',
    color: '#D97706',
    marginTop: 1,
  },
  vipActive: {
    backgroundColor: '#FEF3C7',
  },
  vipActiveText: {
    color: '#B45309',
  },
  vipFree: {
    backgroundColor: '#F1F5F9',
  },
  vipFreeText: {
    color: '#64748B',
  },
  menuList: {
    gap: 4,
  },
});

