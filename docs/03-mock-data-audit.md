# WIVI - Mock Data Audit & Migration Guide

## Tổng hợp tất cả Mock Data hiện tại

> Tài liệu này liệt kê **chính xác** vị trí của tất cả mock data/hardcode trong dự án, và mapping sang API tương ứng cần thay thế.

---

## 1. `FinancialContext.tsx` — **Trung tâm mock data chính**

File: [`src/context/FinancialContext.tsx`](file:///c:/Users/Admin/Documents/tuHocReactNative/Wivi/WIVI/src/context/FinancialContext.tsx)

### 1.1 DEFAULT_JARS (Dòng 101-107)
```typescript
const DEFAULT_JARS: Jar[] = [
  { id: '1', name: 'Chi tiêu thiết yếu', type: 'spend', allocationPercent: 70, balance: 12000000, color: '#0066cc' },
  { id: '2', name: 'MacBook Fund', type: 'save', allocationPercent: 0, balance: 15000000, targetAmount: 20000000, color: '#3be2b0', frequency: 'weekly', frequencyAmount: 500000, targetDate: '15/12/2026' },
  { id: '3', name: 'Emergency Fund', type: 'save', allocationPercent: 0, balance: 700000, targetAmount: 1666000, color: '#ff5c5c', frequency: 'monthly', frequencyAmount: 100000, targetDate: '30/09/2026' },
  { id: '4', name: 'Travel Fund', type: 'save', allocationPercent: 0, balance: 2000000, targetAmount: 2222000, color: '#ffb83d', frequency: 'weekly', frequencyAmount: 150000, targetDate: '15/11/2026' },
  { id: '5', name: 'Giáo dục & Giải trí', type: 'spend', allocationPercent: 30, balance: 5000000, color: '#9b59b6' },
];
```
**→ Thay bằng:** `GET /api/v1/jars`

---

### 1.2 Hardcoded Balances (Dòng 113)
```typescript
const [balances, setBalances] = useState({ cash: 35000000, bank: 100000000 });
```
**→ Thay bằng:** `GET /api/v1/balances`

---

### 1.3 Mock Transactions (Dòng 115-121)
```typescript
const [transactions, setTransactions] = useState<Transaction[]>([
  { id: 't1', amount: 15000000, type: 'income', description: 'Nhận lương tháng 10', ... },
  { id: 't2', amount: 5000000, type: 'expense', description: 'Mua sắm thiết bị học tập', ... },
  { id: 't3', amount: 300000, type: 'expense', description: 'Ăn tối nhà hàng', ... },
  { id: 'tp1', amount: 120000, type: 'expense', description: 'Grab Bike di chuyển', isPending: true, ... },
  { id: 'tp2', amount: 450000, type: 'expense', description: 'Xem phim và bắp nước CGV', isPending: true, ... }
]);
```
**→ Thay bằng:** `GET /api/v1/transactions`

---

### 1.4 Mock Alerts (Dòng 123-132)
```typescript
const [alerts, setAlerts] = useState<AlertNotification[]>([
  {
    id: 'a1',
    title: 'Chào mừng bạn đến với WIBI!',
    message: 'Thiết lập ngân sách thành công...',
    type: 'info',
    read: false
  }
]);
```
**→ Thay bằng:** `GET /api/v1/alerts`

---

### 1.5 Hardcoded Discipline Scores (Dòng 134-148)
```typescript
const [disciplineScore, setDisciplineScore] = useState<number>(85);
const [streakCount, setStreakCount] = useState<number>(5);
const [streakHistory, setStreakHistory] = useState<string[]>([
  '2026-10-15', '2026-10-16', '2026-10-17', '2026-10-18', '2026-10-19'
]);
const [forecast, setForecast] = useState({
  estimatedEndBalance: 142500000,
  warnings: [],
  recommendations: []
});
```
**→ Thay bằng:** `GET /api/v1/discipline`

---

### 1.6 Hardcoded User Info (Dòng 111-112)
```typescript
const [hasCompletedSetup, setHasCompletedSetup] = useState<boolean>(false);
const [userName, setUserName] = useState<string>('Người dùng WIBI');
const [monthlyIncomeGoal, setMonthlyIncomeGoal] = useState<number>(30000000);
```
**→ Thay bằng:** `GET /api/v1/users/me` → lấy `has_completed_setup`, `username`, `monthly_income_goal`

---

### 1.7 Client-side Business Logic cần chuyển sang Backend

| Function | Dòng | Mock behavior | API thay thế |
|----------|------|---------------|--------------|
| `completeSetup()` | 218-251 | Set state local | `POST /api/v1/users/me/complete-setup` |
| `addTransaction()` | 265-292 | Push vào state | `POST /api/v1/transactions` |
| `confirmPendingTransaction()` | 328-344 | Update state | `PUT /api/v1/transactions/:id/confirm` |
| `deletePendingTransaction()` | 346-348 | Filter state | `DELETE /api/v1/transactions/:id` |
| `recategorizeTransaction()` | 350-395 | Move jar balance | `PUT /api/v1/transactions/:id/recategorize` |
| `fundGoal()` | 397-456 | Transfer between jars | `POST /api/v1/jars/:goalId/fund` |
| `withdrawFromGoal()` | 458-517 | Transfer between jars | `POST /api/v1/jars/:goalId/withdraw` |
| `updateJarRatios()` | 519-539 | Update percents | `PUT /api/v1/jars/ratios` |
| `addJar()` | 541-593 | Push + rebalance | `POST /api/v1/jars` |
| `deleteJar()` | 595-629 | Filter + rebalance | `DELETE /api/v1/jars/:id` |
| `runIncomeAllocation()` | 631-671 | Distribute to jars | `POST /api/v1/income/allocate` |
| `runOCRBillScan()` | 673-725 | Fake AI classification | `POST /api/v1/ocr/scan` |
| `runBankSync()` | 727-761 | Hardcoded mock transactions | `POST /api/v1/bank/sync` |
| `clearAlerts()` | 763-765 | Clear state | `DELETE /api/v1/alerts` |
| `markAlertAsRead()` | 767-771 | Update state | `PUT /api/v1/alerts/:id/read` |
| `updateStreakForToday()` | 773-785 | Update streak state | `POST /api/v1/discipline/checkin` |
| Discipline calculation | 151-215 | useEffect compute | `GET /api/v1/discipline` (server-computed) |

---

## 2. `RecordScreen.tsx` — Mock OCR Receipts

File: [`src/screens/RecordScreen.tsx`](file:///c:/Users/Admin/Documents/tuHocReactNative/Wivi/WIVI/src/screens/RecordScreen.tsx)

### 2.1 MOCK_RECEIPTS (Dòng 24-29)
```typescript
const MOCK_RECEIPTS: MockReceipt[] = [
  { id: 'rec1', merchant: 'Co.opmart Siêu Thị', amount: 320000, preview: 'Hóa đơn thực phẩm gia đình' },
  { id: 'rec2', merchant: 'Highlands Coffee', amount: 85000, preview: 'Thanh toán nước uống' },
  { id: 'rec3', merchant: 'Nhà Sách Fahasa', amount: 250000, preview: 'Mua sách giáo trình AI' },
  { id: 'rec4', merchant: 'Apple Store Vietnam', amount: 15000000, preview: 'Mua phụ kiện & thiết bị' },
];
```
**→ Thay bằng:** Camera capture thật → `POST /api/v1/ocr/scan` (multipart upload ảnh hóa đơn)

---

## 3. `DisciplineScreen.tsx` — Hardcoded Streak Calendar

File: [`src/screens/DisciplineScreen.tsx`](file:///c:/Users/Admin/Documents/tuHocReactNative/Wivi/WIVI/src/screens/DisciplineScreen.tsx)

### 3.1 pastDays (Dòng 38-46)
```typescript
const pastDays = [
  { day: 'T2', active: true },
  { day: 'T3', active: true },
  { day: 'T4', active: true },
  { day: 'T5', active: true },
  { day: 'T6', active: true },
  { day: 'T7', active: false },
  { day: 'CN', active: false },
];
```
**→ Thay bằng:** Tính toán từ `streak_history` trả về bởi `GET /api/v1/discipline`

---

## 4. `authService.ts` — Fallback Mock Auth

File: [`src/services/authService.ts`](file:///c:/Users/Admin/Documents/tuHocReactNative/Wivi/WIVI/src/services/authService.ts)

| Vị trí | Mock Behavior | Điều kiện |
|--------|--------------|-----------|
| Dòng 58-66 | signUp thành công giả lập (không lưu DB) | `!isSupabaseConfigured && !NEST_API_URL` |
| Dòng 146-151 | sendOtp thành công giả lập | `!isSupabaseConfigured && !NEST_API_URL` |
| Dòng 217-234 | verifyOtp chấp nhận mọi OTP 6 số | `!isSupabaseConfigured && !NEST_API_URL` |
| Dòng 303-320 | signIn thành công cho mọi email | `!isSupabaseConfigured && !NEST_API_URL` |
| Dòng 379-385 | resetPassword giả lập | `!isSupabaseConfigured && !NEST_API_URL` |
| Dòng 557-570 | Google login giả lập | `!GOOGLE_CLIENT_ID && !isSupabaseConfigured` |

**→ Giữ nguyên** fallback này cho dev mode, nhưng khi production phải bắt buộc có `NEST_API_URL`.

---

## Bảng tổng hợp: File ↔ API mapping

| File nguồn | Mock Data | API cần gọi | Ưu tiên |
|------------|-----------|-------------|---------|
| `FinancialContext.tsx` | DEFAULT_JARS | `GET /api/v1/jars` | 🔴 Cao |
| `FinancialContext.tsx` | balances hardcode | `GET /api/v1/balances` | 🔴 Cao |
| `FinancialContext.tsx` | mock transactions | `GET /api/v1/transactions` | 🔴 Cao |
| `FinancialContext.tsx` | mock alerts | `GET /api/v1/alerts` | 🟡 Trung bình |
| `FinancialContext.tsx` | discipline scores | `GET /api/v1/discipline` | 🟡 Trung bình |
| `FinancialContext.tsx` | userName, setup state | `GET /api/v1/users/me` | 🔴 Cao |
| `FinancialContext.tsx` | completeSetup() | `POST /api/v1/users/me/complete-setup` | 🔴 Cao |
| `FinancialContext.tsx` | addTransaction() | `POST /api/v1/transactions` | 🔴 Cao |
| `FinancialContext.tsx` | confirmPending() | `PUT /api/v1/transactions/:id/confirm` | 🔴 Cao |
| `FinancialContext.tsx` | deletePending() | `DELETE /api/v1/transactions/:id` | 🟡 Trung bình |
| `FinancialContext.tsx` | recategorize() | `PUT /api/v1/transactions/:id/recategorize` | 🟡 Trung bình |
| `FinancialContext.tsx` | fundGoal() | `POST /api/v1/jars/:goalId/fund` | 🔴 Cao |
| `FinancialContext.tsx` | withdrawFromGoal() | `POST /api/v1/jars/:goalId/withdraw` | 🔴 Cao |
| `FinancialContext.tsx` | updateJarRatios() | `PUT /api/v1/jars/ratios` | 🟡 Trung bình |
| `FinancialContext.tsx` | addJar() | `POST /api/v1/jars` | 🔴 Cao |
| `FinancialContext.tsx` | deleteJar() | `DELETE /api/v1/jars/:id` | 🟡 Trung bình |
| `FinancialContext.tsx` | runIncomeAllocation() | `POST /api/v1/income/allocate` | 🔴 Cao |
| `FinancialContext.tsx` | runOCRBillScan() | `POST /api/v1/ocr/scan` | 🟢 Thấp |
| `FinancialContext.tsx` | runBankSync() | `POST /api/v1/bank/sync` | 🟢 Thấp |
| `FinancialContext.tsx` | markAlertAsRead() | `PUT /api/v1/alerts/:id/read` | 🟡 Trung bình |
| `FinancialContext.tsx` | clearAlerts() | `DELETE /api/v1/alerts` | 🟡 Trung bình |
| `FinancialContext.tsx` | updateStreak() | `POST /api/v1/discipline/checkin` | 🟡 Trung bình |
| `RecordScreen.tsx` | MOCK_RECEIPTS | Camera + `POST /api/v1/ocr/scan` | 🟢 Thấp |
| `DisciplineScreen.tsx` | pastDays hardcode | Từ `GET /api/v1/discipline` | 🟡 Trung bình |

---

## Thứ tự triển khai đề xuất

### Phase 1 — Core (Ưu tiên 🔴)
1. `GET /api/v1/users/me` + `POST /api/v1/users/me/complete-setup`
2. `GET /api/v1/balances` + `PUT /api/v1/balances`
3. `GET /api/v1/jars` + `POST /api/v1/jars` + `DELETE /api/v1/jars/:id`
4. `POST /api/v1/jars/:goalId/fund` + `POST /api/v1/jars/:goalId/withdraw`
5. `GET /api/v1/transactions` + `POST /api/v1/transactions`
6. `PUT /api/v1/transactions/:id/confirm`
7. `POST /api/v1/income/allocate`

### Phase 2 — Enhancement (Ưu tiên 🟡)
8. `PUT /api/v1/jars/ratios`
9. `DELETE /api/v1/transactions/:id`
10. `PUT /api/v1/transactions/:id/recategorize`
11. `GET /api/v1/alerts` + `PUT /api/v1/alerts/:id/read` + `DELETE /api/v1/alerts`
12. `GET /api/v1/discipline` + `POST /api/v1/discipline/checkin`

### Phase 3 — Advanced AI Features (Ưu tiên 🟢)
13. `POST /api/v1/ocr/scan` (OCR + AI classification)
14. `POST /api/v1/bank/sync` (Open Banking integration)
