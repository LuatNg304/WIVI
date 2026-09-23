import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFinancial, Jar, Transaction } from '../context/FinancialContext';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { CustomAlertModal } from '../components/CustomAlertModal';
import { AppHeader } from '../components/AppHeader';

interface JarsScreenProps {
  onNavigateToSettings?: () => void;
  onNavigateToHistory?: () => void;
  onNavigateToRecord?: () => void;
}

export const JarsScreen: React.FC<JarsScreenProps> = ({
  onNavigateToSettings,
  onNavigateToHistory,
  onNavigateToRecord,
}) => {
  const {
    jars,
    goals,
    transactions,
    monthlyIncomeGoal,
    initialBalance,
    updateJarRatios,
    transferBetweenJars,
    deleteJar,
    addJar,
    fundGoal,
    withdrawFromGoal,
    refreshAll,
  } = useFinancial();

  // Active Tab Filter: 'all' (Tất cả & Ngân sách), 'goals' (Mục tiêu), 'ratios' (Sửa tỷ lệ %)
  const [activeTab, setActiveTab] = useState<'all' | 'goals' | 'ratios'>('all');

  // Real-time backend budget metrics (matching Dashboard)
  const rawIncome = monthlyIncomeGoal || 10000000;
  const totalMonthlyBudget = rawIncome > 0 ? rawIncome : 10000000;

  // Construct combined list of ALL jars: Spend Jars + Hũ Tiết Kiệm (loại bỏ hoàn toàn hũ trùng tên)
  const allJars = useMemo<Jar[]>(() => {
    // 1. Lọc các hũ chi tiêu (spend) và loại bỏ các hũ trùng tên
    const uniqueSpendList: Jar[] = [];
    jars
      .filter((j) => j.type === 'spend')
      .forEach((j) => {
        const jName = (j.name || '').trim().toLowerCase();
        if (
          jName &&
          !uniqueSpendList.some((item) => (item.name || '').trim().toLowerCase() === jName)
        ) {
          uniqueSpendList.push(j);
        }
      });

    const spendSumPercent = uniqueSpendList.reduce(
      (sum, j) => sum + (Number(j.allocationPercent) || 0),
      0,
    );
    const remainingPercentForSaving = Math.max(0, 100 - spendSumPercent);

    // 2. Xây dựng danh sách hũ tiết kiệm (save) không trùng lặp
    let savingList: Jar[] = [];

    if (goals && goals.length > 0) {
      const uniqueGoals: any[] = [];
      goals.forEach((g) => {
        const gName = (g.name || 'Hũ Tiết Kiệm').trim().toLowerCase();
        if (
          !uniqueGoals.some((item) => (item.name || 'Hũ Tiết Kiệm').trim().toLowerCase() === gName)
        ) {
          uniqueGoals.push(g);
        }
      });

      savingList = uniqueGoals.map((g) => ({
        ...g,
        name: g.name ? g.name : 'Hũ Tiết Kiệm',
        type: 'save',
        allocationPercent:
          g.allocationPercent && g.allocationPercent > 0
            ? g.allocationPercent
            : remainingPercentForSaving > 0
            ? remainingPercentForSaving
            : 50,
        balance: 0,
        savedAmount: Number((g as any).savedAmount ?? g.balance ?? initialBalance ?? 0),
        targetAmount: Number((g as any).targetAmount ?? (g as any).target ?? 50000000),
        color: g.color || '#10B981',
      }));
    } else {
      const existingSave = jars.filter((j) => j.type === 'save');
      if (existingSave.length > 0) {
        const uniqueSave: Jar[] = [];
        existingSave.forEach((s) => {
          const sName = (s.name || 'Hũ Tiết Kiệm').trim().toLowerCase();
          if (
            !uniqueSave.some((item) => (item.name || 'Hũ Tiết Kiệm').trim().toLowerCase() === sName)
          ) {
            uniqueSave.push({
              ...s,
              name: s.name ? s.name : 'Hũ Tiết Kiệm',
              balance: 0,
              savedAmount: Number(s.savedAmount ?? s.balance ?? initialBalance ?? 0),
            });
          }
        });
        savingList = uniqueSave;
      } else {
        savingList = [
          {
            id: 'jar_initial_saving',
            name: 'Hũ Tiết Kiệm',
            type: 'save',
            allocationPercent:
              remainingPercentForSaving > 0 ? remainingPercentForSaving : 50,
            balance: 0,
            savedAmount: initialBalance || 0,
            targetAmount: 50000000,
            color: '#10B981',
          },
        ];
      }
    }

    // 3. Ghép và loại bỏ trùng lặp tuyệt đối trên toàn bộ danh sách Hũ
    const combined = [...uniqueSpendList, ...savingList];
    const finalUniqueJars: Jar[] = [];
    combined.forEach((j) => {
      const nameKey = (j.name || '').trim().toLowerCase();
      if (
        nameKey &&
        !finalUniqueJars.some((item) => (item.name || '').trim().toLowerCase() === nameKey)
      ) {
        finalUniqueJars.push(j);
      }
    });

    return finalUniqueJars;
  }, [jars, goals, initialBalance]);

  // Allocation Adjustment State (covers all jars: spend + save)
  const [editingRatios, setEditingRatios] = useState<{ [id: string]: number }>(
    allJars.reduce((acc, j) => ({ ...acc, [j.id]: j.allocationPercent || 0 }), {}),
  );
  const [isSavingRatios, setIsSavingRatios] = useState(false);

  // Synchronize editing ratios with all jars
  useEffect(() => {
    setEditingRatios(
      allJars.reduce((acc, j) => ({ ...acc, [j.id]: j.allocationPercent || 0 }), {}),
    );
  }, [allJars]);

  // Transfer Modal State
  const [transferModalVisible, setTransferModalVisible] = useState(false);
  const [transferFromJarId, setTransferFromJarId] = useState('');
  const [transferToJarId, setTransferToJarId] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferNote, setTransferNote] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);

  // Goal Action Modal State (Fund / Withdraw)
  const [goalActionModalVisible, setGoalActionModalVisible] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Jar | null>(null);
  const [goalActionType, setGoalActionType] = useState<'fund' | 'withdraw'>('fund');
  const [goalActionAmount, setGoalActionAmount] = useState('');
  const [goalActionJarId, setGoalActionJarId] = useState('');
  const [goalActionNote, setGoalActionNote] = useState('');
  const [isGoalActionSubmitting, setIsGoalActionSubmitting] = useState(false);

  // Detail Modal State
  const [selectedJarForDetail, setSelectedJarForDetail] = useState<Jar | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  // Add Jar Modal State
  const [addJarModalVisible, setAddJarModalVisible] = useState(false);
  const [newJarName, setNewJarName] = useState('');
  const [newJarPercent, setNewJarPercent] = useState<string>('10');
  const [newJarColor, setNewJarColor] = useState<string>('#2563EB');
  const [newJarType, setNewJarType] = useState<'spend' | 'save'>('spend');
  const [newGoalTarget, setNewGoalTarget] = useState<string>('5000000');
  const [isAddingJar, setIsAddingJar] = useState(false);

  // Pull to refresh state
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshAll();
    setRefreshing(false);
  };

  const totalSpentAcrossJars = useMemo(() => {
    return transactions
      .filter((t) => !t.isPending && t.type === 'expense' && !t.isTransfer)
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transactions]);

  const totalRemainingBudget = Math.max(0, totalMonthlyBudget - totalSpentAcrossJars);

  const spendJars = useMemo(() => allJars.filter((j) => j.type === 'spend'), [allJars]);
  const saveJars = useMemo(() => allJars.filter((j) => j.type === 'save'), [allJars]);

  const totalRatioSum = useMemo(() => {
    return Object.values(editingRatios).reduce((sum, v) => sum + v, 0);
  }, [editingRatios]);

  // Custom In-App Alert State
  const [appAlert, setAppAlert] = useState<{
    visible: boolean;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
    confirmText?: string;
    onConfirm?: () => void;
    cancelText?: string;
    onCancel?: () => void;
  }>({
    visible: false,
    type: 'success',
    title: '',
    message: '',
  });

  const showAppAlert = (
    title: string,
    message: string,
    type: 'success' | 'error' | 'warning' | 'info' = 'info',
    onConfirm?: () => void,
  ) => {
    setAppAlert({
      visible: true,
      type,
      title,
      message,
      confirmText: 'Đồng ý',
      onConfirm,
    });
  };

  const showAppConfirm = (
    title: string,
    message: string,
    onConfirm: () => void,
    confirmText = 'Xóa',
    cancelText = 'Hủy',
  ) => {
    setAppAlert({
      visible: true,
      type: 'warning',
      title,
      message,
      confirmText,
      cancelText,
      onConfirm,
    });
  };

  // Handlers for ratios
  const handleRatioChange = (jarId: string, delta: number) => {
    setEditingRatios((prev) => {
      const currentVal = prev[jarId] || 0;
      const newVal = Math.min(Math.max(0, currentVal + delta), 100);
      return {
        ...prev,
        [jarId]: newVal,
      };
    });
  };

  const handleSaveRatios = async () => {
    if (totalRatioSum !== 100) {
      showAppAlert(
        'Tỷ lệ chưa hợp lệ',
        `Tổng tỷ lệ phân bổ của tất cả các hũ (bao gồm hũ chi tiêu và hũ tiết kiệm) phải bằng chính xác 100%. Hiện tại là ${totalRatioSum}%.`,
        'warning',
      );
      return;
    }

    setIsSavingRatios(true);
    const formattedRatios = Object.entries(editingRatios).map(([id, percent]) => ({
      id,
      percent,
    }));
    const success = await updateJarRatios(formattedRatios);
    setIsSavingRatios(false);

    if (success) {
      setActiveTab('all');
      showAppAlert(
        'Cập Nhật Thành Công',
        'Đã lưu tỷ lệ phân bổ ngân sách mới cho toàn bộ các hũ tài chính.',
        'success',
      );
    } else {
      showAppAlert('Lỗi', 'Không thể lưu tỷ lệ lúc này. Vui lòng thử lại.', 'error');
    }
  };

  // Handle Jar Deletion
  const handleDeleteJar = (id: string, name: string) => {
    showAppConfirm(
      'Xóa Hũ Tài Chính',
      `Bạn có chắc chắn muốn xóa hũ "${name}"?`,
      () => deleteJar(id),
    );
  };

  // Handle Open Transfer Modal
  const handleOpenTransfer = (sourceJarId?: string) => {
    if (allJars.length < 2) {
      showAppAlert('Thông báo', 'Bạn cần có ít nhất 2 hũ tài chính để thực hiện chuyển quỹ.');
      return;
    }

    const defaultSource = sourceJarId || allJars[0]?.id || '';
    const defaultTarget = allJars.find((j) => j.id !== defaultSource)?.id || '';
    setTransferFromJarId(defaultSource);
    setTransferToJarId(defaultTarget);
    setTransferAmount('');
    setTransferNote('');
    setTransferModalVisible(true);
  };

  // Execute Transfer
  const handleConfirmTransfer = async () => {
    const numAmount = parseFloat(transferAmount.replace(/[^0-9]/g, '')) || 0;
    if (numAmount <= 0) {
      showAppAlert('Lỗi', 'Vui lòng nhập số tiền chuyển quỹ hợp lệ.', 'error');
      return;
    }

    if (!transferFromJarId || !transferToJarId || transferFromJarId === transferToJarId) {
      showAppAlert('Lỗi', 'Hũ nguồn và hũ đích phải khác nhau.', 'error');
      return;
    }

    setIsTransferring(true);
    const success = await transferBetweenJars(
      transferFromJarId,
      transferToJarId,
      numAmount,
      transferNote || 'Chuyển quỹ giữa các hũ tài chính',
    );
    setIsTransferring(false);

    if (success) {
      setTransferModalVisible(false);
      setTimeout(() => {
        showAppAlert(
          'Chuyển Quỹ Thành Công',
          `Đã chuyển ${numAmount.toLocaleString('vi-VN')} đ thành công giữa 2 hũ.`,
          'success',
        );
      }, 350);
    } else {
      showAppAlert('Thất bại', 'Giao dịch chuyển quỹ thất bại. Vui lòng thử lại.', 'error');
    }
  };

  // Handle Save New Jar
  const handleSaveNewJar = async () => {
    if (!newJarName.trim()) {
      showAppAlert('Lỗi', 'Vui lòng nhập tên hũ tài chính.', 'error');
      return;
    }

    const percentVal = parseFloat(newJarPercent) || 0;
    const targetVal = parseFloat(newGoalTarget.replace(/[^0-9]/g, '')) || 5000000;

    setIsAddingJar(true);
    const success = await addJar(
      newJarName.trim(),
      newJarType,
      percentVal,
      targetVal,
      newJarColor,
    );
    setIsAddingJar(false);

    if (success) {
      setNewJarName('');
      setNewJarPercent('10');
      setAddJarModalVisible(false);
      setTimeout(() => {
        showAppAlert(
          'Thành Công',
          `Đã tạo ${newJarType === 'spend' ? 'hũ chi tiêu' : 'hũ tiết kiệm'} "${newJarName}" thành công.`,
          'success',
        );
      }, 350);
    } else {
      showAppAlert('Lỗi', 'Không thể tạo hũ lúc này. Vui lòng thử lại.', 'error');
    }
  };

  // Handle Goal Action (Fund / Withdraw)
  const handleOpenGoalAction = (goal: Jar, type: 'fund' | 'withdraw') => {
    setSelectedGoal(goal);
    setGoalActionType(type);
    setGoalActionAmount('');
    setGoalActionJarId(spendJars[0]?.id || allJars[0]?.id || '');
    setGoalActionNote('');
    setGoalActionModalVisible(true);
  };

  const handleConfirmGoalAction = async () => {
    if (!selectedGoal) return;
    const numAmount = parseFloat(goalActionAmount.replace(/[^0-9]/g, '')) || 0;
    if (numAmount <= 0) {
      showAppAlert('Lỗi', 'Vui lòng nhập số tiền hợp lệ.', 'error');
      return;
    }

    if (!goalActionJarId) {
      showAppAlert('Lỗi', 'Vui lòng chọn hũ liên kết.', 'error');
      return;
    }

    setIsGoalActionSubmitting(true);
    let success = false;
    if (goalActionType === 'fund') {
      success = await fundGoal(
        selectedGoal.id,
        goalActionJarId,
        numAmount,
        goalActionNote || `Nạp tiền vào mục tiêu ${selectedGoal.name}`,
      );
    } else {
      success = await withdrawFromGoal(
        selectedGoal.id,
        goalActionJarId,
        numAmount,
        goalActionNote || `Rút tiền từ mục tiêu ${selectedGoal.name}`,
      );
    }
    setIsGoalActionSubmitting(false);

    if (success) {
      setGoalActionModalVisible(false);
      setTimeout(() => {
        showAppAlert(
          'Thành Công',
          `${goalActionType === 'fund' ? 'Nạp tiền vào' : 'Rút tiền từ'} mục tiêu "${selectedGoal.name}" thành công!`,
          'success',
        );
      }, 350);
    } else {
      showAppAlert('Lỗi', 'Thao tác không thành công. Vui lòng thử lại.', 'error');
    }
  };

  const curatedColors = [
    '#2563EB', // Blue
    '#10B981', // Emerald
    '#F59E0B', // Amber
    '#EF4444', // Rose
    '#8B5CF6', // Purple
    '#06B6D4', // Cyan
    '#EC4899', // Pink
    '#475569', // Slate
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* 1. TOP UNIFIED HEADER */}
      <AppHeader
        onNavigateToSettings={onNavigateToSettings}
        onNavigateToHistory={onNavigateToHistory}
        onNavigateToRecord={onNavigateToRecord}
        rightAction={
          <TouchableOpacity style={styles.refreshButton} onPress={onRefresh} activeOpacity={0.7}>
            <Feather name="refresh-cw" size={16} color="#475569" />
          </TouchableOpacity>
        }
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563EB" />
        }
      >
        

        {/* TOOLBAR & SEGMENTED TABS */}
        <View style={styles.segmentedControl}>
          <TouchableOpacity
            style={[styles.segmentBtn, activeTab === 'all' && styles.segmentBtnActive]}
            onPress={() => setActiveTab('all')}
            activeOpacity={0.8}
          >
            <Feather
              name="grid"
              size={14}
              color={activeTab === 'all' ? '#0F172A' : '#64748B'}
            />
            <Text
              style={[
                styles.segmentBtnText,
                activeTab === 'all' && styles.segmentBtnTextActive,
              ]}
            >
              Tất Cả Các Hũ 
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentBtn, activeTab === 'goals' && styles.segmentBtnActive]}
            onPress={() => setActiveTab('goals')}
            activeOpacity={0.8}
          >
            <Feather
              name="target"
              size={14}
              color={activeTab === 'goals' ? '#0F172A' : '#64748B'}
            />
            <Text
              style={[
                styles.segmentBtnText,
                activeTab === 'goals' && styles.segmentBtnTextActive,
              ]}
            >
              Mục Tiêu 
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentBtn, activeTab === 'ratios' && styles.segmentBtnActive]}
            onPress={() => setActiveTab('ratios')}
            activeOpacity={0.8}
          >
            <Feather
              name="sliders"
              size={14}
              color={activeTab === 'ratios' ? '#0F172A' : '#64748B'}
            />
            <Text
              style={[
                styles.segmentBtnText,
                activeTab === 'ratios' && styles.segmentBtnTextActive,
              ]}
            >
              Sửa Tỷ Lệ %
            </Text>
          </TouchableOpacity>
        </View>

        {/* QUICK ACTIONS ROW */}
        <View style={styles.actionsBar}>
          <TouchableOpacity
            style={styles.primaryActionBtn}
            onPress={() => handleOpenTransfer()}
            activeOpacity={0.7}
          >
            <Feather name="repeat" size={14} color="#FFFFFF" />
            <Text style={styles.primaryActionBtnText}>Chuyển Quỹ Giữa Hũ</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryActionBtn}
            onPress={() => setAddJarModalVisible(true)}
            activeOpacity={0.7}
          >
            <Feather name="plus" size={14} color="#0F172A" />
            <Text style={styles.secondaryActionBtnText}>Thêm Hũ Mới</Text>
          </TouchableOpacity>
        </View>

        {/* TAB 1: ALL JARS (ALL JARS STRUCTURED UNIFORMLY) */}
        {activeTab === 'all' && (
          <View style={styles.jarsListContainer}>
            {allJars.map((jar) => {
              const isSavingJar = jar.type === 'save';

              // Base allocated budget for this jar in the current month (e.g. 5.000.000 đ)
              const baseAllocated = Math.round(
                totalMonthlyBudget * ((jar.allocationPercent || 0) / 100),
              );
              const allocatedBudget = Math.max(0, baseAllocated + (Number(jar.balance) || 0));

              // Real-time calculation from transactions (expenses or transfers out)
              const jarSpent = transactions
                .filter(
                  (t) =>
                    !t.isPending &&
                    (t.type === 'expense' || t.isTransfer) &&
                    (t.jarId === jar.id || (t as any).fromJarId === jar.id),
                )
                .reduce((sum, t) => sum + t.amount, 0);

              // Remaining available balance in the jar (e.g. 5.000.000 đ at start)
              const jarRemaining = Math.max(0, allocatedBudget - jarSpent);

              const percentUsed = allocatedBudget > 0
                ? Math.round((jarSpent / allocatedBudget) * 100)
                : 0;

              const statusColor =
                percentUsed >= 90
                  ? '#EF4444'
                  : percentUsed >= 75
                  ? '#F59E0B'
                  : '#10B981';

              return (
                <View
                  key={jar.id}
                  style={[
                    styles.jarCard,
                    isSavingJar && styles.savingJarCardHighlight,
                  ]}
                >
                  {/* Card Top Row */}
                  <View style={styles.jarCardHeader}>
                    <View style={styles.jarCardHeaderLeft}>
                      <View
                        style={[
                          styles.jarColorBadge,
                          { backgroundColor: jar.color || (isSavingJar ? '#10B981' : '#2563EB') },
                        ]}
                      >
                        <Feather
                          name={isSavingJar ? 'shield' : 'folder'}
                          size={14}
                          color="#FFFFFF"
                        />
                      </View>
                      <View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={styles.jarNameText}>{jar.name}</Text>
                          <View
                            style={[
                              styles.jarTypeBadge,
                              {
                                backgroundColor: isSavingJar ? '#ECFDF5' : '#EFF6FF',
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.jarTypeBadgeText,
                                { color: isSavingJar ? '#059669' : '#2563EB' },
                              ]}
                            >
                              {isSavingJar ? 'Hũ Tiết Kiệm' : ''}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.jarSubtext}>
                          Hạn mức: {allocatedBudget.toLocaleString('vi-VN')} đ
                        </Text>
                      </View>
                    </View>

                    <View style={styles.jarCardHeaderRight}>
                      <View style={styles.allocationBadge}>
                        <Text style={styles.allocationBadgeText}>
                          {jar.allocationPercent || 0}%
                        </Text>
                      </View>
                      {spendJars.length > 1 && !isSavingJar && (
                        <TouchableOpacity
                          style={styles.deleteJarBtn}
                          onPress={() => handleDeleteJar(jar.id, jar.name)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Feather name="trash-2" size={15} color="#94A3B8" />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>

                  {/* Progress Bar (Exact same format for all jars) */}
                  <View style={styles.jarProgressSection}>
                    <View style={styles.jarProgressBarBg}>
                      <View
                        style={[
                          styles.jarProgressBarFill,
                          {
                            width: `${Math.min(percentUsed, 100)}%`,
                            backgroundColor: jar.color || (isSavingJar ? '#10B981' : '#2563EB'),
                          },
                        ]}
                      />
                    </View>
                    <View style={styles.jarProgressLabels}>
                      <Text style={styles.jarProgressSpent}>
                        {isSavingJar ? 'Đã trích / chuyển:' : 'Đã chi:'}{' '}
                        <Text style={{ fontWeight: '600', color: '#0F172A' }}>
                          {jarSpent.toLocaleString('vi-VN')} đ
                        </Text>
                      </Text>
                      <Text style={[styles.jarProgressPercent, { color: isSavingJar ? '#10B981' : statusColor }]}>
                        {percentUsed}% đã dùng
                      </Text>
                    </View>
                  </View>

                  {/* Card Bottom Meta & Actions (Exact same format for all jars) */}
                  <View style={styles.jarCardFooter}>
                    <View style={styles.jarBalanceBlock}>
                      <Text style={styles.jarBalanceLabel}>Còn lại trong hũ</Text>
                      <Text style={styles.jarBalanceAmount}>
                        {jarRemaining.toLocaleString('vi-VN')}{' '}
                        <Text style={{ fontSize: 11, fontWeight: '500', color: '#64748B' }}>
                          đ
                        </Text>
                      </Text>
                    </View>

                    <View style={styles.jarActionButtons}>
                      

                      <TouchableOpacity
                        style={[styles.jarActionPill, styles.jarActionPillDetail]}
                        onPress={() => {
                          setSelectedJarForDetail(jar);
                          setDetailModalVisible(true);
                        }}
                        activeOpacity={0.7}
                      >
                        <Feather name="file-text" size={12} color="#475569" />
                        <Text style={[styles.jarActionPillText, { color: '#475569' }]}>
                          Chi tiết
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* TAB 2: SAVING GOALS VIEW */}
        {activeTab === 'goals' && (
          <View style={styles.jarsListContainer}>
            {saveJars.map((goal) => {
              const targetAmount =
                (goal as any).targetAmount || (goal as any).target || 50000000;
              const currentSaved = Number(
                (goal as any).savedAmount ?? goal.balance ?? initialBalance ?? 0,
              );
              const progressPercent =
                targetAmount > 0
                  ? Math.min(100, Math.round((currentSaved / targetAmount) * 100))
                  : 0;

              return (
                <View key={goal.id} style={styles.jarCard}>
                  <View style={styles.jarCardHeader}>
                    <View style={styles.jarCardHeaderLeft}>
                      <View
                        style={[
                          styles.jarColorBadge,
                          { backgroundColor: goal.color || '#10B981' },
                        ]}
                      >
                        <Feather name="award" size={14} color="#FFFFFF" />
                      </View>
                      <View>
                        <Text style={styles.jarNameText}>{goal.name}</Text>
                        <Text style={styles.jarSubtext}>Mục tiêu  & tiết kiệm</Text>
                      </View>
                    </View>
                  </View>

                  {/* Goal Balance Progress */}
                  <View style={styles.goalMetricArea}>
                    <View style={styles.goalCurrentRow}>
                      <Text style={styles.goalCurrentValue}>
                        {currentSaved.toLocaleString('vi-VN')}{' '}
                        <Text style={{ fontSize: 13, color: '#64748B' }}>đ</Text>
                      </Text>
                      <Text style={styles.goalTargetValue}>
                        / {targetAmount.toLocaleString('vi-VN')} đ
                      </Text>
                    </View>

                    <View style={styles.jarProgressBarBg}>
                      <View
                        style={[
                          styles.jarProgressBarFill,
                          {
                            width: `${progressPercent}%`,
                            backgroundColor: goal.color || '#10B981',
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.goalProgressSubtext}>
                      Tiến độ  :{' '}
                      <Text style={{ fontWeight: '700', color: '#10B981' }}>
                        {progressPercent}%
                      </Text>
                    </Text>
                  </View>

                  {/* Goal Actions */}
                  <View style={styles.jarCardFooter}>
                    <TouchableOpacity
                      style={[
                        styles.jarActionPill,
                        { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' },
                      ]}
                      onPress={() => handleOpenGoalAction(goal, 'fund')}
                      activeOpacity={0.7}
                    >
                      <Feather name="arrow-down-left" size={12} color="#059669" />
                      <Text style={[styles.jarActionPillText, { color: '#059669' }]}>Nạp thêm</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.jarActionPill, styles.jarActionPillDetail]}
                      onPress={() => handleOpenGoalAction(goal, 'withdraw')}
                      activeOpacity={0.7}
                    >
                      <Feather name="arrow-up-right" size={12} color="#475569" />
                      <Text style={[styles.jarActionPillText, { color: '#475569' }]}>Rút quỹ</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* TAB 3: RATIO REBALANCING MODE (INCLUDES BOTH SPEND & SAVE JARS) */}
        {activeTab === 'ratios' && (
          <View style={styles.ratioEditorCard}>
            <View style={styles.ratioHeader}>
              <Text style={styles.ratioTitle}>Cài Đặt Tỷ Lệ </Text>
              <Text style={styles.ratioSubtitle}>
                Bạn có thể tự do điều chỉnh tỷ lệ của từng hũ chi tiêu và Hũ Tiết Kiệm. Nếu tháng này quá kẹt tiền, bạn có thể hạ tỷ lệ Hũ Tiết Kiệm về 0% và phân bổ sang các hũ sinh hoạt thiết yếu.
              </Text>
            </View>

            {/* Stepper List for all jars */}
            <View style={styles.stepperContainer}>
              {allJars.map((jar) => {
                const currentPercent = editingRatios[jar.id] ?? jar.allocationPercent ?? 0;
                const estimatedAllocation = Math.round(
                  totalMonthlyBudget * (currentPercent / 100),
                );
                const isSaving = jar.type === 'save';

                return (
                  <View key={jar.id} style={styles.stepperRow}>
                    <View style={styles.stepperLeft}>
                      <View
                        style={[
                          styles.jarColorDot,
                          { backgroundColor: jar.color || (isSaving ? '#10B981' : '#2563EB') },
                        ]}
                      />
                      <View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Text style={styles.stepperJarName}>{jar.name}</Text>
                        </View>
                        <Text style={styles.stepperEstimated}>
                          ~ {estimatedAllocation.toLocaleString('vi-VN')} đ/tháng
                        </Text>
                      </View>
                    </View>

                    <View style={styles.stepperControls}>
                      <TouchableOpacity
                        style={styles.stepBtn}
                        onPress={() => handleRatioChange(jar.id, -1)}
                        activeOpacity={0.6}
                      >
                        <Feather name="minus" size={14} color="#0F172A" />
                      </TouchableOpacity>

                      <View
                        style={[
                          styles.stepperValueBox,
                          currentPercent === 0 && { backgroundColor: '#FEF2F2' },
                        ]}
                      >
                        <Text
                          style={[
                            styles.stepperValueText,
                            currentPercent === 0 && { color: '#EF4444' },
                          ]}
                        >
                          {currentPercent}%
                        </Text>
                      </View>

                      <TouchableOpacity
                        style={styles.stepBtn}
                        onPress={() => handleRatioChange(jar.id, 1)}
                        activeOpacity={0.6}
                      >
                        <Feather name="plus" size={14} color="#0F172A" />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Validation Banner */}
            <View
              style={[
                styles.ratioValidationBanner,
                totalRatioSum === 100
                  ? styles.ratioBannerValid
                  : styles.ratioBannerInvalid,
              ]}
            >
              <Feather
                name={totalRatioSum === 100 ? 'check-circle' : 'alert-circle'}
                size={16}
                color={totalRatioSum === 100 ? '#10B981' : '#EF4444'}
              />
              <Text
                style={[
                  styles.ratioValidationText,
                  { color: totalRatioSum === 100 ? '#065F46' : '#991B1B' },
                ]}
              >
                Tổng tỷ lệ các hũ:{' '}
                <Text style={{ fontWeight: '700' }}>{totalRatioSum}%</Text>{' '}
                {totalRatioSum === 100
                  ? '(Hợp lệ 100%)'
                  : totalRatioSum < 100
                  ? `(Còn thiếu ${100 - totalRatioSum}%)`
                  : `(Đang thừa ${totalRatioSum - 100}%)`}
              </Text>
            </View>

            {/* Save Buttons */}
            <View style={styles.ratioActionRow}>
              <TouchableOpacity
                style={styles.ratioCancelBtn}
                onPress={() => {
                  setEditingRatios(
                    allJars.reduce((acc, j) => ({ ...acc, [j.id]: j.allocationPercent || 0 }), {}),
                  );
                  setActiveTab('all');
                }}
              >
                <Text style={styles.ratioCancelBtnText}>Hủy Bỏ</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.ratioSaveBtn,
                  totalRatioSum !== 100 && styles.ratioSaveBtnDisabled,
                ]}
                onPress={handleSaveRatios}
                disabled={isSavingRatios || totalRatioSum !== 100}
                activeOpacity={0.8}
              >
                <Text style={styles.ratioSaveBtnText}>
                  {isSavingRatios ? 'Đang lưu...' : 'Lưu Tỷ Lệ Mới'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* BOTTOM SPACER */}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* TRANSFER MODAL */}
      <Modal
        visible={transferModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setTransferModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <View style={[styles.modalIconBg, { backgroundColor: '#EFF6FF' }]}>
                  <Feather name="repeat" size={16} color="#2563EB" />
                </View>
                <Text style={styles.modalTitle}>Chuyển Quỹ Giữa Các Hũ</Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setTransferModalVisible(false)}
              >
                <Feather name="x" size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              {/* Source Jar */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Từ Hũ Nguồn (Trích tiền):</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.jarPickerScroll}>
                  {allJars.map((j) => {
                    const isSelected = j.id === transferFromJarId;
                    return (
                      <TouchableOpacity
                        key={j.id}
                        style={[styles.jarPickerPill, isSelected && styles.jarPickerPillActive]}
                        onPress={() => setTransferFromJarId(j.id)}
                      >
                        <View style={[styles.pillDot, { backgroundColor: j.color || '#2563EB' }]} />
                        <Text
                          style={[styles.pillText, isSelected && styles.pillTextActive]}
                        >
                          {j.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Target Jar */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Đến Hũ Đích (Nhận tiền):</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.jarPickerScroll}>
                  {allJars
                    .filter((j) => j.id !== transferFromJarId)
                    .map((j) => {
                      const isSelected = j.id === transferToJarId;
                      return (
                        <TouchableOpacity
                          key={j.id}
                          style={[styles.jarPickerPill, isSelected && styles.jarPickerPillActive]}
                          onPress={() => setTransferToJarId(j.id)}
                        >
                          <View style={[styles.pillDot, { backgroundColor: j.color || '#2563EB' }]} />
                          <Text
                            style={[styles.pillText, isSelected && styles.pillTextActive]}
                          >
                            {j.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                </ScrollView>
              </View>

              {/* Amount */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Số Tiền Chuyển (VNĐ):</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Ví dụ: 500,000"
                  keyboardType="numeric"
                  value={transferAmount}
                  onChangeText={(val) => {
                    const clean = val.replace(/[^0-9]/g, '');
                    const formatted = clean ? parseInt(clean, 10).toLocaleString('vi-VN') : '';
                    setTransferAmount(formatted);
                  }}
                />
              </View>

              {/* Note */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Ghi Chú (Tùy chọn):</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Lý do chuyển quỹ..."
                  value={transferNote}
                  onChangeText={setTransferNote}
                />
              </View>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setTransferModalVisible(false)}
              >
                <Text style={styles.modalCancelBtnText}>Hủy</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={handleConfirmTransfer}
                disabled={isTransferring}
              >
                <Text style={styles.modalSubmitBtnText}>
                  {isTransferring ? 'Đang chuyển...' : 'Xác Nhận Chuyển'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ADD JAR MODAL */}
      <Modal
        visible={addJarModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAddJarModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <View style={[styles.modalIconBg, { backgroundColor: '#ECFDF5' }]}>
                  <Feather name="plus-circle" size={16} color="#10B981" />
                </View>
                <Text style={styles.modalTitle}>Thêm Hũ Tài Chính Mới</Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setAddJarModalVisible(false)}
              >
                <Feather name="x" size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              {/* Jar Type */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Loại Hũ:</Text>
                <View style={styles.typeSelectorRow}>
                  <TouchableOpacity
                    style={[styles.typeSelectBtn, newJarType === 'spend' && styles.typeSelectBtnActive]}
                    onPress={() => setNewJarType('spend')}
                  >
                    <Feather name="pie-chart" size={14} color={newJarType === 'spend' ? '#2563EB' : '#64748B'} />
                    <Text style={[styles.typeSelectBtnText, newJarType === 'spend' && styles.typeSelectBtnTextActive]}>
                      Hũ Chi Tiêu
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.typeSelectBtn, newJarType === 'save' && styles.typeSelectBtnActive]}
                    onPress={() => setNewJarType('save')}
                  >
                    <Feather name="shield" size={14} color={newJarType === 'save' ? '#10B981' : '#64748B'} />
                    <Text style={[styles.typeSelectBtnText, newJarType === 'save' && styles.typeSelectBtnTextActive]}>
                      Hũ Tiết Kiệm
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Jar Name */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Tên Hũ:</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Ví dụ: Du lịch, Học tập, Mua sắm..."
                  value={newJarName}
                  onChangeText={setNewJarName}
                />
              </View>

              {/* Percentage */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Tỷ Lệ Phân Bổ Ban Đầu (%):</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="10"
                  keyboardType="numeric"
                  value={newJarPercent}
                  onChangeText={setNewJarPercent}
                />
              </View>

              {/* Color */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Màu Đại Diện:</Text>
                <View style={styles.colorPaletteRow}>
                  {curatedColors.map((color) => {
                    const isSelected = color === newJarColor;
                    return (
                      <TouchableOpacity
                        key={color}
                        style={[styles.colorCircle, { backgroundColor: color }, isSelected && styles.colorCircleSelected]}
                        onPress={() => setNewJarColor(color)}
                      >
                        {isSelected && <Feather name="check" size={14} color="#FFFFFF" />}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setAddJarModalVisible(false)}
              >
                <Text style={styles.modalCancelBtnText}>Hủy</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={handleSaveNewJar}
                disabled={isAddingJar}
              >
                <Text style={styles.modalSubmitBtnText}>
                  {isAddingJar ? 'Đang tạo...' : 'Tạo Hũ'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* DETAIL MODAL */}
      <Modal
        visible={detailModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Chi Tiết Hũ: {selectedJarForDetail?.name}
              </Text>
              <TouchableOpacity onPress={() => setDetailModalVisible(false)}>
                <Feather name="x" size={18} color="#64748B" />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <Text style={styles.modalDesc}>
                Loại hũ: {selectedJarForDetail?.type === 'save' ? 'Hũ Tiết Kiệm' : 'Chi Tiêu Hàng Tháng'}
              </Text>
              <Text style={styles.modalDesc}>
                Tỷ lệ phân bổ: {selectedJarForDetail?.allocationPercent || 0}%
              </Text>
              <Text style={styles.modalDesc}>
                Hạn mức cấp tháng này: {Math.round(totalMonthlyBudget * ((selectedJarForDetail?.allocationPercent || 0) / 100)).toLocaleString('vi-VN')} đ
              </Text>
            </View>
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={() => setDetailModalVisible(false)}
              >
                <Text style={styles.modalSubmitBtnText}>Đóng</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* CUSTOM IN-APP ALERT MODAL */}
      <CustomAlertModal {...appAlert} onClose={() => setAppAlert((prev) => ({ ...prev, visible: false }))} />
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
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerLeft: {
    flex: 1,
  },
  screenTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  screenSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  refreshButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 16,
    gap: 14,
  },
  // SUMMARY CARD
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  summaryCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 4,
  },
  summaryAmount: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  summaryBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  summaryBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563EB',
  },
  summaryMetaRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
    justifyContent: 'space-between',
  },
  summaryMetaCol: {
    flex: 1,
  },
  summaryMetaLabel: {
    fontSize: 10,
    color: '#64748B',
    marginBottom: 2,
  },
  summaryMetaVal: {
    fontSize: 13,
    fontWeight: '700',
  },
  // SEGMENTED CONTROL
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 12,
    padding: 3,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 9,
    gap: 5,
  },
  segmentBtnActive: {
    backgroundColor: '#FFFFFF',
  },
  segmentBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  segmentBtnTextActive: {
    color: '#0F172A',
    fontWeight: '700',
  },
  // QUICK ACTIONS BAR
  actionsBar: {
    flexDirection: 'row',
    gap: 10,
  },
  primaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  primaryActionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  secondaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  secondaryActionBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
  },
  // JARS LIST
  jarsListContainer: {
    gap: 12,
  },
  jarCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  savingJarCardHighlight: {
    borderColor: '#A7F3D0',
    backgroundColor: '#FAFDFB',
  },
  jarCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  jarCardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  jarColorBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  jarNameText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  jarTypeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  jarTypeBadgeText: {
    fontSize: 9,
    fontWeight: '700',
  },
  jarSubtext: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  jarCardHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  allocationBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  allocationBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  deleteJarBtn: {
    padding: 4,
  },
  jarProgressSection: {
    marginVertical: 6,
  },
  jarProgressBarBg: {
    height: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 3,
    overflow: 'hidden',
  },
  jarProgressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  jarProgressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  jarProgressSpent: {
    fontSize: 11,
    color: '#64748B',
  },
  jarProgressPercent: {
    fontSize: 11,
    fontWeight: '700',
  },
  jarCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
    paddingTop: 10,
    marginTop: 6,
  },
  jarBalanceBlock: {},
  jarBalanceLabel: {
    fontSize: 10,
    color: '#64748B',
  },
  jarBalanceAmount: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  jarActionButtons: {
    flexDirection: 'row',
    gap: 6,
  },
  jarActionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  jarActionPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2563EB',
  },
  jarActionPillDetail: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  // GOAL CARD METRICS
  goalMetricArea: {
    marginVertical: 8,
  },
  goalCurrentRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 6,
  },
  goalCurrentValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  goalTargetValue: {
    fontSize: 12,
    color: '#64748B',
    marginLeft: 6,
  },
  goalProgressSubtext: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
  },
  // RATIO REBALANCING CARD
  ratioEditorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  ratioHeader: {
    marginBottom: 14,
  },
  ratioTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  ratioSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 3,
    lineHeight: 16,
  },
  stepperContainer: {
    gap: 10,
    marginBottom: 14,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  stepperLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  jarColorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  stepperJarName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  stepperEstimated: {
    fontSize: 11,
    color: '#64748B',
  },
  stepperControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValueBox: {
    minWidth: 42,
    paddingVertical: 4,
    paddingHorizontal: 6,
    backgroundColor: '#EFF6FF',
    borderRadius: 6,
    alignItems: 'center',
  },
  stepperValueText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
  },
  ratioValidationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    gap: 8,
    marginBottom: 14,
  },
  ratioBannerValid: {
    backgroundColor: '#ECFDF5',
  },
  ratioBannerInvalid: {
    backgroundColor: '#FEF2F2',
  },
  ratioValidationText: {
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
  },
  ratioActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  ratioCancelBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  ratioCancelBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  ratioSaveBtn: {
    flex: 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#2563EB',
  },
  ratioSaveBtnDisabled: {
    backgroundColor: '#94A3B8',
  },
  ratioSaveBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // MODALS
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalIconBg: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalBody: {
    gap: 12,
    marginBottom: 16,
  },
  modalDesc: {
    fontSize: 12,
    color: '#475569',
    marginBottom: 4,
  },
  formGroup: {
    gap: 6,
  },
  formLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
  },
  jarPickerScroll: {
    flexDirection: 'row',
  },
  jarPickerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    marginRight: 6,
    gap: 5,
  },
  jarPickerPillActive: {
    backgroundColor: '#2563EB',
  },
  pillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  pillText: {
    fontSize: 11,
    color: '#475569',
  },
  pillTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  textInput: {
    height: 40,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 13,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
  },
  typeSelectorRow: {
    flexDirection: 'row',
    gap: 8,
  },
  typeSelectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    gap: 6,
  },
  typeSelectBtnActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  typeSelectBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  typeSelectBtnTextActive: {
    color: '#2563EB',
    fontWeight: '700',
  },
  colorPaletteRow: {
    flexDirection: 'row',
    gap: 8,
  },
  colorCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorCircleSelected: {
    borderWidth: 2,
    borderColor: '#0F172A',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 10,
  },
  modalCancelBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  modalCancelBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  modalSubmitBtn: {
    flex: 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#2563EB',
  },
  modalSubmitBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
