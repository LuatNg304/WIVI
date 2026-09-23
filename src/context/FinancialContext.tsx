import React, { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { financeService, JarApiItem, GoalApiItem, TransactionApiItem } from '../services/financeService';
import { STORAGE_KEYS } from '../services/apiClient';
import { useAuth } from './AuthContext';

export interface Jar {
  id: string;
  name: string;
  type: 'spend' | 'save';
  allocationPercent: number;
  balance: number;
  spent?: number;
  spentPercentage?: number;
  targetAmount?: number;
  savedAmount?: number;
  color: string;
  frequency?: 'daily' | 'weekly' | 'monthly';
  frequencyAmount?: number;
  targetDate?: string;
  dueDate?: string;
}

export interface Transaction {
  id: string;
  amount: number;
  type: 'income' | 'expense';
  description: string;
  date: string;
  jarId: string;
  jarName?: string;
  categoryName?: string;
  accountName?: string;
  isPending?: boolean;
  confidence?: number;
  suggestedJarId?: string;
  isTransfer?: boolean;
  source?: 'cash' | 'bank';
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
  initialBalance: number; // Y — số dư ban đầu user nhập lúc onboarding
  balances: {
    cash: number;
    bank: number;
  };
  jars: Jar[];
  goals: Jar[];
  transactions: Transaction[];
  alerts: AlertNotification[];
  disciplineScore: number;
  streakCount: number;
  streakHistory: string[];
  forecast: {
    projectedIncome: number;
    projectedExpense: number;
    estimatedEndBalance: number;
    burnRatePerDay: number;
    daysRemainingInMonth: number;
    riskLevel: 'Low' | 'Moderate' | 'High';
    warnings: string[];
    recommendations: string[];
  };
  isLoading: boolean;
  refreshAll: () => Promise<void>;
  completeSetup: (
    name: string,
    initialBalance: number,
    jarsSetup: {
      id: string;
      name: string;
      type: 'spend' | 'save';
      percent: number;
      target?: number;
      targetMonths?: number;
      color: string;
    }[],
    incomeMonthly?: number,
    targetMonths?: number,
  ) => Promise<boolean>;
  addTransaction: (
    amount: number,
    type: 'income' | 'expense',
    description: string,
    jarId: string,
    source?: 'cash' | 'bank',
  ) => Promise<boolean>;
  runIncomeAllocation: (amount: number, source: 'cash' | 'bank', note?: string) => Promise<boolean>;
  confirmPendingTransaction: (id: string, jarId: string) => Promise<boolean>;
  deletePendingTransaction: (id: string) => Promise<boolean>;
  recategorizeTransaction: (transactionId: string, newJarId: string) => Promise<boolean>;
  fundGoal: (goalId: string, sourceJarId: string, amount: number, note?: string) => Promise<boolean>;
  withdrawFromGoal: (goalId: string, targetJarId: string, amount: number, note?: string) => Promise<boolean>;
  transferBetweenJars: (fromJarId: string, toJarId: string, amount: number, note?: string) => Promise<boolean>;
  updateJarRatios: (ratios: { id: string; percent: number }[]) => Promise<boolean>;
  updateCurrentBalance: (cash: number, bank: number) => Promise<boolean>;
  addJar: (
    name: string,
    type: 'spend' | 'save',
    percent: number,
    target: number,
    color: string,
    frequency?: 'daily' | 'weekly' | 'monthly',
    frequencyAmount?: number,
    targetDate?: string,
  ) => Promise<boolean>;
  deleteJar: (id: string) => Promise<boolean>;
  runOCRBillScan: (fileUri: string) => Promise<any>;
  runBankSync: (bankAccountId?: string) => Promise<number>;
  clearAlerts: () => Promise<void>;
  markAlertAsRead: (id: string) => Promise<void>;
  resetSetup: () => Promise<boolean>;
  isVip: boolean;
  subscription: any | null;
  refreshSubscription: () => Promise<void>;
  setVipStatus: (isVip: boolean) => Promise<void>;
}

const FinancialContext = createContext<FinancialContextType | undefined>(undefined);

export const FinancialProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated, refreshUser } = useAuth();

  const [hasCompletedSetup, setHasCompletedSetup] = useState<boolean>(false);
  const [userName, setUserName] = useState<string>('');
  const [monthlyIncomeGoal, setMonthlyIncomeGoal] = useState<number>(0);
  const [initialBalance, setInitialBalance] = useState<number>(0); // Y — số dư ban đầu
  const [balances, setBalances] = useState({ cash: 0, bank: 0 });
  const [jars, setJars] = useState<Jar[]>([]);
  const [goals, setGoals] = useState<Jar[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [alerts, setAlerts] = useState<AlertNotification[]>([]);
  const [disciplineScore, setDisciplineScore] = useState<number>(85);
  const [streakCount, setStreakCount] = useState<number>(0);
  const [streakHistory, setStreakHistory] = useState<string[]>([]);
  const [forecast, setForecast] = useState({
    projectedIncome: 0,
    projectedExpense: 0,
    estimatedEndBalance: 0,
    burnRatePerDay: 0,
    daysRemainingInMonth: 10,
    riskLevel: 'Low' as 'Low' | 'Moderate' | 'High',
    warnings: [] as string[],
    recommendations: [] as string[],
  });
  const [isVip, setIsVip] = useState<boolean>(false);
  const [subscription, setSubscription] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const hasCompletedSetupRef = useRef<boolean>(false);

  useEffect(() => {
    hasCompletedSetupRef.current = hasCompletedSetup;
  }, [hasCompletedSetup]);

  // Restore Offline Cache on mount / auth change
  useEffect(() => {
    const loadCache = async () => {
      try {
        if (!isAuthenticated || !user) {
          setBalances({ cash: 0, bank: 0 });
          setJars([]);
          setGoals([]);
          setTransactions([]);
          setHasCompletedSetup(false);
          hasCompletedSetupRef.current = false;
          return;
        }

        // Nếu người dùng mới chưa hoàn tất onboarding (is_onboarded = false) -> Luôn về màn hình thiết lập
        if (user.is_onboarded === false) {
          setHasCompletedSetup(false);
          hasCompletedSetupRef.current = false;
          return;
        }

        const cachedStr = await AsyncStorage.getItem(STORAGE_KEYS.OFFLINE_CACHE);
        if (cachedStr) {
          const cached = JSON.parse(cachedStr);
          if (cached.balances) setBalances(cached.balances);
          if (cached.initialBalance !== undefined) setInitialBalance(cached.initialBalance);
          if (cached.jars) setJars(cached.jars);
          if (cached.goals) setGoals(cached.goals);
          if (cached.transactions) setTransactions(cached.transactions);
          if (cached.hasCompletedSetup !== undefined) {
            setHasCompletedSetup(cached.hasCompletedSetup);
            hasCompletedSetupRef.current = cached.hasCompletedSetup;
          }
          if (cached.streakCount !== undefined) setStreakCount(cached.streakCount);
          if (cached.streakHistory) setStreakHistory(cached.streakHistory);
          if (cached.forecast) setForecast(cached.forecast);
        }

        const vipFlag = await AsyncStorage.getItem('@wivi_is_vip');
        if (vipFlag === 'true') {
          setIsVip(true);
        }
      } catch (e) {
        console.warn('Lỗi tải cache:', e);
      }
    };
    loadCache();
  }, [isAuthenticated, user?.id, user?.is_onboarded]);


  const saveToCache = useCallback(
    async (data: {
      balances?: { cash: number; bank: number };
      initialBalance?: number;
      jars?: Jar[];
      goals?: Jar[];
      transactions?: Transaction[];
      hasCompletedSetup?: boolean;
      streakCount?: number;
      streakHistory?: string[];
      forecast?: any;
    }) => {
      try {
        const currentStr = await AsyncStorage.getItem(STORAGE_KEYS.OFFLINE_CACHE);
        const current = currentStr ? JSON.parse(currentStr) : {};
        const updated = { ...current, ...data };
        await AsyncStorage.setItem(STORAGE_KEYS.OFFLINE_CACHE, JSON.stringify(updated));
      } catch (e) {
        console.warn('Lỗi lưu cache:', e);
      }
    },
    [],
  );

  // Refresh All Data from Backend API
  const refreshAll = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      // 0. User Setup (Monthly income & onboarding data)
      const userSetup = await financeService.getUserSetup().catch(() => null);
      if (userSetup?.monthlyIncome) {
        setMonthlyIncomeGoal(Number(userSetup.monthlyIncome));
      }

      // 1. Setup Data & Income
      const setupData = await financeService.getSetup().catch(() => null);
      let activeIncome = 0;
      if (setupData?.monthlyIncome) {
        activeIncome = Number(setupData.monthlyIncome);
        setMonthlyIncomeGoal(activeIncome);
      } else {
        activeIncome = monthlyIncomeGoal || 10000000;
      }

      // 2. Dashboard & Balances
      const dashboard = await financeService.getDashboard().catch(() => null);
      if (dashboard) {
        let cash = 0;
        let bank = 0;
        dashboard.financialAccounts?.forEach((acc) => {
          if (acc.type?.toLowerCase().includes('cash')) {
            cash += Number(acc.balance) || 0;
          } else {
            bank += Number(acc.balance) || 0;
          }
        });
        setBalances({ cash, bank });
      }

      // 3. Transactions & Jars
      const [apiJarsRes, txData] = await Promise.all([
        financeService.getJars().catch(() => []),
        financeService.getTransactions({ pageSize: 100 }).catch(() => ({ items: [] })),
      ]);

      const rawTxList = Array.isArray(txData)
        ? txData
        : ((txData as any)?.data || (txData as any)?.items || []);

      const formattedTxs: Transaction[] = rawTxList.map((t: any) => {
        const extractedJarId = t.jar?.id || t.fromJarId || t.toJarId || t.jarId || null;
        return {
          id: t.id,
          amount: Math.abs(Number(t.transactionsAmount ?? t.amount)) || 0,
          type: t.type?.toLowerCase().includes('income') ? 'income' : 'expense',
          description: t.note || t.rawDescription || 'Giao dịch',
          date: t.date || t.transactionDate || t.createdAt || new Date().toISOString(),
          jarId: extractedJarId || 'unknown',
          isPending: Boolean(t.isPending),
          confidence: t.confidence,
          isTransfer: Boolean(t.fromJarId && t.toJarId),
        };
      });
      setTransactions(formattedTxs);

      const apiJarsList = Array.isArray(apiJarsRes)
        ? apiJarsRes
        : ((apiJarsRes as any)?.data || (apiJarsRes as any)?.items || (apiJarsRes as any)?.jars || []);

      const formattedSpendJars: Jar[] = apiJarsList.map((j: any) => {
        // Compute spent from actual transactions
        const spentFromTxs = formattedTxs
          .filter((t) => !t.isPending && t.type === 'expense' && !t.isTransfer && t.jarId === j.id)
          .reduce((sum, t) => sum + t.amount, 0);
        const finalSpent = spentFromTxs > 0 ? spentFromTxs : (Number(j.spent ?? j.spentAmount) || 0);

        const allocationPct = Number(j.allocationPercent ?? j.allocation_percent) || 0;
        const jarBal = Number(j.balance ?? j.totalBalance) || 0;
        const baseBudget = activeIncome > 0
          ? Math.round(activeIncome * (allocationPct / 100))
          : (Number(j.allocatedBudget) || 1000000);
        const jarBudget = Math.max(0, baseBudget + jarBal);
        const computedSpentPct = jarBudget > 0
          ? Math.min(100, Math.round((finalSpent / jarBudget) * 100))
          : (finalSpent > 0 ? 100 : 0);

        return {
          id: j.id,
          name: j.name,
          type: 'spend',
          allocationPercent: allocationPct,
          balance: jarBal,
          spent: finalSpent,
          spentPercentage: computedSpentPct,
          color: j.color || '#0066cc',
        };
      });
      setJars(formattedSpendJars);

      // 4. Goals
      const apiGoalsRes: any = await financeService.getGoals().catch(() => []);
      const apiGoalsList = Array.isArray(apiGoalsRes)
        ? apiGoalsRes
        : (apiGoalsRes?.data || apiGoalsRes?.items || apiGoalsRes?.goals || []);
      const formattedGoals: Jar[] = apiGoalsList.map((g: any) => ({
        id: g.id,
        name: g.title || g.name,
        type: 'save',
        allocationPercent: 0,
        balance: Number(g.savedAmount ?? g.saved_amount) || 0,
        targetAmount: Number(g.targetAmount ?? g.target_amount) || 0,
        savedAmount: Number(g.savedAmount ?? g.saved_amount) || 0,
        color: g.color || '#3be2b0',
        dueDate: g.dueDate || g.due_date,
        frequency: g.frequency || 'weekly',
        frequencyAmount: g.frequencyAmount,
      }));
      setGoals(formattedGoals);

      // 5. Streak
      const streakData = await financeService.getStreak().catch(() => null);
      if (streakData) {
        setStreakCount(streakData.streakCount || 0);
        setStreakHistory(streakData.streakHistory || []);
      }

      // 6. AI Forecast
      const forecastData = await financeService.getAiForecast().catch(() => null);
      if (forecastData) {
        setForecast({
          projectedIncome: forecastData.projectedIncome || 0,
          projectedExpense: forecastData.projectedExpense || 0,
          estimatedEndBalance: forecastData.estimatedEndBalance || 0,
          burnRatePerDay: forecastData.burnRatePerDay || 0,
          daysRemainingInMonth: forecastData.daysRemainingInMonth || 0,
          riskLevel: forecastData.riskLevel || 'Low',
          warnings: forecastData.warnings || [],
          recommendations: forecastData.recommendations || [],
        });
      }

      // 7. Auto-generate Spending Alerts for Jars >= 70% or Overspent
      const autoSpendingAlerts: AlertNotification[] = [];
      if (activeIncome > 0) {
        formattedSpendJars.forEach((j) => {
          const jarBudget = Math.round(activeIncome * ((j.allocationPercent || 0) / 100)) || 1;
          const jarSpent = j.spent || 0;
          const spentPct = Math.round((jarSpent / jarBudget) * 100);

          if (spentPct >= 70) {
            autoSpendingAlerts.push({
              id: `jar-overspend-${j.id}`,
              title: spentPct >= 100 ? `🚨 Hũ ${j.name} đã vượt 100% ngân sách!` : `⚠️ Hũ ${j.name} đã tiêu ${spentPct}% ngân sách`,
              message: `Hũ ${j.name} đã chi tiêu ${jarSpent.toLocaleString('vi-VN')} đ / ${jarBudget.toLocaleString('vi-VN')} đ (${spentPct}%). WIVI AI gợi ý bạn nên cân đối lại tỷ lệ để không bị thâm hụt.`,
              date: new Date().toISOString(),
              type: 'warning',
              read: false,
            });
          }
        });
      }

      // Notifications from Backend API
      const notifs = await financeService.getNotifications().catch(() => ({ items: [] }));
      const backendAlerts: AlertNotification[] = (notifs.items || []).map((n) => ({
        id: n.id,
        title: n.title,
        message: n.body,
        date: n.createdAt,
        type: n.type?.toLowerCase().includes('warn') ? 'warning' : 'info',
        read: n.isRead,
      }));

      // Combined & deduplicated alerts
      const combinedAlerts = [...autoSpendingAlerts, ...backendAlerts];
      setAlerts(combinedAlerts);

      // 9. User Subscription
      const subData = await financeService.getUserSubscription().catch(() => null);
      if (subData) {
        setIsVip(Boolean(subData.isPremium));
        setSubscription(subData);
      }

      // Check setup completion: Chỉ đánh dấu hoàn tất nếu user thật sự đã hoàn tất Onboarding (is_onboarded = true) hoặc có đầy đủ hũ và thu nhập
      const isSetup = Boolean(
        user?.is_onboarded ||
        (hasCompletedSetupRef.current && formattedSpendJars.length > 0) ||
        (formattedSpendJars.length > 0 && Number(setupData?.monthlyIncome || 0) > 0)
      );
      if (isSetup) {
        hasCompletedSetupRef.current = true;
        setHasCompletedSetup(true);
      } else {
        hasCompletedSetupRef.current = false;
        setHasCompletedSetup(false);
      }

      // Compute discipline score from budget adherence
      let baseScore = 80;
      const overBudgetJars = formattedSpendJars.filter((j) => (j.spentPercentage || 0) > 90).length;
      baseScore -= overBudgetJars * 10;
      baseScore += Math.min((streakData?.streakCount || 0) * 2, 15);
      setDisciplineScore(Math.min(Math.max(baseScore, 40), 100));

      // Save updated state to cache
      saveToCache({
        jars: formattedSpendJars,
        goals: formattedGoals,
        transactions: formattedTxs,
        hasCompletedSetup: isSetup || hasCompletedSetupRef.current,
        streakCount: streakData?.streakCount,
        streakHistory: streakData?.streakHistory,
        forecast: forecastData,
      });
    } catch (e) {
      console.warn('Lỗi refreshAll:', e);
    }
  }, [isAuthenticated, saveToCache]);

  const setVipStatus = useCallback(async (status: boolean) => {
    setIsVip(status);
    await AsyncStorage.setItem('@wivi_is_vip', status ? 'true' : 'false');
    if (status) {
      setSubscription((prev: any) => ({
        ...(prev || {}),
        isPremium: true,
        planName: 'Gói Tháng (Pro)',
        status: 'Active',
      }));
    }
  }, []);

  const refreshSubscription = useCallback(async () => {
    try {
      const vipFlag = await AsyncStorage.getItem('@wivi_is_vip');
      const subData = await financeService.getUserSubscription().catch(() => null);
      if (subData) {
        const activeVip = Boolean(subData.isPremium) || vipFlag === 'true';
        setIsVip(activeVip);
        setSubscription({
          ...subData,
          isPremium: activeVip,
        });
      } else if (vipFlag === 'true') {
        setIsVip(true);
        setSubscription({
          isPremium: true,
          planName: 'Gói Tháng (Pro)',
          status: 'Active',
        });
      }
    } catch (e) {
      console.warn('Lỗi refreshSubscription:', e);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      if (user?.full_name) setUserName(user.full_name);
      refreshAll();
      refreshSubscription();
    }
  }, [isAuthenticated, user?.id]);

  // Complete Onboarding Setup
  const completeSetup = async (
    name: string,
    initialBalanceOrCash: number,
    jarsSetupOrBank: any,
    jarsSetupOrIncome?: any,
    incomeMonthly?: number,
  ): Promise<boolean> => {
    try {
      setIsLoading(true);
      setUserName(name);

      let initialBalance = 0;
      let jarsSetup: Array<{
        id: string;
        name: string;
        type: 'spend' | 'save';
        percent: number;
        target?: number;
        color: string;
      }> = [];
      let income = incomeMonthly;

      let targetMonthsVal = typeof jarsSetupOrIncome === 'number' && !Array.isArray(jarsSetupOrBank) ? incomeMonthly : (typeof incomeMonthly === 'number' ? incomeMonthly : 12);
      if (Array.isArray(jarsSetupOrBank)) {
        // New signature: (name, initialBalance, jarsSetup, incomeMonthly, targetMonths)
        initialBalance = Number(initialBalanceOrCash) || 0;
        jarsSetup = jarsSetupOrBank;
        income = jarsSetupOrIncome;
        targetMonthsVal = incomeMonthly || 12;
      } else {
        // Old signature: (name, initialCash, initialBank, jarsSetup, incomeMonthly)
        initialBalance = (Number(initialBalanceOrCash) || 0) + (Number(jarsSetupOrBank) || 0);
        jarsSetup = jarsSetupOrIncome || [];
      }

      setBalances({ cash: initialBalance, bank: 0 });
      setInitialBalance(initialBalance); // Lưu biến Y
      setHasCompletedSetup(true);
      await saveToCache({ hasCompletedSetup: true, initialBalance });

      // 1. Submit survey
      await financeService.submitOnboardingSurvey({
        monthlyIncome: income || monthlyIncomeGoal || 30000000,
        occupationType: 'Employee',
        financialGoalTypes: ['Savings', 'Investment'],
        budgetMethodPreference: 'SixJars',
        targetMonths: targetMonthsVal,
      }).catch((e) => console.warn('submitOnboardingSurvey warning:', e));

      // 2. Setup initial balances
      await financeService.setupInitialBalances({
        currentBalance: initialBalance,
        initialBalance: initialBalance,
        cashBalance: initialBalance,
        bankBalance: 0,
      }).catch((e) => console.warn('setupInitialBalances warning:', e));

      // 3. Create Custom Jars & Goals
      for (const j of jarsSetup) {
        if (j.type === 'spend') {
          await financeService.createJar({
            name: j.name,
            color: j.color,
            allocationPercent: j.percent,
          }).catch((e) => console.warn('createJar warning:', e));
        } else {
          await financeService.createGoal({
            name: j.name,
            targetAmount: j.target || 10000000,
            targetMonths: (j as any).targetMonths || targetMonthsVal || 12,
            color: j.color,
            initialAmount: initialBalance,
          }).catch((e) => console.warn('createGoal warning:', e));
        }
      }

      setHasCompletedSetup(true);
      await saveToCache({ hasCompletedSetup: true });
      await refreshUser().catch(() => {});
      await refreshAll().catch(() => {});
      return true;
    } catch (err) {
      console.warn('Lỗi completeSetup:', err);
      // Fallback: still let the user enter dashboard
      setHasCompletedSetup(true);
      await saveToCache({ hasCompletedSetup: true });
      return true;
    } finally {
      setIsLoading(false);
    }
  };

  // Add Transaction
  const addTransaction = async (
    amount: number,
    type: 'income' | 'expense',
    description: string,
    jarId?: string,
    source: 'cash' | 'bank' = 'cash',
  ): Promise<boolean> => {
    try {
      // Find financial account id (Cash or Bank)
      let accounts = await financeService.getFinancialAccounts().catch(() => []);
      if (!Array.isArray(accounts)) accounts = [];

      // Auto create a default cash account if user has none
      if (accounts.length === 0) {
        const newAcc = await financeService
          .createFinancialAccount({
            name: 'Tiền mặt',
            accountType: 'Cash',
            currentBalance: 0,
            isDefault: true,
          })
          .catch(() => null);
        if (newAcc?.id) {
          accounts = [newAcc];
        }
      }

      const matchedAcc = accounts.find((a: any) =>
        source === 'bank'
          ? (a.type?.toLowerCase?.() === 'bank' || a.accountType?.toLowerCase?.()?.includes('bank') || a.name?.toLowerCase?.()?.includes('ngân hàng') || a.name?.toLowerCase?.()?.includes('bank'))
          : (a.type?.toLowerCase?.() === 'cash' || a.accountType?.toLowerCase?.()?.includes('cash') || a.name?.toLowerCase?.()?.includes('tiền mặt')),
      ) || accounts[0];

      if (!matchedAcc?.id) {
        throw new Error('Chưa tìm thấy tài khoản nguồn thanh toán');
      }

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const validJarId = jarId && uuidRegex.test(jarId)
        ? jarId
        : (jars.find((j) => uuidRegex.test(j.id))?.id || undefined);

      await financeService.createTransaction({
        financialAccountId: matchedAcc.id,
        fromJarId: type === 'expense' && validJarId ? validJarId : undefined,
        transactionsAmount: amount,
        type: type === 'income' ? 'Income' : 'Expense',
        date: new Date().toISOString(),
        note: description || (type === 'income' ? 'Thu nhập' : 'Chi tiêu'),
      });

      await refreshAll();

      // Instant notification check if expense causes jar to exceed limits
      if (type === 'expense' && validJarId) {
        const targetJar = jars.find((j) => j.id === validJarId);
        if (targetJar && monthlyIncomeGoal > 0) {
          const jarBudget = Math.round(monthlyIncomeGoal * ((targetJar.allocationPercent || 0) / 100)) || 1;
          const newSpent = (targetJar.spent || 0) + amount;
          const newPct = Math.round((newSpent / jarBudget) * 100);

          if (newPct >= 70) {
            setTimeout(() => {
              Alert.alert(
                newPct >= 100 ? '🚨 Cảnh báo vượt ngân sách!' : '⚠️ Cảnh báo chi tiêu hũ!',
                `Hũ "${targetJar.name}" vừa ghi nhận giao dịch và đã chạm mức ${newPct}% ngân sách tháng (${newSpent.toLocaleString('vi-VN')} đ / ${jarBudget.toLocaleString('vi-VN')} đ).\n\nThông báo chi tiết đã được gửi vào mục Chuông 🔔.`,
                [{ text: 'Đã hiểu', style: 'default' }]
              );
            }, 300);
          }
        }
      }

      return true;
    } catch (err) {
      console.warn('Lỗi addTransaction:', err);
      return false;
    }
  };

  // Run Income Allocation 1-Click
  const runIncomeAllocation = async (
    amount: number,
    source: 'cash' | 'bank',
    note?: string,
  ): Promise<boolean> => {
    try {
      let accounts = await financeService.getFinancialAccounts().catch(() => []);
      if (!Array.isArray(accounts)) accounts = [];

      if (accounts.length === 0) {
        const newAcc = await financeService
          .createFinancialAccount({
            name: 'Tiền mặt',
            accountType: 'Cash',
            currentBalance: 0,
            isDefault: true,
          })
          .catch(() => null);
        if (newAcc?.id) {
          accounts = [newAcc];
        }
      }

      const targetAcc = accounts.find((a: any) =>
        source === 'cash'
          ? (a.accountType?.toLowerCase()?.includes('cash') || a.type?.toLowerCase()?.includes('cash') || a.name?.toLowerCase()?.includes('tiền mặt'))
          : (a.accountType?.toLowerCase()?.includes('bank') || a.type?.toLowerCase()?.includes('bank') || a.name?.toLowerCase()?.includes('ngân hàng')),
      ) || accounts[0];

      if (!targetAcc) {
        throw new Error('Không tìm thấy tài khoản nguồn');
      }

      await financeService.allocateIncome({
        amount,
        sourceAccountId: targetAcc.id,
        note: note || 'Phân bổ thu nhập tự động',
      });

      await refreshAll();
      return true;
    } catch (err) {
      console.warn('Lỗi runIncomeAllocation:', err);
      return false;
    }
  };

  // Confirm Pending Transaction
  const confirmPendingTransaction = async (
    id: string,
    jarId: string,
  ): Promise<boolean> => {
    try {
      await financeService.recategorizeTransaction(id, { newJarId: jarId });
      await refreshAll();
      return true;
    } catch (err) {
      console.warn('Lỗi confirmPendingTransaction:', err);
      return false;
    }
  };

  // Delete Pending Transaction
  const deletePendingTransaction = async (id: string): Promise<boolean> => {
    try {
      await financeService.deleteTransaction(id);
      await refreshAll();
      return true;
    } catch (err) {
      console.warn('Lỗi deletePendingTransaction:', err);
      return false;
    }
  };

  // Recategorize Transaction
  const recategorizeTransaction = async (
    transactionId: string,
    newJarId: string,
  ): Promise<boolean> => {
    try {
      await financeService.recategorizeTransaction(transactionId, {
        newJarId,
      });
      await refreshAll();
      return true;
    } catch (err) {
      console.warn('Lỗi recategorizeTransaction:', err);
      return false;
    }
  };

  // Fund Goal
  const fundGoal = async (
    goalId: string,
    sourceJarId: string,
    amount: number,
    note?: string,
  ): Promise<boolean> => {
    try {
      await financeService.fundGoal(goalId, sourceJarId, amount, note);
      await refreshAll();
      return true;
    } catch (err) {
      console.warn('Lỗi fundGoal:', err);
      return false;
    }
  };

  // Withdraw from Goal
  const withdrawFromGoal = async (
    goalId: string,
    targetJarId: string,
    amount: number,
    note?: string,
  ): Promise<boolean> => {
    try {
      await financeService.withdrawGoal(goalId, targetJarId, amount, note);
      await refreshAll();
      return true;
    } catch (err) {
      console.warn('Lỗi withdrawFromGoal:', err);
      return false;
    }
  };

  // Transfer Between Jars
  const transferBetweenJars = async (
    fromJarId: string,
    toJarId: string,
    amount: number,
    note?: string,
  ): Promise<boolean> => {
    try {
      await financeService.transferBetweenJars({
        fromJarId,
        toJarId,
        amount,
        note: note || 'Chuyển quỹ giữa các hũ',
      });
      await refreshAll();
      return true;
    } catch (err) {
      console.warn('Lỗi transferBetweenJars:', err);
      return false;
    }
  };

  // Update Jar Ratios
  const updateJarRatios = async (
    ratios: { id: string; percent: number }[],
  ): Promise<boolean> => {
    try {
      await financeService.updateJarRatios(
        ratios.map((r) => ({ jarId: r.id, allocationPercent: r.percent })),
      );
      await refreshAll();
      return true;
    } catch (err) {
      console.warn('Lỗi updateJarRatios:', err);
      return false;
    }
  };

  // Update Current Balances (Cash & Bank) from Dashboard
  const updateCurrentBalance = async (cash: number, bank: number): Promise<boolean> => {
    try {
      await financeService.setupInitialBalances({
        currentBalance: cash + bank,
        cashBalance: cash,
        bankBalance: bank,
      });
      setBalances({ cash, bank });
      await refreshAll();
      return true;
    } catch (err) {
      console.warn('Lỗi updateCurrentBalance:', err);
      return false;
    }
  };

  // Add Jar or Goal
  const addJar = async (
    name: string,
    type: 'spend' | 'save',
    percent: number,
    target: number,
    color: string,
    frequency?: 'daily' | 'weekly' | 'monthly',
    frequencyAmount?: number,
    targetDate?: string,
  ): Promise<boolean> => {
    try {
      if (type === 'spend') {
        await financeService.createJar({
          name,
          color,
          allocationPercent: percent,
        });
      } else {
        await financeService.createGoal({
          name,
          targetAmount: target,
          color,
          dueDate: targetDate,
          frequency,
          frequencyAmount,
        });
      }
      await refreshAll();
      return true;
    } catch (err) {
      console.warn('Lỗi addJar:', err);
      return false;
    }
  };

  // Delete Jar
  const deleteJar = async (id: string): Promise<boolean> => {
    try {
      await financeService.deleteJar(id);
      await refreshAll();
      return true;
    } catch (err) {
      console.warn('Lỗi deleteJar:', err);
      return false;
    }
  };

  // OCR Bill Scan
  const runOCRBillScan = async (fileUri: string): Promise<any> => {
    try {
      const result = await financeService.scanReceiptOcr(fileUri);
      await refreshAll();
      return result;
    } catch (err) {
      console.warn('Lỗi runOCRBillScan:', err);
      throw err;
    }
  };

  // Bank Sync
  const runBankSync = async (bankAccountId?: string): Promise<number> => {
    try {
      const accounts = await financeService.getFinancialAccounts().catch(() => []);
      const bankAcc = bankAccountId
        ? { id: bankAccountId }
        : accounts.find((a: any) => a.accountType?.toLowerCase()?.includes('bank')) || accounts[0];

      if (!bankAcc) return 0;

      const syncResult = await financeService.syncBankAccount(bankAcc.id);
      await refreshAll();
      return syncResult?.syncedCount || 1;
    } catch (err) {
      console.warn('Lỗi runBankSync:', err);
      return 0;
    }
  };

  // Mark Alert As Read
  const markAlertAsRead = async (id: string): Promise<void> => {
    try {
      await financeService.markNotificationAsRead(id);
      setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, read: true } : a)));
    } catch (err) {
      console.warn('Lỗi markAlertAsRead:', err);
    }
  };

  // Clear Alerts
  const clearAlerts = async (): Promise<void> => {
    try {
      await financeService.clearAllNotifications();
      setAlerts([]);
    } catch (err) {
      console.warn('Lỗi clearAlerts:', err);
    }
  };

  // ─── Reset toàn bộ thiết lập – quay về Bước 1 ───────────────────────────
  // ─── Reset toàn bộ thiết lập – quay về Bước 1 ───────────────────────────
  const resetSetup = async (): Promise<boolean> => {
    try {
      setIsLoading(true);

      // 1. Gọi backend reset toàn bộ dữ liệu trong database
      try {
        await financeService.resetAllData?.();
      } catch (err) {
        console.warn('Backend reset call warning:', err);
      }

      // 2. Xoá toàn bộ dữ liệu offline cache
      await AsyncStorage.removeItem(STORAGE_KEYS.OFFLINE_CACHE);
      await AsyncStorage.removeItem('@wivi_has_completed_setup');
      await AsyncStorage.removeItem('@wivi_initial_balance');

      // 3. Reset tất cả state về mặc định
      setHasCompletedSetup(false);
      hasCompletedSetupRef.current = false;
      setUserName('');
      setMonthlyIncomeGoal(0);
      setInitialBalance(0);
      setBalances({ cash: 0, bank: 0 });
      setJars([]);
      setGoals([]);
      setTransactions([]);
      setAlerts([]);
      setDisciplineScore(0);
      setStreakCount(0);
      setStreakHistory([]);
      setForecast({
        projectedIncome: 0,
        projectedExpense: 0,
        estimatedEndBalance: 0,
        burnRatePerDay: 0,
        daysRemainingInMonth: 30,
        riskLevel: 'Low',
        warnings: [],
        recommendations: [],
      });

      // 4. Đồng bộ lại thông tin User trong AuthContext
      await refreshUser().catch(() => {});

      return true;
    } catch (err) {
      console.warn('Lỗi resetSetup:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <FinancialContext.Provider
      value={{
        hasCompletedSetup,
        userName,
        monthlyIncomeGoal,
        initialBalance,
        balances,
        jars,
        goals,
        transactions,
        alerts,
        disciplineScore,
        streakCount,
        streakHistory,
        forecast,
        isLoading,
        refreshAll,
        completeSetup,
        addTransaction,
        runIncomeAllocation,
        confirmPendingTransaction,
        deletePendingTransaction,
        recategorizeTransaction,
        fundGoal,
        withdrawFromGoal,
        transferBetweenJars,
        updateJarRatios,
        updateCurrentBalance,
        addJar,
        deleteJar,
        runOCRBillScan,
        runBankSync,
        clearAlerts,
        markAlertAsRead,
        resetSetup,
        isVip,
        subscription,
        refreshSubscription,
        setVipStatus,
      }}
    >
      {children}
    </FinancialContext.Provider>
  );
};

export const useFinancial = () => {
  const context = useContext(FinancialContext);
  if (!context) {
    throw new Error('useFinancial phải được sử dụng trong FinancialProvider');
  }
  return context;
};
