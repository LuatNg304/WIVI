import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFinancial } from '../context/FinancialContext';
import Svg, { Circle } from 'react-native-svg';
import { Feather, Ionicons } from '@expo/vector-icons';

export const DisciplineScreen: React.FC = () => {
  const {
    disciplineScore,
    streakCount,
    forecast,
    balances
  } = useFinancial();

  // SVG Circular progress constants
  const size = 120;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (disciplineScore / 100) * circumference;

  const getScoreRating = (score: number) => {
    if (score >= 90) return { label: 'Xuất sắc', color: '#2ecc71', desc: 'Bạn đang quản lý tài chính cực kỳ kỷ luật!' };
    if (score >= 80) return { label: 'Rất tốt', color: '#0066cc', desc: 'Thói quen tài chính của bạn đang rất lành mạnh.' };
    if (score >= 65) return { label: 'Khá tốt', color: '#ffb83d', desc: 'Bạn đang đi đúng hướng, cố gắng hạn chế chi tiêu thừa nhé.' };
    return { label: 'Cần cải thiện', color: '#ff5c5c', desc: 'Bạn đang chi tiêu vượt hạn mức khá nhiều. Hãy lập kế hoạch lại nhé!' };
  };

  const rating = getScoreRating(disciplineScore);

  // Hardcoded past 5 days layout for visual streak calendar
  const pastDays = [
    { day: 'T2', active: true },
    { day: 'T3', active: true },
    { day: 'T4', active: true },
    { day: 'T5', active: true },
    { day: 'T6', active: true },
    { day: 'T7', active: false },
    { day: 'CN', active: false },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.screenTitle}>Kỷ luật & Dự báo</Text>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 1. FINANCIAL DISCIPLINE SCORE */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Chỉ số Kỷ luật Tài chính</Text>
          <Text style={styles.cardSubtitle}>
            Điểm số đánh giá mức độ tuân thủ ngân sách và tiến độ tiết kiệm thực tế.
          </Text>

          <View style={styles.scoreRow}>
            {/* SVG Ring Progress */}
            <View style={styles.gaugeContainer}>
              <Svg width={size} height={size}>
                <Circle
                  stroke="#f2f2f7"
                  fill="none"
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  strokeWidth={strokeWidth}
                />
                <Circle
                  stroke={rating.color}
                  fill="none"
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  strokeWidth={strokeWidth}
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  transform={`rotate(-90 ${size / 2} ${size / 2})`}
                />
              </Svg>
              <View style={styles.gaugeTextWrapper}>
                <Text style={[styles.scoreValue, { color: rating.color }]}>
                  {disciplineScore}
                </Text>
                <Text style={styles.scoreMax}>/100</Text>
              </View>
            </View>

            {/* Score rating summary */}
            <View style={styles.scoreInfo}>
              <Text style={[styles.ratingLabel, { color: rating.color }]}>
                {rating.label}
              </Text>
              <Text style={styles.ratingDesc}>{rating.desc}</Text>
            </View>
          </View>

          {/* Breakdown items */}
          <View style={styles.factorsList}>
            <View style={styles.factorItem}>
              <View style={styles.factorLeft}>
                <Feather name="check-circle" size={16} color="#2ecc71" />
                <Text style={styles.factorName}>Tuân thủ ngân sách hũ</Text>
              </View>
              <Text style={styles.factorScore}>+30 điểm</Text>
            </View>
            <View style={styles.factorItem}>
              <View style={styles.factorLeft}>
                <Feather name="trending-up" size={16} color="#0066cc" />
                <Text style={styles.factorName}>Tiến độ mục tiêu tiết kiệm</Text>
              </View>
              <Text style={styles.factorScore}>+25 điểm</Text>
            </View>
            <View style={styles.factorItem}>
              <View style={styles.factorLeft}>
                <Feather name="zap" size={16} color="#ffb83d" />
                <Text style={styles.factorName}>Tần suất duy trì Streak</Text>
              </View>
              <Text style={styles.factorScore}>+30 điểm</Text>
            </View>
          </View>
        </View>

        {/* 2. STREAK TRACKING CARD */}
        <View style={styles.card}>
          <View style={styles.streakHeader}>
            <View style={styles.streakTitleRow}>
              <Feather name="zap" size={20} color="#ffb83d" />
              <Text style={styles.cardTitle}>Chuỗi hoạt động (Streak)</Text>
            </View>
            <Text style={styles.streakCount}>{streakCount} ngày liên tiếp 🔥</Text>
          </View>
          <Text style={styles.cardSubtitle}>
            Thành tích ghi nhận giao dịch và kiểm soát ngân sách liên tiếp hàng ngày.
          </Text>

          {/* Streak dots tracker */}
          <View style={styles.calendarRow}>
            {pastDays.map((d, index) => (
              <View key={index} style={styles.dayCol}>
                <View style={[
                  styles.dayDot,
                  d.active ? styles.dayDotActive : styles.dayDotInactive
                ]}>
                  {d.active && <Feather name="check" size={12} color="#ffffff" />}
                </View>
                <Text style={styles.dayText}>{d.day}</Text>
              </View>
            ))}
          </View>

          <View style={styles.streakFeedback}>
            <Text style={styles.streakFeedbackText}>
              Ghi thêm 1 giao dịch hoặc phân bổ hôm nay để tăng chuỗi lên ngày thứ {streakCount + 1}!
            </Text>
          </View>
        </View>

        {/* 3. AI FINANCIAL FORECAST CARD */}
        <View style={[styles.card, styles.forecastCard]}>
          <View style={styles.forecastHeader}>
            <Ionicons name="sparkles" size={18} color="#0066cc" />
            <Text style={styles.forecastTitle}>Dự báo tài chính AI</Text>
          </View>

          <View style={styles.forecastMetric}>
            <Text style={styles.metricLabel}>Dự báo Số dư cuối tháng</Text>
            <Text style={styles.metricValue}>
              {forecast.estimatedEndBalance.toLocaleString('vi-VN')} VND
            </Text>
            <Text style={styles.metricSub}>
              (Số dư hiện tại: {(balances.cash + balances.bank).toLocaleString('vi-VN')} VND)
            </Text>
          </View>

          {/* Warning messages */}
          {forecast.warnings.length > 0 && (
            <View style={styles.warningsList}>
              {forecast.warnings.map((warn, index) => (
                <View key={index} style={styles.warningItem}>
                  <Feather name="alert-triangle" size={14} color="#ff5c5c" style={{ marginTop: 2 }} />
                  <Text style={styles.warningText}>{warn}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Recommendations list */}
          <Text style={styles.recListTitle}>Đề xuất điều chỉnh từ Trí tuệ nhân tạo:</Text>
          <View style={styles.recsList}>
            {forecast.recommendations.map((rec, index) => (
              <View key={index} style={styles.recItem}>
                <Ionicons name="bulb-outline" size={14} color="#0066cc" style={{ marginTop: 2 }} />
                <Text style={styles.recText}>{rec}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Space at bottom for floating nav */}
        <View style={{ height: 90 }} />
      </ScrollView>
    </SafeAreaView>
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
  scrollContent: {
    paddingHorizontal: 20,
    gap: 16,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#f1f5f9', // Slate border
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.02,
    shadowRadius: 16,
    elevation: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#64748B', // Slate 500
    lineHeight: 16,
    marginBottom: 16,
  },
  // Score indicator
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 20,
  },
  gaugeContainer: {
    position: 'relative',
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gaugeTextWrapper: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreValue: {
    fontSize: 32,
    fontFamily: 'SF Pro Display, system-ui, -apple-system, sans-serif',
    fontWeight: '800',
  },
  scoreMax: {
    fontSize: 11,
    color: '#7a7a7a',
    fontWeight: '600',
    marginTop: -2,
  },
  scoreInfo: {
    flex: 1,
    gap: 4,
  },
  ratingLabel: {
    fontSize: 20,
    fontWeight: '700',
  },
  ratingDesc: {
    fontSize: 13,
    color: '#333333',
    lineHeight: 18,
  },
  factorsList: {
    backgroundColor: '#f5f5f7',
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  factorItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  factorLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  factorName: {
    fontSize: 13,
    color: '#1d1d1f',
    fontWeight: '500',
  },
  factorScore: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1d1d1f',
  },
  // Streak Calendar styles
  streakHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  streakTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  streakCount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffb83d',
  },
  calendarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    marginVertical: 12,
  },
  dayCol: {
    alignItems: 'center',
    gap: 6,
  },
  dayDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayDotActive: {
    backgroundColor: '#ffb83d',
  },
  dayDotInactive: {
    backgroundColor: '#f2f2f7',
    borderWidth: 1,
    borderColor: '#e5e5ea',
  },
  dayText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#7a7a7a',
  },
  streakFeedback: {
    backgroundColor: 'rgba(255, 184, 61, 0.05)',
    borderColor: 'rgba(255, 184, 61, 0.2)',
    borderWidth: 1,
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  streakFeedbackText: {
    fontSize: 12,
    color: '#d35400',
    fontWeight: '500',
    textAlign: 'center',
  },
  // Forecast styles
  forecastCard: {
    borderColor: 'rgba(0, 102, 204, 0.15)',
    shadowColor: '#0066cc',
    shadowOpacity: 0.02,
  },
  forecastHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  forecastTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0066cc',
    letterSpacing: 0.5,
  },
  forecastMetric: {
    backgroundColor: 'rgba(0, 102, 204, 0.04)',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 0.5,
    borderColor: 'rgba(0, 102, 204, 0.1)',
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7a7a7a',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 22,
    fontFamily: 'SF Pro Display, system-ui, -apple-system, sans-serif',
    fontWeight: '800',
    color: '#0066cc',
    marginBottom: 2,
  },
  metricSub: {
    fontSize: 10,
    color: '#7a7a7a',
  },
  warningsList: {
    marginBottom: 16,
    gap: 8,
  },
  warningItem: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 92, 92, 0.06)',
    padding: 10,
    borderRadius: 8,
    gap: 8,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 92, 92, 0.15)',
  },
  warningText: {
    fontSize: 12.5,
    color: '#c0392b',
    flex: 1,
    lineHeight: 16,
  },
  recListTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1d1d1f',
    marginBottom: 8,
  },
  recsList: {
    gap: 8,
  },
  recItem: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
  },
  recText: {
    fontSize: 12.5,
    color: '#333333',
    flex: 1,
    lineHeight: 18,
  },
});
