# WIVI - User Flow (Luồng người dùng)

## Tổng quan kiến trúc

WIVI là ứng dụng quản lý tài chính cá nhân theo hệ thống hũ (Jars). Hiện tại toàn bộ dữ liệu tài chính (jars, transactions, alerts, discipline) đang sử dụng **mock data cứng** trong `FinancialContext.tsx`. Phần Auth đã kết nối NestJS Backend + Supabase.

---

## Sơ đồ User Flow

```mermaid
flowchart TD
    A["Mở App"] --> B{"isLoading?"}
    B -- Đang tải --> LOAD["Loading Screen"]
    B -- Đã tải --> C{"isAuthenticated?"}

    C -- Chưa đăng nhập --> D["OnboardingScreen (Step 3 - Sign In)"]
    D --> D1["LoginScreen"]
    D --> D2["RegisterScreen"]
    D --> D3["OtpVerificationScreen"]
    D --> D4["ForgotPasswordScreen"]

    D1 -- "Email + Password" --> AUTH_LOGIN["POST /api/v1/auth/login"]
    D1 -- "Google OAuth" --> AUTH_GOOGLE["Google OAuth 2.0"]
    D2 -- "Email + Password + Username" --> AUTH_REGISTER["POST /api/v1/auth/register"]
    AUTH_REGISTER --> AUTH_OTP_SEND["POST /api/v1/auth/send-otp"]
    AUTH_OTP_SEND --> D3
    D3 -- "Email + OTP Code" --> AUTH_OTP_VERIFY["POST /api/v1/auth/verify-otp"]
    D4 -- "Email + OTP + New Password" --> AUTH_RESET["POST /api/v1/auth/reset-password"]

    AUTH_LOGIN --> C2
    AUTH_OTP_VERIFY --> C2
    AUTH_GOOGLE --> C2

    C -- Đã đăng nhập --> C2{"hasCompletedSetup?"}
    C2 -- Chưa setup --> E["OnboardingScreen (Step 4 - Thiết lập hũ)"]
    E -- "completeSetup()" --> F["MainApp"]

    C2 -- Đã setup --> F

    F --> TAB["FloatingTabBar (5 tabs)"]

    TAB --> T1["🏠 HomeScreen"]
    TAB --> T2["📋 HistoryScreen"]
    TAB --> T3["➕ RecordScreen"]
    TAB --> T4["🏺 JarsScreen"]
    TAB --> T5["📊 DisciplineScreen"]

    T1 --> T1A["Xem tổng quan số dư (cash + bank)"]
    T1 --> T1B["Xem danh sách hũ chi tiêu & mục tiêu"]
    T1 --> T1C["Nộp tiền vào Goal (fundGoal)"]
    T1 --> T1D["Rút tiền từ Goal (withdrawFromGoal)"]
    T1 --> T1E["Thêm Goal mới (addJar type=save)"]
    T1 --> T1F["Xem & Quản lý Alerts"]
    T1 --> T1G["Phân loại lại giao dịch (recategorize)"]

    T2 --> T2A["Lọc giao dịch: All/Income/Expense/Unclassified"]
    T2 --> T2B["Tìm kiếm giao dịch"]
    T2 --> T2C["Xác nhận pending transaction"]
    T2 --> T2D["Xóa pending transaction"]
    T2 --> T2E["Phân loại lại giao dịch"]

    T3 --> T3A["Nhập tay (addTransaction)"]
    T3 --> T3B["Quét hóa đơn OCR (runOCRBillScan)"]
    T3 --> T3C["Đồng bộ ngân hàng (runBankSync)"]

    T4 --> T4A["Xem danh sách hũ chi tiêu"]
    T4 --> T4B["Chỉnh tỷ lệ phân bổ (updateJarRatios)"]
    T4 --> T4C["Thêm hũ mới (addJar type=spend)"]
    T4 --> T4D["Xóa hũ (deleteJar)"]
    T4 --> T4E["Xem chi tiết giao dịch theo hũ"]

    T5 --> T5A["Xem điểm kỷ luật tài chính"]
    T5 --> T5B["Xem streak liên tục"]
    T5 --> T5C["Xem dự báo & cảnh báo"]
    T5 --> T5D["Xem số dư dự kiến cuối tháng"]

    F --> LOGOUT["Đăng xuất (logout)"]
    LOGOUT --> AUTH_LOGOUT["POST /api/v1/auth/logout"]
    AUTH_LOGOUT --> D
```

---

## Chi tiết từng Screen

### 1. OnboardingScreen (Onboarding 5 bước)
| Bước | Nội dung | Dữ liệu cần |
|------|----------|-------------|
| Step 1 | Giới thiệu app | - |
| Step 2 | Giới thiệu tính năng | - |
| Step 3 | Đăng nhập / Đăng ký | Auth API |
| Step 4 | Thiết lập hũ tài chính ban đầu | `completeSetup()` → **CẦN API** |
| Step 5 | Hoàn tất | - |

### 2. HomeScreen (Trang chủ)
- Hiển thị tổng số dư (cash + bank)
- Danh sách hũ chi tiêu (spend jars) với progress bar
- Danh sách mục tiêu tiết kiệm (save jars/goals) với thanh tiến độ
- Giao dịch gần đây (3-5 giao dịch mới nhất)
- Thông báo (alerts) modal
- Nộp/Rút tiền mục tiêu
- Phân loại lại giao dịch

### 3. RecordScreen (Ghi nhận giao dịch)
- **Tab Nhập tay**: Chọn loại (income/expense), nhập số tiền, mô tả, chọn hũ
- **Tab Quét OCR**: Chọn hóa đơn → AI phân loại tự động
- **Tab Đồng bộ Bank**: Chọn ngân hàng → Đồng bộ giao dịch

### 4. HistoryScreen (Lịch sử giao dịch)
- Lọc theo loại: Tất cả / Thu nhập / Chi tiêu / Chưa phân loại
- Tìm kiếm theo mô tả
- Nhóm theo ngày (Hôm nay / Hôm qua / Ngày cụ thể)
- Xác nhận / Xóa giao dịch pending
- Phân loại lại giao dịch

### 5. JarsScreen (Quản lý hũ)
- Xem danh sách hũ chi tiêu với số dư
- Chỉnh tỷ lệ phân bổ (slider +/-), tổng phải = 100%
- Thêm hũ chi tiêu mới
- Xóa hũ (tự động phân bổ lại %)
- Xem chi tiết giao dịch từng hũ

### 6. DisciplineScreen (Kỷ luật tài chính)
- Điểm kỷ luật tài chính (0-100)
- Chuỗi streak liên tục (số ngày)
- Dự báo số dư cuối tháng
- Cảnh báo & Lời khuyên tài chính
