import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  FlatList,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFinancial, Transaction, Jar } from '../context/FinancialContext';
import { Feather, Ionicons } from '@expo/vector-icons';
import { AppHeader } from '../components/AppHeader';

type FilterType = 'all' | 'income' | 'expense' | 'pending';

interface HistoryScreenProps {
  onNavigateToSettings?: () => void;
  onNavigateToHistory?: () => void;
  onNavigateToRecord?: () => void;
}

export const HistoryScreen: React.FC<HistoryScreenProps> = ({
  onNavigateToSettings,
  onNavigateToHistory,
  onNavigateToRecord,
}) => {
  const {
    transactions,
    jars,
    confirmPendingTransaction,
    deletePendingTransaction,
    recategorizeTransaction,
  } = useFinancial();

  const spendJars = jars.filter((j) => j.type === 'spend');

  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Re-classify & Detail states
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [jarSelectorVisible, setJarSelectorVisible] = useState(false);
  const [selectedDetailTx, setSelectedDetailTx] = useState<Transaction | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  // Group by date helper
  const formatDateGroupLabel = (dateStr: string) => {
    const d = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (d.toDateString() === today.toDateString()) {
      return 'Hôm nay';
    } else if (d.toDateString() === yesterday.toDateString()) {
      return 'Hôm qua';
    } else {
      const day = d.getDate();
      const month = d.getMonth() + 1;
      const year = d.getFullYear();
      return `${day} Tháng ${month}, ${year}`;
    }
  };

  // Full format date for detailed invoice
  const formatFullDateTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    const dayName = days[d.getDay()];
    const time = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${time} • ${dayName}, ${day}/${month}/${year}`;
  };

  // Filter transactions
  const filteredTxs = transactions.filter((t) => {
    // 1. Filter by category tabs
    if (activeFilter === 'income' && (t.type !== 'income' || t.isTransfer))
      return false;
    if (
      activeFilter === 'expense' &&
      (t.type !== 'expense' || t.isPending || t.isTransfer)
    )
      return false;
    if (activeFilter === 'pending' && !t.isPending) return false;

    // 2. Filter by search description
    if (searchQuery.trim() !== '') {
      return t.description.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  // Grouping transaction data
  const groups: { [key: string]: Transaction[] } = {};
  filteredTxs.forEach(t => {
    const key = formatDateGroupLabel(t.date);
    if (!groups[key]) groups[key] = [];
    groups[key].push(t);
  });

  const getJarInfo = (jarId: string): Jar => {
    return jars.find(j => j.id === jarId) || {
      id: 'unknown',
      name: 'Chưa phân loại',
      type: 'spend',
      allocationPercent: 0,
      balance: 0,
      color: '#8e8e93'
    };
  };

  const handleOpenTxDetail = (tx: Transaction) => {
    setSelectedDetailTx(tx);
    setDetailModalVisible(true);
  };

  const handleOpenReclassify = (tx: Transaction) => {
    setSelectedTx(tx);
    setJarSelectorVisible(true);
  };

  const handleReclassifyFromDetail = () => {
    if (selectedDetailTx) {
      const tx = selectedDetailTx;
      setDetailModalVisible(false);
      setTimeout(() => {
        handleOpenReclassify(tx);
      }, 200);
    }
  };

  const handleReclassifyConfirm = (jarId: string) => {
    if (selectedTx) {
      if (selectedTx.isPending) {
        confirmPendingTransaction(selectedTx.id, jarId);
      } else {
        recategorizeTransaction(selectedTx.id, jarId);
      }
      setJarSelectorVisible(false);
      setSelectedTx(null);
    }
  };

  const handleConfirmFromDetail = () => {
    if (selectedDetailTx) {
      const jarId = selectedDetailTx.suggestedJarId || selectedDetailTx.jarId || '1';
      confirmPendingTransaction(selectedDetailTx.id, jarId);
      setDetailModalVisible(false);
      setSelectedDetailTx(null);
    }
  };

  const handleIgnorePending = (id: string) => {
    Alert.alert(
      'Xóa giao dịch',
      'Bạn có chắc chắn muốn bỏ qua giao dịch chờ duyệt này?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: () => {
            deletePendingTransaction(id);
            if (selectedDetailTx?.id === id) {
              setDetailModalVisible(false);
              setSelectedDetailTx(null);
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* 1. TOP UNIFIED HEADER */}
      <AppHeader
        onNavigateToSettings={onNavigateToSettings}
        onNavigateToHistory={onNavigateToHistory}
        onNavigateToRecord={onNavigateToRecord}
      />

      <Text style={styles.screenTitle}>Lịch sử Giao dịch</Text>

      {/* SEARCH BAR */}
      <View style={styles.searchContainer}>
        <Feather name="search" size={16} color="#7a7a7a" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm kiếm giao dịch, hóa đơn..."
          placeholderTextColor="#7a7a7a"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Feather name="x-circle" size={16} color="#7a7a7a" />
          </TouchableOpacity>
        )}
      </View>

      {/* FILTER TABS */}
      <View style={styles.filterRow}>
        {(['all', 'income', 'expense', 'pending'] as FilterType[]).map(
          (filter) => {
            const label =
              filter === 'all'
                ? 'Tất cả'
                : filter === 'income'
                  ? 'Thu nhập'
                  : filter === 'expense'
                    ? 'Chi tiêu'
                    : 'Chờ duyệt';

            const count =
              filter === 'pending'
                ? transactions.filter((t) => t.isPending).length
                : 0;

            return (
              <TouchableOpacity
                key={filter}
                style={[
                  styles.filterTab,
                  activeFilter === filter && styles.activeFilterTab,
                ]}
                onPress={() => setActiveFilter(filter)}
              >
                <Text
                  style={[
                    styles.filterTabText,
                    activeFilter === filter && styles.activeFilterTabText,
                  ]}
                >
                  {label}
                  {count > 0 && ` (${count})`}
                </Text>
              </TouchableOpacity>
            );
          },
        )}
      </View>

      {/* TRANSACTIONS LIST */}
      <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
        {/* Render Pending items at top if 'All' filter is active */}
        {activeFilter === 'all' && transactions.some(t => t.isPending) && (
          <View style={styles.pendingSection}>
            <View style={styles.pendingHeader}>
              <Ionicons name="sparkles" size={16} color="#0066cc" />
              <Text style={styles.pendingTitle}>GIAO DỊCH CHỜ AI XÁC NHẬN</Text>
            </View>
            {transactions.filter(t => t.isPending).map(tx => {
              const suggestedJar = getJarInfo(tx.suggestedJarId || '1');
              return (
                <TouchableOpacity
                  key={tx.id}
                  style={styles.pendingCard}
                  activeOpacity={0.8}
                  onPress={() => handleOpenTxDetail(tx)}
                >
                  <View style={styles.pendingCardHeader}>
                    <Text style={styles.pendingDesc}>{tx.description}</Text>
                    <Text style={styles.pendingAmount}>
                      -{tx.amount.toLocaleString('vi-VN')} đ
                    </Text>
                  </View>
                  <Text style={styles.pendingAIProposal}>
                    AI gợi ý hũ: <Text style={{ color: suggestedJar.color, fontWeight: '700' }}>{suggestedJar.name}</Text> ({Math.floor((tx.confidence || 0.6) * 100)}% tin cậy)
                  </Text>
                  <View style={styles.pendingActions}>
                    <TouchableOpacity
                      style={styles.actionIgnoreBtn}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleIgnorePending(tx.id);
                      }}
                    >
                      <Text style={styles.actionIgnoreText}>Bỏ qua</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionEditBtn}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleOpenReclassify(tx);
                      }}
                    >
                      <Text style={styles.actionEditText}>Sửa hũ</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionConfirmBtn}
                      onPress={(e) => {
                        e.stopPropagation();
                        confirmPendingTransaction(tx.id, tx.suggestedJarId || '1');
                      }}
                    >
                      <Text style={styles.actionConfirmText}>Xác nhận</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {Object.keys(groups).length === 0 ? (
          <View style={styles.emptyContainer}>
            <Feather name="folder" size={48} color="#cccccc" />
            <Text style={styles.emptyText}>Không tìm thấy giao dịch nào.</Text>
          </View>
        ) : (
          Object.keys(groups).map((groupName) => (
            <View key={groupName} style={styles.groupContainer}>
              <Text style={styles.groupHeader}>{groupName}</Text>
              <View style={styles.groupCard}>
                {groups[groupName].map((tx, index) => {
                  const jar = getJarInfo(tx.jarId);
                  const isIncome = tx.type === 'income';

                  return (
                    <TouchableOpacity
                      key={tx.id}
                      style={[
                        styles.txItem,
                        index < groups[groupName].length - 1 && styles.txBorder,
                        tx.isPending && styles.txItemPending
                      ]}
                      onPress={() => handleOpenTxDetail(tx)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.txLeft}>
                        <View style={[styles.jarBadge, { backgroundColor: jar.color }]} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.txDesc} numberOfLines={1}>{tx.description}</Text>
                          <View style={styles.txSubRow}>
                            <Text style={styles.txSub}>
                              {jar.name} • {new Date(tx.date).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                            </Text>
                            {jar.id === 'unknown' && (
                              <View style={styles.unclassifiedBadge}>
                                <Feather name="edit-2" size={9} color="#ff9500" style={{ marginRight: 2 }} />
                                <Text style={styles.unclassifiedBadgeText}>Cần phân loại</Text>
                              </View>
                            )}
                          </View>
                        </View>
                      </View>
                      
                      <View style={styles.txRight}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={[
                            styles.txAmount,
                            isIncome ? styles.incomeAmount : styles.expenseAmount
                          ]}>
                            {isIncome ? '+' : '-'}{tx.amount.toLocaleString('vi-VN')} đ
                          </Text>
                          <Feather name="chevron-right" size={14} color="#cccccc" />
                        </View>
                        {tx.isPending && (
                          <View style={styles.aiBadge}>
                            <Text style={styles.aiBadgeText}>Chờ duyệt</Text>
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))
        )}

        {/* Space at bottom for floating nav */}
        <View style={{ height: 90 }} />
      </ScrollView>

      {/* DETAILED INVOICE / RECEIPT MODAL */}
      <Modal visible={detailModalVisible} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.receiptModalContent}>
            {/* Header bar */}
            <View style={styles.receiptModalHeader}>
              <View style={styles.receiptIconBadge}>
                <Ionicons name="receipt-outline" size={20} color="#2563EB" />
              </View>
              <Text style={styles.receiptHeaderTitle}>Chi Tiết Hóa Đơn</Text>
              <TouchableOpacity
                style={styles.receiptCloseBtn}
                onPress={() => setDetailModalVisible(false)}
              >
                <Feather name="x" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {selectedDetailTx && (() => {
              const tx = selectedDetailTx;
              const jar = getJarInfo(tx.jarId || tx.suggestedJarId || '1');
              const isIncome = tx.type === 'income';
              const isPending = !!tx.isPending;
              const isTransfer = !!tx.isTransfer;

              return (
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.receiptBody}>
                  {/* Amount Ticket Card */}
                  <View style={styles.receiptAmountCard}>
                    <Text style={styles.receiptAmountLabel}>
                      {isIncome ? 'SỐ TIỀN THU NHẬP' : isTransfer ? 'SỐ TIỀN CHUYỂN KHOẢN' : 'SỐ TIỀN THANH TOÁN'}
                    </Text>
                    <Text style={[
                      styles.receiptAmountValue,
                      isIncome ? styles.incomeAmountValue : styles.expenseAmountValue
                    ]}>
                      {isIncome ? '+' : '-'}{tx.amount.toLocaleString('vi-VN')} đ
                    </Text>

                    <View style={[
                      styles.receiptStatusBadge,
                      isPending ? styles.statusBadgePending : isIncome ? styles.statusBadgeIncome : styles.statusBadgeSuccess
                    ]}>
                      <Ionicons
                        name={isPending ? "time-outline" : isIncome ? "arrow-down-circle-outline" : "checkmark-circle-outline"}
                        size={13}
                        color={isPending ? '#D97706' : isIncome ? '#16A34A' : '#2563EB'}
                        style={{ marginRight: 4 }}
                      />
                      <Text style={[
                        styles.receiptStatusText,
                        isPending ? { color: '#D97706' } : isIncome ? { color: '#16A34A' } : { color: '#2563EB' }
                      ]}>
                        {isPending ? 'Đang chờ duyệt' : isIncome ? 'Ghi nhận thu nhập' : 'Thanh toán thành công'}
                      </Text>
                    </View>
                  </View>

                  {/* Receipt Meta Rows */}
                  <View style={styles.receiptInfoCard}>
                    {/* Row: Transaction Name */}
                    <View style={styles.receiptRow}>
                      <Text style={styles.receiptRowLabel}>Nội dung / Tên</Text>
                      <Text style={styles.receiptRowValueBold} numberOfLines={2}>
                        {tx.description}
                      </Text>
                    </View>

                    <View style={styles.receiptDivider} />

                    {/* Row: Transaction ID */}
                    <View style={styles.receiptRow}>
                      <Text style={styles.receiptRowLabel}>Mã hóa đơn</Text>
                      <View style={styles.idContainer}>
                        <Text style={styles.receiptCodeText}>
                          #WIVI-{tx.id ? tx.id.substring(0, 8).toUpperCase() : 'TX'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.receiptDivider} />

                    {/* Row: Date Time */}
                    <View style={styles.receiptRow}>
                      <Text style={styles.receiptRowLabel}>Thời gian</Text>
                      <Text style={styles.receiptRowValue}>
                        {formatFullDateTime(tx.date)}
                      </Text>
                    </View>

                    <View style={styles.receiptDivider} />

                    {/* Row: Jar Category */}
                    <View style={styles.receiptRow}>
                      <Text style={styles.receiptRowLabel}>Hũ ngân sách</Text>
                      <View style={styles.jarBadgeDetail}>
                        <View style={[styles.jarColorDot, { backgroundColor: jar.color }]} />
                        <Text style={styles.jarDetailName}>{jar.name}</Text>
                        {jar.allocationPercent > 0 && (
                          <Text style={styles.jarDetailPercent}>({jar.allocationPercent}%)</Text>
                        )}
                      </View>
                    </View>

                    <View style={styles.receiptDivider} />

                    {/* Row: Payment Method */}
                    <View style={styles.receiptRow}>
                      <Text style={styles.receiptRowLabel}>Phương thức</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Ionicons
                          name={tx.source === 'cash' ? 'cash-outline' : 'card-outline'}
                          size={15}
                          color="#475569"
                        />
                        <Text style={styles.receiptRowValue}>
                          {tx.source === 'cash' ? 'Tiền mặt' : 'Tài khoản Ngân hàng (SePay)'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.receiptDivider} />

                    {/* Row: Source / Recognition */}
                    <View style={styles.receiptRow}>
                      <Text style={styles.receiptRowLabel}>Nguồn ghi nhận</Text>
                      {tx.confidence ? (
                        <View style={styles.aiTagBadge}>
                          <Ionicons name="sparkles" size={12} color="#2563EB" />
                          <Text style={styles.aiTagText}>
                            Quét AI OCR ({Math.round(tx.confidence * 100)}%)
                          </Text>
                        </View>
                      ) : (
                        <Text style={styles.receiptRowValue}>Nhập thủ công</Text>
                      )}
                    </View>
                  </View>

                  {/* Actions inside Detail Receipt */}
                  <View style={styles.receiptActionsContainer}>
                    {isPending ? (
                      <View style={{ gap: 10, width: '100%' }}>
                        <TouchableOpacity
                          style={styles.receiptPrimaryBtn}
                          onPress={handleConfirmFromDetail}
                        >
                          <Ionicons name="checkmark-circle" size={18} color="#ffffff" style={{ marginRight: 6 }} />
                          <Text style={styles.receiptPrimaryBtnText}>Xác nhận & Lưu vào {jar.name}</Text>
                        </TouchableOpacity>

                        <View style={{ flexDirection: 'row', gap: 10 }}>
                          <TouchableOpacity
                            style={[styles.receiptSecondaryBtn, { flex: 1 }]}
                            onPress={handleReclassifyFromDetail}
                          >
                            <Feather name="refresh-cw" size={15} color="#0F172A" style={{ marginRight: 6 }} />
                            <Text style={styles.receiptSecondaryBtnText}>Chọn hũ khác</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[styles.receiptDangerBtn, { flex: 1 }]}
                            onPress={() => handleIgnorePending(tx.id)}
                          >
                            <Feather name="trash-2" size={15} color="#EF4444" style={{ marginRight: 6 }} />
                            <Text style={styles.receiptDangerBtnText}>Xóa bỏ</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : (
                      <View style={{ gap: 10, width: '100%' }}>
                        {!isIncome && !isTransfer && (
                          <TouchableOpacity
                            style={styles.receiptSecondaryBtn}
                            onPress={handleReclassifyFromDetail}
                          >
                            <Feather name="refresh-cw" size={16} color="#0F172A" style={{ marginRight: 6 }} />
                            <Text style={styles.receiptSecondaryBtnText}>Đổi hũ ngân sách</Text>
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity
                          style={styles.receiptPrimaryBtn}
                          onPress={() => setDetailModalVisible(false)}
                        >
                          <Text style={styles.receiptPrimaryBtnText}>Đóng</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </ScrollView>
              );
            })()}
          </View>
        </View>
      </Modal>

      {/* JAR SELECTOR SHEET (MODAL) */}
      <Modal visible={jarSelectorVisible} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chọn hũ phân loại thay thế</Text>
              <TouchableOpacity onPress={() => setJarSelectorVisible(false)}>
                <Feather name="x" size={24} color="#1d1d1f" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={spendJars}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.jarItemSelect}
                  onPress={() => handleReclassifyConfirm(item.id)}
                >
                  <View style={[styles.colorDot, { backgroundColor: item.color }]} />
                  <View style={styles.jarSelectInfo}>
                    <Text style={styles.jarSelectName}>{item.name}</Text>
                    <Text style={styles.jarSelectPercent}>Tỷ lệ phân bổ: {item.allocationPercent}%</Text>
                  </View>
                  <Feather name="chevron-right" size={16} color="#cccccc" />
                </TouchableOpacity>
              )}
              contentContainerStyle={{ paddingBottom: 24 }}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    paddingHorizontal: 20,
    marginTop: 4,
    marginBottom: 14,
    letterSpacing: -0.4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    marginHorizontal: 20,
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 1,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#0F172A',
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 16,
  },
  filterTab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  activeFilterTab: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  filterTabText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  activeFilterTabText: {
    color: '#ffffff',
  },
  listContent: {
    paddingHorizontal: 20,
  },
  pendingSection: {
    marginBottom: 20,
  },
  pendingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  pendingTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0066cc',
    letterSpacing: 0.5,
  },
  pendingCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 102, 204, 0.15)',
    marginBottom: 10,
    shadowColor: '#0066cc',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  pendingCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  pendingDesc: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1d1d1f',
    flex: 1.2,
  },
  pendingAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ff5c5c',
    textAlign: 'right',
    flex: 0.8,
  },
  pendingAIProposal: {
    fontSize: 12,
    color: '#7a7a7a',
    marginBottom: 12,
  },
  pendingActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  actionIgnoreBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#f5f5f7',
  },
  actionIgnoreText: {
    color: '#ff5c5c',
    fontSize: 12,
    fontWeight: '600',
  },
  actionEditBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#f5f5f7',
    borderWidth: 0.5,
    borderColor: '#e5e5ea',
  },
  actionEditText: {
    color: '#1d1d1f',
    fontSize: 12,
    fontWeight: '600',
  },
  actionConfirmBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#0066cc',
  },
  actionConfirmText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  groupContainer: {
    marginBottom: 20,
  },
  groupHeader: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7a7a7a',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  groupCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#e5e5ea',
    overflow: 'hidden',
  },
  txItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  txItemPending: {
    backgroundColor: 'rgba(255, 184, 61, 0.05)',
  },
  txBorder: {
    borderBottomWidth: 0.5,
    borderBottomColor: '#f2f2f7',
  },
  txLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1.2,
  },
  jarBadge: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  txDesc: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1d1d1f',
  },
  txSub: {
    fontSize: 12,
    color: '#7a7a7a',
  },
  txSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  unclassifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 149, 0, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  unclassifiedBadgeText: {
    color: '#ff9500',
    fontSize: 9,
    fontWeight: '700',
  },
  txRight: {
    alignItems: 'flex-end',
    flex: 0.8,
  },
  txAmount: {
    fontSize: 15,
    fontWeight: '700',
  },
  incomeAmount: {
    color: '#2ecc71',
  },
  expenseAmount: {
    color: '#1d1d1f',
  },
  aiBadge: {
    backgroundColor: '#ffb83d',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  aiBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 60,
    gap: 10,
  },
  emptyText: {
    color: '#7a7a7a',
    fontSize: 14,
  },
  // Modal layout
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
    maxHeight: '75%',
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
  // Detailed Receipt Modal Styles
  receiptModalContent: {
    backgroundColor: '#F8FAFC',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 36,
    maxHeight: '85%',
  },
  receiptModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  receiptIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  receiptHeaderTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  receiptCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  receiptBody: {
    paddingVertical: 18,
    gap: 16,
  },
  receiptAmountCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  receiptAmountLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  receiptAmountValue: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.8,
    marginBottom: 10,
  },
  incomeAmountValue: {
    color: '#16A34A',
  },
  expenseAmountValue: {
    color: '#0F172A',
  },
  receiptStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgePending: {
    backgroundColor: '#FEF3C7',
  },
  statusBadgeIncome: {
    backgroundColor: '#DCFCE7',
  },
  statusBadgeSuccess: {
    backgroundColor: '#EFF6FF',
  },
  receiptStatusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  receiptInfoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  receiptRowLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
    flex: 0.9,
  },
  receiptRowValue: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '600',
    textAlign: 'right',
    flex: 1.1,
  },
  receiptRowValueBold: {
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '700',
    textAlign: 'right',
    flex: 1.1,
  },
  receiptDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
  },
  idContainer: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  receiptCodeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    fontFamily: 'monospace',
  },
  jarBadgeDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  jarColorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  jarDetailName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  jarDetailPercent: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  aiTagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  aiTagText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
  },
  receiptActionsContainer: {
    marginTop: 6,
    alignItems: 'center',
  },
  receiptPrimaryBtn: {
    backgroundColor: '#0F172A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    width: '100%',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  receiptPrimaryBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  receiptSecondaryBtn: {
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  receiptSecondaryBtnText: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '700',
  },
  receiptDangerBtn: {
    backgroundColor: '#FEF2F2',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  receiptDangerBtnText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '700',
  },
});
