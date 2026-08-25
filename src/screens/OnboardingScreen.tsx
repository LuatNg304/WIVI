import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Dimensions,
  Animated,
  StatusBar
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFinancial } from '../context/FinancialContext';
import { useAuth } from '../context/AuthContext';
import { Feather, Ionicons } from '@expo/vector-icons';
import Svg, { Path, Defs, ClipPath, Rect } from 'react-native-svg';

const { width, height } = Dimensions.get('window');
const bannerHeight = height * 0.38;

// Color Palette for Jars
const JAR_COLORS = [
  '#0066cc', // Action Blue
  '#2ecc71', // Green
  '#ff5c5c', // Red
  '#ffb83d', // Orange
  '#9b59b6', // Purple
  '#1abc9c', // Teal
];

interface CustomJarSetup {
  id: string;
  name: string;
  type: 'spend' | 'save';
  percent: number;
  target?: number;
  color: string;
}

// Topographic Wave Header SVG component matching mockup
const TopographicHeader: React.FC<{ heightVal: number }> = ({ heightVal }) => {
  return (
    <View style={[styles.svgHeaderContainer, { height: heightVal }]}>
      <Svg width="100%" height={heightVal} viewBox={`0 0 ${width} ${heightVal}`} style={styles.svgHeader}>
        <Defs>
          <ClipPath id="waveClip">
            <Path
              d={`M-10,0 L-10,${heightVal * 0.78} Q${width * 0.3},${heightVal * 1.1} ${width * 0.7},${heightVal * 0.72} T${width + 10},${heightVal * 0.82} L${width + 10},0 Z`}
            />
          </ClipPath>
        </Defs>

        {/* Base Blue Background */}
        <Rect x="-10" y="0" width={width + 20} height={heightVal} fill="#3A55B4" clipPath="url(#waveClip)" />

        {/* Topographic Lines inside the clipped area */}
        <Path
          d={`M-50,${heightVal * 0.25} C${width * 0.2},${heightVal * 0.05} ${width * 0.4},${heightVal * 0.45} ${width * 0.7},${heightVal * 0.2} C${width * 0.9},${heightVal * 0.05} ${width * 1.1},${heightVal * 0.3} ${width * 1.3},${heightVal * 0.2}`}
          fill="none"
          stroke="rgba(255, 255, 255, 0.14)"
          strokeWidth="2"
          clipPath="url(#waveClip)"
        />
        <Path
          d={`M-40,${heightVal * 0.4} C${width * 0.2},${heightVal * 0.2} ${width * 0.4},${heightVal * 0.6} ${width * 0.7},${heightVal * 0.35} C${width * 0.9},${heightVal * 0.2} ${width * 1.1},${heightVal * 0.45} ${width * 1.3},${heightVal * 0.35}`}
          fill="none"
          stroke="rgba(255, 255, 255, 0.12)"
          strokeWidth="1.8"
          clipPath="url(#waveClip)"
        />
        <Path
          d={`M-30,${heightVal * 0.55} C${width * 0.2},${heightVal * 0.35} ${width * 0.4},${heightVal * 0.75} ${width * 0.7},${heightVal * 0.5} C${width * 0.9},${heightVal * 0.35} ${width * 1.1},${heightVal * 0.6} ${width * 1.3},${heightVal * 0.5}`}
          fill="none"
          stroke="rgba(255, 255, 255, 0.08)"
          strokeWidth="1.5"
          clipPath="url(#waveClip)"
        />
        <Path
          d={`M-20,${heightVal * 0.7} C${width * 0.2},${heightVal * 0.5} ${width * 0.4},${heightVal * 0.9} ${width * 0.7},${heightVal * 0.65} C${width * 0.9},${heightVal * 0.5} ${width * 1.1},${heightVal * 0.75} ${width * 1.3},${heightVal * 0.65}`}
          fill="none"
          stroke="rgba(255, 255, 255, 0.06)"
          strokeWidth="1.5"
          clipPath="url(#waveClip)"
        />
        
        {/* Concentric rings on the top right */}
        <Path
          d={`M${width - 60},${heightVal * 0.2} A40,40 0 1,0 ${width - 59},${heightVal * 0.2}`}
          fill="none"
          stroke="rgba(255, 255, 255, 0.06)"
          strokeWidth="1.5"
          clipPath="url(#waveClip)"
        />
        <Path
          d={`M${width - 60},${heightVal * 0.2} A65,65 0 1,0 ${width - 59},${heightVal * 0.2}`}
          fill="none"
          stroke="rgba(255, 255, 255, 0.06)"
          strokeWidth="1.5"
          clipPath="url(#waveClip)"
        />
        <Path
          d={`M${width - 60},${heightVal * 0.2} A90,90 0 1,0 ${width - 59},${heightVal * 0.2}`}
          fill="none"
          stroke="rgba(255, 255, 255, 0.04)"
          strokeWidth="1.2"
          clipPath="url(#waveClip)"
        />
      </Svg>
    </View>
  );
};

interface OnboardingScreenProps {
  initialStep?: number;
}

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ initialStep }) => {
  const { completeSetup } = useFinancial();
  const { loginWithGoogle, loginWithEmail, user, isAuthenticated } = useAuth();
  
  const [step, setStep] = useState<number>(() => {
    if (initialStep) return initialStep;
    return isAuthenticated || user ? 4 : 1;
  });
  
  // Animation values for transition
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Registration State
  const [regEmail, setRegEmail] = useState<string>('');
  const [regPhone, setRegPhone] = useState<string>('');
  const [regPassword, setRegPassword] = useState<string>('');
  const [regConfirmPassword, setRegConfirmPassword] = useState<string>('');
  const [agreeTerms, setAgreeTerms] = useState<boolean>(false);
  
  // Password visibility
  const [showRegPassword, setShowRegPassword] = useState<boolean>(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState<boolean>(false);
  const [showLoginPassword, setShowLoginPassword] = useState<boolean>(false);

  // Registered Credentials Store (in-memory mock)
  const [registeredEmail, setRegisteredEmail] = useState<string>('admin@wibi.vn');
  const [registeredPassword, setRegisteredPassword] = useState<string>('123456');

  // Login State
  const [loginEmail, setLoginEmail] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');
  const [rememberMe, setRememberMe] = useState<boolean>(false);

  // Setup State
  const [name, setName] = useState<string>(() => user?.full_name || '');
  const [incomeGoal, setIncomeGoal] = useState<string>('30000000');
  const [cash, setCash] = useState<string>('35000000');
  const [bank, setBank] = useState<string>('100000000');
  
  // Focus tracking for inputs
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // STEP 6: Custom Jars List State (initially empty)
  const [jarsList, setJarsList] = useState<CustomJarSetup[]>([]);
  
  // Add Jar Form State
  const [isAddingJar, setIsAddingJar] = useState<boolean>(false);
  const [newJarName, setNewJarName] = useState<string>('');
  const [newJarType, setNewJarType] = useState<'spend' | 'save'>('spend');
  const [newJarPercent, setNewJarPercent] = useState<number>(20);
  const [newJarTarget, setNewJarTarget] = useState<string>('5000000');
  const [newJarColor, setNewJarColor] = useState<string>('#0066cc');

  const totalPercent = jarsList.reduce((sum, jar) => sum + jar.percent, 0);

  // Transition animations
  useEffect(() => {
    fadeAnim.setValue(0);
    slideAnim.setValue(15);
    
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      })
    ]).start();
  }, [step]);

  const handleRegister = () => {
    if (!regEmail.trim() || !regPhone.trim() || !regPassword.trim() || !regConfirmPassword.trim()) {
      Alert.alert('Thông báo', 'Vui lòng điền đầy đủ các thông tin đăng ký.');
      return;
    }
    if (!regEmail.includes('@')) {
      Alert.alert('Thông báo', 'Email không hợp lệ.');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      Alert.alert('Thông báo', 'Mật khẩu nhập lại không khớp.');
      return;
    }
    if (!agreeTerms) {
      Alert.alert('Thông báo', 'Vui lòng đồng ý với Điều khoản và Chính sách bảo mật.');
      return;
    }

    setRegisteredEmail(regEmail);
    setRegisteredPassword(regPassword);
    
    Alert.alert(
      'Đăng ký thành công',
      'Tài khoản của bạn đã được tạo! Hãy tiến hành đăng nhập.',
      [{ text: 'Đăng nhập', onPress: () => setStep(3) }]
    );
  };

  const handleLogin = async () => {
    if (!loginEmail.trim() || !loginPassword.trim()) {
      Alert.alert('Thông báo', 'Vui lòng nhập email và mật khẩu.');
      return;
    }
    
    const isCorrectCreds = 
      (loginEmail.toLowerCase() === registeredEmail.toLowerCase() && loginPassword === registeredPassword) ||
      (loginEmail.toLowerCase() === 'admin@wibi.vn' && loginPassword === '123456') ||
      (loginEmail.toLowerCase() === 'demo' && loginPassword === 'demo');

    if (isCorrectCreds) {
      setStep(4);
      return;
    }

    const res = await loginWithEmail(loginEmail, loginPassword);
    if (res.success) {
      setStep(4);
    } else {
      Alert.alert('Lỗi đăng nhập', res.message || 'Email hoặc mật khẩu không chính xác.');
    }
  };

  const handleGoogleLogin = async () => {
    const res = await loginWithGoogle();
    if (res.success) {
      setStep(4);
    } else {
      Alert.alert('Google Sign-In', res.message);
    }
  };

  const handleNext = () => {
    if (step === 4) {
      if (!name.trim()) {
        Alert.alert('Thông báo', 'Vui lòng nhập tên của bạn.');
        return;
      }
      const goalVal = parseFloat(incomeGoal.replace(/[^0-9]/g, '')) || 0;
      if (goalVal <= 0) {
        Alert.alert('Thông báo', 'Vui lòng nhập mục tiêu tiết kiệm hợp lệ.');
        return;
      }
      setStep(5);
    } else if (step === 5) {
      setStep(6);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleAddJar = () => {
    if (!newJarName.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên hũ tài chính.');
      return;
    }

    if (newJarPercent < 0 || newJarPercent > 100) {
      Alert.alert('Lỗi', 'Tỷ lệ phân bổ phải nằm trong khoảng từ 0% đến 100%.');
      return;
    }

    if (totalPercent + newJarPercent > 100) {
      Alert.alert('Lỗi tỷ lệ', `Tổng tỷ lệ vượt quá 100%. Bạn chỉ có thể phân bổ tối đa thêm ${100 - totalPercent}%.`);
      return;
    }

    const targetVal = newJarType === 'save' ? (parseFloat(newJarTarget.replace(/[^0-9]/g, '')) || 0) : undefined;
    if (newJarType === 'save' && (!targetVal || targetVal <= 0)) {
      Alert.alert('Lỗi', 'Vui lòng nhập số tiền tích lũy mục tiêu hợp lệ.');
      return;
    }

    const newJar: CustomJarSetup = {
      id: 'jar_' + Math.random().toString(36).substr(2, 9),
      name: newJarName,
      type: newJarType,
      percent: newJarPercent,
      target: targetVal,
      color: newJarColor,
    };

    setJarsList([...jarsList, newJar]);
    
    // Reset Form fields
    setNewJarName('');
    setNewJarType('spend');
    setNewJarPercent(100 - (totalPercent + newJarPercent) > 10 ? 10 : (100 - (totalPercent + newJarPercent)));
    setNewJarTarget('5000000');
    setNewJarColor(JAR_COLORS[jarsList.length % JAR_COLORS.length]);
    setIsAddingJar(false);
  };

  const handleDeleteJar = (id: string) => {
    setJarsList(jarsList.filter(jar => jar.id !== id));
  };

  const handleJarPercentChange = (id: string, direction: 'up' | 'down') => {
    setJarsList(jarsList.map(jar => {
      if (jar.id === id) {
        let newPercent = jar.percent;
        if (direction === 'up') {
          if (totalPercent + 5 > 100) {
            Alert.alert('Cảnh báo', 'Tổng tỷ lệ phân bổ của các hũ không được vượt quá 100%.');
            return jar;
          }
          newPercent = Math.min(jar.percent + 5, 100);
        } else {
          newPercent = Math.max(jar.percent - 5, 0);
        }
        return { ...jar, percent: newPercent };
      }
      return jar;
    }));
  };

  const handleFinish = () => {
    if (jarsList.length === 0) {
      Alert.alert('Lỗi thiết lập', 'Vui lòng thêm ít nhất một hũ tài chính để tiếp tục.');
      return;
    }
    if (totalPercent !== 100) {
      Alert.alert('Lỗi tỷ lệ', `Tổng tỷ lệ phân bổ của các hũ phải bằng đúng 100%. Hiện tại là ${totalPercent}%.`);
      return;
    }

    const initialCashVal = parseFloat(cash.replace(/[^0-9]/g, '')) || 0;
    const initialBankVal = parseFloat(bank.replace(/[^0-9]/g, '')) || 0;

    const formattedJars = jarsList.map(j => ({
      id: j.id,
      name: j.name,
      type: j.type,
      percent: j.percent,
      target: j.target,
      color: j.color
    }));

    completeSetup(name, initialCashVal, initialBankVal, formattedJars);
  };

  const formatDisplay = (numStr: string) => {
    const clean = numStr.replace(/[^0-9]/g, '');
    if (!clean) return '0';
    return parseInt(clean).toLocaleString('vi-VN');
  };

  const handleValChange = (field: 'cash' | 'bank' | 'incomeGoal' | 'newJarTarget', text: string) => {
    const clean = text.replace(/[^0-9]/g, '');
    if (field === 'cash') setCash(clean);
    if (field === 'bank') setBank(clean);
    if (field === 'incomeGoal') setIncomeGoal(clean);
    if (field === 'newJarTarget') setNewJarTarget(clean);
  };

  const isAuthStep = step === 1 || step === 2 || step === 3;
  const currentBannerHeight = 
    step === 1 ? height * 0.38 : 
    step === 2 ? height * 0.22 : 
    step === 3 ? height * 0.28 : 0;
  const remainingHeight = height - currentBannerHeight - (Platform.OS === 'ios' ? 60 : 40);

  return (
    <View style={[styles.container, { backgroundColor: isAuthStep ? '#ffffff' : '#F8FAFC' }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1, backgroundColor: isAuthStep ? '#ffffff' : '#F8FAFC' }}
      >
        <ScrollView 
          style={{ flex: 1, backgroundColor: isAuthStep ? '#ffffff' : '#F8FAFC' }}
          contentContainerStyle={[styles.scrollContainer, isAuthStep ? styles.scrollAuth : styles.scrollSetup]}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          
          {/* Top Banner Area for Steps 1, 2, 3 only */}
          {isAuthStep && <TopographicHeader heightVal={currentBannerHeight} />}

          {/* Animated Transition Wrapper */}
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }], flex: 1, width: '100%' }}>
            
            {/* STEP 1: WELCOME SCREEN (Mockup Layout) */}
            {step === 1 && (
              <View style={[styles.authContentBlock, { minHeight: remainingHeight }]}>
                <View style={styles.authTopGroup}>
                  <View style={styles.titleContainer}>
                    <Text style={styles.authTitle}>Welcome</Text>
                    <View style={styles.titleUnderline} />
                  </View>
                  <Text style={styles.authDescription}>
                    Quản lý tài chính cá nhân thông minh theo phương pháp hũ tài chính tự động. Lập ngân sách thông minh và tăng điểm kỷ luật tài chính cùng trợ lý AI.
                  </Text>
                </View>
                
                <View style={styles.authBottomGroup}>
                  {/* Mockup custom Continue layout */}
                  <TouchableOpacity style={styles.continueRow} onPress={() => setStep(3)}>
                    <Text style={styles.continueText}>Continue</Text>
                    <View style={styles.continueCircle}>
                      <Feather name="arrow-right" size={20} color="#ffffff" />
                    </View>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* STEP 2: REGISTRATION SCREEN (Mockup Layout) */}
            {step === 2 && (
              <View style={[styles.authContentBlock, { minHeight: remainingHeight }]}>
                <View style={styles.authTopGroup}>
                  <View style={styles.titleContainer}>
                    <Text style={styles.authTitle}>Sign up</Text>
                    <View style={styles.titleUnderline} />
                  </View>
                  
                  <Text style={styles.mockupLabel}>Email</Text>
                  <View style={[styles.mockupInputRow, focusedField === 'regEmail' && styles.mockupInputRowActive]}>
                    <Feather name="mail" size={16} color="#64748B" style={styles.mockupIcon} />
                    <View style={styles.mockupDivider} />
                    <TextInput
                      style={styles.mockupTextInput}
                      placeholder="demo@email.com"
                      placeholderTextColor="#CBD5E1"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      value={regEmail}
                      onChangeText={setRegEmail}
                      onFocus={() => setFocusedField('regEmail')}
                      onBlur={() => setFocusedField(null)}
                    />
                  </View>

                  <Text style={styles.mockupLabel}>Phone no</Text>
                  <View style={[styles.mockupInputRow, focusedField === 'regPhone' && styles.mockupInputRowActive]}>
                    <Feather name="smartphone" size={16} color="#64748B" style={styles.mockupIcon} />
                    <View style={styles.mockupDivider} />
                    <TextInput
                      style={styles.mockupTextInput}
                      placeholder="+00 000-0000-000"
                      placeholderTextColor="#CBD5E1"
                      keyboardType="phone-pad"
                      value={regPhone}
                      onChangeText={setRegPhone}
                      onFocus={() => setFocusedField('regPhone')}
                      onBlur={() => setFocusedField(null)}
                    />
                  </View>

                  <Text style={styles.mockupLabel}>Password</Text>
                  <View style={[styles.mockupInputRow, focusedField === 'regPassword' && styles.mockupInputRowActive]}>
                    <Feather name="lock" size={16} color="#64748B" style={styles.mockupIcon} />
                    <View style={styles.mockupDivider} />
                    <TextInput
                      style={styles.mockupTextInput}
                      placeholder="enter your password"
                      placeholderTextColor="#CBD5E1"
                      secureTextEntry={!showRegPassword}
                      value={regPassword}
                      onChangeText={setRegPassword}
                      onFocus={() => setFocusedField('regPassword')}
                      onBlur={() => setFocusedField(null)}
                    />
                    <TouchableOpacity onPress={() => setShowRegPassword(!showRegPassword)} style={styles.eyeBtn}>
                      <Feather name={showRegPassword ? "eye" : "eye-off"} size={16} color="#CBD5E1" />
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.mockupLabel}>Confirm Password</Text>
                  <View style={[styles.mockupInputRow, focusedField === 'regConfirmPassword' && styles.mockupInputRowActive]}>
                    <Feather name="lock" size={16} color="#64748B" style={styles.mockupIcon} />
                    <View style={styles.mockupDivider} />
                    <TextInput
                      style={styles.mockupTextInput}
                      placeholder="confirm your password"
                      placeholderTextColor="#CBD5E1"
                      secureTextEntry={!showRegConfirmPassword}
                      value={regConfirmPassword}
                      onChangeText={setRegConfirmPassword}
                      onFocus={() => setFocusedField('regConfirmPassword')}
                      onBlur={() => setFocusedField(null)}
                    />
                    <TouchableOpacity onPress={() => setShowRegConfirmPassword(!showRegConfirmPassword)} style={styles.eyeBtn}>
                      <Feather name={showRegConfirmPassword ? "eye" : "eye-off"} size={16} color="#CBD5E1" />
                    </TouchableOpacity>
                  </View>

                  {/* Terms checkbox */}
                  <TouchableOpacity 
                    style={styles.checkboxRow} 
                    activeOpacity={0.8}
                    onPress={() => setAgreeTerms(!agreeTerms)}
                  >
                    <View style={[styles.checkbox, agreeTerms && styles.checkboxChecked]}>
                      {agreeTerms && <Ionicons name="checkmark" size={11} color="#ffffff" />}
                    </View>
                    <Text style={styles.checkboxText}>
                      Tôi đồng ý với các <Text style={styles.hyperlinkText}>Điều khoản</Text> & <Text style={styles.hyperlinkText}>Bảo mật</Text> của WIBI.
                    </Text>
                  </TouchableOpacity>
                </View>
                
                <View style={styles.authBottomGroup}>
                  <TouchableOpacity style={styles.mockupButton} onPress={handleRegister}>
                    <Text style={styles.mockupButtonText}>Create Account</Text>
                  </TouchableOpacity>

                  {/* Google Sign Up Button */}
                  <TouchableOpacity style={styles.googleMockupButton} onPress={handleGoogleLogin}>
                    <Ionicons name="logo-google" size={18} color="#ea4335" style={{ marginRight: 8 }} />
                    <Text style={styles.googleMockupButtonText}>Sign up with Google</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.switchScreenBtn} onPress={() => setStep(3)}>
                    <Text style={styles.switchScreenText}>Already have an Account! <Text style={styles.switchScreenHighlight}>Login</Text></Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* STEP 3: LOGIN SCREEN (Mockup Layout) */}
            {step === 3 && (
              <View style={[styles.authContentBlock, { minHeight: remainingHeight }]}>
                <View style={styles.authTopGroup}>
                  <View style={styles.titleContainer}>
                    <Text style={styles.authTitle}>Sign in</Text>
                    <View style={styles.titleUnderline} />
                  </View>
                  
                  <Text style={styles.mockupLabel}>Email</Text>
                  <View style={[styles.mockupInputRow, focusedField === 'loginEmail' && styles.mockupInputRowActive]}>
                    <Feather name="mail" size={16} color="#64748B" style={styles.mockupIcon} />
                    <View style={styles.mockupDivider} />
                    <TextInput
                      style={styles.mockupTextInput}
                      placeholder="demo@email.com"
                      placeholderTextColor="#CBD5E1"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      value={loginEmail}
                      onChangeText={setLoginEmail}
                      onFocus={() => setFocusedField('loginEmail')}
                      onBlur={() => setFocusedField(null)}
                    />
                  </View>

                  <Text style={styles.mockupLabel}>Password</Text>
                  <View style={[styles.mockupInputRow, focusedField === 'loginPassword' && styles.mockupInputRowActive]}>
                    <Feather name="lock" size={16} color="#64748B" style={styles.mockupIcon} />
                    <View style={styles.mockupDivider} />
                    <TextInput
                      style={styles.mockupTextInput}
                      placeholder="enter your password"
                      placeholderTextColor="#CBD5E1"
                      secureTextEntry={!showLoginPassword}
                      value={loginPassword}
                      onChangeText={setLoginPassword}
                      onFocus={() => setFocusedField('loginPassword')}
                      onBlur={() => setFocusedField(null)}
                    />
                    <TouchableOpacity onPress={() => setShowLoginPassword(!showLoginPassword)} style={styles.eyeBtn}>
                      <Feather name={showLoginPassword ? "eye" : "eye-off"} size={16} color="#CBD5E1" />
                    </TouchableOpacity>
                  </View>

                  {/* Remember Me and Forgot Password */}
                  <View style={styles.authOptRow}>
                    <TouchableOpacity 
                      style={styles.checkboxRowMin} 
                      activeOpacity={0.8}
                      onPress={() => setRememberMe(!rememberMe)}
                    >
                      <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                        {rememberMe && <Ionicons name="checkmark" size={11} color="#ffffff" />}
                      </View>
                      <Text style={styles.authOptText}>Remember Me</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => Alert.alert('Thông báo', 'Chức năng khôi phục mật khẩu đang được phát triển.')}>
                      <Text style={styles.forgotPwdText}>Forgot Password?</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                
                <View style={styles.authBottomGroup}>
                  <TouchableOpacity style={styles.mockupButton} onPress={handleLogin}>
                    <Text style={styles.mockupButtonText}>Login</Text>
                  </TouchableOpacity>

                  {/* Google Sign In Button */}
                  <TouchableOpacity style={styles.googleMockupButton} onPress={handleGoogleLogin}>
                    <Ionicons name="logo-google" size={18} color="#ea4335" style={{ marginRight: 8 }} />
                    <Text style={styles.googleMockupButtonText}>Sign in with Google</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.switchScreenBtn} onPress={() => setStep(2)}>
                    <Text style={styles.switchScreenText}>{"Don't"} have an Account ? <Text style={styles.switchScreenHighlight}>Sign up</Text></Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* STEP 4: MINIMALIST GENZ PROFILE SETUP */}
            {step === 4 && (
              <View style={styles.setupContentBlock}>
                <View style={styles.stepIndicatorRow}>
                  <View style={styles.stepIndicatorPill}>
                    <Text style={styles.stepIndicatorText}>BƯỚC 1 / 3</Text>
                  </View>
                </View>

                <Text style={styles.setupTitle}>Thiết lập Hồ sơ</Text>
                <Text style={styles.setupDescription}>Nhập các thông tin cơ bản để WIBI cá nhân hóa mục tiêu tài chính của bạn.</Text>

                <View style={styles.setupInputGroup}>
                  <Text style={styles.setupInputLabel}>Họ và tên của bạn</Text>
                  <TextInput
                    style={[styles.setupTextInput, focusedField === 'name' && styles.setupTextInputActive]}
                    placeholder="Nguyễn Văn A"
                    placeholderTextColor="#94A3B8"
                    value={name}
                    onChangeText={setName}
                    onFocus={() => setFocusedField('name')}
                    onBlur={() => setFocusedField(null)}
                  />
                </View>

                <View style={styles.setupInputGroup}>
                  <Text style={styles.setupInputLabel}>Mục tiêu tiết kiệm mỗi tháng (VND)</Text>
                  <TextInput
                    style={[styles.setupTextInput, focusedField === 'incomeGoal' && styles.setupTextInputActive]}
                    placeholder="Ví dụ: 30.000.000"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    value={formatDisplay(incomeGoal)}
                    onChangeText={(text) => handleValChange('incomeGoal', text)}
                    onFocus={() => setFocusedField('incomeGoal')}
                    onBlur={() => setFocusedField(null)}
                  />
                </View>

                <View style={styles.setupActionsRow}>
                  <TouchableOpacity style={styles.setupSecondaryBtn} onPress={handleBack}>
                    <Feather name="arrow-left" size={18} color="#0F172A" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.setupPrimaryBtn} onPress={handleNext}>
                    <Text style={styles.setupBtnText}>Tiếp tục</Text>
                    <Feather name="arrow-right" size={16} color="#ffffff" style={styles.setupBtnIcon} />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* STEP 5: MINIMALIST GENZ BALANCE SETUP */}
            {step === 5 && (
              <View style={styles.setupContentBlock}>
                <View style={styles.stepIndicatorRow}>
                  <View style={styles.stepIndicatorPill}>
                    <Text style={styles.stepIndicatorText}>BƯỚC 2 / 3</Text>
                  </View>
                </View>

                <Text style={styles.setupTitle}>Số dư Ban đầu</Text>
                <Text style={styles.setupDescription}>Khai báo dòng vốn hiện có trong ví cá nhân và tài khoản ngân hàng liên kết.</Text>

                <View style={styles.setupInputGroup}>
                  <Text style={styles.setupInputLabel}>Số dư Tiền mặt (Ví tiền mặt)</Text>
                  <TextInput
                    style={[styles.setupTextInput, focusedField === 'cash' && styles.setupTextInputActive]}
                    placeholder="Ví dụ: 5.000.000"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    value={formatDisplay(cash)}
                    onChangeText={(text) => handleValChange('cash', text)}
                    onFocus={() => setFocusedField('cash')}
                    onBlur={() => setFocusedField(null)}
                  />
                </View>

                <View style={styles.setupInputGroup}>
                  <Text style={styles.setupInputLabel}>Số dư Tài khoản ngân hàng</Text>
                  <TextInput
                    style={[styles.setupTextInput, focusedField === 'bank' && styles.setupTextInputActive]}
                    placeholder="Ví dụ: 50.000.000"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    value={formatDisplay(bank)}
                    onChangeText={(text) => handleValChange('bank', text)}
                    onFocus={() => setFocusedField('bank')}
                    onBlur={() => setFocusedField(null)}
                  />
                </View>

                <View style={styles.setupActionsRow}>
                  <TouchableOpacity style={styles.setupSecondaryBtn} onPress={handleBack}>
                    <Feather name="arrow-left" size={18} color="#0F172A" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.setupPrimaryBtn} onPress={handleNext}>
                    <Text style={styles.setupBtnText}>Tiếp tục</Text>
                    <Feather name="arrow-right" size={16} color="#ffffff" style={styles.setupBtnIcon} />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* STEP 6: MINIMALIST GENZ JARS SETUP WITH SEGMENTED CONTROL FIX */}
            {step === 6 && (
              <View style={styles.setupContentBlock}>
                <View style={styles.stepIndicatorRow}>
                  <View style={styles.stepIndicatorPill}>
                    <Text style={styles.stepIndicatorText}>BƯỚC 3 / 3</Text>
                  </View>
                </View>

                <Text style={styles.setupTitle}>Tự thiết lập Hũ</Text>
                <Text style={styles.setupDescription}>Tạo ngân sách chi tiêu và tích lũy mục tiêu riêng biệt của bạn. Tổng tỷ lệ phải đạt 100%.</Text>

                {/* Inline Minimal Add Jar Panel */}
                {!isAddingJar ? (
                  <TouchableOpacity 
                    style={styles.genzAddJarBtn}
                    onPress={() => setIsAddingJar(true)}
                  >
                    <Feather name="plus" size={16} color="#0066cc" />
                    <Text style={styles.genzAddJarBtnText}>Thêm hũ tài chính mới</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.genzFormCard}>
                    <Text style={styles.genzFormCardTitle}>TẠO HŨ TÀI CHÍNH</Text>
                    
                    {/* Name */}
                    <View style={styles.setupInputGroup}>
                      <Text style={styles.setupInputLabel}>Tên hũ tài chính</Text>
                      <TextInput
                        style={styles.genzFormInput}
                        placeholder="Ví dụ: Ăn uống, MacBook Fund, Học tập..."
                        placeholderTextColor="#94A3B8"
                        value={newJarName}
                        onChangeText={setNewJarName}
                      />
                    </View>

                    {/* Segmented Control Selector replacing the squished overlapping chips */}
                    <View style={styles.setupInputGroup}>
                      <Text style={styles.setupInputLabel}>Loại hũ</Text>
                      <View style={styles.segmentedSelector}>
                        <TouchableOpacity
                          style={[
                            styles.segmentTab,
                            newJarType === 'spend' && styles.segmentTabActive
                          ]}
                          onPress={() => setNewJarType('spend')}
                          activeOpacity={0.9}
                        >
                          <Feather name="shopping-bag" size={13} color={newJarType === 'spend' ? '#0F172A' : '#64748B'} />
                          <Text style={[styles.segmentTabText, newJarType === 'spend' && styles.segmentTabTextActive]}>
                            Hũ Chi tiêu
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[
                            styles.segmentTab,
                            newJarType === 'save' && styles.segmentTabActive
                          ]}
                          onPress={() => setNewJarType('save')}
                          activeOpacity={0.9}
                        >
                          <Feather name="target" size={13} color={newJarType === 'save' ? '#0F172A' : '#64748B'} />
                          <Text style={[styles.segmentTabText, newJarType === 'save' && styles.segmentTabTextActive]}>
                            Mục tiêu tích lũy
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Percentage Allocation */}
                    <View style={styles.setupInputGroup}>
                      <Text style={styles.setupInputLabel}>Tỷ lệ phân bổ (%)</Text>
                      <View style={styles.genzStepperRow}>
                        <TouchableOpacity 
                          style={styles.genzStepperBtn} 
                          onPress={() => setNewJarPercent(Math.max(newJarPercent - 5, 0))}
                        >
                          <Feather name="minus" size={14} color="#0F172A" />
                        </TouchableOpacity>
                        <Text style={styles.genzStepperText}>{newJarPercent}%</Text>
                        <TouchableOpacity 
                          style={styles.genzStepperBtn}
                          onPress={() => setNewJarPercent(Math.min(newJarPercent + 5, 100))}
                        >
                          <Feather name="plus" size={14} color="#0F172A" />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Target Amount for Goal Jars */}
                    {newJarType === 'save' && (
                      <View style={styles.setupInputGroup}>
                        <Text style={styles.setupInputLabel}>Số tiền tích lũy mục tiêu (VND)</Text>
                        <TextInput
                          style={styles.genzFormInput}
                          placeholder="20.000.000"
                          placeholderTextColor="#94A3B8"
                          keyboardType="numeric"
                          value={formatDisplay(newJarTarget)}
                          onChangeText={(text) => handleValChange('newJarTarget', text)}
                        />
                      </View>
                    )}

                    {/* Color Picker Grid */}
                    <View style={styles.setupInputGroup}>
                      <Text style={styles.setupInputLabel}>Màu sắc hũ</Text>
                      <View style={styles.genzColorGrid}>
                        {JAR_COLORS.map((color) => (
                          <TouchableOpacity
                            key={color}
                            style={[
                              styles.genzColorBox,
                              { backgroundColor: color },
                              newJarColor === color && styles.genzSelectedColorBox
                            ]}
                            onPress={() => setNewJarColor(color)}
                          />
                        ))}
                      </View>
                    </View>

                    {/* Form actions */}
                    <View style={styles.genzFormActions}>
                      <TouchableOpacity 
                        style={styles.genzFormCancelBtn} 
                        onPress={() => setIsAddingJar(false)}
                      >
                        <Text style={styles.genzFormCancelBtnText}>Hủy</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.genzFormAddBtn, { backgroundColor: newJarColor }]} 
                        onPress={handleAddJar}
                      >
                        <Text style={styles.genzFormAddBtnText}>Thêm hũ</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* Flat added list */}
                <Text style={styles.genzSectionLabel}>DANH SÁCH HŨ ĐÃ THÊM ({jarsList.length})</Text>

                {jarsList.length === 0 ? (
                  <View style={styles.genzEmptyBox}>
                    <Feather name="folder-plus" size={32} color="#94A3B8" />
                    <Text style={styles.genzEmptyText}>Chưa có hũ nào được tạo</Text>
                    <Text style={styles.genzEmptySubtext}>Hãy thêm hũ tài chính ở trên để quản lý dòng thu nhập của bạn.</Text>
                  </View>
                ) : (
                  <View style={styles.genzJarsList}>
                    {jarsList.map((jar) => (
                      <View key={jar.id} style={styles.genzJarRow}>
                        <View style={styles.genzJarInfo}>
                          <View style={[styles.genzJarColorCircle, { backgroundColor: jar.color }]} />
                          <View style={styles.genzJarTextColumn}>
                            <Text style={styles.genzJarName} numberOfLines={1}>{jar.name}</Text>
                            <Text style={styles.genzJarSubInfo}>
                              {jar.type === 'save' ? 'Mục tiêu tích lũy' : 'Hũ Chi tiêu'}
                              {jar.type === 'save' && jar.target ? ` • ${jar.target.toLocaleString('vi-VN')}đ` : ''}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.genzJarActions}>
                          <View style={styles.genzListStepper}>
                            <TouchableOpacity 
                              style={styles.genzListStepperBtn}
                              onPress={() => handleJarPercentChange(jar.id, 'down')}
                            >
                              <Feather name="minus" size={10} color="#0F172A" />
                            </TouchableOpacity>
                            <Text style={styles.genzListStepperVal}>{jar.percent}%</Text>
                            <TouchableOpacity 
                              style={styles.genzListStepperBtn}
                              onPress={() => handleJarPercentChange(jar.id, 'up')}
                            >
                              <Feather name="plus" size={10} color="#0F172A" />
                            </TouchableOpacity>
                          </View>
                          
                          <TouchableOpacity 
                            style={styles.genzJarDeleteBtn}
                            onPress={() => handleDeleteJar(jar.id)}
                          >
                            <Feather name="trash-2" size={14} color="#EF4444" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                {/* Minimalist allocation status bar */}
                <View style={[
                  styles.genzStatusStrip,
                  totalPercent === 100 ? styles.genzStatusValid : styles.genzStatusInvalid
                ]}>
                  <Ionicons 
                    name={totalPercent === 100 ? "checkmark-circle" : "alert-circle"} 
                    size={16} 
                    color={totalPercent === 100 ? "#10B981" : "#EF4444"} 
                  />
                  <Text style={[
                    styles.genzStatusText,
                    { color: totalPercent === 100 ? "#059669" : "#DC2626" }
                  ]}>
                    Tổng phân bổ: {totalPercent}% / 100% {totalPercent === 100 ? '(Đủ)' : '(Cần cân bằng lại)'}
                  </Text>
                </View>

                {/* Actions row */}
                <View style={styles.setupActionsRow}>
                  <TouchableOpacity style={styles.setupSecondaryBtn} onPress={handleBack}>
                    <Feather name="arrow-left" size={18} color="#0F172A" />
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.setupPrimaryBtn, (totalPercent !== 100 || jarsList.length === 0) && styles.disabledBtn]} 
                    disabled={totalPercent !== 100 || jarsList.length === 0}
                    onPress={handleFinish}
                  >
                    <Text style={styles.setupBtnText}>Hoàn tất thiết lập</Text>
                    <Feather name="check" size={16} color="#ffffff" style={styles.setupBtnIcon} />
                  </TouchableOpacity>
                </View>
              </View>
            )}

          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
  },
  scrollAuth: {
    paddingBottom: 10,
    backgroundColor: '#ffffff',
  },
  scrollSetup: {
    paddingBottom: 40,
    paddingTop: Platform.OS === 'ios' ? 44 : (StatusBar.currentHeight ? StatusBar.currentHeight + 12 : 36),
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 24,
  },
  svgHeaderContainer: {
    width: '100%',
    height: bannerHeight,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
  },
  svgHeader: {
    width: '100%',
    height: '100%',
  },
  
  // WELCOME, SIGN IN, SIGN UP STYLE - MATCHES MOCKUP EXACTLY
  authContentBlock: {
    paddingHorizontal: 24,
    backgroundColor: '#ffffff',
    flex: 1,
    justifyContent: 'space-between',
    paddingBottom: 24,
  },
  authTopGroup: {
    width: '100%',
  },
  authBottomGroup: {
    width: '100%',
    marginTop: 10,
  },
  titleContainer: {
    alignSelf: 'flex-start',
    marginTop: 10,
    marginBottom: 12,
  },
  authTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#0F172A',
  },
  titleUnderline: {
    width: 44,
    height: 4,
    backgroundColor: '#3A55B4',
    borderRadius: 2,
    marginTop: 4,
  },
  authDescription: {
    fontSize: 14,
    lineHeight: 22,
    color: '#64748B',
    marginBottom: 48,
  },
  continueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 16,
    gap: 12,
  },
  continueText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  continueCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3A55B4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Mockup Underlined inputs
  mockupLabel: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 8,
    fontWeight: '500',
  },
  mockupInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1.2,
    borderBottomColor: '#CBD5E1',
    paddingBottom: 6,
    marginBottom: 10,
    marginTop: 4,
  },
  mockupInputRowActive: {
    borderBottomColor: '#3A55B4',
  },
  mockupIcon: {
    marginRight: 10,
  },
  mockupDivider: {
    width: 1,
    height: 14,
    backgroundColor: '#CBD5E1',
    marginRight: 12,
  },
  mockupTextInput: {
    flex: 1,
    fontSize: 15,
    color: '#0F172A',
    paddingVertical: 2,
  },
  mockupButton: {
    backgroundColor: '#3A55B4',
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  mockupButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },

  // MINIMALIST GENZ SETUP STYLE (STEPS 4, 5, 6)
  setupContentBlock: {
    flex: 1,
    width: '100%',
  },
  stepIndicatorRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  stepIndicatorPill: {
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  stepIndicatorText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  setupTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  setupDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: '#64748B',
    marginBottom: 28,
  },
  setupInputGroup: {
    marginBottom: 20,
  },
  setupInputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
  setupTextInput: {
    backgroundColor: '#ffffff',
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#0F172A',
  },
  setupTextInputActive: {
    borderColor: '#0066cc',
    shadowColor: '#0066cc',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  setupActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 28,
  },
  setupPrimaryBtn: {
    backgroundColor: '#0066cc',
    height: 48,
    borderRadius: 24,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flex: 2.2,
  },
  setupSecondaryBtn: {
    backgroundColor: '#ffffff',
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  setupBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  setupBtnIcon: {
    marginLeft: 6,
  },
  disabledBtn: {
    backgroundColor: '#94A3B8',
  },

  // GenZ Step 6 Custom Builder Form
  genzAddJarBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#ffffff',
    gap: 8,
    marginBottom: 24,
  },
  genzAddJarBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0066cc',
  },
  genzFormCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 24,
  },
  genzFormCardTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  genzFormInput: {
    backgroundColor: '#F8FAFC',
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#0F172A',
  },
  
  // Segmented Control Selector replacing overlapping chips
  segmentedSelector: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 4,
    marginTop: 2,
  },
  segmentTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 38,
    borderRadius: 8,
    gap: 6,
  },
  segmentTabActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  segmentTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  segmentTabTextActive: {
    color: '#0F172A',
    fontWeight: '700',
  },
  
  genzStepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  genzStepperBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  genzStepperText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    minWidth: 44,
    textAlign: 'center',
  },
  genzColorGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  genzColorBox: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  genzSelectedColorBox: {
    borderColor: '#0F172A',
    transform: [{ scale: 1.15 }],
  },
  genzFormActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  genzFormCancelBtn: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  genzFormCancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  genzFormAddBtn: {
    flex: 1.5,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  genzFormAddBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },

  // Flat Jars List Layout
  genzSectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.8,
    marginBottom: 10,
    marginTop: 8,
  },
  genzEmptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 28,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  genzEmptyText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
    marginTop: 8,
    marginBottom: 4,
  },
  genzEmptySubtext: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
  },
  genzJarsList: {
    marginBottom: 20,
    gap: 10,
  },
  genzJarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  genzJarInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1.3,
  },
  genzJarColorCircle: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  genzJarTextColumn: {
    flex: 1,
  },
  genzJarName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  genzJarSubInfo: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  genzJarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  genzListStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    padding: 2,
  },
  genzListStepperBtn: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  genzListStepperVal: {
    width: 28,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
  },
  genzJarDeleteBtn: {
    padding: 6,
  },
  
  genzStatusStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 20,
    gap: 6,
  },
  genzStatusValid: {
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
    borderColor: 'rgba(16, 185, 129, 0.1)',
  },
  genzStatusInvalid: {
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
    borderColor: 'rgba(239, 68, 68, 0.1)',
  },
  genzStatusText: {
    fontSize: 12,
    fontWeight: '700',
  },

  // Checkbox and subtext
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 6,
  },
  checkboxRowMin: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#3A55B4',
    borderColor: '#3A55B4',
  },
  checkboxText: {
    flex: 1,
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
  },
  hyperlinkText: {
    color: '#3A55B4',
    fontWeight: '600',
  },
  authOptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 4,
  },
  authOptText: {
    fontSize: 13,
    color: '#64748B',
  },
  forgotPwdText: {
    fontSize: 13,
    color: '#3A55B4',
    fontWeight: '600',
  },
  switchScreenBtn: {
    marginTop: 10,
    alignSelf: 'center',
    padding: 6,
  },
  switchScreenText: {
    fontSize: 14,
    color: '#64748B',
  },
  switchScreenHighlight: {
    color: '#3A55B4',
    fontWeight: '700',
  },
  eyeBtn: {
    padding: 4,
  },
  googleMockupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    height: 48,
    borderRadius: 24,
    marginTop: 10,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  googleMockupButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },
});