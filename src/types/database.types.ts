export type UserRole = 'admin' | 'user';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  created_at?: string;
  updated_at?: string;
}

export interface OtpRecord {
  id: string;
  email: string;
  code: string;
  expires_at: string;
  verified: boolean;
  created_at: string;
}

export interface AuthSession {
  user: UserProfile;
  token: string;
  expiresAt: number;
}
