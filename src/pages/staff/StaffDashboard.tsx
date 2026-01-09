import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

interface DashboardStats {
  todayRevenue: number;
  todayOrders: number;
  checkedInCount: number;
  arrivalRate: number;
  pendingCount: number;
  completedCount: number;
}

interface RecentAppointment {
  id: number;
  customer_name: string;
  treatment_name: string;
  appointment_time: string;
  status: string;
}

export default function StaffDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    todayRevenue: 0,
    todayOrders: 0,
    checkedInCount: 0,
    arrivalRate: 0,
    pendingCount: 0,
    completedCount: 0,
  });
  const [recentAppointments, setRecentAppointments] = useState<RecentAppointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    fetchDashboardData();
    
    // 更新時間
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const fetchDashboardData = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const organizationId = import.meta.env.VITE_ORGANIZATION_ID || '1';

      // 獲取今日預約
      const { data: appointments, error } = await supabase
        .from('appointments')
        .select(`
          id,
          appointment_time,
          status,
          users (name),
          treatments (name, price)
        `)
        .eq('organization_id', organizationId)
        .gte('appointment_time', `${today}T00:00:00`)
        .lte('appointment_time', `${today}T23:59:59`);

      if (error) throw error;

      // 計算統計數據
      const todayOrders = appointments?.length || 0;
      const checkedInCount = appointments?.filter(a => a.status === 'checked_in' || a.status === 'completed').length || 0;
      const completedCount = appointments?.filter(a => a.status === 'completed').length || 0;
      const pendingCount = appointments?.filter(a => a.status === 'pending' || a.status === 'confirmed').length || 0;
      const arrivalRate = todayOrders > 0 ? Math.round((checkedInCount / todayOrders) * 100) : 0;
      
      // 計算營收 (已完成的預約)
      const todayRevenue = appointments
        ?.filter(a => a.status === 'completed')
        .reduce((sum, a) => sum + ((a.treatments as any)?.price || 0), 0) || 0;

      setStats({
        todayRevenue,
        todayOrders,
        checkedInCount,
        arrivalRate,
        pendingCount,
        completedCount,
      });

      // 設定最近預約
      const recent = appointments
        ?.sort((a, b) => new Date(a.appointment_time).getTime() - new Date(b.appointment_time).getTime())
        .slice(0, 5)
        .map(a => ({
          id: a.id,
          customer_name: (a.users as any)?.name || '未知客戶',
          treatment_name: (a.treatments as any)?.name || '未指定療程',
          appointment_time: a.appointment_time,
          status: a.status,
        })) || [];

      setRecentAppointments(recent);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('zh-TW', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('zh-TW', { 
      month: 'long', 
      day: 'numeric',
      weekday: 'short'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'confirmed': return 'bg-blue-100 text-blue-800';
      case 'checked_in': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return '待確認';
      case 'confirmed': return '已確認';
      case 'checked_in': return '已報到';
      case 'completed': return '已完成';
      case 'cancelled': return '已取消';
      default: return status;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">載入中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white pb-24">
      {/* Header */}
      <div className="bg-gradient-to-r from-pink-500 to-rose-400 text-white px-4 py-6 rounded-b-3xl shadow-lg">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-2xl font-bold">戰情室</h1>
            <p className="text-pink-100 text-sm">{formatDate(currentTime)}</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold">{formatTime(currentTime)}</p>
            <p className="text-pink-100 text-xs">花花醫美診所</p>
          </div>
        </div>
        
        {/* 今日營收大數字 */}
        <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 mt-4">
          <p className="text-pink-100 text-sm mb-1">今日營收</p>
          <p className="text-4xl font-bold">
            NT$ {stats.todayRevenue.toLocaleString()}
          </p>
        </div>
      </div>

      {/* 統計卡片 */}
      <div className="px-4 -mt-4">
        <div className="grid grid-cols-2 gap-3">
          {/* 今日預約 */}
          <div className="bg-white rounded-2xl p-4 shadow-md">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-500 text-sm">今日預約</span>
              <span className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                📅
              </span>
            </div>
            <p className="text-3xl font-bold text-gray-800">{stats.todayOrders}</p>
            <p className="text-xs text-gray-400 mt-1">筆預約</p>
          </div>

          {/* 到客率 */}
          <div className="bg-white rounded-2xl p-4 shadow-md">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-500 text-sm">到客率</span>
              <span className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                📊
              </span>
            </div>
            <p className="text-3xl font-bold text-gray-800">{stats.arrivalRate}%</p>
            <p className="text-xs text-gray-400 mt-1">{stats.checkedInCount} / {stats.todayOrders} 人</p>
          </div>

          {/* 待服務 */}
          <div className="bg-white rounded-2xl p-4 shadow-md">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-500 text-sm">待服務</span>
              <span className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                ⏳
              </span>
            </div>
            <p className="text-3xl font-bold text-yellow-600">{stats.pendingCount}</p>
            <p className="text-xs text-gray-400 mt-1">筆待處理</p>
          </div>

          {/* 已完成 */}
          <div className="bg-white rounded-2xl p-4 shadow-md">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-500 text-sm">已完成</span>
              <span className="w-8 h-8 bg-pink-100 rounded-full flex items-center justify-center">
                ✅
              </span>
            </div>
            <p className="text-3xl font-bold text-pink-600">{stats.completedCount}</p>
            <p className="text-xs text-gray-400 mt-1">筆已結束</p>
          </div>
        </div>
      </div>

      {/* 即將到來的預約 */}
      <div className="px-4 mt-6">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-bold text-gray-800">即將到來</h2>
          <a href="/staff/schedule" className="text-pink-500 text-sm font-medium">
            查看全部 →
          </a>
        </div>

        {recentAppointments.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 shadow-md text-center">
            <span className="text-4xl mb-3 block">🎉</span>
            <p className="text-gray-500">今日暫無預約</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentAppointments.map((appointment) => (
              <div 
                key={appointment.id}
                className="bg-white rounded-2xl p-4 shadow-md flex items-center justify-between"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-pink-400 to-rose-400 rounded-full flex items-center justify-center text-white font-bold text-lg">
                    {appointment.customer_name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">{appointment.customer_name}</p>
                    <p className="text-sm text-gray-500">{appointment.treatment_name}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-800">
                    {new Date(appointment.appointment_time).toLocaleTimeString('zh-TW', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: false
                    })}
                  </p>
                  <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(appointment.status)}`}>
                    {getStatusText(appointment.status)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 快捷操作 */}
      <div className="px-4 mt-6">
        <h2 className="text-lg font-bold text-gray-800 mb-3">快捷操作</h2>
        <div className="grid grid-cols-4 gap-3">
          <a href="/staff/schedule" className="bg-white rounded-2xl p-4 shadow-md text-center">
            <span className="text-2xl block mb-1">📋</span>
            <span className="text-xs text-gray-600">預約管理</span>
          </a>
          <a href="/staff/scanner" className="bg-white rounded-2xl p-4 shadow-md text-center">
            <span className="text-2xl block mb-1">📷</span>
            <span className="text-xs text-gray-600">掃碼報到</span>
          </a>
          <a href="/staff/hr" className="bg-white rounded-2xl p-4 shadow-md text-center">
            <span className="text-2xl block mb-1">👥</span>
            <span className="text-xs text-gray-600">人事管理</span>
          </a>
          <a href="/staff/finance" className="bg-white rounded-2xl p-4 shadow-md text-center">
            <span className="text-2xl block mb-1">💰</span>
            <span className="text-xs text-gray-600">財務報表</span>
          </a>
        </div>
      </div>

      {/* 底部導航 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-3 flex justify-around">
        <a href="/staff/dashboard" className="flex flex-col items-center text-pink-500">
          <span className="text-xl">🏠</span>
          <span className="text-xs mt-1">戰情室</span>
        </a>
        <a href="/staff/schedule" className="flex flex-col items-center text-gray-400">
          <span className="text-xl">📅</span>
          <span className="text-xs mt-1">預約</span>
        </a>
        <a href="/staff/scanner" className="flex flex-col items-center text-gray-400">
          <span className="text-xl">📷</span>
          <span className="text-xs mt-1">掃碼</span>
        </a>
        <a href="/staff/hr" className="flex flex-col items-center text-gray-400">
          <span className="text-xl">👥</span>
          <span className="text-xs mt-1">人事</span>
        </a>
        <a href="/" className="flex flex-col items-center text-gray-400">
          <span className="text-xl">🔄</span>
          <span className="text-xs mt-1">客戶版</span>
        </a>
      </div>
    </div>
  );
}
