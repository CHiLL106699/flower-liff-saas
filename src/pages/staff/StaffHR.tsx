/**
 * 員工版 LIFF - 人事管理頁面
 * 
 * 功能：
 * - 員工打卡 (上班/下班)
 * - 今日出勤名單
 * - 個人出勤記錄
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import liff from '@line/liff';
import { supabase } from '../../lib/supabase';
import { 
  ArrowLeft, 
  Users, 
  Clock, 
  LogIn, 
  LogOut,
  CheckCircle,
  Calendar,
  Loader2,
  MapPin
} from 'lucide-react';

interface AttendanceRecord {
  id: number;
  staff_id: number;
  staff_name: string;
  clock_in: string | null;
  clock_out: string | null;
  date: string;
}

interface StaffInfo {
  id: number;
  name: string;
  position: string;
}

export default function StaffHR() {
  const navigate = useNavigate();
  const [staffInfo, setStaffInfo] = useState<StaffInfo | null>(null);
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord[]>([]);
  const [myAttendance, setMyAttendance] = useState<AttendanceRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isClocking, setIsClocking] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    initializeData();
    
    // 每秒更新時間
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const initializeData = async () => {
    try {
      const liffId = import.meta.env.VITE_LIFF_ID;
      if (liffId && !liff.ready) {
        await liff.init({ liffId });
      }

      if (liff.isLoggedIn()) {
        const profile = await liff.getProfile();
        await loadStaffInfo(profile.userId);
      }
    } catch (error) {
      console.error('Initialization error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadStaffInfo = async (lineUserId: string) => {
    const organizationId = import.meta.env.VITE_ORGANIZATION_ID || '1';

    // 取得員工資訊
    const { data: staffData } = await supabase
      .from('staff')
      .select('id, name, position')
      .eq('line_user_id', lineUserId)
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .single();

    if (staffData) {
      setStaffInfo(staffData);
      await loadAttendanceData(staffData.id, parseInt(organizationId));
    }
  };

  const loadAttendanceData = async (staffId: number, organizationId: number) => {
    const today = new Date().toISOString().split('T')[0];

    // 取得今日所有出勤記錄
    const { data: attendanceData } = await supabase
      .from('attendance')
      .select(`
        id,
        staff_id,
        clock_in,
        clock_out,
        date,
        staff (name)
      `)
      .eq('organization_id', organizationId)
      .eq('date', today)
      .order('clock_in', { ascending: true });

    if (attendanceData) {
      const formattedData = attendanceData.map(record => ({
        ...record,
        staff_name: (record.staff as any)?.name || '未知',
      }));
      setTodayAttendance(formattedData);

      // 找出自己的出勤記錄
      const myRecord = formattedData.find(r => r.staff_id === staffId);
      setMyAttendance(myRecord || null);
    }
  };

  const handleClockIn = async () => {
    if (!staffInfo) return;

    setIsClocking(true);
    try {
      const organizationId = import.meta.env.VITE_ORGANIZATION_ID || '1';
      const today = new Date().toISOString().split('T')[0];
      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from('attendance')
        .insert({
          organization_id: parseInt(organizationId),
          staff_id: staffInfo.id,
          date: today,
          clock_in: now,
        })
        .select()
        .single();

      if (error) throw error;

      setMyAttendance({
        ...data,
        staff_name: staffInfo.name,
      });

      // 重新載入出勤資料
      await loadAttendanceData(staffInfo.id, parseInt(organizationId));

      alert('上班打卡成功！');
    } catch (error) {
      console.error('Clock in error:', error);
      alert('打卡失敗，請重試');
    } finally {
      setIsClocking(false);
    }
  };

  const handleClockOut = async () => {
    if (!staffInfo || !myAttendance) return;

    setIsClocking(true);
    try {
      const organizationId = import.meta.env.VITE_ORGANIZATION_ID || '1';
      const now = new Date().toISOString();

      const { error } = await supabase
        .from('attendance')
        .update({ clock_out: now })
        .eq('id', myAttendance.id);

      if (error) throw error;

      setMyAttendance({
        ...myAttendance,
        clock_out: now,
      });

      // 重新載入出勤資料
      await loadAttendanceData(staffInfo.id, parseInt(organizationId));

      alert('下班打卡成功！');
    } catch (error) {
      console.error('Clock out error:', error);
      alert('打卡失敗，請重試');
    } finally {
      setIsClocking(false);
    }
  };

  const formatTime = (dateString: string | null) => {
    if (!dateString) return '--:--';
    return new Date(dateString).toLocaleTimeString('zh-TW', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrentTime = () => {
    return currentTime.toLocaleTimeString('zh-TW', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatCurrentDate = () => {
    return currentTime.toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-pink-500 mx-auto mb-2" />
          <p className="text-gray-600">載入中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-pink-500 to-rose-500 text-white px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => navigate('/staff/dashboard')}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold">人事管理</h1>
            <p className="text-pink-100 text-xs">打卡與出勤管理</p>
          </div>
          <Users className="w-6 h-6" />
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* 打卡區 */}
        <div className="bg-white rounded-2xl shadow-md overflow-hidden">
          {/* 時間顯示 */}
          <div className="bg-gradient-to-r from-purple-500 to-violet-500 text-white p-6 text-center">
            <p className="text-purple-100 text-sm mb-1">{formatCurrentDate()}</p>
            <p className="text-5xl font-bold font-mono">{formatCurrentTime()}</p>
            <div className="flex items-center justify-center gap-1 mt-2 text-purple-100 text-sm">
              <MapPin className="w-4 h-4" />
              <span>花花醫美診所</span>
            </div>
          </div>

          {/* 打卡狀態 */}
          <div className="p-4">
            {staffInfo && (
              <div className="text-center mb-4">
                <p className="text-gray-600">
                  {staffInfo.name} · {staffInfo.position}
                </p>
              </div>
            )}

            {/* 今日打卡記錄 */}
            {myAttendance && (
              <div className="bg-gray-50 rounded-xl p-4 mb-4">
                <div className="flex justify-between items-center">
                  <div className="text-center flex-1">
                    <p className="text-gray-500 text-sm mb-1">上班時間</p>
                    <p className="text-xl font-bold text-green-600">
                      {formatTime(myAttendance.clock_in)}
                    </p>
                  </div>
                  <div className="w-px h-12 bg-gray-200"></div>
                  <div className="text-center flex-1">
                    <p className="text-gray-500 text-sm mb-1">下班時間</p>
                    <p className="text-xl font-bold text-blue-600">
                      {formatTime(myAttendance.clock_out)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 打卡按鈕 */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleClockIn}
                disabled={isClocking || !!myAttendance?.clock_in}
                className={`py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 ${
                  myAttendance?.clock_in
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg'
                }`}
              >
                {isClocking ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : myAttendance?.clock_in ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  <LogIn className="w-5 h-5" />
                )}
                上班打卡
              </button>

              <button
                onClick={handleClockOut}
                disabled={isClocking || !myAttendance?.clock_in || !!myAttendance?.clock_out}
                className={`py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 ${
                  !myAttendance?.clock_in || myAttendance?.clock_out
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg'
                }`}
              >
                {isClocking ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : myAttendance?.clock_out ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  <LogOut className="w-5 h-5" />
                )}
                下班打卡
              </button>
            </div>
          </div>
        </div>

        {/* 今日出勤名單 */}
        <div className="bg-white rounded-2xl shadow-md p-4">
          <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-pink-500" />
            今日出勤名單
            <span className="ml-auto text-sm font-normal text-gray-500">
              {todayAttendance.length} 人
            </span>
          </h3>

          {todayAttendance.length > 0 ? (
            <div className="space-y-2">
              {todayAttendance.map((record) => (
                <div 
                  key={record.id}
                  className="flex items-center justify-between bg-gray-50 rounded-xl p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-pink-400 to-rose-400 rounded-full flex items-center justify-center text-white font-bold">
                      {record.staff_name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">{record.staff_name}</p>
                      <p className="text-xs text-gray-500">
                        {formatTime(record.clock_in)} - {formatTime(record.clock_out)}
                      </p>
                    </div>
                  </div>
                  <div>
                    {record.clock_out ? (
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                        已下班
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-green-100 text-green-600 rounded-full text-xs flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                        上班中
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Clock className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>今日尚無人打卡</p>
            </div>
          )}
        </div>

        {/* 快速連結 */}
        <div className="bg-pink-50 rounded-2xl p-4">
          <h3 className="font-medium text-pink-800 mb-2">更多功能</h3>
          <div className="grid grid-cols-2 gap-2">
            <button className="bg-white rounded-xl p-3 text-sm text-gray-600 text-left">
              📅 查看排班表
            </button>
            <button className="bg-white rounded-xl p-3 text-sm text-gray-600 text-left">
              📝 請假申請
            </button>
            <button className="bg-white rounded-xl p-3 text-sm text-gray-600 text-left">
              📊 出勤統計
            </button>
            <button className="bg-white rounded-xl p-3 text-sm text-gray-600 text-left">
              💰 薪資查詢
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
