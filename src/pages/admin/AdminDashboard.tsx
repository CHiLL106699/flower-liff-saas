import { useState, useEffect } from 'react';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import { AppointmentCalendar } from './AppointmentCalendar';
import { AppointmentDetailModal } from './AppointmentDetailModal';
import { AnalyticsCharts } from './AnalyticsCharts';
import { supabase } from '../../lib/supabase';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import {
  Calendar,
  BarChart3,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Bell,
  Clock,
  CheckCircle,
  UserPlus,
} from 'lucide-react';
import { cn } from '../../lib/utils';

// 選單項目配置
const MENU_ITEMS = [
  { id: 'calendar', label: '預約管理', icon: Calendar, permission: 'staff' },
  { id: 'analytics', label: '數據分析', icon: BarChart3, permission: 'super_general' },
  { id: 'customers', label: '客戶管理', icon: Users, permission: 'super_general' },
  { id: 'settings', label: '系統設定', icon: Settings, permission: 'admin' },
];

type MenuId = 'calendar' | 'analytics' | 'customers' | 'settings';

interface Appointment {
  id: number;
  user_id: number;
  treatment_id: number;
  staff_id: number | null;
  appointment_time: string;
  status: 'pending' | 'confirmed' | 'checked_in' | 'completed' | 'cancelled';
  notes: string | null;
  created_at: string;
  // 關聯資料
  users?: { id: number; line_display_name: string; line_user_id: string };
  organization_users?: { customer_real_name: string; customer_phone: string };
  treatments?: { id: number; name: string; duration_minutes: number; price: number };
  staff?: { id: number; name: string; position: string };
}

interface DashboardStats {
  todayAppointments: number;
  pendingAppointments: number;
  checkedInToday: number;
  totalCustomers: number;
}

export function AdminDashboard() {
  const { staff, logout, hasPermission } = useAdminAuth();
  const [activeMenu, setActiveMenu] = useState<MenuId>('calendar');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    todayAppointments: 0,
    pendingAppointments: 0,
    checkedInToday: 0,
    totalCustomers: 0,
  });
  const [refreshKey, setRefreshKey] = useState(0);

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
        .from('users')
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

  // 處理登出
  const handleLogout = async () => {
    await logout();
  };

  // 處理預約更新
  const handleAppointmentUpdate = () => {
    setRefreshKey(prev => prev + 1);
    fetchStats();
    setSelectedAppointment(null);
  };

  // 關閉預約詳情
  const handleCloseAppointmentDetail = () => {
    setSelectedAppointment(null);
  };

  // 過濾有權限的選單項目
  const filteredMenuItems = MENU_ITEMS.filter(item => 
    hasPermission(item.permission as any)
  );

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

  // 渲染主要內容
  const renderContent = () => {
    switch (activeMenu) {
      case 'calendar':
        return (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <Card className="bg-gradient-to-br from-pink-50 to-white border-pink-100">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-500">今日預約</p>
                      <p className="text-2xl font-bold text-slate-800">{stats.todayAppointments}</p>
                    </div>
                    <div className="w-12 h-12 bg-pink-100 rounded-xl flex items-center justify-center">
                      <Calendar className="w-6 h-6 text-pink-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-yellow-50 to-white border-yellow-100">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-500">待確認</p>
                      <p className="text-2xl font-bold text-yellow-600">{stats.pendingAppointments}</p>
                    </div>
                    <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                      <Clock className="w-6 h-6 text-yellow-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-50 to-white border-green-100">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-500">今日報到</p>
                      <p className="text-2xl font-bold text-green-600">{stats.checkedInToday}</p>
                    </div>
                    <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-green-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-blue-50 to-white border-blue-100">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-500">總客戶數</p>
                      <p className="text-2xl font-bold text-slate-800">{stats.totalCustomers}</p>
                    </div>
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                      <UserPlus className="w-6 h-6 text-blue-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Calendar */}
            <AppointmentCalendar
              key={refreshKey}
              organizationId={staff?.organization_id || 1}
            />
          </>
        );
      case 'analytics':
        return <AnalyticsCharts organizationId={staff?.organization_id || 1} />;
      case 'customers':
        return (
          <Card>
            <CardContent className="p-12 text-center">
              <Users className="w-16 h-16 mx-auto text-slate-300 mb-4" />
              <h3 className="text-lg font-medium text-slate-600 mb-2">客戶管理</h3>
              <p className="text-slate-400">此功能開發中，敬請期待</p>
            </CardContent>
          </Card>
        );
      case 'settings':
        return (
          <Card>
            <CardContent className="p-12 text-center">
              <Settings className="w-16 h-16 mx-auto text-slate-300 mb-4" />
              <h3 className="text-lg font-medium text-slate-600 mb-2">系統設定</h3>
              <p className="text-slate-400">此功能開發中，敬請期待</p>
            </CardContent>
          </Card>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-rose-50">
      {/* 頂部導航列 */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-pink-100 shadow-sm">
        <div className="flex items-center justify-between px-4 h-16">
          {/* 左側 - 選單切換 & Logo */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-pink-50 rounded-lg transition-colors lg:hidden"
            >
              {isSidebarOpen ? (
                <X className="w-5 h-5 text-slate-600" />
              ) : (
                <Menu className="w-5 h-5 text-slate-600" />
              )}
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center shadow-lg shadow-pink-500/30">
                <span className="text-white font-bold text-lg">F</span>
              </div>
              <div className="hidden sm:block">
                <h1 className="font-bold text-slate-800">Flower Clinic</h1>
                <p className="text-xs text-slate-400">管理後台</p>
              </div>
            </div>
          </div>

          {/* 右側 - 通知 & 用戶資訊 */}
          <div className="flex items-center gap-3">
            <button className="p-2 hover:bg-pink-50 rounded-lg transition-colors relative">
              <Bell className="w-5 h-5 text-slate-600" />
              {stats.pendingAppointments > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-pink-500 rounded-full text-white text-xs flex items-center justify-center">
                  {stats.pendingAppointments > 9 ? '9+' : stats.pendingAppointments}
                </span>
              )}
            </button>
            <div className="hidden sm:flex items-center gap-3 pl-3 border-l border-slate-200">
              <div className="text-right">
                <p className="text-sm font-medium text-slate-700">{staff?.name || '管理員'}</p>
                <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', roleBadge.bg, roleBadge.text)}>
                  {roleBadge.label}
                </span>
              </div>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-rose-400 flex items-center justify-center shadow-md">
                <span className="text-white font-medium">
                  {(staff?.name || 'A').charAt(0)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* 側邊欄 */}
        <aside
          className={cn(
            'fixed lg:sticky top-16 left-0 z-30 h-[calc(100vh-4rem)] bg-white border-r border-pink-100 transition-all duration-300',
            isSidebarOpen ? 'w-64' : 'w-0 lg:w-20',
            !isSidebarOpen && 'overflow-hidden'
          )}
        >
          <nav className="p-4 space-y-2">
            {filteredMenuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeMenu === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveMenu(item.id as MenuId)}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all',
                    isActive
                      ? 'bg-gradient-to-r from-pink-500 to-rose-400 text-white shadow-lg shadow-pink-500/30'
                      : 'text-slate-600 hover:bg-pink-50'
                  )}
                >
                  <Icon className={cn('w-5 h-5 flex-shrink-0', isActive && 'text-white')} />
                  <span
                    className={cn(
                      'font-medium transition-opacity',
                      !isSidebarOpen && 'lg:hidden'
                    )}
                  >
                    {item.label}
                  </span>
                  {isActive && isSidebarOpen && (
                    <ChevronRight className="w-4 h-4 ml-auto" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* 登出按鈕 */}
          <div className="absolute bottom-4 left-4 right-4">
            <Button
              variant="outline"
              onClick={handleLogout}
              className={cn(
                'w-full justify-start gap-3 text-slate-600 hover:text-red-500 hover:border-red-200 hover:bg-red-50',
                !isSidebarOpen && 'lg:justify-center'
              )}
            >
              <LogOut className="w-5 h-5" />
              <span className={cn(!isSidebarOpen && 'lg:hidden')}>登出</span>
            </Button>
          </div>
        </aside>

        {/* 主要內容區 */}
        <main
          className={cn(
            'flex-1 p-4 lg:p-6 transition-all duration-300 min-h-[calc(100vh-4rem)]',
            isSidebarOpen ? 'lg:ml-0' : 'lg:ml-0'
          )}
        >
          {/* 頁面標題 */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-800">
              {MENU_ITEMS.find(item => item.id === activeMenu)?.label}
            </h2>
            <p className="text-slate-500 mt-1">
              {activeMenu === 'calendar' && '管理診所的所有預約'}
              {activeMenu === 'analytics' && '查看診所營運數據與趨勢分析'}
              {activeMenu === 'customers' && '管理客戶資料與會員'}
              {activeMenu === 'settings' && '系統設定與偏好'}
            </p>
          </div>

          {/* 內容區域 */}
          {renderContent()}
        </main>
      </div>

      {/* 預約詳情 Modal */}
      {selectedAppointment && (
        <AppointmentDetailModal
          appointment={selectedAppointment}
          onClose={handleCloseAppointmentDetail}
          onUpdate={handleAppointmentUpdate}
        />
      )}

      {/* 行動版側邊欄遮罩 */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-20 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
}

export default AdminDashboard;
