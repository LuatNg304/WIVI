import React, { useState } from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import { Stack } from 'expo-router';
import { FinancialProvider, useFinancial } from '../src/context/FinancialContext';
import { OnboardingScreen } from '../src/screens/OnboardingScreen';
import { HomeScreen } from '../src/screens/HomeScreen';
import { HistoryScreen } from '../src/screens/HistoryScreen';
import { RecordScreen } from '../src/screens/RecordScreen';
import { JarsScreen } from '../src/screens/JarsScreen';
import { DisciplineScreen } from '../src/screens/DisciplineScreen';
import { FloatingTabBar, TabType } from '../src/components/FloatingTabBar';

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

  // Render active screen based on selected tab
  const renderActiveScreen = () => {
    switch (activeTab) {
      case 'home':
        return <HomeScreen onNavigateToSettings={() => setActiveTab('jars')} />;
      case 'history':
        return <HistoryScreen />;
      case 'record':
        return <RecordScreen />;
      case 'jars':
        return <JarsScreen />;
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

export default function Index() {
  return (
    <FinancialProvider>
      <MainAppContent />
    </FinancialProvider>
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
});
