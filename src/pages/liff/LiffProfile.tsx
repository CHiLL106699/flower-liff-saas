/**
 * LIFF 會員中心頁面
 * 
 * 顯示會員資料、預約記錄、療程記錄
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  User,
  Calendar,
  Heart,
  Settings,
  LogOut,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface UserProfile {
  id: number;
  line_display_name: string;
  line_picture_url: string | null;
  real_name?: string;
  phone?: string;
}

interface Appointment {
  id: number;
  appointment_time: string;
  status: string;
  treatments: {
    name: string;
  } | null;
}

interface AppointmentRaw {
  id: number;
  appointment_time: string;
  status: string;
  treatments: { name: string }[] | null;
}

export default function LiffProfile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const getUserId = () => {
    const userId = localStorage.getItem('flower_user_id');
    return userId ? parseInt(userId) : null;
  };

  const getOrganizationId = () => {
    return parseInt(import.meta.env.VITE_ORGANIZATION_ID || '1');
  };

  useEffect(() => {
    const loadProfile = async () => {
      const userId = getUserId();
      if (!userId) {
        setIsLoading(false);
        return;
      }

      try {
        // 載入用戶資料
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id, line_display_name, line_picture_url')
          .eq('id', userId)
          .single();

        if (userError) throw userError;

        // 載入組織用戶資料 (包含真實姓名和電話)
        const { data: orgUserData } = await supabase
          .from('organization_users')
          .select('real_name, phone')
          .eq('user_id', userId)
          .eq('organization_id', getOrganizationId())
          .single();

        setProfile({
          ...userData,
          real_name: orgUserData?.real_name,
          phone: orgUserData?.phone
        });

        // 載入預約記錄
        const { data: appointmentData, error: appointmentError } = await supabase
          .from('appointments')
          .select(`
            id,
            appointment_time,
            status,
            treatments (name)
          `)
          .eq('user_id', userId)
          .eq('organization_id', getOrganizationId())
          .order('appointment_time', { ascending: false })
          .limit(5);

        if (appointmentError) throw appointmentError;
        // 轉換資料格式
        const formattedAppointments: Appointment[] = (appointmentData || []).map((a: AppointmentRaw) => ({
          id: a.id,
          appointment_time: a.appointment_time,
          status: a.status,
          treatments: a.treatments && a.treatments.length > 0 ? a.treatments[0] : null
        }));
        setAppointments(formattedAppointments);

      } catch (error) {
        console.error('Failed to load profile:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, []);

  const handleLogout = () => {
    if (confirm('確定要登出嗎？')) {
      localStorage.removeItem('flower_user_id');
      localStorage.removeItem('flower_line_user_id');
      localStorage.removeItem('flower_is_registered');
      navigate('/');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; color: string }> = {
      pending: { label: '待確認', color: 'bg-yellow-100 text-yellow-700' },
      confirmed: { label: '已確認', color: 'bg-blue-100 text-blue-700' },
      checked_in: { label: '已報到', color: 'bg-green-100 text-green-700' },
      completed: { label: '已完成', color: 'bg-slate-100 text-slate-700' },
      cancelled: { label: '已取消', color: 'bg-red-100 text-red-700' }
    };
    const config = statusMap[status] || statusMap.pending;
    return (
      <span className={`text-xs px-2 py-0.5 rounded-full ${config.color}`}>
        {config.label}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-rose-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-rose-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-pink-500 to-rose-500 text-white px-4 py-4 rounded-b-3xl shadow-lg">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <User className="w-6 h-6" />
            <h1 className="text-xl font-bold">會員中心</h1>
          </div>
        </div>
      </div>

      {/* 會員資料卡片 */}
      <div className="px-4 py-6">
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-4">
            {profile?.line_picture_url ? (
              <img
                src={profile.line_picture_url}
                alt="Profile"
                className="w-16 h-16 rounded-full object-cover border-2 border-pink-200"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-400 to-rose-400 flex items-center justify-center">
                <User className="w-8 h-8 text-white" />
              </div>
            )}
            <div className="flex-1">
              <h2 className="text-lg font-bold text-slate-800">
                {profile?.real_name || profile?.line_display_name || '會員'}
              </h2>
              {profile?.phone && (
                <p className="text-sm text-slate-500">{profile.phone}</p>
              )}
              <p className="text-xs text-slate-400 mt-1">
                LINE: {profile?.line_display_name}
              </p>
            </div>
          </div>
        </div>

        {/* 功能選單 */}
        <div className="mt-4 bg-white rounded-2xl shadow-sm overflow-hidden">
          <button
            onClick={() => navigate('/booking')}
            className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors border-b border-slate-100"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-orange-600" />
              </div>
              <span className="font-medium text-slate-700">預約服務</span>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </button>

          <button
            onClick={() => navigate('/weight')}
            className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors border-b border-slate-100"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                <Heart className="w-5 h-5 text-purple-600" />
              </div>
              <span className="font-medium text-slate-700">健康管理</span>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </button>

          <button
            className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors border-b border-slate-100"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                <Settings className="w-5 h-5 text-slate-600" />
              </div>
              <span className="font-medium text-slate-700">帳號設定</span>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </button>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                <LogOut className="w-5 h-5 text-red-600" />
              </div>
              <span className="font-medium text-red-600">登出</span>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* 最近預約 */}
        <div className="mt-6">
          <h3 className="font-bold text-slate-800 mb-3 px-1">最近預約</h3>
          
          {appointments.length === 0 ? (
            <div className="bg-white rounded-2xl p-6 shadow-sm text-center">
              <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-400">尚無預約記錄</p>
              <button
                onClick={() => navigate('/booking')}
                className="mt-3 text-pink-500 font-medium text-sm"
              >
                立即預約 →
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {appointments.map((appointment) => (
                <div
                  key={appointment.id}
                  className="bg-white rounded-xl p-4 shadow-sm"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-slate-800">
                      {appointment.treatments?.name || '療程預約'}
                    </span>
                    {getStatusBadge(appointment.status)}
                  </div>
                  <p className="text-sm text-slate-500">
                    {new Date(appointment.appointment_time).toLocaleDateString('zh-TW', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      weekday: 'short',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
