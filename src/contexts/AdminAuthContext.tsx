import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';

// 權限等級定義
export type StaffRole = 'admin' | 'super_senior' | 'super_general' | 'staff';

export interface StaffAccount {
  id: number;
  staff_id: number;
  username: string;
  role: StaffRole;
  staff_name: string;
  staff_position: string;
  organization_id: number;
}

interface AdminAuthContextType {
  staff: StaffAccount | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  hasPermission: (requiredRole: StaffRole) => boolean;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

// 權限等級對照表 (數字越大權限越高)
const ROLE_LEVELS: Record<StaffRole, number> = {
  staff: 1,
  super_general: 2,
  super_senior: 3,
  admin: 4,
};

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [staff, setStaff] = useState<StaffAccount | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 初始化時檢查 localStorage 中的 session
  useEffect(() => {
    const storedSession = localStorage.getItem('admin_session');
    if (storedSession) {
      try {
        const parsed = JSON.parse(storedSession);
        // 驗證 session 是否過期 (24 小時)
        if (parsed.expires_at && new Date(parsed.expires_at) > new Date()) {
          setStaff(parsed.staff);
        } else {
          localStorage.removeItem('admin_session');
        }
      } catch {
        localStorage.removeItem('admin_session');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // 查詢員工帳號
      const { data, error } = await supabase
        .from('staff_accounts')
        .select(`
          id,
          staff_id,
          username,
          password_hash,
          role,
          is_active,
          staff:staff_id (
            id,
            name,
            position,
            organization_id
          )
        `)
        .eq('username', username)
        .eq('is_active', true)
        .single();

      if (error || !data) {
        return { success: false, error: '帳號或密碼錯誤' };
      }

      // 驗證密碼 (簡單比對，生產環境應使用 bcrypt)
      if (data.password_hash !== password) {
        return { success: false, error: '帳號或密碼錯誤' };
      }

      // 取得員工資訊
      const staffInfo = data.staff as unknown as { id: number; name: string; position: string; organization_id: number };
      
      const staffAccount: StaffAccount = {
        id: data.id,
        staff_id: data.staff_id,
        username: data.username,
        role: data.role as StaffRole,
        staff_name: staffInfo.name,
        staff_position: staffInfo.position,
        organization_id: staffInfo.organization_id,
      };

      // 更新最後登入時間
      await supabase
        .from('staff_accounts')
        .update({ last_login: new Date().toISOString() })
        .eq('id', data.id);

      // 儲存 session (24 小時有效)
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);
      
      localStorage.setItem('admin_session', JSON.stringify({
        staff: staffAccount,
        expires_at: expiresAt.toISOString(),
      }));

      setStaff(staffAccount);
      return { success: true };
    } catch (err) {
      console.error('Login error:', err);
      return { success: false, error: '登入失敗，請稍後再試' };
    }
  };

  const logout = () => {
    localStorage.removeItem('admin_session');
    setStaff(null);
  };

  const hasPermission = (requiredRole: StaffRole): boolean => {
    if (!staff) return false;
    return ROLE_LEVELS[staff.role] >= ROLE_LEVELS[requiredRole];
  };

  return (
    <AdminAuthContext.Provider
      value={{
        staff,
        isLoading,
        isAuthenticated: !!staff,
        login,
        logout,
        hasPermission,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (context === undefined) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
}
