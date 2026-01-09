import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAdminAuth } from '../../contexts/AdminAuthContext';

interface Appointment {
  id: number;
  user_id: number;
  treatment_id: number;
  doctor_id: number | null;
  appointment_time: string;
  status: 'pending' | 'confirmed' | 'checked_in' | 'completed' | 'cancelled';
  notes: string | null;
  created_at: string;
  // Joined data
  user_name?: string;
  user_phone?: string;
  treatment_name?: string;
  doctor_name?: string;
}

interface AppointmentCalendarProps {
  onSelectAppointment: (appointment: Appointment) => void;
}

// 狀態顏色對照
const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: '待確認' },
  confirmed: { bg: 'bg-blue-100', text: 'text-blue-700', label: '已確認' },
  checked_in: { bg: 'bg-green-100', text: 'text-green-700', label: '已報到' },
  completed: { bg: 'bg-slate-100', text: 'text-slate-700', label: '已完成' },
  cancelled: { bg: 'bg-red-100', text: 'text-red-700', label: '已取消' },
};

export function AppointmentCalendar({ onSelectAppointment }: AppointmentCalendarProps) {
  const { staff } = useAdminAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');

  // 取得當月的日期範圍
  const getMonthDays = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // 取得該月第一天是星期幾 (0 = 週日)
    const startDayOfWeek = firstDay.getDay();
    
    // 產生日曆格子
    const days: (Date | null)[] = [];
    
    // 填充前面的空白
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }
    
    // 填充該月的日期
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push(new Date(year, month, d));
    }
    
    return days;
  };

  // 取得預約資料
  const fetchAppointments = async () => {
    if (!staff) return;
    
    setIsLoading(true);
    
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const startDate = new Date(year, month, 1).toISOString();
    const endDate = new Date(year, month + 1, 0, 23, 59, 59).toISOString();

    try {
      // 查詢預約資料
      const { data: appointmentsData, error } = await supabase
        .from('appointments')
        .select(`
          id,
          user_id,
          treatment_id,
          doctor_id,
          appointment_time,
          status,
          notes,
          created_at
        `)
        .eq('organization_id', staff.organization_id)
        .gte('appointment_time', startDate)
        .lte('appointment_time', endDate)
        .order('appointment_time', { ascending: true });

      if (error) {
        console.error('Error fetching appointments:', error);
        return;
      }

      // 取得關聯資料
      if (appointmentsData && appointmentsData.length > 0) {
        // 取得用戶資料
        const userIds = [...new Set(appointmentsData.map(a => a.user_id))];
        const { data: usersData } = await supabase
          .from('organization_users')
          .select('user_id, customer_real_name, customer_phone')
          .eq('organization_id', staff.organization_id)
          .in('user_id', userIds);

        // 取得療程資料
        const treatmentIds = [...new Set(appointmentsData.map(a => a.treatment_id))];
        const { data: treatmentsData } = await supabase
          .from('treatments')
          .select('id, name')
          .in('id', treatmentIds);

        // 取得醫師資料
        const doctorIds = [...new Set(appointmentsData.filter(a => a.doctor_id).map(a => a.doctor_id))];
        const { data: doctorsData } = await supabase
          .from('staff')
          .select('id, name')
          .in('id', doctorIds);

        // 合併資料
        const enrichedAppointments = appointmentsData.map(apt => {
          const user = usersData?.find(u => u.user_id === apt.user_id);
          const treatment = treatmentsData?.find(t => t.id === apt.treatment_id);
          const doctor = doctorsData?.find(d => d.id === apt.doctor_id);

          return {
            ...apt,
            user_name: user?.customer_real_name || '未知',
            user_phone: user?.customer_phone || '',
            treatment_name: treatment?.name || '未知療程',
            doctor_name: doctor?.name || '未指定',
          };
        });

        setAppointments(enrichedAppointments);
      } else {
        setAppointments([]);
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [currentDate, staff]);

  // 取得某天的預約
  const getAppointmentsForDay = (date: Date | null) => {
    if (!date) return [];
    const dateStr = date.toISOString().split('T')[0];
    return appointments.filter(apt => apt.appointment_time.startsWith(dateStr));
  };

  // 切換月份
  const navigateMonth = (direction: number) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + direction);
      return newDate;
    });
  };

  // 格式化時間 (24小時制)
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  // 判斷是否為今天
  const isToday = (date: Date | null) => {
    if (!date) return false;
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const days = getMonthDays(currentDate);
  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-pink-100 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-pink-500 to-rose-400 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigateMonth(-1)}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h2 className="text-xl font-bold text-white">
              {currentDate.getFullYear()} 年 {currentDate.getMonth() + 1} 月
            </h2>
            <button
              onClick={() => navigateMonth(1)}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-sm rounded-lg transition-colors"
            >
              今天
            </button>
            <div className="flex bg-white/20 rounded-lg p-0.5">
              {(['month', 'week', 'day'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    viewMode === mode
                      ? 'bg-white text-pink-500'
                      : 'text-white hover:bg-white/20'
                  }`}
                >
                  {mode === 'month' ? '月' : mode === 'week' ? '週' : '日'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-96">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-pink-200 border-t-pink-500"></div>
          </div>
        ) : (
          <>
            {/* Week Days Header */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {weekDays.map((day, index) => (
                <div
                  key={day}
                  className={`text-center py-2 text-sm font-medium ${
                    index === 0 ? 'text-red-400' : index === 6 ? 'text-blue-400' : 'text-slate-500'
                  }`}
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7 gap-1">
              {days.map((date, index) => {
                const dayAppointments = getAppointmentsForDay(date);
                const dayOfWeek = index % 7;
                
                return (
                  <div
                    key={index}
                    className={`min-h-[120px] p-1 rounded-lg border transition-colors ${
                      date
                        ? isToday(date)
                          ? 'bg-pink-50 border-pink-300'
                          : 'bg-white border-slate-100 hover:border-pink-200'
                        : 'bg-slate-50 border-transparent'
                    }`}
                  >
                    {date && (
                      <>
                        <div className={`text-right mb-1 ${
                          isToday(date)
                            ? 'text-pink-500 font-bold'
                            : dayOfWeek === 0
                              ? 'text-red-400'
                              : dayOfWeek === 6
                                ? 'text-blue-400'
                                : 'text-slate-600'
                        }`}>
                          <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full ${
                            isToday(date) ? 'bg-pink-500 text-white' : ''
                          }`}>
                            {date.getDate()}
                          </span>
                        </div>
                        
                        {/* Appointments */}
                        <div className="space-y-1 overflow-y-auto max-h-[80px]">
                          {dayAppointments.slice(0, 3).map((apt) => (
                            <button
                              key={apt.id}
                              onClick={() => onSelectAppointment(apt)}
                              className={`w-full text-left px-1.5 py-0.5 rounded text-xs truncate ${
                                STATUS_COLORS[apt.status]?.bg || 'bg-slate-100'
                              } ${STATUS_COLORS[apt.status]?.text || 'text-slate-600'} hover:opacity-80 transition-opacity`}
                            >
                              <span className="font-medium">{formatTime(apt.appointment_time)}</span>
                              <span className="ml-1">{apt.user_name}</span>
                            </button>
                          ))}
                          {dayAppointments.length > 3 && (
                            <div className="text-xs text-slate-400 text-center">
                              +{dayAppointments.length - 3} 筆
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Legend */}
      <div className="px-6 py-3 bg-slate-50 border-t border-slate-100">
        <div className="flex flex-wrap gap-4 text-xs">
          {Object.entries(STATUS_COLORS).map(([status, colors]) => (
            <div key={status} className="flex items-center space-x-1">
              <span className={`w-3 h-3 rounded ${colors.bg}`}></span>
              <span className="text-slate-500">{colors.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
