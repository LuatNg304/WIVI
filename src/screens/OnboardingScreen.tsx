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
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFinancial } from '../context/FinancialContext';
import { useAuth } from '../context/AuthContext';
import { Feather, Ionicons } from '@expo/vector-icons';
import Svg, { Path, Defs, ClipPath, Rect } from 'react-native-svg';
import { LoginScreen } from './LoginScreen';
import { RegisterScreen } from './RegisterScreen';
import { OtpVerificationScreen } from './OtpVerificationScreen';
import { ForgotPasswordScreen } from './ForgotPasswordScreen';

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

const formatCompactMoney = (amount: number): string => {
  if (!amount || isNaN(amount)) return '0 đ';
  const abs = Math.abs(amount);
  if (abs >= 1_000_000_000) {
    const b = abs / 1_000_000_000;
    return `${b % 1 === 0 ? b : b.toFixed(1).replace('.', ',')} tỷ`;
  }
  if (abs >= 1_000_000) {
    const m = abs / 1_000_000;
    return `${m % 1 === 0 ? m : m.toFixed(1).replace('.', ',')} tr`;
  }
  if (abs >= 1_000) {
    const k = abs / 1_000;
    return `${k % 1 === 0 ? k : k.toFixed(0)}k`;
  }
  return `${abs.toLocaleString('vi-VN')} đ`;
};

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

const GOAL_QUICK_PRESETS: { label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { label: 'Mua nhà', icon: 'home-outline' },
  { label: 'Mua xe', icon: 'car-outline' },
  { label: 'Tự do tài chính', icon: 'trending-up-outline' },
 
  
];

interface OnboardingScreenProps {
  initialStep?: number;
}

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ initialStep }) => {
  const { completeSetup } = useFinancial();
  const { user, isAuthenticated } = useAuth();
  
  const [step, setStep] = useState<number>(() => {
    if (initialStep) {
      if ((initialStep === 4 || initialStep === 5 || initialStep === 6 || initialStep === 9) && !isAuthenticated && !user) {
        return 1;
      }
      return initialStep;
    }
    return isAuthenticated || user ? 4 : 1;
  });

  // Đồng bộ step khi initialStep thay đổi từ AppGuard
  useEffect(() => {
    if (initialStep !== undefined) {
      if ((initialStep === 4 || initialStep === 5 || initialStep === 6 || initialStep === 9) && !isAuthenticated && !user) {
        setStep(3);
      } else {
        setStep(initialStep);
      }
    }
  }, [initialStep, isAuthenticated, user]);

  // Chặn người dùng chưa xác thực truy cập vào các bước thiết lập tài chính (bước 4, 5, 6, 9)
  useEffect(() => {
    if (!isAuthenticated && !user && (step === 4 || step === 5 || step === 6 || step === 9)) {
      setStep(3);
    }
  }, [isAuthenticated, user, step]);


  
  // Animation values for transition
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Setup State
  const [name, setName] = useState<string>(() => user?.full_name || user?.username || '');
  const [incomeGoal, setIncomeGoal] = useState<string>('');
  const [currentBalance, setCurrentBalance] = useState<string>('');

  useEffect(() => {
    if (!name && (user?.full_name || user?.username)) {
      setName(user.full_name || user.username || '');
    }
  }, [user]);

  
  // Focus tracking for inputs
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // STEP 6: Custom Jars List State (initially empty)
  const [jarsList, setJarsList] = useState<CustomJarSetup[]>([]);
  
  // Add Jar Form State
  const [isAddingJar, setIsAddingJar] = useState<boolean>(false);
  const [newJarName, setNewJarName] = useState<string>('');
  const [newJarType, setNewJarType] = useState<'spend' | 'save'>('spend');
  const [newJarPercent, setNewJarPercent] = useState<number>(20);
  const [newJarTarget, setNewJarTarget] = useState<string>('');
  const [newJarColor, setNewJarColor] = useState<string>('#0066cc');

  const totalPercent = jarsList.reduce((sum, jar) => sum + jar.percent, 0);

  // Step 6 & 9: Goal and AI Suggestion State
  const [goalTitle, setGoalTitle] = useState<string>('Mua nhà');
  const [goalTargetAmount, setGoalTargetAmount] = useState<string>('');
  const [goalMonths, setGoalMonths] = useState<number>(12);
  const [aiGoalExplanation, setAiGoalExplanation] = useState<string | null>(null);
  const [aiJarsExplanation, setAiJarsExplanation] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // AI Timeline Calculation (Bước 3: Gợi ý thời gian t từ X, Y, Z)
  const handleAiSuggestTimeline = () => {
    const income = parseFloat(incomeGoal.replace(/[^0-9]/g, '')) || 10000000;
    const balance = parseFloat(currentBalance.replace(/[^0-9]/g, '')) || 0;
    const target = parseFloat(goalTargetAmount.replace(/[^0-9]/g, '')) || 50000000;
    const remainingNeeded = Math.max(0, target - balance);
    
    // Mặc định WIVI trích 25% thu nhập hàng tháng để tích lũy
    const monthlySaving = Math.max(income * 0.25, 500000);
    if (remainingNeeded <= 0) {
      setGoalMonths(1);
      setAiGoalExplanation(
        `Đề xuất từ WIVI: Số dư hiện tại (${balance.toLocaleString('vi-VN')}đ) đã đủ để đạt mục tiêu ${target.toLocaleString('vi-VN')}đ! Bạn có thể bắt đầu ngay.`
      );
      return;
    }

    const months = Math.max(1, Math.ceil(remainingNeeded / monthlySaving));
    setGoalMonths(months);
    const years = (months / 12).toFixed(1);
    setAiGoalExplanation(
      `Đề xuất từ WIVI: Trừ số dư hiện có (${balance.toLocaleString('vi-VN')}đ), bạn cần tích lũy thêm ${remainingNeeded.toLocaleString('vi-VN')}đ. Dành 25% thu nhập (${parseInt(monthlySaving.toString()).toLocaleString('vi-VN')}đ/tháng), bạn sẽ đạt mục tiêu sau ${months} tháng (~${years} năm).`
    );
  };

  // WIVI Jars Allocation Suggestion (Bước 4: Phân chia X vào các hũ theo t, Y và Z)
  const handleAiSuggestJars = (targetAmountOverride?: number, goalTitleOverride?: string, monthsOverride?: number) => {
    const income = parseFloat(incomeGoal.replace(/[^0-9]/g, '')) || 10000000;
    const balance = parseFloat(currentBalance.replace(/[^0-9]/g, '')) || 0;
    const targetVal = targetAmountOverride ?? (parseFloat(goalTargetAmount.replace(/[^0-9]/g, '')) || 50000000);
    const activeGoalTitle = (goalTitleOverride ?? goalTitle).trim() || 'Mục tiêu tích lũy';
    const months = monthsOverride ?? (goalMonths > 0 ? goalMonths : 12);
    const remainingNeeded = Math.max(0, targetVal - balance);

    // 1. Tính số tiền cần bỏ vào Hũ Tiết Kiệm mỗi tháng để sau đúng t tháng đạt Z (trừ số dư Y hiện có)
    const monthlySaveNeeded = remainingNeeded > 0 ? Math.ceil(remainingNeeded / months) : 0;
    
    // 2. Tính tỷ lệ % của Hũ Tiết Kiệm từ thu nhập X (tối thiểu 5%, tối đa 75%)
    let rawSavingsPercent = income > 0 ? Math.round((monthlySaveNeeded / income) * 100) : 5;
    const savingsPercent = Math.min(75, Math.max(5, rawSavingsPercent));

    // 3.  phần còn lại (100% - savingsPercent) vào các hũ chi tiêu một cách thông minh
    const remainPercent = 100 - savingsPercent;
    const necessitiesPercent = Math.max(15, Math.round(remainPercent * 0.55));
    const remAfterNec = Math.max(0, remainPercent - necessitiesPercent);
    const educationPercent = Math.max(3, Math.floor(remAfterNec * 0.35));
    const playPercent = Math.max(3, Math.floor(remAfterNec * 0.30));
    const investmentPercent = Math.max(0, 100 - (savingsPercent + necessitiesPercent + educationPercent + playPercent));

    const defaultAiJars: CustomJarSetup[] = [
      {
        id: 'jar_goal_main',
        name: `Hũ Tiết kiệm: ${activeGoalTitle}`,
        type: 'save',
        percent: savingsPercent,
        target: targetVal,
        color: '#2ecc71',
      },
      {
        id: 'jar_necessities',
        name: 'Chi tiêu Thiết yếu',
        type: 'spend',
        percent: necessitiesPercent,
        color: '#0066cc',
      },
      {
        id: 'jar_education',
        name: 'Phát triển Bản thân & Học tập',
        type: 'spend',
        percent: educationPercent,
        color: '#9b59b6',
      },
      {
        id: 'jar_play',
        name: 'Hưởng thụ & Giải trí',
        type: 'spend',
        percent: playPercent,
        color: '#ffb83d',
      },
      {
        id: 'jar_investment',
        name: 'Đầu tư Tăng trưởng',
        type: 'spend',
        percent: investmentPercent,
        color: '#1abc9c',
      },
    ];

    setJarsList(defaultAiJars);
    const monthlySaveActual = Math.round((income * savingsPercent) / 100);
    const actualMonths = remainingNeeded > 0 ? Math.max(1, Math.ceil(remainingNeeded / Math.max(monthlySaveActual, 100000))) : 1;

    setAiJarsExplanation(
      remainingNeeded > 0
        ? `Đã phân bổ ${savingsPercent}% (${formatCompactMoney(monthlySaveActual)}/tháng) cho Tích lũy để đạt mục tiêu sau ${actualMonths >= 12 ? (actualMonths / 12).toFixed(1) + ' năm' : actualMonths + ' tháng'}. ${100 - savingsPercent}% còn lại chia cho các chi tiêu thiết yếu & sinh hoạt.`
        : `Số dư hiện tại đã đạt mục tiêu! Đã chia 5% duy trì tích lũy và 95% cho các hũ chi tiêu.`
    );
  };

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

  const handleNext = () => {
    if (step === 4) {
      if (!name.trim()) {
        Alert.alert('Thông báo', 'Vui lòng nhập tên của bạn.');
        return;
      }
      const goalVal = parseFloat(incomeGoal.replace(/[^0-9]/g, '')) || 0;
      if (goalVal <= 0) {
        Alert.alert('Thông báo', 'Vui lòng nhập thu nhập hàng tháng hợp lệ.');
        return;
      }
      setStep(5);
    } else if (step === 5) {
      setStep(6);
    } else if (step === 6) {
      if (!goalTitle.trim()) {
        Alert.alert('Thông báo', 'Vui lòng nhập tên mục tiêu của bạn.');
        return;
      }
      const targetVal = parseFloat(goalTargetAmount.replace(/[^0-9]/g, '')) || 0;
      if (targetVal <= 0) {
        Alert.alert('Thông báo', 'Vui lòng nhập số tiền mục tiêu hợp lệ.');
        return;
      }
      if (!goalMonths || goalMonths <= 0) {
        Alert.alert('Thông báo', 'Vui lòng nhập thời gian dự kiến hoàn thành mục tiêu (số tháng).');
        return;
      }

      const incomeVal = parseFloat(incomeGoal.replace(/[^0-9]/g, '')) || 10000000;
      const balanceVal = parseFloat(currentBalance.replace(/[^0-9]/g, '')) || 0;
      const remainingNeededVal = Math.max(0, targetVal - balanceVal);
      const monthlySaveNeeded = remainingNeededVal > 0 ? Math.ceil(remainingNeededVal / goalMonths) : 0;
      if (monthlySaveNeeded > incomeVal) {
        Alert.alert(
          'Kế hoạch không khả thi',
          `Để đạt ${targetVal.toLocaleString('vi-VN')} đ trong ${goalMonths} tháng (~${(goalMonths / 12).toFixed(1)} năm), bạn cần tích lũy ${monthlySaveNeeded.toLocaleString('vi-VN')} đ/tháng (trừ số dư hiện có ${balanceVal.toLocaleString('vi-VN')} đ), lớn hơn tổng thu nhập hàng tháng (${incomeVal.toLocaleString('vi-VN')} đ/tháng).\n\nVui lòng tăng thời gian tích lũy hoặc giảm bớt số tiền mục tiêu.`
        );
        return;
      }

      // Khởi tạo/tính toán lại danh sách hũ với gợi ý AI cho mục tiêu và số tháng t vừa nhập
      handleAiSuggestJars(targetVal, goalTitle, goalMonths);
      setStep(9);
    }
  };

  const handleBack = () => {
    if (step === 4) {
      return;
    }
    if (step === 9) {
      setStep(6);
      return;
    }
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
      Alert.alert('Lỗi', 'Tỷ lệ  phải nằm trong khoảng từ 0% đến 100%.');
      return;
    }

    if (totalPercent + newJarPercent > 100) {
      Alert.alert('Lỗi tỷ lệ', `Tổng tỷ lệ vượt quá 100%. Bạn chỉ có thể  tối đa thêm ${100 - totalPercent}%.`);
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
    const targetJar = jarsList.find(j => j.id === id);
    if (targetJar?.type === 'save') {
      Alert.alert('Quy tắc bất biến', 'Hũ Tiết Kiệm là bắt buộc để bạn tích lũy đạt mục tiêu tài chính, không thể xóa.');
      return;
    }
    setJarsList(jarsList.filter(jar => jar.id !== id));
  };

  const handleJarPercentChange = (id: string, direction: 'up' | 'down') => {
    const income = parseFloat(incomeGoal.replace(/[^0-9]/g, '')) || 10000000;
    const targetVal = parseFloat(goalTargetAmount.replace(/[^0-9]/g, '')) || 50000000;
    const balance = parseFloat(currentBalance.replace(/[^0-9]/g, '')) || 0;
    const remainingNeeded = Math.max(0, targetVal - balance);

    let updatedSavingsPercent = 0;

    const updatedJars = jarsList.map(jar => {
      if (jar.id === id) {
        let newPercent = jar.percent;
        if (direction === 'up') {
          if (totalPercent + 5 > 100) {
            Alert.alert('Cảnh báo', 'Tổng tỷ lệ  của các hũ không được vượt quá 100%.');
            return jar;
          }
          newPercent = Math.min(jar.percent + 5, 100);
        } else {
          // Nếu là hũ Tiết Kiệm thì tỷ lệ tối thiểu là 5%
          const minPercent = jar.type === 'save' ? 5 : 0;
          if (jar.percent <= minPercent) {
            if (jar.type === 'save') {
              Alert.alert('Thông báo', 'Hũ Tiết Kiệm cần duy trì tối thiểu 5% thu nhập hàng tháng.');
            }
            return jar;
          }
          newPercent = Math.max(jar.percent - 5, minPercent);
        }

        if (jar.type === 'save') {
          updatedSavingsPercent = newPercent;
        }

        return { ...jar, percent: newPercent };
      }

      if (jar.type === 'save' && jar.id !== id) {
        updatedSavingsPercent = jar.percent;
      }

      return jar;
    });

    setJarsList(updatedJars);

    // Tính toán lại thời gian t và cập nhật phản hồi của WIVI khi điều chỉnh %
    if (updatedSavingsPercent > 0) {
      const monthlySaveActual = Math.round((income * updatedSavingsPercent) / 100);
      const newMonths = remainingNeeded > 0
        ? Math.max(1, Math.ceil(remainingNeeded / Math.max(monthlySaveActual, 100000)))
        : 1;
      setGoalMonths(newMonths);
      setAiJarsExplanation(
        remainingNeeded > 0
          ? `⏱️ Với mức tích lũy ${updatedSavingsPercent}% (${monthlySaveActual.toLocaleString('vi-VN')} đ/tháng), bạn sẽ tích lũy thêm ${remainingNeeded.toLocaleString('vi-VN')} đ để đạt mục tiêu ${targetVal.toLocaleString('vi-VN')} đ sau ${newMonths} tháng (~${(newMonths / 12).toFixed(1)} năm).`
          : `✅ Số dư hiện tại (${balance.toLocaleString('vi-VN')} đ) đã đủ mục tiêu ${targetVal.toLocaleString('vi-VN')} đ! Tiếp tục tích lũy ${updatedSavingsPercent}% để tích lũy thêm.`
      );
    }
  };

  const handleFinish = async () => {
    if (!isAuthenticated && !user) {
      Alert.alert('Chưa đăng nhập', 'Vui lòng đăng nhập hoặc xác thực OTP để lưu dữ liệu.');
      setStep(3);
      return;
    }

    if (jarsList.length === 0) {
      Alert.alert('Lỗi thiết lập', 'Vui lòng thêm ít nhất một hũ tài chính để tiếp tục.');
      return;
    }
    if (totalPercent !== 100) {
      Alert.alert('Lỗi tỷ lệ', `Tổng tỷ lệ  của các hũ phải bằng đúng 100%. Hiện tại là ${totalPercent}%.`);
      return;
    }

    const hasSaveJar = jarsList.some(j => j.type === 'save');
    if (!hasSaveJar) {
      Alert.alert('Lỗi thiết lập', 'Bắt buộc phải có 1 Hũ Tiết Kiệm để tích lũy cho mục tiêu của bạn.');
      return;
    }

    try {
      setIsSubmitting(true);
      const initialBalanceVal = parseFloat(currentBalance.replace(/[^0-9]/g, '')) || 0;

      const formattedJars = jarsList.map(j => ({
        id: j.id,
        name: j.name,
        type: j.type,
        percent: j.percent,
        target: j.target,
        color: j.color
      }));

      const incomeGoalVal = parseFloat(incomeGoal.replace(/[^0-9]/g, '')) || 0;
      await completeSetup(name, initialBalanceVal, formattedJars, incomeGoalVal, goalMonths);
    } catch (err: any) {
      console.warn('Lỗi khi hoàn tất thiết lập:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDisplay = (numStr: string) => {
    const clean = numStr.replace(/[^0-9]/g, '');
    if (!clean) return '0';
    return parseInt(clean).toLocaleString('vi-VN');
  };

  const handleValChange = (field: 'currentBalance' | 'incomeGoal' | 'newJarTarget' | 'goalTargetAmount', text: string) => {
    const clean = text.replace(/[^0-9]/g, '');
    if (field === 'currentBalance') setCurrentBalance(clean);
    if (field === 'incomeGoal') setIncomeGoal(clean);
    if (field === 'newJarTarget') setNewJarTarget(clean);
    if (field === 'goalTargetAmount') setGoalTargetAmount(clean);
  };

  const addQuickBalance = (amountToAdd: number) => {
    const current = parseFloat(currentBalance.replace(/[^0-9]/g, '')) || 0;
    const newVal = Math.max(0, current + amountToAdd);
    setCurrentBalance(newVal.toString());
  };



  const isAuthStep = step === 1 || step === 2 || step === 3;
  const currentBannerHeight = 
    step === 1 ? height * 0.38 : 
    step === 2 ? height * 0.22 : 
    step === 3 ? height * 0.28 : 0;
  const remainingHeight = height - currentBannerHeight - (Platform.OS === 'ios' ? 60 : 40);

  // State cho OTP Email & Đăng ký
  const [otpEmail, setOtpEmail] = useState<string>('');
  const [otpUsername, setOtpUsername] = useState<string>('');
  const [otpPassword, setOtpPassword] = useState<string>('');

  if (step === 2) {
    return (
      <RegisterScreen
        onNavigateToLogin={() => setStep(3)}
        onNavigateToOtp={(email: string, username?: string, password?: string) => {
          setOtpEmail(email);
          setOtpUsername(username || '');
          setOtpPassword(password || '');
          setStep(7);
        }}
        onRegisterSuccess={() => setStep(4)}
      />
    );
  }

  if (step === 3) {
    return (
      <LoginScreen
        onNavigateToRegister={() => setStep(2)}
        onNavigateToForgotPassword={() => setStep(8)}
        onNavigateToOtp={(email: string) => {
          setOtpEmail(email);
          setStep(7);
        }}
        onLoginSuccess={() => setStep(4)}
      />
    );
  }

  if (step === 7) {
    return (
      <OtpVerificationScreen
        email={otpEmail}
        username={otpUsername}
        password={otpPassword}
        onNavigateBack={() => setStep(2)}
        onSuccess={() => setStep(4)}
      />
    );
  }

  if (step === 8) {
    return (
      <ForgotPasswordScreen
        onNavigateToLogin={() => setStep(3)}
      />
    );
  }

  // Live Real-Time Calculation Variables for Steps 6 & 9 (2-Way Sync)
  const currentIncomeVal = parseFloat(incomeGoal.replace(/[^0-9]/g, '')) || 10000000;
  const currentBalanceVal = parseFloat(currentBalance.replace(/[^0-9]/g, '')) || 0;
  const currentTargetVal = parseFloat(goalTargetAmount.replace(/[^0-9]/g, '')) || 0;
  const currentRemainingNeeded = Math.max(0, currentTargetVal - currentBalanceVal);
  const currentMonthsVal = goalMonths > 0 ? goalMonths : 12;
  // Tính số tiền cần tích lũy mỗi tháng = (Mục tiêu Z - Số dư Y) / t tháng
  const currentMonthlySavingNeeded = currentMonthsVal > 0 ? Math.ceil(currentRemainingNeeded / currentMonthsVal) : 0;
  const currentSavingsPercent = currentIncomeVal > 0 ? Math.round((currentMonthlySavingNeeded / currentIncomeVal) * 100) : 0;
  const isSavingExceedingIncome = currentMonthlySavingNeeded > currentIncomeVal && currentRemainingNeeded > 0;
  const isSavingHeavyBurden = !isSavingExceedingIncome && currentMonthlySavingNeeded > (currentIncomeVal * 0.5) && currentRemainingNeeded > 0;

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
          
          {/* Top Banner Area for Steps 1 only */}
          {step === 1 && <TopographicHeader heightVal={currentBannerHeight} />}

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
                    Quản lý tài chính cá nhân thông minh theo phương pháp hũ tài chính tự động. Lập ngân sách thông minh và tăng điểm kỷ luật tài chính cùng trợ lý WIVI.
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

            {/* STEP 4: MINIMALIST GENZ PROFILE SETUP */}
            {step === 4 && (
              <View style={styles.setupContentBlock}>
                <View style={styles.stepIndicatorRow}>
                  <View style={styles.stepIndicatorPill}>
                    <Text style={styles.stepIndicatorText}>BƯỚC 1 / 4</Text>
                  </View>
                </View>

                <Text style={styles.setupTitle}>Thiết lập Hồ sơ</Text>
                

                {/* Sincere note box */}
                <View style={styles.calloutCard}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <Ionicons name="sparkles" size={15} color="#2563EB" />
                    <Text style={styles.calloutTitle}>Lời nhắn từ WIVI</Text>
                  </View>
                  <Text style={styles.calloutText}>
                    Hãy trung thực với số tiền bạn kiếm được mỗi tháng để trợ lý WIVI có thể tính toán lộ trình chi tiêu và tiết kiệm chính xác nhất cho bạn.
                  </Text>
                </View>

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
                  <Text style={styles.setupInputLabel}>Thu nhập kiếm được mỗi tháng (VND)</Text>
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
                    <Text style={styles.stepIndicatorText}>BƯỚC 2 / 4</Text>
                  </View>
                </View>

                <Text style={styles.setupTitle}>Số dư Hiện tại</Text>
                

                <View style={styles.setupInputGroup}>
                  <Text style={styles.setupInputLabel}>Số dư hiện tại của bạn (VND)</Text>
                  <TextInput
                    style={[styles.setupTextInput, focusedField === 'currentBalance' && styles.setupTextInputActive]}
                    placeholder="Ví dụ: 50.000.000"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    value={formatDisplay(currentBalance)}
                    onChangeText={(text) => handleValChange('currentBalance', text)}
                    onFocus={() => setFocusedField('currentBalance')}
                    onBlur={() => setFocusedField(null)}
                  />
                </View>

                {/* Quick Add Pills */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4, marginBottom: 12 }}>
                  <TouchableOpacity
                    style={styles.quickChip}
                    onPress={() => addQuickBalance(5000000)}
                  >
                    <Text style={styles.quickChipText}>+5 triệu</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.quickChip}
                    onPress={() => addQuickBalance(10000000)}
                  >
                    <Text style={styles.quickChipText}>+10 triệu</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.quickChip}
                    onPress={() => addQuickBalance(50000000)}
                  >
                    <Text style={styles.quickChipText}>+50 triệu</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.quickChip, { backgroundColor: '#FEE2E2', borderColor: '#FECACA' }]}
                    onPress={() => setCurrentBalance('0')}
                  >
                    <Text style={[styles.quickChipText, { color: '#EF4444' }]}>Đặt về 0</Text>
                  </TouchableOpacity>
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

            {/* STEP 6: GOAL SETTING (MỤC TIÊU TÍCH LŨY RIÊNG BIỆT - COMPACT 1 SCREEN) */}
            {step === 6 && (
              <View style={styles.setupContentBlock}>
                <View style={styles.stepIndicatorRow}>
                  <View style={styles.stepIndicatorPill}>
                    <Text style={styles.stepIndicatorText}>BƯỚC 3 / 4</Text>
                  </View>
                </View>

                <Text style={styles.goalSetupTitle}>Mục tiêu Tích lũy</Text>
               

                {/* 1. Tên mục tiêu */}
                <View style={styles.goalInputGroup}>
                  <Text style={styles.goalInputLabel}>Mục tiêu của bạn là gì?</Text>
                  <TextInput
                    style={[styles.goalTextInput, focusedField === 'goalTitle' && styles.setupTextInputActive]}
                    placeholder="Ví dụ: Mua nhà, Mua xe, Quỹ tự do..."
                    placeholderTextColor="#94A3B8"
                    value={goalTitle}
                    onChangeText={setGoalTitle}
                    onFocus={() => setFocusedField('goalTitle')}
                    onBlur={() => setFocusedField(null)}
                  />
                  {/* Quick Goal Name Chips with Vector Icons */}
                  <View style={styles.goalChipsRow}>
                    {GOAL_QUICK_PRESETS.map((item) => {
                      const isActive = goalTitle === item.label;
                      return (
                        <TouchableOpacity
                          key={item.label}
                          style={[styles.goalChip, isActive && styles.goalChipActive]}
                          onPress={() => setGoalTitle(item.label)}
                        >
                          <Ionicons
                            name={item.icon}
                            size={12}
                            color={isActive ? '#ffffff' : '#0066cc'}
                            style={{ marginRight: 4 }}
                          />
                          <Text style={[styles.goalChipText, isActive && styles.goalChipTextActive]}>
                            {item.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* 2. Số tiền mong muốn */}
                <View style={styles.goalInputGroup}>
                  <Text style={styles.goalInputLabel}>Số tiền mong muốn đạt được (VND)</Text>
                  <TextInput
                    style={[styles.goalTextInput, focusedField === 'goalTargetAmount' && styles.setupTextInputActive]}
                    placeholder="Ví dụ: 200.000.000"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    value={formatDisplay(goalTargetAmount)}
                    onChangeText={(text) => handleValChange('goalTargetAmount', text)}
                    onFocus={() => setFocusedField('goalTargetAmount')}
                    onBlur={() => setFocusedField(null)}
                  />
                 
                </View>

                {/* 3. Thời gian & AI Gợi ý */}
                <View style={styles.goalInputGroup}>
                  <Text style={styles.goalInputLabel}>Thời gian dự kiến hoàn thành (Số tháng)</Text>
                  
                  {/* Ô nhập trực tiếp số tháng t */}
                  <View style={[styles.mockupInputRow, focusedField === 'goalMonths' && styles.mockupInputRowActive, { marginBottom: 8 }]}>
                    <Feather name="calendar" size={16} color="#64748B" style={styles.mockupIcon} />
                    <View style={styles.mockupDivider} />
                    <TextInput
                      style={styles.mockupTextInput}
                      placeholder="Ví dụ: 12"
                      placeholderTextColor="#CBD5E1"
                      keyboardType="numeric"
                      value={goalMonths ? goalMonths.toString() : ''}
                      onChangeText={(text) => {
                        const val = parseInt(text.replace(/[^0-9]/g, '')) || 0;
                        setGoalMonths(val);
                      }}
                      onFocus={() => setFocusedField('goalMonths')}
                      onBlur={() => setFocusedField(null)}
                    />
                    <Text style={{ fontSize: 13, color: '#64748B', fontWeight: '600' }}>tháng</Text>
                  </View>

                  

                  {/* Nút WIVI Gợi ý Thời gian */}
                  <TouchableOpacity
                    style={styles.aiActionButtonProminent}
                    onPress={handleAiSuggestTimeline}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="sparkles" size={14} color="#ffffff" />
                    <Text style={styles.aiActionButtonTextProminent}>WIVI đề xuất</Text>
                  </TouchableOpacity>

                  {/* Live Recalculation & Feasibility Banner */}
                  {currentTargetVal > 0 && currentMonthsVal > 0 && (
                    <View style={{ marginTop: 6 }}>
                      {currentRemainingNeeded <= 0 ? (
                        // Trường hợp số dư Y đã >= mục tiêu Z
                        <View style={[styles.aiCardCompact, { backgroundColor: '#F0FDF4', borderColor: '#86EFAC' }]}>
                          <Ionicons name="checkmark-circle" size={15} color="#16A34A" style={{ marginTop: 1 }} />
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#15803D', marginBottom: 2 }}>
                              Mục tiêu đã đạt được!
                            </Text>
                            <Text style={{ fontSize: 11, color: '#166534', lineHeight: 15 }}>
                              Số dư hiện tại <Text style={{ fontWeight: '700' }}>{currentBalanceVal.toLocaleString('vi-VN')} đ</Text> đã vượt mục tiêu <Text style={{ fontWeight: '700' }}>{currentTargetVal.toLocaleString('vi-VN')} đ</Text>. Hãy đặt mục tiêu mới cao hơn!
                            </Text>
                          </View>
                        </View>
                      ) : isSavingExceedingIncome ? (
                        <View style={[styles.aiCardCompact, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
                          <Ionicons name="alert-circle" size={15} color="#DC2626" style={{ marginTop: 1 }} />
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#991B1B', marginBottom: 2 }}>
                              Mục tiêu không khả thi
                            </Text>
                            <Text style={{ fontSize: 11, color: '#B91C1C', lineHeight: 15 }}>
                              Cần tích lũy thêm <Text style={{ fontWeight: '700' }}>{currentRemainingNeeded.toLocaleString('vi-VN')} đ</Text> (đã có {currentBalanceVal.toLocaleString('vi-VN')} đ). Mức {currentMonthlySavingNeeded.toLocaleString('vi-VN')} đ/tháng ({currentSavingsPercent}%) vượt quá tổng lương ({currentIncomeVal.toLocaleString('vi-VN')} đ/tháng). Hãy tăng thời gian.
                            </Text>
                          </View>
                        </View>
                      ) : isSavingHeavyBurden ? (
                        <View style={[styles.aiCardCompact, { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }]}>
                          <Ionicons name="warning" size={15} color="#D97706" style={{ marginTop: 1 }} />
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#92400E', marginBottom: 2 }}>
                              Cảnh báo áp lực tài chính cao
                            </Text>
                            <Text style={{ fontSize: 11, color: '#B45309', lineHeight: 15 }}>
                              Cần tích lũy thêm <Text style={{ fontWeight: '700' }}>{currentRemainingNeeded.toLocaleString('vi-VN')} đ</Text>: <Text style={{ fontWeight: '700' }}>{currentMonthlySavingNeeded.toLocaleString('vi-VN')} đ/tháng</Text> (~{currentSavingsPercent}% thu nhập) trong {currentMonthsVal} tháng. Chiếm hơn 50% thu nhập, có thể thắt chặt chi tiêu thiết yếu.
                            </Text>
                          </View>
                        </View>
                      ) : (
                        <View style={[styles.aiCardCompact, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}>
                          <Ionicons name="checkmark-circle" size={15} color="#2563EB" style={{ marginTop: 1 }} />
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#1E40AF', marginBottom: 2 }}>
                              Lộ trình tích lũy hợp lý & khả thi
                            </Text>
                            <Text style={{ fontSize: 11, color: '#1E3A8A', lineHeight: 15 }}>
                              Đã có <Text style={{ fontWeight: '700' }}>{currentBalanceVal.toLocaleString('vi-VN')} đ</Text>, cần tích lũy thêm <Text style={{ fontWeight: '700' }}>{currentRemainingNeeded.toLocaleString('vi-VN')} đ</Text> ({currentMonthlySavingNeeded.toLocaleString('vi-VN')} đ/tháng, ~{currentSavingsPercent}%) trong {currentMonthsVal} tháng (~{(currentMonthsVal / 12).toFixed(1)} năm).
                            </Text>
                          </View>
                        </View>
                      )}
                    </View>
                  )}

                  {/* AI Explanation Compact Chip */}
                  {aiGoalExplanation && (
                    <View style={[styles.aiCardCompact, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE', marginTop: 4 }]}>
                      <Ionicons name="sparkles" size={13} color="#2563EB" style={{ marginTop: 1 }} />
                      <Text style={[styles.aiCardTextCompact, { color: '#1E40AF' }]} numberOfLines={2}>{aiGoalExplanation}</Text>
                    </View>
                  )}
                </View>

                <View style={styles.goalActionsRow}>
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

            {/* STEP 9: MINIMALIST GENZ JARS ALLOCATION (BƯỚC 4 / 4) */}
            {step === 9 && (
              <View style={styles.setupContentBlock}>
                <View style={styles.stepIndicatorRow}>
                  <View style={styles.stepIndicatorPill}>
                    <Text style={styles.stepIndicatorText}>BƯỚC 4 / 4</Text>
                  </View>
                </View>

                <Text style={styles.setupTitle}>Tự thiết lập Hũ</Text>
                

                {/* ===== GOAL TIMELINE TRACKER (t - live update) ===== */}
                {(() => {
                  const income = parseFloat(incomeGoal.replace(/[^0-9]/g, '')) || 0;
                  const balance = parseFloat(currentBalance.replace(/[^0-9]/g, '')) || 0;
                  const targetAmt = parseFloat(goalTargetAmount.replace(/[^0-9]/g, '')) || 0;
                  const remainingNeeded = Math.max(0, targetAmt - balance);
                  const savingsJar = jarsList.find(j => j.type === 'save');
                  const savingsPct = savingsJar ? savingsJar.percent : 0;
                  const monthlySave = income > 0 ? Math.round((income * savingsPct) / 100) : 0;
                  const monthsLeft = remainingNeeded > 0 && monthlySave > 0
                    ? Math.max(1, Math.ceil(remainingNeeded / monthlySave))
                    : remainingNeeded <= 0 && targetAmt > 0 ? 0 : goalMonths;
                  const yearsLeft = monthsLeft > 0 ? (monthsLeft / 12) : 0;
                  const isAlreadyDone = remainingNeeded <= 0 && targetAmt > 0;
                  const isImpossible = monthlySave > 0 && monthlySave >= income && remainingNeeded > 0;
                  const progressPct = targetAmt > 0 ? Math.min(100, Math.round((balance / targetAmt) * 100)) : 0;

                  return targetAmt > 0 ? (
                    <View style={styles.goalTimelineCard}>
                      {/* Header Row */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Ionicons name="flag" size={14} color="#0066cc" />
                          <Text style={{ fontSize: 12, fontWeight: '700', color: '#0F172A' }}>{goalTitle || 'Mục tiêu tích lũy'}</Text>
                        </View>
                        <View style={[
                          styles.goalTimelineBadge,
                          isAlreadyDone && { backgroundColor: '#DCFCE7', borderColor: '#86EFAC' },
                          isImpossible && { backgroundColor: '#FEE2E2', borderColor: '#FECACA' },
                        ]}>
                          <Ionicons
                            name={isAlreadyDone ? 'checkmark-circle' : isImpossible ? 'alert-circle' : 'time-outline'}
                            size={11}
                            color={isAlreadyDone ? '#16A34A' : isImpossible ? '#DC2626' : '#0066cc'}
                          />
                          <Text style={[
                            styles.goalTimelineBadgeText,
                            isAlreadyDone && { color: '#15803D' },
                            isImpossible && { color: '#DC2626' },
                          ]}>
                            {isAlreadyDone
                              ? 'Đã đạt!'
                              : isImpossible
                              ? 'Không khả thi'
                              : monthsLeft >= 12
                              ? `~${yearsLeft.toFixed(1)} năm`
                              : `${monthsLeft} tháng`
                            }
                          </Text>
                        </View>
                      </View>

                      {/* Progress Bar */}
                      <View style={styles.goalTimelineBarBg}>
                        <View style={[styles.goalTimelineBarFill, { width: `${progressPct}%` as any, backgroundColor: isAlreadyDone ? '#22C55E' : '#0066cc' }]} />
                      </View>
                      <Text style={{ fontSize: 10.5, color: '#64748B', marginTop: 3, marginBottom: 6 }}>
                        Đã có {formatCompactMoney(balance)} / {formatCompactMoney(targetAmt)} ({progressPct}%)
                      </Text>

                      {/* Stats Row */}
                      {!isAlreadyDone && (
                        <View style={styles.goalTimelineStatsRow}>
                          <View style={styles.goalTimelineStat}>
                            <Text style={styles.goalTimelineStatLabel}>Còn thiếu</Text>
                            <Text style={styles.goalTimelineStatValue}>{formatCompactMoney(remainingNeeded)}</Text>
                          </View>
                          <View style={[styles.goalTimelineStat, { borderLeftWidth: 1, borderLeftColor: '#E2E8F0', paddingLeft: 10 }]}>
                            <Text style={styles.goalTimelineStatLabel}>Tích lũy ({savingsPct}%)</Text>
                            <Text style={[styles.goalTimelineStatValue, { color: '#0066cc' }]}>
                              {monthlySave > 0 ? `${formatCompactMoney(monthlySave)}/th` : '—'}
                            </Text>
                          </View>
                          <View style={[styles.goalTimelineStat, { borderLeftWidth: 1, borderLeftColor: '#E2E8F0', paddingLeft: 10 }]}>
                            <Text style={styles.goalTimelineStatLabel}>Thời gian</Text>
                            <Text style={[styles.goalTimelineStatValue, {
                              color: isImpossible ? '#DC2626' : monthsLeft > 60 ? '#D97706' : '#16A34A'
                            }]}>
                              {monthlySave > 0
                                ? (monthsLeft >= 12 ? `${yearsLeft.toFixed(1)} năm` : `${monthsLeft} th`)
                                : '—'
                              }
                            </Text>
                          </View>
                        </View>
                      )}
                      {isAlreadyDone && (
                        <Text style={{ fontSize: 11, color: '#15803D', fontWeight: '600', textAlign: 'center' }}>
                          🎉 Số dư hiện tại đã đủ đạt mục tiêu!
                        </Text>
                      )}
                    </View>
                  ) : null;
                })()}

                {/* WIVI Gợi ý % từng hũ Action Button */}
                <TouchableOpacity
                  style={styles.aiActionButton}
                  onPress={() => handleAiSuggestJars()}
                  activeOpacity={0.85}
                >
                  <Ionicons name="sparkles" size={14} color="#2563EB" />
                  <Text style={styles.aiActionButtonText}>WIVI đề xuất phân bổ</Text>
                </TouchableOpacity>

                {/* AI Jars Explanation Banner if available */}
                {aiJarsExplanation && (
                  <View style={styles.aiCard}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <Ionicons name="pie-chart" size={14} color="#2563EB" />
                      <Text style={styles.aiCardTitle}>Đề xuất Tỷ lệ từ WIVI</Text>
                    </View>
                    <Text style={styles.aiCardText}>{aiJarsExplanation}</Text>
                  </View>
                )}

                {/* Inline Minimal Add Jar Panel */}
                {!isAddingJar ? (
                  <TouchableOpacity 
                    style={styles.genzAddJarBtn}
                    onPress={() => setIsAddingJar(true)}
                  >
                    <Feather name="plus" size={16} color="#0066cc" />
                    <Text style={styles.genzAddJarBtnText}>Thêm hũ mới</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.genzFormCard}>
                    <Text style={styles.genzFormCardTitle}>TẠO HŨ MỚI</Text>
                    
                    {/* Name */}
                    <View style={styles.setupInputGroup}>
                      <Text style={styles.setupInputLabel}>Tên hũ</Text>
                      <TextInput
                        style={styles.genzFormInput}
                        placeholder="Ví dụ: Ăn uống, Học tập..."
                        placeholderTextColor="#94A3B8"
                        value={newJarName}
                        onChangeText={setNewJarName}
                      />
                    </View>

                    {/* Percentage Allocation */}
                    <View style={styles.setupInputGroup}>
                      <Text style={styles.setupInputLabel}>Tỷ lệ (%)</Text>
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

                    {/* Color Picker Grid */}
                    <View style={styles.setupInputGroup}>
                      <Text style={styles.setupInputLabel}>Màu sắc</Text>
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
                <Text style={styles.genzSectionLabel}>DANH SÁCH HŨ ({jarsList.length})</Text>

                {jarsList.length === 0 ? (
                  <View style={styles.genzEmptyBox}>
                    <Feather name="folder-plus" size={32} color="#94A3B8" />
                    <Text style={styles.genzEmptyText}>Chưa có hũ nào</Text>
                    <Text style={styles.genzEmptySubtext}>Hãy bấm 'WIVI đề xuất phân bổ' hoặc thêm hũ để quản lý thu nhập.</Text>
                  </View>
                ) : (
                  <View style={styles.genzJarsList}>
                    {jarsList.map((jar) => {
                      const incomeVal = parseFloat(incomeGoal.replace(/[^0-9]/g, '')) || 10000000;
                      const jarMonthlyAmount = Math.round((incomeVal * jar.percent) / 100);
                      const isSaveJar = jar.type === 'save';

                      return (
                        <View key={jar.id} style={[styles.genzJarRow, isSaveJar && { borderColor: '#93C5FD', backgroundColor: '#EFF6FF' }]}>
                          <View style={styles.genzJarInfo}>
                            <View style={[styles.genzJarColorCircle, { backgroundColor: jar.color }]} />
                            <View style={styles.genzJarTextColumn}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Text style={styles.genzJarName} numberOfLines={1}>{jar.name}</Text>
                                {isSaveJar && (
                                  <View style={{ backgroundColor: '#DBEAFE', paddingHorizontal: 5, paddingVertical: 1.5, borderRadius: 5 }}>
                                    <Text style={{ fontSize: 9.5, fontWeight: '700', color: '#1D4ED8' }}>TÍCH LŨY</Text>
                                  </View>
                                )}
                              </View>
                              <Text style={styles.genzJarSubInfo}>
                                <Text style={{ fontWeight: '600', color: '#0F172A' }}>{formatCompactMoney(jarMonthlyAmount)}/tháng</Text>
                                {isSaveJar && jar.target ? ` • Đích ${formatCompactMoney(jar.target)}` : ''}
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
                              <Feather 
                                name={isSaveJar ? "lock" : "trash-2"} 
                                size={14} 
                                color={isSaveJar ? "#94A3B8" : "#EF4444"} 
                              />
                            </TouchableOpacity>
                          </View>
                        </View>
                      );
                    })}
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
                    Tổng: {totalPercent}% / 100% {totalPercent === 100 ? '(✓ Đạt chuẩn)' : '(Cần đúng 100%)'}
                  </Text>
                </View>

                {/* Actions row */}
                <View style={styles.setupActionsRow}>
                  <TouchableOpacity style={styles.setupSecondaryBtn} onPress={handleBack}>
                    <Feather name="arrow-left" size={18} color="#0F172A" />
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.setupPrimaryBtn, (totalPercent !== 100 || jarsList.length === 0 || isSubmitting) && styles.disabledBtn]} 
                    disabled={totalPercent !== 100 || jarsList.length === 0 || isSubmitting}
                    onPress={handleFinish}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <>
                        <Text style={styles.setupBtnText}>Hoàn tất thiết lập</Text>
                        <Feather name="check" size={16} color="#ffffff" style={styles.setupBtnIcon} />
                      </>
                    )}
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
    paddingBottom: 16,
    paddingTop: Platform.OS === 'ios' ? 36 : (StatusBar.currentHeight ? StatusBar.currentHeight + 8 : 20),
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 20,
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

  // MINIMALIST GENZ SETUP STYLE (STEPS 4, 5, 6, 9) - COMPACT SINGLE SCREEN
  setupContentBlock: {
    flex: 1,
    width: '100%',
  },
  stepIndicatorRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  stepIndicatorPill: {
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  stepIndicatorText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  setupTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 3,
  },
  setupDescription: {
    fontSize: 12.5,
    lineHeight: 17,
    color: '#64748B',
    marginBottom: 12,
  },
  setupInputGroup: {
    marginBottom: 10,
  },
  setupInputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  setupTextInput: {
    backgroundColor: '#ffffff',
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    fontSize: 14,
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
    gap: 10,
    marginTop: 14,
  },
  setupPrimaryBtn: {
    backgroundColor: '#0066cc',
    height: 42,
    borderRadius: 21,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flex: 2.2,
  },
  setupSecondaryBtn: {
    backgroundColor: '#ffffff',
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  setupBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  setupBtnIcon: {
    marginLeft: 6,
  },
  disabledBtn: {
    backgroundColor: '#94A3B8',
  },
  // Compact Goal Screen Styles (Step 6)
  goalSetupTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  goalSetupDescription: {
    fontSize: 12,
    lineHeight: 16,
    color: '#64748B',
    marginBottom: 6,
  },
  goalInputGroup: {
    marginBottom: 8,
  },
  goalInputLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 3,
  },
  goalTextInput: {
    backgroundColor: '#ffffff',
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
    fontSize: 13.5,
    color: '#0F172A',
  },
  goalChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 4,
  },
  goalChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  goalChipActive: {
    backgroundColor: '#0066cc',
    borderColor: '#0066cc',
  },
  goalChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  goalChipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  aiActionButtonCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginTop: 4,
  },
  aiActionButtonTextCompact: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  aiCardCompact: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginTop: 4,
  },
  aiCardTextCompact: {
    fontSize: 11,
    color: '#1E3A8A',
    lineHeight: 15,
    flex: 1,
  },
  goalActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 10,
  },

  // Sincere Callout Card
  calloutCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    padding: 10,
    marginBottom: 10,
  },
  calloutTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E40AF',
  },
  calloutText: {
    fontSize: 11.5,
    color: '#1E3A8A',
    lineHeight: 16,
  },

  // Quick Selection Chips
  quickChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  quickChipActive: {
    backgroundColor: '#0066cc',
    borderColor: '#0066cc',
  },
  quickChipText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#475569',
  },
  quickChipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },

  // AI Action Buttons & Cards - Soft Light Blue
  aiActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    borderWidth: 1.2,
    borderColor: '#BFDBFE',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 4,
    marginBottom: 6,
  },
  aiActionButtonText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  aiActionButtonProminent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#0066cc',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginTop: 6,
    marginBottom: 2,
    shadowColor: '#0066cc',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  aiActionButtonTextProminent: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#ffffff',
  },
  aiCard: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 10,
    padding: 8,
    marginTop: 4,
    marginBottom: 6,
  },
  aiCardTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E40AF',
  },
  aiCardText: {
    fontSize: 11.5,
    color: '#1E3A8A',
    lineHeight: 16,
  },

  // GenZ Step 6 Custom Builder Form
  genzAddJarBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#ffffff',
    gap: 6,
    marginBottom: 10,
  },
  genzAddJarBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0066cc',
  },
  genzFormCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  genzFormCardTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  genzFormInput: {
    backgroundColor: '#F8FAFC',
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
    fontSize: 13,
    color: '#0F172A',
  },
  
  // Segmented Control Selector replacing overlapping chips
  segmentedSelector: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    padding: 3,
    marginTop: 2,
  },
  segmentTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 34,
    borderRadius: 6,
    gap: 4,
  },
  segmentTabActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentTabText: {
    fontSize: 11.5,
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
    gap: 10,
  },
  genzStepperBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  genzStepperText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    minWidth: 38,
    textAlign: 'center',
  },
  genzColorGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  genzColorBox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  genzSelectedColorBox: {
    borderColor: '#0F172A',
    transform: [{ scale: 1.15 }],
  },
  genzFormActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  genzFormCancelBtn: {
    flex: 1,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  genzFormCancelBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  genzFormAddBtn: {
    flex: 1.5,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  genzFormAddBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },

  // Flat Jars List Layout
  genzSectionLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.6,
    marginBottom: 6,
    marginTop: 4,
  },
  genzEmptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  genzEmptyText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
    marginTop: 6,
    marginBottom: 2,
  },
  genzEmptySubtext: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 16,
  },
  genzJarsList: {
    marginBottom: 10,
    gap: 6,
  },
  genzJarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 8,
    borderRadius: 10,
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
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  genzJarTextColumn: {
    flex: 1,
  },
  genzJarName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  genzJarSubInfo: {
    fontSize: 10.5,
    color: '#64748B',
    marginTop: 1,
  },
  genzJarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  genzListStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    padding: 2,
  },
  genzListStepperBtn: {
    width: 20,
    height: 20,
    borderRadius: 5,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  genzListStepperVal: {
    width: 26,
    textAlign: 'center',
    fontSize: 10.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  genzJarDeleteBtn: {
    padding: 4,
  },
  
  genzStatusStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 10,
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
    fontSize: 11.5,
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

  // ===== GOAL TIMELINE CARD STYLES (Step 9) =====
  goalTimelineCard: {
    backgroundColor: '#F8FAFF',
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  goalTimelineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  goalTimelineBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0066cc',
  },
  goalTimelineBarBg: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  goalTimelineBarFill: {
    height: 6,
    borderRadius: 3,
    minWidth: 4,
  },
  goalTimelineStatsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  goalTimelineStat: {
    flex: 1,
    gap: 2,
  },
  goalTimelineStatLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '500',
  },
  goalTimelineStatValue: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0F172A',
  },
});