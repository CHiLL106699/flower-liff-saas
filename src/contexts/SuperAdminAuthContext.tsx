import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

interface SuperAdmin {
  id: number;
  user_id: string;
  email: string;
  name: string;
  is_active: boolean;
}

interface SuperAdminAuthContextType {
  user: User | null;
  superAdmin: SuperAdmin | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isSuperAdmin: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const SuperAdminAuthContext = createContext<SuperAdminAuthContextType | undefined>(undefined);

export function SuperAdminAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [superAdmin, setSuperAdmin] = useState<SuperAdmin | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkSuperAdminStatus = async (_userId: string, email: string) => {
    try {
      // 使用 service role 或直接查詢 super_admins 表
      const { data, error } = await supabase
        .from('super_admins')
        .select('*')
        .eq('email', email)
        .eq('is_active', true)
        .single();

      if (error || !data) {
        return null;
      }

      return data as SuperAdmin;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user && mounted) {
          setUser(session.user);
          const adminData = await checkSuperAdminStatus(session.user.id, session.user.email || '');
          if (mounted) {
            setSuperAdmin(adminData);
          }
        }
      } catch (error) {
        console.error('Auth init error:', error);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (mounted) {
        setUser(session?.user || null);
        if (session?.user) {
          const adminData = await checkSuperAdminStatus(session.user.id, session.user.email || '');
          setSuperAdmin(adminData);
        } else {
          setSuperAdmin(null);
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.user) {
        // 檢查是否為 Super Admin
        const adminData = await checkSuperAdminStatus(data.user.id, email);
        
        if (!adminData) {
          // 不是 Super Admin，登出並返回錯誤
          await supabase.auth.signOut();
          return { success: false, error: '您沒有 Super Admin 權限' };
        }

        setUser(data.user);
        setSuperAdmin(adminData);
        return { success: true };
      }

      return { success: false, error: '登入失敗' };
    } catch (error) {
      return { success: false, error: '系統錯誤，請稍後再試' };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSuperAdmin(null);
  };

  const value: SuperAdminAuthContextType = {
    user,
    superAdmin,
    isAuthenticated: !!user && !!superAdmin,
    isLoading,
    isSuperAdmin: !!superAdmin,
    login,
    logout,
  };

  return (
    <SuperAdminAuthContext.Provider value={value}>
      {children}
    </SuperAdminAuthContext.Provider>
  );
}

export function useSuperAdminAuth() {
  const context = useContext(SuperAdminAuthContext);
  if (context === undefined) {
    throw new Error('useSuperAdminAuth must be used within a SuperAdminAuthProvider');
  }
  return context;
}
