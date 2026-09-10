import React, { useState } from 'react';
import { View, StyleSheet, StatusBar, ActivityIndicator, Text } from 'react-native';
import { Stack } from 'expo-router';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { FinancialProvider, useFinancial } from '../src/context/FinancialContext';
import { LoginScreen } from '../src/screens/LoginScreen';
import { RegisterScreen } from '../src/screens/RegisterScreen';
import { OtpVerificationScreen } from '../src/screens/OtpVerificationScreen';
import { OnboardingScreen } from '../src/screens/OnboardingScreen';
import { HomeScreen } from '../src/screens/HomeScreen';
import { HistoryScreen } from '../src/screens/HistoryScreen';
import { RecordScreen } from '../src/screens/RecordScreen';
import { JarsScreen } from '../src/screens/JarsScreen';
import { DisciplineScreen } from '../src/screens/DisciplineScreen';
import { UserProfileCard } from '../src/components/UserProfileCard';
import { FloatingTabBar, TabType } from '../src/components/FloatingTabBar';

type AuthScreenType = 'login' | 'register' | 'otp';

function AuthNavigator() {
  const [currentScreen, setCurrentScreen] = useState<AuthScreenType>('login');
  const [targetEmail, setTargetEmail] = useState('');

  const navigateToOtp = (email: string) => {
    setTargetEmail(email);
    setCurrentScreen('otp');
  };

  switch (currentScreen) {
    case 'register':
      return (
        <RegisterScreen
          onNavigateToLogin={() => setCurrentScreen('login')}
          onNavigateToOtp={navigateToOtp}
        />
      );
    case 'otp':
      return (
        <OtpVerificationScreen
          email={targetEmail}
          onNavigateBack={() => setCurrentScreen('login')}
        />
      );
    case 'login':
    default:
      return (
        <LoginScreen
          onNavigateToRegister={() => setCurrentScreen('register')}
          onNavigateToOtp={navigateToOtp}
        />
      );
  }
}

function MainAppContent() {
  const { hasCompletedSetup } = useFinancial();
  const [activeTab, setActiveTab] = useState<TabType>('home');

  if (!hasCompletedSetup) {
    return (
      <View style={[styles.container, { backgroundColor: '#ffffff' }]}>
        <StatusBar barStyle="dark-content" />
        <OnboardingScreen />
      </View>
    );
  }

  // Render màn hình tương ứng tab
  const renderActiveScreen = () => {
    switch (activeTab) {
      case 'home':
        return (
          <View style={{ flex: 1 }}>
            <UserProfileCard />
            <HomeScreen onNavigateToSettings={() => setActiveTab('jars')} />
          </View>
        );
      case 'history':
        return <HistoryScreen />;
      case 'record':
        return <RecordScreen />;
      case 'jars':
        return (
          <View style={{ flex: 1 }}>
            <UserProfileCard />
            <JarsScreen />
          </View>
        );
      case 'discipline':
        return <DisciplineScreen />;
      default:
        return <HomeScreen />;
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Active screen content */}
      <View style={styles.contentArea}>
        {renderActiveScreen()}
      </View>

      {/* Floating custom Apple navigation bar */}
      <FloatingTabBar activeTab={activeTab} onTabPress={setActiveTab} />
    </View>
  );
}

function AppGuard() {
  const { isAuthenticated, isLoading } = useAuth();
  const { hasCompletedSetup } = useFinancial();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" />
        <ActivityIndicator size="large" color="#0066cc" />
        <Text style={styles.loadingText}>Đang tải dữ liệu WIVI...</Text>
      </View>
    );
  }

  // Khi CHƯA ĐĂNG NHẬP hoặc ĐÃ BẤM ĐĂNG XUẤT -> Đẩy về OnboardingScreen bước 3 (Sign in)
  if (!isAuthenticated) {
    return (
      <View style={[styles.container, { backgroundColor: '#ffffff' }]}>
        <StatusBar barStyle="dark-content" />
        <OnboardingScreen initialStep={3} />
      </View>
    );
  }

  // Khi ĐÃ ĐĂNG NHẬP nhưng CHƯA THIẾT LẬP MỤC TIÊU -> Đẩy về bước 4 (Setup)
  if (!hasCompletedSetup) {
    return (
      <View style={[styles.container, { backgroundColor: '#ffffff' }]}>
        <StatusBar barStyle="dark-content" />
        <OnboardingScreen initialStep={4} />
      </View>
    );
  }

  return <MainAppContent />;
}

export default function Index() {
  return (
    <AuthProvider>
      <FinancialProvider>
        <AppGuard />
      </FinancialProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f7',
  },
  contentArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f7',
    gap: 12,
  },
  loadingText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#7a7a7a',
  },
});
