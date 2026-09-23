import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  RefreshControl,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
  PanResponder,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFinancial } from '../context/FinancialContext';
import { pdfReportService, ReportData } from '../services/pdfReportService';
import { UpgradeProModal } from '../components/UpgradeProModal';
import { CustomAlertModal, CustomAlertProps } from '../components/CustomAlertModal';
import { AppHeader } from '../components/AppHeader';

// Format money with compact suffixes: tỷ, triệu, k, đ
export const formatCurrencyCompact = (amount: number, showSign: boolean = false): string => {
  if (amount === undefined || amount === null || isNaN(amount)) return '0 đ';
  const sign = amount < 0 ? '-' : showSign && amount > 0 ? '+' : '';
  const abs = Math.abs(amount);

  if (abs === 0) return '0 đ';
  if (abs >= 1_000_000_000) {
    const b = abs / 1_000_000_000;
    const formatted = b % 1 === 0 ? b.toString() : b.toFixed(1).replace('.', ',');
    return `${sign}${formatted} tỷ`;
  }
  if (abs >= 1_000_000) {
    const m = abs / 1_000_000;
    const formatted = m % 1 === 0 ? m.toString() : m.toFixed(1).replace('.', ',');
    return `${sign}${formatted} triệu`;
  }
  if (abs >= 1_000) {
    const k = abs / 1_000;
    const formatted = k % 1 === 0 ? k.toString() : k.toFixed(0);
    return `${sign}${formatted}k`;
  }
  return `${sign}${abs.toLocaleString('vi-VN')} đ`;
};

// Format date to DD/MM/YYYY
export const formatDateVN = (dateStr?: string): string => {
  if (!dateStr || dateStr === 'N/A') return 'N/A';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return dateStr;
  }
};

interface DisciplineScreenProps {
  onNavigateToSettings?: () => void;
  onNavigateToHistory?: () => void;
  onNavigateToRecord?: () => void;
}

export const DisciplineScreen: React.FC<DisciplineScreenProps> = ({
  onNavigateToSettings,
  onNavigateToHistory,
  onNavigateToRecord,
}) => {
  const {
    userName,
    monthlyIncomeGoal,
    initialBalance,
    balances,
    jars,
    goals,
    transactions,
    forecast,
    isVip,
    refreshAll,
    updateJarRatios,
  } = useFinancial();

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  // Period state: Mode ('month' | 'year'), Year (number), Month (1-12)
  const [periodMode, setPeriodMode] = useState<'month' | 'year'>('month');
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);

  // Custom period picker modal state
  const [showPickerModal, setShowPickerModal] = useState(false);
  const [tempMode, setTempMode] = useState<'month' | 'year'>('month');
  const [tempYearInput, setTempYearInput] = useState<string>(currentYear.toString());
  const [tempMonthInput, setTempMonthInput] = useState<string>(currentMonth.toString());

  // Scenario selection & application state
  const [selectedPreset, setSelectedPreset] = useState<'chill' | 'normal' | 'hard' | 'custom'>('normal');
  const [customPercent, setCustomPercent] = useState<number>(10);
  const [isApplyingScenario, setIsApplyingScenario] = useState(false);

  // Smooth slider drag state & PanResponder
  const customPercentRef = useRef<number>(customPercent);
  const trackWidthRef = useRef<number>(200);
  const startPercentRef = useRef<number>(10);

  useEffect(() => {
    customPercentRef.current = customPercent;
  }, [customPercent]);

  const applyPercentValue = (pct: number) => {
    const clamped = Math.max(1, Math.min(50, Math.round(pct)));
    if (clamped !== customPercentRef.current) {
      setCustomPercent(clamped);
      if (clamped === 5) setSelectedPreset('chill');
      else if (clamped === 10) setSelectedPreset('normal');
      else if (clamped === 20) setSelectedPreset('hard');
      else setSelectedPreset('custom');
    }
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => true,
        onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dx) > 1,
        onMoveShouldSetPanResponderCapture: (_, gestureState) => Math.abs(gestureState.dx) > 1,
        onPanResponderGrant: (evt) => {
          startPercentRef.current = customPercentRef.current;
          const width = trackWidthRef.current || 200;
          if (width > 0) {
            const tapPct = 1 + (Math.max(0, Math.min(1, evt.nativeEvent.locationX / width)) * 49);
            applyPercentValue(tapPct);
            startPercentRef.current = Math.max(1, Math.min(50, Math.round(tapPct)));
          }
        },
        onPanResponderMove: (_, gestureState) => {
          const width = trackWidthRef.current || 200;
          if (width > 0) {
            const deltaPct = (gestureState.dx / width) * 49;
            const newPct = startPercentRef.current + deltaPct;
            applyPercentValue(newPct);
          }
        },
        onPanResponderTerminationRequest: () => false,
        onPanResponderRelease: () => {},
      }),
    [],
  );

  const [refreshing, setRefreshing] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // Alert modal state
  const [alertConfig, setAlertConfig] = useState<CustomAlertProps>({
    visible: false,
    type: 'success',
    title: '',
    message: '',
    onClose: () => setAlertConfig((prev) => ({ ...prev, visible: false })),
  });

  const showAlert = (
    title: string,
    message: string,
    type: 'success' | 'error' | 'warning' | 'info' = 'info',
  ) => {
    setAlertConfig({
      visible: true,
      title,
      message,
      type,
      onClose: () => setAlertConfig((prev) => ({ ...prev, visible: false })),
    });
  };

  // Handler for applying chosen Scenario to update Jar allocation percentages
  const handleApplyScenario = async (presetType?: 'chill' | 'normal' | 'hard' | 'custom', customPct?: number) => {
    const activePreset = presetType || selectedPreset;
    const activePct = customPct !== undefined ? customPct : customPercent;

    // Yêu cầu Premium / VIP mới được tự động phân bổ hũ
    if (!isVip) {
      setShowUpgradeModal(true);
      return;
    }

    if (!jars || jars.length === 0) {
      showAlert('Thông Báo', 'Chưa tìm thấy danh sách hũ ngân sách để phân bổ.', 'info');
      return;
    }

    try {
      setIsApplyingScenario(true);
      let targetSavePercent = 10;
      let scenarioTitle = 'Normal';

      if (activePreset === 'chill') {
        targetSavePercent = 5;
        scenarioTitle = 'Chill (5%)';
      } else if (activePreset === 'normal') {
        targetSavePercent = 10;
        scenarioTitle = 'Normal (10%)';
      } else if (activePreset === 'hard') {
        targetSavePercent = 20;
        scenarioTitle = 'Hard (20%)';
      } else {
        targetSavePercent = activePct;
        scenarioTitle = `Tùy chỉnh (${activePct}%)`;
      }

      const remainingPercent = Math.max(0, 100 - targetSavePercent);
      // Essential jars get ~65% of remaining spend budget, Discretionary gets ~35%
      const targetEssentialPercent = Math.round(remainingPercent * 0.65);
      const targetDiscretionaryPercent = Math.max(0, remainingPercent - targetEssentialPercent);

      // Identify save jars vs essential vs discretionary spend jars
      const saveJars = jars.filter(
        (j) =>
          j.type === 'save' ||
          j.name.toLowerCase().includes('tiết kiệm') ||
          j.name.toLowerCase().includes('tích lũy') ||
          j.name.toLowerCase().includes('dự phòng'),
      );
      const essentialKeywords = ['thiết yếu', 'ăn uống', 'nhà', 'sinh hoạt', 'điện', 'nước', 'xăng', 'cố định'];
      const essentialJars = jars.filter(
        (j) =>
          j.type === 'spend' &&
          essentialKeywords.some((kw) => j.name.toLowerCase().includes(kw)) &&
          !saveJars.some((s) => s.id === j.id),
      );
      const discretionaryJars = jars.filter(
        (j) =>
          j.type === 'spend' &&
          !essentialKeywords.some((kw) => j.name.toLowerCase().includes(kw)) &&
          !saveJars.some((s) => s.id === j.id),
      );

      const newRatios: { id: string; percent: number }[] = [];

      // 1. Allocate Save Jars
      if (saveJars.length > 0) {
        const perSave = Math.floor(targetSavePercent / saveJars.length);
        saveJars.forEach((j, i) => {
          newRatios.push({
            id: j.id,
            percent: i === 0 ? targetSavePercent - perSave * (saveJars.length - 1) : perSave,
          });
        });
      }

      // 2. Allocate Essential Jars
      if (essentialJars.length > 0) {
        const perEss = Math.floor(targetEssentialPercent / essentialJars.length);
        essentialJars.forEach((j, i) => {
          newRatios.push({
            id: j.id,
            percent: i === 0 ? targetEssentialPercent - perEss * (essentialJars.length - 1) : perEss,
          });
        });
      }

      // 3. Allocate Discretionary Jars
      if (discretionaryJars.length > 0) {
        const perDisc = Math.floor(targetDiscretionaryPercent / discretionaryJars.length);
        discretionaryJars.forEach((j, i) => {
          newRatios.push({
            id: j.id,
            percent: i === 0 ? targetDiscretionaryPercent - perDisc * (discretionaryJars.length - 1) : perDisc,
          });
        });
      }

      // Any remaining jars
      const coveredIds = newRatios.map((r) => r.id);
      const remainingJars = jars.filter((j) => !coveredIds.includes(j.id));
      remainingJars.forEach((j) => {
        newRatios.push({ id: j.id, percent: j.allocationPercent || 0 });
      });

      const success = await updateJarRatios(newRatios);
      if (success) {
        showAlert(
          'Đã Cập Nhật Tỷ Lệ Hũ',
          `Áp dụng thành công kịch bản ${scenarioTitle}: Hũ Tiết Kiệm đạt ${targetSavePercent}%, các hũ chi tiêu được cân bằng ${100 - targetSavePercent}%!`,
          'success',
        );
      } else {
        showAlert('Lỗi', 'Không thể cập nhật tỷ lệ hũ vào lúc này.', 'error');
      }
    } catch (error) {
      console.warn('Lỗi áp dụng kịch bản:', error);
      showAlert('Lỗi', 'Đã xảy ra lỗi khi cập nhật tỷ lệ hũ.', 'error');
    } finally {
      setIsApplyingScenario(false);
    }
  };

  const periodLabel = useMemo(() => {
    if (periodMode === 'month') {
      const isCurrent = selectedYear === currentYear && selectedMonth === currentMonth;
      return `Tháng ${selectedMonth}/${selectedYear}${isCurrent ? ' (Hiện tại)' : ''}`;
    }
    return `Cả năm ${selectedYear}`;
  }, [periodMode, selectedYear, selectedMonth, currentYear, currentMonth]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshAll();
    setRefreshing(false);
  };

  // Open custom picker modal
  const handleOpenPicker = () => {
    setTempMode(periodMode);
    setTempYearInput(selectedYear.toString());
    setTempMonthInput(selectedMonth.toString());
    setShowPickerModal(true);
  };

  // Apply custom period selection
  const handleApplyCustomPeriod = () => {
    const y = parseInt(tempYearInput.replace(/[^0-9]/g, ''), 10);
    const m = parseInt(tempMonthInput.replace(/[^0-9]/g, ''), 10);

    if (isNaN(y) || y < 2000 || y > 2100) {
      showAlert('Năm không hợp lệ', 'Vui lòng nhập năm từ 2000 đến 2100.', 'warning');
      return;
    }

    if (tempMode === 'month') {
      if (isNaN(m) || m < 1 || m > 12) {
        showAlert('Tháng không hợp lệ', 'Vui lòng chọn hoặc nhập tháng từ 1 đến 12.', 'warning');
        return;
      }
      setSelectedMonth(m);
    }

    setSelectedYear(y);
    setPeriodMode(tempMode);
    setShowPickerModal(false);
  };

  // Quick preset handlers
  const setQuickCurrentMonth = () => {
    setPeriodMode('month');
    setSelectedYear(currentYear);
    setSelectedMonth(currentMonth);
  };

  const setQuickPrevMonth = () => {
    setPeriodMode('month');
    if (currentMonth === 1) {
      setSelectedYear(currentYear - 1);
      setSelectedMonth(12);
    } else {
      setSelectedYear(currentYear);
      setSelectedMonth(currentMonth - 1);
    }
  };

  const setQuickCurrentYear = () => {
    setPeriodMode('year');
    setSelectedYear(currentYear);
  };

  // Filter transactions for the selected period
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (!tx.date) return false;
      const txDate = new Date(tx.date);
      if (isNaN(txDate.getTime())) return false;

      const txYear = txDate.getFullYear();
      const txMonth = txDate.getMonth() + 1;

      if (periodMode === 'month') {
        return txYear === selectedYear && txMonth === selectedMonth;
      } else {
        return txYear === selectedYear;
      }
    });
  }, [transactions, periodMode, selectedYear, selectedMonth]);

  // Compute Core Financial Variables X, Y, Z, T & Daily Safe Spend
  const calculation = useMemo(() => {
    const isCurrentSelected =
      (periodMode === 'month' && selectedYear === currentYear && selectedMonth === currentMonth) ||
      (periodMode === 'year' && selectedYear === currentYear);

    const hasPeriodData = filteredTransactions.length > 0;
    // Nếu người dùng chọn thời gian trong quá khứ lúc chưa tải app / không có bất kỳ giao dịch nào:
    const isPastPeriodWithoutData = !hasPeriodData && !isCurrentSelected;

    // 1. Biến X: Thu nhập định kỳ
    const incomeTxs = filteredTransactions.filter((tx) => tx.type === 'income' && !tx.isTransfer);
    const recordedIncome = incomeTxs.reduce((sum, tx) => sum + (tx.amount || 0), 0);
    const multiplier = periodMode === 'year' ? 12 : 1;
    const baseGoalIncome = (monthlyIncomeGoal || 10000000) * multiplier;
    const incomeX = isPastPeriodWithoutData ? 0 : (recordedIncome > 0 ? recordedIncome : baseGoalIncome);
    const monthlyEquivalentIncome = isPastPeriodWithoutData ? 0 : (periodMode === 'year' ? Math.round(incomeX / 12) : incomeX);

    // 2. Biến Y: Quỹ an toàn ban đầu / Tiền đã tiết kiệm trước app
    const safetyFundY = isPastPeriodWithoutData ? 0 : (initialBalance > 0 ? initialBalance : (balances.cash + balances.bank) || 15000000);

    // 3. Biến Z: Tổng chi tiêu thực tế trong kỳ
    const expenseTxs = filteredTransactions.filter(
      (tx) => tx.type === 'expense' && !tx.isTransfer,
    );
    const totalExpenseZ = expenseTxs.reduce((sum, tx) => sum + (tx.amount || 0), 0);

    // Grouping transactions by Day
    const dailyMap: { [dateStr: string]: { total: number; count: number; txs: typeof expenseTxs } } = {};
    expenseTxs.forEach((tx) => {
      const dStr = tx.date ? tx.date.split('T')[0] : 'N/A';
      if (!dailyMap[dStr]) {
        dailyMap[dStr] = { total: 0, count: 0, txs: [] };
      }
      dailyMap[dStr].total += tx.amount || 0;
      dailyMap[dStr].count += 1;
      dailyMap[dStr].txs.push(tx);
    });

    const activeSpendDaysCount = Object.keys(dailyMap).length;
    let peakSpendDay = { date: '', amount: 0, count: 0 };
    Object.keys(dailyMap).forEach((dStr) => {
      if (dailyMap[dStr].total > peakSpendDay.amount) {
        peakSpendDay = { date: dStr, amount: dailyMap[dStr].total, count: dailyMap[dStr].count };
      }
    });

    // Top 3 highest individual transactions
    const sortedExpenseTxs = [...expenseTxs].sort((a, b) => (b.amount || 0) - (a.amount || 0));
    const top3Expenses = sortedExpenseTxs.slice(0, 3);

    // Expense Categorization
    const foodKeywords = ['ăn', 'uống', 'food', 'cà phê', 'coffee', 'nhà hàng', 'tiệc', 'trà sữa', 'lunch', 'dinner'];
    const livingKeywords = ['nhà', 'điện', 'nước', 'xăng', 'thuê', 'học', 'internet', 'phí', 'y tế', 'thuốc'];
    const controllableKeywords = ['mua sắm', 'shopping', 'quần áo', 'giải trí', 'game', 'xem phim', 'du lịch', 'cafe', 'cà phê', 'trà sữa'];

    let foodExpenses = 0;
    let essentialLivingExpenses = 0;
    let controllableExpenses = 0;
    let discretionaryExpenses = 0;
    let anomalyExpenses = 0;

    const avgTxAmount = expenseTxs.length > 0 ? totalExpenseZ / expenseTxs.length : 0;

    expenseTxs.forEach((tx) => {
      const amt = tx.amount || 0;
      const desc = (tx.description || '').toLowerCase();
      const cat = (tx.categoryName || tx.jarName || '').toLowerCase();

      if (amt > Math.max(500000, avgTxAmount * 3)) {
        anomalyExpenses += amt;
      }

      if (foodKeywords.some((kw) => desc.includes(kw) || cat.includes(kw))) {
        foodExpenses += amt;
      } else if (livingKeywords.some((kw) => desc.includes(kw) || cat.includes(kw))) {
        essentialLivingExpenses += amt;
      } else if (controllableKeywords.some((kw) => desc.includes(kw) || cat.includes(kw))) {
        controllableExpenses += amt;
      } else {
        discretionaryExpenses += amt;
      }
    });

    const totalEssential = isPastPeriodWithoutData ? 0 : (foodExpenses + essentialLivingExpenses || Math.round(totalExpenseZ * 0.6));
    const totalControllable = isPastPeriodWithoutData ? 0 : (controllableExpenses + discretionaryExpenses || Math.round(totalExpenseZ * 0.4));

    // Multi-month comparison (Prior month food expenses)
    const prevMonthDate = new Date(selectedYear, selectedMonth - 2, 1);
    const prevMonthTxs = transactions.filter((tx) => {
      if (!tx.date) return false;
      const d = new Date(tx.date);
      return (
        d.getFullYear() === prevMonthDate.getFullYear() &&
        d.getMonth() === prevMonthDate.getMonth() &&
        tx.type === 'expense' &&
        !tx.isTransfer
      );
    });
    const prevMonthFoodExpenses = prevMonthTxs
      .filter((tx) => {
        const desc = (tx.description || '').toLowerCase();
        const cat = (tx.categoryName || tx.jarName || '').toLowerCase();
        return foodKeywords.some((kw) => desc.includes(kw) || cat.includes(kw));
      })
      .reduce((sum, tx) => sum + (tx.amount || 0), 0);

    const foodTrendPercent =
      prevMonthFoodExpenses > 0
        ? Math.round(((foodExpenses - prevMonthFoodExpenses) / prevMonthFoodExpenses) * 100)
        : 0;

    // Core Ratios
    const netCashFlow = isPastPeriodWithoutData ? 0 : incomeX - totalExpenseZ;
    const savingsRate = incomeX > 0 ? Math.round((Math.max(0, netCashFlow) / incomeX) * 100) : 0;
    const expenseRate = incomeX > 0 ? Math.round((totalExpenseZ / incomeX) * 100) : 0;

    // 4. Biến T: Dự toán mục tiêu tài chính
    const primaryGoal =
      goals.length > 0
        ? goals[0]
        : jars.find((j) => j.type === 'save') || {
            targetAmount: 50000000,
            name: 'Quỹ Dự Phòng & Tích Lũy',
          };

    const targetAmount = (primaryGoal as any).targetAmount || 50000000;
    const currentGoalSavings = (primaryGoal as any).savedAmount || (primaryGoal as any).balance || 0;
    const targetMonthsGoal = 12;

    const remainingToTarget = Math.max(0, targetAmount - currentGoalSavings);
    const targetProgressPct = targetAmount > 0 ? Math.min(100, Math.round((currentGoalSavings / targetAmount) * 100)) : 0;
    const saveJar = jars.find((j) => j.type === 'save');
    const saveJarPercent = saveJar ? saveJar.allocationPercent : 20;

    const monthlyGoalContribution = isPastPeriodWithoutData ? 0 : Math.max(
      300000,
      Math.round((monthlyEquivalentIncome * saveJarPercent) / 100),
      periodMode === 'month' && netCashFlow > 0 ? netCashFlow : 0,
    );

    const estimatedMonthsToGoal =
      isPastPeriodWithoutData ? 0 : (remainingToTarget <= 0 ? 0 : Math.ceil(remainingToTarget / Math.max(100000, monthlyGoalContribution)));

    const requiredMonthlySaving = Math.round(remainingToTarget / targetMonthsGoal);
    const monthlyGap = isPastPeriodWithoutData ? 0 : requiredMonthlySaving - monthlyGoalContribution;

    let goalStatus: 'ON_TRACK' | 'NEEDS_ATTENTION' | 'AT_RISK' | 'OFF_TRACK' = 'ON_TRACK';
    if (isPastPeriodWithoutData) {
      goalStatus = 'ON_TRACK';
    } else if (netCashFlow <= 0) {
      goalStatus = 'OFF_TRACK';
    } else if (estimatedMonthsToGoal > targetMonthsGoal * 1.5 || monthlyGap > 1500000) {
      goalStatus = 'AT_RISK';
    } else if (estimatedMonthsToGoal > targetMonthsGoal || monthlyGap > 0) {
      goalStatus = 'NEEDS_ATTENTION';
    } else {
      goalStatus = 'ON_TRACK';
    }

    const isTargetOnTime = goalStatus === 'ON_TRACK';

    // 5. LOẠI BỎ HŨ TRÙNG LẶP (Chỉ giữ lại các hũ duy nhất)
    const uniqueJars = jars.filter(
      (jar, index, self) =>
        index === self.findIndex((t) => t.name.trim().toLowerCase() === jar.name.trim().toLowerCase()),
    );

    // 6. TÍNH TOÁN NGÀY, TỐC ĐỘ TIÊU & HẠN MỨC AN TOÀN TRÊN NGÀY CHO THÁNG / NĂM
    let totalDaysInPeriod: number;
    let daysElapsed: number;
    let daysRemaining: number;

    if (periodMode === 'year') {
      const isLeapYear = (selectedYear % 4 === 0 && selectedYear % 100 !== 0) || selectedYear % 400 === 0;
      totalDaysInPeriod = isLeapYear ? 366 : 365;

      if (isCurrentSelected) {
        const startOfYear = new Date(selectedYear, 0, 1);
        const dayOfYear = Math.floor((now.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        daysElapsed = Math.max(1, Math.min(totalDaysInPeriod, dayOfYear));
        daysRemaining = Math.max(1, totalDaysInPeriod - daysElapsed + 1);
      } else {
        daysElapsed = totalDaysInPeriod;
        daysRemaining = 1;
      }
    } else {
      const lastDayOfMonth = new Date(selectedYear, selectedMonth, 0).getDate();
      totalDaysInPeriod = lastDayOfMonth;

      if (isCurrentSelected) {
        const nowDay = now.getDate();
        daysElapsed = Math.max(1, nowDay);
        daysRemaining = Math.max(1, lastDayOfMonth - nowDay + 1);
      } else {
        daysElapsed = totalDaysInPeriod;
        daysRemaining = 1;
      }
    }

    const burnRatePerDay = isPastPeriodWithoutData ? 0 : Math.round(totalExpenseZ / Math.max(1, daysElapsed));

    // Emergency Fund Months = Y / Essential Monthly Expenses
    const monthlyEssential = periodMode === 'year'
      ? Math.round(totalEssential / Math.max(1, daysElapsed / 30.41))
      : totalEssential;
    const emergencyFundMonths =
      isPastPeriodWithoutData ? 0 : (monthlyEssential > 0 ? Number((safetyFundY / monthlyEssential).toFixed(1)) : 6.0);

    // Tổng % phân bổ chi tiêu từ các hũ chi tiêu (spend)
    const totalSpendPercent = uniqueJars
      .filter((j) => j.type === 'spend')
      .reduce((sum, j) => sum + (j.allocationPercent || 0), 0) || 80;

    // Ngân sách chi tiêu an toàn trong kỳ được phân bổ từ thu nhập X (không đụng quỹ dự phòng Y)
    const monthlySpendBudget = isPastPeriodWithoutData ? 0 : Math.round((incomeX * totalSpendPercent) / 100);
    // Ngân sách chi tiêu còn lại trong kỳ
    const remainingSpendBudget = isPastPeriodWithoutData ? 0 : Math.max(0, monthlySpendBudget - totalExpenseZ);

    // Hạn mức chi tiêu an toàn mỗi ngày = Ngân sách chi tiêu còn lại / số ngày còn lại trong kỳ
    const safeDailySpendLimit = isPastPeriodWithoutData
      ? 0
      : (isCurrentSelected
        ? Math.max(0, Math.round(remainingSpendBudget / Math.max(1, daysRemaining)))
        : Math.round(monthlySpendBudget / Math.max(1, totalDaysInPeriod)));

    const projectedMonthEndSpent = isCurrentSelected
      ? totalExpenseZ + burnRatePerDay * Math.max(0, daysRemaining - 1)
      : totalExpenseZ;

    const isSavingsPreserved = isPastPeriodWithoutData ? true : projectedMonthEndSpent <= incomeX;
    const potentialDeficitAmount = isPastPeriodWithoutData ? 0 : Math.max(0, projectedMonthEndSpent - incomeX);

    // Jars Breakdown Calculation (Duy nhất theo từng loại hũ)
    const jarsBreakdown = uniqueJars.map((jar) => {
      const matchingIds = jars
        .filter((j) => j.name.trim().toLowerCase() === jar.name.trim().toLowerCase())
        .map((j) => j.id);

      const jarTxs = filteredTransactions.filter(
        (tx) =>
          (matchingIds.includes(tx.jarId || '') ||
            (tx.jarName && tx.jarName.trim().toLowerCase() === jar.name.trim().toLowerCase())) &&
          tx.type === 'expense' &&
          !tx.isTransfer,
      );
      const spent = jarTxs.reduce((sum, tx) => sum + (tx.amount || 0), 0);
      const budget = isPastPeriodWithoutData ? 0 : (incomeX * (jar.allocationPercent || 0)) / 100;
      const spentPct = budget > 0 ? Math.min(200, Math.round((spent / budget) * 100)) : 0;
      const remainingJarBudget = Math.max(0, budget - spent);

      return {
        id: jar.id,
        name: jar.name,
        type: jar.type,
        color: jar.color || '#3B82F6',
        allocationPercent: jar.allocationPercent || 0,
        budget,
        spent,
        spentPct,
        remainingJarBudget,
        txCount: jarTxs.length,
      };
    });

    // Tổng số tiền từ các hũ chi tiêu chưa dùng
    const totalUnusedJarsBudget = isPastPeriodWithoutData
      ? 0
      : jarsBreakdown
          .filter((j) => j.type === 'spend')
          .reduce((sum, j) => sum + j.remainingJarBudget, 0);

    // Dự kiến số tiền thặng dư cuối kỳ nếu duy trì đúng kế hoạch hạn mức chi tiêu
    const savingsAllocation = isPastPeriodWithoutData ? 0 : Math.max(0, incomeX - monthlySpendBudget);
    const projectedMonthEndSurplus = isPastPeriodWithoutData ? 0 : savingsAllocation + totalUnusedJarsBudget;

    // 3 SCENARIOS THEO YÊU CẦU (Tính toán theo thu nhập tháng tương đương):
    // 1. CHILL (5% thu nhập)
    const chillPercent = 5;
    const chillMonthlySaving = isPastPeriodWithoutData ? 0 : Math.round((monthlyEquivalentIncome * chillPercent) / 100);
    const chillCompletionMonths = (isPastPeriodWithoutData || chillMonthlySaving <= 0) ? 0 : (remainingToTarget <= 0 ? 0 : Math.ceil(remainingToTarget / chillMonthlySaving));
    const scenarioChill = {
      id: 'chill',
      name: 'CHILL',
      percent: chillPercent,
      desc: 'Tích lũy 5%',
      monthlySaving: chillMonthlySaving,
      completionMonths: chillCompletionMonths,
      savingsRate: chillPercent,
      monthlyBuffer: Math.max(0, monthlyEquivalentIncome - chillMonthlySaving),
    };

    // 2. NORMAL (10% thu nhập)
    const normalPercent = 10;
    const normalMonthlySaving = isPastPeriodWithoutData ? 0 : Math.round((monthlyEquivalentIncome * normalPercent) / 100);
    const normalCompletionMonths = (isPastPeriodWithoutData || normalMonthlySaving <= 0) ? 0 : (remainingToTarget <= 0 ? 0 : Math.ceil(remainingToTarget / normalMonthlySaving));
    const scenarioNormal = {
      id: 'normal',
      name: 'NORMAL',
      percent: normalPercent,
      desc: 'Tích lũy 10%',
      monthlySaving: normalMonthlySaving,
      completionMonths: normalCompletionMonths,
      savingsRate: normalPercent,
      monthlyBuffer: Math.max(0, monthlyEquivalentIncome - normalMonthlySaving),
    };

    // 3. HARD (20% thu nhập)
    const hardPercent = 20;
    const hardMonthlySaving = isPastPeriodWithoutData ? 0 : Math.round((monthlyEquivalentIncome * hardPercent) / 100);
    const hardCompletionMonths = (isPastPeriodWithoutData || hardMonthlySaving <= 0) ? 0 : (remainingToTarget <= 0 ? 0 : Math.ceil(remainingToTarget / hardMonthlySaving));
    const scenarioHard = {
      id: 'hard',
      name: 'HARD',
      percent: hardPercent,
      desc: 'Tích lũy 20%',
      monthlySaving: hardMonthlySaving,
      completionMonths: hardCompletionMonths,
      savingsRate: hardPercent,
      monthlyBuffer: Math.max(0, monthlyEquivalentIncome - hardMonthlySaving),
    };

    // 4. Custom slider rate
    const customMonthlySaving = isPastPeriodWithoutData ? 0 : Math.round((monthlyEquivalentIncome * customPercent) / 100);
    const customCompletionMonths = (isPastPeriodWithoutData || customMonthlySaving <= 0) ? 0 : (remainingToTarget <= 0 ? 0 : Math.ceil(remainingToTarget / Math.max(1, customMonthlySaving)));

    const risksList: Array<{
      risk: string;
      evidence: string;
      impact: string;
      confidence: 'HIGH' | 'MEDIUM';
      suggestedAction: string;
    }> = [];

    if (!isSavingsPreserved && potentialDeficitAmount > 0) {
      risksList.push({
        risk: 'Tốc độ chi tiêu vượt ngưỡng thu nhập',
        evidence: `Tốc độ tiêu ${burnRatePerDay.toLocaleString('vi-VN')} đ/ngày. Dự báo cuối ${periodMode === 'year' ? 'năm ' + selectedYear : 'tháng'} tiêu ${projectedMonthEndSpent.toLocaleString('vi-VN')} đ so với thu nhập ${incomeX.toLocaleString('vi-VN')} đ.`,
        impact: `Nguy cơ thâm hụt ${potentialDeficitAmount.toLocaleString('vi-VN')} đ và thâm hụt vào tích lũy.`,
        confidence: 'HIGH',
        suggestedAction: `Áp dụng trần chi tiêu ${safeDailySpendLimit.toLocaleString('vi-VN')} đ/ngày.`,
      });
    }

    if (foodTrendPercent > 15) {
      risksList.push({
        risk: 'Chi phí ăn uống & ẩm thực tăng cao',
        evidence: `Chi phí ăn uống kỳ này (${foodExpenses.toLocaleString('vi-VN')} đ) tăng +${foodTrendPercent}% so với kỳ trước (${prevMonthFoodExpenses.toLocaleString('vi-VN')} đ).`,
        impact: 'Làm thu hẹp biên thặng dư tài chính tích lũy hàng tháng.',
        confidence: 'HIGH',
        suggestedAction: 'Giảm bớt tần suất ăn ngoài và dịch vụ giao đồ ăn 2-3 bữa/tuần.',
      });
    }

    if (emergencyFundMonths < 3.0) {
      risksList.push({
        risk: 'Vùng đệm quỹ an toàn mỏng',
        evidence: `Quỹ an toàn Y (${safetyFundY.toLocaleString('vi-VN')} đ) hiện chỉ duy trì được ${emergencyFundMonths} tháng chi phí thiết yếu (chuẩn: 3-6 tháng).`,
        impact: 'Dễ bị động trước các biến cố công việc, y tế đột xuất.',
        confidence: 'MEDIUM',
        suggestedAction: `Trích bổ sung thêm ${(totalEssential * 3 - safetyFundY).toLocaleString('vi-VN')} đ vào quỹ an toàn.`,
      });
    }

    if (goalStatus !== 'ON_TRACK') {
      risksList.push({
        risk: 'Nguy cơ chậm tiến độ mục tiêu tài chính',
        evidence: `Mục tiêu ${primaryGoal.name} dự kiến cần ${estimatedMonthsToGoal} tháng để hoàn thành, chậm hơn kế hoạch ${targetMonthsGoal} tháng.`,
        impact: 'Kéo dài thời gian đạt độc lập tài chính và mục tiêu đề ra.',
        confidence: 'HIGH',
        suggestedAction: `Áp dụng kịch bản Normal hoặc Hard để rút ngắn thời gian về ${scenarioNormal.completionMonths} tháng.`,
      });
    }

    if (risksList.length === 0) {
      risksList.push({
        risk: 'Rủi ro dòng tiền ở mức thấp',
        evidence: `Tỷ lệ tiết kiệm đạt ${savingsRate}%, thặng dư ${netCashFlow.toLocaleString('vi-VN')} đ, quỹ dự phòng ${emergencyFundMonths} tháng an toàn.`,
        impact: 'Tiến độ tài chính duy trì ổn định và đúng lộ trình.',
        confidence: 'HIGH',
        suggestedAction: 'Tiếp tục duy trì kỷ luật phân bổ hũ ngân sách hàng tháng.',
      });
    }

    return {
      incomeX,
      recordedIncome,
      safetyFundY,
      totalExpenseZ,
      monthlySpendBudget,
      remainingSpendBudget,
      totalSpendPercent,
      totalUnusedJarsBudget,
      projectedMonthEndSurplus,
      foodExpenses,
      essentialLivingExpenses,
      controllableExpenses,
      discretionaryExpenses,
      anomalyExpenses,
      totalEssential,
      totalControllable,
      prevMonthFoodExpenses,
      foodTrendPercent,
      netCashFlow,
      netSavings: Math.max(0, netCashFlow),
      savingsRate,
      expenseRate,
      emergencyFundMonths,
      targetAmount,
      currentGoalSavings,
      remainingToTarget,
      targetProgressPct,
      isPastPeriodWithoutData,
      targetGoalName: (primaryGoal as any).name || 'Mục tiêu tài chính',
      targetMonthsGoal,
      estimatedMonthsToGoal,
      requiredMonthlySaving,
      monthlyGoalContribution,
      monthlyGap,
      goalStatus,
      isTargetOnTime,
      burnRatePerDay,
      daysRemaining,
      daysElapsed,
      activeSpendDaysCount,
      peakSpendDay,
      top3Expenses,
      isCurrentSelected,
      projectedMonthEndSpent,
      isSavingsPreserved,
      potentialDeficitAmount,
      safeDailySpendLimit,
      jarsBreakdown,
      scenarioChill,
      scenarioNormal,
      scenarioHard,
      customMonthlySaving,
      customCompletionMonths,
      risksList,
    };
  }, [
    filteredTransactions,
    periodMode,
    selectedYear,
    selectedMonth,
    monthlyIncomeGoal,
    initialBalance,
    balances,
    goals,
    jars,
    transactions,
    currentYear,
    currentMonth,
    customPercent,
  ]);

  // Handle Export PDF
  const handleExportPdf = async () => {
    if (!isVip) {
      setShowUpgradeModal(true);
      return;
    }

    try {
      setIsExportingPdf(true);
      const reportData: ReportData = {
        userName: userName || 'Quý Khách Hàng',
        periodLabel: periodLabel,
        generatedDate: new Date().toLocaleDateString('vi-VN'),
        isVip: true,
        metrics: {
          incomeX: calculation.incomeX,
          netWorthY: calculation.safetyFundY,
          totalExpenseZ: calculation.totalExpenseZ,
          netCashFlow: calculation.netCashFlow,
          savingsRate: calculation.savingsRate,
          expenseRate: calculation.expenseRate,
          emergencyFundMonths: calculation.emergencyFundMonths,
          burnRatePerDay: calculation.burnRatePerDay,
          daysRemaining: calculation.daysRemaining,
          activeSpendDaysCount: calculation.activeSpendDaysCount,
          peakSpendDay: calculation.peakSpendDay,
          estimatedEndBalance: Math.max(0, calculation.incomeX - calculation.projectedMonthEndSpent),
        },
        dataValidation: {
          incomeStatus: `Định kỳ ${calculation.incomeX.toLocaleString('vi-VN')} đ (${calculation.recordedIncome > 0 ? 'Dữ liệu thực tế ghi nhận' : 'Dữ liệu mục tiêu cơ sở'}).`,
          safetyFundStatus: `Quỹ an toàn Y = ${calculation.safetyFundY.toLocaleString('vi-VN')} đ (Bệ đỡ an toàn ban đầu).`,
          expenseStatus: `Tổng hợp từ ${filteredTransactions.filter((t) => t.type === 'expense').length} giao dịch chi tiêu trong kỳ.`,
          calculationsVerified: true,
          missingDataNotes: 'Dữ liệu giao dịch và ngân sách hũ đã được đối soát đầy đủ.',
        },
        categoriesBreakdown: {
          essential: calculation.totalEssential,
          controllable: calculation.controllableExpenses,
          discretionary: calculation.discretionaryExpenses,
          anomaly: calculation.anomalyExpenses,
        },
        topTransactions: calculation.top3Expenses.map((tx) => ({
          date: tx.date ? tx.date.split('T')[0] : 'N/A',
          description: tx.description || 'Chi tiêu',
          amount: tx.amount || 0,
          jarName: tx.jarName || tx.categoryName || 'Chi tiêu',
        })),
        variablesAnalysis: {
          varXDesc: `Thu nhập định kỳ ${calculation.incomeX.toLocaleString('vi-VN')} đ bảo đảm nguồn tiền đầu vào.`,
          varYDesc: `Quỹ an toàn ban đầu ${calculation.safetyFundY.toLocaleString('vi-VN')} đ bảo đảm vùng đệm tài chính tích lũy trước khi dùng app.`,
          varZDesc: `Tổng chi tiêu ${calculation.totalExpenseZ.toLocaleString('vi-VN')} đ (Thiết yếu: ${calculation.totalEssential.toLocaleString('vi-VN')} đ, Kiểm soát được: ${calculation.totalControllable.toLocaleString('vi-VN')} đ).`,
          varTDesc: `Mục tiêu ${calculation.targetGoalName} (${calculation.targetAmount.toLocaleString('vi-VN')} đ) dự kiến hoàn thành sau ${calculation.estimatedMonthsToGoal} tháng (kế hoạch ${calculation.targetMonthsGoal} tháng).`,
          targetTimelineStatus: calculation.isTargetOnTime
            ? 'ĐÚNG KẾ HOẠCH TIẾN ĐỘ'
            : 'CÓ NGUY CƠ CHẬM TIẾN ĐỘ',
          isTargetOnTime: calculation.isTargetOnTime,
          estimatedMonthsToGoal: calculation.estimatedMonthsToGoal,
          targetMonthsGoal: calculation.targetMonthsGoal,
          goalStatus: calculation.goalStatus,
        },
        jarsBreakdown: calculation.jarsBreakdown.map((j) => ({
          name: j.name,
          allocationPercent: j.allocationPercent,
          budget: j.budget,
          spent: j.spent,
          spentPct: j.spentPct,
          remainingJarBudget: j.remainingJarBudget,
          txCount: j.txCount,
          color: j.color,
        })),
        goalsBreakdown: (goals.length > 0 ? goals : jars.filter((j) => j.type === 'save')).map(
          (g: any) => ({
            name: g.name,
            targetAmount: g.targetAmount || 50000000,
            savedAmount: g.savedAmount || g.balance || 0,
            progressPct: Math.round(
              (((g.savedAmount || g.balance || 0) / (g.targetAmount || 50000000)) * 100),
            ),
          }),
        ),
        scenarios: {
          current: calculation.scenarioChill,
          optimized: calculation.scenarioNormal,
          accelerated: calculation.scenarioHard,
        },
        riskAssessment: {
          riskLevel: calculation.isSavingsPreserved ? 'Low' : 'High',
          riskMessage: calculation.isSavingsPreserved
            ? 'Dòng tiền ổn định. Tốc độ tiêu dùng hiện tại bảo toàn 100% mục tiêu tích lũy cuối tháng.'
            : `Cảnh báo: Tốc độ tiêu dùng có thể gây thâm hụt ${calculation.potentialDeficitAmount.toLocaleString('vi-VN')} đ cuối tháng.`,
          safeDailySpendLimit: calculation.safeDailySpendLimit,
          isSavingsPreserved: calculation.isSavingsPreserved,
          potentialDeficitAmount: calculation.potentialDeficitAmount,
          risksList: calculation.risksList,
        },
        recommendations: [
          {
            action: `Giới hạn chi tiêu mỗi ngày tối đa ${calculation.safeDailySpendLimit.toLocaleString('vi-VN')} đ/ngày.`,
            reason: `Tính từ ngân sách chi tiêu tháng (${calculation.monthlySpendBudget.toLocaleString('vi-VN')} đ) chia cho ${calculation.daysRemaining} ngày còn lại.`,
            expectedEffect: `Bảo toàn ${calculation.netSavings.toLocaleString('vi-VN')} đ thặng dư vào cuối kỳ.`,
          },
          {
            action: calculation.foodTrendPercent > 10
              ? `Tối ưu chi phí ăn uống và cafe, giảm bớt khoảng ${(Math.round(calculation.foodExpenses * 0.15)).toLocaleString('vi-VN')} đ/kỳ.`
              : 'Duy trì chi phí ăn uống ổn định và theo dõi hạn mức hũ thiết yếu.',
            reason: calculation.foodTrendPercent > 10
              ? `Chi phí ăn uống kỳ này tăng +${calculation.foodTrendPercent}% so với kỳ trước.`
              : 'Chi phí ăn uống đang ở mức cân bằng tốt.',
            expectedEffect: `Tăng thêm ${Math.round(calculation.totalControllable * 0.15).toLocaleString('vi-VN')} đ vào quỹ tích lũy mỗi tháng.`,
          },
          {
            action: 'Tự động trích lập tối thiểu 20% thu nhập (Biến X) vào hũ tiết kiệm ngay ngày nhận lương.',
            reason: 'Tránh việc chi tiêu trước rồi mới tiết kiệm phần còn lại.',
            expectedEffect: `Rút ngắn thời gian đạt mục tiêu ${calculation.targetGoalName} về ${calculation.scenarioHard.completionMonths} tháng.`,
          },
        ],
        confidenceLevel: 'HIGH',
      };

      const success = await pdfReportService.exportReportToPdf(reportData);
      if (success) {
        showAlert('Xuất Báo Cáo Thành Công', 'Tài liệu báo cáo PDF tài chính đã sẵn sàng.', 'success');
      } else {
        showAlert('Lỗi Xuất File', 'Không thể tạo file in. Vui lòng thử lại.', 'error');
      }
    } catch (error) {
      console.error('Lỗi export PDF:', error);
      showAlert('Lỗi', 'Đã xảy ra lỗi trong quá trình xuất PDF.', 'error');
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* 1. TOP UNIFIED HEADER */}
      <AppHeader
        onNavigateToSettings={onNavigateToSettings}
        onNavigateToHistory={onNavigateToHistory}
        onNavigateToRecord={onNavigateToRecord}
      />

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563EB']} />
        }
      >
        {/* COMPACT TITLE & PERIOD BAR */}
        <View style={styles.periodBar}>
          <View style={styles.periodTopRow}>
            <View>
              <Text style={styles.screenHeading}>Kỷ Luật & Báo Cáo Tài Chính</Text>
              <View style={styles.activePeriodBox}>
                <Feather name="calendar" size={14} color="#2563EB" />
                <Text style={styles.activePeriodText}>{periodLabel}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.customPeriodBtn}
              onPress={handleOpenPicker}
              activeOpacity={0.7}
            >
              <Feather name="sliders" size={13} color="#2563EB" />
              <Text style={styles.customPeriodBtnText}>Đổi kỳ</Text>
            </TouchableOpacity>
          </View>

          {/* Quick presets */}
          <View style={styles.quickPresetRow}>
            

           

           
          </View>
        </View>

        {/* ======================================================== */}
        {/* 1. HERO CARD: HẠN MỨC AN TOÀN (KỲ HIỆN TẠI) HOẶC TỔNG KẾT CHI TIÊU (CÁC THÁNG KHÁC) */}
        {/* ======================================================== */}
        {calculation.isCurrentSelected ? (
          <View style={styles.heroDailyCard}>
            <View style={styles.heroDailyTopRow}>
              <View style={styles.heroBadge}>
                <Feather name="shield" size={13} color="#60A5FA" />
                <Text style={styles.heroBadgeText}>HẠN MỨC AN TOÀN HÔM NAY</Text>
              </View>
              <View
                style={[
                  styles.heroStatusDot,
                  { backgroundColor: calculation.isSavingsPreserved ? '#10B981' : '#EF4444' },
                ]}
              />
            </View>

            <View style={styles.heroDailyAmountRow}>
              <Text style={styles.heroDailyAmount}>
                {formatCurrencyCompact(calculation.safeDailySpendLimit)}
              </Text>
              <Text style={styles.heroDailyUnit}>/ ngày</Text>
            </View>

            <Text style={styles.heroDailyNote}>
              Duy trì đúng hạn mức này, dự kiến cuối {periodMode === 'year' ? `năm ${selectedYear}` : 'tháng'} sẽ dư{' '}
              <Text style={styles.heroHighlightBold}>
                {formatCurrencyCompact(calculation.projectedMonthEndSurplus, true)}
              </Text>
              {' '}(gồm{' '}
              <Text style={styles.heroHighlightBold}>
                {formatCurrencyCompact(calculation.totalUnusedJarsBudget)}
              </Text>
              {' '}từ các hũ chi tiêu chưa dùng + tích lũy).
            </Text>

            <View style={styles.heroFooterMetrics}>
              <View style={styles.heroFooterMetricItem}>
                <Text style={styles.heroFooterMetricLabel}>Hũ chi tiêu chưa dùng</Text>
                <Text style={[styles.heroFooterMetricVal, { color: '#38BDF8' }]}>
                  {formatCurrencyCompact(calculation.totalUnusedJarsBudget)}
                </Text>
              </View>
              <View style={styles.heroDividerVertical} />
              <View style={styles.heroFooterMetricItem}>
                <Text style={styles.heroFooterMetricLabel}>Dự kiến tích lũy cuối kỳ</Text>
                <Text style={[styles.heroFooterMetricVal, { color: '#4ADE80' }]}>
                  {formatCurrencyCompact(calculation.projectedMonthEndSurplus, true)}
                </Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.heroDailyCard}>
            <View style={styles.heroDailyTopRow}>
              <View
                style={[
                  styles.heroBadge,
                  {
                    backgroundColor: 'rgba(56, 189, 248, 0.15)',
                    borderColor: 'rgba(56, 189, 248, 0.35)',
                  },
                ]}
              >
                <Feather name="bar-chart-2" size={13} color="#38BDF8" />
                <Text style={[styles.heroBadgeText, { color: '#38BDF8' }]}>
                  {periodMode === 'year'
                    ? `TỔNG KẾT NĂM ${selectedYear}`
                    : `TỔNG KẾT THÁNG ${selectedMonth}/${selectedYear}`}
                </Text>
              </View>
              <View
                style={[
                  styles.heroStatusDot,
                  {
                    backgroundColor:
                      calculation.totalExpenseZ <= calculation.incomeX ? '#10B981' : '#EF4444',
                  },
                ]}
              />
            </View>

            <View style={styles.heroDailyAmountRow}>
              <Text style={styles.heroDailyAmount}>
                {formatCurrencyCompact(calculation.burnRatePerDay)}
              </Text>
              <Text style={styles.heroDailyUnit}>/ ngày (TB)</Text>
            </View>

            <Text style={styles.heroDailyNote}>
              {calculation.top3Expenses.length > 0 ? (
                <>
                  Chi tiêu trung bình{' '}
                  <Text style={styles.heroHighlightBold}>
                    {formatCurrencyCompact(calculation.burnRatePerDay)}/ngày
                  </Text>{' '}
                  (Tổng chi: {formatCurrencyCompact(calculation.totalExpenseZ)}). Khoản chi lớn nhất là{' '}
                  <Text style={styles.heroHighlightBold}>
                    {calculation.top3Expenses[0].description ||
                      calculation.top3Expenses[0].categoryName ||
                      calculation.top3Expenses[0].jarName ||
                      'Khoản chi'}{' '}
                    ({formatCurrencyCompact(calculation.top3Expenses[0].amount)})
                  </Text>
                  {calculation.peakSpendDay.date ? (
                    <>
                      , ngày chi nhiều nhất là{' '}
                      <Text style={styles.heroHighlightBold}>
                        {formatDateVN(calculation.peakSpendDay.date)}
                      </Text>{' '}
                      ({formatCurrencyCompact(calculation.peakSpendDay.amount)}).
                    </>
                  ) : (
                    '.'
                  )}
                </>
              ) : (
                'Không có dữ liệu giao dịch chi tiêu được ghi nhận trong kỳ này.'
              )}
            </Text>

            <View style={styles.heroFooterMetrics}>
              <View style={styles.heroFooterMetricItem}>
                <Text style={styles.heroFooterMetricLabel} numberOfLines={1}>
                  Tiêu nhiều nhất cho
                </Text>
                <Text
                  style={[styles.heroFooterMetricVal, { color: '#F87171' }]}
                  numberOfLines={1}
                >
                  {calculation.top3Expenses.length > 0
                    ? `${
                        calculation.top3Expenses[0].description ||
                        calculation.top3Expenses[0].categoryName ||
                        calculation.top3Expenses[0].jarName ||
                        'Khoản chi'
                      }`
                    : 'Không có'}
                </Text>
                {calculation.top3Expenses.length > 0 && (
                  <Text style={{ fontSize: 11, color: '#94A3B8', marginTop: 1 }}>
                    {formatCurrencyCompact(calculation.top3Expenses[0].amount)}
                  </Text>
                )}
              </View>
              <View style={styles.heroDividerVertical} />
              <View style={styles.heroFooterMetricItem}>
                <Text style={styles.heroFooterMetricLabel} numberOfLines={1}>
                  Ngày chi nhiều nhất
                </Text>
                <Text
                  style={[styles.heroFooterMetricVal, { color: '#FBBF24' }]}
                  numberOfLines={1}
                >
                  {calculation.peakSpendDay.date
                    ? formatDateVN(calculation.peakSpendDay.date)
                    : 'N/A'}
                </Text>
                {calculation.peakSpendDay.amount > 0 && (
                  <Text style={{ fontSize: 11, color: '#94A3B8', marginTop: 1 }}>
                    {formatCurrencyCompact(calculation.peakSpendDay.amount)}
                  </Text>
                )}
              </View>
            </View>
          </View>
        )}

        {/* ======================================================== */}
        {/* 2. 4 CHỈ SỐ TÀI CHÍNH CỐT LÕI (COMPACT MONEY) */}
        {/* ======================================================== */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Chỉ Số Tài Chính Kỳ Này</Text>
            <View
              style={[
                styles.statusPill,
                {
                  backgroundColor: calculation.isSavingsPreserved ? '#ECFDF5' : '#FEF2F2',
                },
              ]}
            >
              <Text
                style={[
                  styles.statusPillText,
                  { color: calculation.isSavingsPreserved ? '#059669' : '#DC2626' },
                ]}
              >
                {calculation.isSavingsPreserved ? 'An Toàn' : 'Cần Chú Ý'}
              </Text>
            </View>
          </View>

          {/* 4 STATS GRID */}
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Thu nhập (X)</Text>
              <Text style={[styles.statValue, { color: '#059669' }]}>
                {formatCurrencyCompact(calculation.incomeX)}
              </Text>
            </View>

            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Chi tiêu thực (Z)</Text>
              <Text style={[styles.statValue, { color: '#DC2626' }]}>
                {formatCurrencyCompact(calculation.totalExpenseZ)}
              </Text>
            </View>

            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Thặng dư tích lũy</Text>
              <Text style={[styles.statValue, { color: '#2563EB' }]}>
                {formatCurrencyCompact(calculation.netSavings)}
              </Text>
            </View>

            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Tỷ lệ tích lũy</Text>
              <Text style={[styles.statValue, { color: '#D97706' }]}>
                {calculation.savingsRate}%
              </Text>
            </View>
          </View>

          {/* EMERGENCY FUND BANNER */}
          <View style={styles.emergencyBanner}>
            <Ionicons name="shield-checkmark" size={18} color="#059669" />
            <Text style={styles.emergencyBannerText}>
              Quỹ an toàn: <Text style={{ fontWeight: '800' }}>{formatCurrencyCompact(calculation.safetyFundY)}</Text> (duy trì {calculation.emergencyFundMonths} tháng thiết yếu)
            </Text>
          </View>
        </View>

        

        {/* ======================================================== */}
        {/* 4. DỰ BÁO TIẾN ĐỘ MỤC TIÊU & CHỌN ĐỀ XUẤT ÁP DỤNG HŨ */}
        {/* ======================================================== */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.cardTitle}>Dự Báo Mục Tiêu</Text>
              <Text style={styles.cardHeaderSub}>Chạm để chọn & áp dụng tỷ lệ phân bổ hũ</Text>
            </View>
            <Text style={styles.targetBadge}>
              {calculation.targetGoalName}
            </Text>
          </View>

          {/* Goal Progress Bar */}
          <View style={styles.targetSummaryBox}>
            <View style={styles.targetRowBetween}>
              <Text style={styles.targetLabelSmall}>Tiến độ hoàn thành:</Text>
              <Text style={styles.targetValueHighlight}>
                {formatCurrencyCompact(calculation.currentGoalSavings)} / {formatCurrencyCompact(calculation.targetAmount)} ({calculation.targetProgressPct}%)
              </Text>
            </View>
            <View style={styles.targetProgressBarTrack}>
              <View
                style={[
                  styles.targetProgressBarFill,
                  { width: `${Math.min(100, calculation.targetProgressPct)}%` },
                ]}
              />
            </View>
            <Text style={styles.targetRemainingNote}>
              Còn thiếu: <Text style={{ fontWeight: '800', color: '#0F172A' }}>{formatCurrencyCompact(calculation.remainingToTarget)}</Text>
            </Text>
          </View>

          {/* 3 PRESET SCENARIOS CARDS: CHILL (5%), NORMAL (10%), HARD (20%) */}
          <View style={styles.scenariosGrid}>
            {/* 1. CHILL (5%) */}
            <TouchableOpacity
              style={[
                styles.scenarioCard,
                selectedPreset === 'chill' && styles.scenarioCardActive,
              ]}
              onPress={() => {
                setSelectedPreset('chill');
                setCustomPercent(5);
              }}
              activeOpacity={0.7}
            >
              <Text style={[styles.scenarioTitle, selectedPreset === 'chill' && { color: '#059669' }]}>
                1. CHILL
              </Text>
              <Text style={styles.scenarioDesc}>Tích lũy 5%</Text>
              <Text style={styles.scenarioSaving}>
                {formatCurrencyCompact(calculation.scenarioChill.monthlySaving)}/th
              </Text>
              <View style={[styles.scenarioTimeBadge, selectedPreset === 'chill' && { backgroundColor: '#D1FAE5' }]}>
                <Text style={[styles.scenarioMonths, selectedPreset === 'chill' && { color: '#047857', fontWeight: '800' }]}>
                  ⏱️ {calculation.scenarioChill.completionMonths > 0 ? `${calculation.scenarioChill.completionMonths} tháng` : '0 tháng'}
                </Text>
              </View>
            </TouchableOpacity>

            {/* 2. NORMAL (10%) */}
            <TouchableOpacity
              style={[
                styles.scenarioCard,
                selectedPreset === 'normal' && styles.scenarioCardActive,
              ]}
              onPress={() => {
                setSelectedPreset('normal');
                setCustomPercent(10);
              }}
              activeOpacity={0.7}
            >
              <View style={styles.recBadge}>
                <Text style={styles.recBadgeText}>CÂN BẰNG</Text>
              </View>
              <Text style={[styles.scenarioTitle, { color: '#2563EB' }]}>
                2. NORMAL
              </Text>
              <Text style={[styles.scenarioDesc, { color: '#3B82F6' }]}>Tích lũy 10%</Text>
              <Text style={[styles.scenarioSaving, { color: '#2563EB' }]}>
                {formatCurrencyCompact(calculation.scenarioNormal.monthlySaving)}/th
              </Text>
              <View style={[styles.scenarioTimeBadge, { backgroundColor: '#DBEAFE' }]}>
                <Text style={[styles.scenarioMonths, { fontWeight: '800', color: '#1D4ED8' }]}>
                  ⏱️ {calculation.scenarioNormal.completionMonths > 0 ? `${calculation.scenarioNormal.completionMonths} tháng` : '0 tháng'}
                </Text>
              </View>
            </TouchableOpacity>

            {/* 3. HARD (20%) */}
            <TouchableOpacity
              style={[
                styles.scenarioCard,
                selectedPreset === 'hard' && styles.scenarioCardActive,
              ]}
              onPress={() => {
                setSelectedPreset('hard');
                setCustomPercent(20);
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.recBadge, { backgroundColor: '#DC2626' }]}>
                <Text style={styles.recBadgeText}>TĂNG TỐC</Text>
              </View>
              <Text style={[styles.scenarioTitle, selectedPreset === 'hard' && { color: '#DC2626' }]}>
                3. HARD
              </Text>
              <Text style={styles.scenarioDesc}>Tích lũy 20%</Text>
              <Text style={styles.scenarioSaving}>
                {formatCurrencyCompact(calculation.scenarioHard.monthlySaving)}/th
              </Text>
              <View style={[styles.scenarioTimeBadge, selectedPreset === 'hard' && { backgroundColor: '#FEE2E2' }]}>
                <Text style={[styles.scenarioMonths, selectedPreset === 'hard' && { color: '#B91C1C', fontWeight: '800' }]}>
                  ⏱️ {calculation.scenarioHard.completionMonths > 0 ? `${calculation.scenarioHard.completionMonths} tháng` : '0 tháng'}
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* ======================================================== */}
          {/* HORIZONTAL VOLUME SLIDER (TÙY CHỈNH TỐC ĐỘ TÍCH LŨY) */}
          {/* ======================================================== */}
          <View style={styles.volumeSliderContainer}>
            <View style={styles.volumeHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="options-outline" size={16} color="#2563EB" />
                <Text style={styles.volumeTitle}>Tùy chỉnh tốc độ tích lũy</Text>
              </View>
              <View style={styles.volumeValueBadge}>
                <Text style={styles.volumeValueText}>{customPercent}% thu nhập</Text>
              </View>
            </View>

            {/* Interactive Volume Track with - / + Stepper */}
            <View style={styles.volumeBarRow}>
              <TouchableOpacity
                style={styles.volumeStepBtn}
                onPress={() => {
                  setSelectedPreset('custom');
                  setCustomPercent((prev) => Math.max(1, prev - 1));
                }}
                activeOpacity={0.7}
              >
                <Feather name="minus" size={16} color="#334155" />
              </TouchableOpacity>

              {/* Volume Track with Smooth Drag & Touch */}
              <View
                style={styles.volumeTrack}
                onLayout={(e) => {
                  const w = e.nativeEvent.layout.width;
                  trackWidthRef.current = w;
                }}
                {...panResponder.panHandlers}
              >
                <View
                  pointerEvents="none"
                  style={[
                    styles.volumeFillBar,
                    {
                      width: `${Math.min(100, Math.max(5, (customPercent / 50) * 100))}%`,
                      backgroundColor:
                        customPercent >= 25 ? '#DC2626' : customPercent >= 15 ? '#2563EB' : '#10B981',
                    },
                  ]}
                />
                <View
                  pointerEvents="none"
                  style={[
                    styles.volumeThumb,
                    {
                      left: `${Math.min(94, Math.max(0, ((customPercent - 1) / 49) * 94))}%`,
                    },
                  ]}
                />
              </View>

              <TouchableOpacity
                style={styles.volumeStepBtn}
                onPress={() => {
                  setSelectedPreset('custom');
                  setCustomPercent((prev) => Math.min(50, prev + 1));
                }}
                activeOpacity={0.7}
              >
                <Feather name="plus" size={16} color="#334155" />
              </TouchableOpacity>
            </View>

            {/* Quick Select Chips */}
            <View style={styles.volumeChipsRow}>
              
            </View>

            {/* Live Forecast Calculation Box for Custom Selection */}
            <View style={styles.volumePreviewBox}>
              <View style={styles.volumePreviewCol}>
                <Text style={styles.volumePreviewLabel}>Tích lũy mỗi tháng</Text>
                <Text style={styles.volumePreviewValue}>
                  {formatCurrencyCompact(calculation.customMonthlySaving)}
                </Text>
              </View>
              <View style={styles.volumePreviewDivider} />
              <View style={styles.volumePreviewCol}>
                <Text style={styles.volumePreviewLabel}>Dự kiến hoàn thành</Text>
                <Text style={[styles.volumePreviewValue, { color: '#2563EB' }]}>
                  {calculation.customCompletionMonths > 0
                    ? `${calculation.customCompletionMonths} tháng`
                    : '0 tháng'}
                </Text>
              </View>
            </View>
          </View>

          {/* ======================================================== */}
          {/* ACTION BUTTON TO APPLY CHOSEN SCENARIO RATIOS (PREMIUM / VIP PAYWALL) */}
          {/* ======================================================== */}
          {!isVip ? (
            <TouchableOpacity
              style={styles.applyScenarioBtnPro}
              onPress={() => setShowUpgradeModal(true)}
              activeOpacity={0.85}
            >
              <View style={styles.proBadgeRow}>
                <View style={styles.proCrownCircle}>
                  <Text style={{ fontSize: 13 }}>👑</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.proBtnTitle}>
                    Mở khóa VIP để áp dụng kịch bản ({customPercent}% tích lũy)
                  </Text>
                  <Text style={styles.proBtnSub}>
                    Nâng cấp gói để tự động đồng bộ tỷ lệ các hũ tài chính
                  </Text>
                </View>
                <Feather name="chevron-right" size={18} color="#D97706" />
              </View>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.applyScenarioBtn}
              onPress={() => handleApplyScenario(selectedPreset, customPercent)}
              disabled={isApplyingScenario}
              activeOpacity={0.8}
            >
              {isApplyingScenario ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  
                  <Text style={styles.applyScenarioBtnText}>
                    Áp dụng {selectedPreset === 'chill' ? 'Chill (5%)' : selectedPreset === 'normal' ? 'Normal (10%)' : selectedPreset === 'hard' ? 'Hard (20%)' : `Tùy Chỉnh (${customPercent}%)`}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* ======================================================== */}
        {/* 5. 3 HÀNH ĐỘNG AI KHUYẾN NGHỊ */}
        {/* ======================================================== */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Hành Động Trọng Tâm</Text>
          </View>

          <View style={{ gap: 10 }}>
            <View style={styles.recItem}>
              <View style={styles.recNumberCircle}>
                <Text style={styles.recNumberText}>1</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.recTitle}>Giữ trần chi tiêu mỗi ngày</Text>
                <Text style={styles.recDesc}>
                  Dưới <Text style={{ fontWeight: '800', color: '#2563EB' }}>{formatCurrencyCompact(calculation.safeDailySpendLimit)}/ngày</Text> để hoàn thành kế hoạch {periodMode === 'year' ? `năm ${selectedYear}` : 'tháng'}.
                </Text>
              </View>
            </View>

            <View style={styles.recItem}>
              <View style={styles.recNumberCircle}>
                <Text style={styles.recNumberText}>2</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.recTitle}>Tối ưu hóa chi phí ăn uống & cafe</Text>
                <Text style={styles.recDesc}>
                  Cắt giảm nhẹ ~15% chi phí dịch vụ để tăng thêm vào quỹ thặng dư.
                </Text>
              </View>
            </View>

            <View style={styles.recItem}>
              <View style={styles.recNumberCircle}>
                <Text style={styles.recNumberText}>3</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.recTitle}>Trích lập tích lũy ngay khi nhận lương</Text>
                <Text style={styles.recDesc}>
                  Ưu tiên gửi tiền vào hũ tiết kiệm trước khi phân bổ chi tiêu sinh hoạt.
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* ======================================================== */}
        {/* 6. NÚT XUẤT FILE BÁO CÁO PDF */}
        {/* ======================================================== */}
        <TouchableOpacity
          style={styles.mainExportBtn}
          onPress={handleExportPdf}
          disabled={isExportingPdf}
          activeOpacity={0.85}
        >
          {isExportingPdf ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Feather name="file-text" size={18} color="#FFFFFF" />
              <Text style={styles.mainExportBtnText}>Xuất Báo Cáo Tài Chính (PDF)</Text>
            </>
          )}
        </TouchableOpacity>

        {/* BOTTOM SPACER */}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* CUSTOM MONTH / YEAR PICKER MODAL */}
      <Modal
        visible={showPickerModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPickerModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <Feather name="calendar" size={16} color="#2563EB" />
                <Text style={styles.modalTitle}>Tùy Chọn Kỳ Báo Cáo</Text>
              </View>
              <TouchableOpacity onPress={() => setShowPickerModal(false)}>
                <Feather name="x" size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Mode Switch */}
            <View style={styles.modeSwitchRow}>
              <TouchableOpacity
                style={[styles.modeSwitchBtn, tempMode === 'month' && styles.modeSwitchBtnActive]}
                onPress={() => setTempMode('month')}
              >
                <Feather name="calendar" size={13} color={tempMode === 'month' ? '#2563EB' : '#64748B'} />
                <Text
                  style={[
                    styles.modeSwitchBtnText,
                    tempMode === 'month' && styles.modeSwitchBtnTextActive,
                  ]}
                >
                  Theo Tháng
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modeSwitchBtn, tempMode === 'year' && styles.modeSwitchBtnActive]}
                onPress={() => setTempMode('year')}
              >
                <Feather name="clock" size={13} color={tempMode === 'year' ? '#2563EB' : '#64748B'} />
                <Text
                  style={[
                    styles.modeSwitchBtnText,
                    tempMode === 'year' && styles.modeSwitchBtnTextActive,
                  ]}
                >
                  Theo Cả Năm
                </Text>
              </TouchableOpacity>
            </View>

            {/* Year Input with Stepper */}
            <View style={styles.pickerFormGroup}>
              <Text style={styles.pickerLabel}>Năm:</Text>
              <View style={styles.stepperInputRow}>
                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() => {
                    const y = (parseInt(tempYearInput, 10) || currentYear) - 1;
                    setTempYearInput(y.toString());
                  }}
                >
                  <Feather name="minus" size={14} color="#0F172A" />
                </TouchableOpacity>

                <TextInput
                  style={styles.stepperTextInput}
                  value={tempYearInput}
                  onChangeText={setTempYearInput}
                  keyboardType="numeric"
                  placeholder="2026"
                />

                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() => {
                    const y = (parseInt(tempYearInput, 10) || currentYear) + 1;
                    setTempYearInput(y.toString());
                  }}
                >
                  <Feather name="plus" size={14} color="#0F172A" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Month Input & Quick 12-Month Selector */}
            {tempMode === 'month' && (
              <View style={styles.pickerFormGroup}>
                <View style={styles.monthLabelRow}>
                  <Text style={styles.pickerLabel}>Tháng:</Text>
                  <TextInput
                    style={styles.monthDirectInput}
                    value={tempMonthInput}
                    onChangeText={setTempMonthInput}
                    keyboardType="numeric"
                    placeholder="9"
                    maxLength={2}
                  />
                </View>

                {/* 12-Month Grid */}
                <View style={styles.monthGrid}>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => {
                    const isSelected = tempMonthInput === m.toString();
                    return (
                      <TouchableOpacity
                        key={m}
                        style={[styles.monthGridCell, isSelected && styles.monthGridCellActive]}
                        onPress={() => setTempMonthInput(m.toString())}
                      >
                        <Text
                          style={[
                            styles.monthGridCellText,
                            isSelected && styles.monthGridCellTextActive,
                          ]}
                        >
                          T{m}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Modal Actions */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowPickerModal(false)}
              >
                <Text style={styles.modalCancelBtnText}>Hủy</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={handleApplyCustomPeriod}
              >
                <Text style={styles.modalSubmitBtnText}>Áp Dụng</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* UPGRADE PRO MODAL */}
      <UpgradeProModal
        visible={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        onSuccess={() => {
          setShowUpgradeModal(false);
          showAlert('Nâng Cấp Thành Công', 'Tài khoản VIP Pro đã sẵn sàng!', 'success');
        }}
      />

      {/* CUSTOM ALERT MODAL */}
      <CustomAlertModal {...alertConfig} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 100,
    gap: 16,
  },

  // PERIOD SELECTOR
  periodBar: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  periodTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  screenHeading: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  activePeriodBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
  },
  activePeriodText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563EB',
  },
  customPeriodBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    alignSelf: 'stretch',
    borderRadius: 10,
    gap: 4,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  customPeriodBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
  },
  quickPresetRow: {
    flexDirection: 'row',
    gap: 8,
  },
  presetChip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  presetChipActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  presetChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  presetChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  // HERO DAILY SAFE SPEND CARD
  heroDailyCard: {
    backgroundColor: '#0F172A',
    borderRadius: 22,
    padding: 20,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 14,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  heroDailyTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(37, 99, 235, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.4)',
  },
  heroBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#60A5FA',
    letterSpacing: 0.5,
  },
  heroStatusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  heroDailyAmountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 6,
  },
  heroDailyAmount: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.8,
  },
  heroDailyUnit: {
    fontSize: 15,
    fontWeight: '700',
    color: '#94A3B8',
  },
  heroDailyNote: {
    fontSize: 13,
    color: '#94A3B8',
    lineHeight: 19,
    marginBottom: 16,
  },
  heroHighlightBold: {
    fontWeight: '800',
    color: '#F8FAFC',
  },
  heroFooterMetrics: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  heroFooterMetricItem: {
    flex: 1,
  },
  heroFooterMetricLabel: {
    fontSize: 11.5,
    color: '#94A3B8',
    fontWeight: '600',
    marginBottom: 3,
  },
  heroFooterMetricVal: {
    fontSize: 14,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  heroDividerVertical: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 12,
  },

  // CARDS BASE
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  cardHeaderSub: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '800',
  },

  // 4 STATS GRID
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 14,
  },
  statBox: {
    flexBasis: '47%',
    flexGrow: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  statLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 6,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },

  // EMERGENCY FUND BANNER
  emergencyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0FDF4',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  emergencyBannerText: {
    flex: 1,
    fontSize: 13,
    color: '#166534',
    fontWeight: '500',
  },

  // JARS PROGRESS
  jarLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  jarNameWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  jarDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  jarName: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  jarPercent: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  jarAmount: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#475569',
  },
  jarTrack: {
    height: 7,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    overflow: 'hidden',
  },
  jarBar: {
    height: '100%',
    borderRadius: 4,
  },

  // TARGET & SCENARIOS
  targetBadge: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#2563EB',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  targetSummaryBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  targetRowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  targetLabelSmall: {
    fontSize: 12.5,
    color: '#64748B',
    fontWeight: '600',
  },
  targetValueHighlight: {
    fontSize: 13,
    fontWeight: '800',
    color: '#2563EB',
  },
  targetProgressBarTrack: {
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  targetProgressBarFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 4,
  },
  targetRemainingNote: {
    fontSize: 12.5,
    color: '#64748B',
    marginTop: 2,
  },
  scenariosGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  scenarioCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scenarioCardActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#93C5FD',
  },
  recBadge: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 4,
  },
  recBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  scenarioTitle: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#64748B',
    marginBottom: 2,
  },
  scenarioDesc: {
    fontSize: 10.5,
    color: '#64748B',
    marginBottom: 6,
    textAlign: 'center',
    fontWeight: '500',
  },
  scenarioSaving: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
    textAlign: 'center',
  },
  scenarioTimeBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  scenarioMonths: {
    fontSize: 11.5,
    color: '#475569',
    fontWeight: '700',
    textAlign: 'center',
  },
  // VOLUME SLIDER STYLES
  volumeSliderContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  volumeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  volumeTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  volumeValueBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  volumeValueText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#2563EB',
  },
  volumeBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  volumeStepBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  volumeTrack: {
    flex: 1,
    height: 16,
    backgroundColor: '#E2E8F0',
    borderRadius: 8,
    position: 'relative',
    justifyContent: 'center',
  },
  volumeFillBar: {
    height: '100%',
    borderRadius: 8,
  },
  volumeThumb: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 3.5,
    borderColor: '#2563EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
    top: -4,
  },
  volumeChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'space-between',
  },
  volumeChip: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  volumeChipActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  volumeChipText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#475569',
  },
  volumeChipTextActive: {
    color: '#FFFFFF',
  },
  volumePreviewBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  volumePreviewCol: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  volumePreviewLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  volumePreviewValue: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  volumePreviewDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E2E8F0',
  },

  // APPLY BUTTON STYLES (VIP & STANDARD)
  applyScenarioBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginTop: 14,
    gap: 8,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  applyScenarioBtnText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  applyScenarioBtnPro: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1.5,
    borderColor: '#FCD34D',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginTop: 14,
  },
  proBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  proCrownCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  proBtnTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#92400E',
  },
  proBtnSub: {
    fontSize: 11,
    color: '#B45309',
    fontWeight: '500',
    marginTop: 1,
  },

  // AI RECOMMENDATIONS
  recItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  recNumberCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 1,
  },
  recNumberText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  recTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  recDesc: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
  },

  // MAIN PDF EXPORT BUTTON
  mainExportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2563EB',
    paddingVertical: 16,
    borderRadius: 18,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  mainExportBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },

  // MODAL STYLES
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  modeSwitchRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  modeSwitchBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    gap: 6,
  },
  modeSwitchBtnActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  modeSwitchBtnText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#64748B',
  },
  modeSwitchBtnTextActive: {
    color: '#2563EB',
    fontWeight: '800',
  },
  pickerFormGroup: {
    gap: 8,
    marginBottom: 16,
  },
  pickerLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  stepperInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepperBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  stepperTextInput: {
    flex: 1,
    height: 42,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
    backgroundColor: '#F8FAFC',
    color: '#0F172A',
  },
  monthLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  monthDirectInput: {
    width: 54,
    height: 32,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '800',
    backgroundColor: '#F8FAFC',
    color: '#2563EB',
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  monthGridCell: {
    width: '22.5%',
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthGridCellActive: {
    backgroundColor: '#2563EB',
  },
  monthGridCellText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  monthGridCellTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalCancelBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  modalCancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
  modalSubmitBtn: {
    flex: 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#2563EB',
  },
  modalSubmitBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
