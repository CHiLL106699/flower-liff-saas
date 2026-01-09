/**
 * LINE LIFF SaaS Platform - App Entry Point
 * 
 * Theme: Flower Pink (粉色系 - 花花醫美品牌)
 * 
 * 展示如何使用 OnboardingGate 元件包裝整個應用程式
 * 確保所有使用者在存取任何功能前都已完成身份綁定
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { OnboardingProvider, useOnboarding } from './components/OnboardingGate';
import { AdminPage } from './pages/admin';
import type { GatewayResult } from './lib/liff-auth';

// ============================================================================
// Pages - Flower Pink Theme
// ============================================================================

/**
 * 首頁 - 功能選單 (Flower Pink Theme)
 */
const HomePage: React.FC = () => {
  const { profile } = useOnboarding();

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-white text-slate-700">
      {/* Header */}
      <header className="text-center py-8 px-4">
        <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-pink-400 to-rose-400 rounded-full flex items-center justify-center shadow-lg">
          <span className="text-3xl">🌸</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-800 mb-1">花花醫美診所</h1>
        <p className="text-pink-400 text-sm">Flower Medical Clinic</p>
      </header>

      <div className="px-4 pb-8">
        {/* User Info Card */}
        <div className="bg-white rounded-2xl p-4 mb-6 flex items-center gap-4 shadow-sm border border-pink-100">
          {profile?.pictureUrl && (
            <img
              src={profile.pictureUrl}
              alt={profile.displayName}
              className="w-14 h-14 rounded-full border-2 border-pink-200"
            />
          )}
          <div>
            <p className="font-semibold text-slate-700">{profile?.displayName}</p>
            <p className="text-sm text-pink-500">會員已認證 ✓</p>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <FeatureCard
            icon="📅"
            title="預約管理"
            description="智能排程系統"
            href="/booking"
            badge="立即預約"
            badgeColor="bg-pink-500"
          />
          <FeatureCard
            icon="📋"
            title="我的療程"
            description="療程紀錄查詢"
            href="/records"
          />
          <FeatureCard
            icon="💝"
            title="會員優惠"
            description="專屬優惠活動"
            href="/offers"
            isNew
          />
          <FeatureCard
            icon="📞"
            title="聯繫我們"
            description="客服與諮詢"
            href="/contact"
          />
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-lg font-semibold mb-4 text-slate-700">快速操作</h2>
          <div className="flex gap-3 overflow-x-auto pb-2">
            <QuickActionButton icon="🔔" label="通知" />
            <QuickActionButton icon="📍" label="地址" />
            <QuickActionButton icon="⏰" label="營業時間" />
            <QuickActionButton icon="💬" label="客服" />
          </div>
        </div>

        {/* Promotional Banner */}
        <div className="mt-8 bg-gradient-to-r from-pink-400 to-rose-400 rounded-2xl p-6 text-white shadow-lg">
          <h3 className="font-bold text-lg mb-2">新春優惠活動 🎉</h3>
          <p className="text-pink-100 text-sm mb-4">首次預約享 85 折優惠，立即體驗！</p>
          <Link
            to="/booking"
            className="inline-block bg-white text-pink-500 px-6 py-2 rounded-full font-semibold text-sm hover:shadow-lg transition-all"
          >
            立即預約
          </Link>
        </div>
      </div>
    </div>
  );
};

/**
 * 預約頁面 (Flower Pink Theme)
 */
const BookingPage: React.FC = () => {
  useOnboarding(); // Ensure user is authenticated

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-white text-slate-700">
      {/* Header */}
      <header className="flex items-center gap-4 p-4 bg-white border-b border-pink-100">
        <Link to="/" className="text-2xl text-pink-500">←</Link>
        <h1 className="text-xl font-bold text-slate-700">預約服務</h1>
      </header>

      <div className="p-4 space-y-4">
        {/* Treatment Selection */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-pink-100">
          <h2 className="font-semibold mb-3 text-slate-700">選擇療程</h2>
          <div className="space-y-2">
            <TreatmentOption
              name="皮秒雷射"
              duration="45 分鐘"
              price="NT$ 12,000"
            />
            <TreatmentOption
              name="肉毒桿菌"
              duration="20 分鐘"
              price="NT$ 6,000"
            />
            <TreatmentOption
              name="玻尿酸注射"
              duration="30 分鐘"
              price="NT$ 8,000"
            />
          </div>
        </div>

        {/* Date Selection */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-pink-100">
          <h2 className="font-semibold mb-3 text-slate-700">選擇日期</h2>
          <div className="grid grid-cols-7 gap-2 text-center text-sm">
            {['日', '一', '二', '三', '四', '五', '六'].map((day) => (
              <div key={day} className="text-pink-400 font-medium">{day}</div>
            ))}
            {Array.from({ length: 31 }, (_, i) => (
              <button
                key={i}
                className={`p-2 rounded-lg transition-all ${
                  i === 8
                    ? 'bg-gradient-to-r from-pink-500 to-rose-400 text-white shadow-md'
                    : 'hover:bg-pink-50 text-slate-600'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>

        {/* Time Selection */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-pink-100">
          <h2 className="font-semibold mb-3 text-slate-700">選擇時段</h2>
          <div className="grid grid-cols-4 gap-2">
            {['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '14:00', '14:30'].map((time, i) => (
              <button
                key={time}
                className={`py-2 px-3 rounded-lg transition-all text-sm ${
                  i === 2
                    ? 'bg-gradient-to-r from-pink-500 to-rose-400 text-white shadow-md'
                    : 'bg-pink-50 hover:bg-pink-100 text-slate-600'
                }`}
              >
                {time}
              </button>
            ))}
          </div>
        </div>

        {/* Submit Button */}
        <button className="w-full bg-gradient-to-r from-pink-500 to-rose-400 text-white py-4 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all">
          確認預約
        </button>
      </div>
    </div>
  );
};

/**
 * 療程紀錄頁面 (Flower Pink Theme)
 */
const RecordsPage: React.FC = () => {
  useOnboarding(); // Ensure user is authenticated
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-white text-slate-700">
      <header className="flex items-center gap-4 p-4 bg-white border-b border-pink-100">
        <Link to="/" className="text-2xl text-pink-500">←</Link>
        <h1 className="text-xl font-bold text-slate-700">我的療程</h1>
      </header>
      <div className="p-4">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-pink-100 text-center">
          <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">📋</span>
          </div>
          <p className="text-slate-500">尚無療程紀錄</p>
          <Link
            to="/booking"
            className="inline-block mt-4 bg-gradient-to-r from-pink-500 to-rose-400 text-white px-6 py-2 rounded-full font-semibold text-sm"
          >
            立即預約
          </Link>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// UI Components - Flower Pink Theme
// ============================================================================

interface FeatureCardProps {
  icon: string;
  title: string;
  description: string;
  href: string;
  badge?: string;
  badgeColor?: string;
  isNew?: boolean;
}

const FeatureCard: React.FC<FeatureCardProps> = ({
  icon,
  title,
  description,
  href,
  badge,
  badgeColor = 'bg-pink-500',
  isNew,
}) => (
  <Link
    to={href}
    className="bg-white rounded-2xl p-4 block hover:shadow-md transition-all relative border border-pink-100"
  >
    {isNew && (
      <span className="absolute top-2 right-2 bg-gradient-to-r from-pink-500 to-rose-400 text-white text-xs px-2 py-0.5 rounded-full">
        NEW
      </span>
    )}
    {badge && !isNew && (
      <span className={`absolute top-2 right-2 ${badgeColor} text-white text-xs px-2 py-0.5 rounded-full`}>
        {badge}
      </span>
    )}
    <div className="w-12 h-12 bg-pink-100 rounded-xl flex items-center justify-center mb-3">
      <span className="text-2xl">{icon}</span>
    </div>
    <h3 className="font-semibold text-slate-700">{title}</h3>
    <p className="text-sm text-slate-400">{description}</p>
  </Link>
);

interface QuickActionButtonProps {
  icon: string;
  label: string;
}

const QuickActionButton: React.FC<QuickActionButtonProps> = ({ icon, label }) => (
  <button className="flex flex-col items-center gap-1 bg-white rounded-xl px-4 py-3 min-w-[70px] hover:shadow-md transition-all border border-pink-100">
    <span className="text-xl">{icon}</span>
    <span className="text-xs text-slate-500">{label}</span>
  </button>
);

interface TreatmentOptionProps {
  name: string;
  duration: string;
  price: string;
}

const TreatmentOption: React.FC<TreatmentOptionProps> = ({ name, duration, price }) => (
  <button className="w-full flex items-center justify-between p-3 rounded-xl bg-pink-50 hover:bg-pink-100 transition-colors">
    <div className="text-left">
      <p className="font-medium text-slate-700">{name}</p>
      <p className="text-sm text-slate-400">{duration}</p>
    </div>
    <p className="text-pink-500 font-semibold">{price}</p>
  </button>
);

// ============================================================================
// App Root
// ============================================================================

const App: React.FC = () => {
  const handleAuthSuccess = (result: GatewayResult) => {
    console.log('Auth success:', result);
  };

  const handleRegistrationComplete = (result: GatewayResult) => {
    console.log('Registration complete:', result);
  };

  return (
    <BrowserRouter>
      <Routes>
        {/* Admin Route - 獨立於 LIFF 認證流程 */}
        <Route path="/admin/*" element={<AdminPage />} />
        
        {/* LIFF Client Routes - 需要 OnboardingGate */}
        <Route
          path="/*"
          element={
            <OnboardingProvider
              onAuthSuccess={handleAuthSuccess}
              onRegistrationComplete={handleRegistrationComplete}
            >
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/booking" element={<BookingPage />} />
                <Route path="/records" element={<RecordsPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </OnboardingProvider>
          }
        />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
