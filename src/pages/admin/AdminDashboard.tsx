/**
 * Clinic Desktop Admin Dashboard
 * 
 * 專為診所櫃台設計的電腦版管理後台
 * 包含側邊欄導航、即時數據統計、行事曆整合
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, Routes, Route, Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Calendar as CalendarIcon, 
  Users, 
  Settings, 
  LogOut, 
  Bell,
  Search,
  Menu,
  X,
  UserCheck,
  Clock
} from 'lucide-react';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import AppointmentCalendar from './AppointmentCalendar';
import AnalyticsCharts from './AnalyticsCharts';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';

interface DashboardStats {
  todayAppointments: number;
  pendingAppointments: number;
  checkedInToday: number;
  totalCustomers: number;
}

const AdminDashboard: React.FC = () => {
  const { staff, logout } = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    todayAppointments: 0,
    pendingAppointments: 0,
    checkedInToday: 0,
    totalCustomers: 0,
  });

  const menuItems = [
    { icon: LayoutDashboard, label: '儀表板', path: '/admin' },
    { icon: CalendarIcon, label: '預約管理', path: '/admin/appointments' },
    { icon: Users, label: '客戶管理', path: '/admin/customers' },
    { icon: Settings, label: '診所設定', path: '/admin/settings' },
  ];

  useEffect(() => {
    const fetchStats = async () => {
      if (!staff?.organization_id) return;

      const today = new Date().toISOString().split('T')[0];

      // 獲取今日預約數
      const { count: todayCount } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', staff.organization_id)
        .eq('appointment_date', today);

      // 獲取待處理預約
      const { count: pendingCount } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', staff.organization_id)
        .eq('status', 'pending');

      // 獲取今日已報到
      const { count: checkedInCount } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', staff.organization_id)
        .eq('appointment_date', today)
        .eq('status', 'checked_in');

      // 獲取總客戶數
      const { count: customerCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', staff.organization_id);

      setStats({
        todayAppointments: todayCount || 0,
        pendingAppointments: pendingCount || 0,
        checkedInToday: checkedInCount || 0,
        totalCustomers: customerCount || 0,
      });
    };

    fetchStats();
  }, [staff?.organization_id]);

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside 
        className={cn(
          "bg-white border-r border-slate-200 transition-all duration-300 flex flex-col z-30",
          isSidebarOpen ? "w-64" : "w-20"
        )}
      >
        <div className="p-6 flex items-center gap-3 border-b border-slate-100">
          <div className="w-8 h-8 bg-pink-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold">F</span>
          </div>
          {isSidebarOpen && (
            <span className="font-bold text-slate-800 truncate">Flower Admin</span>
          )}
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-xl transition-colors",
                location.pathname === item.path 
                  ? "bg-pink-50 text-pink-600" 
                  : "text-slate-600 hover:bg-slate-50"
              )}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {isSidebarOpen && <span className="font-medium">{item.label}</span>}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <button
            onClick={handleLogout}
            className={cn(
              "flex items-center gap-3 px-3 py-2 w-full rounded-xl text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors"
            )}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {isSidebarOpen && <span className="font-medium">登出系統</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 z-20">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="text-slate-500"
            >
              {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
            <div className="relative hidden md:block">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="搜尋客戶或預約..." 
                className="pl-10 pr-4 py-2 bg-slate-100 border-transparent rounded-full text-sm w-64 focus:bg-white focus:ring-2 focus:ring-pink-500 transition-all outline-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="relative text-slate-500">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </Button>
            <div className="h-8 w-px bg-slate-200 mx-2"></div>
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-slate-800">{staff?.name || '管理員'}</p>
                <p className="text-xs text-slate-500">{staff?.role === 'admin' ? '診所經理' : '櫃台人員'}</p>
              </div>
              <div className="w-10 h-10 bg-slate-200 rounded-full overflow-hidden border-2 border-white shadow-sm">
                <img 
                  src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${staff?.id}`} 
                  alt="avatar" 
                />
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8">
          <Routes>
            <Route path="/" element={<DashboardHome stats={stats} staff={staff} />} />
            <Route path="/appointments" element={<AppointmentCalendar />} />
            <Route path="/customers" element={<div className="p-8 text-center text-slate-500">客戶管理模組開發中...</div>} />
            <Route path="/settings" element={<div className="p-8 text-center text-slate-500">診所設定模組開發中...</div>} />
          </Routes>
        </div>
      </main>
    </div>
  );
};

const DashboardHome: React.FC<{ stats: DashboardStats, staff: any }> = ({ stats, staff }) => {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">營運概況</h1>
        <p className="text-slate-500">歡迎回來，這是您診所今天的即時數據。</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="今日預約" 
          value={stats.todayAppointments} 
          icon={CalendarIcon} 
          color="bg-blue-500" 
          trend="+12% 較昨日"
        />
        <StatCard 
          title="待處理預約" 
          value={stats.pendingAppointments} 
          icon={Clock} 
          color="bg-amber-500" 
          trend="需立即處理"
        />
        <StatCard 
          title="今日已報到" 
          value={stats.checkedInToday} 
          icon={UserCheck} 
          color="bg-emerald-500" 
          trend="報到率 85%"
        />
        <StatCard 
          title="總客戶數" 
          value={stats.totalCustomers} 
          icon={Users} 
          color="bg-purple-500" 
          trend="+5 本週新增"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-slate-800">預約趨勢分析</CardTitle>
          </CardHeader>
          <CardContent className="h-[350px]">
            <AnalyticsCharts organizationId={staff?.organization_id || 0} />
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-slate-800">即時動態</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex gap-4">
                  <div className="w-2 h-2 mt-2 rounded-full bg-pink-500 flex-shrink-0"></div>
                  <div>
                    <p className="text-sm font-medium text-slate-800">新預約：王小明 - 皮秒雷射</p>
                    <p className="text-xs text-slate-500">10 分鐘前</p>
                  </div>
                </div>
              ))}
            </div>
            <Button variant="ghost" className="w-full mt-6 text-pink-600 hover:text-pink-700 hover:bg-pink-50">
              查看所有動態
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ 
  title: string; 
  value: number; 
  icon: any; 
  color: string;
  trend: string;
}> = ({ title, value, icon: Icon, color, trend }) => (
  <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
    <CardContent className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg", color)}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
      <div>
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <h3 className="text-3xl font-bold text-slate-800 mt-1">{value}</h3>
        <p className="text-xs font-medium text-slate-400 mt-2">{trend}</p>
      </div>
    </CardContent>
  </Card>
);

export { AdminDashboard };
export default AdminDashboard;
