# WIVI - API Specifications (Đặc tả API)

> **Trạng thái hiện tại:** Phần Auth đã kết nối NestJS Backend (`/api/v1/auth/*`). Phần Financial (jars, transactions, balances, discipline) đang dùng **mock data cứng** trong `FinancialContext.tsx` → cần backend API.

---

## Mục lục

- [Module 1: Authentication (Đã có)](#module-1-authentication-đã-có)
- [Module 2: User Profile & Onboarding (CẦN TẠO)](#module-2-user-profile--onboarding-cần-tạo)
- [Module 3: Balances (CẦN TẠO)](#module-3-balances-cần-tạo)
- [Module 4: Jars Management (CẦN TẠO)](#module-4-jars-management-cần-tạo)
- [Module 5: Transactions (CẦN TẠO)](#module-5-transactions-cần-tạo)
- [Module 6: Income Allocation (CẦN TẠO)](#module-6-income-allocation-cần-tạo)
- [Module 7: OCR Bill Scan (CẦN TẠO)](#module-7-ocr-bill-scan-cần-tạo)
- [Module 8: Bank Sync (CẦN TẠO)](#module-8-bank-sync-cần-tạo)
- [Module 9: Alerts & Notifications (CẦN TẠO)](#module-9-alerts--notifications-cần-tạo)
- [Module 10: Discipline & Forecast (CẦN TẠO)](#module-10-discipline--forecast-cần-tạo)

---

## Quy ước chung

| Thuộc tính | Giá trị |
|------------|---------|
| Base URL | `EXPO_PUBLIC_NEST_API_URL` (ví dụ: `http://localhost:3000`) |
| API Prefix | `/api/v1` |
| Content-Type | `application/json` |
| Auth Header | `Authorization: Bearer <accessToken>` |
| Đơn vị tiền | VND (số nguyên, không thập phân) |
| Ngày giờ | ISO 8601 (UTC): `2026-09-22T10:30:00.000Z` |

### Response chuẩn

```json
// Thành công
{
  "success": true,
  "data": { ... },
  "message": "Thao tác thành công."
}

// Thất bại
{
  "success": false,
  "message": "Mô tả lỗi cụ thể.",
  "error": "ERROR_CODE"
}
```

---

## Module 1: Authentication (Đã có)

> ✅ **Đã triển khai trong `authService.ts`** — Các API này đã hoạt động.

### 1.1 `POST /api/v1/auth/register` — Đăng ký tài khoản

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "username": "Nguyen Van A"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Đăng ký tài khoản thành công!",
  "data": {
    "id": "usr_123456",
    "email": "user@example.com",
    "username": "Nguyen Van A"
  }
}
```

**Validation:**
| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `email` | string | ✅ | Email hợp lệ, unique |
| `password` | string | ✅ | Min 6 ký tự |
| `username` | string | ✅ | Min 2 ký tự, max 50 |

---

### 1.2 `POST /api/v1/auth/login` — Đăng nhập

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Đăng nhập thành công!",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "id": "usr_123456",
    "email": "user@example.com",
    "username": "Nguyen Van A",
    "role": "user"
  }
}
```

---

### 1.3 `POST /api/v1/auth/send-otp` — Gửi mã OTP

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Mã OTP đã được gửi thành công!"
}
```

---

### 1.4 `POST /api/v1/auth/verify-otp` — Xác minh OTP

**Request Body:**
```json
{
  "email": "user@example.com",
  "code": "123456"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Xác minh OTP thành công!",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "id": "usr_123456",
    "email": "user@example.com"
  }
}
```

---

### 1.5 `POST /api/v1/auth/reset-password` — Đặt lại mật khẩu

**Request Body:**
```json
{
  "email": "user@example.com",
  "code": "123456",
  "newPassword": "newSecurePassword456"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Đặt lại mật khẩu thành công!"
}
```

---

### 1.6 `POST /api/v1/auth/logout` — Đăng xuất

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "message": "Đăng xuất thành công."
}
```

---

## Module 2: User Profile & Onboarding (CẦN TẠO)

> Dùng cho OnboardingScreen Step 4 (thiết lập ban đầu) và UserProfileCard.

### 2.1 `GET /api/v1/users/me` — Lấy thông tin người dùng hiện tại

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "usr_123456",
    "email": "user@example.com",
    "username": "Nguyen Van A",
    "full_name": "Nguyễn Văn A",
    "avatar_url": "https://ui-avatars.com/api/?name=Nguyen+Van+A",
    "role": "user",
    "has_completed_setup": false,
    "monthly_income_goal": 0,
    "created_at": "2026-09-01T00:00:00.000Z",
    "updated_at": "2026-09-22T10:00:00.000Z"
  }
}
```

**Response Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `id` | string | UUID người dùng |
| `email` | string | Email đăng ký |
| `username` | string | Tên hiển thị |
| `full_name` | string \| null | Họ tên đầy đủ |
| `avatar_url` | string \| null | URL ảnh đại diện |
| `role` | `"admin"` \| `"user"` | Quyền hạn |
| `has_completed_setup` | boolean | Đã hoàn tất thiết lập chưa |
| `monthly_income_goal` | number | Mục tiêu thu nhập tháng (VND) |
| `created_at` | string | Ngày tạo (ISO 8601) |
| `updated_at` | string | Ngày cập nhật (ISO 8601) |

---

### 2.2 `PUT /api/v1/users/me` — Cập nhật thông tin người dùng

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "username": "Nguyen Van A",
  "full_name": "Nguyễn Văn A",
  "avatar_url": "https://example.com/avatar.jpg",
  "monthly_income_goal": 30000000
}
```

**Validation:**
| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `username` | string | ❌ | Max 50 ký tự |
| `full_name` | string | ❌ | Max 100 ký tự |
| `avatar_url` | string | ❌ | URL hợp lệ |
| `monthly_income_goal` | number | ❌ | >= 0 |

---

### 2.3 `POST /api/v1/users/me/complete-setup` — Hoàn tất thiết lập ban đầu

> Được gọi từ `completeSetup()` trong `FinancialContext.tsx` — OnboardingScreen Step 4.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "name": "Nguyễn Văn A",
  "initial_cash": 35000000,
  "initial_bank": 100000000,
  "monthly_income_goal": 30000000,
  "jars": [
    {
      "name": "Chi tiêu thiết yếu",
      "type": "spend",
      "allocation_percent": 70,
      "color": "#0066cc"
    },
    {
      "name": "Giáo dục & Giải trí",
      "type": "spend",
      "allocation_percent": 30,
      "color": "#9b59b6"
    },
    {
      "name": "MacBook Fund",
      "type": "save",
      "allocation_percent": 0,
      "target_amount": 20000000,
      "color": "#3be2b0",
      "frequency": "weekly",
      "frequency_amount": 500000,
      "target_date": "2026-12-15"
    }
  ]
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Thiết lập tài chính thành công!",
  "data": {
    "has_completed_setup": true,
    "balances": {
      "cash": 35000000,
      "bank": 100000000
    },
    "jars": [
      {
        "id": "jar_001",
        "name": "Chi tiêu thiết yếu",
        "type": "spend",
        "allocation_percent": 70,
        "balance": 94500000,
        "color": "#0066cc"
      }
    ]
  }
}
```

**Jar Object Fields (trong request):**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | ✅ | Tên hũ (max 50) |
| `type` | `"spend"` \| `"save"` | ✅ | Loại hũ |
| `allocation_percent` | number | ✅ | Tỷ lệ phân bổ (0-100). Tổng spend jars = 100%, save jars luôn = 0% |
| `color` | string | ✅ | Mã màu hex (#RRGGBB) |
| `target_amount` | number | ❌ | Chỉ cho `type=save`, số tiền mục tiêu |
| `frequency` | `"daily"` \| `"weekly"` \| `"monthly"` | ❌ | Chỉ cho `type=save`, tần suất tiết kiệm |
| `frequency_amount` | number | ❌ | Chỉ cho `type=save`, số tiền tiết kiệm mỗi lần |
| `target_date` | string | ❌ | Chỉ cho `type=save`, ngày hoàn thành mục tiêu (YYYY-MM-DD) |

---

## Module 3: Balances (CẦN TẠO)

> Hiện đang hardcode: `{ cash: 35000000, bank: 100000000 }`

### 3.1 `GET /api/v1/balances` — Lấy số dư tổng hợp

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "cash": 35000000,
    "bank": 100000000,
    "total": 135000000,
    "updated_at": "2026-09-22T10:00:00.000Z"
  }
}
```

**Response Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `cash` | number | Số dư tiền mặt (VND) |
| `bank` | number | Số dư tài khoản ngân hàng (VND) |
| `total` | number | Tổng số dư = cash + bank |
| `updated_at` | string | Lần cập nhật cuối |

---

### 3.2 `PUT /api/v1/balances` — Cập nhật số dư thủ công

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "cash": 40000000,
  "bank": 95000000
}
```

---

## Module 4: Jars Management (CẦN TẠO)

> Hiện đang hardcode `DEFAULT_JARS` trong `FinancialContext.tsx`.

### 4.1 `GET /api/v1/jars` — Lấy danh sách hũ tài chính

**Headers:** `Authorization: Bearer <token>`

**Query Params:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `type` | `"spend"` \| `"save"` \| `"all"` | `"all"` | Lọc theo loại hũ |

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "jar_001",
      "name": "Chi tiêu thiết yếu",
      "type": "spend",
      "allocation_percent": 70,
      "balance": 12000000,
      "color": "#0066cc",
      "created_at": "2026-09-01T00:00:00.000Z",
      "updated_at": "2026-09-22T10:00:00.000Z"
    },
    {
      "id": "jar_002",
      "name": "MacBook Fund",
      "type": "save",
      "allocation_percent": 0,
      "balance": 15000000,
      "target_amount": 20000000,
      "color": "#3be2b0",
      "frequency": "weekly",
      "frequency_amount": 500000,
      "target_date": "2026-12-15",
      "created_at": "2026-09-01T00:00:00.000Z",
      "updated_at": "2026-09-22T10:00:00.000Z"
    }
  ]
}
```

**Jar Response Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `id` | string | UUID hũ |
| `name` | string | Tên hũ |
| `type` | `"spend"` \| `"save"` | Loại hũ (chi tiêu / tiết kiệm) |
| `allocation_percent` | number | Tỷ lệ phân bổ thu nhập (0-100) |
| `balance` | number | Số dư hiện tại (VND) |
| `target_amount` | number \| null | Chỉ cho `save`, số tiền mục tiêu |
| `color` | string | Mã màu hex |
| `frequency` | string \| null | Chỉ cho `save`: `"daily"` \| `"weekly"` \| `"monthly"` |
| `frequency_amount` | number \| null | Chỉ cho `save`, số tiền tiết kiệm mỗi lần |
| `target_date` | string \| null | Chỉ cho `save`, ngày hoàn thành (YYYY-MM-DD) |
| `created_at` | string | Ngày tạo |
| `updated_at` | string | Ngày cập nhật cuối |

---

### 4.2 `POST /api/v1/jars` — Tạo hũ mới

**Headers:** `Authorization: Bearer <token>`

**Request Body (Hũ chi tiêu):**
```json
{
  "name": "Giải trí cuối tuần",
  "type": "spend",
  "allocation_percent": 20,
  "color": "#ffb83d"
}
```

**Request Body (Hũ tiết kiệm / Goal):**
```json
{
  "name": "Travel Fund",
  "type": "save",
  "target_amount": 5000000,
  "color": "#1abc9c",
  "frequency": "weekly",
  "frequency_amount": 150000,
  "target_date": "2026-12-31"
}
```

**Validation:**
| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `name` | string | ✅ | Min 1, max 50 ký tự |
| `type` | `"spend"` \| `"save"` | ✅ | Chỉ 2 giá trị |
| `allocation_percent` | number | ✅ nếu spend | 0-100, tổng tất cả spend jars = 100% |
| `color` | string | ✅ | Hex color: `#RRGGBB` |
| `target_amount` | number | ✅ nếu save | > 0 |
| `frequency` | string | ❌ | `"daily"` \| `"weekly"` \| `"monthly"` |
| `frequency_amount` | number | ❌ | > 0 |
| `target_date` | string | ❌ | `YYYY-MM-DD`, phải là ngày tương lai |

**Response (201):**
```json
{
  "success": true,
  "message": "Tạo hũ tài chính thành công!",
  "data": {
    "id": "jar_006",
    "name": "Travel Fund",
    "type": "save",
    "allocation_percent": 0,
    "balance": 0,
    "target_amount": 5000000,
    "color": "#1abc9c",
    "frequency": "weekly",
    "frequency_amount": 150000,
    "target_date": "2026-12-31"
  }
}
```

> **Lưu ý:** Khi thêm hũ spend mới, backend phải tự động rebalance tỷ lệ các hũ spend cũ sao cho tổng = 100%.

---

### 4.3 `PUT /api/v1/jars/:jarId` — Cập nhật hũ

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "name": "Chi tiêu ăn uống",
  "color": "#2ecc71",
  "target_amount": 25000000,
  "frequency": "monthly",
  "frequency_amount": 200000,
  "target_date": "2027-06-30"
}
```

---

### 4.4 `DELETE /api/v1/jars/:jarId` — Xóa hũ

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "message": "Đã xóa hũ tài chính. Tỷ lệ phân bổ được chia lại.",
  "data": {
    "rebalanced_jars": [
      { "id": "jar_001", "allocation_percent": 100 }
    ]
  }
}
```

> **Logic Backend:** Khi xóa hũ spend, phân chia lại % cho các hũ spend còn lại (tỷ lệ thuận với % hiện tại).

---

### 4.5 `PUT /api/v1/jars/ratios` — Cập nhật tỷ lệ phân bổ hàng loạt

> Được gọi từ `updateJarRatios()`.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "ratios": [
    { "id": "jar_001", "percent": 60 },
    { "id": "jar_005", "percent": 40 }
  ]
}
```

**Validation:**
- Tổng `percent` của tất cả spend jars phải = 100%
- Chỉ áp dụng cho `type=spend`

**Response (200):**
```json
{
  "success": true,
  "message": "Cập nhật tỷ lệ phân bổ thành công!"
}
```

---

### 4.6 `POST /api/v1/jars/:goalId/fund` — Nộp tiền vào Goal (tiết kiệm)

> Được gọi từ `fundGoal()`.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "source_jar_id": "jar_001",
  "amount": 500000
}
```

**Validation:**
| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `source_jar_id` | string | ✅ | ID hũ nguồn (spend jar), phải có đủ số dư |
| `amount` | number | ✅ | > 0, <= source_jar.balance |

**Response (200):**
```json
{
  "success": true,
  "message": "Đã nộp 500,000 VND vào quỹ MacBook Fund.",
  "data": {
    "source_jar": { "id": "jar_001", "new_balance": 11500000 },
    "goal_jar": { "id": "jar_002", "new_balance": 15500000 },
    "transactions": [
      {
        "id": "tx_tr_001",
        "amount": 500000,
        "type": "expense",
        "description": "Trích nộp quỹ: MacBook Fund",
        "jar_id": "jar_001",
        "is_transfer": true,
        "date": "2026-09-22T10:30:00.000Z"
      },
      {
        "id": "tx_tr_002",
        "amount": 500000,
        "type": "income",
        "description": "Nhận nộp từ hũ: Chi tiêu thiết yếu",
        "jar_id": "jar_002",
        "is_transfer": true,
        "date": "2026-09-22T10:30:00.000Z"
      }
    ]
  }
}
```

---

### 4.7 `POST /api/v1/jars/:goalId/withdraw` — Rút tiền từ Goal

> Được gọi từ `withdrawFromGoal()`.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "target_jar_id": "jar_001",
  "amount": 200000
}
```

**Validation:**
| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `target_jar_id` | string | ✅ | ID hũ đích (spend jar) |
| `amount` | number | ✅ | > 0, <= goal_jar.balance |

**Response (200):** *(tương tự fund nhưng chiều ngược lại)*

---

## Module 5: Transactions (CẦN TẠO)

> Hiện đang hardcode danh sách transactions mock trong state.

### 5.1 `GET /api/v1/transactions` — Lấy danh sách giao dịch

**Headers:** `Authorization: Bearer <token>`

**Query Params:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `type` | `"income"` \| `"expense"` \| `"all"` | `"all"` | Lọc loại giao dịch |
| `jar_id` | string | - | Lọc theo hũ |
| `is_pending` | boolean | - | Lọc pending transactions |
| `is_transfer` | boolean | - | Lọc internal transfers |
| `search` | string | - | Tìm kiếm theo mô tả |
| `from_date` | string | - | Từ ngày (ISO 8601) |
| `to_date` | string | - | Đến ngày (ISO 8601) |
| `page` | number | 1 | Trang hiện tại |
| `limit` | number | 20 | Số kết quả mỗi trang |
| `sort` | `"date_asc"` \| `"date_desc"` | `"date_desc"` | Sắp xếp |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "transactions": [
      {
        "id": "tx_001",
        "amount": 15000000,
        "type": "income",
        "description": "Nhận lương tháng 10",
        "date": "2026-10-05T00:00:00.000Z",
        "jar_id": "jar_001",
        "is_pending": false,
        "confidence": 1.0,
        "suggested_jar_id": null,
        "is_transfer": false,
        "source": "bank",
        "created_at": "2026-10-05T08:00:00.000Z"
      },
      {
        "id": "tx_002",
        "amount": 120000,
        "type": "expense",
        "description": "Grab Bike di chuyển",
        "date": "2026-09-22T10:00:00.000Z",
        "jar_id": "jar_001",
        "is_pending": true,
        "confidence": 0.65,
        "suggested_jar_id": "jar_001",
        "is_transfer": false,
        "source": "cash",
        "created_at": "2026-09-22T10:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "total_pages": 3
    }
  }
}
```

**Transaction Response Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `id` | string | UUID giao dịch |
| `amount` | number | Số tiền (VND) |
| `type` | `"income"` \| `"expense"` | Loại: thu nhập / chi tiêu |
| `description` | string | Mô tả giao dịch |
| `date` | string | Ngày giao dịch (ISO 8601) |
| `jar_id` | string | ID hũ được phân loại |
| `is_pending` | boolean | Đang chờ user xác nhận (AI đề xuất) |
| `confidence` | number | Độ tin cậy AI (0.0 → 1.0) |
| `suggested_jar_id` | string \| null | ID hũ AI đề xuất (khi pending) |
| `is_transfer` | boolean | Giao dịch nội bộ giữa các hũ |
| `source` | `"cash"` \| `"bank"` | Nguồn tiền |
| `created_at` | string | Ngày tạo record |

---

### 5.2 `POST /api/v1/transactions` — Tạo giao dịch thủ công

> Được gọi từ `addTransaction()` — RecordScreen tab "Nhập tay".

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "amount": 300000,
  "type": "expense",
  "description": "Ăn tối nhà hàng",
  "jar_id": "jar_001",
  "source": "cash"
}
```

**Validation:**
| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `amount` | number | ✅ | > 0 |
| `type` | `"income"` \| `"expense"` | ✅ | Chỉ 2 giá trị |
| `description` | string | ✅ | Min 1, max 200 |
| `jar_id` | string | ✅ | ID hũ hợp lệ (chỉ spend jars) |
| `source` | `"cash"` \| `"bank"` | ❌ | Default: `"cash"` |

**Response (201):**
```json
{
  "success": true,
  "message": "Giao dịch đã được ghi nhận.",
  "data": {
    "id": "tx_003",
    "amount": 300000,
    "type": "expense",
    "description": "Ăn tối nhà hàng",
    "date": "2026-09-22T17:30:00.000Z",
    "jar_id": "jar_001",
    "is_pending": false,
    "confidence": 1.0,
    "source": "cash"
  }
}
```

> **Side Effects Backend:** Khi tạo expense → trừ balance hũ tương ứng + trừ balance tổng (cash/bank). Khi tạo income → cộng tương ứng.

---

### 5.3 `PUT /api/v1/transactions/:txId/confirm` — Xác nhận pending transaction

> Được gọi từ `confirmPendingTransaction()`.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "jar_id": "jar_001"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Đã xác nhận giao dịch.",
  "data": {
    "id": "tx_002",
    "is_pending": false,
    "jar_id": "jar_001",
    "confidence": 1.0
  }
}
```

> **Side Effects Backend:** Chuyển `is_pending` = false, áp dụng hiệu ứng tài chính (trừ/cộng balance hũ + tổng).

---

### 5.4 `DELETE /api/v1/transactions/:txId` — Xóa pending transaction

> Được gọi từ `deletePendingTransaction()`.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "message": "Đã xóa giao dịch chờ xác nhận."
}
```

> **Chỉ cho phép xóa** giao dịch có `is_pending = true`.

---

### 5.5 `PUT /api/v1/transactions/:txId/recategorize` — Phân loại lại giao dịch

> Được gọi từ `recategorizeTransaction()`.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "new_jar_id": "jar_005"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Đã chuyển giao dịch sang hũ Giáo dục & Giải trí.",
  "data": {
    "id": "tx_003",
    "old_jar_id": "jar_001",
    "new_jar_id": "jar_005",
    "affected_jars": [
      { "id": "jar_001", "new_balance": 12300000 },
      { "id": "jar_005", "new_balance": 4700000 }
    ]
  }
}
```

> **Side Effects Backend:** Hoàn tiền hũ cũ + trừ tiền hũ mới (cho expense). Ngược lại cho income.

---

## Module 6: Income Allocation (CẦN TẠO)

> Hiện đang tính toán client-side trong `runIncomeAllocation()`.

### 6.1 `POST /api/v1/income/allocate` — Phân bổ thu nhập tự động vào các hũ

> Được gọi từ `runIncomeAllocation()`.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "amount": 15000000,
  "source": "bank"
}
```

**Validation:**
| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `amount` | number | ✅ | > 0 |
| `source` | `"cash"` \| `"bank"` | ✅ | Nguồn tiền nhận |

**Response (200):**
```json
{
  "success": true,
  "message": "Phân bổ thu nhập thành công!",
  "data": {
    "total_amount": 15000000,
    "source": "bank",
    "allocations": [
      { "jar_id": "jar_001", "jar_name": "Chi tiêu thiết yếu", "percent": 70, "allocated_amount": 10500000, "new_balance": 22500000 },
      { "jar_id": "jar_005", "jar_name": "Giáo dục & Giải trí", "percent": 30, "allocated_amount": 4500000, "new_balance": 9500000 }
    ],
    "new_balances": {
      "cash": 35000000,
      "bank": 115000000
    },
    "transaction_id": "tx_alloc_001"
  }
}
```

> **Logic Backend:** Chia tiền theo `allocation_percent` của mỗi spend jar. Cộng vào balance mỗi hũ + cộng balance tổng (cash/bank). Tạo 1 transaction income ghi nhận.

---

## Module 7: OCR Bill Scan (CẦN TẠO)

> Hiện đang dùng mock receipts và logic phân loại cứng trong `runOCRBillScan()`.

### 7.1 `POST /api/v1/ocr/scan` — Quét và phân loại hóa đơn bằng AI

> Được gọi từ `runOCRBillScan()` — RecordScreen tab "Quét hóa đơn".

**Headers:** `Authorization: Bearer <token>`

**Request Body (multipart/form-data):**
```
image: <file> (ảnh hóa đơn - JPEG/PNG)
```

**Hoặc Request Body (JSON — cho trường hợp đã OCR sẵn):**
```json
{
  "merchant_name": "Highlands Coffee",
  "amount": 85000
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Quét hóa đơn thành công!",
  "data": {
    "transaction": {
      "id": "tx_ocr_001",
      "amount": 85000,
      "type": "expense",
      "description": "Quét hóa đơn: Highlands Coffee",
      "date": "2026-09-22T12:00:00.000Z",
      "jar_id": "jar_005",
      "is_pending": false,
      "confidence": 0.88,
      "suggested_jar_id": null,
      "source": "cash"
    },
    "ocr_details": {
      "merchant_name": "Highlands Coffee",
      "extracted_amount": 85000,
      "ai_category": "Giáo dục & Giải trí",
      "confidence": 0.88
    }
  }
}
```

**Pending Case (confidence < 0.6):**
```json
{
  "success": true,
  "data": {
    "transaction": {
      "id": "tx_ocr_002",
      "amount": 15000000,
      "type": "expense",
      "description": "Quét hóa đơn: Apple Store Vietnam",
      "jar_id": "jar_005",
      "is_pending": true,
      "confidence": 0.45,
      "suggested_jar_id": "jar_005"
    }
  }
}
```

> **Logic Backend AI:**
> - `confidence >= 0.6` → Tự động phân loại, `is_pending = false`, áp dụng balance ngay
> - `confidence < 0.6` → `is_pending = true`, chờ user xác nhận tại HistoryScreen

---

## Module 8: Bank Sync (CẦN TẠO)

> Hiện đang dùng `mockSyncedTransactions` hardcode trong `runBankSync()`.

### 8.1 `POST /api/v1/bank/sync` — Đồng bộ giao dịch từ ngân hàng

> Được gọi từ `runBankSync()` — RecordScreen tab "Đồng bộ Bank".

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "bank_code": "VCB"
}
```

**Supported Banks (hiện tại mock):**
| Code | Name |
|------|------|
| `VCB` | Vietcombank |
| `TCB` | Techcombank |
| `MBB` | MB Bank |
| `ACB` | ACB |
| `BIDV` | BIDV |

**Response (200):**
```json
{
  "success": true,
  "message": "Đồng bộ thành công! Ghi nhận 3 giao dịch mới.",
  "data": {
    "synced_count": 3,
    "transactions": [
      {
        "id": "tx_sync_001",
        "amount": 5000000,
        "type": "income",
        "description": "Đồng bộ Ngân hàng: Chuyển khoản phụ cấp",
        "date": "2026-09-22T08:00:00.000Z",
        "jar_id": "jar_001",
        "confidence": 0.99,
        "source": "bank"
      },
      {
        "id": "tx_sync_002",
        "amount": 85000,
        "type": "expense",
        "description": "Đồng bộ Ngân hàng: Highlands Coffee",
        "date": "2026-09-22T09:00:00.000Z",
        "jar_id": "jar_005",
        "confidence": 0.99,
        "source": "bank"
      },
      {
        "id": "tx_sync_003",
        "amount": 1200000,
        "type": "expense",
        "description": "Đồng bộ Ngân hàng: Đóng tiền điện nước",
        "date": "2026-09-22T10:00:00.000Z",
        "jar_id": "jar_001",
        "confidence": 0.99,
        "source": "bank"
      }
    ],
    "new_balances": {
      "cash": 35000000,
      "bank": 103715000
    }
  }
}
```

---

## Module 9: Alerts & Notifications (CẦN TẠO)

> Hiện đang dùng state `alerts` hardcode trong `FinancialContext.tsx`.

### 9.1 `GET /api/v1/alerts` — Lấy danh sách thông báo

**Headers:** `Authorization: Bearer <token>`

**Query Params:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `read` | boolean | - | Lọc đã đọc/chưa đọc |
| `type` | `"info"` \| `"warning"` \| `"danger"` | - | Lọc theo mức độ |

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "alert_001",
      "title": "Chào mừng bạn đến với WIBI!",
      "message": "Thiết lập ngân sách thành công. Hệ thống hũ tài chính đã sẵn sàng.",
      "date": "2026-09-22T10:00:00.000Z",
      "type": "info",
      "read": false
    },
    {
      "id": "alert_002",
      "title": "Cảnh báo ngân sách: Chi tiêu thiết yếu",
      "message": "Số dư hũ chỉ còn 150,000 VND. Hãy cân nhắc cắt giảm chi tiêu.",
      "date": "2026-09-22T15:00:00.000Z",
      "type": "warning",
      "read": false
    }
  ]
}
```

**Alert Response Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `id` | string | UUID thông báo |
| `title` | string | Tiêu đề |
| `message` | string | Nội dung chi tiết |
| `date` | string | Ngày tạo (ISO 8601) |
| `type` | `"info"` \| `"warning"` \| `"danger"` | Mức độ |
| `read` | boolean | Đã đọc chưa |

---

### 9.2 `PUT /api/v1/alerts/:alertId/read` — Đánh dấu đã đọc

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "message": "Đã đánh dấu thông báo là đã đọc."
}
```

---

### 9.3 `DELETE /api/v1/alerts` — Xóa tất cả thông báo

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "message": "Đã xóa tất cả thông báo."
}
```

---

## Module 10: Discipline & Forecast (CẦN TẠO)

> Hiện đang tính toán hoàn toàn client-side trong `useEffect` của `FinancialContext.tsx`.

### 10.1 `GET /api/v1/discipline` — Lấy chỉ số kỷ luật & dự báo

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "discipline_score": 85,
    "streak_count": 5,
    "streak_history": [
      "2026-09-15",
      "2026-09-16",
      "2026-09-17",
      "2026-09-18",
      "2026-09-19"
    ],
    "forecast": {
      "estimated_end_balance": 142500000,
      "warnings": [
        "Cảnh báo: Tốc độ chi tiêu quá nhanh!"
      ],
      "recommendations": [
        "Lời khuyên: Tạm dừng các hoạt động Giải trí trong 7 ngày tới."
      ]
    },
    "score_breakdown": {
      "budget_adherence": 70,
      "streak_bonus": 10,
      "savings_progress": 5,
      "base_score": 80
    }
  }
}
```

**Response Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `discipline_score` | number | Điểm kỷ luật (0-100) |
| `streak_count` | number | Số ngày liên tục có hoạt động tài chính |
| `streak_history` | string[] | Danh sách ngày (YYYY-MM-DD) |
| `forecast.estimated_end_balance` | number | Dự báo số dư cuối tháng (VND) |
| `forecast.warnings` | string[] | Danh sách cảnh báo |
| `forecast.recommendations` | string[] | Danh sách lời khuyên |
| `score_breakdown` | object | Chi tiết cách tính điểm |

---

### 10.2 `POST /api/v1/discipline/checkin` — Check-in hôm nay (cập nhật streak)

> Được gọi tự động khi user thực hiện giao dịch trong ngày.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "message": "Check-in thành công! Streak: 6 ngày 🔥",
  "data": {
    "streak_count": 6,
    "today": "2026-09-22",
    "is_new_checkin": true
  }
}
```
