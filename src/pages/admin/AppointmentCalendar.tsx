import { useState, useMemo, useCallback } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import type { EventClickArg, DateSelectArg } from '@fullcalendar/core';
import { useAppointments, type Appointment, type AppointmentStatus } from '../../hooks/useAppointments';
import { AppointmentDetailModal } from './AppointmentDetailModal';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { RefreshCw, Calendar, Clock, Users, CheckCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

interface AppointmentCalendarProps {
  organizationId?: number;
  onSelectAppointment?: (appointment: Appointment) => void;
}

// 狀態顏色映射
const STATUS_COLORS: Record<AppointmentStatus, string> = {
  pending: '#fbbf24',      // 黃色
  confirmed: '#3b82f6',    // 藍色
  checked_in: '#10b981',   // 綠色
  completed: '#8b5cf6',    // 紫色
  cancelled: '#94a3b8',    // 灰色
};

// 狀態文字映射
const STATUS_LABELS: Record<AppointmentStatus, string> = {
  pending: '待確認',
  confirmed: '已確認',
  checked_in: '已報到',
  completed: '已完成',
  cancelled: '已取消',
};

export function AppointmentCalendar({ organizationId = 1 }: AppointmentCalendarProps) {
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentView, setCurrentView] = useState<'dayGridMonth' | 'timeGridWeek' | 'timeGridDay'>('dayGridMonth');

  const {
    appointments,
    stats,
    isLoading,
    refresh,
  } = useAppointments({
    organizationId,
    autoRefresh: true,
    refreshInterval: 30000,
  });

  // 轉換預約資料為 FullCalendar 事件格式
  const calendarEvents = useMemo(() => {
    return appointments.map(apt => ({
      id: String(apt.id),
      title: `${(apt as any).organization_users?.customer_real_name || (apt as any).users?.line_display_name || '未知客戶'} - ${(apt as any).treatments?.name || '未知療程'}`,
      start: apt.appointment_time,
      end: (apt as any).treatments?.duration_minutes
        ? new Date(new Date(apt.appointment_time).getTime() + (apt as any).treatments.duration_minutes * 60000).toISOString()
        : apt.appointment_time,
      backgroundColor: STATUS_COLORS[apt.status],
      borderColor: STATUS_COLORS[apt.status],
      extendedProps: {
        appointment: apt,
      },
    }));
  }, [appointments]);

  // 點擊事件處理
  const handleEventClick = useCallback((info: EventClickArg) => {
    const appointment = info.event.extendedProps.appointment as Appointment;
    setSelectedAppointment(appointment);
    setIsModalOpen(true);
  }, []);

  // 日期選擇處理 (未來可用於新增預約)
  const handleDateSelect = useCallback((_selectInfo: DateSelectArg) => {
    // TODO: 開啟新增預約 Modal
    console.log('Date selected:', _selectInfo);
  }, []);

  // 關閉 Modal
  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedAppointment(null);
  }, []);

  return (
    <div className="space-y-6">
      {/* 統計卡片 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-pink-50 to-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">今日預約</p>
                <p className="text-2xl font-bold text-slate-800">{stats.todayTotal}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-pink-100 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-pink-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-50 to-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">待確認</p>
                <p className="text-2xl font-bold text-slate-800">{stats.pendingCount}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-yellow-100 flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50 to-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">今日報到</p>
                <p className="text-2xl font-bold text-slate-800">{stats.checkedInCount}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-emerald-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">總客戶數</p>
                <p className="text-2xl font-bold text-slate-800">{stats.totalCustomers}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 行事曆卡片 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-lg font-semibold">預約行事曆</CardTitle>
          <div className="flex items-center gap-2">
            {/* 狀態圖例 */}
            <div className="hidden md:flex items-center gap-3 mr-4">
              {Object.entries(STATUS_LABELS).map(([status, label]) => (
                <div key={status} className="flex items-center gap-1.5">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: STATUS_COLORS[status as AppointmentStatus] }}
                  />
                  <span className="text-xs text-slate-500">{label}</span>
                </div>
              ))}
            </div>
            
            {/* 刷新按鈕 */}
            <Button
              variant="outline"
              size="sm"
              onClick={refresh}
              disabled={isLoading}
              className="gap-2"
            >
              <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
              刷新
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* 視圖切換 (Mobile) */}
          <div className="flex md:hidden gap-2 mb-4">
            <Badge
              variant={currentView === 'dayGridMonth' ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setCurrentView('dayGridMonth')}
            >
              月
            </Badge>
            <Badge
              variant={currentView === 'timeGridWeek' ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setCurrentView('timeGridWeek')}
            >
              週
            </Badge>
            <Badge
              variant={currentView === 'timeGridDay' ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setCurrentView('timeGridDay')}
            >
              日
            </Badge>
          </div>

          {/* FullCalendar */}
          <div className="fc-wrapper">
            <FullCalendar
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView={currentView}
              headerToolbar={{
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay',
              }}
              locale="zh-tw"
              buttonText={{
                today: '今天',
                month: '月',
                week: '週',
                day: '日',
              }}
              events={calendarEvents}
              eventClick={handleEventClick}
              selectable={true}
              select={handleDateSelect}
              editable={false}
              dayMaxEvents={3}
              moreLinkText={(n) => `還有 ${n} 筆`}
              height="auto"
              aspectRatio={1.8}
              slotMinTime="08:00:00"
              slotMaxTime="22:00:00"
              allDaySlot={false}
              slotDuration="00:30:00"
              eventTimeFormat={{
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
              }}
              viewDidMount={(info) => setCurrentView(info.view.type as typeof currentView)}
            />
          </div>
        </CardContent>
      </Card>

      {/* 預約詳情 Modal */}
      {selectedAppointment && isModalOpen && (
        <AppointmentDetailModal
          appointment={selectedAppointment}
          onClose={handleCloseModal}
          onUpdate={refresh}
        />
      )}
    </div>
  );
}

export default AppointmentCalendar;
