import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

// 預約狀態類型
export type AppointmentStatus = 'pending' | 'confirmed' | 'checked_in' | 'completed' | 'cancelled';

// 預約資料介面
export interface Appointment {
  id: number;
  organization_id: number;
  user_id: number;
  treatment_id: number;
  staff_id: number | null;
  appointment_time: string;
  status: AppointmentStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // 關聯資料
  users?: {
    id: number;
    line_display_name: string;
    line_user_id: string;
  };
  organization_users?: {
    customer_real_name: string;
    customer_phone: string;
  };
  treatments?: {
    id: number;
    name: string;
    duration_minutes: number;
    price: number;
  };
  staff?: {
    id: number;
    name: string;
    position: string;
  };
}

// 統計資料介面
export interface AppointmentStats {
  todayTotal: number;
  pendingCount: number;
  checkedInCount: number;
  totalCustomers: number;
}

// Hook 參數
interface UseAppointmentsOptions {
  organizationId: number;
  startDate?: Date;
  endDate?: Date;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function useAppointments({
  organizationId,
  startDate,
  endDate,
  autoRefresh = true,
  refreshInterval = 30000, // 30 秒自動刷新
}: UseAppointmentsOptions) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [stats, setStats] = useState<AppointmentStats>({
    todayTotal: 0,
    pendingCount: 0,
    checkedInCount: 0,
    totalCustomers: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 取得預約資料
  const fetchAppointments = useCallback(async () => {
    try {
      setError(null);
      
      let query = supabase
        .from('appointments')
        .select(`
          *,
          users(id, line_display_name, line_user_id),
          organization_users!inner(customer_real_name, customer_phone),
          treatments(id, name, duration_minutes, price),
          staff(id, name, position)
        `)
        .eq('organization_id', organizationId)
        .order('appointment_time', { ascending: true });

      // 日期範圍篩選
      if (startDate) {
        query = query.gte('appointment_time', startDate.toISOString());
      }
      if (endDate) {
        query = query.lte('appointment_time', endDate.toISOString());
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        throw fetchError;
      }

      setAppointments(data || []);
    } catch (err) {
      console.error('Error fetching appointments:', err);
      setError(err instanceof Error ? err.message : '取得預約資料失敗');
    } finally {
      setIsLoading(false);
    }
  }, [organizationId, startDate, endDate]);

  // 取得統計資料
  const fetchStats = useCallback(async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // 今日預約總數
      const { count: todayTotal } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .gte('appointment_time', today.toISOString())
        .lt('appointment_time', tomorrow.toISOString());

      // 待確認數量
      const { count: pendingCount } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('status', 'pending');

      // 今日已報到數量
      const { count: checkedInCount } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .gte('appointment_time', today.toISOString())
        .lt('appointment_time', tomorrow.toISOString())
        .in('status', ['checked_in', 'completed']);

      // 總客戶數
      const { count: totalCustomers } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('is_registered', true);

      setStats({
        todayTotal: todayTotal || 0,
        pendingCount: pendingCount || 0,
        checkedInCount: checkedInCount || 0,
        totalCustomers: totalCustomers || 0,
      });
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  }, [organizationId]);

  // 更新預約狀態
  const updateAppointmentStatus = useCallback(async (
    appointmentId: number,
    newStatus: AppointmentStatus
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error: updateError } = await supabase
        .from('appointments')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', appointmentId)
        .eq('organization_id', organizationId);

      if (updateError) {
        throw updateError;
      }

      // 更新本地狀態
      setAppointments(prev => 
        prev.map(apt => 
          apt.id === appointmentId 
            ? { ...apt, status: newStatus, updated_at: new Date().toISOString() }
            : apt
        )
      );

      // 刷新統計
      await fetchStats();

      return { success: true };
    } catch (err) {
      console.error('Error updating appointment:', err);
      return { 
        success: false, 
        error: err instanceof Error ? err.message : '更新預約狀態失敗' 
      };
    }
  }, [organizationId, fetchStats]);

  // 報到
  const checkIn = useCallback((appointmentId: number) => {
    return updateAppointmentStatus(appointmentId, 'checked_in');
  }, [updateAppointmentStatus]);

  // 取消
  const cancel = useCallback((appointmentId: number) => {
    return updateAppointmentStatus(appointmentId, 'cancelled');
  }, [updateAppointmentStatus]);

  // 確認
  const confirm = useCallback((appointmentId: number) => {
    return updateAppointmentStatus(appointmentId, 'confirmed');
  }, [updateAppointmentStatus]);

  // 完成
  const complete = useCallback((appointmentId: number) => {
    return updateAppointmentStatus(appointmentId, 'completed');
  }, [updateAppointmentStatus]);

  // 刷新資料
  const refresh = useCallback(async () => {
    setIsLoading(true);
    await Promise.all([fetchAppointments(), fetchStats()]);
  }, [fetchAppointments, fetchStats]);

  // 初始載入
  useEffect(() => {
    fetchAppointments();
    fetchStats();
  }, [fetchAppointments, fetchStats]);

  // 自動刷新
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchAppointments();
      fetchStats();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchAppointments, fetchStats]);

  // Realtime 訂閱
  useEffect(() => {
    const channel = supabase
      .channel('appointments-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `organization_id=eq.${organizationId}`,
        },
        () => {
          // 有變更時刷新資料
          fetchAppointments();
          fetchStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [organizationId, fetchAppointments, fetchStats]);

  return {
    appointments,
    stats,
    isLoading,
    error,
    refresh,
    checkIn,
    cancel,
    confirm,
    complete,
    updateAppointmentStatus,
  };
}
