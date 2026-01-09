/**
 * 員工版 LIFF - 掃碼報到頁面
 * 
 * 功能：
 * - 使用 liff.scanCode() 掃描會員 QR Code
 * - 查詢會員資料並顯示
 * - 快速報到功能
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import liff from '@line/liff';
import { supabase } from '../../lib/supabase';
import { 
  ArrowLeft, 
  QrCode, 
  User, 
  Calendar, 
  CheckCircle,
  XCircle,
  Loader2,
  Camera,
  Search
} from 'lucide-react';

interface MemberInfo {
  id: number;
  name: string;
  phone: string;
  line_user_id: string;
  created_at: string;
  todayAppointment?: {
    id: number;
    treatment_name: string;
    appointment_time: string;
    status: string;
  } | null;
}

export default function StaffScanner() {
  const navigate = useNavigate();
  const [isScanning, setIsScanning] = useState(false);
  const [memberInfo, setMemberInfo] = useState<MemberInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);

  const handleScan = async () => {
    setError(null);
    setMemberInfo(null);

    // 檢查是否在 LINE 環境中
    if (!liff.isInClient()) {
      setError('此功能需在 LINE 應用程式中使用');
      setShowManualInput(true);
      return;
    }

    try {
      setIsScanning(true);
      const result = await liff.scanCodeV2();
      
      if (result.value) {
        await lookupMember(result.value);
      }
    } catch (err) {
      console.error('Scan error:', err);
      setError('掃描失敗，請重試或使用手動輸入');
      setShowManualInput(true);
    } finally {
      setIsScanning(false);
    }
  };

  const lookupMember = async (identifier: string) => {
    setIsProcessing(true);
    setError(null);

    try {
      const organizationId = import.meta.env.VITE_ORGANIZATION_ID || '1';

      // 嘗試用 LINE User ID 或電話號碼查詢
      let query = supabase
        .from('users')
        .select('id, name, phone, line_user_id, created_at')
        .eq('organization_id', organizationId);

      // 判斷是 LINE User ID 還是電話
      if (identifier.startsWith('U') && identifier.length > 20) {
        query = query.eq('line_user_id', identifier);
      } else {
        query = query.eq('phone', identifier.replace(/[^0-9]/g, ''));
      }

      const { data: userData, error: userError } = await query.single();

      if (userError || !userData) {
        setError('找不到此會員資料');
        return;
      }

      // 查詢今日預約
      const today = new Date().toISOString().split('T')[0];
      const { data: appointmentData } = await supabase
        .from('appointments')
        .select(`
          id,
          appointment_time,
          status,
          treatments (name)
        `)
        .eq('user_id', userData.id)
        .eq('organization_id', organizationId)
        .gte('appointment_time', `${today}T00:00:00`)
        .lte('appointment_time', `${today}T23:59:59`)
        .order('appointment_time', { ascending: true })
        .limit(1)
        .single();

      setMemberInfo({
        ...userData,
        todayAppointment: appointmentData ? {
          id: appointmentData.id,
          treatment_name: (appointmentData.treatments as any)?.name || '未知療程',
          appointment_time: appointmentData.appointment_time,
          status: appointmentData.status,
        } : null,
      });
    } catch (err) {
      console.error('Lookup error:', err);
      setError('查詢會員資料時發生錯誤');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManualSearch = async () => {
    if (!manualInput.trim()) return;
    await lookupMember(manualInput.trim());
  };

  const handleCheckIn = async () => {
    if (!memberInfo?.todayAppointment) return;

    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ 
          status: 'checked_in',
          updated_at: new Date().toISOString()
        })
        .eq('id', memberInfo.todayAppointment.id);

      if (error) throw error;

      // 更新本地狀態
      setMemberInfo({
        ...memberInfo,
        todayAppointment: {
          ...memberInfo.todayAppointment,
          status: 'checked_in',
        },
      });

      // 顯示成功訊息
      alert('報到成功！');
    } catch (err) {
      console.error('Check-in error:', err);
      setError('報到失敗，請重試');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('zh-TW', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; color: string }> = {
      'pending': { label: '待確認', color: 'bg-yellow-100 text-yellow-800' },
      'confirmed': { label: '已確認', color: 'bg-blue-100 text-blue-800' },
      'checked_in': { label: '已報到', color: 'bg-green-100 text-green-800' },
      'completed': { label: '已完成', color: 'bg-gray-100 text-gray-800' },
      'cancelled': { label: '已取消', color: 'bg-red-100 text-red-800' },
    };
    const config = statusConfig[status] || { label: status, color: 'bg-gray-100 text-gray-800' };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

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
            <h1 className="text-lg font-bold">掃碼報到</h1>
            <p className="text-pink-100 text-xs">掃描會員 QR Code 快速報到</p>
          </div>
          <QrCode className="w-6 h-6" />
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* 掃描按鈕區 */}
        <div className="bg-white rounded-2xl shadow-md p-6 text-center">
          <div className="w-24 h-24 mx-auto mb-4 bg-gradient-to-br from-pink-100 to-rose-100 rounded-full flex items-center justify-center">
            <Camera className="w-12 h-12 text-pink-500" />
          </div>
          
          <button
            onClick={handleScan}
            disabled={isScanning}
            className="w-full bg-gradient-to-r from-pink-500 to-rose-500 text-white py-4 rounded-xl font-bold text-lg shadow-lg active:scale-95 transition-transform disabled:opacity-50"
          >
            {isScanning ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                掃描中...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <QrCode className="w-5 h-5" />
                開始掃描
              </span>
            )}
          </button>

          <p className="text-gray-500 text-sm mt-3">
            點擊按鈕開啟相機掃描會員 QR Code
          </p>
        </div>

        {/* 手動輸入區 */}
        {showManualInput && (
          <div className="bg-white rounded-2xl shadow-md p-4">
            <h3 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
              <Search className="w-4 h-4" />
              手動查詢
            </h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder="輸入電話號碼"
                className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
              <button
                onClick={handleManualSearch}
                disabled={isProcessing || !manualInput.trim()}
                className="px-4 py-3 bg-pink-500 text-white rounded-xl font-medium disabled:opacity-50"
              >
                查詢
              </button>
            </div>
          </div>
        )}

        {/* 錯誤訊息 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
            <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* 處理中 */}
        {isProcessing && !memberInfo && (
          <div className="bg-white rounded-2xl shadow-md p-6 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-pink-500 mx-auto mb-2" />
            <p className="text-gray-600">查詢中...</p>
          </div>
        )}

        {/* 會員資訊卡片 */}
        {memberInfo && (
          <div className="bg-white rounded-2xl shadow-md overflow-hidden">
            {/* 會員基本資訊 */}
            <div className="bg-gradient-to-r from-pink-500 to-rose-500 text-white p-4">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center">
                  <User className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="font-bold text-xl">{memberInfo.name}</h3>
                  <p className="text-pink-100">{memberInfo.phone}</p>
                </div>
              </div>
            </div>

            {/* 今日預約 */}
            <div className="p-4">
              <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                今日預約
              </h4>

              {memberInfo.todayAppointment ? (
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-800">
                      {memberInfo.todayAppointment.treatment_name}
                    </span>
                    {getStatusBadge(memberInfo.todayAppointment.status)}
                  </div>
                  <p className="text-gray-600 text-sm">
                    預約時間：{formatTime(memberInfo.todayAppointment.appointment_time)}
                  </p>

                  {/* 報到按鈕 */}
                  {memberInfo.todayAppointment.status === 'confirmed' && (
                    <button
                      onClick={handleCheckIn}
                      disabled={isProcessing}
                      className="w-full mt-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-50"
                    >
                      {isProcessing ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <CheckCircle className="w-5 h-5" />
                      )}
                      確認報到
                    </button>
                  )}

                  {memberInfo.todayAppointment.status === 'checked_in' && (
                    <div className="mt-4 bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <span className="text-green-700 font-medium">已完成報到</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-gray-50 rounded-xl p-4 text-center">
                  <p className="text-gray-500">今日無預約</p>
                </div>
              )}
            </div>

            {/* 重新掃描按鈕 */}
            <div className="p-4 pt-0">
              <button
                onClick={() => {
                  setMemberInfo(null);
                  setError(null);
                  setManualInput('');
                }}
                className="w-full py-3 border border-pink-300 text-pink-600 rounded-xl font-medium"
              >
                掃描下一位
              </button>
            </div>
          </div>
        )}

        {/* 使用說明 */}
        <div className="bg-pink-50 rounded-2xl p-4">
          <h3 className="font-medium text-pink-800 mb-2">使用說明</h3>
          <ul className="text-sm text-pink-700 space-y-1">
            <li>• 點擊「開始掃描」開啟相機</li>
            <li>• 對準會員手機上的 QR Code</li>
            <li>• 確認會員資料後點擊「確認報到」</li>
            <li>• 若掃描失敗可使用手動輸入電話查詢</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
