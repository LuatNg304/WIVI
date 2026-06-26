import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { useFinancial, Jar } from '../context/FinancialContext';
import { Feather } from '@expo/vector-icons';

export const JarsScreen: React.FC = () => {
  const {
    jars,
    transactions,
    updateJarRatios,
    deleteJar,
    addJar
  } = useFinancial();

  // Allocation Adjustment State
  const [editingRatios, setEditingRatios] = useState<{ [id: string]: number }>(
    jars.reduce((acc, j) => ({ ...acc, [j.id]: j.allocationPercent }), {})
  );
  const [isEditingRatios, setIsEditingRatios] = useState(false);

  // Detail Modal State
  const [selectedJarForDetail, setSelectedJarForDetail] = useState<Jar | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  // Add Jar Modal State
  const [addJarModalVisible, setAddJarModalVisible] = useState(false);
  const [newJarName, setNewJarName] = useState('');
  const [newJarPercent, setNewJarPercent] = useState<string>('20');
  const [newJarColor, setNewJarColor] = useState<string>('#0066cc');

  const totalPercent = Object.values(editingRatios).reduce((sum, v) => sum + v, 0);

  // Sync editing ratios when jars list updates
  React.useEffect(() => {
    setEditingRatios(
      jars.reduce((acc, j) => ({ ...acc, [j.id]: j.allocationPercent }), {})
    );
  }, [jars]);

  const handleRatioChange = (jarId: string, delta: number) => {
    setEditingRatios(prev => {
      const currentVal = prev[jarId] || 0;
      const newVal = Math.min(Math.max(0, currentVal + delta), 100);
      return {
        ...prev,
        [jarId]: newVal
      };
    });
  };

  const handleSaveRatios = () => {
    if (totalPercent !== 100) {
      Alert.alert('Lỗi tỷ lệ', `Tổng tỷ lệ các hũ phải bằng 100%. Hiện tại là ${totalPercent}%.`);
      return;
    }

    const formattedRatios = Object.entries(editingRatios).map(([id, percent]) => ({ id, percent }));
    const success = updateJarRatios(formattedRatios);
    
    if (success) {
      setIsEditingRatios(false);
      Alert.alert('Thành công', 'Đã lưu cấu hình phân bổ mới.');
    }
  };

  const handleDeleteJar = (id: string, name: string) => {
    Alert.alert(
      'Xóa hũ tài chính',
      `Bạn có chắc chắn muốn xóa hũ "${name}"? Tỷ lệ phân bổ sẽ được tự động chia đều cho các hũ còn lại.`,
      [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Xóa', style: 'destructive', onPress: () => deleteJar(id) }
      ]
    );
  };

  const handleSaveNewJar = () => {
    if (!newJarName.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên hũ.');
      return;
    }

    const percentVal = parseFloat(newJarPercent) || 0;

    if (percentVal <= 0 || percentVal > 100) {
      Alert.alert('Lỗi', 'Vui lòng nhập tỷ lệ phân bổ hợp lệ (0% - 100%).');
      return;
    }

    // Force type to 'spend' since JarsScreen only adds spending jars now
    const success = addJar(newJarName, 'spend', percentVal, 0, newJarColor);
    if (success) {
      setNewJarName('');
      setNewJarPercent('20');
      setAddJarModalVisible(false);
      Alert.alert('Thành công', `Đã thêm hũ chi tiêu "${newJarName}" thành công.`);
    }
  };

  const handleOpenJarDetail = (jar: Jar) => {
    setSelectedJarForDetail(jar);
    setDetailModalVisible(true);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.screenTitle}>Hũ Tài chính & Ngân sách</Text>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* SECTION 1: SPENDING JARS (HŨ CHI TIÊU) */}
        <View style={styles.jarsListHeader}>
          <Text style={styles.sectionTitle}>Các Hũ Chi tiêu (Ngân sách)</Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity
              style={styles.adjustRatiosToggle}
              onPress={() => setAddJarModalVisible(true)}
            >
              <Feather name="plus" size={14} color="#0066cc" />
              <Text style={styles.adjustRatiosToggleText}>Thêm hũ</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.adjustRatiosToggle}
              onPress={() => setIsEditingRatios(!isEditingRatios)}
            >
              <Feather name={isEditingRatios ? 'eye' : 'sliders'} size={14} color="#0066cc" />
              <Text style={styles.adjustRatiosToggleText}>
                {isEditingRatios ? 'Xem hũ' : 'Sửa tỷ lệ'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {!isEditingRatios ? (
          /* VIEW SPENDING JARS MODE */
          <View style={styles.jarsContainer}>
            {jars.filter(jar => jar.type === 'spend').map((jar) => {
              // Calculate spending progress
              const jarExpenses = transactions
                .filter(t => !t.isPending && t.type === 'expense' && !t.isTransfer && t.jarId === jar.id)
                .reduce((sum, t) => sum + t.amount, 0);
              const totalAllocated = jar.balance + jarExpenses;
              const percentProgress = totalAllocated > 0
                ? Math.min(Math.round((jarExpenses / totalAllocated) * 100), 100)
                : 0;
              const progressLabel = `Đã chi tiêu: ${percentProgress}%`;

              return (
                <TouchableOpacity key={jar.id} style={styles.jarCard} onPress={() => handleOpenJarDetail(jar)} activeOpacity={0.7}>
                  <View style={styles.jarCardHeader}>
                    <View style={styles.jarNameRow}>
                      <View style={[styles.colorBadge, { backgroundColor: jar.color }]} />
                      <Text style={styles.jarName}>{jar.name}</Text>
                    </View>
                    
                    {jars.filter(j => j.type === 'spend').length > 1 && (
                      <TouchableOpacity onPress={() => handleDeleteJar(jar.id, jar.name)}>
                        <Feather name="trash-2" size={16} color="#ff5c5c" />
                      </TouchableOpacity>
                    )}
                  </View>

                  <View style={styles.jarMeta}>
                    <Text style={styles.jarType}>Quỹ chi tiêu</Text>
                    <Text style={styles.jarPercent}>Tỷ lệ: {jar.allocationPercent}%</Text>
                  </View>

                  <View style={styles.balanceInfo}>
                    <Text style={styles.jarBalance}>
                      {jar.balance.toLocaleString('vi-VN')} VND
                    </Text>
                  </View>

                  {/* Progress bar */}
                  <View style={styles.progressContainer}>
                    <View style={styles.progressBarBg}>
                      <View style={[styles.progressBarFill, { width: `${percentProgress}%`, backgroundColor: jar.color }]} />
                    </View>
                    <Text style={styles.progressText}>{progressLabel}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          /* EDIT ALLOCATION RATIOS MODE */
          <View style={styles.ratioCard}>
            <Text style={styles.cardTitle}>Điều chỉnh tỷ lệ phân bổ tự động</Text>
            <Text style={styles.cardSubtitle}>
              Tổng phần trăm của các hũ chi tiêu bắt buộc phải bằng 100%. Các mục tiêu tích lũy (Goals) không tham gia phân bổ này.
            </Text>

            <View style={styles.adjustersList}>
              {jars.filter(jar => jar.type === 'spend').map((jar) => {
                const currentPercent = editingRatios[jar.id] || 0;
                return (
                  <View key={jar.id} style={styles.adjusterRow}>
                    <View style={styles.adjusterLeft}>
                      <View style={[styles.colorDot, { backgroundColor: jar.color }]} />
                      <Text style={styles.adjusterName} numberOfLines={1}>{jar.name}</Text>
                    </View>

                    <View style={styles.stepper}>
                      <TouchableOpacity
                        style={styles.stepBtn}
                        onPress={() => handleRatioChange(jar.id, -5)}
                      >
                        <Feather name="minus" size={14} color="#1d1d1f" />
                      </TouchableOpacity>
                      <Text style={styles.stepperValue}>{currentPercent}%</Text>
                      <TouchableOpacity
                        style={styles.stepBtn}
                        onPress={() => handleRatioChange(jar.id, 5)}
                      >
                        <Feather name="plus" size={14} color="#1d1d1f" />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Validation Feedback */}
            <View style={[
              styles.totalFeedback,
              totalPercent === 100 ? styles.totalValid : styles.totalInvalid
            ]}>
              <Feather
                name={totalPercent === 100 ? 'check-circle' : 'alert-circle'}
                size={16}
                color={totalPercent === 100 ? '#2ecc71' : '#ff5c5c'}
              />
              <Text style={[
                styles.totalFeedbackText,
                { color: totalPercent === 100 ? '#27ae60' : '#c0392b' }
              ]}>
                Tổng tỷ lệ: {totalPercent}% {totalPercent === 100 ? '(Đầy đủ)' : `(Lệch ${100 - totalPercent}%)`}
              </Text>
            </View>

            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setIsEditingRatios(false)}
              >
                <Text style={styles.cancelBtnText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, totalPercent !== 100 && styles.disabledBtn]}
                onPress={handleSaveRatios}
                disabled={totalPercent !== 100}
              >
                <Text style={styles.saveBtnText}>Lưu tỷ lệ</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* SECTION 2: SAVING GOALS (MỤC TIÊU TIẾT KIỆM - GOALS) */}
        {!isEditingRatios && (
          <>
            <View style={[styles.jarsListHeader, { marginTop: 12 }]}>
              <Text style={styles.sectionTitle}>Mục tiêu Tài chính (Goals)</Text>
            </View>
            
            <View style={styles.jarsContainer}>
              {jars.filter(jar => jar.type === 'save').map((jar) => {
                const percentProgress = jar.targetAmount 
                  ? Math.min(Math.round((jar.balance / jar.targetAmount) * 100), 100) 
                  : 0;
                const progressLabel = `Tiến độ tích lũy: ${percentProgress}%`;
                const displayTarget = jar.targetAmount 
                  ? `/ ${jar.targetAmount.toLocaleString('vi-VN')} đ` 
                  : '';

                return (
                  <TouchableOpacity
                    key={jar.id}
                    style={styles.jarCard}
                    onPress={() => handleOpenJarDetail(jar)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.jarCardHeader}>
                      <View style={styles.jarNameRow}>
                        <View style={[styles.colorBadge, { backgroundColor: jar.color }]} />
                        <Text style={styles.jarName}>{jar.name}</Text>
                      </View>
                      
                      <TouchableOpacity onPress={() => handleDeleteJar(jar.id, jar.name)}>
                        <Feather name="trash-2" size={16} color="#ff5c5c" />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.jarMeta}>
                      <Text style={styles.jarType}>Quỹ tiết kiệm / Mục tiêu (Goal)</Text>
                    </View>

                    <View style={styles.balanceInfo}>
                      <Text style={styles.jarBalance}>
                        {jar.balance.toLocaleString('vi-VN')} VND
                      </Text>
                      {displayTarget !== '' && (
                        <Text style={styles.jarTarget}>{displayTarget}</Text>
                      )}
                    </View>

                    {/* Progress bar */}
                    <View style={styles.progressContainer}>
                      <View style={styles.progressBarBg}>
                        <View style={[styles.progressBarFill, { width: `${percentProgress}%`, backgroundColor: jar.color }]} />
                      </View>
                      <Text style={styles.progressText}>{progressLabel}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
              {jars.filter(jar => jar.type === 'save').length === 0 && (
                <View style={styles.emptyJarsBox}>
                  <Text style={styles.emptyJarsText}>Chưa có mục tiêu tích lũy nào được thiết lập. Thêm mục tiêu ở màn hình chính.</Text>
                </View>
              )}
            </View>
          </>
        )}

        {/* Space at bottom for floating nav */}
        <View style={{ height: 90 }} />
      </ScrollView>

      {/* ADD JAR MODAL */}
      <Modal visible={addJarModalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View style={styles.modalBg}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Tạo hũ chi tiêu mới</Text>
                <TouchableOpacity onPress={() => setAddJarModalVisible(false)}>
                  <Feather name="x" size={24} color="#1d1d1f" />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} style={{ padding: 4 }}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Tên hũ chi tiêu (Ví dụ: Ăn uống, Di chuyển, Mua sắm...)</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Nhập tên hũ chi tiêu"
                    value={newJarName}
                    onChangeText={setNewJarName}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Tỷ lệ phân bổ thu nhập tự động (%)</Text>
                  <View style={styles.percentPickerRow}>
                    <TouchableOpacity
                      style={styles.pickerStepBtn}
                      onPress={() => setNewJarPercent(String(Math.max(5, (parseInt(newJarPercent) || 20) - 5)))}
                    >
                      <Feather name="minus" size={14} color="#1d1d1f" />
                    </TouchableOpacity>
                    <Text style={styles.pickerPercentVal}>{newJarPercent}%</Text>
                    <TouchableOpacity
                      style={styles.pickerStepBtn}
                      onPress={() => setNewJarPercent(String(Math.min(100, (parseInt(newJarPercent) || 20) + 5)))}
                    >
                      <Feather name="plus" size={14} color="#1d1d1f" />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.helpText}>
                    * Tỷ lệ các hũ chi tiêu hiện tại sẽ tự động điều chỉnh lại để tổng bằng 100%.
                  </Text>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Màu sắc đại diện</Text>
                  <View style={styles.colorsGrid}>
                    {['#0066cc', '#3be2b0', '#ff5c5c', '#ffb83d', '#9b59b6', '#3498db'].map((c) => (
                      <TouchableOpacity
                        key={c}
                        style={[
                          styles.colorBox,
                          { backgroundColor: c },
                          newJarColor === c && styles.selectedColorBox
                        ]}
                        onPress={() => setNewJarColor(c)}
                      />
                    ))}
                  </View>
                </View>

                <TouchableOpacity style={styles.submitBtn} onPress={handleSaveNewJar}>
                  <Text style={styles.submitBtnText}>Xác nhận tạo hũ chi tiêu</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* DETAILED JAR & GOAL MODAL */}
      <Modal visible={detailModalVisible} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedJarForDetail?.type === 'spend' ? 'Chi tiết Hũ Chi tiêu' : 'Chi tiết Mục tiêu Tiết kiệm'}
              </Text>
              <TouchableOpacity onPress={() => setDetailModalVisible(false)}>
                <Feather name="x" size={24} color="#1d1d1f" />
              </TouchableOpacity>
            </View>

            {selectedJarForDetail && (
              <ScrollView showsVerticalScrollIndicator={false} style={{ padding: 4 }}>
                <View style={styles.detailCard}>
                  <View style={styles.jarNameRow}>
                    <View style={[styles.colorBadge, { backgroundColor: selectedJarForDetail.color, width: 14, height: 14 }]} />
                    <Text style={[styles.jarName, { fontSize: 18 }]}>{selectedJarForDetail.name}</Text>
                  </View>

                  <Text style={[styles.detailTypeLabel, { color: selectedJarForDetail.color }]}>
                    {selectedJarForDetail.type === 'spend' ? 'Hũ chi tiêu (Phân bổ ngân sách)' : 'Hũ tích lũy (Savings Goal)'}
                  </Text>

                  <View style={styles.detailBalanceContainer}>
                    <Text style={styles.detailBalanceLabel}>SỐ DƯ HIỆN TẠI</Text>
                    <Text style={styles.detailBalanceValue}>
                      {selectedJarForDetail.balance.toLocaleString('vi-VN')} VND
                    </Text>
                  </View>

                  {selectedJarForDetail.type === 'spend' ? (
                    <View style={styles.detailMetaBlock}>
                      <Text style={styles.detailMetaText}>
                        Tỷ lệ nhận thu nhập: <Text style={{ fontWeight: '700', color: '#0066cc' }}>{selectedJarForDetail.allocationPercent}%</Text>
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.goalPlanCard}>
                      <Text style={styles.goalPlanTitle}>Kế hoạch tích lũy</Text>
                      {selectedJarForDetail.targetAmount && (
                        <Text style={styles.goalPlanDesc}>
                          Mục tiêu tích lũy:{' '}
                          <Text style={{ fontWeight: '700', color: '#0F172A' }}>
                            {selectedJarForDetail.targetAmount.toLocaleString('vi-VN')} đ
                          </Text>
                        </Text>
                      )}
                      {selectedJarForDetail.frequency && (
                        <Text style={[styles.goalPlanDesc, { marginTop: 4 }]}>
                          Cần tích lũy:{' '}
                          <Text style={{ fontWeight: '700', color: '#10B981' }}>
                            {selectedJarForDetail.frequencyAmount?.toLocaleString('vi-VN')} đ
                          </Text>{' '}
                          {selectedJarForDetail.frequency === 'daily'
                            ? 'mỗi ngày'
                            : selectedJarForDetail.frequency === 'weekly'
                            ? 'mỗi tuần'
                            : 'mỗi tháng'}
                        </Text>
                      )}
                      {selectedJarForDetail.targetDate && (
                        <Text style={[styles.goalPlanDesc, { marginTop: 4, fontSize: 13, color: '#64748B', fontWeight: '500' }]}>
                          Hạn hoàn thành: <Text style={{ fontWeight: '700', color: '#0F172A' }}>{selectedJarForDetail.targetDate}</Text>
                        </Text>
                      )}
                    </View>
                  )}
                </View>

                {/* Transaction history for this specific jar */}
                <View style={[styles.historySection, { marginTop: 16 }]}>
                  <Text style={styles.historySectionTitle}>Lịch sử giao dịch</Text>
                  {transactions.filter(t => t.jarId === selectedJarForDetail.id && !t.isPending).length === 0 ? (
                    <View style={styles.emptyHistoryBox}>
                      <Feather name="clock" size={20} color="#94A3B8" />
                      <Text style={styles.emptyHistoryText}>Chưa có giao dịch nào được ghi nhận cho hũ này.</Text>
                    </View>
                  ) : (
                    <View style={styles.historyList}>
                      {transactions
                        .filter(t => t.jarId === selectedJarForDetail.id && !t.isPending)
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
                            <Text style={[
                              styles.historyTxAmount,
                              tx.type === 'expense' && { color: '#EF4444' }
                            ]}>
                              {tx.type === 'expense' ? '-' : '+'}{tx.amount.toLocaleString('vi-VN')} đ
                            </Text>
                          </View>
                        ))}
                    </View>
                  )}
                </View>

                <TouchableOpacity 
                  style={[styles.closePopupBtn, { backgroundColor: selectedJarForDetail.color, marginTop: 16 }]} 
                  onPress={() => setDetailModalVisible(false)}
                >
                  <Text style={styles.closePopupBtnText}>Đóng</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    paddingTop: 60,
  },
  screenTitle: {
    fontSize: 28,
    fontFamily: 'SF Pro Display, system-ui, -apple-system, sans-serif',
    fontWeight: '800',
    color: '#0F172A',
    paddingHorizontal: 20,
    marginBottom: 16,
    letterSpacing: -0.6,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  jarsListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 1.0,
  },
  adjustRatiosToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  adjustRatiosToggleText: {
    color: '#0066cc',
    fontSize: 13,
    fontWeight: '600',
  },
  jarsContainer: {
    gap: 12,
    marginBottom: 24,
  },
  jarCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.02,
    shadowRadius: 16,
    elevation: 1,
  },
  jarCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  jarNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  colorBadge: {
    width: 12,
    height: 12,
    borderRadius: 4,
  },
  jarName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  jarMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  jarType: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  jarPercent: {
    fontSize: 11,
    color: '#0066cc',
    fontWeight: '600',
  },
  balanceInfo: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  jarBalance: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  jarTarget: {
    fontSize: 12,
    color: '#64748B',
  },
  progressContainer: {
    marginTop: 10,
    gap: 4,
  },
  progressBarBg: {
    backgroundColor: '#F1F5F9',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 10,
    color: '#64748B',
    textAlign: 'right',
  },
  // Ratio editor styles
  ratioCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e5e5ea',
    marginBottom: 24,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1d1d1f',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#7a7a7a',
    marginBottom: 16,
  },
  adjustersList: {
    gap: 12,
    marginBottom: 16,
  },
  adjusterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: '#f2f2f7',
  },
  adjusterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  adjusterName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1d1d1f',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f7',
    borderRadius: 8,
    padding: 3,
  },
  stepBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: '#e5e5ea',
  },
  stepperValue: {
    width: 44,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '700',
    color: '#1d1d1f',
  },
  totalFeedback: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    marginBottom: 16,
    gap: 6,
    borderWidth: 1,
  },
  totalValid: {
    backgroundColor: 'rgba(46, 204, 113, 0.08)',
    borderColor: 'rgba(46, 204, 113, 0.2)',
  },
  totalInvalid: {
    backgroundColor: 'rgba(255, 92, 92, 0.08)',
    borderColor: 'rgba(255, 92, 92, 0.2)',
  },
  totalFeedbackText: {
    fontSize: 13,
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e5e5ea',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1d1d1f',
  },
  saveBtn: {
    flex: 2,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0066cc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledBtn: {
    backgroundColor: '#a3cbff',
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  // Simulation styles
  simCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e5e5ea',
    marginBottom: 20,
  },
  simTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1d1d1f',
    marginBottom: 4,
  },
  simSubtitle: {
    fontSize: 12,
    color: '#7a7a7a',
    lineHeight: 16,
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f7',
    height: 48,
    borderRadius: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#e5e5ea',
    marginBottom: 12,
  },
  amountInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#1d1d1f',
    padding: 0,
  },
  vndTag: {
    fontWeight: '700',
    color: '#7a7a7a',
    marginLeft: 8,
  },
  sourceSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  sourceBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    height: 36,
    borderRadius: 8,
    backgroundColor: '#f5f5f7',
    gap: 4,
  },
  activeSourceBtn: {
    backgroundColor: '#1d1d1f',
  },
  sourceText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7a7a7a',
  },
  activeSourceText: {
    color: '#ffffff',
  },
  previewLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1d1d1f',
    marginBottom: 8,
  },
  previewContainer: {
    backgroundColor: '#f5f5f7',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 16,
  },
  previewItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e5e5ea',
  },
  previewLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  previewName: {
    fontSize: 12,
    color: '#1d1d1f',
    fontWeight: '500',
  },
  previewAmount: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2ecc71',
  },
  simulateBtn: {
    backgroundColor: '#0066cc',
    height: 44,
    borderRadius: 22,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  simulateBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
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
    maxHeight: '80%',
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
  miniTypeRow: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f7',
    padding: 3,
    borderRadius: 8,
    marginTop: 4,
  },
  miniTypeBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  activeMiniTypeBtn: {
    backgroundColor: '#ffffff',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  miniTypeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7a7a7a',
  },
  activeMiniTypeText: {
    color: '#1d1d1f',
  },
  percentPickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f7',
    borderRadius: 8,
    padding: 3,
    marginTop: 4,
    width: 140,
  },
  pickerStepBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: '#e5e5ea',
  },
  pickerPercentVal: {
    flex: 1,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '700',
    color: '#1d1d1f',
  },
  helpText: {
    fontSize: 11,
    color: '#7a7a7a',
    marginTop: 4,
    lineHeight: 14,
  },
  colorsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
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
  emptyJarsBox: {
    padding: 20,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e5e5ea',
    borderStyle: 'dashed',
    marginVertical: 10,
  },
  emptyJarsText: {
    fontSize: 13,
    color: '#7a7a7a',
    textAlign: 'center',
  },
  detailCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e5e5ea',
    marginBottom: 16,
  },
  detailTypeLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
    marginBottom: 16,
  },
  detailBalanceContainer: {
    backgroundColor: '#f5f5f7',
    padding: 16,
    borderRadius: 14,
    marginBottom: 16,
  },
  detailBalanceLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#7a7a7a',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  detailBalanceValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1d1d1f',
  },
  detailMetaBlock: {
    marginTop: 8,
  },
  detailMetaText: {
    fontSize: 14,
    color: '#555555',
    fontWeight: '500',
  },
  goalPlanCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  goalPlanTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  goalPlanDesc: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '500',
  },
  historySection: {
    marginTop: 16,
    marginBottom: 16,
  },
  historySectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1d1d1f',
    marginBottom: 10,
  },
  historyList: {
    gap: 10,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#f2f2f7',
  },
  historyItemLeft: {
    flex: 1,
  },
  historyTxDesc: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1d1d1f',
    marginBottom: 2,
  },
  historyTxDate: {
    fontSize: 11,
    color: '#7a7a7a',
  },
  historyTxAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#10B981',
  },
  emptyHistoryBox: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    gap: 8,
  },
  emptyHistoryText: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
  },
  closePopupBtn: {
    marginTop: 24,
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
});
