/**
 * LIFF 六宮格首頁
 * 
 * 支援角色權限分流：
 * - 客戶模式：顯示預約、商城、體重追蹤等功能
 * - 員工模式：顯示戰情室、預約管理、掃碼報到等功能
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import liff from '@line/liff';
import { supabase } from '../../lib/supabase';
import { 
  Calendar, 
  Truck, 
  Heart, 
  Scale, 
  User, 
  MessageCircle,
  Sparkles,
  LayoutDashboard,
  QrCode,
  Users,
  DollarSign,
  ArrowLeftRight
} from 'lucide-react';

interface MenuCard {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  color: string;
  bgGradient: string;
  path?: string;
  action?: () => void;
}

interface StaffInfo {
  id: number;
  name: string;
  role: string;
  position: string;
}

interface UserProfile {
  userId: string;
  displayName: string;
  pictureUrl?: string;
}

export default function LiffHome() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isStaff, setIsStaff] = useState(false);
  const [staffInfo, setStaffInfo] = useState<StaffInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    initializeLiff();
    updateGreeting();
  }, []);

  const initializeLiff = async () => {
    try {
      const liffId = import.meta.env.VITE_LIFF_ID;
      if (!liffId) {
        setIsLoading(false);
        return;
      }

      if (!liff.ready) {
        await liff.init({ liffId });
      }

      if (liff.isLoggedIn()) {
        const liffProfile = await liff.getProfile();
        setProfile({
          userId: liffProfile.userId,
          displayName: liffProfile.displayName,
          pictureUrl: liffProfile.pictureUrl,
        });

        // 檢查是否為員工
        await checkStaffStatus(liffProfile.userId);
      }
    } catch (error) {
      console.error('LIFF initialization error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const checkStaffStatus = async (lineUserId: string) => {
    try {
      const organizationId = import.meta.env.VITE_ORGANIZATION_ID || '1';

      const { data, error } = await supabase
        .from('staff')
        .select('id, name, role, position')
        .eq('line_user_id', lineUserId)
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .single();

      if (!error && data) {
        setIsStaff(true);
        setStaffInfo(data);
      }
    } catch (error) {
      console.error('Error checking staff status:', error);
    }
  };

  const updateGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) {
      setGreeting('早安');
    } else if (hour < 18) {
      setGreeting('午安');
    } else {
      setGreeting('晚安');
    }
  };

  const getRoleDisplayName = (role: string) => {
    const roleNames: Record<string, string> = {
      'staff': '員工',
      'super_general': '一般主管',
      'super_senior': '高階主管',
      'admin': '管理員',
    };
    return roleNames[role] || role;
  };

  // 術後護理 - 傳送訊息到 LINE 聊天室
  const handleAftercare = async () => {
    if (typeof window !== 'undefined' && liff.isInClient()) {
      try {
        await liff.sendMessages([{
          type: 'text',
          text: '術後護理'
        }]);
        liff.closeWindow();
      } catch (error) {
        console.error('Failed to send message:', error);
        alert('訊息發送失敗，請稍後再試');
      }
    } else {
      alert('此功能需在 LINE 中使用');
    }
  };

  // 客戶版六宮格選單
  const customerMenuCards: MenuCard[] = [
    {
      id: 'booking',
      title: '立即預約',
      subtitle: '線上預約諮詢',
      icon: <Calendar className="w-8 h-8" />,
      color: 'text-orange-600',
      bgGradient: 'from-orange-400 to-amber-500',
      path: '/booking'
    },
    {
      id: 'delivery',
      title: '醫美配送',
      subtitle: '產品宅配到府',
      icon: <Truck className="w-8 h-8" />,
      color: 'text-emerald-600',
      bgGradient: 'from-emerald-400 to-teal-500',
      path: '/mall'
    },
    {
      id: 'aftercare',
      title: '術後護理',
      subtitle: '專業護理諮詢',
      icon: <Heart className="w-8 h-8" />,
      color: 'text-blue-600',
      bgGradient: 'from-blue-400 to-indigo-500',
      action: handleAftercare
    },
    {
      id: 'weight',
      title: '體重追蹤',
      subtitle: '健康管理紀錄',
      icon: <Scale className="w-8 h-8" />,
      color: 'text-purple-600',
      bgGradient: 'from-purple-400 to-violet-500',
      path: '/weight'
    },
    {
      id: 'member',
      title: '會員中心',
      subtitle: '個人資料管理',
      icon: <User className="w-8 h-8" />,
      color: 'text-pink-600',
      bgGradient: 'from-pink-400 to-rose-500',
      path: '/profile'
    },
    {
      id: 'contact',
      title: '聯絡我們',
      subtitle: '意見回饋留言',
      icon: <MessageCircle className="w-8 h-8" />,
      color: 'text-yellow-600',
      bgGradient: 'from-yellow-400 to-orange-500',
      path: '/feedback'
    }
  ];

  // 員工版六宮格選單
  const staffMenuCards: MenuCard[] = [
    {
      id: 'dashboard',
      title: '戰情室',
      subtitle: '今日營運總覽',
      icon: <LayoutDashboard className="w-8 h-8" />,
      color: 'text-pink-600',
      bgGradient: 'from-pink-500 to-rose-500',
      path: '/staff/dashboard'
    },
    {
      id: 'schedule',
      title: '預約管理',
      subtitle: '查看與處理預約',
      icon: <Calendar className="w-8 h-8" />,
      color: 'text-blue-600',
      bgGradient: 'from-blue-500 to-indigo-500',
      path: '/staff/schedule'
    },
    {
      id: 'scanner',
      title: '掃碼報到',
      subtitle: '會員 QR Code',
      icon: <QrCode className="w-8 h-8" />,
      color: 'text-green-600',
      bgGradient: 'from-green-500 to-emerald-500',
      path: '/staff/scanner'
    },
    {
      id: 'hr',
      title: '人事管理',
      subtitle: '打卡與出勤',
      icon: <Users className="w-8 h-8" />,
      color: 'text-purple-600',
      bgGradient: 'from-purple-500 to-violet-500',
      path: '/staff/hr'
    },
    {
      id: 'finance',
      title: '財務報表',
      subtitle: '營收數據分析',
      icon: <DollarSign className="w-8 h-8" />,
      color: 'text-yellow-600',
      bgGradient: 'from-yellow-500 to-amber-500',
      path: '/staff/finance'
    },
    {
      id: 'switch',
      title: '切換客戶版',
      subtitle: '返回客戶介面',
      icon: <ArrowLeftRight className="w-8 h-8" />,
      color: 'text-gray-600',
      bgGradient: 'from-gray-500 to-slate-500',
      path: '/?mode=customer'
    }
  ];

  const handleCardClick = (card: MenuCard) => {
    if (card.action) {
      card.action();
    } else if (card.path) {
      if (card.path.startsWith('/?')) {
        window.location.href = card.path;
      } else {
        navigate(card.path);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">載入中...</p>
        </div>
      </div>
    );
  }

  // 檢查 URL 參數是否強制顯示客戶版
  const urlParams = new URLSearchParams(window.location.search);
  const forceCustomerMode = urlParams.get('mode') === 'customer';
  const showStaffMode = isStaff && !forceCustomerMode;
  const menuCards = showStaffMode ? staffMenuCards : customerMenuCards;

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-rose-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-pink-500 to-rose-500 text-white px-4 py-6 rounded-b-3xl shadow-lg">
        {/* 用戶資訊區 */}
        {profile ? (
          <div className="flex items-center space-x-4 mb-4">
            {profile.pictureUrl ? (
              <img 
                src={profile.pictureUrl} 
                alt="Profile" 
                className="w-14 h-14 rounded-full border-2 border-white shadow-md"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-white/30 flex items-center justify-center">
                <User className="w-8 h-8" />
              </div>
            )}
            <div className="flex-1">
              <p className="text-pink-100 text-sm">{greeting}！</p>
              <h2 className="text-lg font-bold">{profile.displayName}</h2>
              {showStaffMode && staffInfo && (
                <span className="inline-block mt-1 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                  {staffInfo.position} · {getRoleDisplayName(staffInfo.role)}
                </span>
              )}
            </div>
            {isStaff && (
              <button 
                onClick={() => window.location.href = showStaffMode ? '/?mode=customer' : '/staff/dashboard'}
                className="bg-white/20 backdrop-blur-sm px-3 py-2 rounded-xl text-sm flex items-center gap-1"
              >
                <ArrowLeftRight className="w-4 h-4" />
                {showStaffMode ? '客戶版' : '員工版'}
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles className="w-6 h-6" />
            <h1 className="text-2xl font-bold">花花醫美</h1>
            <Sparkles className="w-6 h-6" />
          </div>
        )}

        {/* 模式指示器 */}
        {showStaffMode ? (
          <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
              <span className="text-sm font-medium">員工模式已啟用</span>
            </div>
            <span className="text-xs text-pink-100">花花醫美診所</span>
          </div>
        ) : (
          <p className="text-center text-pink-100 text-sm">
            專業醫美 · 貼心服務 · 美麗蛻變
          </p>
        )}
      </div>

      {/* 六宮格選單 */}
      <div className="px-4 py-6">
        <div className="grid grid-cols-2 gap-4">
          {menuCards.map((card) => (
            <button
              key={card.id}
              onClick={() => handleCardClick(card)}
              className="group relative overflow-hidden bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 active:scale-95"
            >
              {/* 背景漸層裝飾 */}
              <div className={`absolute inset-0 bg-gradient-to-br ${card.bgGradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />
              
              <div className="relative p-5">
                {/* Icon */}
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${card.bgGradient} flex items-center justify-center mb-3 shadow-md group-hover:scale-110 transition-transform duration-300`}>
                  <div className="text-white">
                    {card.icon}
                  </div>
                </div>
                
                {/* 文字 */}
                <h3 className="font-bold text-slate-800 text-lg mb-1 text-left">
                  {card.title}
                </h3>
                <p className="text-xs text-slate-500 text-left">
                  {card.subtitle}
                </p>
              </div>

              {/* 點擊波紋效果 */}
              <div className="absolute inset-0 bg-black opacity-0 group-active:opacity-5 transition-opacity" />
            </button>
          ))}
        </div>
      </div>

      {/* 公告區域 (僅客戶模式顯示) */}
      {!showStaffMode && (
        <div className="px-4 pb-6">
          <div className="bg-white rounded-2xl p-4 shadow-md">
            <div className="flex items-center space-x-2 mb-3">
              <span className="text-xl">📢</span>
              <h2 className="font-bold text-gray-800">最新公告</h2>
            </div>
            <div className="space-y-2">
              <div className="flex items-start space-x-2 text-sm">
                <span className="text-pink-500">•</span>
                <p className="text-gray-600">歡迎使用花花醫美線上預約系統！</p>
              </div>
              <div className="flex items-start space-x-2 text-sm">
                <span className="text-pink-500">•</span>
                <p className="text-gray-600">新客戶首次預約享 9 折優惠</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 底部裝飾 */}
      <div className="px-4 pb-8">
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-4 border border-pink-100">
          <p className="text-center text-sm text-slate-500">
            營業時間：週一至週六 10:00 - 20:00
          </p>
          <p className="text-center text-xs text-slate-400 mt-1">
            © 2026 Flower Clinic. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
