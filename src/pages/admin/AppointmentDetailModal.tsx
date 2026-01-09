import { useState } from 'react';
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
  user_name?: string;
  user_phone?: string;
  treatment_name?: string;
  doctor_name?: string;
}

interface AppointmentDetailModalProps {
  appointment: Appointment;
  onClose: () => void;
  onUpdate: () => void;
}

// 狀態顏色對照
const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string; icon: string }> = {
  pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: '待確認', icon: '⏳' },
  confirmed: { bg: 'bg-blue-100', text: 'text-blue-700', label: '已確認', icon: '✓' },
  checked_in: { bg: 'bg-green-100', text: 'text-green-700', label: '已報到', icon: '✅' },
  completed: { bg: 'bg-slate-100', text: 'text-slate-700', label: '已完成', icon: '🏁' },
  cancelled: { bg: 'bg-red-100', text: 'text-red-700', label: '已取消', icon: '✕' },
};

export function AppointmentDetailModal({ appointment, onClose, onUpdate }: AppointmentDetailModalProps) {
  const { staff, hasPermission } = useAdminAuth();
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState('');
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  // 格式化日期時間 (24小時制)
  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  // 更新預約狀態
  const updateStatus = async (newStatus: string) => {
    if (!staff) return;
    
    setIsUpdating(true);
    setError('');

    try {
      const { error: updateError } = await supabase
        .from('appointments')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', appointment.id)
        .eq('organization_id', staff.organization_id);

      if (updateError) {
        setError('更新失敗：' + updateError.message);
        return;
      }

      onUpdate();
      onClose();
    } catch (err) {
      setError('更新失敗，請稍後再試');
    } finally {
      setIsUpdating(false);
    }
  };

  // 報到
  const handleCheckIn = () => updateStatus('checked_in');

  // 確認預約
  const handleConfirm = () => updateStatus('confirmed');

  // 完成
  const handleComplete = () => updateStatus('completed');

  // 取消
  const handleCancel = () => {
    setShowCancelConfirm(true);
  };

  const confirmCancel = () => {
    updateStatus('cancelled');
    setShowCancelConfirm(false);
  };

  const statusConfig = STATUS_CONFIG[appointment.status] || STATUS_CONFIG.pending;
  const canManage = hasPermission('super_general'); // 一般主管以上才能管理

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-fadeIn">
        {/* Header */}
        <div className="bg-gradient-to-r from-pink-500 to-rose-400 px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">預約詳情</h2>
            <button
              onClick={onClose}
              className="p-1 hover:bg-white/20 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Status Badge */}
          <div className="flex items-center justify-between">
            <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${statusConfig.bg} ${statusConfig.text}`}>
              <span className="mr-2">{statusConfig.icon}</span>
              {statusConfig.label}
            </span>
            <span className="text-sm text-slate-400">
              預約編號: #{appointment.id}
            </span>
          </div>

          {/* Customer Info */}
          <div className="bg-pink-50 rounded-xl p-4">
            <h3 className="text-sm font-medium text-slate-500 mb-3">客戶資訊</h3>
            <div className="space-y-2">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-pink-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="text-slate-700 font-medium">{appointment.user_name || '未知'}</span>
              </div>
              <div className="flex items-center">
                <svg className="w-5 h-5 text-pink-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <span className="text-slate-600">{appointment.user_phone || '未提供'}</span>
              </div>
            </div>
          </div>

          {/* Appointment Details */}
          <div className="space-y-4">
            <div className="flex items-start">
              <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center mr-4">
                <svg className="w-5 h-5 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-slate-500">預約時間</p>
                <p className="text-slate-700 font-medium">{formatDateTime(appointment.appointment_time)}</p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center mr-4">
                <svg className="w-5 h-5 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-slate-500">療程項目</p>
                <p className="text-slate-700 font-medium">{appointment.treatment_name || '未知療程'}</p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center mr-4">
                <svg className="w-5 h-5 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-slate-500">服務醫師</p>
                <p className="text-slate-700 font-medium">{appointment.doctor_name || '未指定'}</p>
              </div>
            </div>

            {appointment.notes && (
              <div className="flex items-start">
                <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center mr-4">
                  <svg className="w-5 h-5 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-slate-500">備註</p>
                  <p className="text-slate-700">{appointment.notes}</p>
                </div>
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          {/* Action Buttons */}
          {canManage && appointment.status !== 'cancelled' && appointment.status !== 'completed' && (
            <div className="flex flex-wrap gap-3 pt-4 border-t border-slate-100">
              {appointment.status === 'pending' && (
                <button
                  onClick={handleConfirm}
                  disabled={isUpdating}
                  className="flex-1 py-3 px-4 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-xl transition-colors disabled:opacity-50"
                >
                  確認預約
                </button>
              )}
              
              {(appointment.status === 'pending' || appointment.status === 'confirmed') && (
                <button
                  onClick={handleCheckIn}
                  disabled={isUpdating}
                  className="flex-1 py-3 px-4 bg-gradient-to-r from-green-500 to-emerald-400 hover:from-green-600 hover:to-emerald-500 text-white font-medium rounded-xl transition-colors disabled:opacity-50"
                >
                  {isUpdating ? '處理中...' : '報到 Check-in'}
                </button>
              )}

              {appointment.status === 'checked_in' && (
                <button
                  onClick={handleComplete}
                  disabled={isUpdating}
                  className="flex-1 py-3 px-4 bg-slate-600 hover:bg-slate-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50"
                >
                  完成療程
                </button>
              )}

              <button
                onClick={handleCancel}
                disabled={isUpdating}
                className="py-3 px-4 bg-red-50 hover:bg-red-100 text-red-600 font-medium rounded-xl transition-colors disabled:opacity-50"
              >
                取消預約
              </button>
            </div>
          )}

          {!canManage && (
            <div className="bg-slate-50 rounded-xl p-4 text-center text-sm text-slate-500">
              您目前的權限僅能查看預約資訊
            </div>
          )}
        </div>

        {/* Cancel Confirmation Modal */}
        {showCancelConfirm && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl p-6 max-w-sm w-full">
              <h3 className="text-lg font-bold text-slate-800 mb-2">確認取消預約？</h3>
              <p className="text-slate-600 mb-6">此操作無法復原，確定要取消這筆預約嗎？</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCancelConfirm(false)}
                  className="flex-1 py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition-colors"
                >
                  返回
                </button>
                <button
                  onClick={confirmCancel}
                  disabled={isUpdating}
                  className="flex-1 py-2 px-4 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  {isUpdating ? '處理中...' : '確認取消'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
