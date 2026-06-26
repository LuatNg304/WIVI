import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useFinancial } from '../context/FinancialContext';

export const WaveChart: React.FC = () => {
  const { transactions } = useFinancial();

  // Filter out pending transactions
  const activeTransactions = transactions.filter(t => !t.isPending);

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  // Determine which month/year to show.
  // Default to current calendar month. If no transactions exist, check if there's any historical month.
  let targetMonth = currentMonth;
  let targetYear = currentYear;

  const currentMonthHasData = activeTransactions.some(t => {
    const d = new Date(t.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  if (!currentMonthHasData && activeTransactions.length > 0) {
    // Sort transactions by date descending to find the latest month with data
    const sortedTxs = [...activeTransactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const latestDate = new Date(sortedTxs[0].date);
    targetMonth = latestDate.getMonth();
    targetYear = latestDate.getFullYear();
  }

  const monthTransactions = activeTransactions.filter(t => {
    const d = new Date(t.date);
    return d.getMonth() === targetMonth && d.getFullYear() === targetYear;
  });

  // Target days representing x-axis labels: 1, 5, 10, 15, 20, 25, 30
  const milestones = [1, 5, 10, 15, 20, 25, 30];

  // Calculate cumulative sums for income and expenses
  const incomePoints = milestones.map(day => {
    return monthTransactions
      .filter(t => t.type === 'income' && new Date(t.date).getDate() <= day)
      .reduce((sum, t) => sum + t.amount, 0);
  });

  const expensePoints = milestones.map(day => {
    return monthTransactions
      .filter(t => t.type === 'expense' && !t.isTransfer && new Date(t.date).getDate() <= day)
      .reduce((sum, t) => sum + t.amount, 0);
  });

  const totalIncome = incomePoints[incomePoints.length - 1];
  const totalExpense = expensePoints[expensePoints.length - 1];

  // If there's no data at all, provide a nice visual default curve instead of blank lines
  const hasData = totalIncome > 0 || totalExpense > 0;
  const displayIncomePoints = hasData ? incomePoints : [0, 5000000, 10000000, 12000000, 15000000, 15000000, 15000000];
  const displayExpensePoints = hasData ? expensePoints : [0, 1000000, 3000000, 4500000, 5300000, 5500000, 5800000];

  const maxVal = Math.max(...displayIncomePoints, ...displayExpensePoints, 1000000);

  // SVG coordinates: viewBox is 370 x 110.
  // x-coords: 15, 70, 125, 180, 235, 290, 345 (spaced by 55)
  // y-coords: scale values between y = 20 (max) and y = 90 (min)
  const incomeCoords = displayIncomePoints.map((val, idx) => ({
    x: 15 + idx * 55,
    y: 90 - (val / maxVal) * 65
  }));

  const expenseCoords = displayExpensePoints.map((val, idx) => ({
    x: 15 + idx * 55,
    y: 90 - (val / maxVal) * 65
  }));

  // Catmull-Rom to Cubic Bezier path generator
  const getBezierPath = (points: { x: number; y: number }[]) => {
    if (points.length === 0) return '';
    let d = `M ${points[0].x},${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i - 1] || points[i];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2] || p2;
      
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;
      
      d += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
    }
    return d;
  };

  const incomeLinePath = getBezierPath(incomeCoords);
  const incomeAreaPath = incomeLinePath ? `${incomeLinePath} L 345,90 L 15,90 Z` : '';

  const expenseLinePath = getBezierPath(expenseCoords);
  const expenseAreaPath = expenseLinePath ? `${expenseLinePath} L 345,90 L 15,90 Z` : '';



  const displayIncomeTotal = hasData ? totalIncome : 0;
  const displayExpenseTotal = hasData ? totalExpense : 0;



  const displayMonthName = `Tháng ${targetMonth + 1}`;

  return (
    <View style={styles.chartContainer}>
      {/* Sleek Legend at the top of the chart */}
      <View style={styles.legendRow}>
        <Text style={styles.monthLabel}>{displayMonthName}</Text>
        
        <View style={styles.legendItems}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#3be2b0' }]} />
            <Text style={styles.legendText}>Tiền vào: </Text>
            <Text style={[styles.legendValue, { color: '#3be2b0' }]}>
              {displayIncomeTotal.toLocaleString('vi-VN')} VNĐ
            </Text>
          </View>
          
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#ff5c5c' }]} />
            <Text style={styles.legendText}>Tiền ra: </Text>
            <Text style={[styles.legendValue, { color: '#ff5c5c' }]}>
              {displayExpenseTotal.toLocaleString('vi-VN')} VNĐ
            </Text>
          </View>
        </View>
      </View>

      <Svg height="110" width="100%" viewBox="0 0 370 110" style={styles.svg}>
        <Defs>
          {/* Income Gradients */}
          <LinearGradient id="incomeStroke" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0%" stopColor="#3be2b0" stopOpacity="0.8" />
            <Stop offset="100%" stopColor="#3be2b0" stopOpacity="1" />
          </LinearGradient>
          <LinearGradient id="incomeFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#3be2b0" stopOpacity="0.2" />
            <Stop offset="100%" stopColor="#3be2b0" stopOpacity="0" />
          </LinearGradient>

          {/* Expense Gradients */}
          <LinearGradient id="expenseStroke" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0%" stopColor="#ff5c5c" stopOpacity="0.8" />
            <Stop offset="100%" stopColor="#ff5c5c" stopOpacity="1" />
          </LinearGradient>
          <LinearGradient id="expenseFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#ff5c5c" stopOpacity="0.2" />
            <Stop offset="100%" stopColor="#ff5c5c" stopOpacity="0" />
          </LinearGradient>
        </Defs>

        {/* --- INCOME WAVE (Tiền vào) --- */}
        {hasData && incomeAreaPath ? (
          <Path d={incomeAreaPath} fill="url(#incomeFill)" />
        ) : null}
        {hasData && incomeLinePath ? (
          <Path
            d={incomeLinePath}
            fill="none"
            stroke="url(#incomeStroke)"
            strokeWidth="3"
            strokeLinecap="round"
          />
        ) : null}

        {/* --- EXPENSE WAVE (Tiền ra) --- */}
        {hasData && expenseAreaPath ? (
          <Path d={expenseAreaPath} fill="url(#expenseFill)" />
        ) : null}
        {hasData && expenseLinePath ? (
          <Path
            d={expenseLinePath}
            fill="none"
            stroke="url(#expenseStroke)"
            strokeWidth="3"
            strokeLinecap="round"
          />
        ) : null}

        {/* Income Nodes */}
        {hasData && incomeCoords.map((pt, i) => (
          <Circle key={`in-node-${i}`} cx={pt.x} cy={pt.y} r="3.5" fill="#ffffff" stroke="#3be2b0" strokeWidth="1.5" />
        ))}

        {/* Expense Nodes */}
        {hasData && expenseCoords.map((pt, i) => (
          <Circle key={`out-node-${i}`} cx={pt.x} cy={pt.y} r="3.5" fill="#ffffff" stroke="#ff5c5c" strokeWidth="1.5" />
        ))}
      </Svg>



      {!hasData && (
        <View style={styles.emptyStateContainer}>
          <Text style={styles.emptyStateText}>Chưa có giao dịch trong tháng này</Text>
        </View>
      )}

      {/* X Axis labels (Timeline 1, 5, 10, 15, 20, 25, 30) */}
      <View style={styles.xAxis}>
        <Text style={styles.axisLabel}>1</Text>
        <Text style={styles.axisLabel}>5</Text>
        <Text style={styles.axisLabel}>10</Text>
        <Text style={styles.axisLabel}>15</Text>
        <Text style={styles.axisLabel}>20</Text>
        <Text style={styles.axisLabel}>25</Text>
        <Text style={styles.axisLabel}>30</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  chartContainer: {
    height: 165,
    width: '100%',
    position: 'relative',
    marginTop: 4,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  monthLabel: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  legendItems: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 4,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  legendText: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '500',
  },
  legendValue: {
    fontSize: 11,
    fontWeight: '700',
  },
  svg: {
    overflow: 'visible',
  },
  floatingLabel: {
    position: 'absolute',
    fontSize: 10,
    fontFamily: 'SF Pro Text, system-ui, -apple-system, sans-serif',
    fontWeight: '700',
    transform: [{ translateX: -15 }],
  },
  xAxis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  axisLabel: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 11,
    fontFamily: 'SF Pro Text, system-ui, -apple-system, sans-serif',
    fontWeight: '600',
  },
  emptyStateContainer: {
    position: 'absolute',
    top: 40,
    left: 0,
    right: 0,
    bottom: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyStateText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '500',
  },
});
