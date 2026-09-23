import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useFinancial, Jar, Transaction } from '../context/FinancialContext';
import { useAuth } from '../context/AuthContext';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { AiChatAssistantModal } from '../components/AiChatAssistantModal';
import { LinkBankModal } from '../components/LinkBankModal';
import { UpgradeProModal } from '../components/UpgradeProModal';
import { AvatarDropdownModal } from '../components/AvatarDropdownModal';
import { AppHeader } from '../components/AppHeader';

const { width } = Dimensions.get('window');

interface HomeScreenProps {
  onNavigateToSettings?: () => void;
  onNavigateToHistory?: () => void;
  onNavigateToRecord?: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onNavigateToSettings,
  onNavigateToHistory,
  onNavigateToRecord,
}) => {
  const { user } = useAuth();
  const {
    balances,
    userName,
    initialBalance,
    jars,
    goals,
    transactions,
    alerts,
    markAlertAsRead,
    clearAlerts,
    fundGoal,
    withdrawFromGoal,
    monthlyIncomeGoal,
    updateJarRatios,
    updateCurrentBalance,
    isVip,
  } = useFinancial();

  // Modals state
  const [avatarDropdownVisible, setAvatarDropdownVisible] = useState(false);
  const [alertsModalVisible, setAlertsModalVisible] = useState(false);
  const [fundModalVisible, setFundModalVisible] = useState(false);
  const [selectedGoalForFunding, setSelectedGoalForFunding] = useState<Jar | null>(null);
  const [fundAmount, setFundAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [selectedSourceJarId, setSelectedSourceJarId] = useState('');
  const [selectedTargetJarId, setSelectedTargetJarId] = useState('');
  const [goalActionTab, setGoalActionTab] = useState<'fund' | 'withdraw'>('fund');

  // Edit Balance state
  const [editBalanceModalVisible, setEditBalanceModalVisible] = useState(false);
  const [editCashInput, setEditCashInput] = useState('');
  const [editBankInput, setEditBankInput] = useState('');
  const [isSavingBalance, setIsSavingBalance] = useState(false);

  const handleOpenEditBalance = () => {
    setEditCashInput(balances.cash > 0 ? String(balances.cash) : '');
    setEditBankInput(balances.bank > 0 ? String(balances.bank) : '');
    setEditBalanceModalVisible(true);
  };

  const handleSaveCurrentBalance = async () => {
    const cashVal = parseFloat(editCashInput.replace(/[^0-9]/g, '')) || 0;
    const bankVal = parseFloat(editBankInput.replace(/[^0-9]/g, '')) || 0;
    setIsSavingBalance(true);
    const success = await updateCurrentBalance(cashVal, bankVal);
    setIsSavingBalance(false);
    if (success) {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.alert) {
        window.alert('Thành công 🎉\n\nĐã cập nhật số dư hiện tại của bạn.');
      } else {
        Alert.alert('Thành công 🎉', 'Đã cập nhật số dư hiện tại của bạn.');
      }
      setEditBalanceModalVisible(false);
    } else {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.alert) {
        window.alert('Lỗi\n\nKhông thể cập nhật số dư lúc này. Vui lòng thử lại.');
      } else {
        Alert.alert('Lỗi', 'Không thể cập nhật số dư lúc này. Vui lòng thử lại.');
      }
    }
  };

  // AI & Extra modals
  const [aiChatVisible, setAiChatVisible] = useState(false);
  const [linkBankVisible, setLinkBankVisible] = useState(false);
  const [upgradeModalVisible, setUpgradeModalVisible] = useState(false);
  const [rebalanceModalVisible, setRebalanceModalVisible] = useState(false);
  const [proposedRatios, setProposedRatios] = useState<{ id: string; name: string; currentPercent: number; newPercent: number; delta: number; color: string }[]>([]);
  const [aiAnalysisMessage, setAiAnalysisMessage] = useState('');
  const [isRebalancing, setIsRebalancing] = useState(false);

  // Real-time backend data bindings
  const totalBalance = (balances.cash || 0) + (balances.bank || 0);
  const rawIncome = monthlyIncomeGoal || 10000000;
  
  const thisMonthExpenses = transactions
    .filter((t) => !t.isPending && t.type === 'expense' && !t.isTransfer)
    .reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = thisMonthExpenses;

  // Total budget for this month
  const totalMonthlyBudget = rawIncome > 0 ? rawIncome : 7500000;
  const expenseIncomePercent = totalMonthlyBudget > 0 ? Math.round((totalExpense / totalMonthlyBudget) * 100) : 0;
  const remainingBudget = Math.max(0, totalMonthlyBudget - totalExpense);

  // Active goal info from BE (Bắt đầu từ số tiền người dùng hiện có Y = 5.000.000đ và cộng dồn)
  const effectiveInitial = (initialBalance > 0 ? initialBalance : totalBalance) || 5000000;
  const activeGoal = goals[0] || jars.find((j) => j.type === 'save') || null;
  const goalTargetVal = (activeGoal as any)?.targetAmount || (activeGoal as any)?.target || 10000000;
  const backendGoalSaved = Number((activeGoal as any)?.savedAmount ?? activeGoal?.balance ?? 0);
  const goalSavedVal = backendGoalSaved > 0 ? backendGoalSaved : effectiveInitial;
  const goalProgressPercent = goalTargetVal > 0 ? Math.min(100, Math.round((goalSavedVal / goalTargetVal) * 100)) : 0;
  
  const rawGoalName = activeGoal?.name?.replace(/^Mục tiêu:\s*/i, '')?.replace(/^Hũ Tiết kiệm:\s*/i, '')?.replace(/^[^\s]+\s/, '') || activeGoal?.name || 'Mua nhà';
  const goalDisplayName = rawGoalName.charAt(0).toUpperCase() + rawGoalName.slice(1);

  // User name and greeting
  const rawName = (user as any)?.first_name || user?.full_name || userName || 'Chien';
  const fullName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
  const firstName = fullName.trim().split(' ').pop() || 'Chien';

  const getGreetingText = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Chào buổi sáng';
    if (hour >= 12 && hour < 18) return 'Chào buổi chiều';
    return 'Chào buổi tối';
  };

  // Count unread alerts
  const unreadAlertsCount = alerts.filter((a) => !a.read).length;

  // Handle funding & withdrawal
  const handleConfirmFunding = async () => {
    if (!selectedGoalForFunding) return;
    const amountVal = parseFloat(fundAmount.replace(/[^0-9]/g, '')) || 0;
    if (amountVal <= 0) {
      Alert.alert('Lỗi', 'Vui lòng nhập số tiền nộp hợp lệ.');
      return;
    }
    if (!selectedSourceJarId) {
      Alert.alert('Lỗi', 'Vui lòng chọn hũ trích tiền.');
      return;
    }

    const success = await fundGoal(selectedGoalForFunding.id, selectedSourceJarId, amountVal);
    if (success) {
      setFundModalVisible(false);
      setFundAmount('');
    }
  };

  const handleConfirmWithdrawal = async () => {
    if (!selectedGoalForFunding) return;
    const amountVal = parseFloat(withdrawAmount.replace(/[^0-9]/g, '')) || 0;
    if (amountVal <= 0) {
      Alert.alert('Lỗi', 'Vui lòng nhập số tiền rút hợp lệ.');
      return;
    }
    if (!selectedTargetJarId) {
      Alert.alert('Lỗi', 'Vui lòng chọn hũ nhận tiền.');
      return;
    }

    const success = await withdrawFromGoal(selectedGoalForFunding.id, selectedTargetJarId, amountVal);
    if (success) {
      setFundModalVisible(false);
      setWithdrawAmount('');
    }
  };

  const handleOpenFundModal = (goal: any) => {
    if (!goal) return;
    setSelectedGoalForFunding(goal);
    setFundAmount('');
    setWithdrawAmount('');
    setGoalActionTab('fund');
    const spendJars = jars.filter((j) => j.type === 'spend');
    if (spendJars.length > 0) {
      setSelectedSourceJarId(spendJars[0].id);
      setSelectedTargetJarId(spendJars[0].id);
    }
    setFundModalVisible(true);
  };

  // AI WIVI Rebalance Logic (Chuyển thặng dư từ hũ còn nhiều sang 1-2 hũ chi quá tay)
  const handleOpenAiRebalanceModal = () => {
    // Nếu chưa là VIP, mở thẳng modal nâng cấp VIP để che toàn bộ số liệu
    if (!isVip) {
      setUpgradeModalVisible(true);
      return;
    }

    const spendList = jars.filter((j) => j.type === 'spend');
    if (spendList.length === 0) {
      Alert.alert('Thông báo', 'Chưa có đủ danh sách hũ chi tiêu để WIVI gợi ý chia lại.');
      return;
    }

    // Sort jars by spending percentage (descending)
    const sorted = [...spendList].map((j) => {
      const allocatedBudget = Math.round(rawIncome * ((j.allocationPercent || 0) / 100)) || 1;
      const spentAmt = j.spent || 0;
      const spentPct = Math.round((spentAmt / allocatedBudget) * 100);
      return {
        ...j,
        allocatedBudget,
        spentAmt,
        spentPct,
      };
    }).sort((a, b) => b.spentPct - a.spentPct);

    // 1-2 hũ chi quá tay nhất
    const overspentCount = sorted.length >= 4 ? 2 : 1;
    const overspentJars = sorted.slice(0, overspentCount);
    // 1-2 hũ còn nhiều ngân sách nhất (chi ít nhất)
    const donorJars = sorted.slice(-overspentCount).reverse();

    const overspentIds = new Set(overspentJars.map((j) => j.id));
    const donorIds = new Set(donorJars.map((j) => j.id));

    // Tính toán tỷ lệ chuyển giao
    let totalShift = 0;
    const donorShiftMap = new Map<string, number>();
    donorJars.forEach((d) => {
      const maxDeduct = Math.max(0, (d.allocationPercent || 0) - 5);
      const shift = Math.min(5, Math.floor(maxDeduct / 2) || 4);
      donorShiftMap.set(d.id, shift);
      totalShift += shift;
    });

    const boostPerOverspent = Math.floor(totalShift / overspentJars.length);
    let remainder = totalShift % overspentJars.length;

    const rebalanced = spendList.map((j) => {
      let currentPct = j.allocationPercent || 0;
      let newPct = currentPct;
      let delta = 0;

      if (overspentIds.has(j.id)) {
        delta = boostPerOverspent + (remainder > 0 ? 1 : 0);
        remainder = Math.max(0, remainder - 1);
        newPct = Math.min(70, currentPct + delta);
      } else if (donorIds.has(j.id)) {
        delta = -(donorShiftMap.get(j.id) || 4);
        newPct = Math.max(5, currentPct + delta);
      }

      return {
        id: j.id,
        name: j.name,
        currentPercent: currentPct,
        newPercent: newPct,
        delta,
        color: j.color || '#2563EB',
      };
    });

    // Đảm bảo tổng tỷ lệ đúng 100%
    const totalNew = rebalanced.reduce((sum, r) => sum + r.newPercent, 0);
    if (totalNew !== 100 && rebalanced.length > 0) {
      const diff = 100 - totalNew;
      rebalanced[0].newPercent += diff;
      rebalanced[0].delta += diff;
    }

    // Tạo thông điệp phân tích chuyên sâu của AI WIVI
    const overspentNames = overspentJars.map((j) => `${j.name} (${j.spentPct}%)`).join(', ');
    const donorNames = donorJars.map((j) => j.name).join(', ');
    const analysisMsg = `🔍 Phát hiện: Hũ ${overspentNames} đang có tốc độ chi tiêu nhanh sắp chạm giới hạn.\n\n💡 WIVI AI đề xuất: Trích bớt ${totalShift}% từ các hũ còn dồi dào (${donorNames}) để trợ cấp sang hũ ${overspentJars.map((j) => j.name).join(', ')}, giúp bạn an tâm chi tiêu đến hết tháng.`;

    setAiAnalysisMessage(analysisMsg);
    setProposedRatios(rebalanced);
    setRebalanceModalVisible(true);
  };

  const handleApplyRebalance = async () => {
    // Yêu cầu mua gói Premium nếu chưa là VIP
    if (!isVip) {
      setRebalanceModalVisible(false);
      setTimeout(() => {
        setUpgradeModalVisible(true);
      }, 300);
      return;
    }

    setIsRebalancing(true);
    try {
      const formatted = proposedRatios.map((r) => ({
        id: r.id,
        percent: r.newPercent,
      }));
      const success = await updateJarRatios(formatted);
      if (success) {
        Alert.alert('Thành công 🎉', 'WIVI đã cân đối và cập nhật lại tỷ lệ ngân sách các hũ trong tháng này!');
        setRebalanceModalVisible(false);
      } else {
        Alert.alert('Lỗi', 'Không thể cập nhật tỷ lệ hũ lúc này.');
      }
    } catch (e) {
      Alert.alert('Lỗi', 'Đã xảy ra sự cố khi cập nhật.');
    } finally {
      setIsRebalancing(false);
    }
  };

  // Curated theme mapping for Jars matching the concept image
  const getJarMeta = (name: string, index: number) => {
    const lower = name.toLowerCase();
    if (lower.includes('tăng trưởng') || lower.includes('đầu tư')) {
      return {
        displayName: 'Tăng trưởng',
        icon: 'leaf' as const,
        color: '#10B981',
        iconColor: '#059669',
        bgColor: '#E8F8F0',
        badgeBg: '#E8F8F0',
        badgeText: '#059669',
      };
    }
    if (lower.includes('giải trí') || lower.includes('hưởng thụ')) {
      return {
        displayName: 'Giải trí',
        icon: 'game-controller' as const,
        color: '#8B5CF6',
        iconColor: '#7C3AED',
        bgColor: '#F3E8FF',
        badgeBg: '#F3E8FF',
        badgeText: '#7C3AED',
      };
    }
    if (lower.includes('học tập') || lower.includes('bản thân') || lower.includes('giáo dục')) {
      return {
        displayName: 'Học tập',
        icon: 'book' as const,
        color: '#F59E0B',
        iconColor: '#D97706',
        bgColor: '#FEF3C7',
        badgeBg: '#FEF3C7',
        badgeText: '#D97706',
      };
    }
    if (lower.includes('thiết yếu') || lower.includes('ăn uống') || lower.includes('sinh hoạt')) {
      return {
        displayName: 'Thiết yếu',
        icon: 'cart' as const,
        color: '#3B82F6',
        iconColor: '#2563EB',
        bgColor: '#E0F2FE',
        badgeBg: '#E0F2FE',
        badgeText: '#2563EB',
      };
    }
    if (lower.includes('di chuyển') || lower.includes('xe')) {
      return {
        displayName: 'Di chuyển',
        icon: 'car' as const,
        color: '#06B6D4',
        iconColor: '#0891B2',
        bgColor: '#CFFAFE',
        badgeBg: '#CFFAFE',
        badgeText: '#0891B2',
      };
    }

    const fallbacks = [
      { displayName: name, icon: 'leaf' as const, color: '#10B981', iconColor: '#059669', bgColor: '#E8F8F0', badgeBg: '#E8F8F0', badgeText: '#059669' },
      { displayName: name, icon: 'game-controller' as const, color: '#8B5CF6', iconColor: '#7C3AED', bgColor: '#F3E8FF', badgeBg: '#F3E8FF', badgeText: '#7C3AED' },
      { displayName: name, icon: 'book' as const, color: '#F59E0B', iconColor: '#D97706', bgColor: '#FEF3C7', badgeBg: '#FEF3C7', badgeText: '#D97706' },
      { displayName: name, icon: 'cart' as const, color: '#3B82F6', iconColor: '#2563EB', bgColor: '#E0F2FE', badgeBg: '#E0F2FE', badgeText: '#2563EB' },
    ];
    return fallbacks[index % fallbacks.length];
  };

  const spendJars = jars.filter((j) => j.type === 'spend');
  const uniqueSpendJars = spendJars.reduce((acc: Jar[], current) => {
    const exists = acc.find((item) => item.name.trim().toLowerCase() === current.name.trim().toLowerCase());
    if (!exists) acc.push(current);
    return acc;
  }, []);

  // Concept Sample jars if none exist
  const DEFAULT_SAMPLE_JARS = [
    { id: 'j1', name: 'Tăng trưởng', spent: 0, budget: 1500000, allocationPercent: 15 },
    { id: 'j2', name: 'Giải trí',    spent: 0, budget: 1200000, allocationPercent: 12 },
    { id: 'j3', name: 'Học tập',     spent: 0, budget: 1400000, allocationPercent: 14 },
    { id: 'j4', name: 'Thiết yếu',   spent: 0, budget: 2600000, allocationPercent: 26 },
  ];

  const budgetItemsList = uniqueSpendJars.length > 0
    ? uniqueSpendJars.map((j, idx) => {
        const baseAllocatedBudget = Math.round(rawIncome * ((j.allocationPercent || 0) / 100));
        const jarBal = Number(j.balance) || 0;
        const budgetAmt = Math.max(0, baseAllocatedBudget + jarBal);
        const spentAmt = j.spent || 0;
        const spentPct = budgetAmt > 0 ? Math.min(100, Math.round((spentAmt / budgetAmt) * 100)) : 0;
        const meta = getJarMeta(j.name, idx);
        return {
          id: j.id,
          name: meta.displayName,
          icon: meta.icon,
          color: meta.color,
          iconColor: meta.iconColor,
          bgColor: meta.bgColor,
          badgeBg: meta.badgeBg,
          badgeText: meta.badgeText,
          spent: spentAmt,
          budget: budgetAmt,
          spentPct,
        };
      })
    : DEFAULT_SAMPLE_JARS.map((s, idx) => {
        const meta = getJarMeta(s.name, idx);
        return {
          id: s.id,
          name: s.name,
          icon: meta.icon,
          color: meta.color,
          iconColor: meta.iconColor,
          bgColor: meta.bgColor,
          badgeBg: meta.badgeBg,
          badgeText: meta.badgeText,
          spent: s.spent,
          budget: s.budget,
          spentPct: Math.round((s.spent / s.budget) * 100),
        };
      });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* 1. TOP UNIFIED HEADER */}
      <AppHeader
        onNavigateToSettings={onNavigateToSettings}
        onNavigateToHistory={onNavigateToHistory}
        onNavigateToRecord={onNavigateToRecord}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 2. SỐ DƯ HIỆN TẠI (GRADIENT BLUE CARD) */}
        <TouchableOpacity
          activeOpacity={0.92}
          onPress={() => onNavigateToHistory?.()}
        >
          <LinearGradient
            colors={['#3B82F6', '#2563EB', '#1D4ED8']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.balanceCard}
          >
            {/* Background subtle curve glow */}
            <View style={styles.balanceHeaderRow}>
              <View style={styles.balanceHeaderLeft}>
                <Ionicons name="wallet-outline" size={20} color="#FFFFFF" />
                <Text style={styles.balanceLabel}>Số dư hiện tại</Text>
              </View>
              <TouchableOpacity
                style={styles.editBalancePillBtn}
                onPress={handleOpenEditBalance}
                activeOpacity={0.8}
              >
                <Feather name="edit-2" size={13} color="#FFFFFF" />
                <Text style={styles.editBalancePillText}>Cập nhật</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.balanceMainAmount}>
              {totalBalance.toLocaleString('vi-VN')} đ
            </Text>

            <View style={styles.balanceGrowthRow}>
              <View style={styles.growthBadge}>
                <Feather name="arrow-up" size={13} color="#4ADE80" />
                <Text style={styles.growthAmount}>+2.4%</Text>
              </View>
              <Text style={styles.growthSubtext}>so với tháng trước</Text>
            </View>

            {/* Thông báo liên kết tài khoản ngân hàng nếu chưa liên kết */}
            {balances.bank === 0 && (
              <TouchableOpacity
                style={styles.linkBankBanner}
                activeOpacity={0.85}
                onPress={() => setLinkBankVisible(true)}
              >
                <View style={styles.linkBankBannerLeft}>
                  <Ionicons name="card-outline" size={16} color="#FFFFFF" />
                  <Text style={styles.linkBankBannerText} numberOfLines={1}>
                    Liên kết tài khoản ngân hàng để sử dụng
                  </Text>
                </View>
                <View style={styles.linkBankActionBtn}>
                  <Text style={styles.linkBankActionText}>Liên kết</Text>
                  <Feather name="chevron-right" size={13} color="#2563EB" />
                </View>
              </TouchableOpacity>
            )}
          </LinearGradient>
        </TouchableOpacity>

        {/* 3. CHI TIÊU THÁNG NÀY (WHITE CARD WITH PROGRESS BAR) */}
        <View style={styles.spendingCard}>
          <View style={styles.spendingHeaderRow}>
            <View style={styles.spendingHeaderLeft}>
              <Ionicons name="pie-chart" size={18} color="#2563EB" />
              <Text style={styles.spendingCardTitle}>Chi tiêu tháng này</Text>
            </View>
            <View style={styles.spendingPctBadge}>
              <Text style={styles.spendingPctText}>{expenseIncomePercent}%</Text>
            </View>
          </View>

          <View style={styles.spendingAmountRow}>
            <Text style={styles.spendingMainAmount}>
              {totalExpense.toLocaleString('vi-VN')} đ
            </Text>
            <Text style={styles.spendingBudgetLimit}>
              / {totalMonthlyBudget.toLocaleString('vi-VN')} đ
            </Text>
          </View>

          {/* Progress Bar */}
          <View style={styles.spendingProgressTrack}>
            <View
              style={[
                styles.spendingProgressFill,
                { width: `${Math.min(100, Math.max(4, expenseIncomePercent))}%` as any },
              ]}
            />
          </View>

          {/* Remaining info */}
          <View style={styles.spendingFooterRow}>
            <Ionicons name="wallet-outline" size={15} color="#64748B" />
            <Text style={styles.spendingRemainingText}>
              Còn {remainingBudget.toLocaleString('vi-VN')} đ
            </Text>
          </View>
        </View>

        {/* 4. MỤC TIÊU CỦA BẠN */}
        <View style={styles.widgetCard}>
          <View style={styles.widgetHeaderRow}>
            <View style={styles.widgetHeaderLeft}>
              <Ionicons name="radio-button-on" size={18} color="#2563EB" />
              <Text style={styles.widgetTitle}>Mục tiêu của bạn</Text>
            </View>
            <TouchableOpacity
              onPress={() => onNavigateToRecord?.()}
              activeOpacity={0.7}
              style={styles.viewAllBtn}
            >
              <Text style={styles.viewAllText}>Xem tất cả</Text>
              <Feather name="chevron-right" size={14} color="#2563EB" />
            </TouchableOpacity>
          </View>

          {/* Goal item */}
          <TouchableOpacity
            style={styles.goalItemCard}
            activeOpacity={0.85}
            onPress={() => handleOpenFundModal(activeGoal)}
          >
            <View style={styles.goalIconBox}>
              <Ionicons name="home" size={20} color="#2563EB" />
            </View>
            <View style={styles.goalDetailsCol}>
              <Text style={styles.goalItemName}>{goalDisplayName}</Text>
              <Text style={styles.goalItemAmountRow}>
                <Text style={styles.goalItemSavedText}>{goalSavedVal.toLocaleString('vi-VN')} đ</Text>
                <Text style={styles.goalItemTargetText}> / {goalTargetVal.toLocaleString('vi-VN')} đ</Text>
              </Text>
              <View style={styles.goalProgressTrack}>
                <View
                  style={[
                    styles.goalProgressFill,
                    { width: `${Math.min(100, goalProgressPercent)}%` as any },
                  ]}
                />
              </View>
            </View>
            <View style={styles.goalPctBadge}>
              <Text style={styles.goalPctText}>{goalProgressPercent}%</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* 5. NGÂN SÁCH (BUDGET JARS LIST) */}
        <View style={styles.widgetCard}>
          <View style={styles.widgetHeaderRow}>
            <View style={styles.widgetHeaderLeft}>
              <Ionicons name="grid" size={18} color="#2563EB" />
              <Text style={styles.widgetTitle}>Ngân sách</Text>
            </View>
            <TouchableOpacity
              onPress={() => onNavigateToHistory?.()}
              activeOpacity={0.7}
              style={styles.viewAllBtn}
            >
              <Text style={styles.viewAllText}>Xem tất cả</Text>
              <Feather name="chevron-right" size={14} color="#2563EB" />
            </TouchableOpacity>
          </View>

          {/* Jars list */}
          <View style={styles.budgetListContainer}>
            {budgetItemsList.map((item) => (
              <View key={item.id} style={styles.budgetItemRow}>
                <View style={[styles.budgetIconBox, { backgroundColor: item.bgColor }]}>
                  <Ionicons name={item.icon as any} size={18} color={item.iconColor} />
                </View>
                <View style={styles.budgetDetailsCol}>
                  <View style={styles.budgetTitleRow}>
                    <Text style={styles.budgetName}>{item.name}</Text>
                    <Text style={styles.budgetAmountText}>
                      {item.spent.toLocaleString('vi-VN')} / {item.budget.toLocaleString('vi-VN')} đ
                    </Text>
                  </View>
                  <View style={styles.budgetProgressTrack}>
                    <View
                      style={[
                        styles.budgetProgressFill,
                        {
                          width: `${Math.min(100, item.spentPct)}%` as any,
                          backgroundColor: item.color,
                        },
                      ]}
                    />
                  </View>
                </View>
                <View style={[styles.budgetPctBadge, { backgroundColor: item.badgeBg }]}>
                  <Text style={[styles.budgetPctText, { color: item.badgeText }]}>
                    {item.spentPct}%
                  </Text>
                </View>
              </View>
            ))}
          </View>

          {/* WIVI AI REBALANCE BUTTON / BANNER */}
          <TouchableOpacity
            style={[
              styles.aiRebalanceCard,
              !isVip && { borderColor: '#FDE68A', backgroundColor: '#FFFDF5' },
              isVip && budgetItemsList.some((j) => j.spentPct >= 70) && styles.aiRebalanceCardWarning,
            ]}
            activeOpacity={0.88}
            onPress={handleOpenAiRebalanceModal}
          >
            <View style={styles.aiRebalanceLeft}>
              <View
                style={[
                  styles.aiSparkleCircle,
                  !isVip && { backgroundColor: '#FEF3C7' },
                  isVip && budgetItemsList.some((j) => j.spentPct >= 70) && { backgroundColor: '#FEF3C7' },
                ]}
              >
                <Ionicons
                  name={!isVip ? 'lock-closed' : (budgetItemsList.some((j) => j.spentPct >= 70) ? 'warning' : 'sparkles')}
                  size={16}
                  color={!isVip ? '#D97706' : (budgetItemsList.some((j) => j.spentPct >= 70) ? '#D97706' : '#2563EB')}
                />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.aiRebalanceTitle}>
                    {isVip
                      ? (budgetItemsList.some((j) => j.spentPct >= 70)
                          ? 'WIVI gợi ý: Hũ chi quá tay, chia lại ngay'
                          : 'WIVI AI gợi ý chia lại tỷ lệ hũ')
                      : 'WIVI AI: Đề xuất cân đối tỷ lệ hũ'}
                  </Text>
                  {!isVip && (
                    <View style={styles.vipTagSmall}>
                      <Text style={styles.vipTagSmallText}>VIP</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.aiRebalanceSub} numberOfLines={1}>
                  {!isVip
                    ? '🔒 Đã che mờ số liệu đề xuất. Nâng cấp VIP để mở khóa AI'
                    : 'Tự động cân đối lại tỷ lệ ngân sách trong tháng này'}
                </Text>
              </View>
            </View>
            <View
              style={[
                styles.aiRebalanceActionBtn,
                !isVip && { backgroundColor: '#D97706' },
                isVip && budgetItemsList.some((j) => j.spentPct >= 70) && { backgroundColor: '#D97706' },
              ]}
            >
              {!isVip && <Ionicons name="diamond" size={12} color="#FFFFFF" style={{ marginRight: 2 }} />}
              <Text style={styles.aiRebalanceActionText}>
                {!isVip ? 'Mở khóa VIP' : 'WIVI Gợi ý'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* MODALS */}

      {/* Fund / Withdraw Goal Modal */}
      <Modal visible={fundModalVisible} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {goalActionTab === 'fund' ? 'Nộp tiền vào Mục tiêu' : 'Rút tiền từ Mục tiêu'}
              </Text>
              <TouchableOpacity onPress={() => setFundModalVisible(false)} style={styles.closeBtn}>
                <Feather name="x" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {selectedGoalForFunding && (
              <View style={styles.selectedGoalCard}>
                <Text style={styles.selectedGoalTitle}>{selectedGoalForFunding.name}</Text>
                <Text style={styles.selectedGoalAmount}>
                  Đã tích lũy: {((selectedGoalForFunding as any).savedAmount || selectedGoalForFunding.balance || 0).toLocaleString('vi-VN')} đ
                </Text>
              </View>
            )}

            {/* Action Tabs: Fund vs Withdraw */}
            <View style={styles.actionTabRow}>
              <TouchableOpacity
                style={[styles.actionTabBtn, goalActionTab === 'fund' && styles.actionTabBtnActive]}
                onPress={() => setGoalActionTab('fund')}
              >
                <Text style={[styles.actionTabBtnText, goalActionTab === 'fund' && styles.actionTabBtnTextActive]}>
                  Nộp tiền
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionTabBtn, goalActionTab === 'withdraw' && styles.actionTabBtnActive]}
                onPress={() => setGoalActionTab('withdraw')}
              >
                <Text style={[styles.actionTabBtnText, goalActionTab === 'withdraw' && styles.actionTabBtnTextActive]}>
                  Rút tiền
                </Text>
              </TouchableOpacity>
            </View>

            {goalActionTab === 'fund' ? (
              <>
                <Text style={styles.inputLabel}>Số tiền nộp (VND)</Text>
                <TextInput
                  style={styles.inputField}
                  placeholder="Ví dụ: 500.000"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  value={fundAmount}
                  onChangeText={setFundAmount}
                />

                <Text style={styles.inputLabel}>Trích từ hũ tài chính:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {jars.filter((j) => j.type === 'spend').map((jar) => (
                      <TouchableOpacity
                        key={jar.id}
                        style={[
                          styles.jarSelectPill,
                          selectedSourceJarId === jar.id && styles.jarSelectPillActive,
                        ]}
                        onPress={() => setSelectedSourceJarId(jar.id)}
                      >
                        <Text
                          style={[
                            styles.jarSelectPillText,
                            selectedSourceJarId === jar.id && styles.jarSelectPillTextActive,
                          ]}
                        >
                          {jar.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>

                <TouchableOpacity style={styles.primaryModalBtn} onPress={handleConfirmFunding}>
                  <Text style={styles.primaryModalBtnText}>Xác nhận nộp tiền</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.inputLabel}>Số tiền rút (VND)</Text>
                <TextInput
                  style={styles.inputField}
                  placeholder="Ví dụ: 500.000"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  value={withdrawAmount}
                  onChangeText={setWithdrawAmount}
                />

                <Text style={styles.inputLabel}>Chuyển về hũ tài chính:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {jars.filter((j) => j.type === 'spend').map((jar) => (
                      <TouchableOpacity
                        key={jar.id}
                        style={[
                          styles.jarSelectPill,
                          selectedTargetJarId === jar.id && styles.jarSelectPillActive,
                        ]}
                        onPress={() => setSelectedTargetJarId(jar.id)}
                      >
                        <Text
                          style={[
                            styles.jarSelectPillText,
                            selectedTargetJarId === jar.id && styles.jarSelectPillTextActive,
                          ]}
                        >
                          {jar.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>

                <TouchableOpacity style={styles.primaryModalBtn} onPress={handleConfirmWithdrawal}>
                  <Text style={styles.primaryModalBtnText}>Xác nhận rút tiền</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* AI Assistant Chat Modal */}
      <AiChatAssistantModal
        visible={aiChatVisible}
        onClose={() => setAiChatVisible(false)}
      />

      {/* Link Bank Modal */}
      <LinkBankModal
        visible={linkBankVisible}
        onClose={() => setLinkBankVisible(false)}
      />

      {/* Upgrade Pro Modal */}
      <UpgradeProModal
        visible={upgradeModalVisible}
        onClose={() => setUpgradeModalVisible(false)}
      />

      {/* WIVI AI Rebalance Ratio Modal */}
      <Modal visible={rebalanceModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={styles.aiModalIconCircle}>
                  <Ionicons name="sparkles" size={16} color="#2563EB" />
                </View>
                <Text style={styles.modalTitle}>WIVI Đề Xuất Tỷ Lệ</Text>
              </View>
              <View style={styles.vipBadgePill}>
                <Ionicons name="diamond" size={11} color="#D97706" />
                <Text style={styles.vipBadgeText}>Premium</Text>
              </View>
              <TouchableOpacity onPress={() => setRebalanceModalVisible(false)} style={styles.closeBtn}>
                <Feather name="x" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {isVip ? (
              <>
                {/* AI Analysis Message Box */}
                <View style={styles.aiAnalysisBox}>
                  <Ionicons name="bulb-outline" size={18} color="#2563EB" style={{ marginTop: 2 }} />
                  <Text style={styles.aiAnalysisText}>
                    {aiAnalysisMessage || 'Dựa trên tiến độ chi tiêu thực tế, WIVI đề xuất cân đối lại tỷ lệ ngân sách các hũ trong tháng này để bạn không bị thâm hụt tài chính.'}
                  </Text>
                </View>

                <ScrollView style={{ maxHeight: 260, marginVertical: 10 }}>
                  {proposedRatios.map((item) => (
                    <View key={item.id} style={styles.rebalanceItemCard}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.rebalanceItemName}>{item.name}</Text>
                        <View style={styles.rebalanceRatioRow}>
                          <Text style={styles.rebalanceOldRatio}>Hiện tại: {item.currentPercent}%</Text>
                          <Feather name="arrow-right" size={13} color="#64748B" style={{ marginHorizontal: 6 }} />
                          <Text style={styles.rebalanceNewRatio}>Đề xuất: {item.newPercent}%</Text>
                        </View>
                      </View>
                      {item.delta !== 0 && (
                        <View
                          style={[
                            styles.rebalanceDeltaBadge,
                            item.delta > 0 ? styles.rebalanceDeltaPlus : styles.rebalanceDeltaMinus,
                          ]}
                        >
                          <Text
                            style={[
                              styles.rebalanceDeltaText,
                              { color: item.delta > 0 ? '#15803D' : '#D97706' },
                            ]}
                          >
                            {item.delta > 0 ? `+${item.delta}%` : `${item.delta}%`}
                          </Text>
                        </View>
                      )}
                    </View>
                  ))}
                </ScrollView>

                <TouchableOpacity
                  style={styles.primaryModalBtn}
                  onPress={handleApplyRebalance}
                  disabled={isRebalancing}
                  activeOpacity={0.85}
                >
                  <Text style={styles.primaryModalBtnText}>
                    {isRebalancing ? 'Đang cập nhật...' : '⚡ Áp dụng đề xuất WIVI'}
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              /* NON-VIP: ẨN MỤC ĐỀ XUẤT, CHỈ CHO NẠP VIP MỚI UNLOCK */
              <View style={styles.lockedVipContainer}>
                <View style={styles.lockedVipIconCircle}>
                  <Ionicons name="lock-closed" size={30} color="#D97706" />
                </View>
                
                <Text style={styles.lockedVipTitle}>Tính Năng WIVI AI (Gói VIP)</Text>
                <Text style={styles.lockedVipDesc}>
                  Mục đề xuất phân bổ ngân sách chi tiết đã bị ẩn. Vui lòng nâng cấp VIP để mở khóa số liệu tối ưu tự động từ AI.
                </Text>

                {/* Masked / Locked preview rows */}
                <View style={styles.lockedPreviewBox}>
                  <View style={styles.lockedPreviewRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.lockedPreviewName}>Hũ chi tiêu vượt mức</Text>
                      <Text style={styles.lockedPreviewRatio}>Hiện tại: **%  ➔  Đề xuất: **%</Text>
                    </View>
                    <View style={styles.lockedBadge}>
                      <Ionicons name="lock-closed" size={11} color="#D97706" />
                      <Text style={styles.lockedBadgeText}>VIP</Text>
                    </View>
                  </View>
                  <View style={styles.lockedPreviewDivider} />
                  <View style={styles.lockedPreviewRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.lockedPreviewName}>Hũ thặng dư bù đắp</Text>
                      <Text style={styles.lockedPreviewRatio}>Hiện tại: **%  ➔  Đề xuất: **%</Text>
                    </View>
                    <View style={styles.lockedBadge}>
                      <Ionicons name="lock-closed" size={11} color="#D97706" />
                      <Text style={styles.lockedBadgeText}>VIP</Text>
                    </View>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.premiumPaywallBtn}
                  onPress={handleApplyRebalance}
                  activeOpacity={0.85}
                >
                  <Ionicons name="diamond" size={18} color="#FFFFFF" />
                  <View style={{ alignItems: 'center' }}>
                    <Text style={styles.premiumPaywallBtnText}>
                      Nâng cấp VIP để mở khóa đề xuất
                    </Text>
                    <Text style={styles.premiumPaywallSubText}>
                      Tự động tính toán & áp dụng tỷ lệ tối ưu 1-chạm
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* MODAL CẬP NHẬT SỐ DƯ HIỆN TẠI (DASHBOARD) */}
      <Modal
        visible={editBalanceModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setEditBalanceModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <View style={styles.editBalanceCardModal}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={[styles.avatarCircle, { width: 36, height: 36, borderRadius: 18, backgroundColor: '#EFF6FF' }]}>
                  <Ionicons name="wallet" size={18} color="#2563EB" />
                </View>
                <Text style={styles.modalTitle}>Cập nhật số dư hiện tại</Text>
              </View>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setEditBalanceModalVisible(false)}
              >
                <Feather name="x" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.editBalanceSubtitle}>
              Nhập số tiền mặt và số dư tài khoản ngân hàng thực tế bạn đang sở hữu.
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Tiền mặt (VND)</Text>
              <TextInput
                style={styles.modalInput}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor="#CBD5E1"
                value={editCashInput ? parseFloat(editCashInput).toLocaleString('vi-VN') : ''}
                onChangeText={(t) => setEditCashInput(t.replace(/[^0-9]/g, ''))}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Tài khoản Ngân hàng (VND)</Text>
              <TextInput
                style={styles.modalInput}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor="#CBD5E1"
                value={editBankInput ? parseFloat(editBankInput).toLocaleString('vi-VN') : ''}
                onChangeText={(t) => setEditBankInput(t.replace(/[^0-9]/g, ''))}
              />
            </View>

            <View style={styles.totalPreviewRow}>
              <Text style={styles.totalPreviewLabel}>Tổng số dư:</Text>
              <Text style={styles.totalPreviewAmount}>
                {(
                  (parseFloat(editCashInput.replace(/[^0-9]/g, '')) || 0) +
                  (parseFloat(editBankInput.replace(/[^0-9]/g, '')) || 0)
                ).toLocaleString('vi-VN')} đ
              </Text>
            </View>

            <TouchableOpacity
              style={styles.saveBalanceBtn}
              onPress={handleSaveCurrentBalance}
              disabled={isSavingBalance}
              activeOpacity={0.85}
            >
              <Text style={styles.saveBalanceBtnText}>
                {isSavingBalance ? 'Đang lưu...' : 'Lưu số dư hiện tại'}
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* VIP UPGRADE MODAL */}
      <UpgradeProModal
        visible={upgradeModalVisible}
        onClose={() => setUpgradeModalVisible(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 14,
    backgroundColor: '#F8FAFC',
  },
  headerLeftWithAvatar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
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
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  headerLeftText: {
    justifyContent: 'center',
  },
  greetingSub: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  greetingName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
    marginTop: 1,
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
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 100,
    gap: 16,
  },

  // CARD 1: BALANCE CARD (ROYAL BLUE GRADIENT)
  balanceCard: {
    borderRadius: 22,
    padding: 22,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 6,
  },
  balanceHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  balanceHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  balanceLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.92)',
  },
  balanceMainAmount: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    marginBottom: 12,
  },
  balanceGrowthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  growthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  growthAmount: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#4ADE80',
  },
  growthSubtext: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  linkBankBanner: {
    marginTop: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.28)',
  },
  linkBankBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    flex: 1,
    marginRight: 8,
  },
  linkBankBannerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
  },
  linkBankActionBtn: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  linkBankActionText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#2563EB',
  },

  // CARD 2: MONTHLY SPENDING (WHITE CARD)
  spendingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  spendingHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  spendingHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  spendingCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  spendingPctBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
  },
  spendingPctText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
  },
  spendingAmountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  spendingMainAmount: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  spendingBudgetLimit: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#94A3B8',
    marginLeft: 4,
  },
  spendingProgressTrack: {
    height: 8,
    backgroundColor: '#EFF6FF',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 14,
  },
  spendingProgressFill: {
    height: '100%',
    backgroundColor: '#2563EB',
    borderRadius: 4,
  },
  spendingFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  spendingRemainingText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },

  // CARD 3 & 4: WIDGET COMMONS
  widgetCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  widgetHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  widgetHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  widgetTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563EB',
  },

  // GOAL ITEM CARD
  goalItemCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  goalIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  goalDetailsCol: {
    flex: 1,
  },
  goalItemName: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  goalItemAmountRow: {
    fontSize: 12.5,
    marginBottom: 8,
  },
  goalItemSavedText: {
    fontWeight: '700',
    color: '#2563EB',
  },
  goalItemTargetText: {
    color: '#64748B',
    fontWeight: '500',
  },
  goalProgressTrack: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  goalProgressFill: {
    height: '100%',
    backgroundColor: '#2563EB',
    borderRadius: 3,
  },
  goalPctBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 12,
  },
  goalPctText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
  },

  // BUDGET LIST ITEMS
  budgetListContainer: {
    gap: 16,
  },
  budgetItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  budgetIconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  budgetDetailsCol: {
    flex: 1,
  },
  budgetTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  budgetName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  budgetAmountText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  budgetProgressTrack: {
    height: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 3,
    overflow: 'hidden',
  },
  budgetProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  budgetPctBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 42,
    alignItems: 'center',
  },
  budgetPctText: {
    fontSize: 11.5,
    fontWeight: '700',
  },

  // MODAL STYLES
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    padding: 24,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  selectedGoalCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  selectedGoalTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  selectedGoalAmount: {
    fontSize: 13,
    color: '#10B981',
    fontWeight: '600',
    marginTop: 3,
  },
  actionTabRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  actionTabBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 9,
  },
  actionTabBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  actionTabBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  actionTabBtnTextActive: {
    color: '#2563EB',
    fontWeight: '700',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  inputField: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14.5,
    marginBottom: 14,
    color: '#0F172A',
  },
  jarSelectPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  jarSelectPillActive: {
    backgroundColor: '#DBEAFE',
    borderColor: '#2563EB',
  },
  jarSelectPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  jarSelectPillTextActive: {
    color: '#2563EB',
    fontWeight: '700',
  },
  primaryModalBtn: {
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryModalBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
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

  // AI REBALANCE CARD & MODAL STYLES
  aiRebalanceCard: {
    marginTop: 14,
    backgroundColor: '#EFF6FF',
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  aiRebalanceCardWarning: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  aiRebalanceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 8,
  },
  aiSparkleCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiRebalanceTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  aiRebalanceSub: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 1,
  },
  aiRebalanceActionBtn: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  aiRebalanceActionText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  aiModalIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rebalanceDesc: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 19,
    marginBottom: 8,
  },
  rebalanceItemCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  rebalanceItemName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  rebalanceRatioRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rebalanceOldRatio: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  rebalanceNewRatio: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#2563EB',
  },
  rebalanceDeltaBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  rebalanceDeltaPlus: {
    backgroundColor: '#DCFCE7',
  },
  rebalanceDeltaMinus: {
    backgroundColor: '#FEF3C7',
  },
  rebalanceDeltaText: {
    fontSize: 12,
    fontWeight: '800',
  },
  vipBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  vipBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D97706',
  },
  aiAnalysisBox: {
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  aiAnalysisText: {
    fontSize: 12.5,
    color: '#1E40AF',
    lineHeight: 18,
    flex: 1,
    fontWeight: '500',
  },
  premiumPaywallBtn: {
    backgroundColor: '#D97706',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
    shadowColor: '#D97706',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  premiumPaywallBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  premiumPaywallSubText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 2,
    fontWeight: '500',
  },
  lockedVipContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  lockedVipIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#FDE68A',
  },
  lockedVipTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  lockedVipDesc: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  lockedPreviewBox: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  lockedPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lockedPreviewName: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#334155',
  },
  lockedPreviewRatio: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  lockedPreviewDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 10,
  },
  lockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  lockedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D97706',
  },
  editBalancePillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
  editBalancePillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  editBalanceCardModal: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  editBalanceSubtitle: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 18,
  },
  totalPreviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    padding: 12,
    borderRadius: 12,
    marginBottom: 18,
  },
  totalPreviewLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  totalPreviewAmount: {
    fontSize: 15,
    fontWeight: '800',
    color: '#2563EB',
  },
  saveBalanceBtn: {
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  saveBalanceBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  modalInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#0F172A',
    fontWeight: '600',
  },
  vipTagSmall: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  vipTagSmallText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#D97706',
  },
});
