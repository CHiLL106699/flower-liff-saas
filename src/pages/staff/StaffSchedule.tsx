import { useState, useEffect, useRef, TouchEvent } from 'react';
import { supabase } from '../../lib/supabase';

interface Appointment {
  id: number;
  customer_name: string;
  customer_phone: string;
  treatment_name: string;
  appointment_time: string;
  status: string;
  notes: string;
}

export default function StaffSchedule() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [swipedId, setSwipedId] = useState<number | null>(null);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);

  useEffect(() => {
    fetchAppointments();
  }, [selectedDate]);

  const fetchAppointments = async () => {
    setIsLoading(true);
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      const organizationId = import.meta.env.VITE_ORGANIZATION_ID || '1';

      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id,
          appointment_time,
          status,
          notes,
          users (name, phone),
          treatments (name)
        `)
        .eq('organization_id', organizationId)
        .gte('appointment_time', `${dateStr}T00:00:00`)
        .lte('appointment_time', `${dateStr}T23:59:59`)
        .order('appointment_time', { ascending: true });

      if (error) throw error;

      const formattedData = data?.map(item => ({
        id: item.id,
        customer_name: (item.users as any)?.name || '未知客戶',
        customer_phone: (item.users as any)?.phone || '',
        treatment_name: (item.treatments as any)?.name || '未指定療程',
        appointment_time: item.appointment_time,
        status: item.status,
        notes: item.notes || '',
      })) || [];

      setAppointments(formattedData);
    } catch (error) {
      console.error('Error fetching appointments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTouchStart = (e: TouchEvent, id: number) => {
    touchStartX.current = e.touches[0].clientX;
    setSwipedId(id);
  };

  const handleTouchMove = (e: TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
    const diff = touchStartX.current - touchEndX.current;
    
    if (Math.abs(diff) > 30) {
      setSwipeDirection(diff > 0 ? 'left' : 'right');
    } else {
      setSwipeDirection(null);
    }
  };

  const handleTouchEnd = async (appointment: Appointment) => {
    const diff = touchStartX.current - touchEndX.current;
    
    if (Math.abs(diff) > 80) {
      if (diff > 0) {
        // 左滑 - 報到
        await handleCheckIn(appointment);
      } else {
        // 右滑 - 取消
        await handleCancel(appointment);
      }
    }
    
    setSwipedId(null);
    setSwipeDirection(null);
    touchStartX.current = 0;
    touchEndX.current = 0;
  };

  const handleCheckIn = async (appointment: Appointment) => {
    if (appointment.status === 'checked_in' || appointment.status === 'completed') {
      return;
    }

    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'checked_in' })
        .eq('id', appointment.id);

      if (error) throw error;

      setAppointments(prev => 
        prev.map(a => a.id === appointment.id ? { ...a, status: 'checked_in' } : a)
      );

      // 震動反饋
      if (navigator.vibrate) {
        navigator.vibrate(100);
      }
    } catch (error) {
      console.error('Error checking in:', error);
    }
  };

  const handleCancel = async (appointment: Appointment) => {
    if (appointment.status === 'cancelled' || appointment.status === 'completed') {
      return;
    }

    if (!confirm(`確定要取消 ${appointment.customer_name} 的預約嗎？`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'cancelled' })
        .eq('id', appointment.id);

      if (error) throw error;

      setAppointments(prev => 
        prev.map(a => a.id === appointment.id ? { ...a, status: 'cancelled' } : a)
      );

      if (navigator.vibrate) {
        navigator.vibrate([50, 50, 50]);
      }
    } catch (error) {
      console.error('Error cancelling:', error);
    }
  };

  const handleComplete = async (appointment: Appointment) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'completed' })
        .eq('id', appointment.id);

      if (error) throw error;

      setAppointments(prev => 
        prev.map(a => a.id === appointment.id ? { ...a, status: 'completed' } : a)
      );
    } catch (error) {
      console.error('Error completing:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'border-l-yellow-400 bg-yellow-50';
      case 'confirmed': return 'border-l-blue-400 bg-blue-50';
      case 'checked_in': return 'border-l-green-400 bg-green-50';
      case 'completed': return 'border-l-gray-400 bg-gray-50';
      case 'cancelled': return 'border-l-red-400 bg-red-50 opacity-60';
      default: return 'border-l-gray-400 bg-gray-50';
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

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'confirmed': return 'bg-blue-100 text-blue-800';
      case 'checked_in': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('zh-TW', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const changeDate = (days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  // 生成時間軸 (09:00 - 21:00)
  const timeSlots = Array.from({ length: 13 }, (_, i) => {
    const hour = 9 + i;
    return `${hour.toString().padStart(2, '0')}:00`;
  });

  const getAppointmentsForHour = (hour: string) => {
    const hourNum = parseInt(hour.split(':')[0]);
    return appointments.filter(a => {
      const appointmentHour = new Date(a.appointment_time).getHours();
      return appointmentHour === hourNum;
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white pb-24">
      {/* Header */}
      <div className="bg-gradient-to-r from-pink-500 to-rose-400 text-white px-4 py-6 rounded-b-3xl shadow-lg">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">預約管理</h1>
          <button 
            onClick={fetchAppointments}
            className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-sm"
          >
            🔄 刷新
          </button>
        </div>

        {/* 日期選擇器 */}
        <div className="flex items-center justify-between bg-white/20 backdrop-blur-sm rounded-2xl p-3">
          <button 
            onClick={() => changeDate(-1)}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/30"
          >
            ←
          </button>
          <div className="text-center">
            <p className="text-2xl font-bold">
              {selectedDate.toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' })}
            </p>
            <p className="text-pink-100 text-sm">
              {selectedDate.toLocaleDateString('zh-TW', { weekday: 'long' })}
              {isToday(selectedDate) && ' (今天)'}
            </p>
          </div>
          <button 
            onClick={() => changeDate(1)}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/30"
          >
            →
          </button>
        </div>
      </div>

      {/* 操作提示 */}
      <div className="px-4 py-3">
        <div className="flex justify-center space-x-4 text-xs text-gray-500">
          <span className="flex items-center">
            <span className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mr-1">←</span>
            左滑報到
          </span>
          <span className="flex items-center">
            <span className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center mr-1">→</span>
            右滑取消
          </span>
        </div>
      </div>

      {/* 時間軸 */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 border-4 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="px-4">
          {timeSlots.map((time) => {
            const hourAppointments = getAppointmentsForHour(time);
            
            return (
              <div key={time} className="flex mb-2">
                {/* 時間標籤 */}
                <div className="w-16 flex-shrink-0 text-right pr-3">
                  <span className="text-sm font-medium text-gray-500">{time}</span>
                </div>

                {/* 時間線 */}
                <div className="relative flex-1">
                  <div className="absolute left-0 top-0 bottom-0 w-px bg-pink-200"></div>
                  <div className="absolute left-0 top-3 w-2 h-2 bg-pink-400 rounded-full -translate-x-1/2"></div>

                  {/* 預約卡片 */}
                  <div className="pl-4 min-h-[60px]">
                    {hourAppointments.length === 0 ? (
                      <div className="h-[50px]"></div>
                    ) : (
                      hourAppointments.map((appointment) => (
                        <div
                          key={appointment.id}
                          className={`
                            relative mb-2 rounded-xl border-l-4 p-3 shadow-sm overflow-hidden
                            ${getStatusColor(appointment.status)}
                            ${swipedId === appointment.id && swipeDirection === 'left' ? 'translate-x-[-20px]' : ''}
                            ${swipedId === appointment.id && swipeDirection === 'right' ? 'translate-x-[20px]' : ''}
                            transition-transform duration-150
                          `}
                          onTouchStart={(e) => handleTouchStart(e, appointment.id)}
                          onTouchMove={handleTouchMove}
                          onTouchEnd={() => handleTouchEnd(appointment)}
                        >
                          {/* 滑動背景指示 */}
                          {swipedId === appointment.id && swipeDirection === 'left' && (
                            <div className="absolute right-0 top-0 bottom-0 w-20 bg-green-500 flex items-center justify-center text-white font-bold rounded-r-xl">
                              報到 ✓
                            </div>
                          )}
                          {swipedId === appointment.id && swipeDirection === 'right' && (
                            <div className="absolute left-0 top-0 bottom-0 w-20 bg-red-500 flex items-center justify-center text-white font-bold rounded-l-xl">
                              取消 ✗
                            </div>
                          )}

                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-1">
                                <span className="font-bold text-gray-800 text-lg">
                                  {appointment.customer_name}
                                </span>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusBadgeColor(appointment.status)}`}>
                                  {getStatusText(appointment.status)}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600">{appointment.treatment_name}</p>
                              {appointment.customer_phone && (
                                <p className="text-xs text-gray-400 mt-1">📞 {appointment.customer_phone}</p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-pink-600">
                                {formatTime(appointment.appointment_time)}
                              </p>
                            </div>
                          </div>

                          {/* 快捷操作按鈕 */}
                          {appointment.status === 'checked_in' && (
                            <button
                              onClick={() => handleComplete(appointment)}
                              className="mt-2 w-full bg-gradient-to-r from-pink-500 to-rose-400 text-white py-2 rounded-lg text-sm font-medium"
                            >
                              完成服務 ✓
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 統計摘要 */}
      <div className="px-4 mt-4">
        <div className="bg-white rounded-2xl p-4 shadow-md">
          <h3 className="font-bold text-gray-800 mb-3">今日統計</h3>
          <div className="grid grid-cols-4 gap-2 text-center">
            <div>
              <p className="text-2xl font-bold text-gray-800">{appointments.length}</p>
              <p className="text-xs text-gray-500">總預約</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-yellow-600">
                {appointments.filter(a => a.status === 'pending' || a.status === 'confirmed').length}
              </p>
              <p className="text-xs text-gray-500">待服務</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">
                {appointments.filter(a => a.status === 'checked_in' || a.status === 'completed').length}
              </p>
              <p className="text-xs text-gray-500">已報到</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">
                {appointments.filter(a => a.status === 'cancelled').length}
              </p>
              <p className="text-xs text-gray-500">已取消</p>
            </div>
          </div>
        </div>
      </div>

      {/* 底部導航 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-3 flex justify-around">
        <a href="/staff/dashboard" className="flex flex-col items-center text-gray-400">
          <span className="text-xl">🏠</span>
          <span className="text-xs mt-1">戰情室</span>
        </a>
        <a href="/staff/schedule" className="flex flex-col items-center text-pink-500">
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
