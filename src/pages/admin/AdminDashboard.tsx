import { useState, useEffect } from 'react';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import { AppointmentCalendar } from './AppointmentCalendar';
import { AppointmentDetailModal } from './AppointmentDetailModal';
import { supabase } from '../../lib/supabase';

interface Appointment {
  id: number;
  user_id: number;
  treatment_id: number;
  doctor_id: number | null;
  appointment_time: string;
  status: 'pending' | 'confirmed' | 'checked_in' | 'completed' | 'cancelled';
  notes: string | null;
  created_at: string;
  user_name?: string;
  user_phone?: string;
  treatment_name?: string;
  doctor_name?: string;
}

interface DashboardStats {
  todayAppointments: number;
  pendingAppointments: number;
  checkedInToday: number;
  totalCustomers: number;
}

export function AdminDashboard() {
  const { staff, logout, hasPermission } = useAdminAuth();
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    todayAppointments: 0,
    pendingAppointments: 0,
    checkedInToday: 0,
    totalCustomers: 0,
  });
  const [refreshKey, setRefreshKey] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // 取得統計資料
  const fetchStats = async () => {
    if (!staff) return;

    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
    const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59).toISOString();

    try {
      // 今日預約數
      const { count: todayCount } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', staff.organization_id)
        .gte('appointment_time', todayStart)
        .lte('appointment_time', todayEnd);

      // 待確認預約數
      const { count: pendingCount } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', staff.organization_id)
        .eq('status', 'pending');

      // 今日已報到數
      const { count: checkedInCount } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', staff.organization_id)
        .eq('status', 'checked_in')
        .gte('appointment_time', todayStart)
        .lte('appointment_time', todayEnd);

      // 總客戶數
      const { count: customerCount } = await supabase
        .from('organization_users')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', staff.organization_id)
        .eq('is_registered', true);

      setStats({
        todayAppointments: todayCount || 0,
        pendingAppointments: pendingCount || 0,
        checkedInToday: checkedInCount || 0,
        totalCustomers: customerCount || 0,
      });
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [staff, refreshKey]);

  const handleAppointmentUpdate = () => {
    setRefreshKey(prev => prev + 1);
    fetchStats();
  };

  // 權限等級顯示
  const getRoleBadge = (role: string) => {
    const badges: Record<string, { bg: string; text: string; label: string }> = {
      admin: { bg: 'bg-red-100', text: 'text-red-700', label: '管理者' },
      super_senior: { bg: 'bg-orange-100', text: 'text-orange-700', label: '高階主管' },
      super_general: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: '一般主管' },
      staff: { bg: 'bg-green-100', text: 'text-green-700', label: '員工' },
    };
    return badges[role] || badges.staff;
  };

  const roleBadge = getRoleBadge(staff?.role || 'staff');

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-rose-50">
      {/* Top Navigation Bar */}
      <nav className="bg-white shadow-sm border-b border-pink-100 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left: Logo & Toggle */}
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 rounded-lg hover:bg-pink-50 lg:hidden"
              >
                <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <div className="flex items-center ml-2 lg:ml-0">
                <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-rose-400 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                  </svg>
                </div>
                <div className="ml-3 hidden sm:block">
                  <h1 className="text-lg font-bold text-slate-800">Flower Admin</h1>
                  <p className="text-xs text-slate-400">管理後台</p>
                </div>
              </div>
            </div>

            {/* Right: User Info */}
            <div className="flex items-center space-x-4">
              <div className="hidden md:flex items-center space-x-3">
                <div className="text-right">
                  <p className="text-sm font-medium text-slate-700">{staff?.staff_name}</p>
                  <p className="text-xs text-slate-400">{staff?.staff_position}</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${roleBadge.bg} ${roleBadge.text}`}>
                  {roleBadge.label}
                </span>
              </div>
              <button
                onClick={logout}
                className="p-2 rounded-lg hover:bg-pink-50 text-slate-500 hover:text-pink-500 transition-colors"
                title="登出"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex">
        {/* Sidebar */}
        <aside className={`${sidebarOpen ? 'w-64' : 'w-0 lg:w-20'} bg-white border-r border-pink-100 min-h-[calc(100vh-4rem)] transition-all duration-300 overflow-hidden`}>
          <div className="p-4">
            <nav className="space-y-2">
              <a
                href="#"
                className="flex items-center px-4 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-rose-400 text-white"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className={`ml-3 ${sidebarOpen ? 'block' : 'hidden lg:hidden'}`}>預約管理</span>
              </a>
              
              {hasPermission('super_general') && (
                <>
                  <a
                    href="#"
                    className="flex items-center px-4 py-3 rounded-xl text-slate-600 hover:bg-pink-50 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <span className={`ml-3 ${sidebarOpen ? 'block' : 'hidden lg:hidden'}`}>客戶管理</span>
                  </a>
                  <a
                    href="#"
                    className="flex items-center px-4 py-3 rounded-xl text-slate-600 hover:bg-pink-50 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <span className={`ml-3 ${sidebarOpen ? 'block' : 'hidden lg:hidden'}`}>報表分析</span>
                  </a>
                </>
              )}

              {hasPermission('admin') && (
                <a
                  href="#"
                  className="flex items-center px-4 py-3 rounded-xl text-slate-600 hover:bg-pink-50 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className={`ml-3 ${sidebarOpen ? 'block' : 'hidden lg:hidden'}`}>系統設定</span>
                </a>
              )}
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 lg:p-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl p-4 shadow-sm border border-pink-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">今日預約</p>
                  <p className="text-2xl font-bold text-slate-800">{stats.todayAppointments}</p>
                </div>
                <div className="w-12 h-12 bg-pink-100 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 shadow-sm border border-pink-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">待確認</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.pendingAppointments}</p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 shadow-sm border border-pink-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">今日報到</p>
                  <p className="text-2xl font-bold text-green-600">{stats.checkedInToday}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 shadow-sm border border-pink-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">總客戶數</p>
                  <p className="text-2xl font-bold text-slate-800">{stats.totalCustomers}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Calendar */}
          <AppointmentCalendar
            key={refreshKey}
            onSelectAppointment={setSelectedAppointment}
          />
        </main>
      </div>

      {/* Appointment Detail Modal */}
      {selectedAppointment && (
        <AppointmentDetailModal
          appointment={selectedAppointment}
          onClose={() => setSelectedAppointment(null)}
          onUpdate={handleAppointmentUpdate}
        />
      )}
    </div>
  );
}
