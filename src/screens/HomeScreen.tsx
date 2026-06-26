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
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFinancial, Jar, Transaction } from '../context/FinancialContext';
import { WaveChart } from '../components/WaveChart';
import { StripedJar } from '../components/StripedJar';
import { Feather, Ionicons } from '@expo/vector-icons';

interface HomeScreenProps {
  onNavigateToSettings?: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onNavigateToSettings }) => {
  const {
    balances,
    userName,
    jars,
    transactions,
    alerts,
    markAlertAsRead,
    addJar,
    fundGoal,
    withdrawFromGoal,
    recategorizeTransaction,
    monthlyIncomeGoal
  } = useFinancial();

  const [alertsModalVisible, setAlertsModalVisible] = useState(false);
  const [breakdownModalVisible, setBreakdownModalVisible] = useState(false);
  const [addGoalModalVisible, setAddGoalModalVisible] = useState(false);

  // Fund goal state
  const [fundModalVisible, setFundModalVisible] = useState(false);
  const [selectedGoalForFunding, setSelectedGoalForFunding] = useState<Jar | null>(null);
  const [fundAmount, setFundAmount] = useState('');
  const [selectedSourceJarId, setSelectedSourceJarId] = useState('');

  // Helper for default target date (6 months in the future)
  const getDefaultTargetDate = () => {
    const d = new Date();
    d.setMonth(d.getMonth() + 6);
    const dd = d.getDate().toString().padStart(2, '0');
    const mm = (d.getMonth() + 1).toString().padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };

  // Add goal form fields
  const [goalName, setGoalName] = useState('');
  const [goalTarget, setGoalTarget] = useState('');
  const [goalColor, setGoalColor] = useState('#3be2b0'); // Default green-cyan
  const [goalFrequency, setGoalFrequency] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [goalFrequencyAmount, setGoalFrequencyAmount] = useState('');
  const [goalTargetDate, setGoalTargetDate] = useState(getDefaultTargetDate());

  // Goal Details state
  const [goalActionTab, setGoalActionTab] = useState<'fund' | 'withdraw'>('fund');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [selectedTargetJarId, setSelectedTargetJarId] = useState('');

  // Reclassify state
  const [reclassifyModalVisible, setReclassifyModalVisible] = useState(false);
  const [selectedTxForReclassify, setSelectedTxForReclassify] = useState<Transaction | null>(null);

  const totalBalance = balances.cash + balances.bank;

  // Calculate actual spending progress
  // Expenses this month
  const thisMonthExpenses = transactions
    .filter(t => !t.isPending && t.type === 'expense' && !t.isTransfer && new Date(t.date).getMonth() === new Date().getMonth())
    .reduce((sum, t) => sum + t.amount, 0);

  // Calculate percentage of spending based on total money currently available (totalBalance)
  const spendingPercentage = totalBalance > 0
    ? Math.min(Math.round((thisMonthExpenses / totalBalance) * 100), 100)
    : 0;

  // Format date: "6, Tháng 10, 2026"
  const getFormattedDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1;
    const day = today.getDate();
    return `${day}, Tháng ${month}, ${year}`;
  };

  const handleAddGoal = () => {
    if (!goalName.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên mục tiêu.');
      return;
    }
    const targetVal = parseFloat(goalTarget.replace(/[^0-9]/g, '')) || 0;
    if (targetVal <= 0) {
      Alert.alert('Lỗi', 'Vui lòng nhập số tiền mục tiêu hợp lệ.');
      return;
    }

    const freqAmountVal = parseFloat(goalFrequencyAmount.replace(/[^0-9]/g, '')) || 0;
    if (freqAmountVal <= 0) {
      Alert.alert('Lỗi', 'Vui lòng nhập số tiền tiết kiệm mỗi chu kỳ hợp lệ.');
      return;
    }
    if (!goalTargetDate.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập ngày dự kiến hoàn thành mục tiêu.');
      return;
    }

    // Saving goals do not calculate percentages (set allocation to 0)
    addJar(goalName, 'save', 0, targetVal, goalColor, goalFrequency, freqAmountVal, goalTargetDate);
    setGoalName('');
    setGoalTarget('');
    setGoalFrequency('weekly');
    setGoalFrequencyAmount('');
    setGoalTargetDate(getDefaultTargetDate());
    setAddGoalModalVisible(false);
  };

  const handleOpenFundModal = (goal: Jar) => {
    setSelectedGoalForFunding(goal);
    setFundAmount('');
    setWithdrawAmount('');
    setGoalActionTab('fund');
    const spendJars = jars.filter(j => j.type === 'spend');
    if (spendJars.length > 0) {
      setSelectedSourceJarId(spendJars[0].id);
      setSelectedTargetJarId(spendJars[0].id);
    }
    setFundModalVisible(true);
  };

  const handleConfirmFunding = () => {
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

    const success = fundGoal(selectedGoalForFunding.id, selectedSourceJarId, amountVal);
    if (success) {
      setFundModalVisible(false);
      setFundAmount('');
    }
  };

  const handleConfirmWithdrawal = () => {
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

    const success = withdrawFromGoal(selectedGoalForFunding.id, selectedTargetJarId, amountVal);
    if (success) {
      setFundModalVisible(false);
      setWithdrawAmount('');
    }
  };

  const handleOpenReclassify = (tx: Transaction) => {
    setSelectedTxForReclassify(tx);
    setReclassifyModalVisible(true);
  };

  const handleConfirmReclassify = (jarId: string) => {
    if (selectedTxForReclassify) {
      recategorizeTransaction(selectedTxForReclassify.id, jarId);
      setReclassifyModalVisible(false);
      setSelectedTxForReclassify(null);
    }
  };

  // Get saving jars for Goal Progress
  const savingJars = jars.filter(j => j.type === 'save');

  // Count unread alerts
  const unreadAlertsCount = alerts.filter(a => !a.read).length;

  // Unclassified transactions
  const unclassifiedTxs = transactions.filter(t => !jars.some(j => j.id === t.jarId) || t.jarId === 'unknown');

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER ROW */}
      <View style={styles.header}>
        <View style={styles.datePill}>
          <Text style={styles.dateText}>{getFormattedDate()}</Text>
        </View>
        <View style={styles.headerRightActions}>
          <TouchableOpacity
            style={styles.bellBtn}
            onPress={() => setAlertsModalVisible(true)}
          >
            <Feather name="bell" size={20} color="#0F172A" />
            {unreadAlertsCount > 0 && (
              <View style={styles.bellBadge}>
                <Text style={styles.bellBadgeText}>{unreadAlertsCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.profileBtn}
            onPress={() => onNavigateToSettings?.()}
          >
            <Feather name="user" size={20} color="#0F172A" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* CARD 1: TOTAL BALANCE */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceHeader}>
            <View style={styles.balanceTitleRow}>
              <Feather name="database" size={16} color="#94A3B8" style={styles.dbIcon} />
              <Text style={styles.balanceTitle}>TOTAL BALANCE</Text>
            </View>
            <TouchableOpacity
              style={styles.arrowBtn}
              onPress={() => setBreakdownModalVisible(true)}
            >
              <Feather name="arrow-up-right" size={22} color="#ffffff" />
            </TouchableOpacity>
          </View>

          <Text style={styles.balanceValue}>
            {totalBalance.toLocaleString('vi-VN')} VND
          </Text>

          <Text style={styles.spendingFeedback}>
            Đã tiêu <Text style={{ fontWeight: '700', color: '#3B82F6' }}>{thisMonthExpenses.toLocaleString('vi-VN')} VND</Text> ({spendingPercentage}%)
          </Text>

          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${spendingPercentage}%` }]} />
          </View>
        </View>

        {/* CARD 2: FINANCIAL DISTRIBUTION */}
        <View style={styles.distributionCard}>
          <View style={styles.distribHeader}>
            <Text style={styles.distribTitle}>FINANCIAL DISTRIBUTION</Text>
            <TouchableOpacity style={styles.timeDropdown}>
              <Text style={styles.timeDropdownText}>Month</Text>
              <Feather name="calendar" size={13} color="#ffffff" style={styles.dropdownIcon} />
            </TouchableOpacity>
          </View>

          <WaveChart />
        </View>

        {/* UNCLASSIFIED TRANSACTIONS CARD */}
        {unclassifiedTxs.length > 0 && (
          <View style={styles.unclassifiedCard}>
            <View style={styles.unclassifiedHeader}>
              <View style={styles.unclassifiedHeaderLeft}>
                <Ionicons name="alert-circle" size={18} color="#FF9500" />
                <Text style={styles.unclassifiedTitle}>GIAO DỊCH CẦN PHÂN LOẠI</Text>
              </View>
              <View style={styles.unclassifiedBadge}>
                <Text style={styles.unclassifiedBadgeText}>{unclassifiedTxs.length}</Text>
              </View>
            </View>
            
            <View style={styles.unclassifiedList}>
              {unclassifiedTxs.slice(0, 3).map((tx) => (
                <TouchableOpacity
                  key={tx.id}
                  style={styles.unclassifiedItem}
                  activeOpacity={0.7}
                  onPress={() => handleOpenReclassify(tx)}
                >
                  <View style={styles.unclassifiedItemLeft}>
                    <Text style={styles.unclassifiedDesc} numberOfLines={1}>
                      {tx.description}
                    </Text>
                    <Text style={styles.unclassifiedDate}>
                      {(() => {
                        const d = new Date(tx.date);
                        return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
                      })()}
                    </Text>
                  </View>
                  <View style={styles.unclassifiedItemRight}>
                    <Text style={[
                      styles.unclassifiedAmount,
                      tx.type === 'income' ? styles.incomeText : styles.expenseText
                    ]}>
                      {tx.type === 'income' ? '+' : '-'}{tx.amount.toLocaleString('vi-VN')} đ
                    </Text>
                    <Feather name="edit-2" size={12} color="#FF9500" style={{ marginTop: 2 }} />
                  </View>
                </TouchableOpacity>
              ))}
              {unclassifiedTxs.length > 3 && (
                <Text style={styles.moreUnclassifiedText}>
                  và {unclassifiedTxs.length - 3} giao dịch khác...
                </Text>
              )}
            </View>
          </View>
        )}

        {/* CARD 3: GOAL PROGRESS */}
        <View style={styles.goalCard}>
          <View style={styles.goalHeader}>
            <Text style={styles.goalTitle}>GOAL PROGRESS</Text>
            <TouchableOpacity
              style={styles.addGoalBtn}
              onPress={() => setAddGoalModalVisible(true)}
            >
              <Feather name="plus" size={18} color="#1d1d1f" />
            </TouchableOpacity>
          </View>

          <View style={styles.goalContentRow}>
            {/* Left: Striped Jars */}
            <View style={styles.jarsRow}>
              {savingJars.slice(0, 3).map((jar) => {
                const completion = jar.targetAmount
                  ? (jar.balance / jar.targetAmount) * 100
                  : 0;
                return (
                  <TouchableOpacity
                    key={jar.id}
                    activeOpacity={0.8}
                    onPress={() => handleOpenFundModal(jar)}
                    style={styles.jarTouchWrapper}
                  >
                    <StripedJar
                      percentage={Math.min(completion, 100)}
                      color={jar.color}
                      label={jar.name}
                    />
                  </TouchableOpacity>
                );
              })}
              {savingJars.length === 0 && (
                <Text style={styles.noGoalsText}>Chưa có mục tiêu tiết kiệm.</Text>
              )}
            </View>

            {/* Right: Goal Legend List */}
            <View style={styles.legendContainer}>
              {savingJars.slice(0, 3).map((jar) => (
                <TouchableOpacity
                  key={jar.id}
                  style={styles.legendItem}
                  activeOpacity={0.7}
                  onPress={() => handleOpenFundModal(jar)}
                >
                  <View style={styles.legendInfo}>
                    <View style={[styles.legendDot, { backgroundColor: jar.color }]} />
                    <Text style={styles.legendName} numberOfLines={1}>
                      {jar.name}
                    </Text>
                  </View>
                  <Text style={styles.legendValue}>
                    {jar.balance.toLocaleString('vi-VN')} VND
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
        
        {/* Padding for floating tab bar */}
        <View style={{ height: 80 }} />
      </ScrollView>

      {/* MODAL 1: ALERTS / NOTIFICATIONS */}
      <Modal visible={alertsModalVisible} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Cảnh báo tài chính (AI)</Text>
              <TouchableOpacity onPress={() => setAlertsModalVisible(false)}>
                <Feather name="x" size={24} color="#1d1d1f" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.alertsList}>
              {alerts.length === 0 ? (
                <Text style={styles.emptyAlerts}>Không có thông báo mới.</Text>
              ) : (
                alerts.map((alert) => (
                  <TouchableOpacity
                    key={alert.id}
                    style={[
                      styles.alertItem,
                      alert.read ? styles.alertRead : styles.alertUnread
                    ]}
                    onPress={() => markAlertAsRead(alert.id)}
                  >
                    <View style={styles.alertIconRow}>
                      <Ionicons
                        name={
                          alert.type === 'danger'
                            ? 'alert-circle'
                            : alert.type === 'warning'
                            ? 'warning'
                            : 'information-circle'
                        }
                        size={20}
                        color={
                          alert.type === 'danger'
                            ? '#ff5c5c'
                            : alert.type === 'warning'
                            ? '#ffb83d'
                            : '#0066cc'
                        }
                      />
                      <Text style={styles.alertItemTitle}>{alert.title}</Text>
                    </View>
                    <Text style={styles.alertItemMessage}>{alert.message}</Text>
                    <Text style={styles.alertItemDate}>
                      {new Date(alert.date).toLocaleTimeString('vi-VN')} - {new Date(alert.date).toLocaleDateString('vi-VN')}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL 2: ASSET BREAKDOWN */}
      <Modal visible={breakdownModalVisible} animationType="fade" transparent>
        <View style={styles.popupBg}>
          <View style={styles.popupContent}>
            <Text style={styles.popupTitle}>Phân bổ tài sản hiện tại</Text>
            
            <View style={styles.breakdownRow}>
              <View style={styles.breakdownLabelBlock}>
                <Feather name="dollar-sign" size={18} color="#0066cc" />
                <Text style={styles.breakdownLabel}>Tiền mặt</Text>
              </View>
              <Text style={styles.breakdownValue}>
                {balances.cash.toLocaleString('vi-VN')} VND
              </Text>
            </View>

            <View style={styles.breakdownRow}>
              <View style={styles.breakdownLabelBlock}>
                <Feather name="credit-card" size={18} color="#2ecc71" />
                <Text style={styles.breakdownLabel}>Tài khoản Ngân hàng</Text>
              </View>
              <Text style={styles.breakdownValue}>
                {balances.bank.toLocaleString('vi-VN')} VND
              </Text>
            </View>

            <View style={[styles.breakdownRow, styles.breakdownTotal]}>
              <Text style={styles.breakdownTotalLabel}>Tổng tài sản</Text>
              <Text style={styles.breakdownTotalValue}>
                {totalBalance.toLocaleString('vi-VN')} VND
              </Text>
            </View>

            <TouchableOpacity
              style={styles.closePopupBtn}
              onPress={() => setBreakdownModalVisible(false)}
            >
              <Text style={styles.closePopupBtnText}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL 3: ADD GOAL / JAR */}
      <Modal visible={addGoalModalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View style={styles.modalBg}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Tạo mục tiêu tiết kiệm mới</Text>
                <TouchableOpacity onPress={() => setAddGoalModalVisible(false)}>
                  <Feather name="x" size={24} color="#1d1d1f" />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ padding: 4 }}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Tên mục tiêu (Ví dụ: Mua iPhone 18)</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Nhập tên hũ tiết kiệm"
                    value={goalName}
                    onChangeText={setGoalName}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Số tiền cần tiết kiệm (VND)</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Ví dụ: 30,000,000"
                    keyboardType="numeric"
                    value={goalTarget ? parseFloat(goalTarget).toLocaleString('vi-VN') : ''}
                    onChangeText={(text) => setGoalTarget(text.replace(/[^0-9]/g, ''))}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Tần suất gửi tiền vào hũ</Text>
                  <View style={styles.frequencyRow}>
                    {([
                      { value: 'daily', label: 'Hàng ngày' },
                      { value: 'weekly', label: 'Hàng tuần' },
                      { value: 'monthly', label: 'Hàng tháng' }
                    ] as const).map((item) => (
                      <TouchableOpacity
                        key={item.value}
                        style={[
                          styles.frequencyTab,
                          goalFrequency === item.value && styles.frequencyTabActive
                        ]}
                        onPress={() => setGoalFrequency(item.value)}
                      >
                        <Text style={[
                          styles.frequencyTabText,
                          goalFrequency === item.value && styles.frequencyTabTextActive
                        ]}>
                          {item.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Mức tiền tích lũy mỗi chu kỳ (VND)</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Ví dụ: 100,000"
                    keyboardType="numeric"
                    value={goalFrequencyAmount ? parseFloat(goalFrequencyAmount).toLocaleString('vi-VN') : ''}
                    onChangeText={(text) => setGoalFrequencyAmount(text.replace(/[^0-9]/g, ''))}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Ngày dự kiến hoàn thành (DD/MM/YYYY)</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Ví dụ: 25/12/2026"
                    value={goalTargetDate}
                    onChangeText={setGoalTargetDate}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Màu sắc đại diện</Text>
                  <View style={styles.colorsGrid}>
                    {['#3be2b0', '#ff5c5c', '#ffb83d', '#9b59b6', '#3498db', '#e74c3c'].map((c) => (
                      <TouchableOpacity
                        key={c}
                        style={[
                          styles.colorBox,
                          { backgroundColor: c },
                          goalColor === c && styles.selectedColorBox
                        ]}
                        onPress={() => setGoalColor(c)}
                      />
                    ))}
                  </View>
                </View>

                <TouchableOpacity style={styles.submitBtn} onPress={handleAddGoal}>
                  <Text style={styles.submitBtnText}>Tạo mục tiêu</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* MODAL 4: DETAIL & FUND / CONTRIBUTE GOAL */}
      <Modal visible={fundModalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View style={styles.modalBg}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Chi tiết & Quản lý Quỹ</Text>
                <TouchableOpacity onPress={() => setFundModalVisible(false)}>
                  <Feather name="x" size={24} color="#1d1d1f" />
                </TouchableOpacity>
              </View>

              {selectedGoalForFunding && (
                <ScrollView style={{ padding: 4 }} showsVerticalScrollIndicator={false}>
                  <View style={styles.goalInfoSummary}>
                    <View style={[styles.legendDot, { backgroundColor: selectedGoalForFunding.color }]} />
                    <Text style={styles.goalSummaryName}>{selectedGoalForFunding.name}</Text>
                  </View>
                  <Text style={styles.goalSummaryProgress}>
                    Đã đạt: {selectedGoalForFunding.balance.toLocaleString('vi-VN')} đ / {selectedGoalForFunding.targetAmount?.toLocaleString('vi-VN')} đ
                  </Text>

                  {/* Kế hoạch tích lũy chu kỳ & Hạn hoàn thành */}
                  <View style={styles.goalPlanCard}>
                    <Text style={styles.goalPlanTitle}>Kế hoạch tích lũy</Text>
                    {selectedGoalForFunding.frequency ? (
                      <Text style={styles.goalPlanDesc}>
                        Mục tiêu nộp{' '}
                        <Text style={{ fontWeight: '700', color: '#10B981' }}>
                          {selectedGoalForFunding.frequencyAmount?.toLocaleString('vi-VN')} đ
                        </Text>{' '}
                        {selectedGoalForFunding.frequency === 'daily'
                          ? 'hàng ngày'
                          : selectedGoalForFunding.frequency === 'weekly'
                          ? 'hàng tuần'
                          : 'hàng tháng'}
                      </Text>
                    ) : (
                      <Text style={styles.goalPlanDesc}>Chưa cài đặt kế hoạch chu kỳ</Text>
                    )}
                    {selectedGoalForFunding.targetDate && (
                      <Text style={[styles.goalPlanDesc, { marginTop: 4, fontSize: 13, color: '#64748B', fontWeight: '500' }]}>
                        Hạn hoàn thành: <Text style={{ fontWeight: '700', color: '#0F172A' }}>{selectedGoalForFunding.targetDate}</Text>
                      </Text>
                    )}
                  </View>

                  {/* Lịch sử tích lũy (Savings History) */}
                  <View style={styles.historySection}>
                    <Text style={styles.historySectionTitle}>Lịch sử tích lũy</Text>
                    {transactions.filter(t => t.jarId === selectedGoalForFunding.id && !t.isPending).length === 0 ? (
                      <View style={styles.emptyHistoryBox}>
                        <Feather name="clock" size={16} color="#94A3B8" />
                        <Text style={styles.emptyHistoryText}>Chưa có lịch sử tiết kiệm.</Text>
                      </View>
                    ) : (
                      <View style={styles.historyList}>
                        {transactions
                          .filter(t => t.jarId === selectedGoalForFunding.id && !t.isPending)
                          .map((tx) => (
                            <View key={tx.id} style={styles.historyItem}>
                              <View style={styles.historyItemLeft}>
                                <Text style={styles.historyTxDesc}>{tx.description}</Text>
                                <Text style={styles.historyTxDate}>
                                  {(() => {
                                    const d = new Date(tx.date);
                                    const dd = d.getDate().toString().padStart(2, '0');
                                    const mm = (d.getMonth() + 1).toString().padStart(2, '0');
                                    const yyyy = d.getFullYear();
                                    const hh = d.getHours().toString().padStart(2, '0');
                                    const min = d.getMinutes().toString().padStart(2, '0');
                                    return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
                                  })()}
                                </Text>
                              </View>
                              <Text style={[styles.historyTxAmount, tx.type === 'expense' && { color: '#EF4444' }]}>
                                {tx.type === 'expense' ? '-' : '+'}{tx.amount.toLocaleString('vi-VN')} đ
                              </Text>
                            </View>
                          ))}
                      </View>
                    )}
                  </View>

                  <View style={styles.fundingDivider} />

                  {/* Toggle Action Mode */}
                  <View style={styles.actionTabRow}>
                    <TouchableOpacity
                      style={[styles.actionTab, goalActionTab === 'fund' && styles.actionTabActive]}
                      onPress={() => setGoalActionTab('fund')}
                    >
                      <Feather name="arrow-down-left" size={14} color={goalActionTab === 'fund' ? '#3B82F6' : '#64748B'} />
                      <Text style={[styles.actionTabText, goalActionTab === 'fund' && styles.actionTabTextActive]}>
                        Nộp tiền vào Quỹ
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionTab, goalActionTab === 'withdraw' && styles.actionTabActive]}
                      onPress={() => setGoalActionTab('withdraw')}
                    >
                      <Feather name="arrow-up-right" size={14} color={goalActionTab === 'withdraw' ? '#EF4444' : '#64748B'} />
                      <Text style={[styles.actionTabText, goalActionTab === 'withdraw' && styles.actionTabTextActive]}>
                        Rút tiền ra hũ
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {goalActionTab === 'fund' ? (
                    <View>
                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Số tiền nộp thêm vào quỹ (VND)</Text>
                        <TextInput
                          style={styles.textInput}
                          placeholder="Ví dụ: 1,000,000"
                          keyboardType="numeric"
                          value={fundAmount ? parseFloat(fundAmount).toLocaleString('vi-VN') : ''}
                          onChangeText={(text) => setFundAmount(text.replace(/[^0-9]/g, ''))}
                        />
                      </View>

                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Trích nguồn từ hũ chi tiêu:</Text>
                        <View style={styles.sourceJarsSelectorList}>
                          {jars.filter(j => j.type === 'spend').map((jar) => (
                            <TouchableOpacity
                              key={jar.id}
                              style={[
                                styles.sourceJarOptionChip,
                                selectedSourceJarId === jar.id && styles.sourceJarOptionChipSelected,
                                { borderColor: jar.color }
                              ]}
                              onPress={() => setSelectedSourceJarId(jar.id)}
                            >
                              <View style={[styles.legendDot, { backgroundColor: jar.color }]} />
                              <Text style={[
                                styles.sourceJarOptionName,
                                selectedSourceJarId === jar.id && styles.sourceJarOptionNameSelected
                              ]}>
                                {jar.name} ({jar.balance.toLocaleString('vi-VN')} đ)
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>

                      <TouchableOpacity style={styles.submitBtn} onPress={handleConfirmFunding}>
                        <Text style={styles.submitBtnText}>Xác nhận trích nộp</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View>
                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Số tiền rút khỏi quỹ (VND)</Text>
                        <TextInput
                          style={styles.textInput}
                          placeholder="Ví dụ: 500,000"
                          keyboardType="numeric"
                          value={withdrawAmount ? parseFloat(withdrawAmount).toLocaleString('vi-VN') : ''}
                          onChangeText={(text) => setWithdrawAmount(text.replace(/[^0-9]/g, ''))}
                        />
                      </View>

                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Chuyển tiền về hũ chi tiêu:</Text>
                        <View style={styles.sourceJarsSelectorList}>
                          {jars.filter(j => j.type === 'spend').map((jar) => (
                            <TouchableOpacity
                              key={jar.id}
                              style={[
                                styles.sourceJarOptionChip,
                                selectedTargetJarId === jar.id && styles.sourceJarOptionChipSelected,
                                { borderColor: jar.color }
                              ]}
                              onPress={() => setSelectedTargetJarId(jar.id)}
                            >
                              <View style={[styles.legendDot, { backgroundColor: jar.color }]} />
                              <Text style={[
                                styles.sourceJarOptionName,
                                selectedTargetJarId === jar.id && styles.sourceJarOptionNameSelected
                              ]}>
                                {jar.name} ({jar.balance.toLocaleString('vi-VN')} đ)
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>

                      <TouchableOpacity style={[styles.submitBtn, { backgroundColor: '#EF4444' }]} onPress={handleConfirmWithdrawal}>
                        <Text style={styles.submitBtnText}>Xác nhận rút tiền</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </ScrollView>
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* MODAL: RECLASSIFY TRANSACTION */}
      <Modal visible={reclassifyModalVisible} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chọn hũ phân loại</Text>
              <TouchableOpacity onPress={() => setReclassifyModalVisible(false)}>
                <Feather name="x" size={24} color="#1d1d1f" />
              </TouchableOpacity>
            </View>
            
            {selectedTxForReclassify && (
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#1d1d1f', marginBottom: 4 }}>
                  {selectedTxForReclassify.description}
                </Text>
                <Text style={{ fontSize: 13, color: '#ff5c5c', fontWeight: '700' }}>
                  Số tiền: {selectedTxForReclassify.amount.toLocaleString('vi-VN')} đ
                </Text>
              </View>
            )}

            <ScrollView contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
              {jars.filter(j => j.type === 'spend').map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.jarItemSelect}
                  onPress={() => handleConfirmReclassify(item.id)}
                >
                  <View style={[styles.colorDot, { backgroundColor: item.color }]} />
                  <View style={styles.jarSelectInfo}>
                    <Text style={styles.jarSelectName}>{item.name}</Text>
                    <Text style={styles.jarSelectPercent}>Tỷ lệ phân bổ: {item.allocationPercent}%</Text>
                  </View>
                  <Feather name="chevron-right" size={16} color="#cccccc" />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC', // Crisp slate off-white
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 10,
  },
  datePill: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  dateText: {
    color: '#0F172A',
    fontSize: 13,
    fontFamily: 'SF Pro Text, system-ui, -apple-system, sans-serif',
    fontWeight: '600',
  },
  bellBtn: {
    backgroundColor: '#ffffff',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    position: 'relative',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  bellBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#ff5c5c',
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  bellBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '800',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    gap: 16,
  },
  balanceCard: {
    backgroundColor: '#0F172A', // Obsidian/Midnight Slate
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.03)',
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  balanceTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dbIcon: {
    marginTop: -1,
  },
  balanceTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8', // Slate grey
    letterSpacing: 1.0,
  },
  arrowBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  balanceValue: {
    fontSize: 32,
    fontFamily: 'SF Pro Display, system-ui, -apple-system, sans-serif',
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 16,
    letterSpacing: -0.6,
  },
  spendingFeedback: {
    fontSize: 13,
    color: '#94A3B8',
    marginBottom: 8,
    fontWeight: '500',
  },
  spendingPercent: {
    fontWeight: '700',
    color: '#3B82F6', // Vibrant modern blue
  },
  progressBarBg: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressBarFill: {
    backgroundColor: '#3B82F6', // Accent blue
    height: '100%',
    borderRadius: 5,
  },
  distributionCard: {
    backgroundColor: '#1E293B', // Slate 800
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.03)',
  },
  distribHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  distribTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 1.0,
  },
  timeDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  timeDropdownText: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '600',
  },
  dropdownIcon: {
    marginLeft: 2,
  },
  goalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.03,
    shadowRadius: 20,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  goalTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B', // Slate 500
    letterSpacing: 1.0,
  },
  addGoalBtn: {
    backgroundColor: '#F1F5F9',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  goalContentRow: {
    flexDirection: 'column',
  },
  jarsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    paddingVertical: 12,
    marginBottom: 16,
  },
  jarTouchWrapper: {
    alignItems: 'center',
    width: 90,
  },
  noGoalsText: {
    fontSize: 13,
    color: '#7a7a7a',
    marginVertical: 40,
    textAlign: 'center',
    width: '100%',
  },
  legendContainer: {
    width: '100%',
    gap: 2,
  },
  legendItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 0.5,
    borderBottomColor: '#f1f5f9',
    paddingVertical: 10,
  },
  legendInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
    flex: 1,
  },
  legendValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    paddingLeft: 16,
  },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    maxHeight: '85%',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f2f2f7',
    paddingBottom: 16,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1d1d1f',
  },
  alertsList: {
    marginBottom: 20,
  },
  emptyAlerts: {
    textAlign: 'center',
    color: '#7a7a7a',
    marginVertical: 40,
    fontSize: 14,
  },
  alertItem: {
    padding: 16,
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
  },
  alertUnread: {
    backgroundColor: 'rgba(0, 102, 204, 0.03)',
    borderColor: 'rgba(0, 102, 204, 0.1)',
  },
  alertRead: {
    backgroundColor: '#ffffff',
    borderColor: '#f2f2f7',
    opacity: 0.6,
  },
  alertIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  alertItemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1d1d1f',
  },
  alertItemMessage: {
    fontSize: 13,
    color: '#333333',
    lineHeight: 18,
    marginBottom: 6,
  },
  alertItemDate: {
    fontSize: 10,
    color: '#7a7a7a',
  },
  popupBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  popupContent: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#e5e5ea',
  },
  popupTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1d1d1f',
    marginBottom: 20,
    textAlign: 'center',
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f2f2f7',
  },
  breakdownLabelBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  breakdownLabel: {
    fontSize: 14,
    color: '#1d1d1f',
    fontWeight: '500',
  },
  breakdownValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1d1d1f',
  },
  breakdownTotal: {
    borderBottomWidth: 0,
    marginTop: 8,
    paddingTop: 16,
  },
  breakdownTotalLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1d1d1f',
  },
  breakdownTotalValue: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0066cc',
  },
  closePopupBtn: {
    marginTop: 24,
    backgroundColor: '#1d1d1f',
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closePopupBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1d1d1f',
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: '#f5f5f7',
    height: 44,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#1d1d1f',
    borderWidth: 1,
    borderColor: '#e5e5ea',
  },
  colorsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  colorBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  selectedColorBox: {
    borderColor: '#1d1d1f',
    transform: [{ scale: 1.1 }],
  },
  submitBtn: {
    backgroundColor: '#0066cc',
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 10,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  // Fund Goal dialog details
  goalInfoSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
    marginTop: 4,
  },
  goalSummaryName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1d1d1f',
  },
  goalSummaryProgress: {
    fontSize: 13,
    color: '#7a7a7a',
    marginBottom: 16,
    fontWeight: '500',
  },
  sourceJarsSelectorList: {
    gap: 10,
    marginTop: 4,
  },
  sourceJarOptionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    backgroundColor: '#ffffff',
    gap: 8,
  },
  sourceJarOptionChipSelected: {
    backgroundColor: '#f5f5f7',
    borderWidth: 2,
  },
  sourceJarOptionName: {
    fontSize: 13,
    color: '#7a7a7a',
    fontWeight: '500',
  },
  sourceJarOptionNameSelected: {
    color: '#1d1d1f',
    fontWeight: '700',
  },
  frequencyRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
    marginBottom: 4,
  },
  frequencyTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  frequencyTabActive: {
    backgroundColor: '#ffffff',
    borderColor: '#3B82F6',
  },
  frequencyTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  frequencyTabTextActive: {
    color: '#3B82F6',
  },
  goalPlanCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  goalPlanTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  goalPlanDesc: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  historySection: {
    marginTop: 8,
    marginBottom: 8,
  },
  historySectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1d1d1f',
    marginBottom: 10,
  },
  emptyHistoryBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 16,
    gap: 8,
    marginBottom: 12,
  },
  emptyHistoryText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  historyList: {
    gap: 8,
    marginBottom: 12,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  historyItemLeft: {
    flex: 1,
    paddingRight: 8,
  },
  historyTxDesc: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 2,
  },
  historyTxDate: {
    fontSize: 10,
    color: '#64748B',
  },
  historyTxAmount: {
    fontSize: 13,
    fontWeight: '700',
    color: '#10B981',
  },
  fundingDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 16,
  },
  actionTabRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 3,
    marginBottom: 16,
    gap: 4,
  },
  actionTab: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 9,
    gap: 4,
  },
  actionTabActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  actionTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  actionTabTextActive: {
    color: '#0F172A',
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  profileBtn: {
    backgroundColor: '#ffffff',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  unclassifiedCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.03,
    shadowRadius: 20,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#ffeedd',
  },
  unclassifiedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  unclassifiedHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  unclassifiedTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FF9500',
    letterSpacing: 1.0,
  },
  unclassifiedBadge: {
    backgroundColor: '#FF9500',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  unclassifiedBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  unclassifiedList: {
    gap: 12,
  },
  unclassifiedItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#f1f5f9',
  },
  unclassifiedItemLeft: {
    flex: 1.2,
    paddingRight: 8,
  },
  unclassifiedDesc: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 2,
  },
  unclassifiedDate: {
    fontSize: 11,
    color: '#94A3B8',
  },
  unclassifiedItemRight: {
    flex: 0.8,
    alignItems: 'flex-end',
  },
  unclassifiedAmount: {
    fontSize: 13,
    fontWeight: '700',
  },
  incomeText: {
    color: '#10B981',
  },
  expenseText: {
    color: '#EF4444',
  },
  moreUnclassifiedText: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    fontWeight: '500',
  },
  jarItemSelect: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: '#f2f2f7',
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  jarSelectInfo: {
    flex: 1,
  },
  jarSelectName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1d1d1f',
  },
  jarSelectPercent: {
    fontSize: 12,
    color: '#7a7a7a',
    marginTop: 2,
  },
});
