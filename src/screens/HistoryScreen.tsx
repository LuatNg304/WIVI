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
import { useFinancial, Transaction, Jar } from '../context/FinancialContext';
import { Feather, Ionicons } from '@expo/vector-icons';

type FilterType = 'all' | 'income' | 'expense' | 'unclassified';

export const HistoryScreen: React.FC = () => {
  const {
    transactions,
    jars,
    confirmPendingTransaction,
    deletePendingTransaction,
    recategorizeTransaction
  } = useFinancial();

  const spendJars = jars.filter(j => j.type === 'spend');

  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Re-classify state
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [jarSelectorVisible, setJarSelectorVisible] = useState(false);

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

  // Filter transactions
  const filteredTxs = transactions.filter(t => {
    // 1. Filter by category tabs
    if (activeFilter === 'income' && (t.type !== 'income' || t.isTransfer)) return false;
    if (activeFilter === 'expense' && (t.type !== 'expense' || t.isPending || t.isTransfer)) return false;
    if (activeFilter === 'unclassified' && (jars.some(j => j.id === t.jarId) && t.jarId !== 'unknown')) return false;
    
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

  const handleOpenReclassify = (tx: Transaction) => {
    setSelectedTx(tx);
    setJarSelectorVisible(true);
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

  const handleIgnorePending = (id: string) => {
    Alert.alert(
      'Xóa giao dịch',
      'Bạn có chắc chắn muốn bỏ qua giao dịch chờ duyệt này?',
      [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Xóa', style: 'destructive', onPress: () => deletePendingTransaction(id) }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.screenTitle}>Lịch sử Giao dịch</Text>

      {/* SEARCH BAR */}
      <View style={styles.searchContainer}>
        <Feather name="search" size={16} color="#7a7a7a" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm kiếm giao dịch..."
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
        {(['all', 'income', 'expense', 'unclassified'] as FilterType[]).map((filter) => {
          const label = 
            filter === 'all' ? 'Tất cả' :
            filter === 'income' ? 'Thu nhập' :
            filter === 'expense' ? 'Chi tiêu' : 'Cần phân loại';
          
          const count = filter === 'unclassified' ? transactions.filter(t => !jars.some(j => j.id === t.jarId) || t.jarId === 'unknown').length : 0;

          return (
            <TouchableOpacity
              key={filter}
              style={[
                styles.filterTab,
                activeFilter === filter && styles.activeFilterTab
              ]}
              onPress={() => setActiveFilter(filter)}
            >
              <Text
                style={[
                  styles.filterTabText,
                  activeFilter === filter && styles.activeFilterTabText
                ]}
              >
                {label}
                {count > 0 && ` (${count})`}
              </Text>
            </TouchableOpacity>
          );
        })}
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
                <View key={tx.id} style={styles.pendingCard}>
                  <View style={styles.pendingCardHeader}>
                    <Text style={styles.pendingDesc}>{tx.description}</Text>
                    <Text style={styles.pendingAmount}>
                      -{tx.amount.toLocaleString('vi-VN')} VND
                    </Text>
                  </View>
                  <Text style={styles.pendingAIProposal}>
                    AI gợi ý hũ: <Text style={{ color: suggestedJar.color, fontWeight: '700' }}>{suggestedJar.name}</Text> ({Math.floor((tx.confidence || 0.6) * 100)}% tin cậy)
                  </Text>
                  <View style={styles.pendingActions}>
                    <TouchableOpacity
                      style={styles.actionIgnoreBtn}
                      onPress={() => handleIgnorePending(tx.id)}
                    >
                      <Text style={styles.actionIgnoreText}>Bỏ qua</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionEditBtn}
                      onPress={() => handleOpenReclassify(tx)}
                    >
                      <Text style={styles.actionEditText}>Sửa hũ</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionConfirmBtn}
                      onPress={() => confirmPendingTransaction(tx.id, tx.suggestedJarId || '1')}
                    >
                      <Text style={styles.actionConfirmText}>Xác nhận</Text>
                    </TouchableOpacity>
                  </View>
                </View>
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
                      onPress={() => handleOpenReclassify(tx)}
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
                            {isIncome ? '+' : '-'}{tx.amount.toLocaleString('vi-VN')}
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC', // Crisp slate off-white
    paddingTop: 60,
  },
  screenTitle: {
    fontSize: 28,
    fontFamily: 'SF Pro Display, system-ui, -apple-system, sans-serif',
    fontWeight: '800',
    color: '#0F172A', // Slate 900
    paddingHorizontal: 20,
    marginBottom: 16,
    letterSpacing: -0.6,
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
});
