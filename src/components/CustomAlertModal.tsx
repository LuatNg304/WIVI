import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { Feather } from '@expo/vector-icons';

export interface CustomAlertProps {
  visible: boolean;
  type?: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  onClose: () => void;
  confirmText?: string;
  onConfirm?: () => void;
  cancelText?: string;
  onCancel?: () => void;
}

export const CustomAlertModal: React.FC<CustomAlertProps> = ({
  visible,
  type = 'success',
  title,
  message,
  onClose,
  confirmText = 'Đồng ý',
  onConfirm,
  cancelText,
  onCancel,
}) => {
  if (!visible) return null;

  const getTheme = () => {
    switch (type) {
      case 'error':
        return {
          icon: 'alert-circle' as const,
          color: '#EF4444',
          bgColor: '#FEF2F2',
          borderColor: '#FECACA',
          btnBg: '#EF4444',
        };
      case 'warning':
        return {
          icon: 'alert-triangle' as const,
          color: '#F59E0B',
          bgColor: '#FFFBEB',
          borderColor: '#FDE68A',
          btnBg: '#F59E0B',
        };
      case 'info':
        return {
          icon: 'info' as const,
          color: '#2563EB',
          bgColor: '#EFF6FF',
          borderColor: '#BFDBFE',
          btnBg: '#2563EB',
        };
      case 'success':
      default:
        return {
          icon: 'check-circle' as const,
          color: '#10B981',
          bgColor: '#ECFDF5',
          borderColor: '#A7F3D0',
          btnBg: '#10B981',
        };
    }
  };

  const theme = getTheme();

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    }
    onClose();
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Icon Badge */}
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: theme.bgColor, borderColor: theme.borderColor },
            ]}
          >
            <Feather name={theme.icon} size={28} color={theme.color} />
          </View>

          {/* Text content */}
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          {/* Action Buttons */}
          <View style={styles.actionsRow}>
            {cancelText && (
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={handleCancel}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelBtnText}>{cancelText}</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.confirmBtn, { backgroundColor: theme.btnBg }]}
              onPress={handleConfirm}
              activeOpacity={0.7}
            >
              <Text style={styles.confirmBtnText}>{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  message: {
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
    fontWeight: '500',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  cancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  confirmBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  confirmBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
