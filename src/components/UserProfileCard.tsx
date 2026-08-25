import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Alert, Platform } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';

interface UserProfileCardProps {
  onLogoutPress?: () => void;
}

export const UserProfileCard: React.FC<UserProfileCardProps> = ({ onLogoutPress }) => {
  const { user, isAdmin, logout } = useAuth();

  if (!user) return null;

  const handleConfirmLogout = async () => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Bạn có chắc chắn muốn đăng xuất khỏi ứng dụng WIVI?');
      if (confirmed) {
        await logout();
        if (onLogoutPress) onLogoutPress();
      }
      return;
    }

    Alert.alert(
      'Đăng Xuất',
      'Bạn có chắc chắn muốn đăng xuất khỏi ứng dụng WIVI?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Đăng xuất',
          style: 'destructive',
          onPress: async () => {
            await logout();
            if (onLogoutPress) onLogoutPress();
          },
        },
      ]
    );
  };

  return (
    <View style={styles.cardContainer}>
      <View style={styles.headerRow}>
        <Image
          source={{ uri: user.avatar_url || 'https://ui-avatars.com/api/?name=User&background=0066cc&color=fff' }}
          style={styles.avatar}
        />
        <View style={styles.infoArea}>
          <View style={styles.nameRow}>
            <Text style={styles.fullName}>{user.full_name || 'Người Dùng'}</Text>
            {isAdmin ? (
              <View style={styles.adminBadge}>
                <Ionicons name="shield-checkmark" size={12} color="#ffffff" />
                <Text style={styles.adminBadgeText}>ADMIN</Text>
              </View>
            ) : (
              <View style={styles.userBadge}>
                <Text style={styles.userBadgeText}>MEMBER</Text>
              </View>
            )}
          </View>
          <Text style={styles.emailText}>{user.email}</Text>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleConfirmLogout}>
          <Ionicons name="log-out-outline" size={22} color="#ff3b30" />
        </TouchableOpacity>
      </View>

      {isAdmin && (
        <View style={styles.adminBanner}>
          <Ionicons name="ribbon-sharp" size={16} color="#d97706" />
          <Text style={styles.adminBannerText}>
            Bạn đang đăng nhập với quyền Quản trị viên (Admin System)
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    marginHorizontal: 20,
    marginVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#e6f0fa',
  },
  infoArea: {
    flex: 1,
    marginLeft: 14,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fullName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1d1d1f',
  },
  emailText: {
    fontSize: 13,
    color: '#7a7a7a',
    marginTop: 2,
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ff3b30',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 4,
  },
  adminBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  userBadge: {
    backgroundColor: '#e5e5ea',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  userBadgeText: {
    color: '#636366',
    fontSize: 10,
    fontWeight: '700',
  },
  logoutButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff2f2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 12,
    gap: 8,
  },
  adminBannerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#b45309',
    flex: 1,
  },
});
