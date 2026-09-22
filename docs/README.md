# WIVI API Documentation — README

> Tài liệu kỹ thuật tổng hợp cho việc tích hợp API backend vào ứng dụng WIVI.

---

## 📁 Cấu trúc thư mục docs/

```
docs/
├── README.md                  ← Bạn đang ở đây
├── 01-user-flow.md            ← Sơ đồ luồng người dùng (Mermaid diagram)
├── 02-api-specifications.md   ← Đặc tả chi tiết tất cả 10 module API (24 endpoints)
├── 03-mock-data-audit.md      ← Audit mock data + mapping file → API + thứ tự migration
└── 04-database-schema.md      ← ERD diagram + SQL migration scripts
```

---

## 📊 Tổng quan nhanh

| Thông tin | Giá trị |
|-----------|---------|
| **Tổng số API endpoints** | **24 endpoints** |
| **Modules** | 10 modules |
| **Đã triển khai (Auth)** | 6 endpoints ✅ |
| **Cần tạo mới** | 18 endpoints ❌ |
| **Files chứa mock data** | 3 files |
| **Database tables cần tạo** | 4 bảng mới + 1 bảng mở rộng |

---

## 🔴 API cần ưu tiên cao nhất

| # | Endpoint | Phục vụ cho |
|---|----------|-------------|
| 1 | `GET /api/v1/users/me` | UserProfileCard, AppGuard |
| 2 | `POST /api/v1/users/me/complete-setup` | OnboardingScreen Step 4 |
| 3 | `GET /api/v1/balances` | HomeScreen header |
| 4 | `GET /api/v1/jars` | HomeScreen, JarsScreen |
| 5 | `POST /api/v1/jars` | HomeScreen (Add Goal), JarsScreen (Add Jar) |
| 6 | `POST /api/v1/jars/:goalId/fund` | HomeScreen (Nộp quỹ) |
| 7 | `POST /api/v1/jars/:goalId/withdraw` | HomeScreen (Rút quỹ) |
| 8 | `GET /api/v1/transactions` | HistoryScreen, HomeScreen |
| 9 | `POST /api/v1/transactions` | RecordScreen (Nhập tay) |
| 10 | `PUT /api/v1/transactions/:id/confirm` | HistoryScreen (Xác nhận AI) |
| 11 | `POST /api/v1/income/allocate` | RecordScreen (Phân bổ thu nhập) |

---

## 🏗️ Backend Tech Stack khuyến nghị

Dự án hiện tại đang dùng **NestJS** (`EXPO_PUBLIC_NEST_API_URL=http://localhost:3000`) với CSDL **finjar.sqlite**. Khuyến nghị:

| Layer | Technology | Notes |
|-------|-----------|-------|
| Runtime | Node.js 18+ | |
| Framework | NestJS v10+ | Đã dùng |
| Database | SQLite (dev) / PostgreSQL (prod) | Đã có `schema.sql` |
| ORM | TypeORM hoặc Prisma | |
| Auth | JWT (Bearer Token) | Đã triển khai |
| Email OTP | Resend API | Đã triển khai |
| OCR (Phase 3) | Google Vision API / Tesseract | Cần tích hợp |
| AI Classification | OpenAI API / Custom ML | Cần tích hợp |

---

## 📋 Hướng dẫn đọc tài liệu

1. **Bắt đầu với** `01-user-flow.md` — Hiểu tổng quan luồng ứng dụng
2. **Đọc** `03-mock-data-audit.md` — Biết chính xác cần thay gì, ở đâu
3. **Tham khảo** `02-api-specifications.md` — Đặc tả chi tiết từng API endpoint
4. **Dùng** `04-database-schema.md` — Tạo database migration cho backend

---

## ⚙️ Environment Variables cần thiết

```env
# Backend API (Bắt buộc cho production)
EXPO_PUBLIC_NEST_API_URL=http://localhost:3000

# Google OAuth
EXPO_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id

# Supabase (Tùy chọn - fallback)
# EXPO_PUBLIC_SUPABASE_URL=
# EXPO_PUBLIC_SUPABASE_ANON_KEY=
```
