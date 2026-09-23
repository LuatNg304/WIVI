import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useFinancial } from '../context/FinancialContext';
import { AvatarDropdownModal } from './AvatarDropdownModal';
import { UpgradeProModal } from './UpgradeProModal';

export interface AppHeaderProps {
  onNavigateToSettings?: () => void;
  onNavigateToHistory?: () => void;
  onNavigateToRecord?: () => void;
  rightAction?: React.ReactNode;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  onNavigateToSettings,
  onNavigateToHistory,
  onNavigateToRecord,
  rightAction,
}) => {
  const { user } = useAuth();
  const {
    isVip,
    userName,
    alerts = [],
    markAlertAsRead,
    clearAlerts,
  } = useFinancial();

  // Modals
  const [avatarDropdownVisible, setAvatarDropdownVisible] = useState(false);
  const [upgradeModalVisible, setUpgradeModalVisible] = useState(false);
  const [alertsModalVisible, setAlertsModalVisible] = useState(false);

  // User Profile
  const rawName = (user as any)?.first_name || user?.full_name || userName || 'Chien';
  const fullName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
  const firstName = fullName.trim().split(' ').pop() || 'Chien';
  const userEmail = user?.email || 'user@wivi.vn';
  const unreadAlertsCount = alerts ? alerts.filter((a) => !a.read).length : 0;

  return (
    <View style={styles.header}>
      {/* LEFT: AVATAR, FULL NAME, EMAIL & VIP BADGE */}
      <TouchableOpacity
        style={styles.headerLeftWithAvatar}
        activeOpacity={0.75}
        onPress={() => setAvatarDropdownVisible(true)}
      >
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarInitial}>
            {(firstName[0] || 'C').toUpperCase()}
          </Text>
        </View>
        <View style={styles.headerLeftText}>
          <View style={styles.nameRow}>
            <Text style={styles.greetingName} numberOfLines={1}>
              {fullName}
            </Text>
            {isVip ? (
              <View style={styles.vipBadgePro}>
                <Ionicons name="diamond" size={10} color="#D97706" />
                <Text style={styles.vipBadgeProText}>VIP PRO</Text>
              </View>
            ) : (
              <View style={styles.freeBadge}>
                <Text style={styles.freeBadgeText}>Gói Miễn phí</Text>
              </View>
            )}
            <Feather name="chevron-down" size={13} color="#94A3B8" />
          </View>
          <Text style={styles.userEmailText} numberOfLines={1}>
            {userEmail}
          </Text>
        </View>
      </TouchableOpacity>

      {/* RIGHT: CUSTOM ACTION + NOTIFICATION BELL */}
      <View style={styles.headerRight}>
        {rightAction}

        <TouchableOpacity
          style={styles.bellButton}
          onPress={() => setAlertsModalVisible(true)}
          activeOpacity={0.8}
        >
          <Feather name="bell" size={21} color="#0F172A" />
          {unreadAlertsCount > 0 && <View style={styles.bellBadgeDot} />}
        </TouchableOpacity>
      </View>

      {/* 1. NOTIFICATIONS & ALERTS MODAL */}
      <Modal visible={alertsModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={styles.modalTitle}>Thông báo & Cảnh báo</Text>
                {unreadAlertsCount > 0 && (
                  <View style={styles.unreadCountBadge}>
                    <Text style={styles.unreadCountBadgeText}>{unreadAlertsCount}</Text>
                  </View>
                )}
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                {alerts.length > 0 && (
                  <TouchableOpacity onPress={() => clearAlerts()} activeOpacity={0.7}>
                    <Text style={styles.markAllReadText}>Đọc tất cả</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => setAlertsModalVisible(false)} style={styles.closeBtn}>
                  <Feather name="x" size={20} color="#64748B" />
                </TouchableOpacity>
              </View>
            </View>

            {alerts.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 32 }}>
                <Ionicons name="checkmark-circle-outline" size={44} color="#10B981" />
                <Text style={{ fontSize: 14.5, fontWeight: '600', color: '#0F172A', marginTop: 10 }}>
                  Không có cảnh báo mới
                </Text>
                <Text style={{ fontSize: 12.5, color: '#64748B', marginTop: 4, textAlign: 'center' }}>
                  Các hũ tài chính của bạn đang hoạt động trong mức ngân sách an toàn.
                </Text>
              </View>
            ) : (
              <ScrollView style={{ maxHeight: 360 }}>
                {alerts.map((a) => (
                  <TouchableOpacity
                    key={a.id}
                    style={[
                      styles.alertItem,
                      !a.read && styles.alertItemUnread,
                      a.type === 'warning' && styles.alertItemWarning,
                    ]}
                    onPress={() => markAlertAsRead(a.id)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.alertItemHeaderRow}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                        <Ionicons
                          name={a.type === 'warning' ? 'warning' : 'notifications'}
                          size={16}
                          color={a.type === 'warning' ? '#D97706' : '#2563EB'}
                        />
                        <Text style={styles.alertItemTitle} numberOfLines={1}>
                          {a.title}
                        </Text>
                      </View>
                      {!a.read && <View style={styles.alertDot} />}
                    </View>
                    <Text style={styles.alertItemBody}>{a.message}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* 2. AVATAR PROFILE DROPDOWN MODAL */}
      <AvatarDropdownModal
        visible={avatarDropdownVisible}
        onClose={() => setAvatarDropdownVisible(false)}
        onNavigateToSettings={onNavigateToSettings}
        onNavigateToHistory={onNavigateToHistory}
        onOpenVipModal={() => setUpgradeModalVisible(true)}
      />

      {/* 3. VIP UPGRADE MODAL */}
      <UpgradeProModal
        visible={upgradeModalVisible}
        onClose={() => setUpgradeModalVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 8,
    backgroundColor: '#F8FAFC',
  },
  headerLeftWithAvatar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 10,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  avatarInitial: {
    fontSize: 19,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  headerLeftText: {
    justifyContent: 'center',
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  greetingName: {
    fontSize: 15.5,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  userEmailText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 1,
  },
  vipBadgePro: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  vipBadgeProText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#D97706',
  },
  freeBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  freeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bellButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  bellBadgeDot: {
    position: 'absolute',
    top: 9,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  closeBtn: {
    padding: 4,
  },
  unreadCountBadge: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  unreadCountBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  markAllReadText: {
    color: '#2563EB',
    fontSize: 12.5,
    fontWeight: '600',
  },
  alertItem: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  alertItemUnread: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  alertItemWarning: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  alertItemHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  alertItemTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
  },
  alertItemBody: {
    fontSize: 12.5,
    color: '#475569',
    lineHeight: 18,
  },
  alertDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2563EB',
    marginLeft: 6,
  },
});
