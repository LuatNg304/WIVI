import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type TabType = 'home' | 'history' | 'record' | 'jars' | 'discipline';

interface FloatingTabBarProps {
  activeTab: TabType;
  onTabPress: (tab: TabType) => void;
}

export const FloatingTabBar: React.FC<FloatingTabBarProps> = ({ activeTab, onTabPress }) => {
  const insets = useSafeAreaInsets();

  // Custom scanner focus icon layout
  const renderScannerIcon = (color: string) => {
    return (
      <View style={styles.scannerIconWrapper}>
        {/* Corners */}
        <View style={[styles.corner, styles.topLeft, { borderColor: color }]} />
        <View style={[styles.corner, styles.topRight, { borderColor: color }]} />
        <View style={[styles.corner, styles.bottomLeft, { borderColor: color }]} />
        <View style={[styles.corner, styles.bottomRight, { borderColor: color }]} />
        {/* Plus sign */}
        <Feather name="plus" size={14} color={color} style={styles.scannerPlus} />
      </View>
    );
  };

  const tabs: { id: TabType; icon: string; provider: 'Feather' | 'Ionicons' | 'custom' }[] = [
    { id: 'home', icon: 'home', provider: 'Feather' },
    { id: 'history', icon: 'clock', provider: 'Feather' },
    { id: 'record', icon: 'custom', provider: 'custom' },
    { id: 'jars', icon: 'wallet-outline', provider: 'Ionicons' },
    { id: 'discipline', icon: 'smile', provider: 'Feather' },
  ];

  return (
    <View style={[styles.container, { bottom: Math.max(insets.bottom, 12) }]}>
      <View style={styles.tabRow}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          
          return (
            <TouchableOpacity
              key={tab.id}
              activeOpacity={0.8}
              onPress={() => onTabPress(tab.id)}
              style={[
                styles.tabButton,
                isActive ? styles.activeTabButton : styles.inactiveTabButton
              ]}
            >
              {tab.provider === 'custom' ? (
                renderScannerIcon(isActive ? '#ffffff' : '#1d1d1f')
              ) : tab.provider === 'Ionicons' ? (
                <Ionicons
                  name={tab.icon as any}
                  size={20}
                  color={isActive ? '#ffffff' : '#1d1d1f'}
                />
              ) : (
                <Feather
                  name={tab.icon as any}
                  size={20}
                  color={isActive ? '#ffffff' : '#1d1d1f'}
                />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  tabRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  tabButton: {
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    // Premium soft elevation shadows
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1.5,
  },
  activeTabButton: {
    width: 72, // Black capsule shape
    backgroundColor: '#000000',
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  inactiveTabButton: {
    width: 48, // White circle shape
    backgroundColor: '#ffffff',
    borderColor: '#f2f2f7',
  },
  scannerIconWrapper: {
    width: 20,
    height: 20,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  corner: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderWidth: 1.5,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  scannerPlus: {
    marginTop: -0.5,
  }
});
