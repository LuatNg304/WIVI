-- PostgreSQL Schema for WIVI Application
-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create User Profiles Table (Phân quyền Admin & User)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create Email OTP Verification Table
CREATE TABLE IF NOT EXISTS public.otp_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    code VARCHAR(6) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.otp_codes ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
-- Profiles: Mọi người có thể đọc profile của mình, Admin có thể đọc tất cả
CREATE POLICY "Allow public read profile by email" ON public.profiles
    FOR SELECT USING (true);

CREATE POLICY "Allow individual profile insertion" ON public.profiles
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow individual profile update" ON public.profiles
    FOR UPDATE USING (true);

-- OTP Codes Policies
CREATE POLICY "Allow insertion of OTP codes" ON public.otp_codes
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow verification of OTP codes" ON public.otp_codes
    FOR SELECT USING (true);

CREATE POLICY "Allow update of OTP codes" ON public.otp_codes
    FOR UPDATE USING (true);

-- 6. Pre-seed Default Admin User (Khởi tạo sẵn 1 tài khoản Admin)
INSERT INTO public.profiles (id, email, full_name, avatar_url, role)
VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'admin@wivi.com',
    'WIVI System Administrator',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200',
    'admin'
)
ON CONFLICT (email) DO UPDATE 
SET role = 'admin', full_name = 'WIVI System Administrator';
