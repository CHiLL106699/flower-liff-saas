/**
 * LIFF 六宮格首頁
 * 
 * 移植自 flower-admin，改用 Supabase 後端
 * 提供六大功能入口：立即預約、醫美配送、術後護理、體重追蹤、會員中心、聯絡我們
 */

import { useNavigate } from 'react-router-dom';
import { 
  Calendar, 
  Truck, 
  Heart, 
  Scale, 
  User, 
  MessageCircle,
  Sparkles
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

export default function LiffHome() {
  const navigate = useNavigate();

  // 術後護理 - 傳送訊息到 LINE 聊天室
  const handleAftercare = async () => {
    if (typeof window !== 'undefined' && (window as any).liff) {
      const liff = (window as any).liff;
      if (liff.isInClient()) {
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
    } else {
      // 開發環境模擬
      alert('術後護理功能 - 將傳送「術後護理」訊息至 LINE 聊天室');
    }
  };

  const menuCards: MenuCard[] = [
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

  const handleCardClick = (card: MenuCard) => {
    if (card.action) {
      card.action();
    } else if (card.path) {
      navigate(card.path);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-rose-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-pink-500 to-rose-500 text-white px-4 py-6 rounded-b-3xl shadow-lg">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Sparkles className="w-6 h-6" />
          <h1 className="text-2xl font-bold">花花醫美</h1>
          <Sparkles className="w-6 h-6" />
        </div>
        <p className="text-center text-pink-100 text-sm">
          專業醫美 · 貼心服務 · 美麗蛻變
        </p>
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
