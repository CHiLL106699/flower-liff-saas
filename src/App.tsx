/**
 * YOChiLL SaaS Platform - App Entry Point
 * 
 * 路由架構：Layout Route 模式
 * - WebLayout: /admin, /super-admin (純網頁，無 LIFF 依賴)
 * - LiffLayout: 所有其他路由 (需要 LINE LIFF 認證)
 */

import { BrowserRouter, Routes, Route, Navigate, useNavigate, useSearchParams, Outlet } from 'react-router-dom';
import { OnboardingProvider } from './components/OnboardingGate';
import { AdminPage } from './pages/admin';
import SuperAdminPage from './pages/super-admin';
import type { GatewayResult } from './lib/liff-auth';

// LIFF Pages - 客戶版
import LiffHome from './pages/liff/LiffHome';
import LiffWeight from './pages/liff/LiffWeight';
import LiffFeedback from './pages/liff/LiffFeedback';
import LiffProfile from './pages/liff/LiffProfile';
import LiffMall from './pages/liff/LiffMall';

// LIFF Pages - 員工版
import StaffDashboard from './pages/staff/StaffDashboard';
import StaffSchedule from './pages/staff/StaffSchedule';
import StaffScanner from './pages/staff/StaffScanner';
import StaffHR from './pages/staff/StaffHR';
import StaffFinance from './pages/staff/StaffFinance';

import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { ArrowLeft, Calendar, Loader2 } from 'lucide-react';
import { Button } from './components/ui/button';

// ============================================================================
// Layout Components - 路由佈局元件
// ============================================================================

/**
 * WebLayout - 純網頁佈局
 * 用於 /admin 和 /super-admin 路由
 * 完全不載入任何 LIFF 相關邏輯
 */
const WebLayout: React.FC = () => {
  return <Outlet />;
};

/**
 * LiffLayout - LIFF 佈局
 * 用於需要 LINE 身份驗證的頁面
 * 包裹 OnboardingProvider 進行身份閘道控制
 */
const LiffLayout: React.FC = () => {
  const handleAuthSuccess = (result: GatewayResult) => {
    console.log('Auth success:', result);
  };

  const handleRegistrationComplete = (result: GatewayResult) => {
    console.log('Registration complete:', result);
  };

  return (
    <OnboardingProvider
      onAuthSuccess={handleAuthSuccess}
      onRegistrationComplete={handleRegistrationComplete}
    >
      <Outlet />
    </OnboardingProvider>
  );
};

// ============================================================================
// Booking Page - 預約頁面 (完整功能版)
// ============================================================================

interface Treatment {
  id: number;
  name: string;
  description: string;
  price: number;
  duration: number;
  category: string;
}

interface Staff {
  id: number;
  name: string;
  title: string;
  specialties: string[];
}

const BookingPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedTreatment = searchParams.get('treatment');
  
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [selectedTreatment, setSelectedTreatment] = useState<number | null>(
    preselectedTreatment ? parseInt(preselectedTreatment) : null
  );
  const [selectedStaff, setSelectedStaff] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getOrganizationId = () => parseInt(import.meta.env.VITE_ORGANIZATION_ID || '1');
  const getUserId = () => {
    const userId = localStorage.getItem('flower_user_id');
    return userId ? parseInt(userId) : null;
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: treatmentData, error: treatmentError } = await supabase
          .from('treatments')
          .select('*')
          .eq('organization_id', getOrganizationId())
          .eq('is_active', true);

        if (treatmentError) throw treatmentError;
        setTreatments(treatmentData || []);

        const { data: staffData, error: staffError } = await supabase
          .from('staff')
          .select('*')
          .eq('organization_id', getOrganizationId())
          .eq('is_active', true);

        if (staffError) throw staffError;
        setStaff(staffData || []);

      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const timeSlots = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
    '17:00', '17:30', '18:00', '18:30', '19:00'
  ];

  const generateDates = () => {
    const dates = [];
    const today = new Date();
    for (let i = 1; i <= 14; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date.toISOString().split('T')[0]);
    }
    return dates;
  };

  const availableDates = generateDates();

  const handleSubmit = async () => {
    const userId = getUserId();
    if (!userId) {
      alert('請先完成會員註冊');
      navigate('/');
      return;
    }

    if (!selectedTreatment || !selectedDate || !selectedTime) {
      alert('請選擇療程、日期和時段');
      return;
    }

    setIsSubmitting(true);
    try {
      const appointmentTime = new Date(`${selectedDate}T${selectedTime}:00`);
      
      const { error } = await supabase
        .from('appointments')
        .insert({
          organization_id: getOrganizationId(),
          user_id: userId,
          treatment_id: selectedTreatment,
          doctor_id: selectedStaff,
          appointment_time: appointmentTime.toISOString(),
          status: 'pending',
          notes: ''
        });

      if (error) throw error;

      alert('預約成功！我們將盡快與您確認。');
      navigate('/profile');
    } catch (error) {
      console.error('Failed to create appointment:', error);
      alert('預約失敗，請稍後再試');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50">
      <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white px-4 py-4 rounded-b-3xl shadow-lg">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Calendar className="w-6 h-6" />
            <h1 className="text-xl font-bold">立即預約</h1>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 space-y-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="font-bold text-slate-800 mb-3">選擇療程</h2>
          <div className="space-y-2">
            {treatments.map((treatment) => (
              <button
                key={treatment.id}
                onClick={() => setSelectedTreatment(treatment.id)}
                className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${
                  selectedTreatment === treatment.id
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md'
                    : 'bg-orange-50 hover:bg-orange-100 text-slate-700'
                }`}
              >
                <div className="text-left">
                  <p className="font-medium">{treatment.name}</p>
                  <p className={`text-sm ${selectedTreatment === treatment.id ? 'text-orange-100' : 'text-slate-400'}`}>
                    {treatment.duration} 分鐘
                  </p>
                </div>
                <p className={`font-semibold ${selectedTreatment === treatment.id ? 'text-white' : 'text-orange-500'}`}>
                  NT$ {treatment.price.toLocaleString()}
                </p>
              </button>
            ))}
          </div>
        </div>

        {staff.length > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h2 className="font-bold text-slate-800 mb-3">選擇醫師 (選填)</h2>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedStaff(null)}
                className={`px-4 py-2 rounded-full text-sm transition-all ${
                  selectedStaff === null
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white'
                    : 'bg-orange-50 text-slate-600 hover:bg-orange-100'
                }`}
              >
                不指定
              </button>
              {staff.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelectedStaff(s.id)}
                  className={`px-4 py-2 rounded-full text-sm transition-all ${
                    selectedStaff === s.id
                      ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white'
                      : 'bg-orange-50 text-slate-600 hover:bg-orange-100'
                  }`}
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="font-bold text-slate-800 mb-3">選擇日期</h2>
          <div className="flex flex-wrap gap-2">
            {availableDates.map((date) => {
              const d = new Date(date);
              const weekday = d.toLocaleDateString('zh-TW', { weekday: 'short' });
              const dayNum = d.getDate();
              const month = d.getMonth() + 1;
              
              return (
                <button
                  key={date}
                  onClick={() => setSelectedDate(date)}
                  className={`flex flex-col items-center px-3 py-2 rounded-xl transition-all min-w-[60px] ${
                    selectedDate === date
                      ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md'
                      : 'bg-orange-50 hover:bg-orange-100 text-slate-600'
                  }`}
                >
                  <span className="text-xs">{weekday}</span>
                  <span className="font-bold">{dayNum}</span>
                  <span className="text-xs">{month}月</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="font-bold text-slate-800 mb-3">選擇時段</h2>
          <div className="grid grid-cols-4 gap-2">
            {timeSlots.map((time) => (
              <button
                key={time}
                onClick={() => setSelectedTime(time)}
                className={`py-2 px-3 rounded-lg transition-all text-sm ${
                  selectedTime === time
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md'
                    : 'bg-orange-50 hover:bg-orange-100 text-slate-600'
                }`}
              >
                {time}
              </button>
            ))}
          </div>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || !selectedTreatment || !selectedDate || !selectedTime}
          className="w-full py-6 rounded-2xl text-lg font-bold shadow-lg"
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              預約中...
            </span>
          ) : (
            '確認預約'
          )}
        </Button>
      </div>
    </div>
  );
};

// ============================================================================
// App Root - 使用 Layout Route 模式
// ============================================================================

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* ============================================================ */}
        {/* Web Routes - 純網頁路由 (無 LIFF 依賴)                        */}
        {/* 這些路由使用 WebLayout，完全不載入 OnboardingProvider          */}
        {/* ============================================================ */}
        <Route element={<WebLayout />}>
          <Route path="/super-admin/*" element={<SuperAdminPage />} />
          <Route path="/admin/*" element={<AdminPage />} />
        </Route>

        {/* ============================================================ */}
        {/* Staff LIFF Routes - 員工版 Mobile 後台                        */}
        {/* 暫時獨立，未來可整合至 LiffLayout                              */}
        {/* ============================================================ */}
        <Route path="/staff/dashboard" element={<StaffDashboard />} />
        <Route path="/staff/schedule" element={<StaffSchedule />} />
        <Route path="/staff/scanner" element={<StaffScanner />} />
        <Route path="/staff/hr" element={<StaffHR />} />
        <Route path="/staff/finance" element={<StaffFinance />} />

        {/* ============================================================ */}
        {/* LIFF Client Routes - 需要 LINE 身份驗證                       */}
        {/* 這些路由使用 LiffLayout，包裹 OnboardingProvider               */}
        {/* ============================================================ */}
        <Route element={<LiffLayout />}>
          <Route path="/" element={<LiffHome />} />
          <Route path="/booking" element={<BookingPage />} />
          <Route path="/mall" element={<LiffMall />} />
          <Route path="/weight" element={<LiffWeight />} />
          <Route path="/profile" element={<LiffProfile />} />
          <Route path="/feedback" element={<LiffFeedback />} />
          
          {/* 舊路由相容 */}
          <Route path="/records" element={<Navigate to="/profile" replace />} />
          <Route path="/offers" element={<Navigate to="/mall" replace />} />
          <Route path="/contact" element={<Navigate to="/feedback" replace />} />
        </Route>

        {/* 404 - 預設導向首頁 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
