/**
 * LIFF 意見回饋頁面
 * 
 * 使用 Supabase 後端儲存意見回饋
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  MessageCircle, 
  Send,
  Loader2,
  CheckCircle
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';

export default function LiffFeedback() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const getOrganizationId = () => {
    return parseInt(import.meta.env.VITE_ORGANIZATION_ID || '1');
  };

  const getUserId = () => {
    const userId = localStorage.getItem('flower_user_id');
    return userId ? parseInt(userId) : null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!message.trim()) {
      alert('請輸入您的意見或建議');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('feedback')
        .insert({
          organization_id: getOrganizationId(),
          user_id: getUserId(),
          name: name || null,
          phone: phone || null,
          message: message.trim()
        });

      if (error) throw error;

      setIsSubmitted(true);
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      alert('提交失敗，請稍後再試');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-orange-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 shadow-lg text-center max-w-sm w-full">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">感謝您的回饋！</h2>
          <p className="text-slate-500 mb-6">
            我們已收到您的意見，將會盡快處理。
          </p>
          <Button
            onClick={() => navigate('/')}
            className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
          >
            返回首頁
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-orange-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-4 py-4 rounded-b-3xl shadow-lg">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <MessageCircle className="w-6 h-6" />
            <h1 className="text-xl font-bold">聯絡我們</h1>
          </div>
        </div>
      </div>

      {/* 表單 */}
      <div className="px-4 py-6">
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-2">意見回饋</h3>
          <p className="text-sm text-slate-500 mb-6">
            如有任何問題或建議，歡迎留言給我們，我們將盡快回覆您。
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm text-slate-600 mb-1 block">姓名</label>
              <Input
                type="text"
                placeholder="請輸入您的姓名"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm text-slate-600 mb-1 block">聯絡電話</label>
              <Input
                type="tel"
                placeholder="請輸入您的電話"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm text-slate-600 mb-1 block">您的意見 *</label>
              <textarea
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-yellow-500"
                rows={5}
                placeholder="請輸入您的意見或建議..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
              />
            </div>

            <Button
              type="submit"
              disabled={isSubmitting || !message.trim()}
              className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  提交中...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  提交意見
                </>
              )}
            </Button>
          </form>
        </div>

        {/* 聯絡資訊 */}
        <div className="mt-6 bg-white/60 backdrop-blur-sm rounded-2xl p-4 border border-yellow-100">
          <h4 className="font-medium text-slate-700 mb-3">其他聯絡方式</h4>
          <div className="space-y-2 text-sm text-slate-600">
            <p>📞 電話：02-1234-5678</p>
            <p>📧 Email：service@flowerclinic.com</p>
            <p>📍 地址：台北市信義區XX路XX號</p>
            <p>🕐 營業時間：週一至週六 10:00 - 20:00</p>
          </div>
        </div>
      </div>
    </div>
  );
}
