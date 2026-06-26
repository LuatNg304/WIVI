import React, { createContext, useState, useContext, useEffect } from 'react';
import { Alert } from 'react-native';

// Types
export interface Jar {
  id: string;
  name: string;
  type: 'spend' | 'save'; // 'spend' for essential expenses, 'save' for goal funds
  allocationPercent: number; // percentage of incoming income allocated to this jar
  balance: number;
  targetAmount?: number; // target amount (only for goals like MacBook Fund)
  color: string;
  frequency?: 'daily' | 'weekly' | 'monthly';
  frequencyAmount?: number;
  targetDate?: string;
}

export interface Transaction {
  id: string;
  amount: number;
  type: 'income' | 'expense';
  description: string;
  date: string; // ISO string
  jarId: string; // Associated jar ID
  isPending?: boolean; // If waiting for user AI confirmation
  confidence?: number; // AI confidence score (0-1)
  suggestedJarId?: string; // AI proposed jar ID if pending
  isTransfer?: boolean; // True if it is an internal transfer between jars/goals
  source?: 'cash' | 'bank'; // Source of funds: 'cash' or 'bank'
}

export interface AlertNotification {
  id: string;
  title: string;
  message: string;
  date: string;
  type: 'info' | 'warning' | 'danger';
  read: boolean;
}

export interface FinancialContextType {
  hasCompletedSetup: boolean;
  userName: string;
  monthlyIncomeGoal: number;
  balances: {
    cash: number;
    bank: number;
  };
  jars: Jar[];
  transactions: Transaction[];
  alerts: AlertNotification[];
  disciplineScore: number;
  streakCount: number;
  streakHistory: string[]; // List of YYYY-MM-DD dates with actions
  forecast: {
    estimatedEndBalance: number;
    warnings: string[];
    recommendations: string[];
  };
  completeSetup: (
    name: string,
    initialCash: number,
    initialBank: number,
    jarsSetup: { id: string; name: string; type: 'spend' | 'save'; percent: number; target?: number; color: string }[]
  ) => void;
  addTransaction: (
    amount: number,
    type: 'income' | 'expense',
    description: string,
    jarId: string,
    isPending?: boolean,
    confidence?: number
  ) => void;
  confirmPendingTransaction: (id: string, jarId: string) => void;
  deletePendingTransaction: (id: string) => void;
  recategorizeTransaction: (transactionId: string, newJarId: string) => void;
  fundGoal: (goalId: string, sourceJarId: string, amount: number) => boolean;
  withdrawFromGoal: (goalId: string, targetJarId: string, amount: number) => boolean;
  updateJarRatios: (ratios: { id: string; percent: number }[]) => boolean;
  addJar: (
    name: string,
    type: 'spend' | 'save',
    percent: number,
    target: number,
    color: string,
    frequency?: 'daily' | 'weekly' | 'monthly',
    frequencyAmount?: number,
    targetDate?: string
  ) => boolean;
  deleteJar: (id: string) => void;
  runIncomeAllocation: (amount: number, source: 'cash' | 'bank') => void;
  runOCRBillScan: (billName: string, amount: number) => Promise<Transaction>;
  runBankSync: () => Promise<number>;
  clearAlerts: () => void;
  markAlertAsRead: (id: string) => void;
}

const FinancialContext = createContext<FinancialContextType | undefined>(undefined);

// Initial default jars - goals have 0% allocation, spend jars split 100% (70% and 30%)
const DEFAULT_JARS: Jar[] = [
  { id: '1', name: 'Chi tiêu thiết yếu', type: 'spend', allocationPercent: 70, balance: 12000000, color: '#0066cc' },
  { id: '2', name: 'MacBook Fund', type: 'save', allocationPercent: 0, balance: 15000000, targetAmount: 20000000, color: '#3be2b0', frequency: 'weekly', frequencyAmount: 500000, targetDate: '15/12/2026' },
  { id: '3', name: 'Emergency Fund', type: 'save', allocationPercent: 0, balance: 700000, targetAmount: 1666000, color: '#ff5c5c', frequency: 'monthly', frequencyAmount: 100000, targetDate: '30/09/2026' },
  { id: '4', name: 'Travel Fund', type: 'save', allocationPercent: 0, balance: 2000000, targetAmount: 2222000, color: '#ffb83d', frequency: 'weekly', frequencyAmount: 150000, targetDate: '15/11/2026' },
  { id: '5', name: 'Giáo dục & Giải trí', type: 'spend', allocationPercent: 30, balance: 5000000, color: '#9b59b6' },
];

export const FinancialProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [hasCompletedSetup, setHasCompletedSetup] = useState<boolean>(false);
  const [userName, setUserName] = useState<string>('Người dùng WIBI');
  const [monthlyIncomeGoal, setMonthlyIncomeGoal] = useState<number>(30000000);
  const [balances, setBalances] = useState({ cash: 35000000, bank: 100000000 }); // Total: 135,000,000 VND
  const [jars, setJars] = useState<Jar[]>(DEFAULT_JARS);
  const [transactions, setTransactions] = useState<Transaction[]>([
    { id: 't1', amount: 15000000, type: 'income', description: 'Nhận lương tháng 10', date: new Date(2026, 9, 5).toISOString(), jarId: '1' },
    { id: 't2', amount: 5000000, type: 'expense', description: 'Mua sắm thiết bị học tập', date: new Date(2026, 9, 6).toISOString(), jarId: '5' },
    { id: 't3', amount: 300000, type: 'expense', description: 'Ăn tối nhà hàng', date: new Date(2026, 9, 6).toISOString(), jarId: '1' },
    { id: 'tp1', amount: 120000, type: 'expense', description: 'Grab Bike di chuyển', date: new Date().toISOString(), jarId: '1', isPending: true, confidence: 0.65, suggestedJarId: '1' },
    { id: 'tp2', amount: 450000, type: 'expense', description: 'Xem phim và bắp nước CGV', date: new Date().toISOString(), jarId: '5', isPending: true, confidence: 0.58, suggestedJarId: '5' }
  ]);

  const [alerts, setAlerts] = useState<AlertNotification[]>([
    {
      id: 'a1',
      title: 'Chào mừng bạn đến với WIBI!',
      message: 'Thiết lập ngân sách thành công. Hệ thống hũ tài chính đã sẵn sàng.',
      date: new Date().toISOString(),
      type: 'info',
      read: false
    }
  ]);

  const [disciplineScore, setDisciplineScore] = useState<number>(85);
  const [streakCount, setStreakCount] = useState<number>(5);
  const [streakHistory, setStreakHistory] = useState<string[]>([
    new Date(2026, 9, 15).toISOString().split('T')[0],
    new Date(2026, 9, 16).toISOString().split('T')[0],
    new Date(2026, 9, 17).toISOString().split('T')[0],
    new Date(2026, 9, 18).toISOString().split('T')[0],
    new Date(2026, 9, 19).toISOString().split('T')[0],
  ]);

  const [forecast, setForecast] = useState({
    estimatedEndBalance: 142500000,
    warnings: [] as string[],
    recommendations: [] as string[]
  });

  // Calculate dynamic discipline score and forecast based on transactions and jars
  useEffect(() => {
    // 1. Calculate discipline score
    let baseScore = 80;
    
    // Check budget adherence (if expense on spend jars exceeds 80% of current allocations)
    const spendJars = jars.filter(j => j.type === 'spend');
    let overBudgetJars = 0;
    spendJars.forEach(jar => {
      // Find total expense on this jar
      const jarExpenses = transactions
        .filter(t => !t.isPending && t.type === 'expense' && !t.isTransfer && t.jarId === jar.id)
        .reduce((sum, t) => sum + t.amount, 0);

      if (jar.balance < 500000) {
        overBudgetJars++;
      }
    });

    baseScore -= overBudgetJars * 10;
    baseScore += Math.min(streakCount * 2, 15); // reward consistency

    // Check if savings goals are updated
    const saveJars = jars.filter(j => j.type === 'save');
    const avgSavingsProgress = saveJars.length > 0 
      ? saveJars.reduce((sum, j) => sum + (j.targetAmount ? (j.balance / j.targetAmount) : 0), 0) / saveJars.length
      : 0;

    baseScore += Math.floor(avgSavingsProgress * 15);
    setDisciplineScore(Math.min(Math.max(baseScore, 30), 100));

    // 2. Generate Warnings and Forecasts
    const currentTotalBalance = balances.cash + balances.bank;
    
    const currentMonthExpenses = transactions
      .filter(t => !t.isPending && t.type === 'expense' && !t.isTransfer && new Date(t.date).getMonth() === new Date().getMonth())
      .reduce((sum, t) => sum + t.amount, 0);

    const projectedEnd = currentTotalBalance + (monthlyIncomeGoal * 0.5) - currentMonthExpenses;
    
    const warnings: string[] = [];
    const recommendations: string[] = [];

    if (currentMonthExpenses > monthlyIncomeGoal * 0.7) {
      warnings.push('Cảnh báo: Tốc độ chi tiêu của bạn quá nhanh! Nguy cơ vượt ngân sách trước cuối tháng.');
      recommendations.push('Lời khuyên: Tạm dừng các hoạt động Giải trí và mua sắm không thiết yếu trong 7 ngày tới.');
    } else {
      recommendations.push('Lời khuyên: Bạn đang kiểm soát chi tiêu rất tốt. Hãy duy trì thói quen này để đạt điểm kỷ luật cao hơn.');
    }

    saveJars.forEach(j => {
      if (j.targetAmount && j.balance >= j.targetAmount) {
        recommendations.push(`Chúc mừng! Bạn đã hoàn thành mục tiêu tiết kiệm cho hũ "${j.name}". Hãy chuyển hũ này sang mục tiêu mới.`);
      } else if (j.targetAmount && (j.balance / j.targetAmount) < 0.2) {
        warnings.push(`Hũ tiết kiệm "${j.name}" của bạn tiến triển khá chậm (${Math.floor((j.balance / j.targetAmount) * 100)}%).`);
        recommendations.push(`Lời khuyên: Trích thêm 5% từ hũ Giải trí để bổ sung cho quỹ "${j.name}".`);
      }
    });

    setForecast({
      estimatedEndBalance: Math.max(projectedEnd, 0),
      warnings,
      recommendations
    });

  }, [jars, transactions, streakCount, balances, monthlyIncomeGoal]);

  // Actions
  const completeSetup = (
    name: string,
    initialCash: number,
    initialBank: number,
    jarsSetup: { id: string; name: string; type: 'spend' | 'save'; percent: number; target?: number; color: string }[]
  ) => {
    setUserName(name);
    setBalances({ cash: initialCash, bank: initialBank });
    
    // Map setup jars to standard Jars
    const formattedJars: Jar[] = jarsSetup.map(j => ({
      id: j.id,
      name: j.name,
      type: j.type,
      allocationPercent: j.percent,
      balance: j.type === 'save' ? 0 : (initialCash + initialBank) * (j.percent / 100), // allocate starting amount
      targetAmount: j.target,
      color: j.color
    }));
    
    setJars(formattedJars);
    setTransactions([]); // Reset ledger for custom start
    setAlerts([
      {
        id: 'a_welcome',
        title: 'Thiết lập thành công!',
        message: `Chào mừng ${name} đến với WIBI. Các hũ tài chính của bạn đã sẵn sàng.`,
        date: new Date().toISOString(),
        type: 'info',
        read: false
      }
    ]);
    setHasCompletedSetup(true);
  };

  const addAlert = (title: string, message: string, type: 'info' | 'warning' | 'danger') => {
    const newAlert: AlertNotification = {
      id: Math.random().toString(),
      title,
      message,
      date: new Date().toISOString(),
      type,
      read: false
    };
    setAlerts(prev => [newAlert, ...prev]);
  };

  const addTransaction = (
    amount: number,
    type: 'income' | 'expense',
    description: string,
    jarId: string,
    isPending = false,
    confidence = 1.0
  ) => {
    const transactionId = 't_' + Math.random().toString(36).substr(2, 9);
    const newTransaction: Transaction = {
      id: transactionId,
      amount,
      type,
      description,
      date: new Date().toISOString(),
      jarId,
      isPending,
      confidence,
      suggestedJarId: isPending ? jarId : undefined,
      source: 'cash' // Manual transaction is always cash
    };

    setTransactions(prev => [newTransaction, ...prev]);

    if (!isPending) {
      applyTransactionEffects(amount, type, jarId, 'cash');
    }
  };

  const applyTransactionEffects = (amount: number, type: 'income' | 'expense', jarId: string, source: 'cash' | 'bank' = 'bank') => {
    setJars(prevJars =>
      prevJars.map(jar => {
        if (jar.id === jarId) {
          if (jar.type === 'save') return jar;
          const newBalance = type === 'income' 
            ? jar.balance + amount 
            : jar.balance - amount;
          
          if (type === 'expense' && jar.type === 'spend' && newBalance < 200000) {
            addAlert(
              `Cảnh báo ngân sách: ${jar.name}`,
              `Số dư hũ "${jar.name}" của bạn chỉ còn ${newBalance.toLocaleString('vi-VN')} VND. Hãy cân nhắc cắt giảm chi tiêu.`,
              'warning'
            );
          }
          return { ...jar, balance: Math.max(newBalance, 0) };
        }
        return jar;
      })
    );

    setBalances(prev => {
      const isBank = source === 'bank';
      const change = type === 'income' ? amount : -amount;
      return {
        cash: isBank ? prev.cash : prev.cash + change,
        bank: isBank ? prev.bank + change : prev.bank
      };
    });

    updateStreakForToday();
  };

  const confirmPendingTransaction = (id: string, jarId: string) => {
    setTransactions(prev =>
      prev.map(t => {
        if (t.id === id) {
          applyTransactionEffects(t.amount, t.type, jarId);
          return { ...t, isPending: false, jarId, confidence: 1.0 };
        }
        return t;
      })
    );

    addAlert(
      'Giao dịch được xác nhận',
      `Đã phân loại thành công giao dịch vào hũ "${jars.find(j => j.id === jarId)?.name || 'Chưa rõ'}".`,
      'info'
    );
  };

  const deletePendingTransaction = (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  const recategorizeTransaction = (transactionId: string, newJarId: string) => {
    setTransactions(prev =>
      prev.map(t => {
        if (t.id === transactionId) {
          const oldJarId = t.jarId;
          if (oldJarId === newJarId) return t;

          // Adjust Jar balances
          setJars(prevJars =>
            prevJars.map(jar => {
              if (jar.type === 'save') return jar;
              let balanceChange = 0;
              
              if (t.type === 'expense') {
                if (jar.id === oldJarId) {
                  balanceChange = t.amount; // refund old jar
                } else if (jar.id === newJarId) {
                  balanceChange = -t.amount; // charge new jar
                }
              } else if (t.type === 'income') {
                if (jar.id === oldJarId) {
                  balanceChange = -t.amount; // subtract from old jar
                } else if (jar.id === newJarId) {
                  balanceChange = t.amount; // add to new jar
                }
              }

              if (balanceChange !== 0) {
                return { ...jar, balance: Math.max(jar.balance + balanceChange, 0) };
              }
              return jar;
            })
          );

          addAlert(
            'Chuyển danh mục thành công',
            `Đã chuyển giao dịch "${t.description}" sang hũ "${jars.find(j => j.id === newJarId)?.name || 'Mới'}".`,
            'info'
          );

          return { ...t, jarId: newJarId, suggestedJarId: undefined, confidence: 1.0 };
        }
        return t;
      })
    );
  };

  const fundGoal = (goalId: string, sourceJarId: string, amount: number): boolean => {
    const sourceJar = jars.find(j => j.id === sourceJarId);
    const goalJar = jars.find(j => j.id === goalId);
    
    if (!sourceJar || !goalJar) return false;
    if (sourceJar.balance < amount) {
      Alert.alert('Không đủ số dư', `Hũ nguồn "${sourceJar.name}" chỉ còn ${sourceJar.balance.toLocaleString('vi-VN')} VND, không đủ để nộp ${amount.toLocaleString('vi-VN')} VND.`);
      return false;
    }

    // 1. Subtract from source jar, add to goal jar
    setJars(prevJars =>
      prevJars.map(jar => {
        if (jar.id === sourceJarId) {
          return { ...jar, balance: jar.balance - amount };
        }
        if (jar.id === goalId) {
          return { ...jar, balance: jar.balance + amount };
        }
        return jar;
      })
    );

    // 2. Add transfer transactions to list
    const dateStr = new Date().toISOString();
    const txExpenseId = 't_tr_exp_' + Math.random().toString(36).substr(2, 9);
    const txIncomeId = 't_tr_inc_' + Math.random().toString(36).substr(2, 9);

    const expenseTx: Transaction = {
      id: txExpenseId,
      amount,
      type: 'expense',
      description: `Trích nộp quỹ: ${goalJar.name}`,
      date: dateStr,
      jarId: sourceJarId,
      confidence: 1.0,
      isTransfer: true
    };

    const incomeTx: Transaction = {
      id: txIncomeId,
      amount,
      type: 'income',
      description: `Nhận nộp từ hũ: ${sourceJar.name}`,
      date: dateStr,
      jarId: goalId,
      confidence: 1.0,
      isTransfer: true
    };

    setTransactions(prev => [expenseTx, incomeTx, ...prev]);

    addAlert(
      'Cập nhật Goal thành công',
      `Đã chuyển ${amount.toLocaleString('vi-VN')} VND từ hũ "${sourceJar.name}" sang quỹ "${goalJar.name}".`,
      'info'
    );

    return true;
  };
 
  const withdrawFromGoal = (goalId: string, targetJarId: string, amount: number): boolean => {
    const goalJar = jars.find(j => j.id === goalId);
    const targetJar = jars.find(j => j.id === targetJarId);
 
    if (!goalJar || !targetJar) return false;
    if (goalJar.balance < amount) {
      Alert.alert('Không đủ số dư', `Hũ tiết kiệm "${goalJar.name}" chỉ còn ${goalJar.balance.toLocaleString('vi-VN')} VND, không đủ để rút ${amount.toLocaleString('vi-VN')} VND.`);
      return false;
    }
 
    // 1. Subtract from goal jar, add to target spend jar
    setJars(prevJars =>
      prevJars.map(jar => {
        if (jar.id === goalId) {
          return { ...jar, balance: jar.balance - amount };
        }
        if (jar.id === targetJarId) {
          return { ...jar, balance: jar.balance + amount };
        }
        return jar;
      })
    );
 
    // 2. Add transfer transactions to list
    const dateStr = new Date().toISOString();
    const txExpenseId = 't_wd_exp_' + Math.random().toString(36).substr(2, 9);
    const txIncomeId = 't_wd_inc_' + Math.random().toString(36).substr(2, 9);
 
    const expenseTx: Transaction = {
      id: txExpenseId,
      amount,
      type: 'expense',
      description: `Rút tiền từ quỹ: ${goalJar.name}`,
      date: dateStr,
      jarId: goalId,
      confidence: 1.0,
      isTransfer: true
    };
 
    const incomeTx: Transaction = {
      id: txIncomeId,
      amount,
      type: 'income',
      description: `Nhận rút từ hũ: ${goalJar.name}`,
      date: dateStr,
      jarId: targetJarId,
      confidence: 1.0,
      isTransfer: true
    };
 
    setTransactions(prev => [expenseTx, incomeTx, ...prev]);
 
    addAlert(
      'Rút tiền hũ thành công',
      `Đã rút ${amount.toLocaleString('vi-VN')} VND từ hũ mục tiêu "${goalJar.name}" chuyển sang hũ chi tiêu "${targetJar.name}".`,
      'info'
    );
 
    return true;
  };

  const updateJarRatios = (ratios: { id: string; percent: number }[]) => {
    const total = ratios.reduce((sum, r) => sum + r.percent, 0);
    if (total !== 100) return false;

    setJars(prevJars =>
      prevJars.map(jar => {
        const match = ratios.find(r => r.id === jar.id);
        if (match) {
          return { ...jar, allocationPercent: match.percent };
        }
        return jar;
      })
    );

    addAlert(
      'Cập nhật tỷ lệ hũ tài chính',
      'Tỷ lệ phân bổ thu nhập tự động mới đã được lưu thành công.',
      'info'
    );
    return true;
  };

  const addJar = (
    name: string,
    type: 'spend' | 'save',
    percent: number,
    target: number,
    color: string,
    frequency?: 'daily' | 'weekly' | 'monthly',
    frequencyAmount?: number,
    targetDate?: string
  ) => {
    const newJar: Jar = {
      id: Math.random().toString(),
      name,
      type,
      allocationPercent: type === 'save' ? 0 : percent, // saving jars always have 0% allocation
      balance: 0,
      targetAmount: type === 'save' ? target : undefined,
      color,
      frequency: type === 'save' ? frequency : undefined,
      frequencyAmount: type === 'save' ? frequencyAmount : undefined,
      targetDate: type === 'save' ? targetDate : undefined
    };

    if (type === 'spend' && percent > 0) {
      const remainingToDistribute = 100 - percent;
      const originalTotalPercent = jars.filter(j => j.type === 'spend').reduce((sum, j) => sum + j.allocationPercent, 0) || 1;
      
      const rebalancedJars = jars.map(j => {
        if (j.type === 'spend') {
          return {
            ...j,
            allocationPercent: Math.round((j.allocationPercent / originalTotalPercent) * remainingToDistribute)
          };
        }
        return j;
      });

      const currentSum = rebalancedJars.filter(j => j.type === 'spend').reduce((sum, j) => sum + j.allocationPercent, 0) + percent;
      if (currentSum !== 100) {
        const firstSpend = rebalancedJars.find(j => j.type === 'spend');
        if (firstSpend) {
          firstSpend.allocationPercent += (100 - currentSum);
        }
      }

      setJars([...rebalancedJars, newJar]);
    } else {
      setJars(prev => [...prev, newJar]);
    }

    addAlert('Tạo hũ tài chính mới', `Đã tạo thành công quỹ "${name}".`, 'info');
    return true;
  };

  const deleteJar = (id: string) => {
    const jarToDelete = jars.find(j => j.id === id);
    if (!jarToDelete) return;

    const percentToDistribute = jarToDelete.allocationPercent;
    const remainingJars = jars.filter(j => j.id !== id);

    if (jarToDelete.type === 'spend' && percentToDistribute > 0 && remainingJars.filter(j => j.type === 'spend').length > 0) {
      const remainingSpend = remainingJars.filter(j => j.type === 'spend');
      const originalTotal = remainingSpend.reduce((sum, j) => sum + j.allocationPercent, 0) || 1;
      
      const updatedJars = remainingJars.map(j => {
        if (j.type === 'spend') {
          return {
            ...j,
            allocationPercent: j.allocationPercent + Math.round((j.allocationPercent / originalTotal) * percentToDistribute)
          };
        }
        return j;
      });

      const currentSum = updatedJars.filter(j => j.type === 'spend').reduce((sum, j) => sum + j.allocationPercent, 0);
      if (currentSum !== 100) {
        const firstSpend = updatedJars.find(j => j.type === 'spend');
        if (firstSpend) {
          firstSpend.allocationPercent += (100 - currentSum);
        }
      }
      setJars(updatedJars);
    } else {
      setJars(remainingJars);
    }

    addAlert('Xóa hũ tài chính', `Đã xóa hũ "${jarToDelete.name}". Tỷ lệ phân bổ được phân chia lại.`, 'info');
  };

  const runIncomeAllocation = (amount: number, source: 'cash' | 'bank') => {
    const updatedJars = jars.map(jar => {
      const jarShare = Math.round(amount * (jar.allocationPercent / 100));
      return {
        ...jar,
        balance: jar.balance + jarShare
      };
    });

    setJars(updatedJars);

    setBalances(prev => ({
      cash: source === 'cash' ? prev.cash + amount : prev.cash,
      bank: source === 'bank' ? prev.bank + amount : prev.bank
    }));

    const transactionId = 't_' + Math.random().toString(36).substr(2, 9);
    const newTransaction: Transaction = {
      id: transactionId,
      amount,
      type: 'income',
      description: 'Nhập thu nhập phân bổ tự động',
      date: new Date().toISOString(),
      jarId: jars.find(j => j.type === 'spend')?.id || '1'
    };

    setTransactions(prev => [newTransaction, ...prev]);

    const details = updatedJars
      .filter(j => j.allocationPercent > 0)
      .map(j => `- ${j.name}: +${Math.round(amount * (j.allocationPercent / 100)).toLocaleString('vi-VN')} VND (${j.allocationPercent}%)`)
      .join('\n');

    addAlert(
      'Phân bổ thu nhập tự động',
      `Số tiền ${amount.toLocaleString('vi-VN')} VND đã được tự động chia vào các hũ:\n${details}`,
      'info'
    );

    updateStreakForToday();
  };

  const runOCRBillScan = async (billName: string, amount: number): Promise<Transaction> => {
    await new Promise(resolve => setTimeout(resolve, 2000));

    let suggestedJarId = '1'; 
    let confidence = 0.95;

    const lowerName = billName.toLowerCase();
    if (lowerName.includes('cgv') || lowerName.includes('cinema') || lowerName.includes('cafe') || lowerName.includes('phim') || lowerName.includes('starbucks')) {
      suggestedJarId = '5'; 
      confidence = 0.88;
    } else if (lowerName.includes('sách') || lowerName.includes('tiki') || lowerName.includes('học phí') || lowerName.includes('coursera') || lowerName.includes('udemy')) {
      suggestedJarId = '5'; 
      confidence = 0.92;
    } else if (lowerName.includes('macbook') || lowerName.includes('apple') || lowerName.includes('iphone') || lowerName.includes('tiết kiệm')) {
      suggestedJarId = '5'; // Giáo dục & Giải trí (spending jar)
      confidence = 0.85; 
    } else if (lowerName.includes('khẩn cấp') || lowerName.includes('bệnh viện') || lowerName.includes('thuốc')) {
      suggestedJarId = '1'; // Chi tiêu thiết yếu (spending jar)
      confidence = 0.85;
    }

    const transactionId = 't_' + Math.random().toString(36).substr(2, 9);
    const newTransaction: Transaction = {
      id: transactionId,
      amount,
      type: 'expense',
      description: `Quét hóa đơn: ${billName}`,
      date: new Date().toISOString(),
      jarId: suggestedJarId,
      isPending: confidence < 0.6, 
      confidence,
      suggestedJarId: confidence < 0.6 ? suggestedJarId : undefined
    };

    setTransactions(prev => [newTransaction, ...prev]);

    if (confidence >= 0.6) {
      applyTransactionEffects(amount, 'expense', suggestedJarId);
      addAlert(
        'Quét hóa đơn OCR thành công',
        `Nhận diện hóa đơn "${billName}" trị giá ${amount.toLocaleString('vi-VN')} VND. Tự động xếp vào hũ "${jars.find(j => j.id === suggestedJarId)?.name || 'Chi tiêu'}". (Độ tin cậy AI: ${Math.floor(confidence * 100)}%)`,
        'info'
      );
    } else {
      addAlert(
        'Cần xác nhận giao dịch (AI)',
        `Phát hiện hóa đơn "${billName}" trị giá ${amount.toLocaleString('vi-VN')} VND. Trí tuệ nhân tạo đề xuất hũ "${jars.find(j => j.id === suggestedJarId)?.name || 'Tiết kiệm'}" nhưng cần bạn xác nhận lại.`,
        'warning'
      );
    }

    return newTransaction;
  };

  const runBankSync = async (): Promise<number> => {
    await new Promise(resolve => setTimeout(resolve, 2500));

    const mockSyncedTransactions = [
      { amount: 5000000, type: 'income', description: 'Chuyển khoản phụ cấp', jarId: '1' },
      { amount: 85000, type: 'expense', description: 'Thanh toán Highlands Coffee', jarId: '5' },
      { amount: 1200000, type: 'expense', description: 'Đóng tiền điện nước', jarId: '1' }
    ];

    let count = 0;
    mockSyncedTransactions.forEach(t => {
      const transactionId = 't_' + Math.random().toString(36).substr(2, 9);
      const newTx: Transaction = {
        id: transactionId,
        amount: t.amount,
        type: t.type as 'income' | 'expense',
        description: `Đồng bộ Ngân hàng: ${t.description}`,
        date: new Date().toISOString(),
        jarId: t.jarId,
        confidence: 0.99
      };
      
      setTransactions(prev => [newTx, ...prev]);
      applyTransactionEffects(t.amount, t.type as 'income' | 'expense', t.jarId);
      count++;
    });

    addAlert(
      'Đồng bộ ngân hàng hoàn tất',
      `Đồng bộ tài khoản thành công! Đã ghi nhận thêm ${count} giao dịch mới từ ngân hàng của bạn.`,
      'info'
    );

    return count;
  };

  const clearAlerts = () => {
    setAlerts([]);
  };

  const markAlertAsRead = (id: string) => {
    setAlerts(prev =>
      prev.map(a => (a.id === id ? { ...a, read: true } : a))
    );
  };

  const updateStreakForToday = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    if (!streakHistory.includes(todayStr)) {
      setStreakHistory(prev => [todayStr, ...prev]);
      setStreakCount(prev => prev + 1);
      
      addAlert(
        'Duy trì Streak thành công!',
        `Chúc mừng bạn đã duy trì chuỗi hoạt động tài chính liên tiếp trong ${streakCount + 1} ngày! 🔥`,
        'info'
      );
    }
  };

  return (
    <FinancialContext.Provider
      value={{
        hasCompletedSetup,
        userName,
        monthlyIncomeGoal,
        balances,
        jars,
        transactions,
        alerts,
        disciplineScore,
        streakCount,
        streakHistory,
        forecast,
        completeSetup,
        addTransaction,
        confirmPendingTransaction,
        deletePendingTransaction,
        recategorizeTransaction,
        fundGoal,
        withdrawFromGoal,
        updateJarRatios,
        addJar,
        deleteJar,
        runIncomeAllocation,
        runOCRBillScan,
        runBankSync,
        clearAlerts,
        markAlertAsRead
      }}
    >
      {children}
    </FinancialContext.Provider>
  );
};

export const useFinancial = () => {
  const context = useContext(FinancialContext);
  if (!context) {
    throw new Error('useFinancial must be used within a FinancialProvider');
  }
  return context;
};
