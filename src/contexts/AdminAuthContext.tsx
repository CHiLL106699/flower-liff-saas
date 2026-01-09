import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

// 權限等級定義
export type StaffRole = 'admin' | 'super_senior' | 'super_general' | 'staff';

// 權限等級順序 (數字越大權限越高)
const ROLE_HIERARCHY: Record<StaffRole, number> = {
  staff: 1,
  super_general: 2,
  super_senior: 3,
  admin: 4,
};

// 員工資料介面
export interface StaffInfo {
  id: number;
  organization_id: number;
  name: string;
  position: string;
  role: StaffRole;
  email: string;
  user_id: string;
}

// Context 介面
interface AdminAuthContextType {
  user: User | null;
  session: Session | null;
  staff: StaffInfo | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  hasPermission: (requiredRole: StaffRole) => boolean;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

// Provider 元件
export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [staff, setStaff] = useState<StaffInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 取得員工資料
  const fetchStaffInfo = async (userId: string, userEmail: string) => {
    try {
      // 先從 staff_credentials 查詢
      const { data: credentials, error: credError } = await supabase
        .from('staff_credentials')
        .select('*')
        .eq('id', userId)
        .single();

      if (credentials && !credError) {
        // 取得對應的 staff 資料
        const { data: staffData } = await supabase
          .from('staff')
          .select('*')
          .eq('id', credentials.staff_id)
          .single();

        if (staffData) {
          setStaff({
            id: staffData.id,
            organization_id: credentials.organization_id,
            name: staffData.name,
            position: staffData.position,
            role: credentials.role as StaffRole,
            email: userEmail,
            user_id: userId,
          });
          return;
        }
      }

      // 如果沒有 staff_credentials，嘗試從 staff 表直接查詢 (向後兼容)
      const { data: staffByEmail } = await supabase
        .from('staff')
        .select('*')
        .eq('organization_id', 1) // 預設組織
        .limit(1)
        .single();

      if (staffByEmail) {
        // 根據 position 判斷 role
        let role: StaffRole = 'staff';
        if (staffByEmail.position === 'admin') role = 'admin';
        else if (staffByEmail.position === 'super_senior') role = 'super_senior';
        else if (staffByEmail.position === 'super_general') role = 'super_general';

        setStaff({
          id: staffByEmail.id,
          organization_id: staffByEmail.organization_id,
          name: staffByEmail.name,
          position: staffByEmail.position,
          role,
          email: userEmail,
          user_id: userId,
        });
      }
    } catch (err) {
      console.error('Error fetching staff info:', err);
    }
  };

  // 初始化：檢查現有 session
  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        
        if (currentSession?.user) {
          setSession(currentSession);
          setUser(currentSession.user);
          await fetchStaffInfo(currentSession.user.id, currentSession.user.email || '');
        }
      } catch (err) {
        console.error('Auth init error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();

    // 監聽 auth 狀態變化
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user || null);
        
        if (newSession?.user) {
          await fetchStaffInfo(newSession.user.id, newSession.user.email || '');
        } else {
          setStaff(null);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // 登入
  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        const errorMsg = authError.message === 'Invalid login credentials'
          ? '帳號或密碼錯誤'
          : authError.message;
        setError(errorMsg);
        return { success: false, error: errorMsg };
      }

      if (data.user) {
        setUser(data.user);
        setSession(data.session);
        await fetchStaffInfo(data.user.id, data.user.email || '');
        return { success: true };
      }

      return { success: false, error: '登入失敗' };
    } catch (err) {
      const errorMsg = '登入過程發生錯誤';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsLoading(false);
    }
  };

  // 登出
  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setStaff(null);
  };

  // 權限檢查
  const hasPermission = (requiredRole: StaffRole): boolean => {
    if (!staff) return false;
    return ROLE_HIERARCHY[staff.role] >= ROLE_HIERARCHY[requiredRole];
  };

  const value: AdminAuthContextType = {
    user,
    session,
    staff,
    isAuthenticated: !!user && !!staff,
    isLoading,
    error,
    login,
    logout,
    hasPermission,
  };

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
}

// Hook
export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (context === undefined) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
}
