import { useState } from 'react';
import { supabase } from '../lib/supabase';

interface StaffInfo {
  id: number;
  name: string;
  role: string;
  position: string;
  organization_id: number;
}

interface UseStaffAuthReturn {
  isStaff: boolean;
  isLoading: boolean;
  staffInfo: StaffInfo | null;
  checkStaffStatus: (lineUserId: string) => Promise<boolean>;
}

export function useStaffAuth(): UseStaffAuthReturn {
  const [isStaff, setIsStaff] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [staffInfo, setStaffInfo] = useState<StaffInfo | null>(null);

  const checkStaffStatus = async (lineUserId: string): Promise<boolean> => {
    try {
      const organizationId = import.meta.env.VITE_ORGANIZATION_ID || '1';

      // 檢查 staff 表中是否有此 LINE User ID
      const { data, error } = await supabase
        .from('staff')
        .select('id, name, role, position, organization_id')
        .eq('line_user_id', lineUserId)
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .single();

      if (error || !data) {
        setIsStaff(false);
        setStaffInfo(null);
        return false;
      }

      setIsStaff(true);
      setStaffInfo(data);
      return true;
    } catch (error) {
      console.error('Error checking staff status:', error);
      setIsStaff(false);
      setStaffInfo(null);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isStaff,
    isLoading,
    staffInfo,
    checkStaffStatus,
  };
}

// 權限檢查工具函數
export function hasPermission(role: string, requiredLevel: 'staff' | 'super_general' | 'super_senior' | 'admin'): boolean {
  const roleHierarchy: Record<string, number> = {
    'staff': 1,
    'super_general': 2,
    'super_senior': 3,
    'admin': 4,
  };

  const userLevel = roleHierarchy[role] || 0;
  const requiredRoleLevel = roleHierarchy[requiredLevel] || 0;

  return userLevel >= requiredRoleLevel;
}

// 角色顯示名稱
export function getRoleDisplayName(role: string): string {
  const roleNames: Record<string, string> = {
    'staff': '員工',
    'super_general': '一般主管',
    'super_senior': '高階主管',
    'admin': '管理員',
  };

  return roleNames[role] || role;
}
